import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import { getApiError } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

export function ChangePasswordPage() {
  const { token, user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await changePassword(form.oldPassword, form.newPassword, form.confirmPassword);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-panel auth-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="brand-mark large" aria-hidden="true">
            <KeyRound size={28} />
          </div>
          <div>
            <h1>Change Password</h1>
            <span>{user?.username}</span>
          </div>
        </div>
        {user?.must_change_password && (
          <div className="warning-banner">You must change your temporary password before continuing.</div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <PasswordInput
          label="Current password"
          value={form.oldPassword}
          onChange={(value) => setForm({ ...form, oldPassword: value })}
          autoComplete="current-password"
          disabled={loading}
          required
        />
        <PasswordInput
          label="New password"
          value={form.newPassword}
          onChange={(value) => setForm({ ...form, newPassword: value })}
          autoComplete="new-password"
          disabled={loading}
          required
        />
        <PasswordInput
          label="Confirm new password"
          value={form.confirmPassword}
          onChange={(value) => setForm({ ...form, confirmPassword: value })}
          autoComplete="new-password"
          disabled={loading}
          required
        />
        <button className="primary-button" disabled={loading}>
          <KeyRound size={18} />
          {loading ? "Saving" : "Change password"}
        </button>
      </form>
    </main>
  );
}
