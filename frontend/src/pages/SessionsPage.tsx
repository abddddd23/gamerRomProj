import { FormEvent, useEffect, useState } from "react";
import { Filter, Receipt, RefreshCw } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Game, Post, Session, Worker } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { MoneyValue } from "../components/Money";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { billingRuleLabel, formatDuration, getBilledUnits, getPricePerTimeUnit } from "../utils/billing";

export function SessionsPage() {
  const { isAdmin } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", workerId: "", postId: "", gameId: "" });
  const [error, setError] = useState("");

  async function loadReferenceData() {
    const [postsResponse, gamesResponse] = await Promise.all([api.get<Post[]>("/posts"), api.get<Game[]>("/games")]);
    setPosts(postsResponse.data);
    setGames(gamesResponse.data);
    if (isAdmin) {
      const workersResponse = await api.get<Worker[]>("/workers");
      setWorkers(workersResponse.data);
    }
  }

  async function loadSessions() {
    const params = new URLSearchParams();
    if (filters.startDate) params.set("start_date", `${filters.startDate}T00:00:00`);
    if (filters.endDate) params.set("end_date", `${filters.endDate}T23:59:59`);
    if (filters.workerId) params.set("worker_id", filters.workerId);
    if (filters.postId) params.set("post_id", filters.postId);
    if (filters.gameId) params.set("game_id", filters.gameId);
    const { data } = await api.get<Session[]>(`/sessions?${params.toString()}`);
    setSessions(data);
  }

  useEffect(() => {
    Promise.all([loadReferenceData(), loadSessions()]).catch((err) => setError(getApiError(err)));
  }, []);

  async function applyFilters(event: FormEvent) {
    event.preventDefault();
    try {
      await loadSessions();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <h1>Sessions</h1>
        <button className="secondary-button" onClick={() => loadSessions().catch((err) => setError(getApiError(err)))}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <form className="toolbar-form" onSubmit={applyFilters}>
        <label>
          From
          <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
        </label>
        {isAdmin && (
          <label>
            Worker
          <select value={filters.workerId} onChange={(event) => setFilters({ ...filters, workerId: event.target.value })}>
            <option value="">All workers</option>
            {workers.map((worker) => (
              <option value={worker.id} key={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
          </label>
        )}
        <label>
          Post
        <select value={filters.postId} onChange={(event) => setFilters({ ...filters, postId: event.target.value })}>
          <option value="">All posts</option>
          {posts.map((post) => (
            <option value={post.id} key={post.id}>
              {post.name}
            </option>
          ))}
        </select>
        </label>
        <label>
          Game
        <select value={filters.gameId} onChange={(event) => setFilters({ ...filters, gameId: event.target.value })}>
          <option value="">All games</option>
          {games.map((game) => (
            <option value={game.id} key={game.id}>
              {game.name}
            </option>
          ))}
        </select>
        </label>
        <button className="primary-button">
          <Filter size={17} />
          Filter
        </button>
      </form>

      <DataTable
        empty={sessions.length === 0}
        emptyState={<EmptyState title="No sessions found" description="Try changing filters or start a new session." icon={Receipt} />}
      >
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Post</th>
              <th>Game</th>
              <th>Worker</th>
              <th>Duration</th>
              <th>Billing</th>
              <th>Unit price</th>
              <th>Expected</th>
              <th>Paid</th>
              <th>Difference</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const sessionGame = session.game ?? games.find((game) => game.id === session.game_id) ?? null;
              const billedUnits = getBilledUnits(session, sessionGame);
              const unitPrice = getPricePerTimeUnit(sessionGame);
              return (
                <tr key={session.id}>
                  <td>{session.id}</td>
                  <td>
                    <StatusBadge value={session.status} />
                  </td>
                  <td>{session.post?.name ?? posts.find((post) => post.id === session.post_id)?.name ?? session.post_id}</td>
                  <td>{sessionGame?.name ?? "Unassigned"}</td>
                  <td>{session.worker?.name ?? workers.find((worker) => worker.id === session.worker_id)?.name ?? session.worker_id}</td>
                  <td>{formatDuration(session)}</td>
                  <td>
                    {sessionGame?.pricing_mode === "per_time"
                      ? `${billedUnits} x ${billingRuleLabel(sessionGame)}`
                      : `${session.detected_match_count} detected / ${session.declared_match_count} declared`}
                  </td>
                  <td>{sessionGame?.pricing_mode === "per_time" && unitPrice !== null ? <MoneyValue value={unitPrice} /> : <MoneyValue value={session.price_per_unit} />}</td>
                  <td><MoneyValue value={session.expected_amount} /></td>
                  <td><MoneyValue value={session.paid_amount} /></td>
                  <td className={session.difference_amount < 0 ? "difference-cell negative" : "difference-cell"}>
                    <MoneyValue value={session.difference_amount} signed />
                  </td>
                  <td>{new Date(session.start_time).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTable>
    </section>
  );
}
