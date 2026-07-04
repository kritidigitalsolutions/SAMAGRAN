
import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiEdit2, FiEye, FiMoreVertical, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import { getStoredAdmin } from "../utils/auth";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
const CUSTOMIZE_KIT_TYPE = "Customize";
const SAMAGRAN_KIT_TYPE = "Samagran kit";
const CUSTOMIZE_KIT_TYPES = [CUSTOMIZE_KIT_TYPE, "default"];
const SAMAGRAN_KIT_TYPES = [SAMAGRAN_KIT_TYPE, "special"];

const buildForm = () => ({
  kitType: CUSTOMIZE_KIT_TYPE,
  name: "",
  description: "",
  category: "",
  kitPrice: "",
  status: "active",
  festivalType: "",
  ritual: "",
});

const formatImageUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiOrigin}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalizeKitType = (kitType) => {
  if (CUSTOMIZE_KIT_TYPES.includes(kitType)) return CUSTOMIZE_KIT_TYPE;
  if (SAMAGRAN_KIT_TYPES.includes(kitType)) return SAMAGRAN_KIT_TYPE;
  return kitType || CUSTOMIZE_KIT_TYPE;
};

const isCustomizeKit = (kitType) => normalizeKitType(kitType) === CUSTOMIZE_KIT_TYPE;
const getAdminKitEndpointBase = (kitType) =>
  isCustomizeKit(kitType) ? "/admin/kits/default" : "/admin/kits/special";
const getKitTypeLabel = (kitType) => normalizeKitType(kitType);

export default function Kits() {
  const isSuperAdmin = useMemo(() => getStoredAdmin()?.role === "super", []);
  const [kits, setKits] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(buildForm());
  const [selectedItems, setSelectedItems] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [viewKit, setViewKit] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedKitIds, setSelectedKitIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedList = useMemo(
    () =>
      Object.entries(selectedItems)
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([product, quantity]) => ({
          product,
          quantity: Number(quantity),
        })),
    [selectedItems]
  );

  const totalPrice = useMemo(
    () =>
      selectedList.reduce((sum, entry) => {
        const product = products.find((item) => item._id === entry.product);
        return sum + Number(product?.pricing?.price || 0) * Number(entry.quantity || 0);
      }, 0),
    [products, selectedList]
  );

  const filteredKits = useMemo(() => {
    return kits.filter((kit) => {
      const byTab = activeTab === "all" ? true : normalizeKitType(kit.kitType) === activeTab;
      const byStatus = statusFilter === "all" ? true : (kit.status || "active") === statusFilter;
      const term = nameFilter.trim().toLowerCase();
      const byName = !term || String(kit.name || "").toLowerCase().includes(term);
      const byCategory = categoryFilter === "all" ? true : String(kit.category || "").toLowerCase() === categoryFilter;
      return byTab && byStatus && byName && byCategory;
    });
  }, [kits, activeTab, statusFilter, nameFilter, categoryFilter]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const name = String(product.title || "").toLowerCase();
      const category = String(product?.category?.name || "").toLowerCase();
      return name.includes(term) || category.includes(term);
    });
  }, [products, productSearch]);

  const pagedKits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredKits.slice(start, start + pageSize);
  }, [filteredKits, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filteredKits.length]);

  const categoryOptions = useMemo(() => {
    const fromProducts = products
      .map((product) => product?.category?.name)
      .filter(Boolean)
      .map((name) => String(name).trim());
    const fromKits = kits
      .map((kit) => kit?.category)
      .filter(Boolean)
      .map((name) => String(name).trim());
    return Array.from(new Set([...fromProducts, ...fromKits].filter(Boolean))).sort();
  }, [products, kits]);

  const fetchKits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [defaultRes, specialRes] = await Promise.all([
        API.get("/admin/kits/default", { params: { status: "all" } }),
        API.get("/admin/kits/special"),
      ]);

      const defaultKits = (defaultRes.data?.data || []).map((kit) => ({
        ...kit,
        kitType: normalizeKitType(kit.kitType),
      }));
      const specialKits = (specialRes.data?.data || []).map((kit) => ({
        ...kit,
        kitType: normalizeKitType(kit.kitType),
      }));

      setKits([...defaultKits, ...specialKits].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load kits.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      // const res = await API.get("/items", { params: { limit: 200, status: "active" } });
      const res = await API.get("/items", { params: { limit: 200, status: "all" } });
      setProducts(res.data?.data?.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchRituals = useCallback(async () => {
    try {
      const res = await API.get("/admin/rituals");
      setRituals(res.data?.data || []);
    } catch (err) {
      console.error("Unable to load rituals:", err.response?.data?.message || err.message);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchKits();
    fetchRituals();
  }, [fetchProducts, fetchKits, fetchRituals]);

  useEffect(() => {
    setSelectedKitIds((current) =>
      current.filter((kitId) => kits.some((kit) => kit._id === kitId))
    );
  }, [kits]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-kit-menu], [data-table-menu-popover]")) {
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
    setForm(buildForm());
    setSelectedItems({});
    setImageFile(null);
    setEditingKit(null);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleItem = (productId, checked) => {
    setSelectedItems((current) => {
      const next = { ...current };
      if (checked) {
        next[productId] = next[productId] || 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const updateQuantity = (productId, quantity) => {
    setSelectedItems((current) => ({
      ...current,
      [productId]: Math.max(Number(quantity || 1), 1),
    }));
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleEdit = async (kit) => {
    try {
      setError("");
      const isDefault = isCustomizeKit(kit.kitType);
      const detailRes = await API.get(
        isDefault ? `/admin/kits/default/${kit._id}` : `/admin/kits/special/${kit._id}`
      );
      const detail = detailRes.data?.data || kit;

      setForm({
        kitType: isDefault ? CUSTOMIZE_KIT_TYPE : SAMAGRAN_KIT_TYPE,
        name: detail.name || "",
        description: detail.description || "",
        category: detail.category || "",
        kitPrice: detail.kitPrice ?? "",
        status: detail.status || "active",
        festivalType: detail.festivalType || "",
        ritual: detail.ritual?._id || detail.ritual || "",
      });

      const mapped = {};
      (detail.items || []).forEach((entry) => {
        const productId = entry.product?._id || entry.product || entry.id;
        if (productId) mapped[productId] = Number(entry.quantity || 1);
      });
      setSelectedItems(mapped);
      setImageFile(null);
      setEditingKit(kit);
      setShowForm(true);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load kit details for editing.");
    }
  };

  const handleDelete = async (kit) => {
    if (!window.confirm(`Delete ${kit.name}?`)) return;

    try {
      const endpoint = isCustomizeKit(kit.kitType)
        ? `/admin/kits/default/${kit._id}`
        : `/admin/kits/special/${kit._id}`;
      await API.delete(endpoint);
      setSuccess("Kit deleted successfully.");
      setKits((current) => current.filter((entry) => entry._id !== kit._id));
      setSelectedKitIds((current) => current.filter((id) => id !== kit._id));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete kit.");
    }
  };

  const handleView = async (kit) => {
    try {
      const isDefault = isCustomizeKit(kit.kitType);
      const detailRes = await API.get(
        isDefault ? `/admin/kits/default/${kit._id}` : `/admin/kits/special/${kit._id}`
      );
      const detail = detailRes.data?.data || kit;
      setViewKit({
        ...detail,
        kitType: isDefault ? CUSTOMIZE_KIT_TYPE : SAMAGRAN_KIT_TYPE,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load kit details.");
    }
  };

  const handleToggleStatus = async (kit) => {
    try {
      const nextStatus = (kit.status || "active") === "active" ? "inactive" : "active";
      const endpoint = isCustomizeKit(kit.kitType)
        ? `/admin/kits/default/${kit._id}`
        : `/admin/kits/special/${kit._id}`;

      const formData = new FormData();
      formData.append("status", nextStatus);
      await API.put(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setKits((current) =>
        current.map((entry) => (entry._id === kit._id ? { ...entry, status: nextStatus } : entry))
      );
      setSuccess(`Kit marked ${nextStatus}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update kit status.");
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedKitIds.length) return;
    if (!window.confirm(`Delete ${selectedKitIds.length} selected kits?`)) return;

    try {
      setError("");
      setSuccess("");
      const selectedKits = kits.filter((kit) => selectedKitIds.includes(kit._id));

      await Promise.all(
        selectedKits.map((kit) => {
          const endpoint = isCustomizeKit(kit.kitType)
            ? `/admin/kits/default/${kit._id}`
            : `/admin/kits/special/${kit._id}`;
          return API.delete(endpoint);
        })
      );

      setKits((current) => current.filter((entry) => !selectedKitIds.includes(entry._id)));
      setSelectedKitIds([]);
      setSuccess("Selected kits deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected kits.");
    }
  };

  const toggleKitSelection = (kitId, checked) => {
    setSelectedKitIds((current) => {
      if (checked) {
        return current.includes(kitId) ? current : [...current, kitId];
      }
      return current.filter((id) => id !== kitId);
    });
  };

  const toggleAllKits = (checked) => {
    if (checked) {
      setSelectedKitIds(filteredKits.map((kit) => kit._id));
      return;
    }
    setSelectedKitIds([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.kitPrice || !selectedList.length) {
      setError("Name, kit price and at least one product are required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category.trim());
      formData.append("kitPrice", Number(form.kitPrice));
      formData.append("status", form.status);
      formData.append("items", JSON.stringify(selectedList));
      formData.append("ritual", form.ritual || "");
      if (normalizeKitType(form.kitType) === SAMAGRAN_KIT_TYPE) {
        formData.append("festivalType", form.festivalType.trim());
      }
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const isEdit = Boolean(editingKit?._id);
      const endpointBase = getAdminKitEndpointBase(form.kitType);

      if (isEdit) {
        const currentType = normalizeKitType(editingKit.kitType);
        const nextType = normalizeKitType(form.kitType);
        if (currentType === nextType) {
          await API.put(`${endpointBase}/${editingKit._id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const currentEndpointBase = getAdminKitEndpointBase(currentType);
          await API.post(endpointBase, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          await API.delete(`${currentEndpointBase}/${editingKit._id}`);
        }
      } else {
        await API.post(endpointBase, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setSuccess(isEdit ? "Kit updated successfully." : "Kit created successfully.");
      closeForm();
      await fetchKits();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save kit.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setNameFilter("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setActiveTab("all");
  };

  const statusPillClass = (status) => {
    if (status === "inactive") {
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    }
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  };

  const getKitCode = (kit) => {
    const raw = String(kit?._id || "");
    if (!raw) return "KIT-NA";
    return `KIT-${raw.slice(-6).toUpperCase()}`;
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Kits</p>
            <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Products & Kits</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">Customize aur Samagran kits ko ek hi panel se manage karein.</p>
          </div>
          <button type="button" onClick={handleCreate} className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow">
            <FiPlus className="h-4 w-4" /> Add Kit
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
        <form onSubmit={handleSubmit} className="grid gap-6 rounded-3xl border border-[#303745] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-4 rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingKit ? "Edit Kit" : "Create Kit"}</h3>
              <button type="button" onClick={closeForm} className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20">
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kit Type</label>
              <select name="kitType" value={form.kitType} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white text-black px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#171b23] dark:text-white">
                <option value={CUSTOMIZE_KIT_TYPE}>Customize Kit</option>
                <option value={SAMAGRAN_KIT_TYPE}>Samagran Kit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kit Name</label>
              <input name="name" value={form.name} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Associated Ritual (Optional)</label>
              <select
                name="ritual"
                value={form.ritual || ""}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white text-black px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white"
              >
                <option value="">-- None / Select Ritual --</option>
                {rituals.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <input
                name="category"
                list="kit-category-list"
                value={form.category}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black"
                placeholder="e.g. Pooja Essentials"
              />
              <datalist id="kit-category-list">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            {normalizeKitType(form.kitType) === SAMAGRAN_KIT_TYPE && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Samagran/Festival Type</label>
                <input name="festivalType" value={form.festivalType} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" placeholder="e.g. Diwali" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea name="description" rows={3} value={form.description} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kit Price</label>
                <input type="number" min="0" name="kitPrice" value={form.kitPrice} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image (optional)</label>
              <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-[#d9c3a2] bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>

            <div className="rounded-2xl border border-[#d9c3a2]/60 bg-[#fff8eb] p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between"><span>Products total</span><strong>{formatCurrency(totalPrice)}</strong></div>
              <div className="mt-2 flex items-center justify-between"><span>Kit price</span><strong>{formatCurrency(form.kitPrice)}</strong></div>
              <div className="mt-2 flex items-center justify-between text-emerald-700 dark:text-emerald-300"><span>User savings</span><strong>{formatCurrency(Math.max(totalPrice - Number(form.kitPrice || 0), 0))}</strong></div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={closeForm} className="w-full rounded-2xl border border-[#d9c3a2] bg-white px-4 py-3 text-sm font-semibold text-[#7b3a4b] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black">Cancel</button>
              <button type="submit" disabled={submitting} className="admin-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow disabled:opacity-60">{submitting ? "Saving..." : editingKit ? "Save Changes" : "Create Kit"}</button>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Select Products</h3>
              <span className="text-xs text-[#7b5a4e] dark:text-[#f7e3c0]/70">{selectedList.length} selected</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="text-[var(--admin-primary)]" />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search products by name or category"
                className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[var(--admin-surface)] dark:text-[var(--admin-primary)]"
                  aria-label="Clear product search"
                >
                  <FiX />
                </button>
              )}
            </div>

            {loadingProducts ? (
              <div className="rounded-xl bg-white/70 p-4 text-sm dark:bg-[#16181d] dark:text-white text-black">Loading products...</div>
            ) : (
              <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
                {filteredProducts.map((product) => {
                  const selected = Object.prototype.hasOwnProperty.call(selectedItems, product._id);
                  const quantity = selectedItems[product._id] || 1;

                  return (
                    <div key={product._id} className={`rounded-2xl border p-3 ${selected ? "border-[#8995ac] bg-[#8B1E3F]/6" : "dark:border-[#303745] bg-gray"}`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selected} onChange={(event) => toggleItem(product._id, event.target.checked)} className="mt-1 h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{product.title}</p>
                          <p className="text-xs text-[#6f4b42] dark:text-white">{formatCurrency(product?.pricing?.price)}</p>
                        </div>
                        {selected && (
                          <input type="number" min="1" value={quantity} onChange={(event) => updateQuantity(product._id, event.target.value)} className="w-20 rounded-lg border border-[#303745] dark:bg-[#23272e] dark:text-[#fff] text-[black] px-2 py-1 text-sm" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      )}

      {viewKit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-[#d9c3a2] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#12151b]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Kit Details</h3>
              <button
                type="button"
                onClick={() => setViewKit(null)}
                className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Kit Code</p>
                <p className="font-mono text-sm">{getKitCode(viewKit)}</p>
              </div>
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Category</p>
                <p className="font-semibold">{viewKit.category || "-"}</p>
              </div>
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Type</p>
                <p className="font-semibold">{viewKit.kitType ? getKitTypeLabel(viewKit.kitType) : "-"}</p>
              </div>
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Status</p>
                <p className="capitalize font-semibold">{viewKit.status || "active"}</p>
              </div>
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Kit Price</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(viewKit.kitPrice)}</p>
              </div>
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Total Items</p>
                <p className="font-semibold">{Array.isArray(viewKit.items) ? viewKit.items.length : 0}</p>
              </div>
              <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Festival Type</p>
                <p className="font-semibold">{viewKit.festivalType || "-"}</p>
              </div>
              {viewKit.ritual && (
                <div className="rounded-xl border border-[#e8d7bf] bg-[#fff7ea] px-3 py-2 dark:border-white/10 dark:bg-white/5 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8b6b5b]">Associated Ritual</p>
                  <p className="font-semibold">{viewKit.ritual.title || "-"}</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-[#e8d7bf] bg-[#fff7ea] p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b6b5b]">Kit Name</p>
              <p className="mt-1 text-base font-semibold">{viewKit.name}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#8b6b5b]">Description</p>
              <p className="mt-1 text-[#5b3a35] dark:text-[#f7e3c0]">{viewKit.description || "No description"}</p>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Kit Items</p>
                <p className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                  {Array.isArray(viewKit.items) ? viewKit.items.length : 0} items
                </p>
              </div>
              <div className="grid max-h-[44vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {(viewKit.items || []).map((entry, itemIndex) => {
                  const item = entry?.product || {};
                  const image = item?.thumbnail || item?.image || item?.media?.image?.[0] || item?.products?.[0];

                  return (
                    <div key={`${viewKit._id}-${itemIndex}`} className="rounded-xl border border-[#e8d7bf] bg-white p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex gap-3">
                        {image ? (
                          <img
                            src={formatImageUrl(image)}
                            alt={item?.title || item?.name || "Item"}
                            className="h-16 w-16 rounded-lg border border-[#d8c4a5] object-cover dark:border-white/10"
                          />
                        ) : (
                          <div className="grid h-16 w-16 place-items-center rounded-lg bg-[#f8ecda] text-xs text-[#7b5a4e] dark:bg-white/10">
                            No Img
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item?.title || item?.name || "Item"}</p>
                          <p className="mt-0.5 text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                            Code: {item?.itemCode || "-"}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <span className="text-[#7c5b4b] dark:text-[#dbcdb8]/70">Qty:</span>
                            <strong>{Number(entry?.quantity || 0)}</strong>
                            <span className="text-[#7c5b4b] dark:text-[#dbcdb8]/70">Unit Price:</span>
                            <strong>{formatCurrency(item?.pricing?.price || item?.price || 0)}</strong>
                            <span className="text-[#7c5b4b] dark:text-[#dbcdb8]/70">Category:</span>
                            <strong className="truncate">{item?.category?.name || "-"}</strong>
                            <span className="text-[#7c5b4b] dark:text-[#dbcdb8]/70">Stock:</span>
                            <strong>{item?.stock?.quantity ?? "-"}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[#d8c4a5] bg-white/70 p-1 text-sm dark:border-white/10 dark:bg-white/5">
            {[
              { key: "all", label: "All Kits" },
              { key: CUSTOMIZE_KIT_TYPE, label: "Customize Kits" },
              { key: SAMAGRAN_KIT_TYPE, label: "Samagran Kits" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3 py-1.5 font-medium ${
                  activeTab === tab.key
                    ? "bg-[#8B1E3F] text-white"
                    : "text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:text-[#f7e3c0]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchKits}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
          >
            <FiRefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[180px_180px_220px_1fr_auto_auto]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
          >
            <option value="all">All Types</option>
            <option value={CUSTOMIZE_KIT_TYPE}>Customize</option>
            <option value={SAMAGRAN_KIT_TYPE}>Samagran Kit</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option.toLowerCase()}>{option}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[var(--admin-primary)]" />
            <input
              type="search"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Search kits by name"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="h-11 rounded-xl border border-[#d7bf9b] px-4 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={!selectedKitIds.length}
            className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          >
            Delete Selected
          </button>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading kits...</p>
        ) : !filteredKits.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">No kits found.</p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table text-left min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                  <th className="text-center py-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={filteredKits.length > 0 && selectedKitIds.length === filteredKits.length}
                      onChange={(event) => toggleAllKits(event.target.checked)}
                      className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">S.No</th>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Kit Code</th>
                  <th className="px-4 py-3 font-semibold">Kit</th>
                  {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Festival Type</th>
                  <th className="px-4 py-3 font-semibold">Kit Price</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedKits.map((kit, index) => (
                  <tr key={kit._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                    <td className="text-center px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedKitIds.includes(kit._id)}
                        onChange={(event) => toggleKitSelection(kit._id, event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3">
                      {kit.image ? (
                        <img src={formatImageUrl(kit.image)} alt={kit.name} className="h-10 w-10 rounded-lg border border-[#D4AF37]/30 object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f8ecda] text-xs text-[#7b5a4e]">No</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">
                      {getKitCode(kit)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc] max-w-[300px]" titile={kit.name}> <span className="line-clamp-2">{kit.name}</span></p>
                        <p className="line-clamp-1 max-w-[260px] text-xs text-[#7a5a4c] dark:text-[#f7e3c0]/70">{kit.description || "No description"}</p>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {kit.vendorId ? (
                          <>
                            <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                              {kit.vendorId.businessName || kit.vendorId.name || "N/A"}
                            </p>
                            <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">
                              ID: {String(kit.vendorId._id || "").slice(-6).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                              {[kit.vendorId.address?.city, kit.vendorId.address?.state].filter(Boolean).join(", ")}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Super Admin / System</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{kit.category || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${isCustomizeKit(kit.kitType) ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                        {getKitTypeLabel(kit.kitType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{kit.festivalType || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(kit.kitPrice)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusPillClass(kit.status || "active")}`}>
                        {kit.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" data-kit-menu>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(event) => {
                            const nextId = openMenuId === kit._id ? "" : kit._id;
                            setOpenMenuId(nextId);
                            setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === kit._id && (
                          <TableMenuPopover
                            open
                            anchorRect={menuAnchorRect}
                            preferUp={index >= pagedKits.length - 3}
                            onClose={() => setOpenMenuId("")}
                            className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleView(kit);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEye className="text-[#6f3945]" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleEdit(kit);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEdit2 className="text-[#6f3945]" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleToggleStatus(kit);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <span className="text-[#6f3945]">
                                {kit.status === "inactive" ? "Mark Active" : "Mark Inactive"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleDelete(kit);
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
              total={filteredKits.length}
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

