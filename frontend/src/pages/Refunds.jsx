import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";

const formatMoney = (value) => `INR ${Number(value || 0).toFixed(2)}`;

export default function Refunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const pagedRefunds = useMemo(() => {
    const start = (page - 1) * pageSize;
    return refunds.slice(start, start + pageSize);
  }, [refunds, page, pageSize]);

  if (loading) {
    return <div className="p-6">Loading refunds...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Refunds & Returns</h1>
      <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Cancelled orders and refund requests.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
        <table className="min-w-full text-left text-sm text-[var(--admin-text)]">
          <thead className="bg-[var(--admin-surface-soft)] text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">
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
                <td colSpan="4" className="px-4 py-6 text-center text-[var(--admin-text-muted)]">
                  No refunds found.
                </td>
              </tr>
            )}
            {pagedRefunds.map((refund) => (
              <tr key={refund._id || refund.id} className="border-t border-[var(--admin-border)]">
                <td className="px-4 py-3">{refund.orderId}</td>
                <td className="px-4 py-3 font-semibold text-[var(--admin-text-strong)]">
                  {formatMoney(refund.amount)}
                </td>
                <td className="px-4 py-3 text-[var(--admin-text-muted)]">{refund.reason || "-"}</td>
                <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                  {refund.requestedAt ? new Date(refund.requestedAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={refunds.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
