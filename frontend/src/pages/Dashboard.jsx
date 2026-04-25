import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getGreeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [pandits, setPandits] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        const [ordersRes, panditsRes, itemsRes] = await Promise.all([
          API.get("/admin/orders", { params: { limit: 120 } }),
          API.get("/admin/pandits", { params: { status: "all" } }),
          API.get("/items", { params: { limit: 120 } }),
        ]);

        setOrders(ordersRes.data?.data?.orders || []);
        setPandits(panditsRes.data?.data || []);
        setItems(itemsRes.data?.data?.products || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const activePandits = pandits.filter((pandit) => pandit.status === "active").length;
    const pendingOrders = orders.filter(
      (order) => String(order.orderStatus || "").toLowerCase() !== "delivered"
    ).length;

    return [
      {
        title: "Today Orders",
        value: totalOrders,
        tone: "text-[#2f1618] dark:text-[#fff3dc]",
        sub: `${pendingOrders} pending`,
      },
      {
        title: "Revenue",
        value: formatCurrency(totalRevenue),
        tone: "text-[#b9144b]",
        sub: "Overall order revenue",
      },
      {
        title: "Active Poojas",
        value: items.length,
        tone: "text-[#1d7a72]",
        sub: "Products in catalog",
      },
      {
        title: "Pandits Active",
        value: activePandits,
        tone: "text-[#2b5da8]",
        sub: `${pandits.length} total pandits`,
      },
    ];
  }, [orders, pandits, items]);

  const weeklyRevenueData = useMemo(() => {
    const map = new Map(WEEK_DAYS.map((day) => [day, { day, revenue: 0, orders: 0 }]));
    orders.forEach((order) => {
      const date = new Date(order.createdAt || order.updatedAt || Date.now());
      const day = WEEK_DAYS[date.getDay()];
      const bucket = map.get(day);
      if (bucket) {
        bucket.revenue += Number(order.totalAmount || 0);
        bucket.orders += 1;
      }
    });
    return WEEK_DAYS.map((day) => map.get(day));
  }, [orders]);

  const cityStats = useMemo(() => {
    const cityMap = new Map();
    orders.forEach((order) => {
      const city = order?.address?.city || "Unknown";
      cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });
    return [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  const greeting = getGreeting(now.getHours());
  const formattedDate = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-[var(--admin-text)] shadow-[var(--admin-shadow)] md:p-7">
        <div className="absolute -left-12 top-10 h-36 w-36 rounded-full bg-[#ca1755]/8 blur-3xl" />
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#18b887]/8 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--admin-primary)]">
              Dashboard Overview
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              {greeting}, welcome Admin.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--admin-muted)] md:text-base">
              Track orders, revenue, pandits, and product performance from one place.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-2 text-sm">
                {formattedDate}
              </div>
              <div className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-2 text-sm">
                Synced at {formattedTime}
              </div>
              <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
                Synced with backend
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--admin-primary)]">Stats</p>
            <div className="mt-4 grid gap-3">
              {metrics.map((metric) => (
                <div key={metric.title} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-3">
                  <p className="text-xs text-[var(--admin-muted)]">{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{metric.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#ca1755]/10 blur-3xl" />
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
                Orders Overview
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">
                Weekly revenue trend
              </h3>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700">Live</div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyRevenueData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ca1755" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#ca1755" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.20)" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip
                formatter={(value, name) =>
                  name === "revenue" ? formatCurrency(value) : `${value} orders`
                }
                contentStyle={{
                  borderRadius: "18px",
                  border: "1px solid rgba(148,163,184,0.2)",
                  background: "#ffffff",
                  color: "#1f2030",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ca1755"
                strokeWidth={3}
                fill="url(#revenueFill)"
                animationDuration={1100}
              />
            </AreaChart>
          </ResponsiveContainer>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>

        <div className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#1d7a72]">City Performance</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">Top cities by orders</h3>

          <div className="mt-5 space-y-3">
            {cityStats.length ? (
              cityStats.map((row) => (
                <div key={row.city} className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3">
                  <div>
                    <p className="font-semibold text-[var(--admin-text)]">{row.city}</p>
                    <p className="text-xs text-[var(--admin-muted)]">Orders</p>
                  </div>
                  <p className="text-xl font-bold text-[var(--admin-primary)]">{row.count}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-white/60 p-3 text-sm dark:bg-white/5">No city data found.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[var(--admin-text)]">Recent Orders</h3>
          {loading && <span className="text-xs text-[var(--admin-muted)]">Loading...</span>}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
              <tr>
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Pooja/Items</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length ? (
                recentOrders.map((order) => (
                  <tr key={order._id} className="border-t border-[#e8d7bf] dark:border-white/10">
                    <td className="px-4 py-3 font-semibold">#{String(order._id).slice(-6)}</td>
                    <td className="px-4 py-3">{order?.user?.name || "-"}</td>
                    <td className="px-4 py-3">{order?.address?.city || "-"}</td>
                    <td className="px-4 py-3">{order?.itemCount || order?.items?.length || 0}</td>
                    <td className="px-4 py-3">{order?.orderStatus || "Placed"}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(order?.totalAmount || 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-sm text-[var(--admin-muted)]" colSpan={6}>
                    No orders available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

