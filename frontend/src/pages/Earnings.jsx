import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import { getAdminRole } from "../utils/auth";
import { toast } from "react-toastify";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v || 0));

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const StatCard = ({ label, value, color = "default" }) => {
  const colors = {
    default: "text-[var(--admin-text)]",
    green: "text-emerald-600 dark:text-emerald-400",
    primary: "text-[#8B1E3F] dark:text-[#f7b8ca]",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{label}</p>
      <p className={`mt-2.5 text-2xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
};

export default function Earnings() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("all");

  // Withdrawal features
  const [withdrawals, setWithdrawals] = useState([]);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amount: "",
    method: "bank",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    notes: "",
  });

  const isSuperAdmin = getAdminRole() === "super-admin";

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchVendors = async () => {
      try {
        const res = await API.get("/admin/vendors?limit=200");
        setVendors(res.data?.data?.vendors || []);
      } catch { /* ignore */ }
    };
    fetchVendors();
  }, [isSuperAdmin]);

  const fetchAll = useCallback(async () => {
    try {
      setTxLoading(true);
      setError("");

      const params = {};
      if (selectedVendorId !== "all") params.vendorId = selectedVendorId;

      const requests = [
        API.get("/admin/vendor/earnings/summary", { params }),
        API.get("/admin/vendor/transactions", { params }),
        API.get("/admin/vendor/withdrawals", { params }),
      ];

      if (!isSuperAdmin) {
        requests.push(API.get("/admin/vendor/profile"));
      }

      const results = await Promise.all(requests);
      setSummary(results[0].data?.data || null);
      setTransactions(results[1].data?.data?.transactions || []);
      setWithdrawals(results[2].data?.data?.withdrawals || []);
      if (!isSuperAdmin && results[3]) {
        setVendorProfile(results[3].data?.data?.vendor || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load earnings");
    } finally {
      setLoading(false);
      setTxLoading(false);
    }
  }, [selectedVendorId, isSuperAdmin]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [selectedVendorId, fetchAll]);

  useEffect(() => {
    if (vendorProfile) {
      setRequestForm((prev) => ({
        ...prev,
        accountName: vendorProfile.bank?.accountHolder || vendorProfile.name || "",
        accountNumber: vendorProfile.bank?.accountNumber || "",
        ifsc: vendorProfile.bank?.ifsc || "",
        upiId: vendorProfile.bank?.upiId || "",
      }));
    }
  }, [vendorProfile]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    const reqAmount = Number(requestForm.amount);
    if (!reqAmount || reqAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (reqAmount > (summary?.availableBalance || 0)) {
      toast.error("Withdrawal amount cannot exceed available balance");
      return;
    }
    setRequestLoading(true);
    try {
      const payload = {
        amount: reqAmount,
        method: requestForm.method,
        bankDetails: {
          accountName: requestForm.accountName,
          accountNumber: requestForm.accountNumber,
          ifsc: requestForm.ifsc,
        },
        upiId: requestForm.upiId,
        notes: requestForm.notes,
      };
      await API.post("/admin/vendor/withdrawals", payload);
      toast.success("Withdrawal request submitted successfully!");
      setRequestModalOpen(false);
      setRequestForm((prev) => ({ ...prev, amount: "", notes: "" }));
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit request");
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading earnings…</p>
      </div>
    );
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const earningTx = transactions.filter((t) => t.type === "earning");

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-4 shadow-[var(--admin-shadow)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B1E3F]">Finance</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--admin-text)]">Earnings</h1>
          <p className="mt-0.5 text-sm text-[var(--admin-muted)]">Your revenue, commissions and balances.</p>
        </div>
        {isSuperAdmin ? (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1.5">
              Filter by Vendor
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="h-10 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>{v.businessName || v.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <button
            onClick={() => setRequestModalOpen(true)}
            className="rounded-xl bg-[#8B1E3F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a0233f] transition-all"
          >
            Request Withdrawal
          </button>
        )}
      </div>

      {!summary ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-8 text-center text-[var(--admin-muted)]">
          No earnings data found.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Sales" value={fmt(summary.totalSales)} />
            <StatCard label="Vendor Net Earnings" value={fmt(summary.vendorNetEarning ?? summary.totalEarnings)} color="green" />
            <StatCard label="Admin Commission" value={fmt(summary.superAdminCommission)} color="primary" />
            <StatCard label="Available Balance" value={fmt(summary.availableBalance)} color="green" />
            <StatCard label="Pending Earnings" value={fmt(summary.pendingBalance)} color="amber" />
            <StatCard label="Pending Commission" value={fmt(summary.pendingCommission)} color="amber" />
            <StatCard label="Completed Orders" value={summary.completedOrders ?? "—"} />
            <StatCard label="Pending Orders" value={summary.pendingOrders ?? "—"} />
          </div>

          {/* Withdrawals Snapshot */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#8B1E3F] mb-4">Withdrawal Snapshot</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Pending Payouts" value={fmt(summary.withdrawals?.totalPending || 0)} color="amber" />
              <StatCard label="Approved" value={fmt(summary.withdrawals?.totalApproved || 0)} />
              <StatCard label="Total Paid Out" value={fmt(summary.withdrawals?.totalPaid || 0)} color="green" />
            </div>
          </div>

          {/* Commission Breakdown per Order */}
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
            <div className="px-5 py-4 border-b border-[var(--admin-border)] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--admin-text)]">Commission Breakdown per Order</h2>
                <p className="text-xs text-[var(--admin-muted)] mt-0.5">Your earnings vs admin commission for each completed order</p>
              </div>
              <span className="text-xs font-semibold text-[var(--admin-muted)]">{earningTx.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-[var(--admin-muted)] bg-[var(--admin-surface-soft)]">
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Gross Amount</th>
                    <th className="px-5 py-3 text-right">Your Earnings</th>
                    <th className="px-5 py-3 text-right">Admin Commission</th>
                    <th className="px-5 py-3 text-center">Commission %</th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading && (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-[var(--admin-muted)]">Loading transactions…</td>
                    </tr>
                  )}
                  {!txLoading && earningTx.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-[var(--admin-muted)]">No completed orders yet.</td>
                    </tr>
                  )}
                  {earningTx.map((tx) => {
                    const gross = tx.grossAmount || (tx.amount + (tx.superAdminCommission || 0));
                    const adminComm = tx.superAdminCommission || 0;
                    const commPct = gross > 0 ? Math.round((adminComm / gross) * 100) : 0;
                    return (
                      <tr key={tx.id} className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)] transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-[var(--admin-muted)]">
                          #{String(tx.orderId || tx.reference || tx.id).slice(-8).toUpperCase()}
                        </td>
                        <td className="px-5 py-3 text-[var(--admin-muted)]">{fmtDate(tx.createdAt)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-[var(--admin-text)]">{fmt(gross)}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(tx.amount)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-[#8B1E3F]">{fmt(adminComm)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="rounded-full bg-[#8B1E3F]/10 px-2.5 py-0.5 text-xs font-bold text-[#8B1E3F]">
                            {commPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawal History */}
          {!isSuperAdmin && (
            <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
              <div className="px-5 py-4 border-b border-[var(--admin-border)]">
                <h2 className="font-semibold text-[var(--admin-text)]">Withdrawal Requests & Payouts</h2>
                <p className="text-xs text-[var(--admin-muted)] mt-0.5">Track your withdrawal requests and their settlement status</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-[var(--admin-muted)] bg-[var(--admin-surface-soft)]">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Reference / UTR</th>
                      <th className="px-5 py-3">Arrival Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-6 text-center text-[var(--admin-muted)]">No withdrawal requests found.</td>
                      </tr>
                    )}
                    {withdrawals.map((w) => (
                      <tr key={w._id} className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)] transition-colors">
                        <td className="px-5 py-3 text-[var(--admin-muted)]">{fmtDate(w.createdAt || w.requestedAt)}</td>
                        <td className="px-5 py-3 font-semibold text-[var(--admin-text)]">{fmt(w.amount)}</td>
                        <td className="px-5 py-3 capitalize text-[var(--admin-muted)]">{w.method}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            w.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" :
                            w.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" :
                            w.status === "approved" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" :
                            "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-[var(--admin-muted)]">{w.reference || "—"}</td>
                        <td className="px-5 py-3">
                          {w.status === "paid" ? (
                            <div className="text-xs">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Settled ✓</span>
                              {w.expectedArrival && (
                                <p className="text-[10px] text-[var(--admin-muted)] mt-0.5">Arrives: {w.expectedArrival}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--admin-muted)]">Processing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Request Withdrawal Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] p-6 shadow-2xl dark:border-white/10 dark:bg-[#141820] text-[#2f1618] dark:text-[#fff3dc] overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold">Request Withdrawal</h2>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Submit a payout request from your available balance.
            </p>

            <div className="mt-4 rounded-2xl bg-black/5 p-4 text-sm dark:bg-white/5 flex justify-between items-center">
              <span className="text-[var(--admin-muted)] font-medium">Available Balance:</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(summary?.availableBalance || 0)}</span>
            </div>

            <form onSubmit={handleRequestSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  max={summary?.availableBalance || 0}
                  value={requestForm.amount}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Payout Method
                </label>
                <select
                  value={requestForm.method}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, method: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              {requestForm.method === "bank" ? (
                <div className="space-y-3 bg-black/5 p-3 rounded-2xl dark:bg-white/5">
                  <div>
                    <label className="block text-xs text-[var(--admin-muted)] font-medium">Account Name</label>
                    <input
                      type="text"
                      required
                      value={requestForm.accountName}
                      onChange={(e) => setRequestForm((prev) => ({ ...prev, accountName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#d7c3a3] bg-white px-3 py-1.5 text-xs text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--admin-muted)] font-medium">Account Number</label>
                    <input
                      type="text"
                      required
                      value={requestForm.accountNumber}
                      onChange={(e) => setRequestForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#d7c3a3] bg-white px-3 py-1.5 text-xs text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--admin-muted)] font-medium">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={requestForm.ifsc}
                      onChange={(e) => setRequestForm((prev) => ({ ...prev, ifsc: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#d7c3a3] bg-white px-3 py-1.5 text-xs text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-black/5 p-3 rounded-2xl dark:bg-white/5">
                  <label className="block text-xs text-[var(--admin-muted)] font-medium">UPI ID</label>
                  <input
                    type="text"
                    required
                    value={requestForm.upiId}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, upiId: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#d7c3a3] bg-white px-3 py-1.5 text-xs text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none font-mono"
                    placeholder="e.g. UPI@bank"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Notes
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                  rows="2"
                  placeholder="Additional payout instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestLoading}
                  className="rounded-xl bg-[#8B1E3F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a0233f] disabled:opacity-60 flex items-center gap-1.5"
                >
                  {requestLoading && <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
