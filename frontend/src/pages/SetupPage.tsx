import { FormEvent, useState } from "react";
import { Gamepad2, UserPlus } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import { api, getApiError } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

export function SetupPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", phone_number: "", password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (token) return <Navigate to="/" replace />;
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { await api.post("/setup", form); await login(form.username, form.password); navigate("/", { replace: true }); }
    catch (err) { setError(getApiError(err)); } finally { setLoading(false); }
  }
  return <main className="login-screen"><form className="login-panel setup-panel" onSubmit={submit}>
    <div className="login-brand"><div className="brand-mark large"><Gamepad2 size={28} /></div><div><h1>Set up Gaming Room Manager</h1><span>Create the first administrator account</span></div></div>
    {error && <div className="error-banner">{error}</div>}
    <label>Name<input required value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
    <label>Username<input required minLength={3} value={form.username} onChange={(e) => update("username", e.target.value)} /></label>
    <label>Email<input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
    <label>Phone number<input required value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} /></label>
    <PasswordInput label="Password" value={form.password} onChange={(value) => update("password", value)} autoComplete="new-password" disabled={loading} />
    <PasswordInput label="Confirm password" value={form.confirm_password} onChange={(value) => update("confirm_password", value)} autoComplete="new-password" disabled={loading} />
    <button className="primary-button" disabled={loading}><UserPlus size={18} />{loading ? "Creating account" : "Create administrator"}</button>
  </form></main>;
}
