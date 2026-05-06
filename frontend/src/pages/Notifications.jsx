import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { getStoredAdmin } from "../utils/auth";
import { FiCheck, FiSearch, FiSend, FiTrash2, FiX } from "react-icons/fi";

const EMPTY_FORM = {
  target: "all-users",
  userId: "",
  title: "",
  body: "",
};

export default function Notifications() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState("week");
  const [inbox, setInbox] = useState([]);
  const [inboxStatus, setInboxStatus] = useState("all");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const adminId = getStoredAdmin()?._id || "";

  const fetchUsers = useCallback(async (search = "") => {
    try {
      setLoadingUsers(true);
      const res = await API.get("/admin/user/all", {
        params: search.trim() ? { search: search.trim() } : {},
      });
      setUsers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await API.get("/admin/notifications");
      setHistory(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load notification history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchInbox = useCallback(async (status = "all") => {
    try {
      setLoadingInbox(true);
      const res = await API.get("/admin/notifications/inbox", {
        params: { status },
      });
      setInbox(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load admin notifications.");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(userSearch);
  }, [fetchUsers, userSearch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchInbox(inboxStatus);
  }, [fetchInbox, inboxStatus]);

  const summary = useMemo(() => {
    return {
      total: history.length,
      sent: history.filter((entry) => entry.status === "sent").length,
      partial: history.filter((entry) => entry.status === "partial").length,
    };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const rangeDays = {
      day: 1,
      week: 7,
      month: 30,
      all: 0,
    };
    const days = rangeDays[historyRange] ?? 7;
    const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

    return history.filter((entry) => {
      if (adminId && Array.isArray(entry.deletedBy)) {
        const isHidden = entry.deletedBy.some((id) => String(id) === String(adminId));
        if (isHidden) {
          return false;
        }
      }

      if (!startDate) {
        return true;
      }

      if (!entry.createdAt) {
        return false;
      }

      return new Date(entry.createdAt) >= startDate;
    });
  }, [adminId, history, historyRange]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setForm((current) => ({
      ...current,
      target: "user",
      userId: user?._id || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and body are required.");
      return;
    }

    if (form.target === "user" && !form.userId.trim()) {
      setError("Please select a user first.");
      return;
    }

    try {
      setSending(true);
      setError("");
      setSuccess("");

      await API.post("/admin/notifications/send", {
        target: form.target,
        userIds: form.target === "user" ? [form.userId.trim()] : [],
        title: form.title.trim(),
        body: form.body.trim(),
      });

      setSuccess("Notification sent successfully.");
      setForm(EMPTY_FORM);
      setSelectedUser(null);
      await fetchHistory();
      await fetchInbox(inboxStatus);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Notifications</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Send push messages</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Sent {summary.sent}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">Partial {summary.partial}</span>
        </div>
      </section>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          }`}
        >
          {error || success}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Composer</p>
                <h3 className="mt-2 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Broadcast to users</h3>
              </div>
              <button
                type="submit"
                disabled={sending}
                className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
              >
                <FiSend />
                {sending ? "Sending..." : "Send"}
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
                Target
                <select
                  name="target"
                  value={form.target}
                  onChange={handleChange}
                  className="h-11 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 outline-none"
                >
                  <option value="all-users">All users</option>
                  <option value="user">Single user</option>
                </select>
              </label>

              {form.target === "user" && (
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--admin-primary)]">Find user</p>
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2">
                      <FiSearch className="text-[var(--admin-primary)]" />
                      <input
                        type="search"
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder="Search by name or email"
                        className="h-10 w-full bg-transparent text-sm outline-none"
                      />
                      {userSearch && (
                        <button
                          type="button"
                          onClick={() => setUserSearch("")}
                          className="grid h-8 w-8 place-items-center rounded-md bg-[var(--admin-surface-soft)]"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedUser && (
                    <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      Selected: {selectedUser.name || selectedUser.phone || selectedUser.email}
                    </div>
                  )}

                  {loadingUsers ? (
                    <p className="text-sm text-[var(--admin-muted)]">Loading users...</p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {users.length ? (
                        users.map((user) => (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => handleUserSelect(user)}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                              selectedUser?._id === user._id
                                ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/10"
                                : "border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-soft)]"
                            }`}
                          >
                            <div className="text-sm font-semibold text-[var(--admin-text)]">
                              {user.name || "Unnamed user"}
                            </div>
                            <div className="text-xs text-[var(--admin-muted)]">
                              {user.email || user.phone || user._id}
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--admin-muted)]">No users found.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
                Title
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="h-11 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 outline-none"
                  placeholder="Notification title"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
                Message
                <textarea
                  name="body"
                  value={form.body}
                  onChange={handleChange}
                  rows={4}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-3 outline-none"
                  placeholder="Notification body"
                />
              </label>
            </div>
          </form>

          <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">History</p>
                <h3 className="mt-2 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Recent sends</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["day", "week", "month"]).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setHistoryRange(range)}
                    className={`h-9 rounded-xl border px-3 text-xs font-semibold uppercase tracking-[0.16em] ${
                      historyRange === range
                        ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/15 text-[var(--admin-primary)]"
                        : "border-[var(--admin-border)] bg-[var(--admin-surface-soft)] text-[var(--admin-muted)]"
                    }`}
                  >
                    {range}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={async () => {
                    await API.delete("/admin/notifications/clear");
                    await fetchHistory();
                    await fetchInbox(inboxStatus);
                  }}
                  className="h-9 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 text-xs font-semibold text-[var(--admin-primary)]"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="mt-4">
              {loadingHistory ? (
                <p className="rounded-2xl bg-[var(--admin-surface-soft)] p-4 text-sm">Loading history...</p>
              ) : filteredHistory.length ? (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {filteredHistory.map((entry) => (
                    <article key={entry._id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-[var(--admin-text)]">{entry.title}</h4>
                          <p className="mt-1 text-sm text-[var(--admin-muted)]">{entry.body}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white"
                            style={{
                              background:
                                entry.status === "sent"
                                  ? "#18b887"
                                  : entry.status === "partial"
                                    ? "#ca1755"
                                    : "#b48312",
                            }}
                          >
                            {entry.status}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await API.delete(`/admin/notifications/${entry._id}`);
                              await fetchHistory();
                              await fetchInbox(inboxStatus);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-full border border-red-200 text-red-600"
                            aria-label="Delete"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--admin-muted)]">
                        <span>Sent {entry.sentCount || 0}</span>
                        <span>Failed {entry.failedCount || 0}</span>
                        <span>{entry.createdBy?.name || entry.createdBy?.email || "Admin"}</span>
                        <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-[var(--admin-surface-soft)] p-4 text-sm text-[var(--admin-muted)]">
                  No notifications have been sent yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Inbox</p>
                <h3 className="mt-2 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Admin notifications</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={inboxStatus}
                  onChange={(event) => setInboxStatus(event.target.value)}
                  className="h-10 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 text-sm outline-none"
                >
                  <option value="all">All</option>
                  <option value="unread">Unseen</option>
                  <option value="read">Seen</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    await API.delete("/admin/notifications/clear");
                    fetchInbox(inboxStatus);
                    fetchHistory();
                  }}
                  className="h-10 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 text-sm font-semibold text-[var(--admin-primary)]"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="mt-4">
              {loadingInbox ? (
                <p className="rounded-2xl bg-[var(--admin-surface-soft)] p-4 text-sm">Loading notifications...</p>
              ) : inbox.length ? (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {inbox.map((entry) => (
                    <article key={entry._id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-[var(--admin-text)]">{entry.title}</h4>
                          <p className="mt-1 text-sm text-[var(--admin-muted)]">{entry.body}</p>
                          <p className="mt-2 text-xs text-[var(--admin-muted)]">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!entry.isRead && (
                            <button
                              type="button"
                              onClick={async () => {
                                await API.patch(`/admin/notifications/${entry._id}/read`);
                                setInbox((current) =>
                                  current.map((item) =>
                                    item._id === entry._id ? { ...item, isRead: true } : item
                                  )
                                );
                                fetchInbox(inboxStatus);
                              }}
                              className="grid h-9 w-9 place-items-center rounded-full border border-emerald-200 text-emerald-600"
                              aria-label="Mark as read"
                            >
                              <FiCheck />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              await API.delete(`/admin/notifications/${entry._id}`);
                              setInbox((current) => current.filter((item) => item._id !== entry._id));
                              fetchInbox(inboxStatus);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-full border border-red-200 text-red-600"
                            aria-label="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-[var(--admin-surface-soft)] p-4 text-sm text-[var(--admin-muted)]">No notifications found.</p>
              )}
            </div>
          </section>
        </div>
      </section>


    </div>
  );
}