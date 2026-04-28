import { NavLink, useNavigate } from "react-router-dom";
import { clearAdminSession } from "../utils/auth";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: "grid" },
  { label: "Users", path: "/dashboard/users", icon: "users" },
  { label: "Orders", path: "/dashboard/orders", icon: "orders" },
  { label: "Products", path: "/dashboard/items", icon: "box" },
  { label: "Kits", path: "/dashboard/kits", icon: "gift" },
  { label: "Pandits", path: "/dashboard/pandits", icon: "pandits" },
  { label: "Rituals", path: "/dashboard/rituals", icon: "rituals" },
  { label: "Temples", path: "/dashboard/temples", icon: "temples" },
  { label: "Pandit Bookings", path: "/dashboard/pandit-bookings", icon: "pandit-bookings" },
  { label: "Banners", path: "/dashboard/Banners", icon: "Banners" },
];

function SidebarIcon({ icon }) {
  const common = "h-5 w-5";

  if (icon === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M16 19C16 16.7909 14.2091 15 12 15H8C5.79086 15 4 16.7909 4 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 11C12.2091 11 14 9.20914 14 7C14 4.79086 12.2091 3 10 3C7.79086 3 6 4.79086 6 7C6 9.20914 7.79086 11 10 11Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "orders") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M7 8H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 16H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "box") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 12L20 8L12 4L4 8L12 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M4 8V16L12 20L20 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "gift") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="4" y="9" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9V20" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 13H20" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "custom-kit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 4V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 8L12 12L19 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "default-kit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 11H20" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 3V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 3V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "pandits") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 4C13.6569 4 15 5.34315 15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 12H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "pandit-bookings") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 10H20" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 14H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "rituals") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 21C12 21 5 16.8 5 10.5C5 8.01 7.01 6 9.5 6C10.88 6 12.12 6.63 13 7.62C13.88 6.63 15.12 6 16.5 6C18.99 6 21 8.01 21 10.5C21 16.8 14 21 14 21H12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.5 4.5C12.5 3.67 13.17 3 14 3C14.83 3 15.5 3.67 15.5 4.5C15.5 5.33 14.83 6 14 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "temples") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M4 20H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 10L12 4L20 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={common}>
      <path d="M4 4H10V10H4V4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 4H20V10H14V4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 14H10V20H4V14Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 14H20V20H14V14Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const navigate = useNavigate();

  const menuClass = (isActive) =>
    `group flex items-center rounded-2xl border px-3 py-3 text-sm font-medium transition-all ${
      collapsed ? "justify-center" : "gap-3"
    } ${
      isActive
        ? "border-transparent bg-[linear-gradient(180deg,var(--admin-primary),var(--admin-primary-strong))] text-white shadow"
        : "border-transparent text-[var(--admin-text)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)]"
    }`;

  const wrapperClass = `${
    mobileOpen ? "translate-x-0" : "-translate-x-full"
  } lg:translate-x-0 sidebar-scroll fixed inset-y-0 left-0 z-40 flex h-screen flex-col overflow-y-auto border-r border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-[var(--admin-text)] shadow-[var(--admin-shadow)] transition-all duration-300 ${collapsed ? "w-24" : "w-72"}`;

  const handleLogout = () => {
    clearAdminSession();
    navigate("/", { replace: true });
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close sidebar"
        />
      )}

      <aside className={wrapperClass}>
        <div className="mb-6 rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-surface-soft)]">
          <div className="flex flex-col items-center">
            {!collapsed && (
              <div className="flex h-20 w-auto items-center justify-center overflow-hidden">
                <img src="/panel-logo.jpeg" alt="Samagran" className="h-full w-full object-contain" />
              </div>
            )}
            {collapsed && (
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden">
                <img src="/colaps-logo.png" alt="Samagran" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
        </div>

        <nav className="space-y-2 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => menuClass(isActive)}
            >
              <span className="flex h-10 w-10 items-center justify-center ">
                <SidebarIcon icon={item.icon} />
              </span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 pt-6">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-3 text-sm font-semibold text-[var(--admin-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              {collapsed ? (
                <>
                  <path d="M8 7L13 12L8 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 7L18 12L13 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </>
              ) : (
                <>
                  <path d="M16 7L11 12L16 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11 7L6 12L11 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="admin-btn-primary flex w-full items-center justify-center rounded-2xl border border-transparent px-3 py-3 text-sm font-medium"
          >
            {collapsed ? "Out" : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
