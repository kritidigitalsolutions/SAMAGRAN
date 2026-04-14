import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import "./Items.css";
import { FiEye, FiEdit, FiSearch, FiTrash2, FiX } from "react-icons/fi";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const formatImageUrl = (path) => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiOrigin}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatItemStatus = (status, available) => {
  if (status) {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return available ? "In stock" : "Out of stock";
};

const formatStockText = (stock = {}) => {
  if (stock.quantity !== undefined) {
    return Number(stock.quantity) > 0 ? `${stock.quantity} available` : "Out of stock";
  }

  return stock.available ? "Available" : "Out of stock";
};

const buildEditForm = (item = {}) => ({
  title: item.title || "",
  price: item.pricing?.price ?? item.price ?? "",
  mrp: item.pricing?.mrp ?? item.oldPrice ?? "",
  categoryName: item.category?.name || "",
  quantity: item.stock?.quantity ?? "",
  tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
  isRecommended: Boolean(item.flags?.isRecommended ?? item.isRecommended),
});

const normalizeUpdatedItem = (updatedItem = {}, fallback = {}) => {
  const pricing = updatedItem.pricing || fallback.pricing || {};
  const images = updatedItem.media?.images || fallback.images || [];
  const quantity = updatedItem.stock?.quantity ?? fallback.stock?.quantity;

  return {
    ...fallback,
    _id: updatedItem.id || updatedItem._id || fallback._id,
    title: updatedItem.title ?? fallback.title,
    slug: updatedItem.slug ?? fallback.slug,
    category: updatedItem.category || fallback.category,
    pricing,
    price: pricing.price ?? fallback.price,
    oldPrice: pricing.mrp ?? fallback.oldPrice,
    images,
    thumbnail: updatedItem.media?.thumbnail || images[0] || fallback.thumbnail,
    stock: {
      ...(fallback.stock || {}),
      ...(updatedItem.stock || {}),
      available:
        quantity !== undefined ? Number(quantity) > 0 : fallback.stock?.available,
    },
    tags: updatedItem.tags || fallback.tags || [],
    isRecommended: Boolean(
      updatedItem.flags?.isRecommended ?? fallback.isRecommended
    ),
  };
};

function ImageSlider({ images = [], title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageUrls = useMemo(() => images.map(formatImageUrl).filter(Boolean), [images]);

  if (!imageUrls.length) {
    return (
      <div className="item-image item-image--empty">
        <span>No image</span>
      </div>
    );
  }

  const previousImage = () => {
    setActiveIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length);
  };

  const nextImage = () => {
    setActiveIndex((index) => (index + 1) % imageUrls.length);
  };

  return (
    <div className="item-image">
      <img src={imageUrls[activeIndex]} alt={title} />

      {imageUrls.length > 1 && (
        <>
          <button
            type="button"
            className="image-nav image-nav--prev"
            onClick={previousImage}
            aria-label={`Previous image for ${title}`}
          >
            &lt;
          </button>

          <button
            type="button"
            className="image-nav image-nav--next"
            onClick={nextImage}
            aria-label={`Next image for ${title}`}
          >
            &gt;
          </button>

          <div className="image-dots" aria-label="Item images">
            {imageUrls.map((image, index) => (
              <button
                type="button"
                key={image}
                className={index === activeIndex ? "image-dot image-dot--active" : "image-dot"}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} for ${title}`}
              />
            ))}
          </div>
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
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [editForm, setEditForm] = useState(buildEditForm());
  const [actionLoading, setActionLoading] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchItems = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/items", {
          params: {
            limit: 100,
            ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          },
        });

        if (isMounted) {
          setItems(res.data?.data?.products || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Unable to load items right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const searchTimer = setTimeout(fetchItems, 350);

    return () => {
      isMounted = false;
      clearTimeout(searchTimer);
    };
  }, [searchTerm]);

  const openViewModal = async (item) => {
    setActionError("");
    setActionLoading(`view:${item._id}`);

    try {
      const res = await API.get(`/items/${item._id}`);
      setViewItem(normalizeUpdatedItem(res.data?.data || {}, item));
    } catch (err) {
      setViewItem(item);
      setActionError(
        err.response?.data?.message ||
          "Opened the details, but the latest item data could not be loaded."
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeViewModal = () => {
    setViewItem(null);
    setActionError("");
  };

  const openEditModal = async (item) => {
    setActionError("");
    setActionLoading(`edit:${item._id}`);

    try {
      const res = await API.get(`/items/${item._id}`);
      const fullItem = normalizeUpdatedItem(res.data?.data || {}, item);

      setEditItem(fullItem);
      setEditForm(buildEditForm(fullItem));
    } catch (err) {
      setEditItem(item);
      setEditForm(buildEditForm(item));
      setActionError(
        err.response?.data?.message ||
          "Opened the editor, but stock quantity could not be loaded."
      );
    } finally {
      setActionLoading("");
    }
  };

  const closeEditModal = () => {
    if (actionLoading === "update") {
      return;
    }

    setEditItem(null);
    setEditForm(buildEditForm());
    setActionError("");
  };

  const handleEditChange = (event) => {
    const { name, value, type, checked } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateItem = async (event) => {
    event.preventDefault();

    if (!editItem?._id) {
      return;
    }

    if (!editForm.title.trim() || editForm.price === "") {
      setActionError("Title and price are required.");
      return;
    }

    const payload = {
      title: editForm.title.trim(),
      price: Number(editForm.price),
      mrp: editForm.mrp === "" ? undefined : Number(editForm.mrp),
      categoryName: editForm.categoryName,
      quantity: editForm.quantity === "" ? undefined : Number(editForm.quantity),
      tags: editForm.tags,
      isRecommended: String(editForm.isRecommended),
    };

    try {
      setActionLoading("update");
      setActionError("");

      const res = await API.put(`/items/${editItem._id}`, payload);
      const updatedItem = normalizeUpdatedItem(res.data?.data || {}, editItem);

      setItems((currentItems) =>
        currentItems.map((item) =>
          item._id === editItem._id ? normalizeUpdatedItem(updatedItem, item) : item
        )
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
    const shouldDelete = window.confirm(
      `Remove "${item.title}" from the catalog?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setActionLoading(`delete:${item._id}`);
      setActionError("");

      await API.delete(`/items/${item._id}`);

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem._id !== item._id)
      );
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
          <h2>Items</h2>
          <p>
            {searchTerm
              ? "Search active offerings by title, category, or tags."
              : "All active offerings available for dashboard operations."}
          </p>
        </div>

        <span className="items-count">{items.length} items</span>
      </div>

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
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            aria-label="Clear item search"
          >
            <FiX />
          </button>
        )}
      </div>

      {loading && <div className="items-state">Loading items...</div>}

      {!loading && error && <div className="items-state items-state--error">{error}</div>}

      {!loading && !editItem && !viewItem && actionError && (
        <div className="items-action-error">{actionError}</div>
      )}

      {!loading && !error && !items.length && (
        <div className="items-state">
          {searchTerm ? "No items match your search." : "No active items found."}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="items-grid">
          {items.map((item) => {
            const price = item.pricing?.price;
            const mrp = item.pricing?.mrp;
            const currency = item.pricing?.currency || "INR";

            return (
              <article className="item-card" key={item._id}>
                {/* <ImageSlider images={item.images || []} title={item.title} /> */}
                <div className="item-image-wrapper">
  <ImageSlider images={item.images || []} title={item.title} />

 
</div>

                {item.isRecommended && <span className="item-badge">Recommended</span>}

            <div className="item-content">
              <div className="item-title-row">
                <h3 className="item-title">{item.title}</h3>
                {/* {item.pricing?.discountPercent > 0 && (
                  <span className="discount-badge">{item.pricing.discountPercent}% off</span>
                )} */}
                {item.pricing?.mrp > item.pricing?.price && (
  <span className="discount-badge">
    {Math.round(
      ((item.pricing.mrp - item.pricing.price) /
        item.pricing.mrp) *
        100
    )}
    % off
  </span>
)}
              </div>

              <p className="item-category">{item.category?.name || "Uncategorized"}</p>

              <div className="item-price-row" title={formatCurrency(price, currency)} data-mrp={mrp || ""}>
                {/* <span className="price">₹{item.price}</span> */}
                <span className="price">{formatCurrency(price, currency)}</span>
                {item.oldPrice && (
                  <span className="old-price">₹{item.oldPrice}</span>
                )}
              </div>
               <div className="item-actions-bottom">
    <button
      type="button"
      onClick={() => openViewModal(item)}
      disabled={Boolean(actionLoading)}
      title="View item"
    >
      <FiEye />
    </button>
    <button
      type="button"
      onClick={() => openEditModal(item)}
      disabled={Boolean(actionLoading)}
      title="Edit item"
    >
      <FiEdit />
    </button>
    <button
      type="button"
      onClick={() => handleDeleteItem(item)}
      disabled={Boolean(actionLoading)}
      title="Delete item"
    >
      <FiTrash2 />
    </button>
  </div>
            </div>

              </article>
            );
          })}
      </div>
      )}

      {viewItem && (
        <div className="item-modal-backdrop" role="presentation">
          <section className="item-view-modal" aria-label={`${viewItem.title} details`}>
            <div className="item-view-hero">
              <ImageSlider images={viewItem.images || []} title={viewItem.title} />

              {viewItem.isRecommended && (
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
                  onClick={closeViewModal}
                  aria-label="Close item details dialog"
                >
                  &times;
                </button>
              </div>

              <div className="item-view-price-row">
                <span>
                  {formatCurrency(
                    viewItem.pricing?.price ?? viewItem.price,
                    viewItem.pricing?.currency || "INR"
                  )}
                </span>

                {(viewItem.pricing?.mrp || viewItem.oldPrice) && (
                  <del>
                    {formatCurrency(
                      viewItem.pricing?.mrp ?? viewItem.oldPrice,
                      viewItem.pricing?.currency || "INR"
                    )}
                  </del>
                )}
              </div>

              {viewItem.pricing?.discountPercent > 0 && (
                <p className="item-view-saving">
                  {viewItem.pricing.discountPercent}% off
                  {viewItem.pricing?.savings
                    ? `, save ${formatCurrency(
                        viewItem.pricing.savings,
                        viewItem.pricing?.currency || "INR"
                      )}`
                    : ""}
                </p>
              )}

              <div className="item-view-details-grid">
                <div>
                  <span>Category</span>
                  <strong>{viewItem.category?.name || "Uncategorized"}</strong>
                </div>

                <div>
                  <span>Stock</span>
                  <strong>{formatStockText(viewItem.stock)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {formatItemStatus(
                      viewItem.stock?.status,
                      viewItem.stock?.available
                    )}
                  </strong>
                </div>

                <div>
                  <span>Rating</span>
                  <strong>
                    {viewItem.ratings?.average || 0} / 5
                    {viewItem.ratings?.totalReviews
                      ? ` (${viewItem.ratings.totalReviews})`
                      : ""}
                  </strong>
                </div>
              </div>

              <div className="item-view-tags">
                <span>Tags</span>
                <div>
                  {(viewItem.tags || []).length ? (
                    viewItem.tags.map((tag) => <strong key={tag}>{tag}</strong>)
                  ) : (
                    <strong>No tags</strong>
                  )}
                </div>
              </div>

              {actionError && (
                <div className="items-action-error items-action-error--modal">
                  {actionError}
                </div>
              )}
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
                onClick={closeEditModal}
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

              <label>
                Price
                <input
                  type="number"
                  name="price"
                  value={editForm.price}
                  onChange={handleEditChange}
                  min="0"
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
                  min="0"
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

              <label>
                Stock
                <input
                  type="number"
                  name="quantity"
                  value={editForm.quantity}
                  onChange={handleEditChange}
                  min="0"
                />
              </label>

              <label>
                Tags
                <input
                  name="tags"
                  value={editForm.tags}
                  onChange={handleEditChange}
                  placeholder="tag one, tag two"
                />
              </label>
            </div>

            <label className="item-edit-checkbox">
              <input
                type="checkbox"
                name="isRecommended"
                checked={editForm.isRecommended}
                onChange={handleEditChange}
              />
              Recommended
            </label>

            {actionError && (
              <div className="items-action-error items-action-error--modal">
                {actionError}
              </div>
            )}

            <div className="item-edit-actions">
              <button
                type="button"
                className="item-edit-secondary"
                onClick={closeEditModal}
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


