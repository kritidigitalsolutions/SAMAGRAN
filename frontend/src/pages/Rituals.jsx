import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiMoreVertical, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

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
  const [imageFile, setImageFile] = useState(null);
  const [selectedRitualIds, setSelectedRitualIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pagedRituals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rituals.slice(start, start + pageSize);
  }, [rituals, page, pageSize]);

  const fetchRituals = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/rituals", {
        params: { status: "all" },
      });
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

  useEffect(() => {
    setPage(1);
  }, [rituals.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        !event.target.closest("[data-ritual-menu], [data-table-menu-popover]")
      ) {
        setOpenMenuId("");
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!openMenuId) {
      setMenuAnchorRect(null);
    }
  }, [openMenuId]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
    setImageFile(null);
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
    setImageFile(null);
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

      // const payload = {
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("description", form.description.trim());
      payload.append("status", form.status);

      if (imageFile) {
        payload.append("imageFile", imageFile);
      }

      if (editingId) {
        await API.put(`/admin/rituals/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/rituals", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchRituals();
      setSuccess(
        editingId
          ? "Ritual updated successfully."
          : "Ritual created successfully.",
      );
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
      setRituals((current) =>
        current.filter((entry) => entry._id !== ritual._id),
      );
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

  const buildRitualPayload = (ritual, overrides = {}) => {
    const payload = new FormData();
    payload.append(
      "title",
      String(overrides.title ?? ritual.title ?? "").trim(),
    );
    payload.append(
      "description",
      String(overrides.description ?? ritual.description ?? "").trim(),
    );
    payload.append("status", overrides.status ?? ritual.status ?? "inactive");
    return payload;
  };

  const handleToggleRitualStatus = async (ritual) => {
    if (!ritual?._id) return;
    const nextStatus = ritual.status === "active" ? "inactive" : "active";

    try {
      const payload = buildRitualPayload(ritual, { status: nextStatus });
      await API.put(`/admin/rituals/${ritual._id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRituals((current) =>
        current.map((entry) =>
          entry._id === ritual._id ? { ...entry, status: nextStatus } : entry,
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update ritual status.",
      );
    }
  };

  const toggleRitualSelection = (ritualId, checked) => {
    setSelectedRitualIds((current) => {
      if (checked) {
        return current.includes(ritualId) ? current : [...current, ritualId];
      }
      return current.filter((id) => id !== ritualId);
    });
  };

  const toggleAllRituals = (checked) => {
    if (checked) {
      setSelectedRitualIds(rituals.map((ritual) => ritual._id));
      return;
    }
    setSelectedRitualIds([]);
  };

  const handleDeleteSelectedRituals = async () => {
    if (!selectedRitualIds.length) return;
    if (!window.confirm(`Delete ${selectedRitualIds.length} selected rituals?`))
      return;

    try {
      await Promise.all(
        selectedRitualIds.map((ritualId) =>
          API.delete(`/admin/rituals/${ritualId}`),
        ),
      );
      setRituals((current) =>
        current.filter((entry) => !selectedRitualIds.includes(entry._id)),
      );
      setSelectedRitualIds([]);
      setSuccess("Selected rituals deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete selected rituals.",
      );
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">
              Admin Rituals
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Manage rituals for pandit booking
            </h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Add ritual title and description. Active rituals will be visible
              in user app.
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
            className="admin-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold shadow"
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
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {editingId ? "Edit Ritual" : "Add New Ritual"}
            </h3>
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

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Ritual Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] || null)
                }
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#23272e] dark:text-white"
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
              className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Ritual"}
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
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                {selectedRitualIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleDeleteSelectedRituals}
                disabled={!selectedRitualIds.length}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              >
                Delete Selected
              </button>
            </div>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={
                          rituals.length > 0 &&
                          selectedRitualIds.length === rituals.length
                        }
                        onChange={(event) =>
                          toggleAllRituals(event.target.checked)
                        }
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="serial-col px-2 py-3">S.No</th>
                    <th className="px-3 py-3">Image</th>
                    <th className="px-3 py-3">Ritual Code</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRituals.map((ritual, index) => (
                    <tr
                      key={ritual._id}
                      className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10"
                    >
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRitualIds.includes(ritual._id)}
                          onChange={(event) =>
                            toggleRitualSelection(
                              ritual._id,
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="serial-col px-2 py-4 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-3 py-4 font-semibold">
                        <img
                          src={ritual.image}
                          className="rounded"
                          height={30}
                          width={80}
                          alt=""
                        />
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">
                        RITUAL-
                        {String(ritual._id || "")
                          .slice(-6)
                          .toUpperCase()}
                      </td>
                      <td className="px-3 py-4 font-semibold">
                        {ritual.title}
                      </td>
                      {/* <td className="px-3 py-4 text-[#6e4b40] dark:text-[#f7e3c0]/80">{ritual.description || "-"}</td> */}
                      <td
                        className="px-3 py-4 text-[#6e4b40] dark:text-[#f7e3c0]/80 max-w-[300px]"
                        title={ritual.description}
                      >
                        <span className="line-clamp-2">
                          {ritual.description || "-"}
                        </span>
                      </td>
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
                      <td className="px-3 py-4 text-right" data-ritual-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId =
                                openMenuId === ritual._id ? "" : ritual._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(
                                nextId
                                  ? event.currentTarget.getBoundingClientRect()
                                  : null,
                              );
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === ritual._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedRituals.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(ritual);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEye className="text-[#6f3945]" /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(ritual);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleToggleRitualStatus(ritual);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <span className="text-[#6f3945]">
                                  {ritual.status === "active"
                                    ? "Mark Inactive"
                                    : "Mark Active"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDelete(ritual);
                                }}
                                disabled={deletingId === ritual._id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-500/10"
                              >
                                <FiTrash2 className="text-red-600" /> Delete
                              </button>
                            </TableMenuPopover>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rituals.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[10]}
            />
          </>
        )}
      </section>
    </div>
  );
}
