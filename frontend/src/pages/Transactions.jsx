import { useEffect, useState } from "react";
import API from "../api/axios";

const formatMoney = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const statusBadgeClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "completed" || normalized === "paid") return "bg-emerald-100 text-emerald-700";
  if (normalized === "approved") return "bg-sky-100 text-sky-700";
  if (normalized === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/admin/vendor/transactions");
        setTransactions(res.data?.data?.transactions || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return <div className="p-6">Loading transactions...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Transactions</h1>
      <p className="mt-2 text-sm text-slate-500">Order earnings, refunds, and withdrawals.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                  No transactions found.
                </td>
              </tr>
            )}
            {transactions.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-700">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{item.type}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(item.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
