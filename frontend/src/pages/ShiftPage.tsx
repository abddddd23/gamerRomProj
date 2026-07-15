import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, DoorOpen, RefreshCw } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Shift } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { MoneyValue } from "../components/Money";
import { StatusBadge } from "../components/StatusBadge";

export function ShiftPage() {
  const [current, setCurrent] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState("");
  const [declaredCash, setDeclaredCash] = useState("");
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  async function loadShifts() {
    const [currentResponse, shiftsResponse] = await Promise.all([api.get<Shift | null>("/shifts/current"), api.get<Shift[]>("/shifts")]);
    setCurrent(currentResponse.data);
    setShifts(shiftsResponse.data);
  }

  useEffect(() => {
    loadShifts().catch((err) => setError(getApiError(err)));
  }, []);

  async function openShift() {
    try {
      await api.post("/shifts/open");
      await loadShifts();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function closeShift() {
    if (!current) return;
    const amount = Number(declaredCash);
    if (!Number.isFinite(amount) || amount < 0) return;
    try {
      await api.post(`/shifts/${current.id}/close`, { declared_cash: amount });
      setDeclaredCash("");
      setCloseModalOpen(false);
      await loadShifts();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <h1>Shift</h1>
        <button className="secondary-button" onClick={() => loadShifts().catch((err) => setError(getApiError(err)))}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="panel shift-panel">
        {current ? (
          <>
            <div>
              <h2>Open shift</h2>
              <p>{new Date(current.start_time).toLocaleString()}</p>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setDeclaredCash("0");
                setCloseModalOpen(true);
              }}
            >
              <CheckCircle2 size={17} />
              Close shift
            </button>
          </>
        ) : (
          <>
            <div>
              <h2>No open shift</h2>
            </div>
            <button className="primary-button" onClick={openShift}>
              <DoorOpen size={17} />
              Open shift
            </button>
          </>
        )}
      </div>

      <DataTable
        empty={shifts.length === 0}
        emptyState={<EmptyState title="No shifts yet" description="Open a shift to begin tracking cash." icon={CalendarClock} />}
      >
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Started</th>
              <th>Ended</th>
              <th>Expected</th>
              <th>Paid</th>
              <th>Declared</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td>
                  <StatusBadge value={shift.status} />
                </td>
                <td>{new Date(shift.start_time).toLocaleString()}</td>
                <td>{shift.end_time ? new Date(shift.end_time).toLocaleString() : ""}</td>
                <td><MoneyValue value={shift.expected_revenue} /></td>
                <td><MoneyValue value={shift.actual_paid_revenue} /></td>
                <td><MoneyValue value={shift.declared_cash} /></td>
                <td><MoneyValue value={shift.difference_amount} signed /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      {current && closeModalOpen && (
        <Modal
          title="Close shift"
          description="Enter the cash declared by the worker."
          onClose={() => {
            setDeclaredCash("");
            setCloseModalOpen(false);
          }}
        >
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              closeShift();
            }}
          >
            <label>
              Declared cash
              <input
                autoFocus
                type="number"
                min="0"
                value={declaredCash}
                onChange={(event) => setDeclaredCash(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setDeclaredCash("");
                  setCloseModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button className="primary-button" type="submit">
                <CheckCircle2 size={16} />
                Close shift
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
