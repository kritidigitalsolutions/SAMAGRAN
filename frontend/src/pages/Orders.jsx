import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";

const EMPTY_FORM = {
  user: "",
  itemsJson: JSON.stringify(
    [
      {
        productType: "Item",
        product: "",
        quantity: 1,
        price: 0,
      },
    ],
    null,
    2
  ),
  addressJson: JSON.stringify(
    {
      name: "",
      phone: "",
      fullAddress: "",
      addressType: "others",
      city: "",
      state: "",
      pincode: "",
    },
    null,
    2
  ),
  deliveryFee: 0,
  paymentMethod: "COD",
  paymentStatus: "Pending",
  paymentGateway: "",
  orderStatus: "Placed",
};

const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const PAYMENT_STATUSES = ["Pending", "Paid", "Failed"];
const PAYMENT_METHODS = ["COD", "ONLINE"];

const orderStatusBadgeClass = (status = "") => {
  const value = String(status).toLowerCase();

  if (value === "delivered") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  if (value === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }

  if (value === "out for delivery") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
};

const paymentStatusBadgeClass = (status = "") => {
  const value = String(status).toLowerCase();

  if (value === "paid") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  if (value === "failed") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
};

const parseSafeJson = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    return fallback;
  }
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [trackingUpdates, setTrackingUpdates] = useState({});
  const [trackingLoadingId, setTrackingLoadingId] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState("");

  const fetchOrders = useCallback(
    async ({ search = "", status = "all", paymentStatus = "all", paymentMethod = "all", page = 1 } = {}) => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/orders", {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            status,
            paymentStatus,
            paymentMethod,
            page,
            limit: 20,
          },
        });

        const incomingOrders = res.data?.data?.orders || [];
        const incomingPagination = res.data?.data?.pagination || {};

        setOrders(incomingOrders);
        setPagination({
          total: Number(incomingPagination.total || incomingOrders.length || 0),
          currentPage: Number(incomingPagination.currentPage || page),
          totalPages: Number(incomingPagination.totalPages || 1),
          limit: Number(incomingPagination.limit || 20),
        });

        setTrackingUpdates((current) => {
          const next = { ...current };
          incomingOrders.forEach((order) => {
            if (!next[order._id]) {
              next[order._id] = order.orderStatus || "Placed";
            }
          });
          return next;
        });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders({
        search: searchTerm,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
        page: pagination.currentPage || 1,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    fetchOrders,
    searchTerm,
    statusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    pagination.currentPage,
  ]);

  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const delivered = orders.filter((order) => String(order.orderStatus).toLowerCase() === "delivered").length;
    const pending = orders.filter((order) => String(order.paymentStatus).toLowerCase() === "pending").length;

    return {
      total: Number(pagination.total || orders.length),
      delivered,
      pending,
      totalRevenue,
    };
  }, [orders, pagination.total]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingOrderId("");
  };

  // const openCreate = () => {
  //   resetForm();
  //   setError("");
  //   setSuccess("");
  //   setShowForm(true);
  // };

  const openEdit = (order) => {
    const safeItems = Array.isArray(order?.items) ? order.items : [];
    const safeAddress = order?.address || {};

    setForm({
      user: order?.user?._id || order?.user || "",
      itemsJson: JSON.stringify(
        safeItems.map((item) => ({
          productType: item.productType,
          product: item.product?._id || item.product,
          quantity: item.quantity,
          price: item.price,
        })),
        null,
        2
      ),
      addressJson: JSON.stringify(
        {
          name: safeAddress.name || "",
          phone: safeAddress.phone || "",
          fullAddress: safeAddress.fullAddress || "",
          addressType: safeAddress.addressType || order?.addressType || "others",
          city: safeAddress.city || "",
          state: safeAddress.state || "",
          pincode: safeAddress.pincode || "",
        },
        null,
        2
      ),
      deliveryFee: Number(order?.amountBreakup?.deliveryFee || 0),
      paymentMethod: order?.paymentMethod || "COD",
      paymentStatus: order?.paymentStatus || "Pending",
      paymentGateway: order?.paymentGateway || "",
      orderStatus: order?.orderStatus || "Placed",
    });

    setEditingOrderId(order?._id || "");
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveOrder = async (event) => {
    event.preventDefault();

    if (!form.user.trim()) {
      setError("User id is required.");
      setSuccess("");
      return;
    }

    const parsedItems = parseSafeJson(form.itemsJson, null);
    const parsedAddress = parseSafeJson(form.addressJson, null);

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      setError("Items JSON must be a non-empty array.");
      setSuccess("");
      return;
    }

    if (!parsedAddress || typeof parsedAddress !== "object") {
      setError("Address JSON must be a valid object.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        user: form.user.trim(),
        items: parsedItems,
        address: parsedAddress,
        deliveryFee: Number(form.deliveryFee || 0),
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        paymentGateway: form.paymentGateway.trim() || null,
        orderStatus: form.orderStatus,
      };

      if (editingOrderId) {
        await API.put(`/admin/orders/${editingOrderId}`, payload);
      } else {
        await API.post("/admin/orders", payload);
      }

      await fetchOrders({
        search: searchTerm,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
        page: pagination.currentPage,
      });

      setSuccess(editingOrderId ? "Order updated successfully." : "Order created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save order.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!order?._id) return;
    if (!window.confirm(`Delete order ${order._id}?`)) return;

    try {
      setDeletingOrderId(order._id);
      setError("");
      setSuccess("");

      await API.delete(`/admin/orders/${order._id}`);

      setOrders((current) => current.filter((entry) => entry._id !== order._id));
      setSuccess("Order deleted successfully.");
      if (selectedOrder?._id === order._id) {
        setSelectedOrder(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete order.");
    } finally {
      setDeletingOrderId("");
    }
  };

  const handleChangeTrackingSelection = (orderId, value) => {
    setTrackingUpdates((current) => ({ ...current, [orderId]: value }));
  };

  const handleUpdateTracking = async (order) => {
    const orderId = order?._id;
    if (!orderId) return;

    const nextStatus = trackingUpdates[orderId] || order.orderStatus || "Placed";

    try {
      setTrackingLoadingId(orderId);
      setError("");
      setSuccess("");

      const res = await API.patch(`/admin/orders/${orderId}/tracking`, {
        orderStatus: nextStatus,
      });

      const updated = res.data?.data?.order;

      if (updated?._id) {
        setOrders((current) =>
          current.map((entry) => (entry._id === updated._id ? updated : entry))
        );

        if (selectedOrder?._id === updated._id) {
          setSelectedOrder(updated);
        }
      }

      setSuccess("Tracking status updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update tracking status.");
    } finally {
      setTrackingLoadingId("");
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      setLoadingOrderDetails(true);
      const res = await API.get(`/admin/orders/${orderId}`);
      setSelectedOrder(res.data?.data?.order || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load order details.");
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setPagination((current) => ({ ...current, currentPage: nextPage }));
  };

  return (
    <div className="space-y-5 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Orders</p>
            <h2 className="mt-2 text-2xl font-bold">Dynamic order and tracking management</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Create, update, delete, and track user orders from one admin console.
            </p>
          </div>

          {/* <button
            type="button"
            onClick={openCreate}
            className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow"
          >
            <FiPlus className="h-4 w-4" />
            Create Order
          </button> */}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Delivered {summary.delivered}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">Payment Pending {summary.pending}</span>
          <span className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">Revenue Rs {summary.totalRevenue.toFixed(2)}</span>
        </div>
      </section>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          }`}
        >
          {error || success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSaveOrder} className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">{editingOrderId ? "Edit Order" : "Create Order"}</h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
              aria-label="Close order form"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium">User Id</label>
              <input
                type="text"
                name="user"
                value={form.user}
                onChange={handleFormChange}
                placeholder="Mongo user id"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Fee</label>
              <input
                type="number"
                name="deliveryFee"
                value={form.deliveryFee}
                onChange={handleFormChange}
                min="0"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Status</label>
              <select
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Order Status</label>
              <select
                name="orderStatus"
                value={form.orderStatus}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Payment Gateway (optional)</label>
              <input
                type="text"
                name="paymentGateway"
                value={form.paymentGateway}
                onChange={handleFormChange}
                placeholder="Razorpay"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Items JSON</label>
              <textarea
                name="itemsJson"
                rows={7}
                value={form.itemsJson}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 font-mono text-xs outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address JSON</label>
              <textarea
                name="addressJson"
                rows={7}
                value={form.addressJson}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 font-mono text-xs outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingOrderId ? "Save Changes" : "Create Order"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-xl font-bold">All Orders</h3>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-4xl">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="text-[var(--admin-primary)]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by order id, phone, address"
                className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            >
              <option value="all">All Order Status</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            >
              <option value="all">All Payment Status</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            >
              <option value="all">All Payment Methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading orders...</p>
        ) : !orders.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm || statusFilter !== "all" || paymentStatusFilter !== "all" || paymentMethodFilter !== "all"
              ? "No orders match current filters."
              : "No orders found."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order Id</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Tracking</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-t border-[#e8d7bf] dark:border-white/10">
                      <td className="px-4 py-3 font-semibold">#{String(order._id).slice(-8)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order?.user?.name || "Unknown"}</div>
                        <div className="text-xs opacity-70">{order?.user?.phone || "-"}</div>
                      </td>
                      <td className="px-4 py-3">{Number(order.itemCount || order.items?.length || 0)}</td>
                      <td className="px-4 py-3 font-semibold">Rs {Number(order.totalAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(order.orderStatus)}`}>
                            {order.orderStatus}
                          </span>
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusBadgeClass(order.paymentStatus)}`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[200px] items-center gap-2">
                          <select
                            value={trackingUpdates[order._id] || order.orderStatus || "Placed"}
                            onChange={(event) => handleChangeTrackingSelection(order._id, event.target.value)}
                            className="h-9 flex-1 rounded-lg border border-[#d7c3a3] bg-white/75 px-2 text-xs outline-none dark:border-white/10 dark:bg-white/5"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleUpdateTracking(order)}
                            disabled={trackingLoadingId === order._id}
                            className="rounded-lg bg-[#8B1E3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {trackingLoadingId === order._id ? "..." : "Update"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewOrder(order._id)}
                            className="rounded-lg border border-[#c6d6f5] bg-[#e9f1ff] p-2 text-[#2b5da8] hover:bg-[#dce8ff]"
                            title="View"
                          >
                            <FiEye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(order)}
                            className="rounded-lg border border-[#d7bf9b] p-2 text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                            title="Edit"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order)}
                            disabled={deletingOrderId === order._id}
                            className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="rounded-lg border border-[#d7bf9b] px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
              >
                Prev
              </button>
              <span className="text-xs opacity-80">
                Page {pagination.currentPage} of {Math.max(1, pagination.totalPages)}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="rounded-lg border border-[#d7bf9b] px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[var(--admin-surface)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Order Details</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-2xl leading-none">&times;</button>
            </div>

            {loadingOrderDetails ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">Loading details...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Order Id</span><strong>{selectedOrder._id}</strong></div>
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Customer</span><strong>{selectedOrder.user?.name || "-"}</strong></div>
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Phone</span><strong>{selectedOrder.user?.phone || "-"}</strong></div>
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Payment</span><strong>{selectedOrder.paymentMethod} / {selectedOrder.paymentStatus}</strong></div>
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Order Status</span><strong>{selectedOrder.orderStatus}</strong></div>
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Total</span><strong>Rs {Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong></div>
                  <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2">
                    <span className="block text-xs opacity-70">Address</span>
                    <strong>
                      {[selectedOrder.address?.name, selectedOrder.address?.phone, selectedOrder.address?.fullAddress, selectedOrder.address?.city, selectedOrder.address?.state, selectedOrder.address?.pincode]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </strong>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">Tracking Steps</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {(selectedOrder.tracking?.steps || []).map((step) => (
                      <div
                        key={step.label}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          step.active
                            ? "border-[#8B1E3F] bg-[#8B1E3F]/10"
                            : step.completed
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "border-[#d8c4a5] bg-white/60 dark:border-white/10 dark:bg-white/5"
                        }`}
                      >
                        {step.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">Items</p>
                  <div className="space-y-2">
                    {(selectedOrder.items || []).map((item, index) => (
                      <div key={`${selectedOrder._id}-${index}`} className="rounded-xl bg-white/60 px-3 py-2 text-sm dark:bg-white/5">
                        <div className="font-semibold">{item.product?.title || item.product?.name || item.productType}</div>
                        <div className="text-xs opacity-70">Qty: {item.quantity} | Price: Rs {Number(item.price || 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


