import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiSearch, FiSend, FiX } from "react-icons/fi";

const EMPTY_FORM = {
  target: "all-users",
  userId: "",
  title: "",
  body: "",
  data: "{}",
};

export default function Notifications() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  useEffect(() => {
    fetchUsers(userSearch);
  }, [fetchUsers, userSearch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const summary = useMemo(() => {
    return {
      total: history.length,
      sent: history.filter((entry) => entry.status === "sent").length,
      partial: history.filter((entry) => entry.status === "partial").length,
    };
  }, [history]);

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

    let parsedData = {};
    if (form.data.trim()) {
      try {
        parsedData = JSON.parse(form.data);
      } catch {
        setError("Data must be valid JSON.");
        return;
      }
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
        data: parsedData,
      });

      setSuccess("Notification sent successfully.");
      setForm(EMPTY_FORM);
      setSelectedUser(null);
      await fetchHistory();
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
        <form onSubmit={handleSubmit} className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Composer</p>
              <h3 className="mt-2 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Broadcast to users</h3>
            </div>
            <button type="submit" disabled={sending} className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60">
              <FiSend />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
              Target
              <select name="target" value={form.target} onChange={handleChange} className="h-11 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 outline-none">
                <option value="all-users">All users</option>
                <option value="user">Single user</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
              Title
              <input name="title" value={form.title} onChange={handleChange} className="h-11 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 outline-none" placeholder="Notification title" />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
              Message
              <textarea name="body" value={form.body} onChange={handleChange} rows={4} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-3 outline-none" placeholder="Notification body" />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--admin-text)]">
              Custom data JSON
              <textarea name="data" value={form.data} onChange={handleChange} rows={4} className="font-mono rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-3 text-sm outline-none" />
            </label>

            {form.target === "user" && (
              <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2">
                  <FiSearch className="text-[var(--admin-primary)]" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search users by name, phone, email"
                    className="h-10 w-full bg-transparent text-sm outline-none"
                  />
                  {userSearch && (
                    <button type="button" onClick={() => setUserSearch("")} className="grid h-8 w-8 place-items-center rounded-md bg-[var(--admin-surface-soft)]">
                      <FiX />
                    </button>
                  )}
                </div>

                {selectedUser && (
                  <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Selected: {selectedUser.name || selectedUser.phone || selectedUser.email}
                  </div>
                )}

                {loadingUsers ? (
                  <p className="text-sm text-[var(--admin-muted)]">Loading users...</p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {users.length ? users.map((user) => (
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
                        <div className="text-sm font-semibold text-[var(--admin-text)]">{user.name || "Unnamed user"}</div>
                        <div className="text-xs text-[var(--admin-muted)]">{user.phone || user.email || user._id}</div>
                      </button>
                    )) : (
                      <p className="text-sm text-[var(--admin-muted)]">No users found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">History</p>
              <h3 className="mt-2 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Recent sends</h3>
            </div>
          </div>

          {loadingHistory ? (
            <p className="rounded-2xl bg-[var(--admin-surface-soft)] p-4 text-sm">Loading history...</p>
          ) : history.length ? (
            <div className="space-y-3">
              {history.map((entry) => (
                <article key={entry._id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-[var(--admin-text)]">{entry.title}</h4>
                      <p className="mt-1 text-sm text-[var(--admin-muted)]">{entry.body}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white" style={{ background: entry.status === "sent" ? "#18b887" : entry.status === "partial" ? "#ca1755" : "#b48312" }}>
                      {entry.status}
                    </span>
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
            <p className="rounded-2xl bg-[var(--admin-surface-soft)] p-4 text-sm text-[var(--admin-muted)]">No notifications have been sent yet.</p>
          )}
        </section>
      </section>
    </div>
  );
}