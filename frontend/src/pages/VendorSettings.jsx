import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api/axios";
import { getAdminRole, setStoredAdmin } from "../utils/auth";
import { FiEye, FiEyeOff } from "react-icons/fi";

const TABS = [
  { key: "profile", label: "Profile Info" },
  { key: "address", label: "Address Details" },
  { key: "kyc", label: "KYC Details" },
  { key: "bank", label: "Bank & UPI Details" },
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
  kyc: {
    pan: "",
    panVerified: false,
    aadhaar: "",
    aadhaarVerified: false,
    gst: "",
    fssai: "",
    cin: "",
  },
  bank: {
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    bankVerified: false,
  },
};

const CheckBadge = ({ verified }) =>
  verified ? (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
      Verified
    </span>
  ) : (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      Unverified
    </span>
  );

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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        kyc: {
          ...emptyProfile.kyc,
          ...(vendor.kyc || {}),
        },
        bank: {
          ...emptyProfile.bank,
          ...(vendor.bank || {}),
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
    if (name.startsWith("kyc.")) {
      const field = name.replace("kyc.", "");
      setProfile((prev) => ({
        ...prev,
        kyc: {
          ...prev.kyc,
          [field]: value,
        },
      }));
      return;
    }
    if (name.startsWith("bank.")) {
      const field = name.replace("bank.", "");
      setProfile((prev) => ({
        ...prev,
        bank: {
          ...prev.bank,
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
        kyc: profile.kyc,
        bank: profile.bank,
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
          kyc: {
            ...prev.kyc,
            ...(updatedVendor.kyc || {}),
          },
          bank: {
            ...prev.bank,
            ...(updatedVendor.bank || {}),
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "address" && (
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
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Address Line 1
                    </label>
                    <input
                      name="address.line1"
                      value={profile.address.line1}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Address Line 2
                    </label>
                    <input
                      name="address.line2"
                      value={profile.address.line2}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
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
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save address"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "kyc" && (
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
                    <label className="flex items-center text-sm font-medium text-[var(--admin-text)]">
                      PAN Number
                      <CheckBadge verified={profile.kyc.panVerified} />
                    </label>
                    <input
                      name="kyc.pan"
                      value={profile.kyc.pan}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="ABCDE1234F"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-[var(--admin-text)]">
                      Aadhaar Number
                      <CheckBadge verified={profile.kyc.aadhaarVerified} />
                    </label>
                    <input
                      name="kyc.aadhaar"
                      value={profile.kyc.aadhaar}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="XXXX XXXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      GST Number (Optional)
                    </label>
                    <input
                      name="kyc.gst"
                      value={profile.kyc.gst}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="27AACFY8913A1Z8"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      FSSAI Number (If Applicable)
                    </label>
                    <input
                      name="kyc.fssai"
                      value={profile.kyc.fssai}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="13323999000008"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      CIN Number (If Applicable)
                    </label>
                    <input
                      name="kyc.cin"
                      value={profile.kyc.cin}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="U74140MH2025PTC055568"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save KYC details"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "bank" && (
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
                    <label className="flex items-center text-sm font-medium text-[var(--admin-text)]">
                      Account Holder Name
                      <CheckBadge verified={profile.bank.bankVerified} />
                    </label>
                    <input
                      name="bank.accountHolder"
                      value={profile.bank.accountHolder}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="Amit Kumar"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Bank Name
                    </label>
                    <input
                      name="bank.bankName"
                      value={profile.bank.bankName}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="HDFC Bank"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      Account Number
                    </label>
                    <input
                      name="bank.accountNumber"
                      value={profile.bank.accountNumber}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="50100xxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      IFSC Code
                    </label>
                    <input
                      name="bank.ifsc"
                      value={profile.bank.ifsc}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="HDFC0001234"
                    />
                  </div>
                  <div className="md:col-span-2 border-t border-[var(--admin-border)] pt-4 mt-2">
                    <label className="text-sm font-medium text-[var(--admin-text)]">
                      UPI ID
                    </label>
                    <input
                      name="bank.upiId"
                      value={profile.bank.upiId}
                      onChange={handleProfileChange}
                      className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)]"
                      placeholder="name@okaxis"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save bank details"}
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
                  <div className="relative mt-2">
                    <input
                      name="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-lg border border-[var(--admin-border)] bg-transparent pl-3 pr-10 py-2 text-sm text-[var(--admin-text)] outline-none"
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
                  <label className="text-sm font-medium text-[var(--admin-text)]">
                    New Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      name="newPassword"
                      type={showNew ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-lg border border-[var(--admin-border)] bg-transparent pl-3 pr-10 py-2 text-sm text-[var(--admin-text)] outline-none"
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
                  <label className="text-sm font-medium text-[var(--admin-text)]">
                    Confirm New Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-lg border border-[var(--admin-border)] bg-transparent pl-3 pr-10 py-2 text-sm text-[var(--admin-text)] outline-none"
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
