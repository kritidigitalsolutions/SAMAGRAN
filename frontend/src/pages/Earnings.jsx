import { useEffect, useState } from "react";
import API from "../api/axios";
import { getAdminRole } from "../utils/auth";

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
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("all");

  const isAdmin = getAdminRole() === "super-admin";

  useEffect(() => {
    const fetchVendors = async () => {
      if (!isAdmin) return;
      try {
        const res = await API.get("/admin/vendors?limit=100");
        setVendors(res.data?.data?.vendors || []);
      } catch (err) {
        console.error("Failed to fetch vendors for earnings filter", err);
      }
    };
    fetchVendors();
  }, [isAdmin]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {};
        if (selectedVendorId !== "all") {
          params.vendorId = selectedVendorId;
        }

        const res = await API.get("/admin/vendor/earnings/summary", { params });
        setSummary(res.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load earnings");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [selectedVendorId]);

  if (loading && !summary) {
    return <div className="p-6">Loading earnings...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Earnings</h1>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Vendor earnings summary and balances.</p>
        </div>

        {isAdmin && (
          <div className="flex flex-col min-w-[200px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)] mb-2">
              Filter by Vendor
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.businessName || v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!summary ? (
        <div className="p-6">No earnings data found.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total Sales" value={formatMoney(summary.totalSales)} />
            <StatCard label="Vendor Net Earnings" value={formatMoney(summary.vendorNetEarning ?? summary.totalEarnings)} />
            <StatCard label="Super Admin Commission" value={formatMoney(summary.superAdminCommission)} />
            <StatCard label="Available Balance" value={formatMoney(summary.availableBalance)} />
            <StatCard label="Pending Net Earnings" value={formatMoney(summary.pendingBalance)} />
            <StatCard label="Pending Commission" value={formatMoney(summary.pendingCommission)} />
            <StatCard label="Completed Orders" value={summary.completedOrders} />
            <StatCard label="Pending Orders" value={summary.pendingOrders} />
          </div>

          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Withdrawals Snapshot</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <StatCard label="Pending" value={formatMoney(summary.withdrawals?.totalPending || 0)} />
              <StatCard label="Approved" value={formatMoney(summary.withdrawals?.totalApproved || 0)} />
              <StatCard label="Paid" value={formatMoney(summary.withdrawals?.totalPaid || 0)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
