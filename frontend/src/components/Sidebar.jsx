import { NavLink, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminPageAccess, getAdminRole } from "../utils/auth";

const navSections = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: "dashboard", accessKey: "dashboard" },
    ],
  },
  {
    heading: "Commerce",
    items: [
      { label: "Orders", path: "/dashboard/orders", icon: "orders", accessKey: "orders" },
      { label: "Invoices", path: "/dashboard/invoices", icon: "invoice", accessKey: "orders" },
      { label: "Users", path: "/dashboard/users", icon: "users", accessKey: "users" },
      { label: "Delivery Boys", path: "/dashboard/delivery-boys", icon: "delivery", accessKey: "delivery-boys" },
      { label: "Delivery Charges", path: "/dashboard/delivery-charges", icon: "delivery", accessKey: "delivery-charges" },
      {
        label: "Vendors",
        path: "/dashboard/vendors",
        icon: "vendors",
        accessKey: "vendors",
        role: "super-admin",
      },
    ],
  },
  {
    heading: "Catalog",
    items: [
      { label: "Products", path: "/dashboard/items", icon: "box", accessKey: "products" },
      { label: "Category", path: "/dashboard/category", icon: "box", accessKey: "category" },
      { label: "Brands", path: "/dashboard/brands", icon: "box", accessKey: "brands" },
      { label: "Kits", path: "/dashboard/kits", icon: "gift", accessKey: "kits" },
      { label: "Rituals", path: "/dashboard/rituals", icon: "rituals", accessKey: "rituals" },
      { label: "Temples", path: "/dashboard/temples", icon: "temples", accessKey: "temples" },
      { label: "Custom Samagri", path: "/dashboard/custom-samagri", icon: "custom-samagri", accessKey: "custom-samagri", role: "super-admin" },
    ],
  },
  {
    heading: "Pandits",
    items: [
      { label: "Pandits", path: "/dashboard/pandits", icon: "pandits", accessKey: "pandits" },
      { label: "Pandit Bookings", path: "/dashboard/pandit-bookings", icon: "pandit-bookings", accessKey: "pandit-bookings" },
      { label: "Pandit Earnings", path: "/dashboard/pandit-earnings", icon: "earnings", accessKey: "pandit-bookings" },
      { label: "Pandit Payouts", path: "/dashboard/pandit-payouts", icon: "withdrawals", accessKey: "pandit-bookings" },
      {
        label: "Booking Pricing",
        path: "/dashboard/booking-pricing",
        icon: "pricing",
        accessKey: "booking-pricing",
        role: "super-admin",
      },
    ],
  },
  {
    heading: "Marketing",
    items: [
      { label: "Banners", path: "/dashboard/banners", icon: "banners", accessKey: "banners" },
      { label: "Coupons", path: "/dashboard/coupons", icon: "coupons", accessKey: "coupons" },
      { label: "Offers", path: "/dashboard/offers", icon: "offers", accessKey: "offers" },
      { label: "Notifications", path: "/dashboard/notifications", icon: "notifications", accessKey: "notifications" },
      { label: "Legal Pages", path: "/dashboard/legal", icon: "legal", accessKey: "legal" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { label: "Transactions", path: "/dashboard/transactions", icon: "transactions", accessKey: "transactions" },
      { label: "Earnings", path: "/dashboard/earnings", icon: "earnings", accessKey: "earnings" },
      { label: "Withdrawals", path: "/dashboard/withdrawals", icon: "withdrawals", accessKey: "withdrawals" },
      { label: "Vendor Commission", path: "/dashboard/vendor-commission", icon: "pricing", accessKey: "vendor-commission", role: "super-admin" },
      { label: "Refunds & Returns", path: "/dashboard/refunds", icon: "refunds", accessKey: "refunds" },
    ],
  },
  {
    heading: "Commission",
    items: [
      {
        label: "Category Commission",
        path: "/dashboard/category-commission",
        icon: "pricing",
        accessKey: "category-commission",
        role: "super-admin",
      },
    ],
  },
  {
    heading: "Settings",
    items: [
      { label: "Settings", path: "/dashboard/settings", icon: "settings", accessKey: "settings", vendorOnly: true },
      { label: "Company Settings", path: "/dashboard/super-settings", icon: "settings", accessKey: "settings", role: "super-admin" },
    ],
  },
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

  if (icon === "invoice") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M9 12H15M9 8H15M9 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "vendors") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M7 11C8.65685 11 10 9.65685 10 8C10 6.34315 8.65685 5 7 5C5.34315 5 4 6.34315 4 8C4 9.65685 5.34315 11 7 11Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M17 11C18.6569 11 20 9.65685 20 8C20 6.34315 18.6569 5 17 5C15.3431 5 14 6.34315 14 8C14 9.65685 15.3431 11 17 11Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 13C4.79086 13 3 14.7909 3 17V19H11V17C11 14.7909 9.20914 13 7 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 13C14.7909 13 13 14.7909 13 17V19H21V17C21 14.7909 19.2091 13 17 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "delivery") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M4 7H14V17H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 10H18L20 13V17H14V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="8" cy="18" r="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.8" />
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

  if (icon === "pricing") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M7 7H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 17H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
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

  if (icon === "coupons") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 10H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 14H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 12H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "offers") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 2L15.09 8.26H21.77L16.84 12.45L18.93 18.71L12 14.52L5.07 18.71L7.16 12.45L2.23 8.26H8.91L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "legal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M6 4V20C6 21.1 6.9 22 8 22H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 7H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 11H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 15H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "custom-samagri") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 2L22 7V17L12 22L2 17V7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 12L2 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 12L22 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "notifications") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M14 18H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 4C9.23858 4 7 6.23858 7 9V12.5L5.5 15H18.5L17 12.5V9C17 6.23858 14.7614 4 12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 18C9 19.6569 10.3431 21 12 21C13.6569 21 15 19.6569 15 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "settings") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19 12C19 11.5 18.94 11.02 18.83 10.56L20.55 9.25L19.05 6.75L17.05 7.55C16.67 7.22 16.25 6.94 15.78 6.72L15.5 4.5H8.5L8.22 6.72C7.75 6.94 7.33 7.22 6.95 7.55L4.95 6.75L3.45 9.25L5.17 10.56C5.06 11.02 5 11.5 5 12C5 12.5 5.06 12.98 5.17 13.44L3.45 14.75L4.95 17.25L6.95 16.45C7.33 16.78 7.75 17.06 8.22 17.28L8.5 19.5H15.5L15.78 17.28C16.25 17.06 16.67 16.78 17.05 16.45L19.05 17.25L20.55 14.75L18.83 13.44C18.94 12.98 19 12.5 19 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
  const adminRole = getAdminRole();
  const pageAccess = getAdminPageAccess();

  const canAccess = (item) => {
    if (adminRole === "super-admin") {
      return !item.vendorOnly;
    }
    if (adminRole === "vendor-admin") {
      if (item.role === "super-admin") {
        return false;
      }
      return pageAccess.includes(item.accessKey);
    }
    return false;
  };

  const filteredNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(canAccess),
    }))
    .filter((section) => section.items.length > 0);

  const menuClass = (isActive) =>
    `group flex items-center rounded-lg border px-3 py-0 text-sm font-medium transition-all ${
      collapsed ? "justify-center" : "gap-1"
    } ${
      isActive
        ? "border-transparent bg-[linear-gradient(180deg,var(--admin-primary),var(--admin-primary-strong))] text-white shadow"
        : "border-transparent text-[var(--admin-text)] hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)]"
    }`;

  const wrapperClass = `${
    mobileOpen ? "translate-x-0" : "-translate-x-full"
  } lg:translate-x-0 sidebar-scroll fixed inset-y-0 left-0 z-40 flex h-screen flex-col overflow-y-auto border-r border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-[var(--admin-text)] shadow-[var(--admin-shadow)] transition-all duration-300 ${collapsed ? "w-[6.5rem]" : "w-[12.5rem]"}`;

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

      <aside className={wrapperClass} >
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

        <nav className="space-y-4 text-sm">
          {filteredNavSections.map((section) => (
            <div key={section.heading} className="space-y-2">
              {!collapsed && (
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--admin-text-muted)]">
                  {section.heading}
                </p>
              )}
              {section.items.map((item) => (
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
            </div>
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
