import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api/axios";
import { getAdminRole, setStoredAdmin } from "../utils/auth";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff, FiUpload, FiImage } from "react-icons/fi";

const defaultCorporateDetails = {
  companyName: "",
  logoUrl: "",
  address: "",
  cin: "",
  pan: "",
  fssai: "",
  email: "",
  phone: "",
  authorizedSignatory: "",
};

const TABS = [
  { key: "company", label: "Company Settings" },
  { key: "profile", label: "Profile Info" },
  { key: "security", label: "Security & Password" },
];

export default function SuperAdminSettings() {
  const isSuperAdmin = getAdminRole() === "super-admin";

  const [activeTab, setActiveTab] = useState("company");
  const [form, setForm] = useState(defaultCorporateDetails);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 🎁 Welcome Coupon state
  const [welcomeCoupon, setWelcomeCoupon] = useState(null);
  const [wcLoading, setWcLoading] = useState(true);
  const [wcToggling, setWcToggling] = useState(false);

  // Profile Info state
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  // Security state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  // Show/Hide password toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/corporate-details");
      const data = res.data?.data || defaultCorporateDetails;
      setForm(data);
      if (data.logoUrl) {
        setLogoPreview(data.logoUrl);
      }
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

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError("");
      const res = await API.get("/admin/profile");
      setProfile({
        name: res.data?.data?.admin?.name || "",
        email: res.data?.data?.admin?.email || "",
      });
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Failed to load admin profile");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
      loadWelcomeCoupon();
      loadProfile();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        Object.keys(form).forEach((key) => {
          formData.append(key, form[key] || "");
        });
        const res = await API.patch("/admin/corporate-details", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.data?.logoUrl) {
          setLogoPreview(res.data.data.logoUrl);
          setForm((prev) => ({ ...prev, logoUrl: res.data.data.logoUrl }));
        }
      } else {
        await API.patch("/admin/corporate-details", form);
      }
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

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const res = await API.patch("/admin/profile", profile);
      const updatedAdmin = res.data?.data?.admin;
      if (updatedAdmin) {
        setStoredAdmin(updatedAdmin);
        setProfile({
          name: updatedAdmin.name || "",
          email: updatedAdmin.email || "",
        });
      }
      setProfileMessage("Profile info updated successfully.");
      toast.success("Profile updated successfully!");
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Failed to update profile info");
      toast.error(err?.response?.data?.message || "Failed to update profile info");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage("");
    setPasswordError("");

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      setPasswordSaving(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      setPasswordSaving(false);
      return;
    }

    try {
      await API.patch("/admin/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage("Password updated successfully.");
      toast.success("Password updated successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(err?.response?.data?.message || "Failed to update password");
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
        <p className="text-sm text-[var(--admin-muted)]">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title block */}
      <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--admin-primary)]">
          Admin Portal
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">
          Portal Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Manage system configurations, coupons, profile information, and account security.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="flex w-full flex-row gap-3 overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-3 lg:w-64 lg:flex-col">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-[var(--admin-surface)] text-[var(--admin-text)] shadow"
                  : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface)]/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Dynamic Section Area */}
        <section className="flex-1 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          {activeTab === "company" && (
            <div className="space-y-6">
              {/* Welcome Coupon Settings */}
              <div>
                <h2 className="text-lg font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-3 mb-4 flex items-center gap-2">
                  🎁 Welcome Coupon Settings
                </h2>
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
                            {welcomeCoupon.isActive ? "Active — Naye users ko milega" : "Disabled"}
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
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleWelcomeCoupon}
                        disabled={wcToggling}
                        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                          welcomeCoupon.isActive
                            ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-300"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-300"
                        }`}
                      >
                        {wcToggling ? (
                          <div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                        ) : (
                          <span>{welcomeCoupon.isActive ? "⛔" : "✅"}</span>
                        )}
                        {wcToggling ? "Updating..." : welcomeCoupon.isActive ? "Disable Coupon" : "Enable Coupon"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-500/30 dark:bg-amber-500/5">
                    <p className="text-3xl mb-2">🎁</p>
                    <p className="font-semibold text-[var(--admin-text)]">No Welcome Coupon Found</p>
                    <p className="mt-1 text-sm text-[var(--admin-muted)]">
                      Go to the coupons page and mark one as a welcome coupon.
                    </p>
                  </div>
                )}
              </div>

              {/* Company Corporate Details */}
              <div className="mt-8 border-t border-[var(--admin-border)] pt-6">
                <h2 className="text-lg font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-3 mb-6">
                  🏢 Corporate Office Details
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] block mb-2">
                        Company Logo (Invoices Header Logo)
                      </label>
                      <div className="flex items-center gap-4 p-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)]">
                        <div className="h-14 w-14 rounded-xl border border-[var(--admin-border)] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1" />
                          ) : (
                            <FiImage className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            id="logoUpload"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="logoUpload"
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] px-4 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer shadow-sm"
                          >
                            <FiUpload className="h-4 w-4" />
                            {logoPreview ? "Change Invoice Logo" : "Upload Invoice Logo"}
                          </label>
                          <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                            PNG or JPG image. Visible across all generated invoices.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                        Company Name
                      </label>
                      <input
                        name="companyName"
                        value={form.companyName}
                        onChange={handleChange}
                        className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
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
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <form className="space-y-5" onSubmit={handleProfileSubmit}>
              <h2 className="text-lg font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-3 mb-6">
                👤 Profile Information
              </h2>
              {profileError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {profileError}
                </div>
              )}
              {profileMessage && (
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {profileMessage}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    Admin Name
                  </label>
                  <input
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    className="mt-2 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-[var(--admin-border)] pt-4">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-xl bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60 transition"
                >
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <form className="space-y-5" onSubmit={handlePasswordSubmit}>
              <h2 className="text-lg font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-3 mb-4">
                🔒 Security & Password
              </h2>
              <p className="text-sm text-[var(--admin-muted)] mb-6">
                Change your Super Admin portal password. Enter your current password for security verification.
              </p>

              {passwordError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {passwordError}
                </div>
              )}
              {passwordMessage && (
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {passwordMessage}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    Current Password (Verification)
                  </label>
                  <div className="relative mt-2">
                    <input
                      name="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-transparent pl-3 pr-10 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-[var(--admin-primary)]"
                    >
                      {showCurrent ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    New Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      name="newPassword"
                      type={showNew ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-transparent pl-3 pr-10 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-[var(--admin-primary)]"
                    >
                      {showNew ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                    Confirm New Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-transparent pl-3 pr-10 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-[var(--admin-primary)]"
                    >
                      {showConfirm ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-[var(--admin-border)] pt-4 mt-6">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-xl bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60 transition"
                >
                  {passwordSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
