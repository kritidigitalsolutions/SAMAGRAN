import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";

const initialForm = {
  title: "",
  description: "",
  status: "active",
};

export default function Rituals() {
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchRituals = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/rituals", { params: { status: "all" } });
      setRituals(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load rituals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRituals();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (ritual) => {
    setForm({
      title: ritual?.title || "",
      description: ritual?.description || "",
      status: ritual?.status || "active",
    });
    setEditingId(ritual?._id || "");
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Ritual title is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
      };

      if (editingId) {
        await API.put(`/admin/rituals/${editingId}`, payload);
      } else {
        await API.post("/admin/rituals", payload);
      }

      await fetchRituals();
      setSuccess(editingId ? "Ritual updated successfully." : "Ritual created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save ritual.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ritual) => {
    if (!ritual?._id) return;
    if (!window.confirm(`Delete ritual "${ritual.title}"?`)) return;
    // if (!window.confirm(`Delete ritual \"${ritual.title}\"?`)) return;

    try {
      setDeletingId(ritual._id);
      setError("");
      setSuccess("");
      await API.delete(`/admin/rituals/${ritual._id}`);
      setRituals((current) => current.filter((entry) => entry._id !== ritual._id));
      setSuccess("Ritual deleted successfully.");
      if (editingId === ritual._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete ritual.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[#dcc7ab]/60 bg-[linear-gradient(140deg,rgba(255,248,237,0.94),rgba(247,235,211,0.9))] p-6 shadow-[0_18px_45px_rgba(59,13,20,0.08)] dark:border-white/10 dark:bg-[linear-gradient(140deg,rgba(59,13,20,0.65),rgba(11,5,7,0.82))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8B1E3F] dark:text-[#D4AF37]">Admin Rituals</p>
            <h2 className="mt-2 text-2xl font-bold">Manage rituals for pandit booking</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Add ritual title and description. Active rituals will be visible in user app.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreate();
              }
            }}
            className="rounded-2xl bg-[linear-gradient(135deg,#8B1E3F,#5f1828)] px-4 py-2 text-sm font-semibold text-[#fff3dc] shadow hover:brightness-110"
          >
            {showForm ? "Hide Form" : "Create Ritual"}
          </button>
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

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">{editingId ? "Edit Ritual" : "Add New Ritual"}</h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
              aria-label="Close form"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Ritual Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Satyanarayan Pooja"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Short ritual description"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[linear-gradient(135deg,#8B1E3F,#5f1828)] px-4 py-2 text-sm font-semibold text-[#fff3dc] shadow hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Create Ritual"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="rounded-3xl border border-[#dcc7ab]/60 bg-white/75 p-5 dark:border-white/10 dark:bg-white/5">
        <h3 className="mb-4 text-lg font-bold">Ritual List</h3>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            Loading rituals...
          </div>
        ) : rituals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            No rituals added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rituals.map((ritual) => (
                  <tr key={ritual._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                    <td className="px-3 py-4 font-semibold">{ritual.title}</td>
                    <td className="px-3 py-4 text-[#6e4b40] dark:text-[#f7e3c0]/80">{ritual.description || "-"}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          ritual.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                        }`}
                      >
                        {ritual.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(ritual)}
                          className="rounded-lg border border-[#d7bf9b] p-2 text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          title="Edit"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ritual)}
                          disabled={deletingId === ritual._id}
                          className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                          title="Delete"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
