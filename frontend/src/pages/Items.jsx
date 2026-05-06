import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import "./Items.css";
import "./AddItem.css";
import { FiEye, FiEdit, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(
  /\/api\/?$/,
  "",
);

const buildItemForm = () => ({
  title: "",
  description: "",
  price: "",
  mrp: "",
  gstPercent: "",
  priceIncludesGst: true,
  discountType: "percent",
  discountValue: "",
  discountIsActive: false,
  discountStartsAt: "",
  discountExpiresAt: "",
  categoryName: "",
  brand: "",
  sku: "",
  unit: "",
  weight: "",
  dimensions: "",
  material: "",
  color: "",
  manufacturer: "",
  countryOfOrigin: "",
  packageContents: "",
  usageInstructions: "",
  careInstructions: "",
  expiryInfo: "",
  hsnCode: "",
  city: "",
  status: "active",
  quantity: "",
  tags: "",
  isRecommended: false,
  isMostPoojaEssentials: false,
  isMostUsed: false,
  isEveryDayRitual: false,
  isRitualItems: false,
});

const formatImageUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiOrigin}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const productDetailFields = [
  { name: "brand", label: "Brand" },
  { name: "sku", label: "SKU / Product Code" },
  { name: "unit", label: "Unit / Pack Size" },
  { name: "weight", label: "Weight" },
  { name: "dimensions", label: "Dimensions" },
  { name: "material", label: "Material" },
  { name: "color", label: "Color" },
  { name: "manufacturer", label: "Manufacturer" },
  { name: "countryOfOrigin", label: "Country of Origin" },
  { name: "packageContents", label: "Package Contents", multiline: true },
  { name: "usageInstructions", label: "How to Use", multiline: true },
  { name: "careInstructions", label: "Care Instructions", multiline: true },
  { name: "expiryInfo", label: "Expiry / Shelf Life" },
];

const normalizeItem = (item = {}, fallback = {}) => {
  const pricing = item.pricing || fallback.pricing || {};
  const discount = item.discount || fallback.discount || {};
  const stock = item.stock || fallback.stock || {};
  const compliance = item.compliance || fallback.compliance || {};
  const details = item.details || fallback.details || {};
  const flagSource = item.flags || fallback.flags || {};
  const products =
    item.products ||
    item.media?.image ||
    item.media?.images ||
    item.images ||
    fallback.products ||
    [];

  return {
    ...fallback,
    _id: item._id || item.id || fallback._id,
    title: item.title ?? fallback.title ?? "",
    description: item.description ?? fallback.description ?? "",
    slug: item.slug ?? fallback.slug,
    category: item.category || fallback.category || { name: "" },
    details: productDetailFields.reduce(
      (next, field) => ({
        ...next,
        [field.name]: details[field.name] ?? "",
      }),
      {},
    ),
    pricing: {
      price: pricing.price ?? fallback.pricing?.price ?? 0,
      mrp: pricing.mrp ?? fallback.pricing?.mrp ?? 0,
      basePrice: pricing.basePrice ?? fallback.pricing?.basePrice ?? 0,
      gstPercent: pricing.gstPercent ?? fallback.pricing?.gstPercent ?? 0,
      gstAmount: pricing.gstAmount ?? fallback.pricing?.gstAmount ?? 0,
      priceIncludesGst:
        pricing.priceIncludesGst ?? fallback.pricing?.priceIncludesGst ?? true,
      currency: pricing.currency || fallback.pricing?.currency || "INR",
      discountPercent:
        pricing.discountPercent ?? fallback.pricing?.discountPercent ?? 0,
      savings: pricing.savings ?? fallback.pricing?.savings ?? 0,
    },
    discount: {
      type: discount.type ?? "percent",
      value: discount.value ?? 0,
      isActive: discount.isActive ?? false,
      startsAt: discount.startsAt ?? null,
      expiresAt: discount.expiresAt ?? null,
    },
    oldPrice: pricing.mrp ?? fallback.oldPrice,
    products,
    thumbnail:
      item.thumbnail ||
      item.media?.thumbnail ||
      products[0] ||
      fallback.thumbnail,
    stock: {
      quantity: stock.quantity ?? fallback.stock?.quantity,
      status: stock.status || fallback.stock?.status,
      available:
        stock.available !== undefined
          ? stock.available
          : stock.quantity !== undefined
            ? Number(stock.quantity) > 0
            : fallback.stock?.available,
    },
    compliance: {
      hsnCode: compliance.hsnCode ?? "",
      city: compliance.city ?? "",
    },
    status: item.status || fallback.status || "active",
    tags: item.tags || fallback.tags || [],
    flags: {
      isRecommended:
        item.isRecommended ??
        flagSource.isRecommended ??
        fallback.flags?.isRecommended ??
        false,
      isMostPoojaEssentials:
        item.isMostPoojaEssentials ??
        flagSource.isMostPoojaEssentials ??
        fallback.flags?.isMostPoojaEssentials ??
        false,
      isMostUsed:
        item.isMostUsed ??
        flagSource.isMostUsed ??
        fallback.flags?.isMostUsed ??
        false,
      isEveryDayRitual:
        item.isEveryDayRitual ??
        flagSource.isEveryDayRitual ??
        fallback.flags?.isEveryDayRitual ??
        false,
      isRitualItems:
        item.isRitualItems ??
        flagSource.isRitualItems ??
        fallback.flags?.isRitualItems ??
        false,
    },
    ratings: item.ratings ||
      fallback.ratings || { average: 0, totalReviews: 0 },
  };
};

const buildEditForm = (item = {}) => ({
  title: item.title || "",
  description: item.description || "",
  price: item.pricing?.price ?? "",
  mrp: item.pricing?.mrp ?? "",
  gstPercent: item.pricing?.gstPercent ?? "",
  priceIncludesGst: item.pricing?.priceIncludesGst ?? true,
  discountType: item.discount?.type || "percent",
  discountValue: item.discount?.value ?? "",
  discountIsActive: Boolean(item.discount?.isActive),
  discountStartsAt: item.discount?.startsAt
    ? String(item.discount.startsAt).slice(0, 10)
    : "",
  discountExpiresAt: item.discount?.expiresAt
    ? String(item.discount.expiresAt).slice(0, 10)
    : "",
  categoryName: item.category?.name || "",
  brand: item.details?.brand || "",
  sku: item.details?.sku || "",
  unit: item.details?.unit || "",
  weight: item.details?.weight || "",
  dimensions: item.details?.dimensions || "",
  material: item.details?.material || "",
  color: item.details?.color || "",
  manufacturer: item.details?.manufacturer || "",
  countryOfOrigin: item.details?.countryOfOrigin || "",
  packageContents: item.details?.packageContents || "",
  usageInstructions: item.details?.usageInstructions || "",
  careInstructions: item.details?.careInstructions || "",
  expiryInfo: item.details?.expiryInfo || "",
  hsnCode: item.compliance?.hsnCode || "",
  city: item.compliance?.city || "",
  status: item.status || "active",
  quantity: item.stock?.quantity ?? "",
  tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
  isRecommended: Boolean(item.flags?.isRecommended),
  isMostPoojaEssentials: Boolean(item.flags?.isMostPoojaEssentials),
  isMostUsed: Boolean(item.flags?.isMostUsed),
  isEveryDayRitual: Boolean(item.flags?.isEveryDayRitual),
  isRitualItems: Boolean(item.flags?.isRitualItems),
});

function ImageSlider({ images = [], title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageUrls = useMemo(
    () => images.map(formatImageUrl).filter(Boolean),
    [images],
  );

  if (!imageUrls.length) {
    return (
      <div className="item-image item-image--empty">
        <span>No image</span>
      </div>
    );
  }

  return (
    <div className="item-image"> 
      <img src={imageUrls[activeIndex]} alt={title} />
      {imageUrls.length > 1 && (
        <>
          <button
            type="button"
            className="image-nav image-nav--prev"
            onClick={() =>
              setActiveIndex(
                (index) => (index - 1 + imageUrls.length) % imageUrls.length,
              )
            }
            aria-label={`Previous image for ${title}`}
          >
            &lt;
          </button>
          <button
            type="button"
            className="image-nav image-nav--next"
            onClick={() =>
              setActiveIndex((index) => (index + 1) % imageUrls.length)
            }
            aria-label={`Next image for ${title}`}
          >
            &gt;
          </button>
        </>
      )}
    </div>
  );
}

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [gstFilter, setGstFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState("");

  const [createForm, setCreateForm] = useState(buildItemForm());
  const [createImages, setCreateImages] = useState([]);
  const [createPreview, setCreatePreview] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(buildEditForm());
  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImages, setEditImages] = useState([]);
  const [editPreview, setEditPreview] = useState([]);

const fetchItems = useCallback(async () => {
  try {
    setLoading(true);
    setError("");

    const res = await API.get("/items", {
      params: {
        limit: 100,
        status: "all",
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      },
    });

    const list = res.data?.data?.products || [];
    setItems(list.map((item) => normalizeItem(item)));
  } catch (err) {
    setError(
      err.response?.data?.message || "Unable to load items right now."
    );
  } finally {
    setLoading(false);
  }
}, [searchTerm]);
  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const cityOptions = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(items.map((item) => item.compliance?.city).filter(Boolean)),
      ).sort(),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemStatus = String(item.status || "").toLowerCase();
      const itemCity = item.compliance?.city || "";
      const isPriceIncludesGst = Boolean(item.pricing?.priceIncludesGst);

      if (statusFilter !== "all" && itemStatus !== statusFilter) return false;
      if (cityFilter !== "all" && itemCity !== cityFilter) return false;
      if (gstFilter === "include" && !isPriceIncludesGst) return false;
      if (gstFilter === "exclude" && isPriceIncludesGst) return false;
      return true;
    });
  }, [items, statusFilter, cityFilter, gstFilter]);

  const handleCreateChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEditImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setEditImages(files);
    setEditPreview(files.map((file) => URL.createObjectURL(file)));
  };

  const removeEditImage = (index) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setEditPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setCreateImages(files);
    setCreatePreview(files.map((file) => URL.createObjectURL(file)));
  };

  const removeCreateImage = (index) => {
    setCreateImages((current) => current.filter((_, i) => i !== index));
    setCreatePreview((current) => current.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    if (!createForm.title.trim() || createForm.price === "") {
      setActionError("Title and price are required.");
      return;
    }

    try {
      setActionLoading("create");
      setActionError("");

      const formData = new FormData();
      Object.entries(createForm).forEach(([key, value]) => {
        formData.append(key, value);
      });
      createImages.forEach((file) => formData.append("images", file));

      await API.post("/items/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setCreateForm(buildItemForm());
      setCreateImages([]);
      setCreatePreview([]);
      await fetchItems();
      setShowCreateForm(false);
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to add item.");
    } finally {
      setActionLoading("");
    }
  };

  const openViewModal = async (item) => {
    setActionError("");
    setActionLoading(`view:${item._id}`);
    try {
      const res = await API.get(`/items/${item._id}`);
      setViewItem(normalizeItem(res.data?.data || {}, item));
    } catch (err) {
      setViewItem(item);
      setActionError(
        err.response?.data?.message || "Unable to fetch latest item details.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const openEditModal = async (item) => {
    setActionError("");
    setActionLoading(`edit:${item._id}`);
    try {
      const res = await API.get(`/items/${item._id}`);
      const fullItem = normalizeItem(res.data?.data || {}, item);
      setEditItem(fullItem);
      setEditForm(buildEditForm(fullItem));
      const existingImages = Array.isArray(fullItem.products)
        ? fullItem.products.filter(Boolean)
        : [];
      setEditExistingImages(existingImages);
      setEditImages([]);
      setEditPreview([]);
    } catch (err) {
      setEditItem(item);
      setEditForm(buildEditForm(item));
      setActionError(
        err.response?.data?.message || "Unable to load full item for edit.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateItem = async (event) => {
    event.preventDefault();
    if (!editItem?._id) return;

    try {
      setActionLoading("update");
      setActionError("");

      const formData = new FormData();

      formData.append("title", editForm.title.trim());
      formData.append("description", editForm.description || "");

      if (editForm.price !== "") {
        formData.append("price", String(Number(editForm.price)));
      }
      if (editForm.mrp !== "") {
        formData.append("mrp", String(Number(editForm.mrp)));
      }
      if (editForm.gstPercent !== "") {
        formData.append("gstPercent", String(Number(editForm.gstPercent)));
      }

      formData.append("discountType", editForm.discountType || "percent");
      if (editForm.discountValue !== "") {
        formData.append("discountValue", String(Number(editForm.discountValue)));
      }
      formData.append("discountIsActive", String(editForm.discountIsActive));
      formData.append("discountStartsAt", editForm.discountStartsAt || "");
      formData.append("discountExpiresAt", editForm.discountExpiresAt || "");

      formData.append("priceIncludesGst", String(editForm.priceIncludesGst));
      formData.append("categoryName", editForm.categoryName || "");
      productDetailFields.forEach((field) => {
        formData.append(field.name, editForm[field.name] || "");
      });
      formData.append("hsnCode", editForm.hsnCode || "");
      formData.append("city", editForm.city || "");
      formData.append("status", editForm.status || "active");
      if (editForm.quantity !== "") {
        formData.append("quantity", String(Number(editForm.quantity)));
      }
      formData.append("tags", editForm.tags || "");
      formData.append("isRecommended", String(editForm.isRecommended));
      formData.append(
        "isMostPoojaEssentials",
        String(editForm.isMostPoojaEssentials),
      );
      formData.append("isMostUsed", String(editForm.isMostUsed));
      formData.append("isEveryDayRitual", String(editForm.isEveryDayRitual));
      formData.append("isRitualItems", String(editForm.isRitualItems));

      formData.append(
        "existingImages",
        JSON.stringify(editExistingImages || []),
      );

      editImages.forEach((file) => {
        formData.append("images", file);
      });

      const res = await API.put(`/items/${editItem._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const updated = normalizeItem(res.data?.data || {}, editItem);

      setItems((current) =>
        current.map((item) =>
          item._id === editItem._id ? normalizeItem(updated, item) : item,
        ),
      );
      setEditItem(null);
      setEditForm(buildEditForm());
      setEditExistingImages([]);
      setEditImages([]);
      setEditPreview([]);
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to update item.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from the catalog?`)) return;

    try {
      setActionLoading(`delete:${item._id}`);
      setActionError("");
      await API.delete(`/items/${item._id}`);
      setItems((current) => current.filter((entry) => entry._id !== item._id));
    } catch (err) {
      setActionError(err.response?.data?.message || "Unable to delete item.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="items-page">
      <div className="items-header">
        <div>
          <p className="items-eyebrow">Inventory</p>
          <h2>Items Management</h2>
          <p>Add, search, update and manage puja products from one panel.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="items-count ">{items.length} items</span>
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="product-btn flex flex-row justify-center items-center"
          >
            <FiPlus />
            {showCreateForm ? "Hide Form" : "Create Product"}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <section className="items-create-panel">
          <h3>Add New Item</h3>
          <form className="add-item-form" onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input
                name="title"
                value={createForm.title}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                value={createForm.description}
                onChange={handleCreateChange}
                rows={3}
                placeholder="Short product description"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                name="categoryName"
                value={createForm.categoryName}
                onChange={handleCreateChange}
              />
            </div>

            {productDetailFields.map((field) => (
              <div
                className={`form-group ${field.multiline ? "full-width" : ""}`}
                key={field.name}
              >
                <label>{field.label}</label>
                {field.multiline ? (
                  <textarea
                    name={field.name}
                    value={createForm[field.name]}
                    onChange={handleCreateChange}
                    rows={2}
                  />
                ) : (
                  <input
                    name={field.name}
                    value={createForm[field.name]}
                    onChange={handleCreateChange}
                  />
                )}
              </div>
            ))}

            <div className="form-group">
              <label>Price</label>
              <input
                type="number"
                name="price"
                value={createForm.price}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="form-group">
              <label>MRP</label>
              <input
                type="number"
                name="mrp"
                value={createForm.mrp}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>Discount Type</label>
              <select
                name="discountType"
                value={createForm.discountType}
                onChange={handleCreateChange}
                className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
              >
                <option value="percent">Percent</option>
                <option value="flat">Flat</option>
              </select>
            </div>

            <div className="form-group">
              <label>Discount Value</label>
              <input
                type="number"
                name="discountValue"
                value={createForm.discountValue}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>Discount Start</label>
              <input
                type="date"
                name="discountStartsAt"
                value={createForm.discountStartsAt}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>Discount End</label>
              <input
                type="date"
                name="discountExpiresAt"
                value={createForm.discountExpiresAt}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>GST %</label>
              <input
                type="number"
                name="gstPercent"
                value={createForm.gstPercent}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>HSN Code</label>
              <input
                name="hsnCode"
                value={createForm.hsnCode}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                name="city"
                value={createForm.city}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={createForm.status}
                onChange={handleCreateChange}
                className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label>Stock</label>
              <input
                type="number"
                name="quantity"
                value={createForm.quantity}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input
                name="tags"
                value={createForm.tags}
                onChange={handleCreateChange}
              />
            </div>

            <div className="form-group full-width">
              <label>Product Images</label>
              <input type="file" multiple onChange={handleCreateImageChange} />
            </div>
            <div className="preview-container full-width">
              {createPreview.map((image, index) => (
                <div className="preview-box" key={image}>
                  <img src={image} alt="Preview" className="preview-image" />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeCreateImage(index)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <div className="items-flags-grid full-width">
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="discountIsActive"
                  checked={createForm.discountIsActive}
                  onChange={handleCreateChange}
                />
                Discount Active
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="priceIncludesGst"
                  checked={createForm.priceIncludesGst}
                  onChange={handleCreateChange}
                />
                Price Includes GST
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isRecommended"
                  checked={createForm.isRecommended}
                  onChange={handleCreateChange}
                />
                Recommended
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isMostPoojaEssentials"
                  checked={createForm.isMostPoojaEssentials}
                  onChange={handleCreateChange}
                />
                Most Pooja Essentials
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isMostUsed"
                  checked={createForm.isMostUsed}
                  onChange={handleCreateChange}
                />
                Most Used
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isEveryDayRitual"
                  checked={createForm.isEveryDayRitual}
                  onChange={handleCreateChange}
                />
                Every Day Ritual
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isRitualItems"
                  checked={createForm.isRitualItems}
                  onChange={handleCreateChange}
                />
                Ritual Item
              </label>
            </div>

            <button
              className="add-btn full-width"
              disabled={actionLoading === "create"}
            >
              {actionLoading === "create" ? "Adding..." : "Add Item"}
            </button>
          </form>
        </section>
      )}

      <div className="items-search-bar">
        <FiSearch />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search items, brand, SKU, category, tags"
          aria-label="Search items"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            aria-label="Clear item search"
          >
            <FiX />
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
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
          value={cityFilter}
          onChange={(event) => setCityFilter(event.target.value)}
          className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
        >
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city === "all" ? "All Cities" : city}
            </option>
          ))}
        </select>
        <select
          value={gstFilter}
          onChange={(event) => setGstFilter(event.target.value)}
          className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
        >
          <option value="all">All GST Modes</option>
          <option value="include">Price Includes GST</option>
          <option value="exclude">Price Excludes GST</option>
        </select>
      </div>

      {actionError && !viewItem && !editItem && (
        <div className="items-action-error">{actionError}</div>
      )}
      {loading && <div className="items-state">Loading items...</div>}
      {!loading && error && (
        <div className="items-state items-state--error">{error}</div>
      )}
      {!loading && !error && !filteredItems.length && (
        <div className="items-state">No active items found.</div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border mt-4 border-[#d8c4a5] bg-white/65 text-black dark:bg-[#181c24] dark:border-[#303745]">
          <table className="min-w-full text-sm">
            <thead className="dark:bg-[#2b2a25] text-left dark:text-[#f5deae] text-[#5c4a23]">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">MRP</th>
                <th className="px-4 py-3 font-semibold">Base</th>
                <th className="px-4 py-3 font-semibold">GST %</th>
                <th className="px-4 py-3 font-semibold">GST Amt</th>
                <th className="px-4 py-3 font-semibold">Selling</th>
                <th className="px-4 py-3 font-semibold">HSN</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item._id}
                  className="border-t-[1px] dark:border-[#53535398] text-black dark:text-white"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {formatImageUrl(item.thumbnail) ? (
                        <img
                          src={formatImageUrl(item.thumbnail)}
                          alt={item.title}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#8B1E3F]/10" />
                      )}
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs opacity-70">
                          {item.pricing?.priceIncludesGst
                            ? "Incl GST"
                            : "Excl GST"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.category?.name || "Uncategorized"}
                  </td>
                  <td className="px-4 py-3">{item.details?.brand || "-"}</td>
                  <td className="px-4 py-3">{item.details?.sku || "-"}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.pricing?.mrp)}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.pricing?.basePrice)}
                  </td>
                  <td className="px-4 py-3">
                    {Number(item.pricing?.gstPercent || 0)}%
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.pricing?.gstAmount)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(item.pricing?.price)}
                  </td>
                  <td className="px-4 py-3">
                    {item.compliance?.hsnCode || "-"}
                  </td>
                  <td className="px-4 py-3">{item.stock?.quantity ?? "-"}</td>
                  <td className="px-4 py-3">{item.compliance?.city || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openViewModal(item)}
                        title="View item"
                      >
                        <FiEye />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="Edit item"
                      >
                        <FiEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        title="Delete item"
                      >
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

      {viewItem && (
        <div className="item-modal-backdrop" role="presentation">
          <section
            className="item-view-modal"
            aria-label={`${viewItem.title} details`}
          >
            <div className="item-view-hero">
              <ImageSlider
                images={viewItem.products || []}
                title={viewItem.title}
              />
              {viewItem.flags?.isRecommended && (
                <span className="item-view-badge">Recommended</span>
              )}
            </div>

            <div className="item-view-content">
              <div className="item-edit-header">
                <div>
                  <p className="items-eyebrow">Details</p>
                  <h3>{viewItem.title}</h3>
                </div>
                <button
                  type="button"
                  className="item-modal-close"
                  onClick={() => setViewItem(null)}
                  aria-label="Close item details dialog"
                >
                  &times;
                </button>
              </div>

              <div className="item-view-price-row">
                <span>{formatCurrency(viewItem.pricing?.price)}</span>
                {viewItem.pricing?.mrp ? (
                  <del>{formatCurrency(viewItem.pricing?.mrp)}</del>
                ) : null}
              </div>

              {viewItem.description ? (
                <p className="item-view-description">{viewItem.description}</p>
              ) : null}

              <div className="item-view-details-grid">
                <div>
                  <span>Category</span>
                  <strong>{viewItem.category?.name || "Uncategorized"}</strong>
                </div>
                {productDetailFields.map((field) => (
                  <div key={field.name}>
                    <span>{field.label}</span>
                    <strong>{viewItem.details?.[field.name] || "-"}</strong>
                  </div>
                ))}
                <div>
                  <span>Stock</span>
                  <strong>
                    {viewItem.stock?.quantity > 0
                      ? `${viewItem.stock.quantity} available`
                      : "Out of stock"}
                  </strong>
                </div>
                <div>
                  <span>HSN Code</span>
                  <strong>{viewItem.compliance?.hsnCode || "-"}</strong>
                </div>
                <div>
                  <span>City</span>
                  <strong>{viewItem.compliance?.city || "-"}</strong>
                </div>
                <div>
                  <span>GST %</span>
                  <strong>{Number(viewItem.pricing?.gstPercent || 0)}%</strong>
                </div>
                <div>
                  <span>Base Price</span>
                  <strong>{formatCurrency(viewItem.pricing?.basePrice)}</strong>
                </div>
                <div>
                  <span>GST Amount</span>
                  <strong>{formatCurrency(viewItem.pricing?.gstAmount)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong className="uppercase">
                    {viewItem.status || "active"}
                  </strong>
                </div>
              </div>

              <div className="item-view-tags">
                <span>Flags</span>
                <div>
                  {viewItem.flags?.isMostPoojaEssentials && (
                    <strong>Most Pooja Essentials</strong>
                  )}
                  {viewItem.flags?.isMostUsed && <strong>Most Used</strong>}
                  {viewItem.flags?.isEveryDayRitual && (
                    <strong>Every Day Ritual</strong>
                  )}
                  {viewItem.flags?.isRitualItems && (
                    <strong>Ritual Item</strong>
                  )}
                  {!viewItem.flags?.isMostPoojaEssentials &&
                    !viewItem.flags?.isMostUsed &&
                    !viewItem.flags?.isEveryDayRitual &&
                    !viewItem.flags?.isRitualItems && <strong>No flags</strong>}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {editItem && (
        <div className="item-modal-backdrop" role="presentation">
          <form className="item-edit-modal" onSubmit={handleUpdateItem}>
            <div className="item-edit-header">
              <div>
                <p className="items-eyebrow">Update</p>
                <h3>Edit Item</h3>
              </div>
              <button
                type="button"
                className="item-modal-close"
                onClick={() => {
                  setEditItem(null);
                  setEditExistingImages([]);
                  setEditImages([]);
                  setEditPreview([]);
                }}
                disabled={actionLoading === "update"}
                aria-label="Close edit item dialog"
              >
                &times;
              </button>
            </div>

            <div className="item-edit-grid">
              <label>
                Title
                <input
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  required
                />
              </label>
              <label className="item-edit-field-wide">
                Description
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={3}
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  name="price"
                  value={editForm.price}
                  onChange={handleEditChange}
                  required
                />
              </label>
              <label>
                MRP
                <input
                  type="number"
                  name="mrp"
                  value={editForm.mrp}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                GST %
                <input
                  type="number"
                  name="gstPercent"
                  value={editForm.gstPercent}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Discount Type
                <select
                  name="discountType"
                  value={editForm.discountType}
                  onChange={handleEditChange}
                  className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
                >
                  <option value="percent">Percent</option>
                  <option value="flat">Flat</option>
                </select>
              </label>
              <label>
                Discount Value
                <input
                  type="number"
                  name="discountValue"
                  value={editForm.discountValue}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Discount Start
                <input
                  type="date"
                  name="discountStartsAt"
                  value={editForm.discountStartsAt}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Discount End
                <input
                  type="date"
                  name="discountExpiresAt"
                  value={editForm.discountExpiresAt}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Category
                <input
                  name="categoryName"
                  value={editForm.categoryName}
                  onChange={handleEditChange}
                />
              </label>
              {productDetailFields.map((field) => (
                <label
                  className={field.multiline ? "item-edit-field-wide" : ""}
                  key={field.name}
                >
                  {field.label}
                  {field.multiline ? (
                    <textarea
                      name={field.name}
                      value={editForm[field.name]}
                      onChange={handleEditChange}
                      rows={2}
                    />
                  ) : (
                    <input
                      name={field.name}
                      value={editForm[field.name]}
                      onChange={handleEditChange}
                    />
                  )}
                </label>
              ))}
              <label>
                HSN Code
                <input
                  name="hsnCode"
                  value={editForm.hsnCode}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  value={editForm.city}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                  className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                Stock
                <input
                  type="number"
                  name="quantity"
                  value={editForm.quantity}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Tags
                <input
                  name="tags"
                  value={editForm.tags}
                  onChange={handleEditChange}
                />
              </label>
            </div>
            <div className="form-group full-width mt-4">
              <label>Product Images</label>
              <input type="file" multiple onChange={handleEditImageChange} />
            </div>

            <div className="preview-container full-width">
              {editExistingImages.map((image, index) => (
                <div className="preview-box" key={`existing-${image}-${index}`}>
                  <img
                    src={formatImageUrl(image)}
                    alt="Existing"
                    className="preview-image"
                  />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() =>
                      setEditExistingImages((current) =>
                        current.filter((_, imgIndex) => imgIndex !== index),
                      )
                    }
                  >
                    x
                  </button>
                </div>
              ))}
              {editPreview.map((image, index) => (
                <div className="preview-box" key={`new-${image}-${index}`}>
                  <img src={image} alt="Preview" className="preview-image" />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeEditImage(index)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <div className="items-flags-grid mt-4">
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="discountIsActive"
                  checked={editForm.discountIsActive}
                  onChange={handleEditChange}
                />
                Discount Active
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="priceIncludesGst"
                  checked={editForm.priceIncludesGst}
                  onChange={handleEditChange}
                />
                Price Includes GST
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isRecommended"
                  checked={editForm.isRecommended}
                  onChange={handleEditChange}
                />
                Recommended
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isMostPoojaEssentials"
                  checked={editForm.isMostPoojaEssentials}
                  onChange={handleEditChange}
                />
                Most Pooja Essentials
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isMostUsed"
                  checked={editForm.isMostUsed}
                  onChange={handleEditChange}
                />
                Most Used
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isEveryDayRitual"
                  checked={editForm.isEveryDayRitual}
                  onChange={handleEditChange}
                />
                Every Day Ritual
              </label>
              <label className="item-edit-checkbox">
                <input
                  type="checkbox"
                  name="isRitualItems"
                  checked={editForm.isRitualItems}
                  onChange={handleEditChange}
                />
                Ritual Item
              </label>
            </div>

            {actionError && (
              <div className="items-action-error items-action-error--modal">
                {actionError}
              </div>
            )}

            <div className="item-edit-actions">
              <button
                type="button"
                className="item-edit-secondary"
                onClick={() => {
                  setEditItem(null);
                  setEditExistingImages([]);
                  setEditImages([]);
                  setEditPreview([]);
                }}
                disabled={actionLoading === "update"}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="item-edit-primary"
                disabled={actionLoading === "update"}
              >
                {actionLoading === "update" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
