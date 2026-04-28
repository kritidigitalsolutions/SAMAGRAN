
import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const buildForm = () => ({
  kitType: "default",
  name: "",
  description: "",
  kitPrice: "",
  status: "active",
  festivalType: "",
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

const getAdminKitEndpointBase = (kitType) =>
  kitType === "default" ? "/admin/default-kits" : "/admin/kits";

export default function Kits() {
  const [kits, setKits] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(buildForm());
  const [selectedItems, setSelectedItems] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      const byTab = activeTab === "all" ? true : kit.kitType === activeTab;
      const byStatus = statusFilter === "all" ? true : (kit.status || "active") === statusFilter;
      const term = searchTerm.trim().toLowerCase();
      const bySearch =
        !term ||
        String(kit.name || "").toLowerCase().includes(term) ||
        String(kit.description || "").toLowerCase().includes(term);
      return byTab && byStatus && bySearch;
    });
  }, [kits, activeTab, statusFilter, searchTerm]);

  const fetchKits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [defaultRes, specialRes] = await Promise.all([
        API.get("/admin/default-kits", { params: { status: "all" } }),
        API.get("/admin/kits"),
      ]);

      const defaultKits = (defaultRes.data?.data || []).map((kit) => ({
        ...kit,
        kitType: "default",
      }));
      const specialKits = (specialRes.data?.data || []).map((kit) => ({
        ...kit,
        kitType: "special",
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
      const res = await API.get("/items", { params: { limit: 200, status: "active" } });
      setProducts(res.data?.data?.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchKits();
  }, [fetchProducts, fetchKits]);

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
      const isDefault = kit.kitType === "default";
      const detailRes = await API.get(
        isDefault ? `/admin/default-kits/${kit._id}` : `/admin/kits/${kit._id}`
      );
      const detail = detailRes.data?.data || kit;

      setForm({
        kitType: isDefault ? "default" : "special",
        name: detail.name || "",
        description: detail.description || "",
        kitPrice: detail.kitPrice ?? "",
        status: detail.status || "active",
        festivalType: detail.festivalType || "",
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
      const endpoint = kit.kitType === "default" ? `/admin/default-kits/${kit._id}` : `/admin/kits/${kit._id}`;
      await API.delete(endpoint);
      setSuccess("Kit deleted successfully.");
      setKits((current) => current.filter((entry) => entry._id !== kit._id));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete kit.");
    }
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
      formData.append("kitPrice", Number(form.kitPrice));
      formData.append("status", form.status);
      formData.append("items", JSON.stringify(selectedList));
      if (form.kitType === "special") {
        formData.append("festivalType", form.festivalType.trim());
      }
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const isEdit = Boolean(editingKit?._id);
      const endpointBase = getAdminKitEndpointBase(form.kitType);

      if (isEdit) {
        const currentType = editingKit.kitType || "default";
        if (currentType === form.kitType) {
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
    setSearchTerm("");
    setStatusFilter("all");
    setActiveTab("all");
  };

  const statusPillClass = (status) => {
    if (status === "inactive") {
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
    }
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Kits</p>
            <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Products & Kits</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">Default aur Special kits ko ek hi panel se manage karein.</p>
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
        <form onSubmit={handleSubmit} className="grid gap-6 rounded-3xl border border-[#dcc7ab]/60 bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-4 rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingKit ? "Edit Kit" : "Create Kit"}</h3>
              <button type="button" onClick={closeForm} className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20">
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kit Type</label>
              <select name="kitType" value={form.kitType} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20">
                <option value="default">Default Kit</option>
                <option value="special">Special Kit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kit Name</label>
              <input name="name" value={form.name} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" required />
            </div>

            {form.kitType === "special" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Special/Festival Type</label>
                <input name="festivalType" value={form.festivalType} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" placeholder="e.g. Diwali" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea name="description" rows={3} value={form.description} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kit Price</label>
                <input type="number" min="0" name="kitPrice" value={form.kitPrice} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image (optional)</label>
              <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-[#d9c3a2] bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/20" />
            </div>

            <div className="rounded-2xl border border-[#d9c3a2]/60 bg-[#fff8eb] p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between"><span>Products total</span><strong>{formatCurrency(totalPrice)}</strong></div>
              <div className="mt-2 flex items-center justify-between"><span>Kit price</span><strong>{formatCurrency(form.kitPrice)}</strong></div>
              <div className="mt-2 flex items-center justify-between text-emerald-700 dark:text-emerald-300"><span>User savings</span><strong>{formatCurrency(Math.max(totalPrice - Number(form.kitPrice || 0), 0))}</strong></div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={closeForm} className="w-full rounded-2xl border border-[#d9c3a2] bg-white px-4 py-3 text-sm font-semibold text-[#7b3a4b] dark:border-white/20 dark:bg-black/20">Cancel</button>
              <button type="submit" disabled={submitting} className="admin-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow disabled:opacity-60">{submitting ? "Saving..." : editingKit ? "Save Changes" : "Create Kit"}</button>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Select Products</h3>
              <span className="text-xs text-[#7b5a4e] dark:text-[#f7e3c0]/70">{selectedList.length} selected</span>
            </div>

            {loadingProducts ? (
              <div className="rounded-xl bg-white/70 p-4 text-sm dark:bg-black/20">Loading products...</div>
            ) : (
              <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
                {products.map((product) => {
                  const selected = Object.prototype.hasOwnProperty.call(selectedItems, product._id);
                  const quantity = selectedItems[product._id] || 1;

                  return (
                    <div key={product._id} className={`rounded-2xl border p-3 ${selected ? "border-[#8B1E3F]/45 bg-[#8B1E3F]/6" : "border-[#e7d6bb] bg-white"}`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selected} onChange={(event) => toggleItem(product._id, event.target.checked)} className="mt-1 h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{product.title}</p>
                          <p className="text-xs text-[#6f4b42]">{formatCurrency(product?.pricing?.price)}</p>
                        </div>
                        {selected && (
                          <input type="number" min="1" value={quantity} onChange={(event) => updateQuantity(product._id, event.target.value)} className="w-20 rounded-lg border border-[#d7bf9b] px-2 py-1 text-sm" />
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

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[#d8c4a5] bg-white/70 p-1 text-sm dark:border-white/10 dark:bg-white/5">
            {[
              { key: "all", label: "All Kits" },
              { key: "default", label: "Default Kits" },
              { key: "special", label: "Special Kits" },
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

        <div className="mb-4 grid gap-3 md:grid-cols-[180px_180px_1fr_auto]">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#1e1e1e] dark:text-white dark:border-white/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#1e1e1e] dark:text-white dark:border-white/20"
          >
            <option value="all">All Types</option>
            <option value="default">Default</option>
            <option value="special">Special</option>
          </select>

          <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[var(--admin-primary)]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search kits by name or description"
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
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading kits...</p>
        ) : !filteredKits.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">No kits found.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kit</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Festival Type</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total Price</th>
                  <th className="px-4 py-3 font-semibold">Kit Price</th>
                  <th className="px-4 py-3 font-semibold">Savings</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKits.map((kit) => (
                  <tr key={kit._id} className="border-t border-[#e8d7bf] dark:border-white/10">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {kit.image ? (
                          <img src={formatImageUrl(kit.image)} alt={kit.name} className="h-10 w-10 rounded-lg border border-[#D4AF37]/30 object-cover" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f8ecda] text-xs text-[#7b5a4e]">No</div>
                        )}
                        <div>
                          <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">{kit.name}</p>
                          <p className="line-clamp-1 max-w-[260px] text-xs text-[#7a5a4c] dark:text-[#f7e3c0]/70">{kit.description || "No description"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${kit.kitType === "default" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                        {kit.kitType === "default" ? "Default" : "Special"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{kit.festivalType || "-"}</td>
                    <td className="px-4 py-3">{Array.isArray(kit.items) ? kit.items.length : 0}</td>
                    <td className="px-4 py-3">{formatCurrency(kit.totalPrice)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(kit.kitPrice)}</td>
                    <td className="px-4 py-3">{formatCurrency(kit.savings)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusPillClass(kit.status || "active")}`}>
                        {kit.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleEdit(kit)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
                          <FiEdit2 />
                        </button>
                        <button type="button" onClick={() => handleDelete(kit)} className="grid h-9 w-9 place-items-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-200">
                          <FiTrash2 />
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

