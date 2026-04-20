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
    <div className="sticky top-0 z-20 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]/95 px-4 py-3 backdrop-blur-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-1 grid h-10 w-10 place-items-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] text-[var(--admin-primary)] lg:hidden"
            aria-label="Open sidebar"
          >
            <span className="text-lg">☰</span>
          </button>

          {/* <button
            type="button"
            onClick={onToggleSidebar}
            className="mt-1 hidden h-10 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 text-xs font-semibold text-[var(--admin-primary)] lg:block"
          >
            {sidebarCollapsed ? "Expand" : "Compact"}
          </button> */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--admin-primary)]">
              Admin Panel
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--admin-text)]">
              Samagran Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Manage orders, users, pandits, kits and rituals from one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-3 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-2 py-2 pr-4 text-left shadow-sm transition duration-300 hover:shadow-md"
            >
              <div className="h-11 w-11 rounded-full bg-[linear-gradient(135deg,var(--admin-primary),var(--admin-primary-strong))] p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--admin-surface)] text-sm font-bold text-[var(--admin-primary)]">
                  {adminInitials}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--admin-text)]">{adminName}</p>
                <p className="text-xs text-[var(--admin-muted)]">Admin account</p>
              </div>
              <span className="text-[var(--admin-primary)]">
                <ChevronIcon />
              </span>
            </button>

            {profileOpen && (
  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-2 shadow-[var(--admin-shadow)]">

    <button className="flex w-full flex-col items-start rounded-xl px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
      <span>{adminName}</span>
      <span className="mt-1 text-xs font-normal text-[var(--admin-muted)]">
        {admin?.email || "Admin profile"}
      </span>
    </button>

    <button className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
      Account Settings
    </button>

    <button
      onClick={handleLogout}
      className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-[var(--admin-primary)]"
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
