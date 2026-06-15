import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiMoreVertical, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import { normalizeCities } from "../utils/normalizeCity";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
const formatImageUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiOrigin}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

const EMPTY_FORM = {
  user: "",
  items: [
    {
      productType: "Item",
      product: "",
      quantity: 1,
      price: 0,
    },
  ],
  address: {
    name: "",
    phone: "",
    fullAddress: "",
    addressType: "others",
    city: "",
    state: "",
    pincode: "",
  },
  deliveryFee: 0,
  paymentMethod: "COD",
  paymentStatus: "Pending",
  paymentGateway: "",
  orderStatus: "Placed",
};

const buildEmptyOrderForm = () => ({
  ...EMPTY_FORM,
  items: EMPTY_FORM.items.map((item) => ({ ...item })),
  address: { ...EMPTY_FORM.address },
});

const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Accepted",
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

const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

const formatWhatsAppNumber = (value) => {
  const digits = cleanPhone(value);
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

const buildWhatsAppLink = (phone, message) => {
  const normalized = formatWhatsAppNumber(phone);
  if (!normalized) return "";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${text}`;
};

const getDeliveryPortalOrigin = () => {
  if (process.env.REACT_APP_DELIVERY_PORTAL_URL) {
    return process.env.REACT_APP_DELIVERY_PORTAL_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
};

const buildDeliveryLink = (origin, path, params = {}) => {
  if (!origin) return "";
  const url = new URL(path, origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const buildOrderAddress = (order) =>
  [
    order?.address?.fullAddress,
    order?.address?.city,
    order?.address?.state,
    order?.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 10,
  });
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [availableCities, setAvailableCities] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState("");
  const [form, setForm] = useState(buildEmptyOrderForm);
  const [submitting, setSubmitting] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [trackingUpdates, setTrackingUpdates] = useState({});
  const [trackingLoadingId, setTrackingLoadingId] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [deliveryBoysLoading, setDeliveryBoysLoading] = useState(false);
  const [deliveryBoySelection, setDeliveryBoySelection] = useState("");
  const [deliveryAssigningId, setDeliveryAssigningId] = useState("");

  const fetchOrders = useCallback(
    async ({ search = "", status = "all", paymentStatus = "all", paymentMethod = "all", city = "", page = 1 } = {}) => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/orders", {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(city && city.trim() ? { city: city.trim() } : {}),
            status,
            paymentStatus,
            paymentMethod,
            page,
            limit: pageSize,
          },
        });

        const incomingOrders = res.data?.data?.orders || [];
        const incomingPagination = res.data?.data?.pagination || {};
        const incomingCities = res.data?.data?.cities || [];

        setOrders(incomingOrders);
        setPagination({
          total: Number(incomingPagination.total || incomingOrders.length || 0),
          currentPage: Number(incomingPagination.currentPage || page),
          totalPages: Number(incomingPagination.totalPages || 1),
          limit: Number(incomingPagination.limit || pageSize),
        });

        if (Array.isArray(incomingCities) && incomingCities.length > 0) {
          setAvailableCities(normalizeCities(incomingCities));
        }

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
    [pageSize]
  );

  const fetchDeliveryBoys = useCallback(async () => {
    try {
      setDeliveryBoysLoading(true);
      const res = await API.get("/admin/delivery-boys", {
        params: { status: "active" },
      });
      setDeliveryBoys(res.data?.data?.deliveryBoys || []);
    } catch (err) {
      setDeliveryBoys([]);
    } finally {
      setDeliveryBoysLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders({
        search: searchTerm,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
        city: cityFilter,
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
    cityFilter,
    pagination.currentPage,
    pageSize,
  ]);

  useEffect(() => {
    fetchDeliveryBoys();
  }, [fetchDeliveryBoys]);

  useEffect(() => {
    if (!selectedOrder) {
      setDeliveryBoySelection("");
      return;
    }

    setDeliveryBoySelection(selectedOrder.deliveryBoy?._id || "");
  }, [selectedOrder]);

useEffect(() => {
  if (!orders.length) {
    if (selectedOrder !== null) {
      setSelectedOrder(null);
    }
    return;
  }

  const stillPresent =
    selectedOrder &&
    orders.some((order) => order._id === selectedOrder._id);

  if (!stillPresent) {
    setSelectedOrder(null);
  }
}, [orders, selectedOrder]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-order-menu], [data-table-menu-popover]")) {
        setOpenMenuId("");
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!openMenuId) {
      setMenuAnchorRect(null);
    }
  }, [openMenuId]);


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
    setForm(buildEmptyOrderForm());
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
      items: safeItems.length
        ? safeItems.map((item) => ({
            productType: item.productType || "Item",
            product: item.product?._id || item.product || "",
            quantity: item.quantity || 1,
            price: item.price || 0,
          }))
        : buildEmptyOrderForm().items,
      address: {
        name: safeAddress.name || "",
        phone: safeAddress.phone || "",
        fullAddress: safeAddress.fullAddress || "",
        addressType: safeAddress.addressType || order?.addressType || "others",
        city: safeAddress.city || "",
        state: safeAddress.state || "",
        pincode: safeAddress.pincode || "",
      },
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

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        [name]: value,
      },
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addOrderItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          productType: "Item",
          product: "",
          quantity: 1,
          price: 0,
        },
      ],
    }));
  };

  const removeOrderItem = (index) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length > 1
          ? current.items.filter((_, itemIndex) => itemIndex !== index)
          : current.items,
    }));
  };

  const handleSaveOrder = async (event) => {
    event.preventDefault();

    if (!form.user.trim()) {
      setError("User id is required.");
      setSuccess("");
      return;
    }

    const formItems = Array.isArray(form.items) ? form.items : [];
    const normalizedItems = formItems.map((item) => ({
      productType: item.productType,
      product: String(item.product || "").trim(),
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
    }));

    if (!normalizedItems.length || normalizedItems.some((item) => !item.product)) {
      setError("At least one item with product id is required.");
      setSuccess("");
      return;
    }

    if (!form.address?.name?.trim() || !form.address?.phone?.trim()) {
      setError("Customer name and phone are required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        user: form.user.trim(),
        items: normalizedItems,
        address: {
          name: form.address.name.trim(),
          phone: form.address.phone.trim(),
          fullAddress: form.address.fullAddress.trim(),
          addressType: form.address.addressType,
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          pincode: form.address.pincode.trim(),
        },
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

  const toggleOrderSelection = (orderId, checked) => {
    setSelectedOrderIds((current) => {
      if (checked) {
        return current.includes(orderId) ? current : [...current, orderId];
      }
      return current.filter((id) => id !== orderId);
    });
  };

  const toggleAllOrders = (checked) => {
    if (checked) {
      setSelectedOrderIds(orders.map((order) => order._id));
      return;
    }
    setSelectedOrderIds([]);
  };

  const handleDeleteSelectedOrders = async () => {
    if (!selectedOrderIds.length) return;
    if (!window.confirm(`Delete ${selectedOrderIds.length} selected orders?`)) return;

    try {
      setDeletingOrderId("bulk");
      setError("");
      setSuccess("");

      await Promise.all(selectedOrderIds.map((orderId) => API.delete(`/admin/orders/${orderId}`)));

      setOrders((current) => current.filter((entry) => !selectedOrderIds.includes(entry._id)));
      setSelectedOrderIds([]);
      setSuccess("Selected orders deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected orders.");
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

  const handleAssignDeliveryBoy = async () => {
    if (!selectedOrder?._id) return;
    if (!deliveryBoySelection) {
      setError("Please select a delivery boy.");
      setSuccess("");
      return;
    }

    try {
      setDeliveryAssigningId(selectedOrder._id);
      setError("");
      setSuccess("");

      const res = await API.patch(`/admin/orders/${selectedOrder._id}/assign-delivery`, {
        deliveryBoyId: deliveryBoySelection,
      });

      const updated = res.data?.data?.order;
      if (updated?._id) {
        setOrders((current) =>
          current.map((entry) => (entry._id === updated._id ? updated : entry))
        );
        setSelectedOrder(updated);
      }

      setSuccess("Delivery boy assigned successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to assign delivery boy.");
    } finally {
      setDeliveryAssigningId("");
    }
  };

  const openOrderDetails = (order) => {
    if (!order?._id) return;
    setSelectedOrder(order);
    handleViewOrder(order._id);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setPagination((current) => ({ ...current, currentPage: nextPage }));
  };

  const selectedDeliveryBoy = useMemo(
    () => deliveryBoys.find((entry) => entry._id === deliveryBoySelection) || null,
    [deliveryBoys, deliveryBoySelection]
  );

  const deliveryPortalOrigin = getDeliveryPortalOrigin();
  const orderIdShort = selectedOrder ? String(selectedOrder._id).slice(-8) : "";
  const orderAddress = selectedOrder ? buildOrderAddress(selectedOrder) : "";
  const mapLink = orderAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(orderAddress)}`
    : "";
  const orderIdParam = selectedOrder?._id || "";
  const deliveryBoyParam = selectedDeliveryBoy?._id || selectedOrder?.deliveryBoy?._id || "";

  const loginLink = buildDeliveryLink(deliveryPortalOrigin, "/delivery/login", {
    orderId: orderIdParam,
    deliveryBoyId: deliveryBoyParam,
  });

  const deliveryMessage = selectedOrder
    ? [
        "*New Delivery Assigned*",
        "",
        `*Order ID:* #${orderIdShort}`,
        `*Customer:* ${selectedOrder.user?.name || selectedOrder.address?.name || "-"}`,
        `*Phone:* ${selectedOrder.user?.phone || selectedOrder.address?.phone || "-"}`,
        `*Address:* ${orderAddress || "-"}`,
        mapLink ? `*Google Map:* ${mapLink}` : "",
        "",
        "*Login:*",
        loginLink ? loginLink : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const deliveryWhatsAppLink = buildWhatsAppLink(
    selectedDeliveryBoy?.phone || selectedOrder?.deliveryBoy?.phone,
    deliveryMessage
  );

  const orderDetailsCard = selectedOrder ? (
    <div className="rounded-2xl border border-[#d8c4a5] bg-[#fffdf8] p-4 dark:border-white/10 dark:bg-[#171b23]">
      {loadingOrderDetails ? (
        <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">Loading details...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-bold">Order #{String(selectedOrder._id).slice(-8)}</h4>
              <p className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                Booked on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "-"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(selectedOrder.orderStatus)}`}>
                {selectedOrder.orderStatus || "Placed"}
              </span>
              <button
                type="button"
                onClick={() => openEdit(selectedOrder)}
                className="rounded-lg border border-[#d7bf9b] p-2 text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                title="Edit"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder)}
                disabled={deletingOrderId === selectedOrder._id}
                className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                title="Delete"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-[#d7bf9b] p-2 text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                title="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pb-1 text-center text-[11px]">
            {["Booked", "Assigning", "On The Way", "Completed"].map((step, idx) => {
              const done = idx === 0 || String(selectedOrder.orderStatus || "").toLowerCase() === "delivered";
              return (
                <div key={step} className={`rounded-lg border px-2 py-1 ${done ? "border-[#d8c4a5] bg-[#fff3dd] text-[#6f3945]" : "border-[#e8d7bf] bg-white text-[#8b6b5b] dark:border-white/10 dark:bg-white/5 dark:text-[#dbcdb8]/70"}`}>
                  {step}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#e7d7c1] bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-sm font-semibold">Customer Details</p>
            <p className="text-sm font-semibold">{selectedOrder.user?.name || selectedOrder.address?.name || "-"}</p>
            <p className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">{selectedOrder.user?.phone || selectedOrder.address?.phone || "-"}</p>
            <p className="mt-2 text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
              {[selectedOrder.address?.fullAddress, selectedOrder.address?.city, selectedOrder.address?.state, selectedOrder.address?.pincode]
                .filter(Boolean)
                .join(", ") || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-[#e7d7c1] bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-sm font-semibold">Delivery Assignment</p>
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#7b5a4b] dark:text-[#dbcdb8]/70">Assigned</span>
                <span className="font-semibold">
                  {selectedOrder.deliveryBoy?.fullName || "Not assigned"}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#7b5a4b] dark:text-[#dbcdb8]/70">Phone</span>
                <span className="font-semibold">{selectedOrder.deliveryBoy?.phone || "-"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={deliveryBoySelection}
                  onChange={(event) => setDeliveryBoySelection(event.target.value)}
                  className="h-10 flex-1 rounded-lg border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
                >
                  <option value="">Select delivery boy</option>
                  {deliveryBoysLoading && <option value="">Loading...</option>}
                  {deliveryBoys.map((deliveryBoy) => (
                    <option key={deliveryBoy._id} value={deliveryBoy._id}>
                      {deliveryBoy.fullName} ({deliveryBoy.phone})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignDeliveryBoy}
                  disabled={deliveryAssigningId === selectedOrder._id || deliveryBoysLoading}
                  className="rounded-lg bg-[#8B1E3F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {deliveryAssigningId === selectedOrder._id ? "Assigning..." : "Assign"}
                </button>
                <a
                  href={deliveryWhatsAppLink || "#"}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!deliveryWhatsAppLink) {
                      event.preventDefault();
                    }
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    deliveryWhatsAppLink
                      ? "border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                      : "border-[#e6d8c5] text-[#b29b88] opacity-60"
                  }`}
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e7d7c1] bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Items ({(selectedOrder.items || []).length})</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(selectedOrder.items || []).slice(0, 5).map((item, index) => {
                const imagePath =
                  item.product?.thumbnail ||
                  item.product?.products?.[0] ||
                  item.product?.media?.image?.[0];
                return (
                  <div key={`${selectedOrder._id}-${index}`} className="rounded-lg border border-[#efe1cf] bg-[#fff9ef] p-1.5 dark:border-white/10 dark:bg-white/5">
                    {imagePath ? (
                      <img
                        src={formatImageUrl(imagePath)}
                        alt={item.product?.title || "Item"}
                        className="h-11 w-full rounded object-cover"
                      />
                    ) : (
                      <div className="grid h-11 place-items-center rounded bg-[#f2e8d8] text-[10px] text-[#7b5a4b] dark:bg-white/10 dark:text-[#dbcdb8]/70">
                        No Img
                      </div>
                    )}
                    <p className="mt-1 truncate text-[10px] font-semibold">
                      {item.product?.title || item.productType}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#e7d7c1] bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-sm font-semibold">Payment Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#7b5a4b] dark:text-[#dbcdb8]/70">Item Total</span>
                <strong>Rs {Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7b5a4b] dark:text-[#dbcdb8]/70">Delivery</span>
                <strong>Rs {Number(selectedOrder.deliveryFee || 0).toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7b5a4b] dark:text-[#dbcdb8]/70">Platform Fee</span>
                <strong>Rs {Number(selectedOrder.platformFee || 0).toFixed(2)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[#eddcc6] pt-2 dark:border-white/10">
                <span className="font-semibold">Total Amount</span>
                <strong>Rs {Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong>
              </div>
              <div className="mt-2 inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                {selectedOrder.paymentStatus || "Pending"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e7d7c1] bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-sm font-semibold">Actions</p>
            <div className="flex items-center gap-2">
              <select
                value={trackingUpdates[selectedOrder._id] || selectedOrder.orderStatus || "Placed"}
                onChange={(event) => handleChangeTrackingSelection(selectedOrder._id, event.target.value)}
                className="h-10 flex-1 rounded-lg border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleUpdateTracking(selectedOrder)}
                disabled={trackingLoadingId === selectedOrder._id}
                className="rounded-lg bg-[#8B1E3F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {trackingLoadingId === selectedOrder._id ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;

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
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
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
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
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
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
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
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
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
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Items</label>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="rounded-lg border border-[#d7bf9b] px-3 py-1.5 text-xs font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                >
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {(form.items || []).map((item, index) => (
                  <div key={`order-item-${index}`} className="rounded-2xl border border-[#e7d7c1] bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                        Item {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        disabled={(form.items || []).length <= 1}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Product Type</label>
                        <select
                          value={item.productType}
                          onChange={(event) => handleItemChange(index, "productType", event.target.value)}
                          className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                        >
                          <option value="Item">Item</option>
                          <option value="FestivalKit">Kit</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium">Product ID</label>
                        <input
                          type="text"
                          value={item.product}
                          onChange={(event) => handleItemChange(index, "product", event.target.value)}
                          placeholder="Product or kit id"
                          className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                            className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Price</label>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(event) => handleItemChange(index, "price", event.target.value)}
                            className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-medium">Address Details</label>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { name: "name", label: "Customer Name", required: true },
                  { name: "phone", label: "Phone", required: true },
                  { name: "city", label: "City" },
                  { name: "state", label: "State" },
                  { name: "pincode", label: "Pincode" },
                ].map((field) => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-xs font-medium">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={form.address?.[field.name] || ""}
                      onChange={handleAddressChange}
                      required={field.required}
                      className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Address Type</label>
                  <select
                    name="addressType"
                    value={form.address?.addressType || "others"}
                    onChange={handleAddressChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium">Full Address</label>
                  <textarea
                    name="fullAddress"
                    rows={3}
                    value={form.address?.fullAddress || ""}
                    onChange={handleAddressChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white"
                  />
                </div>
              </div>
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
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All Order Status</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All Payment Status</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All Payment Methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading orders...</p>
        ) : !orders.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm || statusFilter !== "all" || paymentStatusFilter !== "all" || paymentMethodFilter !== "all" || cityFilter.trim()
              ? "No orders match current filters."
              : "No orders found."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                  {selectedOrderIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelectedOrders}
                  disabled={!selectedOrderIds.length || deletingOrderId === "bulk"}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
                >
                  Delete Selected
                </button>
              </div>

              <div className="admin-table-wrap overflow-x-auto">
                <table className="admin-table text-left min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                      <th className="px-4 py-3 font-semibold">
                        <input
                          type="checkbox"
                          checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                          onChange={(event) => toggleAllOrders(event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">S.No</th>
                      <th className="px-4 py-3 font-semibold">Order ID</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Items</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => (
                      <tr
                        key={order._id}
                        onClick={() => openOrderDetails(order)}
                        className={`border-b border-[#f0e3d1] align-top transition hover:bg-[#8B1E3F]/5 last:border-none dark:border-white/10 ${
                          selectedOrder?._id === order._id ? "bg-[#8B1E3F]/8" : ""
                        }`}
                      >
                        <td className="px-4 text-left py-3" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order._id)}
                            onChange={(event) => toggleOrderSelection(order._id, event.target.checked)}
                            className="h-4 w-4 text rounded-[4px] border border-[#d7c3a3]"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">
                          #{String(order._id).slice(-8)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                            {order?.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                            {order?.user?.phone || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">{Number(order.itemCount || order.items?.length || 0)}</td>
                        <td className="px-4 py-3 font-semibold">Rs {Number(order.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(order.orderStatus)}`}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusBadgeClass(order.paymentStatus)}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-right" data-order-menu onClick={(event) => event.stopPropagation()}>
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onClick={(event) => {
                                const nextId = openMenuId === order._id ? "" : order._id;
                                setOpenMenuId(nextId);
                                setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                              }}
                              className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                            >
                              <FiMoreVertical />
                            </button>
                            {openMenuId === order._id && (
                              <TableMenuPopover
                                open
                                anchorRect={menuAnchorRect}
                                preferUp={index >= orders.length - 3}
                                onClose={() => setOpenMenuId("")}
                                className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    openOrderDetails(order);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                                >
                                  <FiEye className="text-[#6f3945]" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    openEdit(order);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                                >
                                  <FiEdit2 className="text-[#6f3945]" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    openOrderDetails(order);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                                >
                                  <span className="text-[#6f3945]">Update Status</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    handleDeleteOrder(order);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-500/10"
                                >
                                  <FiTrash2 className="text-red-600" /> Delete
                                </button>
                              </TableMenuPopover>
                            )}
                          </div>
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
                  handlePageChange(1);
                }}
                pageSizeOptions={[10]}
              />
            </div>

            {selectedOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
                  {orderDetailsCard}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}


