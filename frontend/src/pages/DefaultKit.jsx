import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiEdit, FiTrash2, FiX } from "react-icons/fi";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const emptyForm = {
  name: "",
  description: "",
  kitPrice: "",
  status: "active",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatImageUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  return `${apiOrigin}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

export default function DefaultKit() {
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [defaultKits, setDefaultKits] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingKits, setLoadingKits] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKitId, setEditingKitId] = useState("");
  const [deletingKitId, setDeletingKitId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await API.get("/items", {
          params: { limit: 200, status: "active" },
        });

        setProducts(res.data?.data?.products || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load products.");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const fetchDefaultKits = async () => {
    try {
      setLoadingKits(true);
      const res = await API.get("/admin/default-kits", {
        params: { status: "all" },
      });
      setDefaultKits(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load default kits.");
    } finally {
      setLoadingKits(false);
    }
  };

  useEffect(() => {
    fetchDefaultKits();
  }, []);

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

  const totalPrice = useMemo(() => {
    return selectedList.reduce((total, entry) => {
      const product = products.find((p) => p._id === entry.product);
      return total + Number(product?.pricing?.price || 0) * Number(entry.quantity || 0);
    }, 0);
  }, [products, selectedList]);

  const savings = Math.max(totalPrice - Number(form.kitPrice || 0), 0);

  const handleChange = (event) => {
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

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setSelectedItems({});
    setEditingKitId("");
  };

  const hydrateFormForEdit = (kit) => {
    setForm({
      name: kit?.name || "",
      description: kit?.description || "",
      kitPrice: kit?.kitPrice ?? "",
      status: kit?.status || "active",
    });

    const nextSelected = {};
    (kit?.items || []).forEach((entry) => {
      const productId = entry?.product?._id || entry?.product;
      if (productId) {
        nextSelected[productId] = Number(entry?.quantity || 1);
      }
    });

    setSelectedItems(nextSelected);
    setImageFile(null);
    setEditingKitId(kit?._id || "");
    setShowCreateForm(true);
    setError("");
    setSuccess("");
  };

  const cancelForm = () => {
    resetForm();
    setShowCreateForm(false);
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

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }
      if (editingKitId) {
        await API.put(`/admin/default-kits/${editingKitId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/default-kits", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setSuccess(editingKitId ? "Default kit updated successfully." : "Default kit posted successfully.");
      await fetchDefaultKits();
      resetForm();
      setShowCreateForm(false);
    } catch (err) {
      setError(err.response?.data?.message || (editingKitId ? "Unable to update default kit." : "Unable to post default kit."));
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKit = async (kit) => {
    if (!kit?._id) return;
    // if (!window.confirm(`Delete default kit \"${kit.name}\"?`)) return;
    if (!window.confirm(`Delete default kit "${kit.name}"?`)) return;

    try {
      setDeletingKitId(kit._id);
      setError("");
      setSuccess("");

      await API.delete(`/admin/default-kits/${kit._id}`);

      setDefaultKits((current) => current.filter((entry) => entry._id !== kit._id));
      setSuccess("Default kit deleted successfully.");
      if (editingKitId === kit._id) {
        cancelForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete default kit.");
    } finally {
      setDeletingKitId("");
    }
  };

  const formHeading = editingKitId ? "Edit Default Kit" : "Post New Default Kit";
  const formSubmitLabel = submitting
    ? editingKitId
      ? "Saving..."
      : "Posting..."
    : editingKitId
    ? "Save Changes"
    : "Post Default Kit";

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[#dcc7ab]/60 bg-[linear-gradient(140deg,rgba(255,248,237,0.94),rgba(247,235,211,0.9))] p-6 shadow-[0_18px_45px_rgba(59,13,20,0.08)] dark:border-white/10 dark:bg-[linear-gradient(140deg,rgba(59,13,20,0.65),rgba(11,5,7,0.82))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8B1E3F] dark:text-[#D4AF37]">Admin Default Kit</p>
            <h2 className="mt-2 text-2xl font-bold">Manage default kit catalog</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Publish, edit and delete default kits that users can customize.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showCreateForm) {
                cancelForm();
              } else {
                resetForm();
                setShowCreateForm(true);
              }
            }}
            className="rounded-2xl bg-[linear-gradient(135deg,#8B1E3F,#5f1828)] px-4 py-2 text-sm font-semibold text-[#fff3dc] shadow hover:brightness-110"
          >
            {showCreateForm ? "Hide Form" : "Create Default Kit"}
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

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-4 rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{formHeading}</h3>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
                aria-label="Close form"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kit Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Ganesh Pooja Starter Kit"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Short description for this default kit"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kit Price (INR)</label>
                <input
                  type="number"
                  name="kitPrice"
                  min="0"
                  value={form.kitPrice}
                  onChange={handleChange}
                  placeholder="0"
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kit Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-dashed border-[#d9c3a2] bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="rounded-2xl border border-[#d9c3a2]/60 bg-[#fff8eb] p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <span>Products total</span>
                <strong>{formatCurrency(totalPrice)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Kit price</span>
                <strong>{formatCurrency(form.kitPrice)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                <span>User savings</span>
                <strong>{formatCurrency(savings)}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="w-full rounded-2xl border border-[#d9c3a2] bg-white px-4 py-3 text-sm font-semibold text-[#7b3a4b] dark:border-white/20 dark:bg-black/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#8B1E3F,#5f1828)] px-4 py-3 text-sm font-semibold text-[#fff3dc] shadow hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {formSubmitLabel}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Select Products</h3>
              <span className="text-xs text-[#7b5a4e] dark:text-[#f7e3c0]/70">{selectedList.length} selected</span>
            </div>

            {loadingProducts ? (
              <div className="rounded-xl bg-white/70 p-4 text-sm dark:bg-black/20">Loading products...</div>
            ) : !products.length ? (
              <div className="rounded-xl bg-white/70 p-4 text-sm dark:bg-black/20">No active products found.</div>
            ) : (
              <div className="max-h-[580px] space-y-2 overflow-auto pr-1">
                {products.map((product) => {
                  const selected = Object.prototype.hasOwnProperty.call(selectedItems, product._id);
                  const quantity = selectedItems[product._id] || 1;

                  return (
                    <div
                      key={product._id}
                      className={`rounded-2xl border p-3 transition ${
                        selected
                          ? "border-[#8B1E3F]/45 bg-[#8B1E3F]/6 dark:bg-[#8B1E3F]/20"
                          : "border-[#e7d6bb] bg-white dark:border-white/10 dark:bg-black/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => toggleItem(product._id, event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-[#c9af86]"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{product.title}</p>
                          <p className="text-xs text-[#7b5a4e] dark:text-[#f7e3c0]/70">
                            {formatCurrency(product.pricing?.price)}
                          </p>
                        </div>

                        {selected && (
                          <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(event) => updateQuantity(product._id, event.target.value)}
                            className="w-20 rounded-lg border border-[#d7c09f] bg-white px-2 py-1 text-sm dark:border-white/20 dark:bg-black/30"
                          />
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

      <section className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Default Kit Listing</h3>
          <span className="text-xs text-[#7b5a4e] dark:text-[#f7e3c0]/70">{defaultKits.length} kits</span>
        </div>

        {loadingKits ? (
          <div className="rounded-xl bg-white/70 p-4 text-sm dark:bg-black/20">Loading default kits...</div>
        ) : !defaultKits.length ? (
          <div className="rounded-xl bg-white/70 p-4 text-sm dark:bg-black/20">No default kits posted yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {defaultKits.map((kit) => (
              <article key={kit._id} className="rounded-2xl border border-[#e7d6bb] bg-white p-4 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-[#f7e6c8] dark:bg-white/10">
                    {kit.image ? (
                      <img src={formatImageUrl(kit.image)} alt={kit.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
                        {kit.name?.charAt(0)?.toUpperCase() || "K"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold">{kit.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${kit.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-200"}`}>
                        {kit.status || "active"}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-[#7b5a4e] dark:text-[#f7e3c0]/70">
                      {kit.description || "No description"}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span>{formatCurrency(kit.kitPrice)} kit price</span>
                      <span>{kit.items?.length || 0} items</span>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => hydrateFormForEdit(kit)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#d7c09f] px-2.5 py-1.5 text-xs font-semibold text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
                      >
                        <FiEdit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKit(kit)}
                        disabled={deletingKitId === kit._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                        {deletingKitId === kit._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
