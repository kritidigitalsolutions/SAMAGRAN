import { useCallback, useEffect, useMemo, useState } from "react";
import DeliveryAPI from "../api/deliveryAxios";
import { clearDeliverySession, getStoredDeliveryBoy } from "../utils/deliveryAuth";

const statusBadge = (status = "") => {
  const value = String(status).toLowerCase();

  if (value === "delivered") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (value === "out for delivery") {
    return "bg-sky-100 text-sky-700";
  }

  if (value === "accepted") {
    return "bg-indigo-100 text-indigo-700";
  }

  return "bg-amber-100 text-amber-700";
};

const buildAddress = (order) =>
  [order?.address?.fullAddress, order?.address?.city, order?.address?.state, order?.address?.pincode]
    .filter(Boolean)
    .join(", ");

const statusSteps = {
  accept: "Accepted",
  out: "Out for Delivery",
  delivered: "Delivered",
};

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const deliveryBoy = useMemo(() => getStoredDeliveryBoy(), []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await DeliveryAPI.get("/delivery/orders");
      setOrders(res.data?.data?.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load assigned orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    try {
      setUpdatingId(orderId);
      setError("");
      setSuccess("");

      const res = await DeliveryAPI.patch(`/delivery/orders/${orderId}/status`, {
        orderStatus: nextStatus,
      });

      const updated = res.data?.data?.order;

      if (updated?._id) {
        setOrders((current) =>
          current.map((entry) => (entry._id === updated._id ? updated : entry))
        );
      }

      setSuccess(`Order status updated to ${nextStatus}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update status.");
    } finally {
      setUpdatingId("");
    }
  };

  // const canAccept = (status) => ["Placed", "Confirmed", "Preparing"].includes(status);
  const canAccept = (status) => ["Placed", "Confirmed"].includes(status);
  const canOut = (status) => status === "Accepted";
  const canDeliver = (status) => status === "Out for Delivery";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fff3dd_0%,#f7efe3_45%,#f6f2ea_100%)] px-4 py-6 text-[#2f1618]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-3xl border border-[#e5d2b8] bg-white/90 p-6 shadow-[0_20px_60px_rgba(36,18,10,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8B1E3F]">Delivery</p>
              <h1 className="mt-2 text-2xl font-bold">Hello, {deliveryBoy?.fullName || "Delivery Partner"}</h1>
              <p className="mt-2 text-sm text-[#6e4b40]">
                Assigned orders ko accept karo aur status update karo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearDeliverySession();
                window.location.href = "/delivery/login";
              }}
              className="rounded-2xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945]"
            >
              Logout
            </button>
          </div>
        </header>

        {(error || success) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-emerald-300 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-[#e5d2b8] bg-white/80 p-6 text-sm">
            Loading orders...
          </div>
        ) : !orders.length ? (
          <div className="rounded-3xl border border-[#e5d2b8] bg-white/80 p-6 text-sm">
            No assigned orders yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => {
              const address = buildAddress(order);
              const status = order.orderStatus || "Placed";
              return (
                <div
                  key={order._id}
                  className="rounded-3xl border border-[#e5d2b8] bg-white/95 p-5 shadow-[0_16px_45px_rgba(36,18,10,0.12)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B1E3F]">Order</p>
                      <p className="mt-1 text-lg font-bold">#{String(order._id).slice(-8)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(status)}`}>
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-sm">
                    <p className="font-semibold">{order.user?.name || order.address?.name || "Customer"}</p>
                    <p className="text-[#7b5a4b]">{order.user?.phone || order.address?.phone || "-"}</p>
                    <p className="text-[#7b5a4b]">{address || "-"}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-[#7b5a4b]">Items: {order.items?.length || 0}</span>
                    <span className="font-semibold">Rs {Number(order.totalAmount || 0).toFixed(2)}</span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={!canAccept(status) || updatingId === order._id}
                      onClick={() => handleUpdateStatus(order._id, statusSteps.accept)}
                      className="rounded-2xl border border-[#d7bf9b] px-3 py-2 text-xs font-semibold text-[#6f3945] disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={!canOut(status) || updatingId === order._id}
                      onClick={() => handleUpdateStatus(order._id, statusSteps.out)}
                      className="rounded-2xl border border-[#d7bf9b] px-3 py-2 text-xs font-semibold text-[#6f3945] disabled:opacity-50"
                    >
                      Out for Delivery
                    </button>
                    <button
                      type="button"
                      disabled={!canDeliver(status) || updatingId === order._id}
                      onClick={() => handleUpdateStatus(order._id, statusSteps.delivered)}
                      className="rounded-2xl bg-[#8B1E3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Delivered
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
