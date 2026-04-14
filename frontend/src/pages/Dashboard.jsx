import { useEffect, useState } from "react";
import Card from "../components/Card";
import "./Dashboard.css";
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
    tone: "from-[#8B1E3F] via-[#5b1724] to-[#2a0c12]",
  },
  {
    title: "Revenue",
    value: "Rs 4.85L",
    subtitle: "Festive kits performing well",
    trend: "+18.9%",
    progress: 84,
    icon: "R",
    tone: "from-[#D4AF37] via-[#b18418] to-[#8B1E3F]",
  },
  {
    title: "Users",
    value: "8,920",
    subtitle: "Returning users growing",
    trend: "+9.1%",
    progress: 67,
    icon: "U",
    tone: "from-[#1d7a72] via-[#115e59] to-[#2a0c12]",
  },
  {
    title: "Pandit Availability",
    value: "94%",
    subtitle: "16 premium slots open",
    trend: "+6.3%",
    progress: 94,
    icon: "P",
    tone: "from-[#D4AF37] via-[#8B1E3F] to-[#3B0D14]",
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
    <div className="dashboard-page">
      <section className="shimmer-border relative overflow-hidden rounded-[32px] border border-[#dcc9ae]/60 bg-[linear-gradient(135deg,rgba(107,24,41,0.96),rgba(59,13,20,0.96)_42%,rgba(18,8,10,0.98))] p-6 text-white shadow-[0_24px_80px_rgba(59,13,20,0.26)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(59,13,20,0.98),rgba(23,8,11,0.98)_48%,rgba(7,4,5,1))] md:p-7">
        <div className="float-slow absolute -left-12 top-10 h-36 w-36 rounded-full bg-[#D4AF37]/18 blur-3xl" />
        <div className="float-delayed absolute right-0 top-0 h-44 w-44 rounded-full bg-[#8B1E3F]/22 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[1.5fr_0.85fr]">
          <div className="card-enter">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f0d68a]">
              Dynamic Overview
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
              {greeting}, manage your e-pooja operations beautifully.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[#f5e8cf]/82 md:text-base">
              A premium command center for bookings, kits, pandit availability, and revenue performance.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
                {formattedDate}
              </div>
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
                Synced at {formattedTime}
              </div>
              <div className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/12 px-4 py-2 text-sm text-[#f7e6b1] backdrop-blur">
                Conversion up 7.8%
              </div>
            </div>
          </div>

          <div className="card-enter rounded-[28px] border border-[#D4AF37]/20 bg-[linear-gradient(160deg,rgba(212,175,55,0.14),rgba(255,255,255,0.08))] p-5 backdrop-blur-xl" style={{ animationDelay: "140ms" }}>
            <p className="text-xs uppercase tracking-[0.35em] text-[#f0d68a]/90">Live spotlight</p>
            <p className="mt-4 text-sm font-medium text-[#f7ebd2]/78">{currentSpotlight.label}</p>
            <p className="mt-2 text-4xl font-bold text-[#fff4dc]">{currentSpotlight.value}</p>
            <p className="mt-3 text-sm text-[#f4e5c5]/72">{currentSpotlight.note}</p>

            <div className="mt-5 flex gap-2">
              {spotlightStats.map((item, index) => (
                <span
                  key={item.label}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === activeSpotlight ? "w-8 bg-[#D4AF37]" : "w-2 bg-white/25"
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
        <div className="card-enter relative overflow-hidden rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]" style={{ animationDelay: "140ms" }}>
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#D4AF37]/12 blur-3xl dark:bg-[#D4AF37]/10" />
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8B1E3F] dark:text-[#D4AF37]">
                Revenue Flow
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
                Weekly earnings and order momentum
              </h3>
            </div>
            <div className="rounded-full bg-[#D4AF37]/14 px-4 py-2 text-sm font-semibold text-[#8B1E3F] dark:text-[#f5dc9d]">
              +15.2% this week
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.04} />
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
                  background: "rgba(15,23,42,0.95)",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4AF37"
                strokeWidth={3}
                fill="url(#revenueFill)"
                animationDuration={1100}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="card-enter rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]" style={{ animationDelay: "220ms" }}>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#1d7a72] dark:text-[#7fd0c6]">
              Live Activity
            </p>
            <h3 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
              What&apos;s happening now
            </h3>

            <div className="mt-5 space-y-3">
              {activityFeed.map((item) => (
                <div key={item.title} className="card-hover flex items-start justify-between gap-3 rounded-2xl bg-[#fff8ee]/80 px-4 py-4 transition dark:bg-white/5">
                  <div>
                    <p className="font-medium text-[#422127] dark:text-[#fff3dc]">{item.title}</p>
                    <p className="mt-1 text-xs text-[#7a5e4d] dark:text-[#eadcc4]/70">{item.time}</p>
                  </div>
                  <span className="rounded-full bg-[linear-gradient(135deg,#D4AF37,#b78922)] px-3 py-1 text-xs font-semibold text-[#331116] dark:bg-[linear-gradient(135deg,#D4AF37,#b78922)] dark:text-[#331116]">
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
