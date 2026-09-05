import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Save, UserPlus, Users } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Role, Worker } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { PasswordInput } from "../components/PasswordInput";
import { StatusBadge } from "../components/StatusBadge";

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone_number: "",
    temporary_password: "",
    confirm_password: "",
    role: "worker" as Role,
  });
  const [edits, setEdits] = useState<Record<number, Partial<Worker>>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetModal, setResetModal] = useState<{ worker: Worker; newPassword: string; confirmPassword: string } | null>(null);

  async function loadWorkers() {
    const { data } = await api.get<Worker[]>("/workers");
    setWorkers(data);
  }

  useEffect(() => {
    loadWorkers().catch((err) => setError(getApiError(err)));
  }, []);

  async function createWorker(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/workers", { ...form, is_active: true });
      setForm({
        name: "",
        username: "",
        email: "",
        phone_number: "",
        temporary_password: "",
        confirm_password: "",
        role: "worker",
      });
      await loadWorkers();
      setError("");
      setSuccess("Worker created with a temporary password.");
    } catch (err) {
      setSuccess("");
      setError(getApiError(err));
    }
  }

  async function saveWorker(worker: Worker) {
    const update = edits[worker.id] ?? {};
    const payload = {
      name: update.name ?? worker.name,
      username: update.username ?? worker.username,
      email: update.email ?? worker.email,
      phone_number: update.phone_number ?? worker.phone_number,
      role: update.role ?? worker.role,
      is_active: update.is_active ?? worker.is_active,
    };
    try {
      await api.patch(`/workers/${worker.id}`, payload);
      await loadWorkers();
      setError("");
      setSuccess("Worker updated.");
    } catch (err) {
      setSuccess("");
      setError(getApiError(err));
    }
  }

  async function resetPassword() {
    if (!resetModal) return;
    try {
      const { worker, newPassword, confirmPassword } = resetModal;
      await api.post(`/workers/${worker.id}/reset-password`, {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setResetModal(null);
      await loadWorkers();
      setError("");
      setSuccess(`Password reset for ${worker.username}. They must change it on next login.`);
    } catch (err) {
      setSuccess("");
      setError(getApiError(err));
    }
  }

  function updateEdit(workerId: number, update: Partial<Worker>) {
    setEdits((current) => ({ ...current, [workerId]: { ...current[workerId], ...update } }));
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h1>Workers</h1>
          <p>Create operator accounts and control access roles.</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      <form className="toolbar-form form-card" onSubmit={createWorker}>
        <label>
          Name
          <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Username
          <input
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
        </label>
        <label>
          Email
          <input
            placeholder="email@gaming-room.local"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          Phone number
          <input
            placeholder="0550000000"
            value={form.phone_number}
            onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
          />
        </label>
        <PasswordInput
          label="Temporary password"
          value={form.temporary_password}
          onChange={(value) => setForm({ ...form, temporary_password: value })}
          placeholder="Temporary password"
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm password"
          value={form.confirm_password}
          onChange={(value) => setForm({ ...form, confirm_password: value })}
          placeholder="Confirm password"
          autoComplete="new-password"
          required
        />
        <label>
          Role
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
          <option value="worker">worker</option>
          <option value="admin">admin</option>
        </select>
        </label>
        <button className="primary-button">
          <UserPlus size={17} />
          Add worker
        </button>
      </form>

      <DataTable
        empty={workers.length === 0}
        emptyState={<EmptyState title="No workers yet" description="Create the first account to manage shifts." icon={Users} />}
      >
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Active</th>
              <th>Password</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td>
                  <input
                    value={edits[worker.id]?.name ?? worker.name}
                    onChange={(event) => updateEdit(worker.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={edits[worker.id]?.username ?? worker.username}
                    onChange={(event) => updateEdit(worker.id, { username: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={edits[worker.id]?.email ?? worker.email}
                    onChange={(event) => updateEdit(worker.id, { email: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={edits[worker.id]?.phone_number ?? worker.phone_number}
                    onChange={(event) => updateEdit(worker.id, { phone_number: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={edits[worker.id]?.role ?? worker.role}
                    onChange={(event) => updateEdit(worker.id, { role: event.target.value as Role })}
                  >
                    <option value="worker">worker</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={edits[worker.id]?.is_active ?? worker.is_active}
                      onChange={(event) => updateEdit(worker.id, { is_active: event.target.checked })}
                    />
                    <StatusBadge value={edits[worker.id]?.is_active ?? worker.is_active ? "active" : "inactive"} />
                  </label>
                </td>
                <td>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setResetModal({ worker, newPassword: "", confirmPassword: "" })}
                  >
                    <KeyRound size={16} />
                    Reset
                  </button>
                </td>
                <td>
                  <button className="secondary-button" onClick={() => saveWorker(worker)}>
                    <Save size={16} />
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      {resetModal && (
        <Modal
          title="Reset password"
          description={`Set a new temporary password for ${resetModal.worker.username}.`}
          onClose={() => setResetModal(null)}
        >
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              resetPassword();
            }}
          >
            <PasswordInput
              label="New password"
              value={resetModal.newPassword}
              onChange={(value) => setResetModal({ ...resetModal, newPassword: value })}
              autoComplete="new-password"
              required
            />
            <PasswordInput
              label="Confirm password"
              value={resetModal.confirmPassword}
              onChange={(value) => setResetModal({ ...resetModal, confirmPassword: value })}
              autoComplete="new-password"
              required
            />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setResetModal(null)}>
                Cancel
              </button>
              <button className="primary-button" type="submit">
                <KeyRound size={16} />
                Reset password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
