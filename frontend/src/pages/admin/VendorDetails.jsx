import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../api/admin/api";
import { toast } from "react-toastify";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN");
};

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-[var(--admin-text)]">{value}</p>
  </div>
);

export default function VendorDetails() {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState(null);
  const [finance, setFinance] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        setLoading(true);
        const response = await adminApi.get(`/vendors/${vendorId}`);
        setVendor(response.data.data?.vendor || null);
        setFinance(response.data.data?.finance || null);
        setProducts(response.data.data?.products || []);
      } catch (error) {
        console.error("Failed to fetch vendor details:", error);
        toast.error("Failed to fetch vendor details");
      } finally {
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [vendorId]);

  if (loading) return <div className="p-6">Loading vendor details...</div>;
  if (!vendor) return <div className="p-6">Vendor not found.</div>;

  const initials = (vendor.businessName || vendor.name || "V").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Vendor Profile</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">{vendor.businessName || vendor.name}</h1>
        </div>
        <Link to="/dashboard/vendors" className="rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text)]">
          Back
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_2.1fr]">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          {vendor.image ? (
            <img src={vendor.image} alt={vendor.businessName || vendor.name} className="h-40 w-full rounded-xl object-cover" />
          ) : (
            <div className="grid h-40 w-full place-items-center rounded-xl bg-[var(--admin-surface-soft)] text-3xl font-bold text-[var(--admin-primary)]">
              {initials}
            </div>
          )}
          <div className="mt-4 space-y-2 text-sm text-[var(--admin-text)]">
            <p><strong>Name:</strong> {vendor.name}</p>
            <p><strong>Contact:</strong> {vendor.contactPerson || vendor.name}</p>
            <p><strong>Phone:</strong> {vendor.phone || "-"}</p>
            <p><strong>Email:</strong> {vendor.email || "-"}</p>
            <p><strong>City:</strong> {vendor.address?.city || "-"}, {vendor.address?.state || ""}</p>
            <p><strong>Address:</strong> {[vendor.address?.line1, vendor.address?.line2, vendor.address?.pincode].filter(Boolean).join(", ") || "-"}</p>
            <p><strong>Joined:</strong> {formatDate(vendor.createdAt)}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${vendor.status === "active" ? "bg-emerald-100 text-emerald-700" : vendor.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                {vendor.status || "unknown"}
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Products" value={vendor.metrics?.products || 0} />
          <StatCard label="Total Orders" value={vendor.metrics?.totalOrders || 0} />
          <StatCard label="Revenue" value={formatMoney(vendor.metrics?.revenue)} />
          <StatCard label="Vendor Net Profit" value={formatMoney(vendor.metrics?.vendorEarning)} />
          <StatCard label="Super Admin Commission" value={formatMoney(vendor.metrics?.superAdminEarning)} />
          <StatCard label="Pending Payout" value={formatMoney(vendor.metrics?.pendingPayout)} />
          <StatCard label="Pending Net Profit" value={formatMoney(vendor.metrics?.pendingEarning)} />
          <StatCard label="Available Balance" value={formatMoney(vendor.metrics?.availableBalance)} />
          <StatCard label="Completed Orders" value={finance?.completedOrders || 0} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">Recent Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[var(--admin-text)]">
            <thead className="bg-[var(--admin-surface-soft)] text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-[var(--admin-text-muted)]">No products found.</td></tr>
              )}
              {products.map((product) => (
                <tr key={product._id} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3 font-semibold">{product.title}</td>
                  <td className="px-4 py-3">{product.categoryId?.name || product.category?.name || "-"}</td>
                  <td className="px-4 py-3">{formatMoney(product.pricing?.price)}</td>
                  <td className="px-4 py-3">{product.compliance?.city || "-"}</td>
                  <td className="px-4 py-3 capitalize">{product.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">Commission Records</h2>
          <div className="space-y-3">
            {(finance?.commissionOrders || []).filter((order) => String(order.orderStatus).toLowerCase() === "delivered").slice(0, 8).map((order) => (
              <div key={String(order.orderId)} className="rounded-xl border border-[var(--admin-border)] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Order {String(order.orderId).slice(-8)}</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[var(--admin-text-muted)]">
                  <span>Gross {formatMoney(order.itemGrossTotal)}</span>
                  <span>Net {formatMoney(order.vendorNetEarning)}</span>
                  <span>Commission {formatMoney(order.superAdminCommission)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">Page Access</h2>
          <div className="flex flex-wrap gap-2">
            {(vendor.pageAccess || []).map((page) => (
              <span key={page} className="rounded-full bg-[var(--admin-surface-soft)] px-3 py-1 text-xs font-semibold capitalize text-[var(--admin-text)]">
                {page.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
