import { useState } from "react";
import API from "../api/axios";
import { Navigate, useNavigate } from "react-router-dom";
import { isAdminTokenValid, setAdminSession } from "../utils/auth";
import { BsArrowBarRight } from "react-icons/bs";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [changeAdmin, setChangeAdmin] = useState("Admin Login");

  const handleOnChange = () => {
    if (changeAdmin === "Admin Login") {
      setChangeAdmin("Vendor Login");
    } else {
      setChangeAdmin("Admin Login");
    }
  };

  const [forgotForm, setForgotForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
  });
  const [forgotStatus, setForgotStatus] = useState({ type: "", message: "" });

  if (isAdminTokenValid()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/admin/auth/login", form);

      setAdminSession(res.data.token, res.data.admin);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotChange = (e) => {
    setForgotForm({
      ...forgotForm,
      [e.target.name]: e.target.value,
    });
  };

  const requestOtp = async () => {
    try {
      setForgotStatus({ type: "", message: "" });
      await API.post("/admin/auth/forgot-password", {
        email: forgotForm.email,
      });
      setOtpStep(true);
      setForgotStatus({ type: "success", message: "OTP sent to your email" });
    } catch (err) {
      setForgotStatus({
        type: "error",
        message: err.response?.data?.message || "Unable to send OTP",
      });
    }
  };

  const resetPassword = async () => {
    try {
      setForgotStatus({ type: "", message: "" });
      await API.post("/admin/auth/reset-password", {
        email: forgotForm.email,
        otp: forgotForm.otp,
        newPassword: forgotForm.newPassword,
      });
      setForgotStatus({
        type: "success",
        message: "Password reset successful",
      });
      setShowForgot(false);
      setOtpStep(false);
      setForgotForm({ email: "", otp: "", newPassword: "" });
    } catch (err) {
      setForgotStatus({
        type: "error",
        message: err.response?.data?.message || "Unable to reset password",
      });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#D4AF37]/20 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-[#8B1E3F]/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl flex flex-col items-center border border-[#dcc7ab]/60 bg-[var(--admin-surface)] p-8 shadow-[0_28px_80px_rgba(59,13,20,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[var(--admin-surface)]">
        {/* <div
          className="flex  items-end justify-end text-[#ca1755] hover:cursor-pointer font-bold w-full"
          onClick={handleOnChange}
        >
          <span>SWITCH</span>
          <BsArrowBarRight className="text-[25px]  " />
        </div> */}
        <div
          className="group flex items-center justify-end gap-2  text-[#ca1755] font-bold w-full cursor-pointer"
          onClick={handleOnChange}
        >
          <div className="group relative flex items-center justify-end w-[120px] cursor-pointer">
            <div className="relative flex items-center overflow-hidden w-[90px] h-[30px]">
              <span
                className="
        absolute
        right-6
        whitespace-nowrap
        translate-x-full
        opacity-0
        transition-all
        duration-500
        ease-in-out
        group-hover:translate-x-0
        group-hover:opacity-100
      "
              >
                SWITCH
              </span>

              <BsArrowBarRight
                className="
        absolute
        right-0
        text-[25px]
        bg-white
        z-10
      "
              />
            </div>
          </div>
        </div>
        <img src="../panel-logo.jpeg" alt="" className="h-36" />
        <h2 className="text-center text-3xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          {changeAdmin}
        </h2>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Admin Email"
            value={form.email}
            onChange={handleChange}
            autoComplete="username"
            className="h-12 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
            required
          />

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl admin-btn-primary font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="text-right text-sm">
            <button
              type="button"
              onClick={() => setShowForgot((prev) => !prev)}
              className="text-[#7a5e4d] underline-offset-2 hover:underline dark:text-[#dbcdb8]/70"
            >
              Forgot Password?
            </button>
          </div>
        </form>

        {showForgot && (
          <div className="mt-6 rounded-2xl border border-[#dcc7ab]/60 bg-white/80 p-4 text-sm text-[#2f1618] dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]">
            <h3 className="text-base font-semibold">Reset Password</h3>
            <p className="mt-1 text-xs text-[#7a5e4d] dark:text-[#dbcdb8]/70">
              Enter your admin/vendor email to receive an OTP.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={forgotForm.email}
                onChange={handleForgotChange}
                className="h-11 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
              />

              {otpStep && (
                <>
                  <input
                    type="text"
                    name="otp"
                    placeholder="OTP"
                    value={forgotForm.otp}
                    onChange={handleForgotChange}
                    className="h-11 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
                  />
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="New Password"
                    value={forgotForm.newPassword}
                    onChange={handleForgotChange}
                    className="h-11 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
                  />
                </>
              )}

              {forgotStatus.message && (
                <p
                  className={`text-xs font-semibold ${
                    forgotStatus.type === "success"
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {forgotStatus.message}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!otpStep ? (
                  <button
                    type="button"
                    onClick={requestOtp}
                    className="rounded-xl border border-transparent bg-[#8B1E3F] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Send OTP
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetPassword}
                    className="rounded-xl border border-transparent bg-[#8B1E3F] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Reset Password
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setOtpStep(false);
                    setForgotForm({ email: "", otp: "", newPassword: "" });
                    setForgotStatus({ type: "", message: "" });
                  }}
                  className="rounded-xl border border-[#d8c4a5] px-4 py-2 text-xs font-semibold text-[#7a5e4d] dark:border-white/10 dark:text-[#dbcdb8]/70"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
