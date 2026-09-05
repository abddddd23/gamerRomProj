import { FormEvent, useEffect, useState } from "react";
import { BarChart3, Gamepad2, LogIn, ShieldCheck, Timer } from "lucide-react";
import { Navigate } from "react-router-dom";

import { getApiError } from "../api/client";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login, token, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/setup-status")
      .then((response) => response.ok ? response.json() : { setup_required: false })
      .then((data: { setup_required: boolean }) => setSetupRequired(data.setup_required))
      .catch(() => setSetupRequired(false));
  }, []);

  if (token && user?.must_change_password) return <Navigate to="/change-password" replace />;
  if (token) return <Navigate to="/" replace />;
  if (setupRequired) return <Navigate to="/setup" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-shell">
        <aside className="login-side-panel">
          <div className="login-brand dark">
            <div className="brand-mark large" aria-hidden="true">
              <Gamepad2 size={28} />
            </div>
            <div>
              <h1>GameRoom Ops</h1>
              <span>Management Suite</span>
            </div>
          </div>
          <div className="login-copy">
            <strong>Revenue control for gaming rooms</strong>
            <p>Track active posts, payments, alerts, sessions, and workers from one secure operator dashboard.</p>
          </div>
          <div className="login-feature-list">
            <span><ShieldCheck size={17} /> Internal access only</span>
            <span><Timer size={17} /> Live session monitoring</span>
            <span><BarChart3 size={17} /> Daily revenue visibility</span>
          </div>
        </aside>
        <form className="login-panel" onSubmit={handleSubmit}>
          <div className="login-brand">
            <div className="brand-mark large" aria-hidden="true">
              <Gamepad2 size={28} />
            </div>
            <div>
              <h1>Sign in</h1>
              <span>Secure operations dashboard</span>
            </div>
          </div>
          {error && <div className="error-banner">{error}</div>}
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            disabled={loading}
          />
          <button className="primary-button" disabled={loading}>
            <LogIn size={18} />
            {loading ? "Signing in" : "Sign in"}
          </button>
          <p className="login-help">Forgot your password? Ask an admin to reset it.</p>
        </form>
      </section>
    </main>
  );
}
