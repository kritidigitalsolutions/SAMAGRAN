import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api/axios";
import { getAdminRole } from "../utils/auth";
import { toast } from "react-toastify";

const defaultCorporateDetails = {
  companyName: "",
  address: "",
  cin: "",
  pan: "",
  fssai: "",
  email: "",
  phone: "",
  authorizedSignatory: "",
};

export default function SuperAdminSettings() {
  const isSuperAdmin = getAdminRole() === "super-admin";

  const [form, setForm] = useState(defaultCorporateDetails);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 🎁 Welcome Coupon state
  const [welcomeCoupon, setWelcomeCoupon] = useState(null);
  const [wcLoading, setWcLoading] = useState(true);
  const [wcToggling, setWcToggling] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/corporate-details");
      setForm(res.data?.data || defaultCorporateDetails);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load corporate details");
    } finally {
      setLoading(false);
    }
  };

  const loadWelcomeCoupon = async () => {
    try {
      setWcLoading(true);
      const res = await API.get("/admin/coupons/welcome-coupon");
      setWelcomeCoupon(res.data?.data || null);
    } catch (err) {
      console.error("Welcome coupon load error:", err?.response?.data?.message);
    } finally {
      setWcLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
      loadWelcomeCoupon();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await API.patch("/admin/corporate-details", form);
      setMessage("Corporate settings updated successfully.");
      toast.success("Corporate settings updated successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update corporate settings");
      toast.error(err?.response?.data?.message || "Failed to update corporate settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWelcomeCoupon = async () => {
    if (!welcomeCoupon) return;
    const nextActive = !welcomeCoupon.isActive;
    try {
      setWcToggling(true);
      const res = await API.patch("/admin/coupons/welcome-coupon/toggle", { isActive: nextActive });
      setWelcomeCoupon(res.data?.data);
      toast.success(`Welcome coupon ${nextActive ? "enabled" : "disabled"} successfully!`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to toggle welcome coupon");
    } finally {
      setWcToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* 🎁 Welcome Coupon Settings */}
      <div className="flex flex-col gap-4 rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--admin-primary)]">
            Welcome Coupon
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--admin-text)]">
            🎁 Welcome Coupon Settings
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Jab bhi koi naya user signup kare, yeh coupon automatically unhe milega.
          </p>
        </div>

        {wcLoading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="h-6 w-6 rounded-full border-2 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
            <span className="text-sm text-[var(--admin-muted)]">Loading…</span>
          </div>
        ) : welcomeCoupon ? (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-[#D4AF37]">{welcomeCoupon.code}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                    welcomeCoupon.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${welcomeCoupon.isActive ? "bg-green-500" : "bg-red-500"}`} />
                    {welcomeCoupon.isActive ? "Active — Naye users ko milega" : "Disabled — Kisi ko nahi milega"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-[var(--admin-muted)]">Discount:</span>{" "}
                    <span className="font-semibold">
                      {welcomeCoupon.discountType === "percent"
                        ? `${welcomeCoupon.discountValue}%`
                        : `₹${welcomeCoupon.discountValue}`}
                      {welcomeCoupon.maxDiscount > 0 && ` (max ₹${welcomeCoupon.maxDiscount})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--admin-muted)]">Min Order:</span>{" "}
                    <span className="font-semibold">₹{welcomeCoupon.minOrderAmount || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--admin-muted)]">Validity:</span>{" "}
                    <input
                      type="number"
                      min="0"
                      value={welcomeCoupon.welcomeValidDays || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value || 0);
                        setWelcomeCoupon(prev => ({ ...prev, welcomeValidDays: val }));
                      }}
                      className="h-8 w-20 rounded-lg border border-[var(--admin-border)] bg-transparent px-2 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] dark:border-white/20"
                    />
                    <span className="text-xs text-[var(--admin-muted)]">Days</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setWcToggling(true);
                          await API.put(`/admin/coupons/${welcomeCoupon._id}`, { welcomeValidDays: welcomeCoupon.welcomeValidDays });
                          toast.success("Welcome coupon validity updated successfully!");
                        } catch (err) {
                          toast.error(err?.response?.data?.message || "Failed to update validity");
                        } finally {
                          setWcToggling(false);
                        }
                      }}
                      disabled={wcToggling}
                      className="rounded-lg bg-[var(--admin-primary)] px-2.5 py-1 text-[10px] font-bold text-white transition-all hover:bg-[var(--admin-primary-strong)] disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <div>
                    <span className="text-[var(--admin-muted)]">Expires:</span>{" "}
                    <span className="font-semibold">
                      {welcomeCoupon.expiresAt
                        ? new Date(welcomeCoupon.expiresAt).toLocaleDateString()
                        : "No expiry"}
                    </span>
                  </div>
                </div>

                {welcomeCoupon.title && (
                  <p className="text-sm text-[var(--admin-muted)]">{welcomeCoupon.title}</p>
                )}
              </div>

              {/* Toggle Button */}
              <button
                type="button"
                onClick={handleToggleWelcomeCoupon}
                disabled={wcToggling}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                  welcomeCoupon.isActive
                    ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                    : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
                }`}
              >
                {wcToggling ? (
                  <div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                ) : (
                  <span>{welcomeCoupon.isActive ? "⛔" : "✅"}</span>
                )}
                {wcToggling
                  ? "Updating..."
                  : welcomeCoupon.isActive
                  ? "Disable Welcome Coupon"
                  : "Enable Welcome Coupon"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-500/30 dark:bg-amber-500/5">
            <p className="text-3xl mb-2">🎁</p>
            <p className="font-semibold text-[var(--admin-text)]">Koi Welcome Coupon Nahi Hai</p>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Coupons page par jaao aur ek coupon banao. Create karte waqt{" "}
              <strong>"Mark as Welcome Coupon"</strong> checkbox check karo.
            </p>
            <a
              href="/coupons"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--admin-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] transition"
            >
              + Create Welcome Coupon
            </a>
          </div>
        )}
      </div>

      {/* Company Settings */}
      <div className="flex flex-col gap-4 rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--admin-primary)]">
            Admin Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--admin-text)]">
            Company settings
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Manage company corporate office information printed on tax invoices.
          </p>
        </div>

        <section className="mt-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-3 mb-6">
            Corporate Office Details
          </h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Company Name
                </label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Registered Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  CIN Number
                </label>
                <input
                  name="cin"
                  value={form.cin}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  PAN Number
                </label>
                <input
                  name="pan"
                  value={form.pan}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  FSSAI Number
                </label>
                <input
                  name="fssai"
                  value={form.fssai}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Authorized Signatory Name
                </label>
                <input
                  name="authorizedSignatory"
                  value={form.authorizedSignatory}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Support Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                  Support Phone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--admin-border)] pt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60 transition"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
