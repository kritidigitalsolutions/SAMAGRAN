import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";

const formatMoney = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const statusBadgeClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "completed" || normalized === "paid") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }
  if (normalized === "approved") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200";
  }
  if (normalized === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, page, pageSize]);

  if (loading) {
    return <div className="p-6">Loading transactions...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Transactions</h1>
      <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Order earnings, refunds, and withdrawals.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
        <table className="min-w-full text-left text-sm text-[var(--admin-text)]">
          <thead className="bg-[var(--admin-surface-soft)] text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">
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
                <td colSpan="5" className="px-4 py-6 text-center text-[var(--admin-text-muted)]">
                  No transactions found.
                </td>
              </tr>
            )}
            {pagedTransactions.map((item) => (
              <tr key={item._id || item.id} className="border-t border-[var(--admin-border)]">
                <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 capitalize">{item.type}</td>
                <td className="px-4 py-3 font-semibold text-[var(--admin-text-strong)]">
                  {formatMoney(item.amount)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--admin-text-muted)]">{item.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        total={transactions.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
