import { useEffect, useState } from "react";
import API from "../api/axios";

const formatMoney = (value) => `INR ${Number(value || 0).toFixed(2)}`;

export default function Refunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRefunds = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/admin/vendor/refunds");
        setRefunds(res.data?.data?.refunds || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load refunds");
      } finally {
        setLoading(false);
      }
    };

    fetchRefunds();
  }, []);

  if (loading) {
    return <div className="p-6">Loading refunds...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Refunds & Returns</h1>
      <p className="mt-2 text-sm text-slate-500">Cancelled orders and refund requests.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Requested</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 && (
              <tr>
                <td colSpan="4" className="px-4 py-6 text-center text-slate-500">
                  No refunds found.
                </td>
              </tr>
            )}
            {refunds.map((refund) => (
              <tr key={refund.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-700">{refund.orderId}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(refund.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{refund.reason || "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {refund.requestedAt ? new Date(refund.requestedAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
