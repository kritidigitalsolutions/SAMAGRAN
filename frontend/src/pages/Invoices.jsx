import { useCallback, useEffect, useRef, useState } from "react";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const shortId = (id = "") => String(id).slice(-8).toUpperCase();

const ORDER_STATUSES = [
  { value: "all",              label: "All Status" },
  { value: "placed",           label: "Placed" },
  { value: "confirmed",        label: "Confirmed" },
  { value: "preparing",        label: "Preparing" },
  { value: "out for delivery", label: "Out for Delivery" },
  { value: "delivered",        label: "Delivered" },
  { value: "cancelled",        label: "Cancelled" },
];

const statusColor = (s = "") => {
  const v = s.toLowerCase();
  if (v === "delivered") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (v === "cancelled") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  if (v === "out for delivery") return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300";
  if (v === "confirmed") return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";
  if (v === "preparing") return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
};

const paymentColor = (s = "") => {
  const v = s.toLowerCase();
  if (v === "paid") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (v === "failed") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
};

/* ─── Invoice number generator ─────────────────────────────── */
const buildInvoiceNumber = (order) => {
  if (!order) return "";
  const d = new Date(order.createdAt || Date.now());
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${shortId(order._id)}`;
};

/* ═══════════════════════════════════════════════════════════ */
/*  InvoicePreview component – rendered in DOM, printed as PDF */
/* ═══════════════════════════════════════════════════════════ */
function InvoicePreview({ order, onClose, onDownload }) {
  const invoiceRef = useRef(null);
  const invoiceNumber = buildInvoiceNumber(order);
  const dueDate = new Date(order.createdAt || Date.now());
  dueDate.setDate(dueDate.getDate() + 30);

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const deliveryFee = Number(order.amountBreakup?.deliveryFee || 0);
  const discount =
    Number(order.amountBreakup?.couponDiscount || 0) +
    Number(order.amountBreakup?.offerDiscount || 0);
  const total = Number(order.totalAmount || subtotal + deliveryFee);

  const customer = order.user?.name || order.address?.name || "N/A";
  const email    = order.user?.email || "—";
  const phone    = order.user?.phone || order.address?.phone || "—";
  const address  = [
    order.address?.fullAddress,
    order.address?.city,
    order.address?.state,
    order.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const getProductName = (item) => {
    const p = item.product;
    if (!p) return "Product";
    return p.title || p.name || p.kitName || `${item.productType || "Item"}`;
  };

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative flex flex-col w-full max-w-3xl max-h-[95vh] rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] shadow-2xl dark:border-white/10 dark:bg-[#141820] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8d9c4] dark:border-white/10">
            <h2 className="text-lg font-bold text-[#2f1618] dark:text-[#fff3dc]">Invoice Preview</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 15V4M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 20H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Download PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* Scrollable invoice body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              ref={invoiceRef}
              id="invoice-print-area"
              className="bg-white text-[#1a1a1a] rounded-2xl p-8 shadow-sm"
              style={{ fontFamily: "'Segoe UI', sans-serif" }}
            >
              {/* Top: Brand + INVOICE label */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {/* Logo placeholder */}
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: "linear-gradient(135deg,#8B1E3F,#D4AF37)" }}>S</div>
                    <span className="text-2xl font-extrabold tracking-tight" style={{ color: "#8B1E3F" }}>Samagran</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    support@samagran.com<br />
                    www.samagran.com
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold tracking-widest" style={{ color: "#2f1618" }}>INVOICE</p>
                  <p className="text-xs text-gray-500 mt-1">Invoice #: <span className="font-semibold text-gray-700">{invoiceNumber}</span></p>
                  <p className="text-xs text-gray-500">Date: <span className="font-semibold text-gray-700">{fmtDate(order.createdAt)}</span></p>
                  <p className="text-xs text-gray-500">Due Date: <span className="font-semibold text-gray-700">{fmtDate(dueDate)}</span></p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-[#8B1E3F] via-[#D4AF37] to-transparent mb-6 opacity-40" />

              {/* Bill To + Order Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-2">Bill To:</p>
                  <p className="font-bold text-[#2f1618]">{customer}</p>
                  {email !== "—" && <p className="text-xs text-gray-500">{email}</p>}
                  {phone !== "—" && <p className="text-xs text-gray-500">{phone}</p>}
                  {address && <p className="text-xs text-gray-500 mt-1">{address}</p>}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-2">Order Details:</p>
                  <div className="space-y-1">
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-500 w-28">Order ID</span>
                      <span className="font-semibold text-[#2f1618] break-all">{order._id}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-500 w-28">Order Date</span>
                      <span className="font-semibold text-[#2f1618]">{fmtDate(order.createdAt)}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-500 w-28">Payment Method</span>
                      <span className="font-semibold text-[#2f1618]">{order.paymentMethod || "COD"}</span>
                    </div>
                    <div className="flex gap-2 text-xs items-center">
                      <span className="text-gray-500 w-28">Payment Status</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${paymentColor(order.paymentStatus)}`}>
                        {order.paymentStatus || "Pending"}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs items-center">
                      <span className="text-gray-500 w-28">Order Status</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(order.orderStatus)}`}>
                        {order.orderStatus || "Placed"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg,#8B1E3F,#a0233f)" }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white">Item Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-white">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-white">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-xs text-gray-400">No items found</td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#fdf8f2]"}>
                          <td className="px-4 py-3 text-sm" style={{ color: "#8B1E3F" }}>
                            {getProductName(item)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">{item.quantity ?? 1}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{fmt(item.price)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: "#8B1E3F" }}>
                            {fmt(Number(item.price || 0) * Number(item.quantity || 1))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-[#8B1E3F]">{fmt(subtotal)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery Fee</span>
                      <span className="font-semibold text-[#8B1E3F]">{fmt(deliveryFee)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-semibold text-emerald-600">-{fmt(discount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-200 my-2" />
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-[#2f1618]">Total</span>
                    <span style={{ color: "#8B1E3F" }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes + Terms */}
              <div className="h-px bg-gradient-to-r from-[#8B1E3F] via-[#D4AF37] to-transparent mb-6 opacity-30" />
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-1">Notes:</p>
                  <p className="text-xs text-gray-500">Thank you for your business!</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-1">Terms & Conditions:</p>
                  <p className="text-xs text-gray-500">Payment due within 30 days.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Main Invoices page                                         */
/* ═══════════════════════════════════════════════════════════ */
export default function Invoices() {
  const [orders, setOrders]             = useState([]);
  const [pagination, setPagination]     = useState({ total: 0, currentPage: 1, totalPages: 1, limit: 10 });
  const [pageSize, setPageSize]         = useState(10);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  const [searchTerm, setSearchTerm]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);
  const [generatingId, setGeneratingId]     = useState("");

  /* ── Fetch orders ──────────────────────────────────────── */
  const fetchOrders = useCallback(
    async ({ search = "", status = "all", page = 1 } = {}) => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/admin/orders", {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            status,
            page,
            limit: pageSize,
          },
        });
        const incoming   = res.data?.data?.orders || [];
        const incomingPg = res.data?.data?.pagination || {};
        setOrders(incoming);
        setPagination({
          total:       Number(incomingPg.total || incoming.length || 0),
          currentPage: Number(incomingPg.currentPage || page),
          totalPages:  Number(incomingPg.totalPages || 1),
          limit:       Number(incomingPg.limit || pageSize),
        });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders({ search: searchTerm, status: statusFilter, page: pagination.currentPage });
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchOrders, searchTerm, statusFilter, pagination.currentPage, pageSize]); // eslint-disable-line

  /* ── Generate Invoice (fetch full order → open preview) ── */
  const handleGenerate = async (order) => {
    if (!order?._id) return;
    try {
      setGeneratingId(order._id);
      setError("");
      const res = await API.get(`/admin/orders/${order._id}`);
      const full = res.data?.data?.order;
      if (full) setSelectedOrder(full);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load order details.");
    } finally {
      setGeneratingId("");
    }
  };

  /* ── Download / Print PDF – opens a clean popup window ── */
  const handleDownloadPdf = useCallback((order) => {
    if (!order) return;

    const invoiceNumber = buildInvoiceNumber(order);
    const dueDate = new Date(order.createdAt || Date.now());
    dueDate.setDate(dueDate.getDate() + 30);
    const fmtD = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const fmtM = (v) => Number(v || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
    const deliveryFee = Number(order.amountBreakup?.deliveryFee || 0);
    const discount = Number(order.amountBreakup?.couponDiscount || 0) + Number(order.amountBreakup?.offerDiscount || 0);
    const total = Number(order.totalAmount || subtotal + deliveryFee);

    const customer = order.user?.name || order.address?.name || "N/A";
    const email    = order.user?.email || "";
    const phone    = order.user?.phone || order.address?.phone || "";
    const address  = [order.address?.fullAddress, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(", ");

    const getName = (item) => {
      const p = item.product;
      if (!p) return item.productType || "Product";
      return p.title || p.name || p.kitName || item.productType || "Product";
    };

    const rowsHtml = items.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:16px;color:#999;">No items found</td></tr>`
      : items.map((item, idx) => `
        <tr style="background:${idx % 2 === 0 ? "#fff" : "#fdf8f2"}">
          <td style="padding:10px 14px;color:#8B1E3F;font-size:13px;">${getName(item)}</td>
          <td style="padding:10px 14px;text-align:center;font-size:13px;color:#444;">${item.quantity ?? 1}</td>
          <td style="padding:10px 14px;text-align:right;font-size:13px;color:#444;">${fmtM(item.price)}</td>
          <td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#8B1E3F;">${fmtM(Number(item.price || 0) * Number(item.quantity || 1))}</td>
        </tr>`).join("");

    const deliveryRow = deliveryFee > 0 ? `
      <tr>
        <td colspan="3" style="text-align:right;padding:4px 14px;color:#666;font-size:13px;">Delivery Fee</td>
        <td style="text-align:right;padding:4px 14px;font-weight:600;color:#8B1E3F;font-size:13px;">${fmtM(deliveryFee)}</td>
      </tr>` : "";

    const discountRow = discount > 0 ? `
      <tr>
        <td colspan="3" style="text-align:right;padding:4px 14px;color:#666;font-size:13px;">Discount</td>
        <td style="text-align:right;padding:4px 14px;font-weight:600;color:#16a34a;font-size:13px;">-${fmtM(discount)}</td>
      </tr>` : "";

    const payStatusColor = order.paymentStatus?.toLowerCase() === "paid" ? "#15803d" : order.paymentStatus?.toLowerCase() === "failed" ? "#dc2626" : "#d97706";
    const ordStatusColor = order.orderStatus?.toLowerCase() === "delivered" ? "#15803d" : order.orderStatus?.toLowerCase() === "cancelled" ? "#dc2626" : "#7c3aed";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
    .page { padding: 40px 48px; max-width: 900px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#8B1E3F,#D4AF37);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:800;">S</div>
        <span style="font-size:22px;font-weight:800;color:#8B1E3F;letter-spacing:-0.5px;">Samagran</span>
      </div>
      <p style="font-size:11px;color:#6b7280;line-height:1.6;">support@samagran.com<br/>www.samagran.com</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:28px;font-weight:900;letter-spacing:4px;color:#2f1618;">INVOICE</p>
      <p style="font-size:11px;color:#6b7280;margin-top:4px;">Invoice #: <strong style="color:#374151;">${invoiceNumber}</strong></p>
      <p style="font-size:11px;color:#6b7280;">Date: <strong style="color:#374151;">${fmtD(order.createdAt)}</strong></p>
      <p style="font-size:11px;color:#6b7280;">Due Date: <strong style="color:#374151;">${fmtD(dueDate)}</strong></p>
    </div>
  </div>

  <!-- Divider -->
  <div style="height:2px;background:linear-gradient(90deg,#8B1E3F,#D4AF37,transparent);margin-bottom:24px;opacity:0.5;"></div>

  <!-- Bill To + Order Details -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8B1E3F;margin-bottom:8px;">Bill To:</p>
      <p style="font-weight:700;font-size:14px;color:#2f1618;">${customer}</p>
      ${email ? `<p style="font-size:11px;color:#6b7280;margin-top:2px;">${email}</p>` : ""}
      ${phone ? `<p style="font-size:11px;color:#6b7280;margin-top:2px;">${phone}</p>` : ""}
      ${address ? `<p style="font-size:11px;color:#6b7280;margin-top:6px;">${address}</p>` : ""}
    </div>
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8B1E3F;margin-bottom:8px;">Order Details:</p>
      <table style="font-size:11px;">
        <tr><td style="color:#6b7280;padding:2px 0;width:110px;">Order ID</td><td style="font-weight:600;color:#2f1618;word-break:break-all;">${order._id}</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0;">Order Date</td><td style="font-weight:600;color:#2f1618;">${fmtD(order.createdAt)}</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0;">Payment Method</td><td style="font-weight:600;color:#2f1618;">${order.paymentMethod || "COD"}</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0;">Payment Status</td><td><span style="background:${payStatusColor}22;color:${payStatusColor};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">${order.paymentStatus || "Pending"}</span></td></tr>
        <tr><td style="color:#6b7280;padding:2px 0;">Order Status</td><td><span style="background:${ordStatusColor}22;color:${ordStatusColor};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">${order.orderStatus || "Placed"}</span></td></tr>
      </table>
    </div>
  </div>

  <!-- Items Table -->
  <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
    <table>
      <thead>
        <tr style="background:linear-gradient(135deg,#8B1E3F,#a0233f);">
          <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">Item Description</th>
          <th style="padding:12px 14px;text-align:center;font-size:11px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">Unit Price</th>
          <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
    <table style="width:260px;font-size:13px;">
      <tr>
        <td style="padding:4px 0;color:#6b7280;">Subtotal</td>
        <td style="text-align:right;font-weight:600;color:#8B1E3F;">${fmtM(subtotal)}</td>
      </tr>
      ${deliveryRow}
      ${discountRow}
      <tr><td colspan="2"><div style="height:1px;background:#e5e7eb;margin:8px 0;"></div></td></tr>
      <tr>
        <td style="font-weight:700;font-size:15px;color:#2f1618;">Total</td>
        <td style="text-align:right;font-weight:800;font-size:15px;color:#8B1E3F;">${fmtM(total)}</td>
      </tr>
    </table>
  </div>

  <!-- Divider -->
  <div style="height:1px;background:linear-gradient(90deg,#8B1E3F,#D4AF37,transparent);margin-bottom:24px;opacity:0.4;"></div>

  <!-- Notes + Terms -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8B1E3F;margin-bottom:4px;">Notes:</p>
      <p style="font-size:11px;color:#6b7280;">Thank you for your business!</p>
    </div>
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8B1E3F;margin-bottom:4px;">Terms &amp; Conditions:</p>
      <p style="font-size:11px;color:#6b7280;">Payment due within 30 days.</p>
    </div>
  </div>
</div>
<script>window.onload = function(){ window.focus(); window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
</body>
</html>`;

    const popup = window.open("", "_blank", "width=900,height=700,scrollbars=yes");
    if (!popup) {
      alert("Please allow pop-ups for this site to download the invoice PDF.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }, []);

  const handlePageChange = (next) => {
    if (next < 1 || next > pagination.totalPages) return;
    setPagination((c) => ({ ...c, currentPage: next }));
  };

  /* ── Stats ────────────────────────────────────────────── */
  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const delivered    = orders.filter((o) => o.orderStatus?.toLowerCase() === "delivered").length;
  const pending      = orders.filter((o) => o.paymentStatus?.toLowerCase() === "pending").length;

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      {/* ── Header ───────────────────────────────────────── */}
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Orders &amp; Sales</p>
            <h2 className="mt-2 text-2xl font-bold">Invoice Generator</h2>
            <p className="mt-1 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Generate and download PDF invoices for any order.
            </p>
          </div>

          {/* Stats cards */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Total Orders",    value: pagination.total, color: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-500/10",  icon: <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              { label: "Delivered",       value: delivered,        color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              { label: "Pending Payment", value: pending,          color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-500/10",     icon: <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/></svg> },
              { label: "Revenue",         value: fmt(totalRevenue),color: "text-[#8B1E3F] dark:text-[#f7a8b8]",   bg: "bg-rose-50 dark:bg-rose-500/10",       icon: <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.8"/><path d="M12 6v2M12 16v2M8.5 9.5a3.5 1.5 0 117 0c0 1.5-7 1.5-7 3a3.5 1.5 0 107 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className={`flex items-center gap-3 rounded-2xl border border-[var(--admin-border)] ${bg} px-4 py-3 min-w-[130px]`}>
                <span className={color}>{icon}</span>
                <div>
                  <p className={`text-base font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-[#7b5a4b] dark:text-[#dbcdb8]/70">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {/* ── Filters + Table ───────────────────────────────── */}
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        {/* Search + Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[var(--admin-primary)]">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order ID, Customer Name, or Email…"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPagination((c) => ({ ...c, currentPage: 1 })); }}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
          >
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
          </select>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchOrders({ search: searchTerm, status: statusFilter, page: pagination.currentPage })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M4 4V9H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 20V15H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 9M4 15l1.64 3.36A9 9 0 0 0 20.36 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
            <p className="text-sm text-[#7b5a4b] dark:text-[#dbcdb8]/70">Loading orders…</p>
          </div>
        ) : !orders.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-[#d8c4a5] dark:text-white/10">
              <path d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm text-[#7b5a4b] dark:text-[#dbcdb8]/70">No orders found.</p>
          </div>
        ) : (
          <>
            {/* Order count badge */}
            <div className="mb-3 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[var(--admin-primary)]">
                <path d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold">Orders ({pagination.total})</span>
            </div>

            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-4 py-3 font-semibold">Order ID</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-[#f0e3d1] align-middle last:border-none dark:border-white/10 hover:bg-[#fdf8f2] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Order ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-[#6f3945] dark:text-[#f7e3c0]">
                          …{shortId(order._id)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                          {order.user?.name || order.address?.name || "—"}
                        </p>
                        <p className="text-[11px] text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                          {order.user?.email || order.address?.phone || "—"}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                        {fmtDate(order.createdAt)}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                        {fmt(order.totalAmount)}
                      </td>

                      {/* Payment status */}
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentColor(order.paymentStatus)}`}>
                          {order.paymentStatus || "Pending"}
                        </span>
                      </td>

                      {/* Order status */}
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor(order.orderStatus)}`}>
                          {order.orderStatus || "Placed"}
                        </span>
                      </td>

                      {/* Generate button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleGenerate(order)}
                          disabled={generatingId === order._id}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow transition-all disabled:opacity-60 hover:scale-[1.03] active:scale-95"
                          style={{ background: "linear-gradient(135deg,#8B1E3F,#a0233f)" }}
                        >
                          {generatingId === order._id ? (
                            <>
                              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              Loading…
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                                <path d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Generate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={pagination.currentPage}
              pageSize={pageSize}
              total={pagination.total}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPagination((c) => ({ ...c, currentPage: 1 }));
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </>
        )}
      </section>

      {/* ── Invoice Preview Modal ─────────────────────────── */}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {selectedOrder && (
        <InvoicePreview
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDownload={() => handleDownloadPdf(selectedOrder)}
        />
      )}


    </div>
  );
}
