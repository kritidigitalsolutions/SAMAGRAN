import { useEffect, useState } from "react";
import API from "../api/axios";

const formatMoney = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-[var(--admin-text)]">{value}</p>
  </div>
);

export default function Earnings() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/vendor/earnings/summary");
        setSummary(res.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load earnings");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return <div className="p-6">Loading earnings...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!summary) {
    return <div className="p-6">No earnings data found.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Earnings</h1>
      <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Vendor earnings summary and balances.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Sales" value={formatMoney(summary.totalSales)} />
        <StatCard label="Vendor Net Earnings" value={formatMoney(summary.vendorNetEarning ?? summary.totalEarnings)} />
        <StatCard label="Super Admin Commission" value={formatMoney(summary.superAdminCommission)} />
        <StatCard label="Available Balance" value={formatMoney(summary.availableBalance)} />
        <StatCard label="Pending Net Earnings" value={formatMoney(summary.pendingBalance)} />
        <StatCard label="Pending Commission" value={formatMoney(summary.pendingCommission)} />
        <StatCard label="Completed Orders" value={summary.completedOrders} />
        <StatCard label="Pending Orders" value={summary.pendingOrders} />
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
        <h2 className="text-lg font-semibold text-[var(--admin-text)]">Withdrawals Snapshot</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard label="Pending" value={formatMoney(summary.withdrawals?.totalPending || 0)} />
          <StatCard label="Approved" value={formatMoney(summary.withdrawals?.totalApproved || 0)} />
          <StatCard label="Paid" value={formatMoney(summary.withdrawals?.totalPaid || 0)} />
        </div>
      </div>
    </div>
  );
}
