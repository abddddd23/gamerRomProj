import { useEffect, useState } from "react";
import { Database, FolderOpen, HeartPulse, Save } from "lucide-react";
import { api, getApiError } from "../api/client";

type About = { name: string; version: string; database_mode: string; data_folder: string; logs_folder: string };
export function AboutPage() {
  const [about, setAbout] = useState<About | null>(null); const [message, setMessage] = useState("");
  useEffect(() => { void api.get<About>("/about").then((r) => setAbout(r.data)).catch((e) => setMessage(getApiError(e))); }, []);
  async function backup() { try { const { data } = await api.post<{ backup_path: string }>("/backup"); setMessage(`Backup created: ${data.backup_path}`); } catch (e) { setMessage(getApiError(e)); } }
  return <section className="page"><div className="page-header"><div><p className="eyebrow">System</p><h1>About</h1><p>Application information and local data controls.</p></div></div>
    {message && <div className="info-banner">{message}</div>}
    <div className="stats-grid">
      <article className="stat-card"><HeartPulse size={22}/><span>Backend status</span><strong>Connected</strong></article>
      <article className="stat-card"><Database size={22}/><span>Database mode</span><strong>{about?.database_mode ?? "Loading…"}</strong></article>
      <article className="stat-card"><Save size={22}/><span>Version</span><strong>{about?.version ?? "Loading…"}</strong></article>
    </div>
    <div className="panel"><h2>{about?.name ?? "Gaming Room Manager"}</h2><p><FolderOpen size={16}/> Data folder: {about?.data_folder ?? "Loading…"}</p><p>Logs folder: {about?.logs_folder ?? "Loading…"}</p><button className="primary-button" onClick={backup}>Create database backup</button></div>
  </section>;
}
