import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { clearAdminSession, getStoredAdmin, setStoredAdmin } from "../utils/auth";
import { FiBell, FiCheck, FiTrash2 } from "react-icons/fi";

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
  const [bellOpen, setBellOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);
  const profileRef = useRef(null);

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

    const fetchBell = async () => {
      try {
        setNotifLoading(true);
        const [countRes, listRes] = await Promise.all([
          API.get("/admin/notifications/unread-count"),
          API.get("/admin/notifications/inbox", { params: { status: "unread", limit: 5 } }),
        ]);
        setUnreadCount(Number(countRes.data?.count || 0));
        setNotifications(listRes.data?.data || []);
        setNotifError("");
      } catch (error) {
        setNotifError(error.response?.data?.message || "Unable to load notifications");
      } finally {
        setNotifLoading(false);
      }
    };

    fetchAdmin();
    fetchBell();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const isVendor = admin?.role === "vendor";
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

  const markBellRead = async (id) => {
    try {
      await API.patch(`/admin/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      setNotifError(error.response?.data?.message || "Unable to update notification");
    }
  };

  const deleteBellItem = async (id) => {
    try {
      await API.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      setNotifError(error.response?.data?.message || "Unable to delete notification");
    }
  };

  const handleBellItemOpen = async (id) => {
    await markBellRead(id);
    setBellOpen(false);
    navigate("/dashboard/notifications");
  };

  const bellSummary = useMemo(() => {
    return notifications.map((item) => ({
      id: item._id,
      title: item.title || "Notification",
      body: item.body || "",
      createdAt: item.createdAt,
    }));
  }, [notifications]);

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
              {isVendor ? "Vendor Panel" : "Admin Panel"}
            </p>
            <div className="flex items-center gap-3">
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                Samagran Dashboard
              </h1>
              {/* {isVendor && (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/settings')}
                  className="ml-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--admin-primary)]"
                >
                  Open Vendor Panel
                </button>
              )} */}
            </div>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Manage orders, users, pandits, kits and rituals from one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <ThemeToggle />
          <div
            className="relative"
            ref={bellRef}
            // onMouseEnter={() => setBellOpen(true)}
            // onMouseLeave={() => setBellOpen(false)}
          >
            <button
              type="button"
              onClick={() => setBellOpen((open) => !open)}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] text-[var(--admin-primary)]"
              aria-label="Notifications"
            >
              <FiBell />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-[#ca1755] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 shadow-[var(--admin-shadow)]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--admin-text)]">Unread notifications</p>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/notifications")}
                    className="text-xs font-semibold text-[var(--admin-primary)]"
                  >
                    View all
                  </button>
                </div>

                {notifLoading ? (
                  <p className="rounded-xl bg-[var(--admin-surface-soft)] p-3 text-xs text-[var(--admin-muted)]">Loading...</p>
                ) : notifError ? (
                  <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-200">{notifError}</p>
                ) : bellSummary.length ? (
                  <div className="space-y-2">
                    {bellSummary.map((item) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleBellItemOpen(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleBellItemOpen(item.id);
                          }
                        }}
                        className="w-full cursor-pointer rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-3 text-left transition hover:border-[var(--admin-primary)]/50 hover:bg-[var(--admin-surface)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--admin-text)]">{item.title}</p>
                            {item.body && (
                              <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.body}</p>
                            )}
                            <p className="mt-2 text-[10px] text-[var(--admin-muted)]">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                markBellRead(item.id);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-full border border-emerald-200 text-emerald-600"
                              aria-label="Mark as read"
                            >
                              <FiCheck className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteBellItem(item.id);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-full border border-red-200 text-red-600"
                              aria-label="Delete"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-[var(--admin-surface-soft)] p-3 text-xs text-[var(--admin-muted)]">No new notifications.</p>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={profileRef}>
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
                <p className="text-xs text-[var(--admin-muted)]">
                  {isVendor ? "Vendor account" : "Admin account"}
                </p>
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

    {isVendor && (
      <button
        onClick={() => {
          setProfileOpen(false);
          navigate("/dashboard/settings");
        }}
        className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-[var(--admin-text)]"
      >
        Account Settings
      </button>
    )}

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
