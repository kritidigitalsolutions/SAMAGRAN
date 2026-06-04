import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiMoreVertical, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const initialForm = {
  name: "",
  description: "",
  contactPhone: "",
  contactPerson: "",
  openingTime: "",
  closingTime: "",
  facilitiesText: "",
  status: "active",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    pinCode: "",
    landmark: "",
  },
};

export default function Temples() {
  const [temples, settemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [selectedTempleIds, setSelectedTempleIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const pagedTemples = useMemo(() => {
    const start = (page - 1) * pageSize;
    return temples.slice(start, start + pageSize);
  }, [temples, page, pageSize]);

  const fetchtemples = useCallback(async (searchValue = "", statusValue = "all", cityValue = "") => {
    try {
      setLoading(true);
      const res = await API.get("/admin/temples", {
        params: {
          status: statusValue,
          ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
          ...(cityValue.trim() ? { city: cityValue.trim() } : {}),
        },
      });
      settemples(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load temples.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchtemples(searchTerm, statusFilter, cityFilter);
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchtemples, searchTerm, statusFilter, cityFilter]);

  useEffect(() => {
    setPage(1);
  }, [temples.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-temple-menu], [data-table-menu-popover]")) {
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

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        [name]: value,
      },
    }));
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (temple) => {
    setForm({
      name: temple?.name || "",
      description: temple?.description || "",
      contactPhone: temple?.contactPhone || "",
      contactPerson: temple?.contactPerson || "",
      openingTime: temple?.openingTime || "",
      closingTime: temple?.closingTime || "",
      facilitiesText: Array.isArray(temple?.facilities) ? temple.facilities.join(", ") : "",
      status: temple?.status || "active",
      address: {
        line1: temple?.address?.line1 || "",
        line2: temple?.address?.line2 || "",
        city: temple?.address?.city || "",
        state: temple?.address?.state || "",
        pinCode: temple?.address?.pinCode || "",
        landmark: temple?.address?.landmark || "",
      },
    });
    setEditingId(temple?._id || "");
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

    if (!form.name.trim()) {
      setError("temple name is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("description", form.description.trim());
      payload.append("contactPhone", form.contactPhone.trim());
      payload.append("contactPerson", form.contactPerson.trim());
      payload.append("openingTime", form.openingTime.trim());
      payload.append("closingTime", form.closingTime.trim());
      payload.append("facilities", form.facilitiesText);
      payload.append("status", form.status);
      payload.append("address[line1]", form.address.line1.trim());
      payload.append("address[line2]", form.address.line2.trim());
      payload.append("address[city]", form.address.city.trim());
      payload.append("address[state]", form.address.state.trim());
      payload.append("address[pinCode]", form.address.pinCode.trim());
      payload.append("address[landmark]", form.address.landmark.trim());

      if (imageFile) {
        payload.append("imageFile", imageFile);
      }

      if (editingId) {
        await API.put(`/admin/temples/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/temples", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchtemples();
      setSuccess(editingId ? "temple updated successfully." : "temple created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save temple.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (temple) => {
    if (!temple?._id) return;
    if (!window.confirm(`Delete temple "${temple.name}"?`)) return;

    try {
      setDeletingId(temple._id);
      setError("");
      setSuccess("");
      await API.delete(`/admin/temples/${temple._id}`);
      settemples((current) => current.filter((entry) => entry._id !== temple._id));
      setSuccess("temple deleted successfully.");
      if (editingId === temple._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete temple.");
    } finally {
      setDeletingId("");
    }
  };

  const buildTemplePayload = (temple, overrides = {}) => {
    const payload = new FormData();
    payload.append("name", String(overrides.name ?? temple.name ?? "").trim());
    payload.append("description", String(overrides.description ?? temple.description ?? "").trim());
    payload.append("contactPhone", String(overrides.contactPhone ?? temple.contactPhone ?? "").trim());
    payload.append("contactPerson", String(overrides.contactPerson ?? temple.contactPerson ?? "").trim());
    payload.append("openingTime", String(overrides.openingTime ?? temple.openingTime ?? "").trim());
    payload.append("closingTime", String(overrides.closingTime ?? temple.closingTime ?? "").trim());
    payload.append(
      "facilities",
      String(overrides.facilitiesText ?? (Array.isArray(temple.facilities) ? temple.facilities.join(", ") : temple.facilities || ""))
    );
    payload.append("status", overrides.status ?? temple.status ?? "inactive");
    payload.append("address[line1]", String(overrides.address?.line1 ?? temple.address?.line1 ?? "").trim());
    payload.append("address[line2]", String(overrides.address?.line2 ?? temple.address?.line2 ?? "").trim());
    payload.append("address[city]", String(overrides.address?.city ?? temple.address?.city ?? "").trim());
    payload.append("address[state]", String(overrides.address?.state ?? temple.address?.state ?? "").trim());
    payload.append("address[pinCode]", String(overrides.address?.pinCode ?? temple.address?.pinCode ?? "").trim());
    payload.append("address[landmark]", String(overrides.address?.landmark ?? temple.address?.landmark ?? "").trim());
    return payload;
  };

  const handleToggleTempleStatus = async (temple) => {
    if (!temple?._id) return;
    const nextStatus = temple.status === "active" ? "inactive" : "active";

    try {
      const payload = buildTemplePayload(temple, { status: nextStatus });
      await API.put(`/admin/temples/${temple._id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      settemples((current) =>
        current.map((entry) => (entry._id === temple._id ? { ...entry, status: nextStatus } : entry))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update temple status.");
    }
  };

  const toggleTempleSelection = (templeId, checked) => {
    setSelectedTempleIds((current) => {
      if (checked) {
        return current.includes(templeId) ? current : [...current, templeId];
      }
      return current.filter((id) => id !== templeId);
    });
  };

  const toggleAllTemples = (checked) => {
    if (checked) {
      setSelectedTempleIds(temples.map((temple) => temple._id));
      return;
    }
    setSelectedTempleIds([]);
  };

  const handleDeleteSelectedTemples = async () => {
    if (!selectedTempleIds.length) return;
    if (!window.confirm(`Delete ${selectedTempleIds.length} selected temples?`)) return;

    try {
      await Promise.all(selectedTempleIds.map((templeId) => API.delete(`/admin/temples/${templeId}`)));
      settemples((current) => current.filter((entry) => !selectedTempleIds.includes(entry._id)));
      setSelectedTempleIds([]);
      setSuccess("Selected temples deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected temples.");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Admin temples</p>
            <h2 className="mt-2 text-2xl font-bold">Manage temple locations for booking</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Add temple details for temple ritual bookings. Users can select from this list when booking mode is temple ritual.
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
            {showForm ? "Hide Form" : "Add temple"}
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
            <h3 className="text-lg font-bold">{editingId ? "Edit temple" : "Add New temple"}</h3>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">temple Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                placeholder="e.g. Shri Durga temple"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image File</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFieldChange}
                rows={3}
                placeholder="Short details about this temple"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleFieldChange}
                placeholder="Priest / Manager"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Phone</label>
              <input
                type="text"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleFieldChange}
                placeholder="+91..."
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Time</label>
              <input
                type="text"
                name="openingTime"
                value={form.openingTime}
                onChange={handleFieldChange}
                placeholder="06:00 AM"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Closing Time</label>
              <input
                type="text"
                name="closingTime"
                value={form.closingTime}
                onChange={handleFieldChange}
                placeholder="09:00 PM"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Facilities (comma separated)</label>
              <input
                type="text"
                name="facilitiesText"
                value={form.facilitiesText}
                onChange={handleFieldChange}
                placeholder="Parking, Wheelchair access, Prasad"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 1</label>
              <input
                type="text"
                name="line1"
                value={form.address.line1}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 2</label>
              <input
                type="text"
                name="line2"
                value={form.address.line2}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input
                type="text"
                name="city"
                value={form.address.city}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <input
                type="text"
                name="state"
                value={form.address.state}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pin Code</label>
              <input
                type="text"
                name="pinCode"
                value={form.address.pinCode}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Landmark</label>
              <input
                type="text"
                name="landmark"
                value={form.address.landmark}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleFieldChange}
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
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Create temple"}
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-bold">temple List</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="shrink-0 text-[var(--admin-primary)]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search temples"
                className="h-11 w-40 bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="shrink-0 text-[var(--admin-primary)]" />
              <input
                type="search"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Filter by city"
                className="h-11 w-32 bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            Loading temples...
          </div>
        ) : temples.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            No temples added yet.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                {selectedTempleIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleDeleteSelectedTemples}
                disabled={!selectedTempleIds.length}
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
                      checked={temples.length > 0 && selectedTempleIds.length === temples.length}
                      onChange={(event) => toggleAllTemples(event.target.checked)}
                      className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                    />
                  </th>
                  <th className="serial-col px-2 py-3">S.No</th>
                  <th className="px-3 py-3">Images</th>
                  <th className="px-3 py-3">Temple Code</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">City</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedTemples.map((temple, index) => (
                  <tr key={temple._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                    <td className="px-3 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTempleIds.includes(temple._id)}
                        onChange={(event) => toggleTempleSelection(temple._id, event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </td>
                    <td className="serial-col px-2 py-4 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-4"><img src={temple.image} className="rounded" width={80} height={30} alt="" /></td>
                    <td className="px-3 py-4 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">
                      TEMPLE-{String(temple._id || "").slice(-6).toUpperCase()}
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold">{temple.name}</p>
                      <p className="text-xs text-[#6e4b40] dark:text-[#f7e3c0]/80">{temple.address?.line1 || temple.address?.landmark || "-"}</p>
                    </td>
                    <td className="px-3 py-4">{temple.address?.city || "-"}</td>
                    <td className="px-3 py-4">{temple.contactPhone || "-"}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          temple.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                        }`}
                      >
                        {temple.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right" data-temple-menu>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(event) => {
                            const nextId = openMenuId === temple._id ? "" : temple._id;
                            setOpenMenuId(nextId);
                            setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === temple._id && (
                          <TableMenuPopover
                            open
                            anchorRect={menuAnchorRect}
                            preferUp={index >= pagedTemples.length - 3}
                            onClose={() => setOpenMenuId("")}
                            className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(temple);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEye className="text-[#6f3945]" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(temple);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEdit2 className="text-[#6f3945]" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleToggleTempleStatus(temple);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <span className="text-[#6f3945]">{temple.status === "active" ? "Mark Inactive" : "Mark Active"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleDelete(temple);
                              }}
                              disabled={deletingId === temple._id}
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
              total={temples.length}
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
