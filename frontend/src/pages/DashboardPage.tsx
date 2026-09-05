import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CirclePlus,
  CreditCard,
  Gamepad2,
  Play,
  RefreshCw,
  Square,
  Timer,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { api, getApiError } from "../api/client";
import { Alert, DashboardReport, Game, Payment, Post, Session } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { Money, MoneyValue } from "../components/Money";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { billingRuleLabel, formatDuration, getBilledUnits, getPricePerTimeUnit } from "../utils/billing";
type StartForm = { gameId: string; clientName: string };
type DashboardModal =
  | { type: "payment"; session: Session; amount: string }
  | { type: "cancel"; session: Session; reason: string }
  | null;
type RecentPayment = Payment & { session: Session };

function alertSeverity(alert: Alert) {
  if (alert.difference_amount < 0 || alert.alert_type === "underpaid") return "critical";
  if (alert.alert_type === "count_mismatch" || alert.alert_type === "manual_override") return "warning";
  return "info";
}

export function DashboardPage() {
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [startForms, setStartForms] = useState<Record<number, StartForm>>({});
  const [gameSelections, setGameSelections] = useState<Record<number, string>>({});
  const [modal, setModal] = useState<DashboardModal>(null);

  const loadData = useCallback(async () => {
    try {
      const [postsResponse, gamesResponse, sessionsResponse] = await Promise.all([
        api.get<Post[]>("/posts"),
        api.get<Game[]>("/games"),
        api.get<Session[]>("/sessions/active"),
      ]);

      const activeSessions = sessionsResponse.data;
      setPosts(postsResponse.data);
      setGames(gamesResponse.data.filter((game) => game.is_active));
      setSessions(activeSessions);

      if (isAdmin) {
        const [reportResponse, alertsResponse] = await Promise.all([
          api.get<DashboardReport>("/reports/dashboard"),
          api.get<Alert[]>("/alerts?status_filter=open"),
        ]);
        setReport(reportResponse.data);
        setAlerts(alertsResponse.data);
      } else {
        setReport(null);
        setAlerts([]);
      }

      const paymentResponses = await Promise.all(
        activeSessions.map(async (session) => {
          const { data } = await api.get<Payment[]>(`/payments/session/${session.id}`);
          return data.map((payment) => ({ ...payment, session }));
        }),
      );
      setRecentPayments(paymentResponses.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setError("");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 5000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const activeByPost = useMemo(() => new Map(sessions.map((session) => [session.post_id, session])), [sessions]);
  const gameById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const occupiedPosts = posts.filter((post) => activeByPost.has(post.id) || post.status === "playing").length;
  const paidToday = report?.today_paid_revenue ?? sessions.reduce((sum, session) => sum + session.paid_amount, 0);
  const openAlertsCount = report?.open_alerts_count ?? alerts.length;

  function updateStartForm(postId: number, update: Partial<StartForm>) {
    setStartForms((current) => ({
      ...current,
      [postId]: { ...(current[postId] ?? { gameId: "", clientName: "" }), ...update },
    }));
  }

  async function startSession(postId: number) {
    const form = startForms[postId] ?? { gameId: "", clientName: "" };
    await api.post("/sessions/start", {
      post_id: postId,
      game_id: form.gameId ? Number(form.gameId) : null,
      client_name: form.clientName.trim() || null,
    });
    updateStartForm(postId, { clientName: "" });
    await loadData();
  }

  async function changeGame(session: Session) {
    const selected = gameSelections[session.id] ?? session.game_id?.toString();
    if (!selected) return;
    await api.patch(`/sessions/${session.id}/game`, { game_id: Number(selected) });
    await loadData();
  }

  async function addDeclaredMatch(sessionId: number) {
    await api.post(`/sessions/${sessionId}/declared-match`);
    await loadData();
  }

  async function submitPayment() {
    if (!modal || modal.type !== "payment") return;
    const amount = Number(modal.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await api.post("/payments", { session_id: modal.session.id, amount, method: "cash" });
    setModal(null);
    await loadData();
  }

  async function finishSession(sessionId: number) {
    await api.post(`/sessions/${sessionId}/finish`);
    await loadData();
  }

  async function submitCancel() {
    if (!modal || modal.type !== "cancel") return;
    const reason = modal.reason.trim();
    if (!reason) return;
    await api.post(`/sessions/${modal.session.id}/cancel`, { reason });
    setModal(null);
    await loadData();
  }

  async function runAction(action: () => Promise<void>) {
    try {
      setError("");
      await action();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <section className="page dashboard-page">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Live post status, active sessions, alerts, and payment control.</p>
        </div>
        <button className="secondary-button" onClick={loadData} title="Refresh">
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="metric-grid">
        <StatCard title="Today's revenue" value={<Money value={paidToday} />} detail="Collected payments" icon={Banknote} tone="success" />
        <StatCard title="Active sessions" value={sessions.length} detail="Currently running" icon={Timer} tone="info" />
        <StatCard
          title="Open alerts"
          value={openAlertsCount}
          detail={openAlertsCount > 0 ? "Needs review" : "All clear"}
          icon={AlertTriangle}
          tone={openAlertsCount > 0 ? "danger" : "neutral"}
        />
        <StatCard title="Occupied posts" value={`${occupiedPosts}/${posts.length}`} detail="Live capacity" icon={Gamepad2} tone="warning" />
      </div>

      {loading ? (
        <EmptyState title="Loading dashboard" description="Fetching posts and active sessions." icon={RefreshCw} />
      ) : (
        <>
          <div className="dashboard-grid">
            <section className="panel dashboard-post-panel">
              <div className="panel-header">
                <div>
                  <h2>Gaming Posts Status</h2>
                  <p>Manual sessions and AI-assisted mismatch signals.</p>
                </div>
                <span className="panel-count">{occupiedPosts} active</span>
              </div>
              <div className="post-grid dashboard-post-grid">
                {posts.map((post) => {
                  const session = activeByPost.get(post.id);
                  const currentGame = session?.game ?? (session?.game_id ? gameById.get(session.game_id) : undefined);
                  const billedUnits = session ? getBilledUnits(session, currentGame) : null;
                  const timeUnitPrice = getPricePerTimeUnit(currentGame);
                  const hasOpenAlert = alerts.some((a) => a.session_id === session?.id && a.status === "open");
                  const hasCountMismatch = !!session && session.detected_match_count > session.declared_match_count;
                  const isFinishedUnderpaid = !!session && session.status === "finished" && session.difference_amount < 0;
                  const hasMismatch = hasCountMismatch || isFinishedUnderpaid || hasOpenAlert;
                  return (
                    <article className={`post-card ${session ? "post-active" : ""} ${hasMismatch ? "post-alert" : ""}`} key={post.id}>
                      <div className="post-card-header">
                        <div className="post-title-block">
                          <div className="post-icon" aria-hidden="true">
                            {session ? <Square size={18} /> : <Gamepad2 size={18} />}
                          </div>
                          <div>
                            <h2>{post.name}</h2>
                            <StatusBadge value={session ? "active" : post.status} />
                          </div>
                        </div>
                        {hasMismatch && (
                          <div className="alert-chip">
                            <AlertTriangle size={15} />
                            Alert
                          </div>
                        )}
                      </div>

                      {session ? (
                        <>
                          <div className="session-summary compact-summary">
                            <div>
                              <span>Game</span>
                              <strong>{currentGame?.name ?? "Not assigned"}</strong>
                            </div>
                            <div>
                              <span>Pricing</span>
                              <strong>{billingRuleLabel(currentGame)}</strong>
                            </div>
                            <div>
                              <span>Duration</span>
                              <strong>{formatDuration(session)}</strong>
                            </div>
                            <div>
                              <span>{currentGame?.pricing_mode === "per_time" ? "Billed units" : "Worker"}</span>
                              <strong>
                                {currentGame?.pricing_mode === "per_time" ? billedUnits ?? "Pending" : session.worker?.name ?? `#${session.worker_id}`}
                              </strong>
                            </div>
                            <div>
                              <span>{currentGame?.pricing_mode === "per_time" ? "Price per block" : "Detected / declared"}</span>
                              <strong>
                                {currentGame?.pricing_mode === "per_time" && timeUnitPrice !== null ? (
                                  <Money value={timeUnitPrice} />
                                ) : (
                                  `${session.detected_match_count} / ${session.declared_match_count}`
                                )}
                              </strong>
                            </div>
                            <div>
                              <span>Paid / expected</span>
                              <strong>
                                <Money value={session.paid_amount} /> / <Money value={session.expected_amount} />
                              </strong>
                            </div>
                          </div>
                          <div className="inline-control">
                            <select
                              value={gameSelections[session.id] ?? session.game_id?.toString() ?? ""}
                              onChange={(event) =>
                                setGameSelections((current) => ({ ...current, [session.id]: event.target.value }))
                              }
                            >
                              <option value="">Select game</option>
                              {games.map((game) => (
                                <option value={game.id} key={game.id}>
                                  {game.name}
                                </option>
                              ))}
                            </select>
                            <button className="secondary-button" onClick={() => runAction(() => changeGame(session))}>
                              <CheckCircle2 size={16} />
                              Change
                            </button>
                          </div>
                          <div className="button-row">
                            <Link className="secondary-button" to="/sessions">
                              Details
                            </Link>
                            <button onClick={() => runAction(() => addDeclaredMatch(session.id))}>
                              <CirclePlus size={16} />
                              Add match
                            </button>
                            <button onClick={() => setModal({ type: "payment", session, amount: "" })}>
                              <Banknote size={16} />
                              Add payment
                            </button>
                            <button onClick={() => runAction(() => finishSession(session.id))}>
                              <CheckCircle2 size={16} />
                              Finish
                            </button>
                            <button className="danger-button" onClick={() => setModal({ type: "cancel", session, reason: "" })}>
                              <XCircle size={16} />
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="start-session-form">
                          <label>
                            Client
                            <input
                              placeholder="Client name"
                              value={startForms[post.id]?.clientName ?? ""}
                              onChange={(event) => updateStartForm(post.id, { clientName: event.target.value })}
                            />
                          </label>
                          <label>
                            Game
                            <select
                              value={startForms[post.id]?.gameId ?? ""}
                              onChange={(event) => updateStartForm(post.id, { gameId: event.target.value })}
                            >
                              <option value="">No game yet</option>
                              {games.map((game) => (
                                <option value={game.id} key={game.id}>
                                  {game.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="primary-button" onClick={() => runAction(() => startSession(post.id))}>
                            <Play size={16} />
                            Assign session
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="panel dashboard-table-panel">
              <div className="panel-header">
                <div>
                  <h2>Active Sessions</h2>
                  <p>Current operator workload.</p>
                </div>
              </div>
              <DataTable
                empty={sessions.length === 0}
                emptyState={<EmptyState title="No active sessions" description="Start a post session from the post cards." icon={Timer} />}
              >
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Game</th>
                      <th>Worker</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th>Billing</th>
                      <th>Paid / Expected</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const rowGame = session.game ?? gameById.get(session.game_id ?? 0) ?? null;
                      const billedUnits = getBilledUnits(session, rowGame);
                      return (
                        <tr key={session.id}>
                          <td>{session.post?.name ?? session.post_id}</td>
                          <td>{rowGame?.name ?? "Unassigned"}</td>
                          <td>{session.worker?.name ?? session.worker_id}</td>
                          <td>{new Date(session.start_time).toLocaleTimeString()}</td>
                          <td>{formatDuration(session)}</td>
                          <td>{rowGame?.pricing_mode === "per_time" ? `${billedUnits} units` : `${session.detected_match_count} matches`}</td>
                          <td className="money-cell">
                            <Money value={session.paid_amount} /> / <Money value={session.expected_amount} />
                          </td>
                          <td>
                            <StatusBadge value={session.status} />
                          </td>
                          <td>
                            <div className="button-row compact">
                              <Link className="secondary-button" to="/sessions">Details</Link>
                              <button className="secondary-button" onClick={() => setModal({ type: "payment", session, amount: "" })}>
                                <Banknote size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTable>
            </section>

            <section className="panel alerts-panel">
              <div className="panel-header">
                <div>
                  <h2>System Alerts</h2>
                  <p>Open mismatch and payment issues.</p>
                </div>
              </div>
              {isAdmin && alerts.length > 0 ? (
                <div className="alert-card-list">
                  {alerts.slice(0, 5).map((alert) => (
                    <article className={`alert-card alert-card-${alertSeverity(alert)}`} key={alert.id}>
                      <div>
                        <span>{alertSeverity(alert).toUpperCase()}</span>
                        <strong>{alert.alert_type.replace(/_/g, " ")}</strong>
                      </div>
                      <div className="alert-card-money">
                        <small>Expected <Money value={alert.expected_amount} /></small>
                        <small>Paid <Money value={alert.paid_amount} /></small>
                        <small>Diff <MoneyValue value={alert.difference_amount} signed /></small>
                      </div>
                      <Link to="/alerts">Investigate</Link>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isAdmin ? "No open alerts" : "Alerts are admin-only"}
                  description={isAdmin ? "New mismatch alerts will appear here." : "Ask an admin to review mismatch alerts."}
                  icon={AlertTriangle}
                />
              )}
            </section>
          </div>

          <div className="dashboard-bottom-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Revenue by Post</h2>
                  <p>Today's expected versus paid revenue.</p>
                </div>
              </div>
              {report ? (
                <div className="revenue-bars">
                  {report.revenue_by_post.length === 0 ? (
                    <EmptyState title="No revenue yet" description="Revenue appears after sessions are recorded." icon={Banknote} />
                  ) : (
                    report.revenue_by_post.map((row) => {
                      const max = Math.max(row.expected_revenue, row.paid_revenue, 1);
                      return (
                        <div className="revenue-row" key={row.id}>
                          <div>
                            <strong>{row.name}</strong>
                            <span><Money value={row.paid_revenue} /> paid</span>
                          </div>
                          <div className="revenue-track">
                            <span style={{ width: `${Math.min((row.paid_revenue / max) * 100, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <EmptyState title="Report data unavailable" description="Revenue breakdown is available for admins." icon={Banknote} />
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recent Payments</h2>
                  <p>Latest payments recorded on active sessions.</p>
                </div>
                <Link className="secondary-button" to="/payments">View all</Link>
              </div>
              <DataTable
                empty={recentPayments.length === 0}
                emptyState={<EmptyState title="No recent payments" description="Payments appear after workers add them." icon={CreditCard} />}
              >
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Game</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Worker</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.slice(0, 8).map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.session.post?.name ?? payment.session.post_id}</td>
                        <td>{payment.session.game?.name ?? "Unassigned"}</td>
                        <td className="money-cell"><Money value={payment.amount} /></td>
                        <td><StatusBadge value={payment.method} /></td>
                        <td>{payment.session.worker?.name ?? payment.worker_id}</td>
                        <td>{new Date(payment.created_at).toLocaleTimeString()}</td>
                        <td><StatusBadge value={payment.session.payment_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            </section>
          </div>
        </>
      )}

      {modal?.type === "payment" && (
        <Modal title="Add payment" description={`Session #${modal.session.id} on post ${modal.session.post_id}`} onClose={() => setModal(null)}>
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(submitPayment);
            }}
          >
            <label>
              Amount
              <input
                autoFocus
                inputMode="decimal"
                type="number"
                min="1"
                value={modal.amount}
                onChange={(event) => setModal({ ...modal, amount: event.target.value })}
                placeholder="100"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="primary-button" type="submit">
                <Banknote size={16} />
                Add payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "cancel" && (
        <Modal title="Cancel session" description={`Session #${modal.session.id} will be marked cancelled.`} onClose={() => setModal(null)}>
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(submitCancel);
            }}
          >
            <label>
              Reason
              <input
                autoFocus
                value={modal.reason}
                onChange={(event) => setModal({ ...modal, reason: event.target.value })}
                placeholder="Reason for cancellation"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>
                Keep session
              </button>
              <button className="danger-button" type="submit">
                <XCircle size={16} />
                Cancel session
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
