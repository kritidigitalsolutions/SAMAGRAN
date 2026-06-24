import { useEffect, useState } from "react";
import API from "../api/axios";
import { getAdminRole } from "../utils/auth";
import { toast } from "react-toastify";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v || 0));

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN");
};

export default function PanditPayouts() {
  const isSuperAdmin = getAdminRole() === "super-admin";
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [threshold, setThreshold] = useState(500);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [selectedPanditBank, setSelectedPanditBank] = useState(null);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [alertsRes, historyRes] = await Promise.all([
        API.get("/admin/pandit-payouts/alerts"),
        API.get("/admin/pandit-payouts/history"),
      ]);
      setAlerts(alertsRes.data?.data?.alerts || []);
      setThreshold(alertsRes.data?.data?.threshold || 500);
      setHistory(historyRes.data?.data?.payouts || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payouts data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewBankDetails = (pandit) => {
    setSelectedPanditBank(pandit);
    setBankModalOpen(true);
  };

  const handlePayClick = (alertItem) => {
    setSelectedAlert(alertItem);
    setPayAmount(alertItem.balance || "");
    setPayMethod("bank");
    setPayRef("");
    setPayNotes("");
    setPayModalOpen(true);
  };

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;

    if (!payRef.trim()) {
      toast.error("Transaction reference/UTR is required");
      return;
    }

    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Valid payout amount is required");
      return;
    }

    if (amountNum > selectedAlert.balance) {
      toast.error("Payout amount cannot exceed available balance");
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        panditId: selectedAlert.pandit?._id,
        amount: amountNum,
        method: payMethod,
        reference: payRef.trim(),
        notes: payNotes.trim(),
      };

      await API.post("/admin/pandit-payouts", payload);
      toast.success("Payout recorded successfully and Pandit notified!");
      setPayModalOpen(false);
      setSelectedAlert(null);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to process payout");
    } finally {
      setProcessing(false);
    }
  };

  const filteredHistory = history.filter((payout) => {
    const panditName = (payout.pandit?.fullName || "").toLowerCase();
    const phone = (payout.pandit?.phone || "").toLowerCase();
    const ref = (payout.reference || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return panditName.includes(query) || phone.includes(query) || ref.includes(query);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading payouts dashboard…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-4 shadow-[var(--admin-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B1E3F]">Finance</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--admin-text)]">Pandit Payouts</h1>
        <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
          {isSuperAdmin
            ? "Monitor payout alerts, inspect bank details, record manual transfers, and manage historical payouts for all Pandits."
            : "Manage manual transfers and payouts for Pandits associated with your vendor account."}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Threshold and Stat Alert Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-muted)]">Payout Threshold</p>
          <p className="mt-2 text-2xl font-bold text-[#8B1E3F] dark:text-[#f7b8ca]">{fmt(threshold)}</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">Alerts trigger when available balance exceeds this limit.</p>
        </div>
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-muted)]">Active Alerts</p>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{alerts.length} Pandits</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">Pandits waiting to be settled manually.</p>
        </div>
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-muted)]">Total Payouts Logged</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{history.length} Transfers</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">Successfully tracked transactions in the portal.</p>
        </div>
      </div>

      {/* Payout Alerts List */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)] overflow-hidden">
        <div className="bg-[#8B1E3F]/5 border-b border-[var(--admin-border)] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--admin-text)] flex items-center gap-2">
              <span className="text-amber-500">⚠️</span> Payout Threshold Alerts
            </h2>
            <p className="text-xs text-[var(--admin-muted)] mt-0.5">
              These Pandits have accumulated earnings past the {fmt(threshold)} payout threshold.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-3 py-1 text-xs font-bold">
            {alerts.length} Pending
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-8 text-center text-[var(--admin-muted)] flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">✨</span>
            <p className="font-semibold text-sm">All caught up!</p>
            <p className="text-xs">No Pandits currently exceed the payout threshold.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {alerts.map((alert) => {
              const name = alert.pand?.fullName || alert.pandit?.fullName || "Pandit";
              const initials = name.slice(0, 2).toUpperCase();

              return (
                <div key={alert._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--admin-surface-soft)] transition-colors">
                  <div className="flex items-center gap-4">
                    {alert.pandit?.profileImage ? (
                      <img
                        src={alert.pandit.profileImage}
                        alt={name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-[#8B1E3F]/20"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-[#8B1E3F]/10 flex items-center justify-center text-sm font-bold text-[#8B1E3F]">
                        {initials}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-[var(--admin-text)] text-base">{name}</h3>
                      <p className="text-sm text-[var(--admin-muted)]">{alert.pandit?.phone || "—"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-[var(--admin-muted)]">Available Balance</p>
                      <p className="text-xl font-bold text-[#8B1E3F] dark:text-[#f7b8ca]">{fmt(alert.balance)}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Total Paid: {fmt(alert.totalPaid)}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewBankDetails(alert.pandit)}
                        className="rounded-xl border border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)] px-4 py-2 text-xs font-semibold text-[var(--admin-text)]"
                      >
                        🏦 Bank Details
                      </button>
                      <button
                        onClick={() => handlePayClick(alert)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5"
                      >
                        💸 Pay Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payout History Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
        <div className="px-5 py-4 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[var(--admin-text)] text-lg">Payout Settlement History</h2>
            <p className="text-xs text-[var(--admin-muted)] mt-0.5">History of recorded manual transfers to Pandits.</p>
          </div>
          <input
            type="text"
            placeholder="Search by name, phone or UTR…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--admin-surface-soft)]">
              <tr className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Pandit</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">UTR Reference</th>
                <th className="px-5 py-3">Processed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--admin-muted)]">
                    No matching payout records found.
                  </td>
                </tr>
              )}
              {filteredHistory.map((payout) => (
                <tr key={payout._id} className="hover:bg-[var(--admin-surface-soft)] transition-colors">
                  <td className="px-5 py-4 text-[var(--admin-muted)] whitespace-nowrap">{fmtDate(payout.paidAt)}</td>
                  <td className="px-5 py-4 font-semibold text-[var(--admin-text)]">
                    <div>{payout.pandit?.fullName || "—"}</div>
                    <div className="text-xs text-[var(--admin-muted)] font-normal">{payout.pandit?.phone || ""}</div>
                  </td>
                  <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {fmt(payout.amount)}
                  </td>
                  <td className="px-5 py-4 capitalize text-[var(--admin-muted)]">{payout.method}</td>
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-[var(--admin-text)] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">
                      {payout.reference}
                    </span>
                    {payout.notes && (
                      <p className="text-[10px] text-[var(--admin-muted)] mt-1 font-sans truncate max-w-[200px]" title={payout.notes}>
                        {payout.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--admin-muted)]">
                    {payout.processedBy?.name || payout.processedBy?.email || "Admin"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Details Modal */}
      {bankModalOpen && selectedPanditBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] p-6 shadow-2xl dark:border-white/10 dark:bg-[#141820] text-[#2f1618] dark:text-[#fff3dc]">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <h3 className="text-lg font-bold">🏦 Bank Account Details</h3>
              <button
                onClick={() => { setBankModalOpen(false); setSelectedPanditBank(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <p className="text-xs text-[var(--admin-muted)] italic">
                Use these details to manually transfer the payout amount via Net Banking, UPI, or other bank transfers.
              </p>
              <div className="space-y-2 rounded-2xl bg-black/5 p-4 dark:bg-white/5">
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--admin-muted)]">Holder Name</span>
                  <span className="font-bold text-base">{selectedPanditBank.accountHolderName || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--admin-muted)]">Account Number</span>
                  <span className="font-bold font-mono text-base tracking-wider">{selectedPanditBank.accountNumber || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--admin-muted)]">IFSC Code</span>
                  <span className="font-bold font-mono text-base text-[#8B1E3F] dark:text-[#f7b8ca]">{selectedPanditBank.ifscCode || "—"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--admin-muted)]">Bank Name</span>
                  <span className="font-bold text-base">{selectedPanditBank.bankName || "—"}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => { setBankModalOpen(false); setSelectedPanditBank(null); }}
                className="rounded-xl border border-[#d7bf9b] bg-transparent px-4 py-2 text-xs font-semibold hover:bg-[#8B1E3F]/5 dark:border-white/20 dark:text-[#f7e3c0]"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payout Modal (Form) */}
      {payModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] p-6 shadow-2xl dark:border-white/10 dark:bg-[#141820] text-[#2f1618] dark:text-[#fff3dc]">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <h3 className="text-lg font-bold">Process Manual Payout</h3>
              <button
                onClick={() => { setPayModalOpen(false); setSelectedAlert(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="mt-4 space-y-4">
              <div className="rounded-2xl bg-black/5 p-4 text-xs space-y-2 dark:bg-white/5">
                <div className="flex justify-between">
                  <span className="text-[var(--admin-muted)] font-medium">Pandit Name:</span>
                  <span className="font-semibold">{selectedAlert.pandit?.fullName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--admin-muted)] font-medium">Phone:</span>
                  <span className="font-semibold">{selectedAlert.pandit?.phone || "—"}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--admin-border)] pt-2 mt-2">
                  <span className="text-[var(--admin-muted)] font-semibold text-sm">Outstanding Balance:</span>
                  <span className="font-bold text-sm text-[#8B1E3F] dark:text-[#f7b8ca]">{fmt(selectedAlert.balance)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Payout Amount (₹)
                </label>
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Payout Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Transaction Reference (UTR / Txn ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR123456789"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Transaction Notes / Details (Optional)
                </label>
                <textarea
                  placeholder="e.g. Paid from Axis bank corporate account"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm text-[#2f1618] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white outline-none focus:border-[#8B1E3F]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setPayModalOpen(false); setSelectedAlert(null); }}
                  className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {processing && <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
