from fastapi.testclient import TestClient


def test_health_and_ready(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/ready").json() == {"ready": True}


def test_setup_status_is_false_after_existing_seed(client: TestClient) -> None:
    assert client.get("/api/setup-status").json() == {"setup_required": False}
