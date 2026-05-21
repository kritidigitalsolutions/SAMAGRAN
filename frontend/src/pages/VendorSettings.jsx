import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api/axios";
import { getAdminRole, setStoredAdmin } from "../utils/auth";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security & Password" },
];

const emptyProfile = {
  name: "",
  businessName: "",
  email: "",
  phone: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  },
};

export default function VendorSettings() {
  const isVendor = getAdminRole() === "vendor-admin";

  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const activeTabLabel = useMemo(
    () => TABS.find((tab) => tab.key === activeTab)?.label || "Profile",
    [activeTab],
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/vendor/profile");
      const vendor = res.data?.data?.vendor || {};
      const admin = res.data?.data?.admin || null;
      if (admin) {
        setStoredAdmin(admin);
      }
      setProfile({
        ...emptyProfile,
        ...vendor,
        address: {
          ...emptyProfile.address,
          ...(vendor.address || {}),
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load vendor profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVendor) {
      loadProfile();
    }
  }, [isVendor]);

  if (!isVendor) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    if (name.startsWith("address.")) {
      const field = name.replace("address.", "");
      setProfile((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
      return;
    }

    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        name: profile.name,
        businessName: profile.businessName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
      };
      const res = await API.patch("/admin/vendor/profile", payload);
      const updatedVendor = res.data?.data?.vendor || null;
      const updatedAdmin = res.data?.data?.admin || null;
      if (updatedAdmin) {
        setStoredAdmin(updatedAdmin);
      }
      if (updatedVendor) {
        setProfile((prev) => ({
          ...prev,
          ...updatedVendor,
          address: {
            ...prev.address,
            ...(updatedVendor.address || {}),
          },
        }));
      }
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
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
      await API.patch("/admin/vendor/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage("Password updated successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(
        err?.response?.data?.message || "Failed to update password",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--admin-primary)]">
            Settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--admin-text)]">
            Vendor account
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Manage your profile and account security.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="flex w-full flex-row gap-3 overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-3 lg:w-64 lg:flex-col">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-[var(--admin-surface)] text-[var(--admin-text)] shadow"
                    : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface)]/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </aside>

          <section className="flex-1 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">
              {activeTabLabel}
            </h2>

            {activeTab === "profile" && (
              <form className="mt-6 space-y-5" onSubmit={handleProfileSubmit}>
                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Owner Name
                    </label>
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Business Name
                    </label>
                    <input
                      name="businessName"
                      value={profile.businessName}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Phone
                    </label>
                    <input
                      name="phone"
                      value={profile.phone}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Address Line 1
                    </label>
                    <input
                      name="address.line1"
                      value={profile.address.line1}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Address Line 2
                    </label>
                    <input
                      name="address.line2"
                      value={profile.address.line2}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      City
                    </label>
                    <input
                      name="address.city"
                      value={profile.address.city}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      State
                    </label>
                    <input
                      name="address.state"
                      value={profile.address.state}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Pincode
                    </label>
                    <input
                      name="address.pincode"
                      value={profile.address.pincode}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "security" && (
              <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit}>
                <p className="text-sm text-[var(--admin-muted)]">
                  You can reset your password here. If you remember your current
                  password, enter it for extra security.
                </p>

                {passwordError && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {passwordError}
                  </div>
                )}
                {passwordMessage && (
                  <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {passwordMessage}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-[var(--admin-text)]">
                    Current Password (optional)
                  </label>
                  <input
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--admin-text)]">
                    New Password
                  </label>
                  <input
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--admin-text)]">
                    Confirm New Password
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="rounded-lg bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                  >
                    {passwordSaving ? "Updating..." : "Update password"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
