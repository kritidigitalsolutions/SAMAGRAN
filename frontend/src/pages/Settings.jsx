
import { useMemo, useState } from "react";
import API from "../api/axios";
import { getStoredAdmin } from "../utils/auth";

export default function Settings() {
  const admin = useMemo(() => getStoredAdmin(), []);
  const [form, setForm] = useState({ email: admin?.email || "", otp: "", newPassword: "" });
  const [otpStep, setOtpStep] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const sendOtp = async () => {
    try {
      setStatus({ type: "", message: "" });
      await API.post("/admin/auth/forgot-password", { email: form.email });
      setOtpStep(true);
      setStatus({ type: "success", message: "OTP sent to your email" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Unable to send OTP",
      });
    }
  };

  const resetPassword = async () => {
    try {
      setStatus({ type: "", message: "" });
      await API.post("/admin/auth/reset-password", {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      setStatus({ type: "success", message: "Password reset successful" });
      setOtpStep(false);
      setForm((current) => ({ ...current, otp: "", newPassword: "" }));
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Unable to reset password",
      });
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
          Settings
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          Super Admin Profile
        </h2>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
          Manage your account details and reset your password.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <h3 className="text-lg font-semibold text-[var(--admin-text)]">Profile</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">Name</p>
              <p className="mt-1 font-semibold text-[var(--admin-text)]">{admin?.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">Email</p>
              <p className="mt-1 font-semibold text-[var(--admin-text)]">{admin?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">Role</p>
              <p className="mt-1 font-semibold text-[var(--admin-text)]">{admin?.role || "super"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <h3 className="text-lg font-semibold text-[var(--admin-text)]">Reset Password</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Get OTP on your email and set a new password.
          </p>

          <div className="mt-4 space-y-3">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="h-11 w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 text-sm text-[var(--admin-text)]"
            />

            {otpStep && (
              <>
                <input
                  type="text"
                  name="otp"
                  value={form.otp}
                  onChange={handleChange}
                  placeholder="OTP"
                  className="h-11 w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 text-sm text-[var(--admin-text)]"
                />
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="New Password"
                  className="h-11 w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 text-sm text-[var(--admin-text)]"
                />
              </>
            )}

            {status.message && (
              <p
                className={`text-xs font-semibold ${
                  status.type === "success" ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {status.message}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {!otpStep ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="admin-btn-primary rounded-2xl px-4 py-2 text-xs font-semibold"
                >
                  Send OTP
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetPassword}
                  className="admin-btn-primary rounded-2xl px-4 py-2 text-xs font-semibold"
                >
                  Reset Password
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setForm((current) => ({ ...current, otp: "", newPassword: "" }));
                  setStatus({ type: "", message: "" });
                }}
                className="rounded-2xl border border-[var(--admin-border)] px-4 py-2 text-xs font-semibold text-[var(--admin-text-muted)]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

