import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import "./Items.css";
import "./AddItem.css";
import { FiEye, FiEdit, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const buildItemForm = () => ({
  title: "",
  price: "",
  mrp: "",
  categoryName: "",
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

const normalizeItem = (item = {}, fallback = {}) => {
  const pricing = item.pricing || fallback.pricing || {};
  const stock = item.stock || fallback.stock || {};
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
    slug: item.slug ?? fallback.slug,
    category: item.category || fallback.category || { name: "" },
    pricing: {
      price: pricing.price ?? fallback.pricing?.price ?? 0,
      mrp: pricing.mrp ?? fallback.pricing?.mrp ?? 0,
      currency: pricing.currency || fallback.pricing?.currency || "INR",
      discountPercent:
        pricing.discountPercent ?? fallback.pricing?.discountPercent ?? 0,
      savings: pricing.savings ?? fallback.pricing?.savings ?? 0,
    },
    oldPrice: pricing.mrp ?? fallback.oldPrice,
    products,
    thumbnail: item.thumbnail || item.media?.thumbnail || products[0] || fallback.thumbnail,
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
    ratings: item.ratings || fallback.ratings || { average: 0, totalReviews: 0 },
  };
};

const buildEditForm = (item = {}) => ({
  title: item.title || "",
  price: item.pricing?.price ?? "",
  mrp: item.pricing?.mrp ?? "",
  categoryName: item.category?.name || "",
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
    [images]
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
              setActiveIndex((index) =>
                (index - 1 + imageUrls.length) % imageUrls.length
              )
            }
            aria-label={`Previous image for ${title}`}
          >
            &lt;
          </button>
          <button
            type="button"
            className="image-nav image-nav--next"
            onClick={() => setActiveIndex((index) => (index + 1) % imageUrls.length)}
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
  const [actionLoading, setActionLoading] = useState("");

  const [createForm, setCreateForm] = useState(buildItemForm());
  const [createImages, setCreateImages] = useState([]);
  const [createPreview, setCreatePreview] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(buildEditForm());

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/items", {
        params: {
          limit: 100,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        },
      });

      const list = res.data?.data?.products || [];
      setItems(list.map((item) => normalizeItem(item)));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load items right now.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleCreateChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
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
      setActionError(err.response?.data?.message || "Unable to fetch latest item details.");
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
    } catch (err) {
      setEditItem(item);
      setEditForm(buildEditForm(item));
      setActionError(err.response?.data?.message || "Unable to load full item for edit.");
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

      const payload = {
        title: editForm.title.trim(),
        price: Number(editForm.price),
        mrp: editForm.mrp === "" ? undefined : Number(editForm.mrp),
        categoryName: editForm.categoryName,
        quantity: editForm.quantity === "" ? undefined : Number(editForm.quantity),
        tags: editForm.tags,
        isRecommended: String(editForm.isRecommended),
        isMostPoojaEssentials: String(editForm.isMostPoojaEssentials),
        isMostUsed: String(editForm.isMostUsed),
        isEveryDayRitual: String(editForm.isEveryDayRitual),
        isRitualItems: String(editForm.isRitualItems),
      };

      const res = await API.put(`/items/${editItem._id}`, payload);
      const updated = normalizeItem(res.data?.data || {}, editItem);

      setItems((current) =>
        current.map((item) => (item._id === editItem._id ? normalizeItem(updated, item) : item))
      );
      setEditItem(null);
      setEditForm(buildEditForm());
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
            <FiPlus />{showCreateForm ? "Hide Form" : "Create Product"}
          </button>
        </div>
      </div>

      {showCreateForm && (
      <section className="items-create-panel">
        <h3>Add New Item</h3>
        <form className="add-item-form" onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input name="title" value={createForm.title} onChange={handleCreateChange} required />
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              name="categoryName"
              value={createForm.categoryName}
              onChange={handleCreateChange}
            />
          </div>

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
            <input type="number" name="mrp" value={createForm.mrp} onChange={handleCreateChange} />
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
            <input name="tags" value={createForm.tags} onChange={handleCreateChange} />
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

          <button className="add-btn full-width" disabled={actionLoading === "create"}>
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
          placeholder="Search items, categories, tags"
          aria-label="Search items"
        />
        {searchTerm && (
          <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear item search">
            <FiX />
          </button>
        )}
      </div>

      {actionError && !viewItem && !editItem && <div className="items-action-error">{actionError}</div>}
      {loading && <div className="items-state">Loading items...</div>}
      {!loading && error && <div className="items-state items-state--error">{error}</div>}
      {!loading && !error && !items.length && (
        <div className="items-state">No active items found.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="items-grid">
          {items.map((item) => (
            <article className="item-card" key={item._id}>
              <ImageSlider images={item.products || []} title={item.title} />
              {item.flags?.isRecommended && <span className="item-badge">Recommended</span>}

              <div className="item-content">
                <div className="item-title-row">
                  <h3 className="item-title">{item.title}</h3>
                  {item.pricing?.mrp > item.pricing?.price && (
                    <span className="discount-badge">
                      {Math.round(
                        ((item.pricing.mrp - item.pricing.price) / item.pricing.mrp) * 100
                      )}
                      % off
                    </span>
                  )}
                </div>

                <p className="item-category">{item.category?.name || "Uncategorized"}</p>
                <div className="item-price-row">
                  <span className="price">{formatCurrency(item.pricing?.price)}</span>
                  {item.pricing?.mrp ? (
                    <span className="old-price">{formatCurrency(item.pricing.mrp)}</span>
                  ) : null}
                </div>

                <div className="item-mini-flags">
                  {item.flags?.isMostPoojaEssentials && <span>Pooja Essentials</span>}
                  {item.flags?.isMostUsed && <span>Most Used</span>}
                  {item.flags?.isEveryDayRitual && <span>Daily Ritual</span>}
                  {item.flags?.isRitualItems && <span>Ritual Item</span>}
                </div>

                <div className="item-actions-bottom">
                  <button type="button" onClick={() => openViewModal(item)} title="View item">
                    <FiEye />
                  </button>
                  <button type="button" onClick={() => openEditModal(item)} title="Edit item">
                    <FiEdit />
                  </button>
                  <button type="button" onClick={() => handleDeleteItem(item)} title="Delete item">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewItem && (
        <div className="item-modal-backdrop" role="presentation">
          <section className="item-view-modal" aria-label={`${viewItem.title} details`}>
            <div className="item-view-hero">
              <ImageSlider images={viewItem.products || []} title={viewItem.title} />
              {viewItem.flags?.isRecommended && <span className="item-view-badge">Recommended</span>}
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
                {viewItem.pricing?.mrp ? <del>{formatCurrency(viewItem.pricing?.mrp)}</del> : null}
              </div>

              <div className="item-view-details-grid">
                <div>
                  <span>Category</span>
                  <strong>{viewItem.category?.name || "Uncategorized"}</strong>
                </div>
                <div>
                  <span>Stock</span>
                  <strong>
                    {viewItem.stock?.quantity > 0
                      ? `${viewItem.stock.quantity} available`
                      : "Out of stock"}
                  </strong>
                </div>
              </div>

              <div className="item-view-tags">
                <span>Flags</span>
                <div>
                  {viewItem.flags?.isMostPoojaEssentials && <strong>Most Pooja Essentials</strong>}
                  {viewItem.flags?.isMostUsed && <strong>Most Used</strong>}
                  {viewItem.flags?.isEveryDayRitual && <strong>Every Day Ritual</strong>}
                  {viewItem.flags?.isRitualItems && <strong>Ritual Item</strong>}
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
                onClick={() => setEditItem(null)}
                disabled={actionLoading === "update"}
                aria-label="Close edit item dialog"
              >
                &times;
              </button>
            </div>

            <div className="item-edit-grid">
              <label>
                Title
                <input name="title" value={editForm.title} onChange={handleEditChange} required />
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
                <input type="number" name="mrp" value={editForm.mrp} onChange={handleEditChange} />
              </label>
              <label>
                Category
                <input
                  name="categoryName"
                  value={editForm.categoryName}
                  onChange={handleEditChange}
                />
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
                <input name="tags" value={editForm.tags} onChange={handleEditChange} />
              </label>
            </div>

            <div className="items-flags-grid">
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

            {actionError && <div className="items-action-error items-action-error--modal">{actionError}</div>}

            <div className="item-edit-actions">
              <button
                type="button"
                className="item-edit-secondary"
                onClick={() => setEditItem(null)}
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

