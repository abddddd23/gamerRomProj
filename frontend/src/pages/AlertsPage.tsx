import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, RefreshCw } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Alert, AlertStatus } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { MoneyValue } from "../components/Money";
import { StatusBadge } from "../components/StatusBadge";

const alertStatuses: AlertStatus[] = ["open", "reviewed", "resolved"];

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<{ alert: Alert; status: AlertStatus; note: string } | null>(null);

  async function loadAlerts() {
    const query = statusFilter ? `?status_filter=${statusFilter}` : "";
    const { data } = await api.get<Alert[]>(`/alerts${query}`);
    setAlerts(data);
  }

  useEffect(() => {
    loadAlerts().catch((err) => setError(getApiError(err)));
  }, [statusFilter]);

  async function submitAlertUpdate() {
    if (!action) return;
    try {
      await api.patch(`/alerts/${action.alert.id}`, { status: action.status, note: action.note || null });
      setAction(null);
      await loadAlerts();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <h1>Alerts</h1>
        <button className="secondary-button" onClick={() => loadAlerts().catch((err) => setError(getApiError(err)))}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="toolbar-form">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          {alertStatuses.map((status) => (
            <option value={status} key={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        empty={alerts.length === 0}
        emptyState={
          <EmptyState
            title="No alerts found"
            description="All systems normal. Mismatch alerts appear when the AI camera detects more matches than declared, or when finished sessions are underpaid."
            icon={AlertTriangle}
          />
        }
      >
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Session</th>
              <th>Expected</th>
              <th>Paid</th>
              <th>Difference</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className={alert.status === "open" ? "alert-row" : ""}>
                <td>{alert.alert_type}</td>
                <td>
                  <StatusBadge value={alert.status} />
                </td>
                <td>{alert.session_id}</td>
                <td><MoneyValue value={alert.expected_amount} /></td>
                <td><MoneyValue value={alert.paid_amount} /></td>
                <td><MoneyValue value={alert.difference_amount} signed /></td>
                <td>{new Date(alert.created_at).toLocaleString()}</td>
                <td>
                  <div className="button-row compact">
                    <button className="secondary-button" onClick={() => setAction({ alert, status: "reviewed", note: alert.note ?? "" })}>
                      <Eye size={16} />
                      Review
                    </button>
                    <button className="secondary-button" onClick={() => setAction({ alert, status: "resolved", note: alert.note ?? "" })}>
                      <CheckCircle2 size={16} />
                      Resolve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      {action && (
        <Modal
          title={action.status === "resolved" ? "Resolve alert" : "Review alert"}
          description={`Alert #${action.alert.id} for session #${action.alert.session_id}`}
          onClose={() => setAction(null)}
        >
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitAlertUpdate();
            }}
          >
            <label>
              Note
              <input
                autoFocus
                value={action.note}
                onChange={(event) => setAction({ ...action, note: event.target.value })}
                placeholder="Add a review note"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setAction(null)}>
                Cancel
              </button>
              <button className="primary-button" type="submit">
                <CheckCircle2 size={16} />
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
