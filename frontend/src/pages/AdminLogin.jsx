import { useState } from "react";
import API from "../api/axios";
import { Navigate, useNavigate } from "react-router-dom";
import { isAdminTokenValid, setAdminSession } from "../utils/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setError(
      err.response?.data?.message || "Login failed"
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#D4AF37]/20 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-[#8B1E3F]/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-[#dcc7ab]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.92),rgba(245,235,217,0.88))] p-8 shadow-[0_28px_80px_rgba(59,13,20,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <h2 className="text-center text-3xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          Admin Login
        </h2>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Admin Email"
            value={form.email}
            onChange={handleChange}
            className="h-12 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="h-12 w-full rounded-xl border border-[#d8c4a5] bg-white/80 px-4 text-[#2f1618] outline-none ring-[#D4AF37] placeholder:text-[#8c7461] focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
            required
          />

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[linear-gradient(135deg,#8B1E3F,#D4AF37)] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="text-right text-sm text-[#7a5e4d] dark:text-[#dbcdb8]/70">
            <span>Forgot Password?</span>
          </div>
        </form>
      </div>
    </div>
  );
}
