import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { clearAdminSession, getStoredAdmin, setStoredAdmin } from "../utils/auth";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar({ onMenuClick, onToggleSidebar, sidebarCollapsed }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(() => getStoredAdmin());
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAdmin = async () => {
      try {
        const res = await API.get("/admin/dashboard");
        const adminProfile = res.data?.admin;

        if (adminProfile && isMounted) {
          setAdmin(adminProfile);
          setStoredAdmin(adminProfile);
        }
      } catch (err) {
        console.error("Unable to load admin profile", err);
      }
    };

    fetchAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  const adminName = admin?.name || admin?.email?.split("@")[0] || "Admin";
  const adminInitials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

  const handleLogout = () => {
    clearAdminSession();
    setAdmin(null);
    setProfileOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="sticky top-0 z-20 border-b border-[#e6d7bd]/75 bg-[linear-gradient(180deg,rgba(255,248,238,0.86),rgba(248,238,222,0.80))] px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(23,10,14,0.84),rgba(12,7,8,0.86))]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-1 grid h-10 w-10 place-items-center rounded-xl border border-[#dcc7aa]/80 bg-white/70 text-[#5b1724] lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
            aria-label="Open sidebar"
          >
            <span className="text-lg">☰</span>
          </button>

          {/* <button
            type="button"
            onClick={onToggleSidebar}
            className="mt-1 hidden h-10 rounded-xl border border-[#dcc7aa]/80 bg-white/70 px-3 text-xs font-semibold text-[#5b1724] lg:block dark:border-white/10 dark:bg-white/5 dark:text-[#f8edd7]"
          >
            {sidebarCollapsed ? "Expand" : "Compact"}
          </button> */}

          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#9f3144] dark:text-[#D4AF37]">
            Samagran Admin Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#2f1618] dark:text-[#f9f0de]">
            Ritual commerce command center
          </h1>
          <p className="mt-1 text-sm text-[#7c5b4b] dark:text-[#dbcdb8]/70">
            Premium operations, bookings, analytics and fulfillment.
          </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-3 rounded-full border border-[#dfc9a3]/60 bg-[linear-gradient(135deg,rgba(255,250,241,0.92),rgba(246,232,206,0.88))] px-2 py-2 pr-4 text-left shadow-[0_14px_40px_rgba(90,26,38,0.12)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(90,26,38,0.18)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(59,13,20,0.88),rgba(17,9,11,0.94))]"
            >
              <div className="h-11 w-11 rounded-full bg-[linear-gradient(135deg,#D4AF37,#8B1E3F)] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#53202a,#2a0c12)] text-sm font-bold text-[#f7e7bf]">
                  {adminInitials}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#33161c] dark:text-[#f9f0de]">{adminName}</p>
                <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Admin account</p>
              </div>
              <span className="text-[#8B1E3F] dark:text-[#D4AF37]">
                <ChevronIcon />
              </span>
            </button>

            {profileOpen && (
  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-3xl border border-[#e4cfaa]/70 bg-[linear-gradient(180deg,rgba(255,249,240,0.98),rgba(246,234,211,0.96))] p-2 shadow-[0_22px_70px_rgba(59,13,20,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.98),rgba(16,8,9,0.98))]">

    <button className="flex w-full flex-col items-start rounded-2xl px-4 py-3 text-sm font-medium text-[#472128] dark:text-[#f3e7cd]">
      <span>{adminName}</span>
      <span className="mt-1 text-xs font-normal text-[#7c5b4b] dark:text-[#dbcdb8]/70">
        {admin?.email || "Admin profile"}
      </span>
    </button>

    <button className="flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-[#472128] dark:text-[#f3e7cd]">
      Account Settings
    </button>

    <button
      onClick={handleLogout}
      className="flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-red-500"
    >
      Sign out
    </button>

  </div>
)}
          </div>
        </div>
      </div>
    </div>
  );
}
