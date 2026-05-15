import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiMoreVertical, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const initialForm = {
  fullName: "",
  phone: "",
  status: "active",
  notes: "",
};

const statusBadgeClass = (status = "") => {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

export default function DeliveryBoys() {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pagedDeliveryBoys = useMemo(() => {
    const start = (page - 1) * pageSize;
    return deliveryBoys.slice(start, start + pageSize);
  }, [deliveryBoys, page, pageSize]);

  const summary = useMemo(() => {
    const active = deliveryBoys.filter((entry) => entry.status === "active").length;
    const inactive = deliveryBoys.filter((entry) => entry.status === "inactive").length;
    return {
      total: deliveryBoys.length,
      active,
      inactive,
    };
  }, [deliveryBoys]);

  const fetchDeliveryBoys = useCallback(async (searchValue = "", statusValue = "all") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/admin/delivery-boys", {
        params: {
          ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
          status: statusValue,
        },
      });

      setDeliveryBoys(res.data?.data?.deliveryBoys || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load delivery boys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeliveryBoys(searchTerm, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchDeliveryBoys, searchTerm, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [deliveryBoys.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-delivery-menu], [data-table-menu-popover]")) {
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
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (deliveryBoy) => {
    setForm({
      fullName: deliveryBoy?.fullName || "",
      phone: deliveryBoy?.phone || "",
      status: deliveryBoy?.status || "active",
      notes: deliveryBoy?.notes || "",
    });
    setEditingId(deliveryBoy?._id || "");
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      setSuccess("");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editingId) {
        await API.put(`/admin/delivery-boys/${editingId}`, payload);
      } else {
        await API.post("/admin/delivery-boys", payload);
      }

      await fetchDeliveryBoys(searchTerm, statusFilter);
      setSuccess(editingId ? "Delivery boy updated successfully." : "Delivery boy created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save delivery boy.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deliveryBoy) => {
    if (!deliveryBoy?._id) return;
    if (!window.confirm(`Delete ${deliveryBoy.fullName || "this delivery boy"}?`)) return;

    try {
      setDeletingId(deliveryBoy._id);
      setError("");
      setSuccess("");

      await API.delete(`/admin/delivery-boys/${deliveryBoy._id}`);
      setDeliveryBoys((current) => current.filter((entry) => entry._id !== deliveryBoy._id));
      setSuccess("Delivery boy deleted successfully.");
      if (editingId === deliveryBoy._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete delivery boy.");
    } finally {
      setDeletingId("");
    }
  };

  const toggleSelection = (deliveryBoyId, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(deliveryBoyId) ? current : [...current, deliveryBoyId];
      }
      return current.filter((id) => id !== deliveryBoyId);
    });
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(deliveryBoys.map((entry) => entry._id));
      return;
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected delivery boys?`)) return;

    try {
      setDeletingId("bulk");
      await Promise.all(selectedIds.map((id) => API.delete(`/admin/delivery-boys/${id}`)));
      setDeliveryBoys((current) => current.filter((entry) => !selectedIds.includes(entry._id)));
      setSelectedIds([]);
      setSuccess("Selected delivery boys deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected delivery boys.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Delivery</p>
            <h2 className="mt-2 text-2xl font-bold">Delivery boys management</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Add delivery boys, manage status, and keep contact details updated.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow"
          >
            <FiPlus className="h-4 w-4" />
            Add Delivery Boy
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Active {summary.active}</span>
          <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200">Inactive {summary.inactive}</span>
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
            <h3 className="text-lg font-bold">{editingId ? "Edit Delivery Boy" : "Add Delivery Boy"}</h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
              aria-label="Close delivery boy form"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Full name"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 digit phone"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                rows={4}
                value={form.notes}
                onChange={handleChange}
                placeholder="Notes (optional)"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Delivery Boy"}
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

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-xl font-bold">All Delivery Boys</h3>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="text-[var(--admin-primary)]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or phone"
                className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading delivery boys...</p>
        ) : !deliveryBoys.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm || statusFilter !== "all" ? "No delivery boys match current filters." : "No delivery boys found."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">{selectedIds.length} selected</span>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={!selectedIds.length || deletingId === "bulk"}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              >
                Delete Selected
              </button>
            </div>

            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-4 py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={deliveryBoys.length > 0 && selectedIds.length === deliveryBoys.length}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">S.No</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDeliveryBoys.map((deliveryBoy, index) => (
                    <tr key={deliveryBoy._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(deliveryBoy._id)}
                          onChange={(event) => toggleSelection(deliveryBoy._id, event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                        {deliveryBoy.fullName || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">{deliveryBoy.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(deliveryBoy.status)}`}>
                          {deliveryBoy.status || "inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{formatDateTime(deliveryBoy.lastLoginAt)}</td>
                      <td className="px-4 py-3 text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                        {deliveryBoy.notes || "-"}
                      </td>
                      <td className="px-4 py-3 text-right" data-delivery-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId = openMenuId === deliveryBoy._id ? "" : deliveryBoy._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === deliveryBoy._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedDeliveryBoys.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(deliveryBoy);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDelete(deliveryBoy);
                                }}
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
              total={deliveryBoys.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[10]}
            />
          </div>
        )}
      </section>
    </div>
  );
}
