import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Gamepad2, RefreshCw, Timer, TrendingUp, Users } from "lucide-react";

import { api, getApiError } from "../api/client";
import { DashboardReport } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Money, MoneyValue } from "../components/Money";
import { StatCard } from "../components/StatCard";

export function ReportsPage() {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [error, setError] = useState("");

  async function loadReport() {
    const { data } = await api.get<DashboardReport>("/reports/dashboard");
    setReport(data);
  }

  useEffect(() => {
    loadReport().catch((err) => setError(getApiError(err)));
  }, []);

  return (
    <section className="page">
      <div className="page-heading">
        <h1>Reports</h1>
        <button className="secondary-button" onClick={() => loadReport().catch((err) => setError(getApiError(err)))}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!report ? (
        <EmptyState title="No report data" description="Refresh when the backend is available." icon={RefreshCw} />
      ) : (
        <>
          <div className="metric-grid">
            <StatCard title="Expected today" value={<Money value={report.today_expected_revenue} />} icon={Timer} tone="info" />
            <StatCard title="Paid today" value={<Money value={report.today_paid_revenue} />} icon={Banknote} tone="success" />
            <StatCard
              title="Difference"
              value={<MoneyValue value={report.today_difference} signed />}
              icon={TrendingUp}
              tone={report.today_difference < 0 ? "danger" : "success"}
            />
            <StatCard title="Active sessions" value={report.active_sessions_count} icon={Gamepad2} tone="neutral" />
            <StatCard
              title="Open alerts"
              value={report.open_alerts_count}
              icon={AlertTriangle}
              tone={report.open_alerts_count > 0 ? "danger" : "neutral"}
            />
            <StatCard
              title="Detected / declared"
              value={`${report.detected_vs_declared_matches.detected} / ${report.detected_vs_declared_matches.declared}`}
              icon={Users}
              tone="warning"
            />
          </div>

          <div className="report-grid">
            <ReportTable title="Revenue by worker" rows={report.revenue_by_worker} />
            <ReportTable title="Revenue by post" rows={report.revenue_by_post} />
            <div className="panel">
              <h2>Most played games</h2>
              <DataTable
                empty={report.most_played_games.length === 0}
                emptyState={<EmptyState title="No games played yet" description="Game usage appears after sessions are recorded." />}
              >
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.most_played_games.map((game) => (
                    <tr key={game.id}>
                      <td>{game.name}</td>
                      <td>{game.sessions_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </DataTable>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ReportTable({ title, rows }: { title: string; rows: { id: number; name: string; expected_revenue: number; paid_revenue: number }[] }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <DataTable empty={rows.length === 0} emptyState={<EmptyState title="No rows yet" description="Data appears after sessions are recorded." />}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Expected</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>
                <Money value={row.expected_revenue} />
              </td>
              <td>
                <Money value={row.paid_revenue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </DataTable>
    </div>
  );
}
