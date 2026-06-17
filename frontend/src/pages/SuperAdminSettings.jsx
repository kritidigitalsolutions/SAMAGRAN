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

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
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
