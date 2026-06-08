import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiMoreVertical, FiTrash2, FiX, FiPlus } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const initialForm = {
  code: "",
  title: "",
  description: "",
  discountType: "flat",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "1",
  isActive: true,
  startsAt: "",
  expiresAt: "",
};

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCouponIds, setSelectedCouponIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const pagedCoupons = useMemo(() => {
    const start = (page - 1) * pageSize;
    return coupons.slice(start, start + pageSize);
  }, [coupons, page, pageSize]);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/coupons", {
        params: {
          status: statusFilter,
          discountType: typeFilter,
          query: searchQuery.trim(),
        },
      });
      setCoupons(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    setPage(1);
  }, [coupons.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-coupon-menu], [data-table-menu-popover]")) {
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

  const isCouponExpired = (coupon) => {
    const now = new Date();
    const expiredByDate = coupon.expiresAt ? new Date(coupon.expiresAt) <= now : false;
    const expiredByUsage =
      Number(coupon.usageLimit || 0) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || 0);
    return !coupon.isActive || expiredByDate || expiredByUsage;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (coupon) => {
    setForm({
      code: coupon?.code || "",
      title: coupon?.title || "",
      description: coupon?.description || "",
      discountType: coupon?.discountType || "flat",
      discountValue: coupon?.discountValue || "",
      minOrderAmount: coupon?.minOrderAmount || "",
      maxDiscount: coupon?.maxDiscount || "",
      usageLimit: coupon?.usageLimit || "",
      perUserLimit: coupon?.perUserLimit || "1",
      isActive: coupon?.isActive !== false,
      startsAt: coupon?.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 10) : "",
      expiresAt: coupon?.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : "",
    });
    setEditingId(coupon?._id || "");
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

    if (!form.code.trim()) {
      setError("Coupon code is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        code: form.code.toUpperCase().trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxDiscount: Number(form.maxDiscount || 0),
        usageLimit: Number(form.usageLimit || 0),
        perUserLimit: Number(form.perUserLimit || 1),
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      };

      if (editingId) {
        await API.put(`/admin/coupons/${editingId}`, payload);
      } else {
        await API.post("/admin/coupons", payload);
      }

      await fetchCoupons();
      setSuccess(editingId ? "Coupon updated successfully." : "Coupon created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save coupon.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!coupon?._id) return;
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;

    try {
      setDeletingId(coupon._id);
      setError("");
      setSuccess("");
      await API.delete(`/admin/coupons/${coupon._id}`);
      setCoupons((current) => current.filter((entry) => entry._id !== coupon._id));
      setSuccess("Coupon deleted successfully.");
      if (editingId === coupon._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete coupon.");
    } finally {
      setDeletingId("");
    }
  };

  const buildCouponPayload = (coupon, overrides = {}) => ({
    code: String(overrides.code ?? coupon.code ?? "").toUpperCase().trim(),
    title: String(overrides.title ?? coupon.title ?? "").trim(),
    description: String(overrides.description ?? coupon.description ?? "").trim(),
    discountType: overrides.discountType ?? coupon.discountType ?? "flat",
    discountValue: Number(overrides.discountValue ?? coupon.discountValue ?? 0),
    minOrderAmount: Number(overrides.minOrderAmount ?? coupon.minOrderAmount ?? 0),
    maxDiscount: Number(overrides.maxDiscount ?? coupon.maxDiscount ?? 0),
    usageLimit: Number(overrides.usageLimit ?? coupon.usageLimit ?? 0),
    perUserLimit: Number(overrides.perUserLimit ?? coupon.perUserLimit ?? 1),
    isActive: overrides.isActive ?? coupon.isActive ?? false,
    startsAt: (overrides.startsAt ?? coupon.startsAt)
      ? new Date(overrides.startsAt ?? coupon.startsAt)
      : null,
    expiresAt: (overrides.expiresAt ?? coupon.expiresAt)
      ? new Date(overrides.expiresAt ?? coupon.expiresAt)
      : null,
  });

  const handleToggleCouponStatus = async (coupon) => {
    if (!coupon?._id) return;
    const nextStatus = !coupon.isActive;

    try {
      const payload = buildCouponPayload(coupon, { isActive: nextStatus });
      await API.put(`/admin/coupons/${coupon._id}`, payload);
      setCoupons((current) =>
        current.map((entry) =>
          entry._id === coupon._id ? { ...entry, isActive: nextStatus } : entry
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update coupon status.");
    }
  };

  const toggleCouponSelection = (couponId, checked) => {
    setSelectedCouponIds((current) => {
      if (checked) {
        return current.includes(couponId) ? current : [...current, couponId];
      }
      return current.filter((id) => id !== couponId);
    });
  };

  const toggleAllCoupons = (checked) => {
    if (checked) {
      setSelectedCouponIds(coupons.map((coupon) => coupon._id));
      return;
    }
    setSelectedCouponIds([]);
  };

  const handleDeleteSelectedCoupons = async () => {
    if (!selectedCouponIds.length) return;
    if (!window.confirm(`Delete ${selectedCouponIds.length} selected coupons?`)) return;

    try {
      await Promise.all(selectedCouponIds.map((couponId) => API.delete(`/admin/coupons/${couponId}`)));
      setCoupons((current) => current.filter((entry) => !selectedCouponIds.includes(entry._id)));
      setSelectedCouponIds([]);
      setSuccess("Selected coupons deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected coupons.");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Manage Coupons</h2>
          <button
            onClick={openCreate}
            className="admin-btn-primary flex items-center gap-2 rounded-2xl border border-transparent px-4 py-2 text-sm font-medium transition-all"
          >
            <FiPlus size={18} />
            Add Coupon
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-100 p-4 text-green-800 dark:bg-green-900 dark:text-green-200">
            {success}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
            {selectedCouponIds.length} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelectedCoupons}
            disabled={!selectedCouponIds.length}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          >
            Delete Selected
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#6f3945]">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 rounded-lg border border-[#d7c3a3] bg-white px-3 text-xs dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#6f3945]">Type</label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-9 rounded-lg border border-[#d7c3a3] bg-white px-3 text-xs dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="all">All</option>
              <option value="flat">Flat</option>
              <option value="percent">Percent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#6f3945]">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Code or title"
              className="h-9 w-44 rounded-lg border border-[#d7c3a3] bg-white px-3 text-xs dark:bg-[#181c24] dark:text-white dark:border-white/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="py-8 text-center">No coupons yet. Create one to get started.</div>
        ) : (
          <>
          <div className="admin-table-wrap overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                  <th className="px-4 py-3 text-center font-semibold">
                    <input
                      type="checkbox"
                      checked={coupons.length > 0 && selectedCouponIds.length === coupons.length}
                      onChange={(event) => toggleAllCoupons(event.target.checked)}
                      className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                    />
                  </th>
                  <th className="serial-col px-2 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Coupon Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Title</th>
                  <th className="px-4 py-3 text-left font-semibold">Discount</th>
                  <th className="px-4 py-3 text-left font-semibold">Min Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Expires</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedCoupons.map((coupon, index) => (
                  <tr
                    key={coupon._id}
                    className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)]"
                  >
                    <td className="px-4 py-3 text-center">
                      <nput
                        type="checkbox"
                        checked={selectedCouponIds.includes(coupon._id)}
                        onChange={(event) => toggleCouponSelection(coupon._id, event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </td>
                    <td className="serial-col px-2 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">COUPON-{String(coupon._id || "").slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 font-semibold text-[#D4AF37]">{coupon.code}</td>
                    <td className="px-4 py-3">{coupon.title || "-"}</td>
                    <td className="px-4 py-3">
                      {coupon.discountType === "percent"
                        ? `${coupon.discountValue}%`
                        : `₹${coupon.discountValue}`}
                    </td>
                    <td className="px-4 py-3">₹{coupon.minOrderAmount || 0}</td>
                    <td className="px-4 py-3">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const expired = isCouponExpired(coupon);
                        return (
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                              expired
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                            }`}
                          >
                            {expired ? "Expired" : "Active"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right" data-coupon-menu>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(event) => {
                            const nextId = openMenuId === coupon._id ? "" : coupon._id;
                            setOpenMenuId(nextId);
                            setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === coupon._id && (
                          <TableMenuPopover
                            open
                            anchorRect={menuAnchorRect}
                            preferUp={index >= pagedCoupons.length - 3}
                            onClose={() => setOpenMenuId("")}
                            className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(coupon);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEye className="text-[#6f3945]" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(coupon);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEdit2 className="text-[#6f3945]" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleToggleCouponStatus(coupon);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <span className="text-[#6f3945]">{coupon.isActive ? "Mark Inactive" : "Mark Active"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleDelete(coupon);
                              }}
                              disabled={deletingId === coupon._id}
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
            total={coupons.length}
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

      {showForm && (
        <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">
              {editingId ? "Edit Coupon" : "Create New Coupon"}
            </h3>
            <button onClick={closeForm} className="p-1" title="Close form">
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  disabled={!!editingId}
                  placeholder="e.g., DIWALI50"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Coupon title"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Discount Type</label>
                <select
                  name="discountType"
                  value={form.discountType}
                  onChange={handleChange}
                  className="h-11 w-full rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
                >
                  <option value="flat">Flat Amount (₹)</option>
                  <option value="percent">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">Discount Value</label>
                <input
                  type="number"
                  name="discountValue"
                  value={form.discountValue}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  pliaceholder="0"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Min Order Amount (₹)</label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={form.minOrderAmount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Max Discount (₹)</label>
                <input
                  type="number"
                  name="maxDiscount"
                  value={form.maxDiscount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Total Usage Limit</label>
                <input
                  type="number"
                  name="usageLimit"
                  value={form.usageLimit}
                  onChange={handleChange}
                  min="0"
                  placeholder="0 = unlimited"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Per User Limit</label>
                <input
                  type="number"
                  name="perUserLimit"
                  value={form.perUserLimit}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Start Date</label>
                <input
                  type="date"
                  name="startsAt"
                  value={form.startsAt}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Expiry Date</label>
                <input
                  type="date"
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Coupon description"
                rows="3"
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="rounded"
              />
              <label htmlFor="isActive" className="font-medium">
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn-primary flex-1 rounded-2xl border border-transparent px-4 py-2 font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-[var(--admin-border)] px-4 py-2 font-medium transition-all hover:bg-[var(--admin-surface-soft)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
