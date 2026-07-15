from fastapi.testclient import TestClient

from tests.conftest import auth_header


def test_starting_session(client: TestClient, worker_token: str) -> None:
    response = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1, "client_name": "Guest"},
        headers=auth_header(worker_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "active"
    assert data["post_id"] == 1
    assert data["game_id"] == 1

    conflict = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    )
    assert conflict.status_code == 409


def test_finish_session(client: TestClient, worker_token: str) -> None:
    session = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    ).json()
    client.post(f"/api/sessions/{session['id']}/declared-match", headers=auth_header(worker_token))

    response = client.post(f"/api/sessions/{session['id']}/finish", headers=auth_header(worker_token))

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "finished"
    assert data["expected_amount"] == 100


def test_add_payment(client: TestClient, worker_token: str) -> None:
    session = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    ).json()
    client.post(f"/api/sessions/{session['id']}/declared-match", headers=auth_header(worker_token))

    response = client.post(
        "/api/payments",
        json={"session_id": session["id"], "amount": 100, "method": "cash"},
        headers=auth_header(worker_token),
    )

    assert response.status_code == 201
    sessions = client.get("/api/sessions/active", headers=auth_header(worker_token)).json()
    assert sessions[0]["paid_amount"] == 100
    assert sessions[0]["payment_status"] == "paid"


def test_detection_match_ended_increments_detected_count(client: TestClient, worker_token: str) -> None:
    session = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    ).json()

    response = client.post(
        "/api/detection-events",
        json={"post_id": 1, "event_type": "match_ended", "game_type": "FC"},
        headers=auth_header(worker_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["event"]["game_type"] == "FC"
    assert "confidence" not in data["event"]
    assert "screenshot_path" not in data["event"]
    assert data["session"]["id"] == session["id"]
    assert data["session"]["detected_match_count"] == 1
    assert data["session"]["expected_amount"] == 100


def test_ai_session_started_without_manual_session_is_stored(client: TestClient, worker_token: str) -> None:
    response = client.post(
        "/api/detection-events",
        json={
            "post_id": 1,
            "event_type": "session_started",
            "game_type": "FC",
            "session_start_time": "2026-06-25T10:00:00",
        },
        headers=auth_header(worker_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["event"]["event_type"] == "session_started"
    assert data["event"]["game_type"] == "FC"
    assert data["event"]["session_id"] is None
    assert "confidence" not in data["event"]
    assert "screenshot_path" not in data["event"]
    assert data["session"] is None


def test_ai_session_ended_bills_time_based_game(client: TestClient, worker_token: str) -> None:
    session = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 2},
        headers=auth_header(worker_token),
    ).json()

    response = client.post(
        "/api/detection-events",
        json={
            "post_id": 1,
            "event_type": "session_ended",
            "game_type": "GTA",
            "duration_seconds": 80 * 60,
            "billed_hours": 2,
            "session_start_time": "2026-06-25T10:00:00",
            "session_end_time": "2026-06-25T11:20:00",
        },
        headers=auth_header(worker_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["event"]["session_id"] == session["id"]
    assert data["event"]["billed_hours"] == 2
    assert "confidence" not in data["event"]
    assert "screenshot_path" not in data["event"]
    assert data["session"]["status"] == "finished"
    assert data["session"]["price_per_unit"] == 100
    assert data["session"]["expected_amount"] == 400
    assert data["session"]["difference_amount"] == -400


def test_time_based_game_bills_started_20_minute_blocks(client: TestClient, worker_token: str) -> None:
    client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 2},
        headers=auth_header(worker_token),
    )

    response = client.post(
        "/api/detection-events",
        json={
            "post_id": 1,
            "event_type": "session_ended",
            "game_type": "GTA",
            "duration_seconds": 21 * 60,
            "billed_hours": 1,
        },
        headers=auth_header(worker_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["event"]["billed_hours"] == 1
    assert data["session"]["expected_amount"] == 200
    assert data["session"]["price_per_unit"] == 100


def test_football_session_ended_does_not_use_duration_for_billing(client: TestClient, worker_token: str) -> None:
    client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    )
    client.post(
        "/api/detection-events",
        json={"post_id": 1, "event_type": "match_ended", "game_type": "FC"},
        headers=auth_header(worker_token),
    )

    response = client.post(
        "/api/detection-events",
        json={
            "post_id": 1,
            "event_type": "session_ended",
            "game_type": "FC",
            "duration_seconds": 80 * 60,
            "billed_hours": 2,
        },
        headers=auth_header(worker_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["session"]["detected_match_count"] == 1
    assert data["session"]["expected_amount"] == 100


def test_alert_created_when_underpaid(client: TestClient, worker_token: str, admin_token: str) -> None:
    session = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    ).json()
    client.post(f"/api/sessions/{session['id']}/declared-match", headers=auth_header(worker_token))
    client.post(f"/api/sessions/{session['id']}/finish", headers=auth_header(worker_token))

    alerts = client.get("/api/alerts", headers=auth_header(admin_token))

    assert alerts.status_code == 200
    data = alerts.json()
    assert len(data) == 1
    assert data[0]["alert_type"] == "underpaid"
    assert data[0]["difference_amount"] == -100


def test_shift_close_calculation(client: TestClient, worker_token: str) -> None:
    shift = client.post("/api/shifts/open", headers=auth_header(worker_token)).json()
    session = client.post(
        "/api/sessions/start",
        json={"post_id": 1, "game_id": 1},
        headers=auth_header(worker_token),
    ).json()
    client.post(f"/api/sessions/{session['id']}/declared-match", headers=auth_header(worker_token))
    client.post(
        "/api/payments",
        json={"session_id": session["id"], "amount": 80, "method": "cash"},
        headers=auth_header(worker_token),
    )
    client.post(f"/api/sessions/{session['id']}/finish", headers=auth_header(worker_token))

    response = client.post(
        f"/api/shifts/{shift['id']}/close",
        json={"declared_cash": 80},
        headers=auth_header(worker_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["expected_revenue"] == 100
    assert data["actual_paid_revenue"] == 80
    assert data["difference_amount"] == -20
