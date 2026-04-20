import { useEffect, useState } from "react";
import Card from "../components/Card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const metrics = [
  {
    title: "Orders",
    value: "1,248",
    subtitle: "126 completed today",
    trend: "+12.4%",
    progress: 78,
    icon: "O",
    tone: "from-[var(--admin-primary)] to-[var(--admin-primary-strong)]",
  },
  {
    title: "Revenue",
    value: "Rs 4.85L",
    subtitle: "Festive kits performing well",
    trend: "+18.9%",
    progress: 84,
    icon: "R",
    tone: "from-[#d94279] to-[#b9144b]",
  },
  {
    title: "Users",
    value: "8,920",
    subtitle: "Returning users growing",
    trend: "+9.1%",
    progress: 67,
    icon: "U",
    tone: "from-[#22b488] to-[#16956f]",
  },
  {
    title: "Pandit Availability",
    value: "94%",
    subtitle: "16 premium slots open",
    trend: "+6.3%",
    progress: 94,
    icon: "P",
    tone: "from-[#e4497d] to-[#b9144b]",
  },
];

const revenueData = [
  { name: "Mon", revenue: 68000, orders: 86 },
  { name: "Tue", revenue: 82000, orders: 104 },
  { name: "Wed", revenue: 79000, orders: 98 },
  { name: "Thu", revenue: 96000, orders: 120 },
  { name: "Fri", revenue: 112000, orders: 136 },
  { name: "Sat", revenue: 128000, orders: 154 },
  { name: "Sun", revenue: 118000, orders: 149 },
];

const activityFeed = [
  { title: "VIP Rudrabhishek booking confirmed", time: "2 min ago", amount: "Rs 12,500" },
  { title: "New user cluster from Hyderabad", time: "18 min ago", amount: "324 signups" },
  { title: "Kit inventory replenished", time: "42 min ago", amount: "180 units" },
];

const spotlightStats = [
  {
    label: "Peak booking window",
    value: "6:30 PM",
    note: "Evening bookings are converting fastest today.",
  },
  {
    label: "Fastest growth city",
    value: "Hyderabad",
    note: "Premium pooja demand is accelerating.",
  },
  {
    label: "Top repeat service",
    value: "Archana",
    note: "Returning devotees prefer quick rituals.",
  },
];

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
  const [activeSpotlight, setActiveSpotlight] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const spotlightTimer = setInterval(() => {
      setActiveSpotlight((current) => (current + 1) % spotlightStats.length);
    }, 3600);

    return () => clearInterval(spotlightTimer);
  }, []);

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
  const currentSpotlight = spotlightStats[activeSpotlight];

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-[var(--admin-text)] shadow-[var(--admin-shadow)] md:p-7">
        <div className="absolute -left-12 top-10 h-36 w-36 rounded-full bg-[#ca1755]/8 blur-3xl" />
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#18b887]/8 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[1.5fr_0.85fr]">
          <div className="card-enter">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--admin-primary)]">
              Dashboard Overview
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              {greeting}, manage your temple commerce operations.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--admin-muted)] md:text-base">
              Track bookings, kits, pandit availability, and revenue in a clean workflow.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-2 text-sm">
                {formattedDate}
              </div>
              <div className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-2 text-sm">
                Synced at {formattedTime}
              </div>
              <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
                Conversion up 7.8%
              </div>
            </div>
          </div>

          <div className="card-enter rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-5" style={{ animationDelay: "140ms" }}>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--admin-primary)]">Live spotlight</p>
            <p className="mt-4 text-sm font-medium text-[var(--admin-muted)]">{currentSpotlight.label}</p>
            <p className="mt-2 text-4xl font-bold text-[var(--admin-text)]">{currentSpotlight.value}</p>
            <p className="mt-3 text-sm text-[var(--admin-muted)]">{currentSpotlight.note}</p>

            <div className="mt-5 flex gap-2">
              {spotlightStats.map((item, index) => (
                <span
                  key={item.label}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === activeSpotlight ? "w-8 bg-[var(--admin-primary)]" : "w-2 bg-[var(--admin-border)]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={metric.title} delay={index * 80} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
        <div className="card-enter relative overflow-hidden rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]" style={{ animationDelay: "140ms" }}>
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#ca1755]/10 blur-3xl" />
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
                Revenue Flow
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">
                Weekly earnings and order momentum
              </h3>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700">
              +15.2% this week
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ca1755" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#ca1755" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.20)" />
              <XAxis dataKey="name" stroke="#94a3b8" />
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
        </div>

        <div>
          <div className="card-enter rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]" style={{ animationDelay: "220ms" }}>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#1d7a72]">
              Live Activity
            </p>
            <h3 className="mt-2 text-2xl font-bold text-[var(--admin-text)]">
              What&apos;s happening now
            </h3>

            <div className="mt-5 space-y-3">
              {activityFeed.map((item) => (
                <div key={item.title} className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-4 transition hover:bg-white">
                  <div>
                    <p className="font-medium text-[var(--admin-text)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.time}</p>
                  </div>
                  <span className="rounded-full bg-[var(--admin-primary)] px-3 py-1 text-xs font-semibold text-white">
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

