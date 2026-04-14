import { useState } from "react";
import API from "../api/axios";
import "./AdminLogin.css";
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
    <div className="admin-login-container">
      <div className="login-card">
        <h2>Admin Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            placeholder="Admin Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="forgot">
            <span>Forgot Password?</span>
          </div>
        </form>
      </div>
    </div>
  );
}
