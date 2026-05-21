import { useEffect, useState } from "react";
import API from "../api/axios";

const formatMoney = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const defaultForm = {
  amount: "",
  method: "bank",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  upiId: "",
  notes: "",
};

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [withdrawalRes, summaryRes] = await Promise.all([
        API.get("/admin/vendor/withdrawals"),
        API.get("/admin/vendor/earnings/summary"),
      ]);

      setWithdrawals(withdrawalRes.data?.data?.withdrawals || []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        amount: Number(form.amount),
        method: form.method,
        bankDetails: {
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          ifsc: form.ifsc,
        },
        upiId: form.upiId,
        notes: form.notes,
      };

      await API.post("/admin/vendor/withdrawals", payload);
      setMessage("Withdrawal request submitted.");
      setForm(defaultForm);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading withdrawals...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Withdrawals</h1>
      <p className="mt-2 text-sm text-slate-500">Request payouts from your available balance.</p>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Available Balance</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatMoney(summary?.availableBalance || 0)}
          </p>
          <p className="mt-2 text-sm text-slate-500">Pending: {formatMoney(summary?.pendingBalance || 0)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Request Withdrawal</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input
                name="amount"
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Method</label>
              <select
                name="method"
                value={form.method}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {form.method === "bank" ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Account Name</label>
                  <input
                    name="accountName"
                    value={form.accountName}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Account Number</label>
                  <input
                    name="accountNumber"
                    value={form.accountNumber}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">IFSC</label>
                  <input
                    name="ifsc"
                    value={form.ifsc}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-sm font-medium text-slate-700">UPI ID</label>
                <input
                  name="upiId"
                  value={form.upiId}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Withdrawal"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                  No withdrawals yet.
                </td>
              </tr>
            )}
            {withdrawals.map((item) => (
              <tr key={item._id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-700">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(item.amount)}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{item.method}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{item.status}</td>
                <td className="px-4 py-3 text-slate-600">{item.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
