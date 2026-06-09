import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiEdit2,
  FiMoreVertical,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
  FiInfo,
  FiDownload,
  FiFolder,
  FiGrid,
  FiDollarSign,
  FiPercent,
  FiPieChart,
  FiEye,
} from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const initialForm = {
  categoryId: "",
  subCategory: "All",
  customSubCategory: "",
  commissionType: "Percentage (%)",
  base: "Profit (Selling - Purchase)",
  partnerSharePercent: 60,
  partnerShareFlat: 60,
  superAdminSharePercent: 40,
  superAdminShareFlat: 40,
  status: "active",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CategoryCommissionPage() {
  const [commissions, setCommissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalSubCategories: 0,
    totalPartnerPayout: 0,
    totalSamagranAmount: 0,
    avgPartnerShare: 60.0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingCommission, setViewingCommission] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all"); // Visual placeholder matching mockup

  // Fetch unique categories (for select options)
  const fetchCategoriesList = async () => {
    try {
      const res = await API.get("/admin/categories", { params: { status: "active" } });
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await API.get("/admin/category-commissions/stats");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load statistics", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch all commissions
  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/category-commissions", {
        params: {
          search: searchTerm,
          status: statusFilter,
          subCategory: subCategoryFilter,
        },
      });
      if (res.data?.success) {
        setCommissions(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load category commissions.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, subCategoryFilter]);

  useEffect(() => {
    fetchCategoriesList();
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchCommissions, 300);
    return () => clearTimeout(timer);
  }, [fetchCommissions]);

  // Unique subcategories list for filter dropdown
  const filterSubCategoryOptions = useMemo(() => {
    const subs = new Set();
    commissions.forEach((c) => {
      if (c.subCategory) subs.add(c.subCategory);
    });
    return ["All", ...Array.from(subs)];
  }, [commissions]);

  // Subcategories available for selected category in form
  const formSubCategoryOptions = useMemo(() => {
    if (!form.categoryId) return ["All Sub Categories"];
    const matchedCategory = categories.find((c) => c._id === form.categoryId);
    const options = ["All Sub Categories"];
    if (matchedCategory?.subCategory && matchedCategory.subCategory.trim()) {
      options.push(matchedCategory.subCategory.trim());
    }
    return options;
  }, [form.categoryId, categories]);

  // Handle Form changes & auto calculations
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // Automatic interactive share calculations
      if (name === "commissionType") {
        if (value === "Percentage (%)") {
          // Reset to standard percentage defaults
          next.partnerSharePercent = 60;
          next.superAdminSharePercent = 40;
          next.partnerShareFlat = 60;
          next.superAdminShareFlat = 40;
        } else {
          // Reset to standard flat defaults
          next.partnerShareFlat = 70;
          next.superAdminShareFlat = 30;
          next.partnerSharePercent = 70;
          next.superAdminSharePercent = 30;
        }
      }

      if (name === "partnerSharePercent") {
        const val = Math.min(Math.max(Number(value) || 0, 0), 100);
        next.partnerSharePercent = val;
        next.superAdminSharePercent = Number((100 - val).toFixed(2));
        next.partnerShareFlat = val;
        next.superAdminShareFlat = next.superAdminSharePercent;
      }

      if (name === "superAdminSharePercent") {
        const val = Math.min(Math.max(Number(value) || 0, 0), 100);
        next.superAdminSharePercent = val;
        next.partnerSharePercent = Number((100 - val).toFixed(2));
        next.partnerShareFlat = next.partnerSharePercent;
        next.superAdminShareFlat = val;
      }

      if (name === "partnerShareFlat") {
        const pFlat = Math.max(Number(value) || 0, 0);
        const saFlat = Number(prev.superAdminShareFlat) || 0;
        const total = pFlat + saFlat;
        next.partnerShareFlat = pFlat;
        if (total > 0) {
          next.partnerSharePercent = Number(((pFlat / total) * 100).toFixed(2));
          next.superAdminSharePercent = Number(((saFlat / total) * 100).toFixed(2));
        }
      }

      if (name === "superAdminShareFlat") {
        const saFlat = Math.max(Number(value) || 0, 0);
        const pFlat = Number(prev.partnerShareFlat) || 0;
        const total = pFlat + saFlat;
        next.superAdminShareFlat = saFlat;
        if (total > 0) {
          next.partnerSharePercent = Number(((pFlat / total) * 100).toFixed(2));
          next.superAdminSharePercent = Number(((saFlat / total) * 100).toFixed(2));
        }
      }

      return next;
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
    setError("");
    setSuccess("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (commission) => {
    const matchedCategory = categories.find((c) => c.name === commission.categoryName);
    
    // Check if the current subCategory is a default one
    const isCustomSub = commission.subCategory !== "All" && commission.subCategory !== "All Sub Categories" &&
      (!matchedCategory || matchedCategory.subCategory !== commission.subCategory);

    setForm({
      categoryId: matchedCategory?._id || commission.categoryId?._id || commission.categoryId || "",
      subCategory: isCustomSub ? "Custom" : (commission.subCategory === "All" ? "All Sub Categories" : commission.subCategory),
      customSubCategory: isCustomSub ? commission.subCategory : "",
      commissionType: commission.commissionType,
      base: commission.base,
      partnerSharePercent: commission.partnerSharePercent,
      partnerShareFlat: commission.partnerShareFlat,
      superAdminSharePercent: commission.superAdminSharePercent,
      superAdminShareFlat: commission.superAdminShareFlat,
      status: commission.status,
    });
    setEditingId(commission._id);
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const finalSubCategory = form.subCategory === "Custom" 
        ? form.customSubCategory.trim() 
        : (form.subCategory === "All Sub Categories" ? "All" : form.subCategory);

      if (!finalSubCategory) {
        setError("Please enter a custom subcategory name.");
        setSubmitting(false);
        return;
      }

      const payload = {
        categoryId: form.categoryId,
        subCategory: finalSubCategory,
        commissionType: form.commissionType,
        base: form.base,
        partnerSharePercent: Number(form.partnerSharePercent) || 0,
        partnerShareFlat: Number(form.partnerShareFlat) || 0,
        superAdminSharePercent: Number(form.superAdminSharePercent) || 0,
        superAdminShareFlat: Number(form.superAdminShareFlat) || 0,
        status: form.status,
      };

      if (editingId) {
        await API.put(`/admin/category-commissions/${editingId}`, payload);
        setSuccess("Commission settings updated successfully.");
      } else {
        await API.post("/admin/category-commissions", payload);
        setSuccess("Commission settings added successfully.");
      }

      await fetchCommissions();
      await fetchStats();
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save commission settings.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commission) => {
    if (!commission?._id) return;
    if (!window.confirm(`Are you sure you want to delete commission setting for "${commission.categoryName}" - "${commission.subCategory}"?`)) return;

    try {
      setError("");
      setSuccess("");
      await API.delete(`/admin/category-commissions/${commission._id}`);
      setCommissions((current) => current.filter((c) => c._id !== commission._id));
      setSuccess("Commission setting deleted successfully.");
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete commission setting.");
    }
  };

  const handleToggleStatus = async (commission) => {
    if (!commission?._id) return;
    const nextStatus = commission.status === "active" ? "inactive" : "active";

    try {
      await API.put(`/admin/category-commissions/${commission._id}`, { status: nextStatus });
      setCommissions((current) =>
        current.map((c) => (c._id === commission._id ? { ...c, status: nextStatus } : c))
      );
      setSuccess("Commission status updated.");
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update status.");
    }
  };

  const handleExportCSV = () => {
    if (!commissions.length) return;

    const headers = [
      "Category",
      "Sub Category",
      "Commission Type",
      "Base",
      "Partner Share (%)",
      "Partner Share (INR)",
      "Samagran Share (%)",
      "Samagran Share (INR)",
      "Status",
    ];

    const rows = commissions.map((c) => [
      c.categoryName,
      c.subCategory,
      c.commissionType,
      c.base,
      `${c.partnerSharePercent}%`,
      `INR ${c.partnerShareFlat}`,
      `${c.superAdminSharePercent}%`,
      `INR ${c.superAdminShareFlat}`,
      c.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "category_commission_structure.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pagedCommissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return commissions.slice(start, start + pageSize);
  }, [commissions, page, pageSize]);

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      {/* Top Banner / Heading */}
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">
              SUPER ADMIN PANEL
            </p>
            <h2 className="mt-2 text-2xl font-bold">Category Commission</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Manage category and subcategory commission structure for all partners.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
            >
              <FiDownload className="h-4 w-4" /> Export
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow"
            >
              <FiPlus className="h-4 w-4" /> Add Commission
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Categories */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-xl">
            <FiFolder className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)]">Total Categories</p>
            <p className="text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc] mt-0.5">
              {statsLoading ? "..." : stats.totalCategories}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">Active categories</p>
          </div>
        </div>

        {/* Total Sub Categories */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-xl">
            <FiGrid className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)]">Total Sub Categories</p>
            <p className="text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc] mt-0.5">
              {statsLoading ? "..." : stats.totalSubCategories}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">Active sub categories</p>
          </div>
        </div>

        {/* Total Partner Payout */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-xl">
            <FiDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)]">Total Partner Payout</p>
            <p className="text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc] mt-0.5">
              {statsLoading ? "..." : formatCurrency(stats.totalPartnerPayout)}
            </p>
            <p className="text-xs text-[var(--admin-muted)] mt-0.5">This month</p>
          </div>
        </div>

        {/* Total Samagran Amount */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-500/10 text-purple-600 rounded-xl">
            <FiPieChart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)]">Total Samagran Amount</p>
            <p className="text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc] mt-0.5">
              {statsLoading ? "..." : formatCurrency(stats.totalSamagranAmount)}
            </p>
            <p className="text-xs text-[var(--admin-muted)] mt-0.5">This month</p>
          </div>
        </div>

        {/* Avg. Partner Share */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-600 rounded-xl">
            <FiPercent className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)]">Avg. Partner Share</p>
            <p className="text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc] mt-0.5">
              {statsLoading ? "..." : `${stats.avgPartnerShare.toFixed(2)}%`}
            </p>
            <p className="text-xs text-[var(--admin-muted)] mt-0.5">Across all categories</p>
          </div>
        </div>
      </section>

      {/* Notifications */}
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

      {/* Modal / Create & Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl rounded-3xl border border-[#d9c3a2]/60 bg-white p-6 shadow-[var(--admin-shadow)] dark:border-white/10 dark:bg-[#1a1d24] text-left"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#e6d8c5]/55 dark:border-white/15">
              <h3 className="text-xl font-bold">{editingId ? "Edit Commission" : "Add Commission"}</h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20 dark:text-white"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 mt-4 md:grid-cols-2">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white"
                  required
                  disabled={!!editingId}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sub Category</label>
                <select
                  name="subCategory"
                  value={form.subCategory}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white"
                  required
                >
                  {formSubCategoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="Custom">Custom Sub Category...</option>
                </select>
              </div>

              {/* Custom Subcategory input */}
              {form.subCategory === "Custom" && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Custom Sub Category Name</label>
                  <input
                    type="text"
                    name="customSubCategory"
                    value={form.customSubCategory}
                    onChange={handleFormChange}
                    placeholder="Enter sub-category name"
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                    required
                  />
                </div>
              )}

              {/* Commission Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Commission Type</label>
                <select
                  name="commissionType"
                  value={form.commissionType}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white"
                  required
                >
                  <option value="Percentage (%)">Percentage (%)</option>
                  <option value="Flat Amount (₹)">Flat Amount (₹)</option>
                </select>
              </div>

              {/* Base */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Base</label>
                <select
                  name="base"
                  value={form.base}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white"
                  required
                >
                  <option value="Profit (Selling - Purchase)">Profit (Selling - Purchase)</option>
                  <option value="Selling Price">Selling Price</option>
                </select>
              </div>

              {/* Partner Share Inputs */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Partner Share (%)</label>
                <input
                  type="number"
                  name="partnerSharePercent"
                  value={form.partnerSharePercent}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  disabled={form.commissionType === "Flat Amount (₹)"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Partner Share (₹)</label>
                <input
                  type="number"
                  name="partnerShareFlat"
                  value={form.partnerShareFlat}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  min="0"
                  step="0.01"
                  required
                  disabled={form.commissionType === "Percentage (%)"}
                />
              </div>

              {/* Samagran Share Inputs */}
              <div className="space-y-2">
                <label className="text-sm font-medium">SuperAdmin Share (%)</label>
                <input
                  type="number"
                  name="superAdminSharePercent"
                  value={form.superAdminSharePercent}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  disabled={form.commissionType === "Flat Amount (₹)"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">SuperAdmin Share (₹)</label>
                <input
                  type="number"
                  name="superAdminShareFlat"
                  value={form.superAdminShareFlat}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  min="0"
                  step="0.01"
                  required
                  disabled={form.commissionType === "Percentage (%)"}
                />
              </div>

              {/* Status */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closeForm}
                className="w-full rounded-2xl border border-[#d9c3a2] bg-white px-4 py-3 text-sm font-semibold text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20 dark:bg-black/20 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow disabled:opacity-60"
              >
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Commission"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail View Modal */}
      {viewingCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg rounded-3xl border border-[#d9c3a2]/60 bg-white p-6 shadow-[var(--admin-shadow)] dark:border-white/10 dark:bg-[#1a1d24] text-left">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6d8c5]/55 dark:border-white/15">
              <h3 className="text-xl font-bold">Commission Rule Details</h3>
              <button
                type="button"
                onClick={() => setViewingCommission(null)}
                className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20 dark:text-white"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Category</span>
                <span className="text-sm font-bold">{viewingCommission.categoryName}</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Sub Category</span>
                <span className="text-sm">{viewingCommission.subCategory}</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Commission Type</span>
                <span className="text-sm font-semibold">{viewingCommission.commissionType}</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Base</span>
                <span className="text-sm text-[var(--admin-muted)]">{viewingCommission.base}</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Partner Share (%)</span>
                <span className="text-sm font-semibold text-emerald-600">{viewingCommission.partnerSharePercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Partner Share (₹)</span>
                <span className="text-sm font-bold text-emerald-600">₹{viewingCommission.partnerShareFlat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Samagran Share (%)</span>
                <span className="text-sm font-semibold text-[var(--admin-primary)]">{viewingCommission.superAdminSharePercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between border-b border-[#f0e3d1]/60 py-2 dark:border-white/5">
                <span className="font-semibold text-sm opacity-80">Samagran Share (₹)</span>
                <span className="text-sm font-bold text-[var(--admin-primary)]">₹{viewingCommission.superAdminShareFlat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold text-sm opacity-80">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${viewingCommission.status === "inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {viewingCommission.status}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingCommission(null)}
              className="admin-btn-primary w-full rounded-2xl px-4 py-3 mt-6 text-sm font-semibold shadow"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        {/* Filters Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5 w-full md:w-80">
            <FiSearch className="text-[var(--admin-primary)]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category or sub category..."
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subcategory Filter */}
            <select
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
            >
              <option value="all">Sub Category: All</option>
              {filterSubCategoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {/* City Filter (placeholder from mockup) */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
            >
              <option value="all">Select city: All Cities</option>
              <option value="delhi">Delhi</option>
              <option value="mumbai">Mumbai</option>
              <option value="bangalore">Bangalore</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              type="button"
              onClick={fetchCommissions}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] h-11"
            >
              <FiRefreshCw className="h-4 w-4" /> Filter
            </button>
          </div>
        </div>

        {/* Table data loading */}
        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5 text-center">
            Loading category commissions...
          </p>
        ) : !commissions.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5 text-center">
            No commission configurations found.
          </p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-4 py-3 font-semibold text-left">#</th>
                    <th className="px-4 py-3 font-semibold text-left">Category</th>
                    <th className="px-4 py-3 font-semibold text-left">Sub Category</th>
                    <th className="px-4 py-3 font-semibold text-left">Commission Type</th>
                    <th className="px-4 py-3 font-semibold text-left">Base</th>
                    <th className="px-4 py-3 font-semibold text-center">Partner Share (%)</th>
                    <th className="px-4 py-3 font-semibold text-center">Partner Share (₹)</th>
                    <th className="px-4 py-3 font-semibold text-center">Samagran Share (%)</th>
                    <th className="px-4 py-3 font-semibold text-center">Samagran Amount (₹)</th>
                    <th className="px-4 py-3 font-semibold text-left">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCommissions.map((commission, index) => (
                    <tr
                      key={commission._id}
                      className="border-b border-[#f0e3d1] align-middle last:border-none dark:border-white/10"
                    >
                      <td className="px-4 py-4 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                        {commission.categoryName}
                      </td>
                      <td className="px-4 py-4 text-[#6f3945] dark:text-[#f7e3c0]">
                        {commission.subCategory}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold">
                        {commission.commissionType}
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--admin-muted)] max-w-[150px]">
                        {commission.base}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                        {commission.partnerSharePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600">
                        ₹{commission.partnerShareFlat.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                        {commission.superAdminSharePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-[var(--admin-primary)]">
                        ₹{commission.superAdminShareFlat.toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                            commission.status === "inactive"
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {commission.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(e) => {
                              const nextId = openMenuId === commission._id ? "" : commission._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(nextId ? e.currentTarget.getBoundingClientRect() : null);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === commission._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedCommissions.length - 2}
                              onClose={() => setOpenMenuId("")}
                              className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  setViewingCommission(commission);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEye className="text-[#6f3945]" /> View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(commission);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleToggleStatus(commission);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <span className="text-[#6f3945]">
                                  {commission.status === "inactive" ? "Mark Active" : "Mark Inactive"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDelete(commission);
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
              total={commissions.length}
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

      {/* Info Card at Bottom */}
      <section className="rounded-2xl border border-red-200/60 bg-red-50/50 dark:border-white/10 dark:bg-white/5 p-5 shadow-sm text-left flex gap-3 items-start">
        <div className="p-1 bg-[#8B1E3F] text-white rounded-full mt-0.5">
          <FiInfo className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-[#8B1E3F] dark:text-[#e7c98b]">About Commission Calculation</h4>
          <p className="text-xs text-[#6e4b40] dark:text-[#f7e3c0]/75">
            Commission is calculated on **Profit (Selling Price - Purchase Price)**.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-xs">
            <span className="text-[#6e4b40] dark:text-[#f7e3c0]/75 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block"></span>
              **Partner Share**: Amount or percentage paid to our partners (Vendors/Franchisees/Partners).
            </span>
            <span className="text-[#6e4b40] dark:text-[#f7e3c0]/75 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8B1E3F] inline-block"></span>
              **Samagran Share**: Our platform share from the profit.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
