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
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const SummaryCard = ({ label, value, sub, color = "default", icon }) => {
  const textColor = {
    default: "text-[var(--admin-text)]",
    green: "text-emerald-600 dark:text-emerald-400",
    primary: "text-[#8B1E3F] dark:text-[#f7b8ca]",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[color];
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--admin-muted)]">{sub}</p>}
    </div>
  );
};

export default function PanditEarnings() {
  const isSuperAdmin = getAdminRole() === "super-admin";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPandit, setExpandedPandit] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/pandits/earnings");
      setData(res.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load pandit earnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkAllPaid = async (panditId, panditName) => {
    if (!window.confirm(`Mark all pending payouts for ${panditName} as PAID?`)) return;
    setMarkingId(panditId);
    try {
      const res = await adminApi.patch(`/pandits/mark-all-payout-paid/${panditId}`);
      toast.success(res.data?.message || "Payouts marked as paid!");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark payouts");
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkSinglePaid = async (bookingId) => {
    if (!window.confirm("Mark this booking's payout as PAID?")) return;
    setMarkingId(`booking-${bookingId}`);
    try {
      await adminApi.patch(`/pandit-bookings/${bookingId}/mark-payout-paid`);
      toast.success("Payout marked as paid!");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark payout");
    } finally {
      setMarkingId(null);
    }
  };

  const filteredPandits = (data?.pandits || []).filter((row) => {
    const name = (row.pandit?.fullName || "").toLowerCase();
    const phone = (row.pandit?.phone || "").toLowerCase();
    return !search || name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading pandit earnings…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-4 shadow-[var(--admin-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B1E3F]">Pandit Finance</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--admin-text)]">Pandit Earnings & Payouts</h1>
        <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
          Track dakshina collected, admin commission, and pandit payout records.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total Dakshina Collected"
          value={fmt(summary.totalDakshina)}
          sub="Across all completed bookings"
          icon="🕉️"
        />
        <SummaryCard
          label="Admin Commission"
          value={fmt(summary.totalAdminCommission)}
          sub={`${summary.adminCommissionPercent || 20}% of dakshina`}
          color="primary"
          icon="🏛️"
        />
        <SummaryCard
          label="Pandit Earnings"
          value={fmt(summary.totalPanditEarnings)}
          sub={`${100 - (summary.adminCommissionPercent || 20)}% of dakshina`}
          color="green"
          icon="👳"
        />
        <SummaryCard
          label="Total Paid Out"
          value={fmt(summary.totalPaid)}
          color="green"
          icon="✅"
        />
        <SummaryCard
          label="Pending Payout"
          value={fmt(summary.totalPending)}
          sub="Not yet settled"
          color="amber"
          icon="⏳"
        />
      </div>

      {/* Commission Info Banner */}
      <div className="rounded-2xl border border-[#8B1E3F]/20 bg-[#8B1E3F]/5 px-5 py-3 flex items-center gap-3 dark:bg-[#8B1E3F]/10">
        <span className="text-lg">ℹ️</span>
        <p className="text-sm text-[#6f3945] dark:text-[#f7e3c0]">
          Commission split: <strong>Admin {summary.adminCommissionPercent || 20}%</strong> · <strong>Pandit {100 - (summary.adminCommissionPercent || 20)}%</strong> of total dakshina per booking.
        </p>
      </div>

      {/* Pandit-wise Breakdown */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
        <div className="px-5 py-4 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--admin-text)]">Pandit-wise Breakdown</h2>
            <p className="text-xs text-[var(--admin-muted)] mt-0.5">{filteredPandits.length} pandits</p>
          </div>
          <input
            type="text"
            placeholder="Search pandit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[var(--admin-muted)] bg-[var(--admin-surface-soft)]">
                <th className="px-5 py-3">Pandit</th>
                <th className="px-5 py-3 text-center">Bookings</th>
                <th className="px-5 py-3 text-right">Dakshina</th>
                <th className="px-5 py-3 text-right">Admin Share</th>
                <th className="px-5 py-3 text-right">Pandit Share</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Pending</th>
                {isSuperAdmin && <th className="px-5 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPandits.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-5 py-8 text-center text-[var(--admin-muted)]">
                    No pandit earnings found.
                  </td>
                </tr>
              )}
              {filteredPandits.map((row) => {
                const panditId = String(row.pandit?._id || "");
                const isExpanded = expandedPandit === panditId;
                const panditName = row.pandit?.fullName || "Unknown Pandit";
                const initials = panditName.slice(0, 2).toUpperCase();

                return (
                  <>
                    <tr
                      key={panditId}
                      className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)] transition-colors cursor-pointer"
                      onClick={() => setExpandedPandit(isExpanded ? null : panditId)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {row.pandit?.profileImage ? (
                            <img src={row.pandit.profileImage} alt={panditName} className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-[#8B1E3F]/10 flex items-center justify-center text-sm font-bold text-[#8B1E3F]">
                              {initials}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[var(--admin-text)]">{panditName}</p>
                            <p className="text-xs text-[var(--admin-muted)]">{row.pandit?.phone || "—"}</p>
                          </div>
                          <span className="ml-1 text-xs text-[var(--admin-muted)]">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-[var(--admin-text)]">{row.totalBookings}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[var(--admin-text)]">{fmt(row.totalDakshina)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#8B1E3F]">{fmt(row.adminCommission)}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(row.panditEarnings)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(row.paidAmount)}</td>
                      <td className="px-5 py-3 text-right">
                        {row.pendingAmount > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(row.pendingAmount)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Settled</span>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {row.pendingAmount > 0 ? (
                            <button
                              onClick={() => handleMarkAllPaid(panditId, panditName)}
                              disabled={markingId === panditId}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1.5 mx-auto"
                            >
                              {markingId === panditId ? (
                                <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              ) : "✓"}
                              Mark All Paid
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold">All Settled</span>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Expandable booking details */}
                    {isExpanded && (
                      <tr key={`${panditId}-expanded`} className="bg-[var(--admin-surface-soft)]">
                        <td colSpan={isSuperAdmin ? 8 : 7} className="px-5 py-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-3">Booking Details</p>
                          <div className="space-y-2">
                            {row.bookings.map((b) => (
                              <div key={String(b._id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--admin-text)]">{b.ritualName || "Puja Booking"}</p>
                                  <p className="text-xs text-[var(--admin-muted)]">{fmtDate(b.bookingDate)} · Created {fmtDate(b.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-center">
                                    <p className="text-[var(--admin-muted)]">Dakshina</p>
                                    <p className="font-bold text-[var(--admin-text)]">{fmt(b.dakshina)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[var(--admin-muted)]">Admin</p>
                                    <p className="font-bold text-[#8B1E3F]">{fmt(b.adminShare)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[var(--admin-muted)]">Pandit</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(b.panditShare)}</p>
                                  </div>
                                  <div>
                                    {b.payoutPaid ? (
                                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                        ✓ Paid {b.payoutPaidAt ? fmtDate(b.payoutPaidAt) : ""}
                                      </span>
                                    ) : isSuperAdmin ? (
                                      <button
                                        onClick={() => handleMarkSinglePaid(String(b._id))}
                                        disabled={markingId === `booking-${String(b._id)}`}
                                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        {markingId === `booking-${String(b._id)}` ? "…" : "Mark Paid"}
                                      </button>
                                    ) : (
                                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
