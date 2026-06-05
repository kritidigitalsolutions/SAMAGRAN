import { useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import TablePagination from "../../components/TablePagination";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN");
};

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-[var(--admin-text)]">{value}</p>
  </div>
);

export default function VendorCommissionReport() {
  const [report, setReport] = useState({ summary: {}, vendors: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/admin/vendor/commission-report");
        setReport(res.data?.data || { summary: {}, vendors: [] });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load commission report.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  const orderRows = useMemo(() => {
    return (report.vendors || [])
      .filter((entry) => selectedVendorId === "all" || String(entry.vendor?._id) === selectedVendorId)
      .flatMap((entry) =>
        (entry.commissionOrders || []).map((order) => ({
          ...order,
          vendor: entry.vendor,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [report.vendors, selectedVendorId]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orderRows.slice(start, start + pageSize);
  }, [orderRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [selectedVendorId, orderRows.length]);

  if (loading) return <div className="p-6">Loading commission report...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Finance</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">Vendor Commission</h1>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Category commission, vendor net profit and pending payout.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={formatMoney(report.summary?.totalRevenue)} />
        <StatCard label="Vendor Net Profit" value={formatMoney(report.summary?.vendorNetEarning)} />
        <StatCard label="Super Admin Commission" value={formatMoney(report.summary?.superAdminCommission)} />
        <StatCard label="Pending Payout" value={formatMoney(report.summary?.pendingPayout)} />
      </section>

      <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">Vendor Summary</h2>
          <select
            value={selectedVendorId}
            onChange={(event) => setSelectedVendorId(event.target.value)}
            className="h-11 rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm text-black outline-none dark:bg-[#181c24] dark:text-white"
          >
            <option value="all">All Vendors</option>
            {(report.vendors || []).map((entry) => (
              <option key={entry.vendor?._id} value={entry.vendor?._id}>
                {entry.vendor?.businessName || entry.vendor?.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[var(--admin-text)]">
            <thead className="bg-[var(--admin-surface-soft)] text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Net Profit</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {(report.vendors || []).map((entry) => (
                <tr key={entry.vendor?._id} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{entry.vendor?.businessName || entry.vendor?.name}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">{entry.vendor?.phone || entry.vendor?.email}</p>
                  </td>
                  <td className="px-4 py-3">{entry.totalOrders}</td>
                  <td className="px-4 py-3">{formatMoney(entry.totalRevenue)}</td>
                  <td className="px-4 py-3 text-emerald-700">{formatMoney(entry.vendorNetEarning)}</td>
                  <td className="px-4 py-3 text-[#8B1E3F]">{formatMoney(entry.superAdminCommission)}</td>
                  <td className="px-4 py-3">{formatMoney(entry.pendingPayout)}</td>
                  <td className="px-4 py-3">{formatMoney(entry.availableBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">Commission Records</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[var(--admin-text)]">
            <thead className="bg-[var(--admin-surface-soft)] text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Vendor Net</th>
                <th className="px-4 py-3">Commission</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-[var(--admin-text-muted)]">No commission records found.</td>
                </tr>
              )}
              {pagedRows.map((row) => (
                <tr key={`${row.orderId}-${row.vendor?._id}`} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3">{row.vendor?.businessName || row.vendor?.name}</td>
                  <td className="px-4 py-3">{String(row.orderId).slice(-8)}</td>
                  <td className="px-4 py-3">{formatMoney(row.grossAmount)}</td>
                  <td className="px-4 py-3 text-emerald-700">{formatMoney(row.vendorNetEarning)}</td>
                  <td className="px-4 py-3 text-[#8B1E3F]">{formatMoney(row.superAdminCommission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={orderRows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
