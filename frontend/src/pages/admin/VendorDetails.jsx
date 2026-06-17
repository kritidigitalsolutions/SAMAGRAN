import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../api/admin/api";
import { toast } from "react-toastify";

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ── UI Atoms ──────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B1E3F]">{children}</h3>
);

const InfoRow = ({ label, value, badge }) => (
  <div className="flex items-start justify-between gap-2 py-2.5 border-b border-[#f0e3d1] dark:border-white/10 last:border-0">
    <span className="text-xs font-semibold text-[#8c7461] dark:text-[#dbcdb8]/70 shrink-0 w-36">{label}</span>
    <span className="text-sm font-semibold text-[#2f1618] dark:text-[#fff3dc] text-right flex items-center gap-2">
      {value || "—"}
      {badge}
    </span>
  </div>
);

const VerifiedBadge = ({ verified }) =>
  verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified ✓
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      Pending
    </span>
  );

const StatCard = ({ label, value, sub, color = "default" }) => {
  const colors = {
    default: "text-[#2f1618] dark:text-[#fff3dc]",
    green: "text-emerald-700 dark:text-emerald-300",
    red: "text-red-700 dark:text-red-300",
    amber: "text-amber-700 dark:text-amber-300",
    primary: "text-[#8B1E3F] dark:text-[#f7b8ca]",
  };
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-[var(--admin-shadow)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#8c7461] dark:text-[#dbcdb8]/70">{label}</p>
      <p className={`mt-2 text-xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[#9a7a6a] dark:text-[#dbcdb8]/50">{sub}</p>}
    </div>
  );
};

const TABS = ["Basic Info", "KYC & Bank", "Operations", "Revenue"];

export default function VendorDetails() {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState(null);
  const [finance, setFinance] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        setLoading(true);
        const res = await adminApi.get(`/vendors/${vendorId}`);
        setVendor(res.data.data?.vendor || null);
        setFinance(res.data.data?.finance || null);
        setProducts(res.data.data?.products || []);
      } catch {
        toast.error("Failed to fetch vendor details");
      } finally {
        setLoading(false);
      }
    };
    fetchVendorDetails();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[#7b5a4b]">Loading vendor profile…</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center p-6">
        <svg viewBox="0 0 24 24" fill="none" className="h-14 w-14 text-[#d8c4a5]"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <p className="text-lg font-semibold text-[#2f1618] dark:text-white">Vendor not found</p>
        <Link to="/dashboard/vendors" className="text-sm text-[#8B1E3F] underline">Back to vendors</Link>
      </div>
    );
  }

  const initials = (vendor.businessName || vendor.name || "V").slice(0, 2).toUpperCase();
  const statusColorMap = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    inactive: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  };

  const totalOrders = vendor.metrics?.totalOrders || 0;
  const completedOrders = finance?.completedOrders || 0;
  const cancelledOrders = finance?.cancelledOrders || 0;
  const pendingOrders = Math.max(0, totalOrders - completedOrders - cancelledOrders);

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-4 shadow-[var(--admin-shadow)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B1E3F]">Vendor Profile</p>
          <h1 className="mt-1 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
            {vendor.businessName || vendor.name}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-[#8c7461] dark:text-[#dbcdb8]/70">{vendor.vendorCode || "VND-—"}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColorMap[vendor.status] || statusColorMap.inactive}`}>
              {vendor.status === "active" ? "● Active" : vendor.status === "pending" ? "◔ Pending" : "✕ Inactive"}
            </span>
          </div>
        </div>
        <Link to="/dashboard/vendors" className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
          ← Back to Vendors
        </Link>
      </div>

      {/* Profile Card + Stats */}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Avatar Card */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex flex-col items-center text-center">
          {vendor.image ? (
            <img src={vendor.image} alt={vendor.name} className="h-24 w-24 rounded-2xl object-cover border-2 border-[#d8c4a5]" />
          ) : (
            <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-3xl font-black text-[#8B1E3F] bg-[#8B1E3F]/10">
              {initials}
            </div>
          )}
          <p className="mt-3 text-lg font-bold text-[#2f1618] dark:text-[#fff3dc]">{vendor.contactPerson || vendor.name}</p>
          <p className="text-xs text-[#8c7461] dark:text-[#dbcdb8]/70">{vendor.businessName}</p>
          <p className="mt-2 text-sm font-medium text-[#6f3945] dark:text-[#f7e3c0]">{vendor.phone || "—"}</p>
          <p className="text-xs text-[#8c7461]">{vendor.email || "—"}</p>
          <p className="mt-2 text-xs text-[#9a7a6a]">Joined: {fmtDate(vendor.createdAt)}</p>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 content-start">
          <StatCard label="Total Orders" value={totalOrders} color="default" />
          <StatCard label="Completed" value={completedOrders} color="green" />
          <StatCard label="Cancelled" value={cancelledOrders} color="red" />
          <StatCard label="Pending" value={pendingOrders} color="amber" />
          <StatCard label="Today's Revenue" value={fmt(vendor.metrics?.todayRevenue)} color="primary" />
          <StatCard label="Monthly Revenue" value={fmt(vendor.metrics?.revenue)} color="default" />
          <StatCard label="Vendor Earnings" value={fmt(vendor.metrics?.vendorEarning)} color="green" />
          <StatCard label="Admin Commission" value={fmt(vendor.metrics?.superAdminEarning)} color="primary" />
          <StatCard label="Pending Payout" value={fmt(vendor.metrics?.pendingPayout)} color="amber" />
          <StatCard label="Settlements Paid" value={fmt(vendor.metrics?.totalSettlementsPaid)} color="green" />
        </div>
      </div>

      {/* Tabbed Detail Sections */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)] overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-[#e8d9c4] dark:border-white/10 px-4 pt-2">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === i
                ? "border-[#8B1E3F] text-[#8B1E3F]"
                : "border-transparent text-[#8c7461] hover:text-[#8B1E3F] dark:text-[#dbcdb8]/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Tab 0: Basic Information */}
          {activeTab === 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <SectionTitle>Basic Information</SectionTitle>
                <InfoRow label="Vendor ID" value={vendor.vendorCode || "—"} />
                <InfoRow label="Partner Name" value={vendor.contactPerson || vendor.name} />
                <InfoRow label="Business Name" value={vendor.businessName || "—"} />
                <InfoRow label="City" value={vendor.address?.city || "—"} />
                <InfoRow label="Mobile Number" value={vendor.phone || "—"} />
                <InfoRow label="Email" value={vendor.email || "—"} />
                <InfoRow label="Status" value={
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColorMap[vendor.status] || statusColorMap.inactive}`}>
                    {(vendor.status || "unknown").charAt(0).toUpperCase() + (vendor.status || "unknown").slice(1)}
                  </span>
                } />
                <InfoRow label="Joined" value={fmtDate(vendor.createdAt)} />
              </div>
              <div>
                <SectionTitle>Address</SectionTitle>
                <InfoRow label="Line 1" value={vendor.address?.line1 || "—"} />
                <InfoRow label="Line 2" value={vendor.address?.line2 || "—"} />
                <InfoRow label="City" value={vendor.address?.city || "—"} />
                <InfoRow label="State" value={vendor.address?.state || "—"} />
                <InfoRow label="Pincode" value={vendor.address?.pincode || "—"} />

                {vendor.notes && (
                  <div className="mt-4">
                    <SectionTitle>Notes</SectionTitle>
                    <p className="text-sm text-[#6f3945] dark:text-[#f7e3c0] bg-[#fdf8f2] dark:bg-white/5 rounded-xl p-3">
                      {vendor.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 1: KYC & Bank Details */}
          {activeTab === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <SectionTitle>KYC Details</SectionTitle>
                <InfoRow
                  label="PAN Number"
                  value={vendor.kyc?.pan || "Not Provided"}
                  badge={<VerifiedBadge verified={vendor.kyc?.panVerified} />}
                />
                <InfoRow
                  label="Aadhaar Number"
                  value={vendor.kyc?.aadhaar ? `${vendor.kyc.aadhaar.slice(0, 4)} XXXX XXXX` : "Not Provided"}
                  badge={<VerifiedBadge verified={vendor.kyc?.aadhaarVerified} />}
                />
                <InfoRow label="GST Number" value={vendor.kyc?.gst || "—"} />
                <InfoRow label="FSSAI Number" value={vendor.kyc?.fssai || "—"} />
                <InfoRow label="CIN Number" value={vendor.kyc?.cin || "—"} />

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "PAN Verified", ok: vendor.kyc?.panVerified },
                    { label: "Aadhaar Verified", ok: vendor.kyc?.aadhaarVerified },
                    { label: "Bank Verified", ok: vendor.bank?.bankVerified },
                  ].map(({ label, ok }) => (
                    <div key={label} className={`rounded-xl p-3 text-center text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                      {ok ? "✓" : "○"} {label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle>Bank Account Details</SectionTitle>
                <InfoRow
                  label="Account Holder"
                  value={vendor.bank?.accountHolder || "Not Provided"}
                  badge={vendor.bank?.bankVerified ? <VerifiedBadge verified={true} /> : null}
                />
                <InfoRow label="Bank Name" value={vendor.bank?.bankName || "—"} />
                <InfoRow
                  label="Account Number"
                  value={vendor.bank?.accountNumber ? `XXXX${vendor.bank.accountNumber.slice(-4)}` : "—"}
                />
                <InfoRow label="IFSC Code" value={vendor.bank?.ifsc || "—"} />
              </div>
            </div>
          )}

          {/* Tab 2: Operational Summary */}
          {activeTab === 2 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <SectionTitle>Product Summary</SectionTitle>
                <InfoRow label="Service Area" value={vendor.address?.city || "—"} />
                <InfoRow label="Products Listed" value={vendor.metrics?.products || 0} />
                <InfoRow label="Current Stock" value={`${vendor.metrics?.stock || "—"} Units`} />
                <InfoRow label="Low Stock Items" value={vendor.metrics?.lowStock || "—"} />

                <div className="mt-5">
                  <SectionTitle>Order Summary</SectionTitle>
                  <InfoRow label="Total Orders" value={totalOrders} />
                  <InfoRow label="Completed Orders" value={completedOrders} />
                  <InfoRow label="Cancelled Orders" value={cancelledOrders} />
                  <InfoRow label="Pending Orders" value={pendingOrders} />
                </div>
              </div>

              <div>
                <SectionTitle>Recent Products</SectionTitle>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {products.length === 0 && (
                    <p className="text-sm text-[#8c7461] py-4 text-center">No products listed.</p>
                  )}
                  {products.map((p) => (
                    <div key={p._id} className="flex items-center justify-between rounded-xl border border-[#f0e3d1] dark:border-white/10 px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">{p.title}</p>
                        <p className="text-xs text-[#8c7461]">{p.categoryId?.name || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#8B1E3F]">{fmt(p.pricing?.price)}</p>
                        <p className={`text-xs font-semibold capitalize ${p.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>{p.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Revenue & Earnings */}
          {activeTab === 3 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <SectionTitle>Revenue & Earnings</SectionTitle>
                <InfoRow label="Today's Revenue" value={fmt(vendor.metrics?.todayRevenue)} />
                <InfoRow label="Monthly Revenue" value={fmt(vendor.metrics?.revenue)} />
                <InfoRow label="Vendor Earnings" value={fmt(vendor.metrics?.vendorEarning)} />
                <InfoRow label="Admin Commission" value={fmt(vendor.metrics?.superAdminEarning)} />
                <InfoRow label="Pending Settlement" value={fmt(vendor.metrics?.pendingPayout)} />
                <InfoRow label="Total Settlements Paid" value={fmt(vendor.metrics?.totalSettlementsPaid)} />
                <InfoRow label="Available Balance" value={fmt(vendor.metrics?.availableBalance)} />
                <InfoRow label="Pending Earnings" value={fmt(vendor.metrics?.pendingEarning)} />
              </div>

              <div>
                <SectionTitle>Commission Records (Recent Orders)</SectionTitle>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(finance?.commissionOrders || [])
                    .filter((o) => String(o.orderStatus || "").toLowerCase() === "delivered")
                    .slice(0, 10)
                    .map((order) => (
                      <div key={String(order.orderId)} className="rounded-xl border border-[#f0e3d1] dark:border-white/10 p-3">
                        <div className="flex items-center justify-between text-sm font-semibold mb-1">
                          <span className="font-mono text-xs text-[#6f3945]">#{String(order.orderId).slice(-8).toUpperCase()}</span>
                          <span className="text-[11px] text-[#8c7461]">{fmtDate(order.createdAt)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[11px] text-[#8c7461]">
                          <span>Gross {fmt(order.itemGrossTotal)}</span>
                          <span>Vendor {fmt(order.vendorNetEarning)}</span>
                          <span>Admin {fmt(order.superAdminCommission)}</span>
                        </div>
                      </div>
                    ))}
                  {(finance?.commissionOrders || []).filter((o) => String(o.orderStatus || "").toLowerCase() === "delivered").length === 0 && (
                    <p className="text-sm text-[#8c7461] py-4 text-center">No completed orders yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Access */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
        <SectionTitle>Page Access</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {(vendor.pageAccess || []).map((page) => (
            <span key={page} className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 text-xs font-semibold capitalize text-[#8B1E3F] dark:bg-[#8B1E3F]/20 dark:text-[#f7b8ca]">
              {page.replace(/-/g, " ")}
            </span>
          ))}
          {(vendor.pageAccess || []).length === 0 && (
            <p className="text-sm text-[#8c7461]">No page access configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
