import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiEdit2,
  FiMoreVertical,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import { getAdminRole } from "../utils/auth";

const initialForm = {
  locationName: "",
  state: "",
  pincode: "",
  deliveryCharge: "",
  codCharge: "",
  status: "active",
};

export default function DeliveryCharge() {
  const isSuperAdmin = getAdminRole() === "super-admin";
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [freeDeliveryLimit, setFreeDeliveryLimit] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [bookingPricingData, setBookingPricingData] = useState(null);

  const [pricings, setPricings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPricingIds, setSelectedPricingIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPricings = useMemo(() => {
    return pricings.filter((item) => {
      const matchesSearch =
        item.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pincode?.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pricings, searchTerm, statusFilter]);

  const pagedPricings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPricings.slice(start, start + pageSize);
  }, [filteredPricings, page, pageSize]);

  // Load vendors list if super admin
  const loadVendors = async () => {
    try {
      const res = await API.get("/admin/vendors?limit=100");
      setVendors(res.data?.data?.vendors || []);
      if (res.data?.data?.vendors?.length > 0) {
        setSelectedVendorId(res.data.data.vendors[0]._id);
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadVendors();
    }
  }, [isSuperAdmin]);

  const fetchFreeDeliveryThreshold = async () => {
    try {
      const res = await API.get("/admin/booking-price/price");
      const data = res.data?.data || res.data || {};
      setBookingPricingData(data);
      setFreeDeliveryLimit(data.freeDeliveryThreshold ?? "0");
    } catch (err) {
      console.error("Failed to load free delivery threshold:", err);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchFreeDeliveryThreshold();
    }
  }, [isSuperAdmin]);

  const handleFreeDeliverySubmit = async (e) => {
    e.preventDefault();
    setSavingThreshold(true);
    try {
      const payload = {
        ...bookingPricingData,
        freeDeliveryThreshold: Number(freeDeliveryLimit),
      };
      await API.post("/admin/booking-price/price", payload);
      setSuccess("Free delivery limit updated successfully.");
      setError("");
      fetchFreeDeliveryThreshold();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update free delivery limit.");
      setSuccess("");
    } finally {
      setSavingThreshold(false);
    }
  };

  const fetchPricings = useCallback(async () => {
    if (isSuperAdmin && !selectedVendorId) {
      setPricings([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const url = isSuperAdmin
        ? `/vendor/delivery-charge/list?vendorId=${selectedVendorId}`
        : "/vendor/delivery-charge/list";
      const res = await API.get(url);
      setPricings(res.data?.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load delivery pricings.",
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedVendorId]);

  useEffect(() => {
    fetchPricings();
  }, [fetchPricings]);

  useEffect(() => {
    setPage(1);
  }, [filteredPricings.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        !event.target.closest("[data-pricing-menu], [data-table-menu-popover]")
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
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (pricing) => {
    setForm({
      locationName: pricing?.locationName || "",
      state: pricing?.state || "",
      pincode: pricing?.pincode || "",
      deliveryCharge: pricing?.deliveryCharge ?? "",
      codCharge: pricing?.codCharge ?? "",
      status: pricing?.status || "active",
    });
    setEditingId(pricing?._id || "");
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

    if (isSuperAdmin && !selectedVendorId) {
      setError("Please select a vendor first.");
      return;
    }

    if (!form.locationName.trim()) {
      setError("Location name is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        locationName: form.locationName.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        deliveryCharge: Number(form.deliveryCharge || 0),
        codCharge: Number(form.codCharge || 0),
        status: form.status,
        ...(isSuperAdmin ? { vendorId: selectedVendorId } : {}),
      };

      if (editingId) {
        await API.put(`/vendor/delivery-charge/update/${editingId}`, payload);
      } else {
        await API.post("/vendor/delivery-charge/add", payload);
      }

      await fetchPricings();
      setSuccess(
        editingId
          ? "Delivery charge updated successfully."
          : "Delivery charge added successfully.",
      );
      closeForm();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save delivery charge.",
      );
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pricing) => {
    if (!pricing?._id) return;
    if (!window.confirm(`Delete pricing for "${pricing.locationName}"?`))
      return;

    try {
      setDeletingId(pricing._id);
      setError("");
      setSuccess("");

      await API.delete(`/vendor/delivery-charge/delete/${pricing._id}`);

      setPricings((current) =>
        current.filter((entry) => entry._id !== pricing._id),
      );
      setSuccess("Pricing deleted successfully.");

      if (editingId === pricing._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete pricing.");
    } finally {
      setDeletingId("");
    }
  };

  const handleTogglePricingStatus = async (pricing) => {
    if (!pricing?._id) return;
    const nextStatus = pricing.status === "active" ? "inactive" : "active";

    try {
      const payload = {
        locationName: pricing.locationName,
        state: pricing.state,
        pincode: pricing.pincode,
        deliveryCharge: pricing.deliveryCharge,
        codCharge: pricing.codCharge,
        status: nextStatus,
        ...(isSuperAdmin ? { vendorId: selectedVendorId } : {}),
      };

      await API.put(`/vendor/delivery-charge/update/${pricing._id}`, payload);

      setPricings((current) =>
        current.map((entry) =>
          entry._id === pricing._id ? { ...entry, status: nextStatus } : entry,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update status.");
    }
  };

  const togglePricingSelection = (id, checked) => {
    setSelectedPricingIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((selectedId) => selectedId !== id);
    });
  };

  const toggleAllPricings = (checked) => {
    if (checked) {
      setSelectedPricingIds(pagedPricings.map((p) => p._id));
      return;
    }
    setSelectedPricingIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedPricingIds.length) return;
    if (!window.confirm(`Delete ${selectedPricingIds.length} selected areas?`))
      return;

    try {
      await Promise.all(
        selectedPricingIds.map((id) =>
          API.delete(`/vendor/delivery-charge/delete/${id}`),
        ),
      );
      setPricings((current) =>
        current.filter((entry) => !selectedPricingIds.includes(entry._id)),
      );
      setSelectedPricingIds([]);
      setSuccess("Selected pricings deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete selected areas.",
      );
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">
              {isSuperAdmin ? "Super Admin Panel" : "Vendor Settings"}
            </p>
            <h2 className="mt-2 text-2xl font-bold">Manage Delivery Charges</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Set up delivery charges based on locations, states, and pincodes.
            </p>
          </div>

          <button
            type="button"
            disabled={isSuperAdmin && !selectedVendorId}
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreate();
              }
            }}
            className="admin-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
          >
            {showForm ? "Hide Form" : "Add Location"}
          </button>
        </div>
      </section>

      {/* Vendor Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-2">
            Select Vendor
          </label>
          <select
            value={selectedVendorId}
            onChange={(e) => {
              setSelectedVendorId(e.target.value);
              closeForm();
            }}
            className="w-full max-w-md rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[#8B1E3F] dark:bg-[#1a1f2b]"
          >
            <option value="">-- Choose Vendor --</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.businessName || v.name} ({v.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Free Delivery Threshold for Super Admin */}
      {isSuperAdmin && (
        <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <h3 className="text-lg font-bold text-[#2f1618] dark:text-[#fff3dc] mb-2">Free Delivery Settings</h3>
          <p className="text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75 mb-4">
            Set the order value threshold above which delivery charges become free.
          </p>
          <form onSubmit={handleFreeDeliverySubmit} className="flex flex-wrap items-end gap-4 max-w-lg">
            <label className="space-y-2 text-sm font-semibold text-[var(--admin-text)] flex-1 min-w-[250px]">
              Free Delivery Product Order Limit (INR)
              <input
                type="number"
                min="0"
                step="1"
                value={freeDeliveryLimit}
                onChange={(e) => setFreeDeliveryLimit(e.target.value)}
                className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-4 py-3 text-sm outline-none focus:border-[var(--admin-primary)] mt-1.5"
                required
              />
            </label>
            <button
              type="submit"
              disabled={savingThreshold}
              className="admin-btn-primary rounded-2xl px-6 py-3 text-sm font-semibold shadow disabled:opacity-60 h-[46px] flex items-center justify-center"
            >
              {savingThreshold ? "Saving..." : "Save Limit"}
            </button>
          </form>
        </section>
      )}

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
              {editingId ? "Edit Delivery Pricing" : "Add New Delivery Pricing"}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Location / City Name *
              </label>
              <input
                type="text"
                name="locationName"
                value={form.locationName}
                onChange={handleFieldChange}
                placeholder="e.g. Mumbai, Borivali"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleFieldChange}
                placeholder="e.g. Maharashtra"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={form.pincode}
                onChange={handleFieldChange}
                placeholder="e.g. 400092"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Delivery Charge (₹)
              </label>
              <input
                type="number"
                name="deliveryCharge"
                value={form.deliveryCharge}
                onChange={handleFieldChange}
                placeholder="e.g. 50 (or 0)"
                min="0"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cash On Delivery (COD) Charge (₹)
              </label>
              <input
                type="number"
                name="codCharge"
                value={form.codCharge}
                onChange={handleFieldChange}
                placeholder="e.g. 40 (If Delivery Charge is 0)"
                min="0"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
              />
            </div>

            <div className="space-y-2">
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

            <div className="col-span-full rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              💡 Note: Agar Delivery Charge nahi hai (0 hai), to uski jagah Cash On Delivery (COD) Charge apply hoga.
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
                  : "Add Pricing"}
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
          <h3 className="text-lg font-bold">Pricing List</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="shrink-0 text-[var(--admin-primary)]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search location or pincode"
                className="h-11 w-48 bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
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
          </div>
        </div>

        {isSuperAdmin && !selectedVendorId ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-center text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            Please select a vendor to view and manage delivery charges.
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            Loading delivery charges...
          </div>
        ) : filteredPricings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            No delivery charges found for this vendor.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                {selectedPricingIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={!selectedPricingIds.length}
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
                          pagedPricings.length > 0 &&
                          selectedPricingIds.length === pagedPricings.length
                        }
                        onChange={(event) =>
                          toggleAllPricings(event.target.checked)
                        }
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="serial-col px-2 py-3">S.No</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">State</th>
                    <th className="px-3 py-3">Pincode</th>
                    <th className="px-3 py-3">Delivery Charge (₹)</th>
                    <th className="px-3 py-3">COD Charge (₹)</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPricings.map((item, index) => (
                    <tr
                      key={item._id}
                      className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10"
                    >
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPricingIds.includes(item._id)}
                          onChange={(event) =>
                            togglePricingSelection(
                              item._id,
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
                        {item.locationName}
                      </td>
                      <td className="px-3 py-4 text-[#6e4b40] dark:text-[#f7e3c0]/80">
                        {item.state || "-"}
                      </td>
                      <td className="px-3 py-4 text-[#6e4b40] dark:text-[#f7e3c0]/80">
                        {item.pincode || "-"}
                      </td>
                      <td className="px-3 py-4 font-bold text-[#8B1E3F] dark:text-[#f7e3c0]">
                        ₹{item.deliveryCharge || 0}
                      </td>
                      <td className="px-3 py-4 font-bold text-amber-700 dark:text-amber-300">
                        ₹{item.codCharge || 0}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right" data-pricing-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId =
                                openMenuId === item._id ? "" : item._id;
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
                          {openMenuId === item._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedPricings.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(item);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleTogglePricingStatus(item);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <span className="text-[#6f3945]">
                                  {item.status === "active"
                                    ? "Mark Inactive"
                                    : "Mark Active"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDelete(item);
                                }}
                                disabled={deletingId === item._id}
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
              total={filteredPricings.length}
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
