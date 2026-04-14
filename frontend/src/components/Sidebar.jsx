import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { clearAdminSession } from "../utils/auth";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: "grid" },
  { label: "Users", path: "/dashboard/users", icon: "users" },
  { label: "Orders", path: "/dashboard/orders", icon: "orders" },
  { label: "Products", path: "/dashboard/items", icon: "box" },
  { label: "Special Kit", path: "/dashboard/special-kit", icon: "gift" },
  { label: "User Custom Kit", path: "/dashboard/user-kits", icon: "custom-kit" },
  { label: "Add Pandit", path: "/dashboard/add-pandit", icon: "spark" },
  { label: "Settings", path: "/dashboard/settings", icon: "settings" },
];

const menuClass = (isActive) =>
  `group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium tracking-[0.02em] transition-all duration-300 ${
    isActive
      ? "scale-[1.02] border-[#D4AF37]/45 bg-[linear-gradient(135deg,#5f1828_0%,#3B0D14_55%,#D4AF37_140%)] text-[#f8edd7] shadow-[0_16px_40px_rgba(59,13,20,0.32),0_0_22px_rgba(212,175,55,0.18)]"
      : "border-transparent text-[#6b4b42] hover:scale-[1.01] hover:border-[#D4AF37]/20 hover:bg-[#8B1E3F]/8 hover:text-[#5b1724] dark:text-[#ecd9bb]/72 dark:hover:border-[#D4AF37]/15 dark:hover:bg-white/5 dark:hover:text-[#f8edd7]"
  }`;

const iconClass = (isActive) =>
  `flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
    isActive
      ? "bg-[#D4AF37]/16 text-[#f5d98f] shadow-[0_0_24px_rgba(212,175,55,0.18)] ring-1 ring-[#D4AF37]/18"
      : "bg-[#8B1E3F]/8 text-[#8B1E3F] group-hover:bg-[#8B1E3F]/14 group-hover:text-[#5f1828] dark:bg-white/5 dark:text-[#D4AF37] dark:group-hover:bg-[#D4AF37]/12"
  }`;

function SidebarIcon({ icon }) {
  const common = "h-5 w-5";

  if (icon === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M16 19C16 16.7909 14.2091 15 12 15H8C5.79086 15 4 16.7909 4 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 11C12.2091 11 14 9.20914 14 7C14 4.79086 12.2091 3 10 3C7.79086 3 6 4.79086 6 7C6 9.20914 7.79086 11 10 11Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M18 8C19.6569 8 21 9.34315 21 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  if (icon === "plus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 7V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
        <path d="M8.5 9C7.11929 9 6 7.88071 6 6.5C6 5.11929 7.11929 4 8.5 4C10.9853 4 12 9 12 9C12 9 13.0147 4 15.5 4C16.8807 4 18 5.11929 18 6.5C18 7.88071 16.8807 9 15.5 9H8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
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

  if (icon === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "settings") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14 20.85V21A2 2 0 1 1 10 21V20.91A1.65 1.65 0 0 0 8.91 19.38A1.65 1.65 0 0 0 7.09 19.71L7.03 19.77A2 2 0 1 1 4.2 16.94L4.26 16.88A1.65 1.65 0 0 0 4.59 15.06A1.65 1.65 0 0 0 3.06 14H3A2 2 0 1 1 3 10H3.09A1.65 1.65 0 0 0 4.62 8.91A1.65 1.65 0 0 0 4.29 7.09L4.23 7.03A2 2 0 1 1 7.06 4.2L7.12 4.26A1.65 1.65 0 0 0 8.94 4.59H9A1.65 1.65 0 0 0 10 3.06V3A2 2 0 1 1 14 3V3.09A1.65 1.65 0 0 0 15.09 4.62A1.65 1.65 0 0 0 16.91 4.29L16.97 4.23A2 2 0 1 1 19.8 7.06L19.74 7.12A1.65 1.65 0 0 0 19.41 8.94V9C19.76 9.67 20 10.42 20 11.22V12.78C20 13.58 19.76 14.33 19.4 15Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "logout") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M14 7L19 12L14 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 12H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 4H7C5.89543 4 5 4.89543 5 6V18C5 19.1046 5.89543 20 7 20H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export default function Sidebar() {
  const navigate = useNavigate();

const handleLogout = () => {
  clearAdminSession();
  navigate("/", { replace: true });
};
  return (
    <aside className="sidebar-scroll hidden h-screen w-72 flex-col overflow-y-auto border-r border-[#dcc7ab]/65 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.12),_transparent_28%),linear-gradient(180deg,#fbf4e8_0%,#f4ead8_100%)] p-5 text-[#3f2026] shadow-[0_25px_90px_rgba(59,13,20,0.08)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.14),_transparent_30%),linear-gradient(180deg,#1e090f_0%,#130609_48%,#090405_100%)] dark:text-[#f7ecda] lg:flex">
      <div className="mb-8 rounded-[30px] border border-[#dfcfb4]/70 bg-[linear-gradient(180deg,rgba(255,250,243,0.85),rgba(247,234,208,0.78))] p-6 backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.68),rgba(18,8,10,0.8))]">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#4a1420,#2a0c12)] p-3 shadow-[0_18px_40px_rgba(59,13,20,0.24)] ring-1 ring-[#D4AF37]/35">
            <img src="/logo.jpeg" alt="Samagran" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-sm font-semibold tracking-[0.45em] text-[#8B1E3F] dark:text-[#D4AF37]">SAMAGRAN</h1>
          {/* <p className="mt-2 text-center text-xs leading-5 text-[#7a5a49] dark:text-[#f3dfbf]/62">
            Manage orders, inventory, pandits, kits and customer flows.
          </p> */}
        </div>
      </div>

      <nav className="space-y-2 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => menuClass(isActive)}
          >
            {({ isActive }) => (
              <>
                <span className={iconClass(isActive)}>
                  <SidebarIcon icon={item.icon} />
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <button
  type="button"
  onClick={handleLogout}
  className="group flex w-full items-center gap-3 rounded-2xl border border-[#D4AF37]/28 bg-[linear-gradient(145deg,rgba(212,175,55,0.10),rgba(139,30,63,0.08))] px-4 py-3 text-sm font-medium text-[#5b1724] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_14px_30px_rgba(59,13,20,0.16)] dark:border-[#D4AF37]/20 dark:bg-[linear-gradient(145deg,rgba(212,175,55,0.10),rgba(59,13,20,0.26))] dark:text-[#f8edd7]"
>
  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-white/5 dark:text-[#D4AF37]">
    <SidebarIcon icon="logout" />
  </span>

  <span>Logout</span>
</button>
      </div>
    </aside>
  );
}
