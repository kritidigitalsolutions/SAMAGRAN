import { useEffect, useState } from "react";
import API from "../api/axios";
import { adminApi } from "../api/admin/api";
import { getAdminRole } from "../utils/auth";
import { toast } from "react-toastify";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v || 0));

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN");
};

const statusColors = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

const defaultForm = {
  amount: "", method: "bank",
  accountName: "", accountNumber: "", ifsc: "",
  upiId: "", notes: "",
};

export default function Withdrawals() {
  const isSuperAdmin = getAdminRole() === "super-admin";
  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Payout confirmation modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [payRef, setPayRef] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payExpectedArrival, setPayExpectedArrival] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [withdrawalRes, summaryRes] = await Promise.all([
        API.get("/admin/vendor/withdrawals"),
        API.get("/admin/vendor/earnings/summary"),
      ]);
      setWithdrawals(withdrawalRes.data?.data?.withdrawals || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(""); setError("");
    try {
      const payload = {
        amount: Number(form.amount),
        method: form.method,
        bankDetails: { accountName: form.accountName, accountNumber: form.accountNumber, ifsc: form.ifsc },
        upiId: form.upiId,
        notes: form.notes,
      };
      await API.post("/admin/vendor/withdrawals", payload);
      setMessage("Withdrawal request submitted successfully.");
      setForm(defaultForm);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaidClick = (item) => {
    setSelectedWithdrawal(item);
    setPayAmount(item.amount || "");
    setPayNotes(item.notes || "");
    setPayExpectedArrival(item.expectedArrival || "Within 24 hours");
    setPayRef("");
    setPayModalOpen(true);
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;
    setMarkingId(selectedWithdrawal._id);
    try {
      await adminApi.patch(`/vendor/withdrawals/${selectedWithdrawal._id}/mark-paid`, {
        amount: Number(payAmount),
        reference: payRef.trim(),
        notes: payNotes.trim(),
        expectedArrival: payExpectedArrival.trim(),
      });
      toast.success("Withdrawal marked as paid!");
      setPayModalOpen(false);
      setSelectedWithdrawal(null);
      setPayRef("");
      setPayAmount("");
      setPayNotes("");
      setPayExpectedArrival("");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark as paid");
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading withdrawals…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-4 shadow-[var(--admin-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B1E3F]">Finance</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--admin-text)]">Withdrawals</h1>
        <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
          {isSuperAdmin ? "Manage all vendor withdrawal requests." : "Request payouts from your available balance."}
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</div>}

      {/* Summary + Request */}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Balance Card */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-muted)]">Available Balance</p>
          <p className="mt-3 text-3xl font-bold text-[#8B1E3F]">{fmt(summary?.availableBalance || 0)}</p>
          <div className="mt-3 space-y-1.5 text-sm text-[var(--admin-muted)]">
            <div className="flex justify-between">
              <span>Total Earnings</span>
              <span className="font-semibold text-[var(--admin-text)]">{fmt(summary?.totalEarnings || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Settlement</span>
              <span className="font-semibold text-amber-600">{fmt(summary?.pendingBalance || 0)}</span>
            </div>
          </div>
        </div>

        {/* Request Form (vendor only) */}
        {!isSuperAdmin && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Request Withdrawal</h2>
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Amount (₹)</label>
                <input name="amount" type="number" min="1" step="0.01" value={form.amount} onChange={handleChange} required className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Method</label>
                <select name="method" value={form.method} onChange={handleChange} className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 dark:text-white dark:bg-[#0f1218] py-2 text-sm">
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              {form.method === "bank" ? (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Account Name</label>
                    <input name="accountName" value={form.accountName} onChange={handleChange} required className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Account Number</label>
                    <input name="accountNumber" value={form.accountNumber} onChange={handleChange} required className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">IFSC Code</label>
                    <input name="ifsc" value={form.ifsc} onChange={handleChange} required className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">UPI ID</label>
                  <input name="upiId" value={form.upiId} onChange={handleChange} required className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={submitting} className="rounded-xl bg-[#8B1E3F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a0233f] disabled:opacity-60">
                  {submitting ? "Submitting…" : "Submit Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        )}
        {isSuperAdmin && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex flex-col justify-center">
            <p className="text-sm text-[var(--admin-muted)]">
              As super admin, you can view all vendor withdrawal requests and mark them as paid after processing the bank transfer.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Total Requests", value: withdrawals.length },
                { label: "Pending", value: withdrawals.filter((w) => w.status === "pending").length },
                { label: "Paid Out", value: withdrawals.filter((w) => w.status === "paid").length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-[#8B1E3F]/5 p-3 text-center">
                  <p className="text-xl font-bold text-[#8B1E3F]">{value}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Withdrawals Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
        <div className="px-5 py-4 border-b border-[var(--admin-border)]">
          <h2 className="font-semibold text-[var(--admin-text)]">Withdrawal History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--admin-surface-soft)]">
              <tr className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                <th className="px-5 py-3">Date</th>
                {isSuperAdmin && <th className="px-5 py-3">Vendor</th>}
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reference</th>
                {isSuperAdmin && <th className="px-5 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 5} className="px-5 py-8 text-center text-[var(--admin-muted)]">
                    No withdrawals yet.
                  </td>
                </tr>
              )}
              {withdrawals.map((item) => (
                <tr key={item._id} className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)] transition-colors">
                  <td className="px-5 py-3 text-[var(--admin-muted)]">{fmtDate(item.createdAt)}</td>
                  {isSuperAdmin && (
                    <td className="px-5 py-3">
                      <div className="font-semibold text-[var(--admin-text)]">
                        {item.vendor?.businessName || item.vendor?.name || "—"}
                      </div>
                      <div className="text-xs text-[var(--admin-muted)]">
                        {item.vendor?.phone || item.vendor?.email || ""}
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3 font-semibold text-[var(--admin-text)]">{fmt(item.amount)}</td>
                  <td className="px-5 py-3 capitalize text-[var(--admin-muted)]">{item.method}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[item.status] || "bg-slate-100 text-slate-700"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--admin-muted)]">
                    {item.reference ? (
                      <div>
                        <span className="font-mono font-semibold text-[var(--admin-text)]">{item.reference}</span>
                        {item.expectedArrival && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-sans">ETA: {item.expectedArrival}</p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-[var(--admin-muted)] font-sans truncate max-w-[150px] mt-0.5" title={item.notes}>{item.notes}</p>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-5 py-3 text-right">
                      {item.status !== "paid" ? (
                        <button
                          onClick={() => handleMarkPaidClick(item)}
                          disabled={markingId === item._id}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5 ml-auto"
                        >
                          {markingId === item._id ? (
                            <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">
                          ✓ Paid {item.processedAt ? fmtDate(item.processedAt) : ""}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout confirmation modal */}
      {payModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] p-6 shadow-2xl dark:border-white/10 dark:bg-[#141820] text-[#2f1618] dark:text-[#fff3dc]">
            <h2 className="text-lg font-bold">Process Payout</h2>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">Confirm details and enter transaction reference.</p>
            
            <div className="mt-4 space-y-3 rounded-2xl bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="flex justify-between">
                <span className="text-[var(--admin-muted)] font-medium">Vendor:</span>
                <span className="font-semibold">{selectedWithdrawal.vendor?.businessName || selectedWithdrawal.vendor?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--admin-muted)] font-medium">Amount:</span>
                <span className="font-bold text-[#8B1E3F] dark:text-[#f7b8ca]">{fmt(selectedWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between capitalize">
                <span className="text-[var(--admin-muted)] font-medium">Method:</span>
                <span className="font-semibold">{selectedWithdrawal.method}</span>
              </div>
              
              <div className="border-t border-gray-200 dark:border-white/10 pt-2 space-y-1.5 text-xs">
                {selectedWithdrawal.method === "bank" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-muted)]">Holder Name:</span>
                      <span className="font-semibold">{selectedWithdrawal.bankDetails?.accountName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-muted)]">Account Number:</span>
                      <span className="font-semibold font-mono">{selectedWithdrawal.bankDetails?.accountNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-muted)]">IFSC:</span>
                      <span className="font-semibold font-mono">{selectedWithdrawal.bankDetails?.ifsc || "—"}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-[var(--admin-muted)]">UPI ID:</span>
                    <span className="font-semibold font-mono">{selectedWithdrawal.upiId || "—"}</span>
                  </div>
                )}
              </div>
            </div>
            
            <form onSubmit={handleConfirmPay} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Confirm/Override Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Transaction Reference (UTR)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR1234567890"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Expected Arrival Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Within 24 hours, By tomorrow evening"
                  value={payExpectedArrival}
                  onChange={(e) => setPayExpectedArrival(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {["Within 1 hour", "Within 24 hours", "2-3 business days"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPayExpectedArrival(opt)}
                      className="text-[10px] bg-[#8B1E3F]/5 border border-[#8B1E3F]/20 text-[#8B1E3F] hover:bg-[#8B1E3F]/10 px-2 py-0.5 rounded-md dark:border-white/10 dark:text-[#f7e3c0] dark:bg-white/5"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">Payout Notes / Internal Details</label>
                <textarea
                  placeholder="e.g. Transferred via HDFC netbanking"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setPayModalOpen(false); setSelectedWithdrawal(null); setPayRef(""); setPayAmount(""); setPayNotes(""); setPayExpectedArrival(""); }}
                  className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markingId !== null}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {markingId !== null && <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
