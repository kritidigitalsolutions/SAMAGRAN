import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
// import Pagination from "../components/common/Pagination";
import TablePagination from "../components/TablePagination";
import { toast } from "react-toastify";
import { getStoredAdmin } from "../utils/auth";

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
  const isSuperAdmin = useMemo(() => getStoredAdmin()?.role === "super", []);
  const [transactions, setTransactions] = useState([]);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  // const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState([]);

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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, page, pageSize]);

  // const totalPages = useMemo(() => {
  //   return Math.max(Math.ceil(transactions.length / pageSize), 1);
  // }, [transactions.length, pageSize]);

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(pagedTransactions.map((item) => item.id || item._id));
      return;
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected transactions?`))
      return;
    try {
      setLoading(true);
      setError("");
      await Promise.all(
        selectedIds.map((id) => API.delete(`/admin/vendor/transactions/${id}`)),
      );
      setSelectedIds([]);
      toast.success("Selected transactions deleted successfully.");
      await fetchTransactions();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to delete selected transactions",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && transactions.length === 0) {
    return <div className="p-6">Loading transactions...</div>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
          Finance
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          Transactions
        </h2>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
          Order earnings, refunds, and withdrawals.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--admin-primary)]">
              Records
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
              All Transactions
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center bg-red-600 hover:bg-red-700 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white transition duration-300 shadow-sm"
              >
                Delete Selected ({selectedIds.length})
              </button>
            )}

            <button
              onClick={fetchTransactions}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="admin-table-wrap overflow-x-auto">
          <table className="admin-table min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                <th className="px-4 py-3 font-semibold text-center w-12">
                  <input
                    type="checkbox"
                    checked={
                      pagedTransactions.length > 0 &&
                      selectedIds.length === pagedTransactions.length
                    }
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Date</th>
                 <th className="px-4 py-3 font-semibold">Type</th>
                 {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                 <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Gross</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? "9" : "8"}
                    className="px-4 py-6 text-center text-[var(--admin-text-muted)]"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((item) => {
                  const itemId = item.id || item._id;
                  return (
                    <tr
                      key={itemId}
                      className="border-b border-[#f0e3d1] align-middle last:border-none dark:border-white/10 hover:bg-[#fdf8f2] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(itemId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, itemId]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((x) => x !== itemId),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 capitalize font-semibold">
                        {item.type}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {item.vendorId ? (
                            <>
                              <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                                {item.vendorId.businessName || item.vendorId.name || "N/A"}
                              </p>
                              <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">
                                ID: {String(item.vendorId._id || "").slice(-6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                                {[item.vendorId.address?.city, item.vendorId.address?.state].filter(Boolean).join(", ")}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Super Admin / System</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-200">
                        {formatMoney(item.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {item.grossAmount !== undefined
                          ? formatMoney(item.grossAmount)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-[#8B1E3F] dark:text-[#f7b8ca]">
                        {item.superAdminCommission !== undefined
                          ? formatMoney(item.superAdminCommission)
                          : item.type === "super-admin-commission"
                            ? formatMoney(item.amount)
                            : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)] font-mono text-xs break-all">
                        {item.reference || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div> */}

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={transactions.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={[10]}
        />
      </section>
    </div>
  );
}
