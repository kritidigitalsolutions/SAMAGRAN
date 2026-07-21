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
  isWelcomeCoupon: false,
  welcomeValidDays: "",
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
  const [wcToggling, setWcToggling] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("manage");
  const [selectedSendCouponId, setSelectedSendCouponId] = useState("");
  const [audienceType, setAudienceType] = useState("all");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
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

  const fetchUsers = useCallback(async (query = "") => {
    try {
      setUsersLoading(true);
      const res = await API.get("/admin/user/all", { params: { search: query } });
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch users list:", err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "send") {
      fetchUsers(userSearch.trim());
    }
  }, [activeTab, userSearch, fetchUsers]);

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
      isWelcomeCoupon: coupon?.isWelcomeCoupon || false,
      welcomeValidDays: coupon?.welcomeValidDays || "",
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

    if (editingId && !form.code.trim()) {
      setError("Coupon code is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        ...(editingId ? { code: form.code.toUpperCase().trim() } : {}),
        title: form.title.trim(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxDiscount: Number(form.maxDiscount || 0),
        usageLimit: Number(form.usageLimit || 0),
        perUserLimit: Number(form.perUserLimit || 1),
        isActive: form.isActive,
        isWelcomeCoupon: form.isWelcomeCoupon,
        welcomeValidDays: Number(form.welcomeValidDays || 0),
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
    isWelcomeCoupon: overrides.isWelcomeCoupon ?? coupon.isWelcomeCoupon ?? false,
    welcomeValidDays: Number(overrides.welcomeValidDays ?? coupon.welcomeValidDays ?? 0),
    startsAt: (overrides.startsAt ?? coupon.startsAt)
      ? new Date(overrides.startsAt ?? coupon.startsAt)
      : null,
    expiresAt: (overrides.expiresAt ?? coupon.expiresAt)
      ? new Date(overrides.expiresAt ?? coupon.expiresAt)
      : null,
  });

  const handleSendCoupon = async () => {
    if (!selectedSendCouponId) {
      setError("Please select a coupon to send.");
      setSuccess("");
      return;
    }

    if (audienceType === "specific" && !selectedUserIds.length) {
      setError("Please select at least one user to send the coupon to.");
      setSuccess("");
      return;
    }

    try {
      setAssigning(true);
      setError("");
      setSuccess("");

      const res = await API.post("/admin/coupons/assign", {
        couponId: selectedSendCouponId,
        targetType: audienceType,
        userIds: audienceType === "specific" ? selectedUserIds : [],
      });

      setSuccess(res.data?.message || "Coupon sent successfully.");
      setSelectedUserIds([]);
      setUserSearch("");
      setSelectedSendCouponId("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send coupon.");
      setSuccess("");
    } finally {
      setAssigning(false);
    }
  };

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

  const handleToggleWelcomeCoupon = async (welcomeCoupon) => {
    if (!welcomeCoupon?._id) return;
    const nextStatus = !welcomeCoupon.isActive;
    try {
      setWcToggling(true);
      await API.patch("/admin/coupons/welcome-coupon/toggle", { isActive: nextStatus });
      setCoupons((current) =>
        current.map((entry) =>
          entry.isWelcomeCoupon ? { ...entry, isActive: nextStatus } : entry
        )
      );
      setSuccess(`Welcome coupon ${nextStatus ? "enabled" : "disabled"} successfully.`);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to toggle welcome coupon status.");
      setSuccess("");
    } finally {
      setWcToggling(false);
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
          <h2 className="text-2xl font-bold">
            {activeTab === "manage" ? "Manage Coupons" : "Send Coupon to Users"}
          </h2>
          {activeTab === "manage" && (
            <button
              onClick={openCreate}
              className="admin-btn-primary flex items-center gap-2 rounded-2xl border border-transparent px-4 py-2 text-sm font-medium transition-all"
            >
              <FiPlus size={18} />
              Add Coupon
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#e6d8c5] dark:border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "manage"
                ? "border-[var(--admin-primary)] text-[var(--admin-primary)]"
                : "border-transparent text-[#7b5a4b] hover:text-[var(--admin-primary)] dark:text-[#dbcdb8]/70"
            }`}
          >
            Manage Coupons
          </button>
          <button
            onClick={() => {
              setActiveTab("send");
              setShowForm(false);
              setError("");
              setSuccess("");
            }}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "send"
                ? "border-[var(--admin-primary)] text-[var(--admin-primary)]"
                : "border-transparent text-[#7b5a4b] hover:text-[var(--admin-primary)] dark:text-[#dbcdb8]/70"
            }`}
          >
            Send Coupon
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-100 p-4 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm">
            {success}
          </div>
        )}

        {activeTab === "manage" && (
          <>
            {/* Welcome Coupon Quick Status Card */}
            {(() => {
              const welcomeCoupon = coupons.find((c) => c.isWelcomeCoupon);
              if (!welcomeCoupon) return null;
              return (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-500/30 dark:bg-amber-500/5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.1em] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">🎁 Welcome Coupon</span>
                        <span className="font-mono text-sm font-bold text-[#6f3945] dark:text-[#f7e3c0]">{welcomeCoupon.code}</span>
                      </div>
                      <p className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                        Discount: {welcomeCoupon.discountType === "percent" ? `${welcomeCoupon.discountValue}%` : `₹${welcomeCoupon.discountValue}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-[#6f3945]">Validity (Days):</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={welcomeCoupon.welcomeValidDays || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value || 0);
                          welcomeCoupon.tempValidDays = val;
                        }}
                        placeholder="0 = unlimited"
                        className="h-8 w-20 rounded-lg border border-[#d7c3a3] bg-white px-2 text-xs dark:bg-[#181c24] dark:text-white dark:border-white/20"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const val = welcomeCoupon.tempValidDays !== undefined ? welcomeCoupon.tempValidDays : (welcomeCoupon.welcomeValidDays || 0);
                          try {
                            setWcToggling(true);
                            await API.put(`/admin/coupons/${welcomeCoupon._id}`, { welcomeValidDays: val });
                            setCoupons((current) =>
                              current.map((entry) =>
                                entry.isWelcomeCoupon ? { ...entry, welcomeValidDays: val } : entry
                              )
                            );
                            setSuccess(`Welcome coupon validity updated to ${val} days.`);
                            setError("");
                          } catch (err) {
                            setError(err.response?.data?.message || "Unable to update welcome coupon validity.");
                            setSuccess("");
                          } finally {
                            setWcToggling(false);
                          }
                        }}
                        disabled={wcToggling}
                        className="rounded-lg bg-[var(--admin-primary)] px-2.5 py-1 text-[10px] font-bold text-white transition-all hover:bg-[var(--admin-primary-strong)] disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      welcomeCoupon.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${welcomeCoupon.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      {welcomeCoupon.isActive ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleWelcomeCoupon(welcomeCoupon)}
                      disabled={wcToggling}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-60 ${
                        welcomeCoupon.isActive
                          ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-300"
                          : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-300"
                      }`}
                    >
                      {wcToggling ? "Updating..." : welcomeCoupon.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              );
            })()}

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
                        <input
                          type="checkbox"
                          checked={selectedCouponIds.includes(coupon._id)}
                          onChange={(event) => toggleCouponSelection(coupon._id, event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="serial-col px-2 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#D4AF37]">{coupon.code}</span>
                        {coupon.isWelcomeCoupon && (
                          <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">🎁 Welcome</span>
                        )}
                        {coupon.isRestricted && (
                          <span className="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">🎯 Assigned</span>
                        )}
                      </td>
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

        {activeTab === "send" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Select Coupon to Send (Only Supper Admin can send coupons)</label>
                <select
                  value={selectedSendCouponId}
                  onChange={(e) => setSelectedSendCouponId(e.target.value)}
                  className="w-full rounded-xl border border-[#dcc7ab]/60 bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
                >
                  <option value="">-- Choose active coupon --</option>
                  {coupons
                    .filter((c) => c.isActive && !c.isWelcomeCoupon)
                    .map((coupon) => (
                      <option key={coupon._id} value={coupon._id}>
                        {coupon.code} - {coupon.title || "No Title"} ({coupon.discountType === "percent" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold block">Target Audience</label>
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="audienceType"
                      value="all"
                      checked={audienceType === "all"}
                      onChange={() => setAudienceType("all")}
                      className="h-4 w-4 text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
                    />
                    <span>All Users</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="audienceType"
                      value="specific"
                      checked={audienceType === "specific"}
                      onChange={() => setAudienceType("specific")}
                      className="h-4 w-4 text-[var(--admin-primary)] focus:ring-[var(--admin-primary)]"
                    />
                    <span>Specific Users</span>
                  </label>
                </div>
              </div>
            </div>

            {audienceType === "specific" && (
              <div className="space-y-4 rounded-2xl border border-[#dcc7ab]/60 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h4 className="font-bold text-sm">Select Target Users</h4>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, or phone..."
                    className="max-w-xs w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
                  />
                </div>

                {usersLoading ? (
                  <div className="text-center py-6 text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/50">
                    {loading ? "Loading users list..." : ""}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/50">
                    No users found matching query.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto border border-[#f0e3d1] dark:border-white/10 rounded-xl">
                    <table className="admin-table w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#e6d8c5] bg-[#faf6f0] dark:bg-[#181c24] text-[#7f5a4f] dark:text-[#e7c98b]">
                          <th className="px-3 py-2 text-center w-12">
                            <input
                              type="checkbox"
                              checked={users.length > 0 && selectedUserIds.length === users.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds(users.map((u) => u._id));
                                } else {
                                  setSelectedUserIds([]);
                                }
                              }}
                              className="h-3.5 w-3.5 rounded"
                            />
                          </th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user._id} className="border-b border-[var(--admin-border)] last:border-none">
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUserIds((prev) => [...prev, user._id]);
                                  } else {
                                    setSelectedUserIds((prev) => prev.filter((id) => id !== user._id));
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">{user.name || "-"}</td>
                            <td className="px-3 py-2">{user.phone}</td>
                            <td className="px-3 py-2">{user.email || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70 flex justify-between items-center">
                  <span>{selectedUserIds.length} users selected</span>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="text-red-700 dark:text-red-300 font-bold hover:underline"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={handleSendCoupon}
                disabled={assigning || !selectedSendCouponId}
                className="admin-btn-primary rounded-xl px-6 py-2.5 text-sm font-semibold shadow disabled:opacity-50"
              >
                {assigning ? "Sending..." : "Send Coupon to Target Audience"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSendCouponId("");
                  setSelectedUserIds([]);
                  setAudienceType("all");
                  setUserSearch("");
                }}
                className="rounded-xl border border-[#d7bf9b] px-4 py-2.5 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
              >
                Reset Selection
              </button>
            </div>
          </div>
        )}
      </section>
      {activeTab === "manage" && showForm && (
        <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">
              {editingId ? "Edit Coupon" : "Create New Coupon"} <span className="text-sm font-normal">(Coupons should be related to existing Offers)</span>
            </h3>
            <button onClick={closeForm} className="p-1" title="Close form">
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">
                  Coupon Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={editingId ? form.code : "(Auto-Generated on save)"}
                  disabled={true}
                  placeholder="e.g., DIWALI50"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2 disabled:opacity-60"
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

            <div className="flex flex-wrap items-center gap-6">
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isWelcomeCoupon"
                  name="isWelcomeCoupon"
                  checked={form.isWelcomeCoupon}
                  onChange={handleChange}
                  className="rounded"
                />
                <label htmlFor="isWelcomeCoupon" className="font-medium flex items-center gap-1">
                  🎁 <span>Mark as Welcome Coupon</span>
                  <span className="ml-1 text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">(Signup par auto-assign)</span>
                </label>
              </div>
            </div>

            {form.isWelcomeCoupon && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <label className="mb-2 block font-medium text-amber-800 dark:text-amber-200">
                  🕐 Valid Days for User
                  <span className="ml-2 text-xs font-normal opacity-70">(Signup ke baad kitne din valid • 0 = unlimited)</span>
                </label>
                <input
                  type="number"
                  name="welcomeValidDays"
                  value={form.welcomeValidDays}
                  onChange={handleChange}
                  min="0"
                  placeholder="0 = unlimited"
                  className="w-full max-w-xs rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>
            )}

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
