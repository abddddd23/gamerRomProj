import { useEffect, useMemo, useState } from "react";
import { CreditCard, RefreshCw, WalletCards } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Payment, Session } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { MoneyValue } from "../components/Money";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";

type PaymentRow = Payment & {
  session: Session;
};

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadPayments() {
    setLoading(true);
    try {
      const { data: sessionData } = await api.get<Session[]>("/sessions");
      setSessions(sessionData);

      const paymentResponses = await Promise.all(
        sessionData.map(async (session) => {
          const { data } = await api.get<Payment[]>(`/payments/session/${session.id}`);
          return data.map((payment) => ({ ...payment, session }));
        }),
      );
      setPayments(paymentResponses.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setError("");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const totals = useMemo(() => {
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const cash = payments.filter((payment) => payment.method === "cash").reduce((sum, payment) => sum + payment.amount, 0);
    const card = payments.filter((payment) => payment.method === "card").reduce((sum, payment) => sum + payment.amount, 0);
    return { paid, cash, card };
  }, [payments]);

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h1>Payments</h1>
          <p>Review recorded payments from real sessions.</p>
        </div>
        <button className="secondary-button" onClick={loadPayments}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="metric-grid">
        <StatCard title="Total collected" value={<MoneyValue value={totals.paid} />} icon={WalletCards} tone="success" />
        <StatCard title="Cash payments" value={<MoneyValue value={totals.cash} />} icon={CreditCard} tone="success" />
        <StatCard title="Card payments" value={<MoneyValue value={totals.card} />} icon={CreditCard} tone="info" />
        <StatCard title="Sessions scanned" value={sessions.length} icon={RefreshCw} tone="neutral" />
      </div>

      <DataTable
        empty={!loading && payments.length === 0}
        emptyState={<EmptyState title="No payments found" description="Payments appear after workers add them to sessions." icon={WalletCards} />}
      >
        <table>
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
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.session.post?.name ?? payment.session.post_id}</td>
                <td>{payment.session.game?.name ?? "Unassigned"}</td>
                <td className="money-cell">
                  <MoneyValue value={payment.amount} />
                </td>
                <td>
                  <StatusBadge value={payment.method} />
                </td>
                <td>{payment.session.worker?.name ?? payment.worker_id}</td>
                <td>{new Date(payment.created_at).toLocaleString()}</td>
                <td>
                  <StatusBadge value={payment.session.payment_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </section>
  );
}
