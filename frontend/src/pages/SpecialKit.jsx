import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit, FiEye, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import "./SpecialKit.css";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const emptyForm = {
  name: "",
  festivalType: "",
  kitPrice: "",
  description: "",
};

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

const getKitId = (kit) => kit?._id || kit?.id;

const buildFormFromKit = (kit = {}) => ({
  name: kit.name || "",
  festivalType: kit.festivalType || "",
  kitPrice: kit.kitPrice ?? "",
  description: kit.description || "",
});

const buildSelectedItemsFromKit = (kit = {}) =>
  (kit.items || []).reduce((selected, item) => {
    const productId = item.product?._id || item.product || item.id;

    if (productId) {
      selected[productId] = item.quantity || 1;
    }

    return selected;
  }, {});

export default function SpecialKit() {
  const [kits, setKits] = useState([]);
  const [items, setItems] = useState([]);
  const [itemCatalog, setItemCatalog] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [festivalFilter, setFestivalFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [viewKit, setViewKit] = useState(null);
  const [editKit, setEditKit] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSelectedItems, setEditSelectedItems] = useState({});
  const [editImageFile, setEditImageFile] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedKitItems = useMemo(
    () =>
      Object.entries(selectedItems)
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([product, quantity]) => ({
          product,
          quantity: Number(quantity),
        })),
    [selectedItems]
  );

  const selectedTotal = useMemo(
    () =>
      Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
        const item = itemCatalog[itemId];
        return total + Number(item?.pricing?.price || 0) * Number(quantity || 0);
      }, 0),
    [itemCatalog, selectedItems]
  );

  const savedPrice = Math.max(selectedTotal - Number(form.kitPrice || 0), 0);
  const previewImageUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile]
  );
  const editKitItems = useMemo(
    () =>
      Object.entries(editSelectedItems)
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([product, quantity]) => ({
          product,
          quantity: Number(quantity),
        })),
    [editSelectedItems]
  );
  const editTotal = useMemo(
    () =>
      Object.entries(editSelectedItems).reduce((total, [itemId, quantity]) => {
        const item = itemCatalog[itemId];
        const price = item?.pricing?.price ?? item?.price;

        return total + Number(price || 0) * Number(quantity || 0);
      }, 0),
    [editSelectedItems, itemCatalog]
  );
  const editSavedPrice = Math.max(editTotal - Number(editForm.kitPrice || 0), 0);
  const editPreviewImageUrl = useMemo(
    () => (editImageFile ? URL.createObjectURL(editImageFile) : formatImageUrl(editKit?.image)),
    [editImageFile, editKit?.image]
  );

  const fetchKits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/kits", {
        params: {
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          ...(festivalFilter !== "All" ? { festivalType: festivalFilter } : {}),
        },
      });

      setKits(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load Samagran kits.");
    } finally {
      setLoading(false);
    }
  }, [festivalFilter, searchTerm]);

  const fetchItems = useCallback(async (searchValue = "") => {
    try {
      setItemsLoading(true);

      const res = await API.get("/items", {
        params: {
          limit: 100,
          ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
        },
      });

      const products = res.data?.data?.products || [];

      setItems(products);
      setItemCatalog((currentCatalog) => {
        const nextCatalog = { ...currentCatalog };
        products.forEach((item) => {
          nextCatalog[item._id] = item;
        });
        return nextCatalog;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load items for kits.");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(() => {
      fetchItems(itemSearchTerm);
    }, 350);

    return () => clearTimeout(searchTimer);
  }, [fetchItems, itemSearchTerm]);

  useEffect(() => {
    return () => {
      if (imageFile && previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [imageFile, previewImageUrl]);

  useEffect(() => {
    return () => {
      if (editImageFile && editPreviewImageUrl) {
        URL.revokeObjectURL(editPreviewImageUrl);
      }
    };
  }, [editImageFile, editPreviewImageUrl]);

  useEffect(() => {
    const searchTimer = setTimeout(fetchKits, 350);

    return () => clearTimeout(searchTimer);
  }, [fetchKits]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleQuantityChange = (itemId, value) => {
    setSelectedItems((currentItems) => ({
      ...currentItems,
      [itemId]: value,
    }));
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleEditQuantityChange = (itemId, value) => {
    setEditSelectedItems((currentItems) => ({
      ...currentItems,
      [itemId]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setItemSearchTerm("");
    setSelectedItems({});
  };

  const handleCreateKit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.kitPrice || !selectedKitItems.length) {
      setError("Name, kit price, and at least one item are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("festivalType", form.festivalType.trim());
      formData.append("kitPrice", Number(form.kitPrice));
      formData.append("items", JSON.stringify(selectedKitItems));

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const res = await API.post("/kits", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setKits((currentKits) => [res.data?.data, ...currentKits].filter(Boolean));
      resetForm();
      setShowCreateForm(false);
      setSuccess("Samagran kit created successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create Samagran kit.");
    } finally {
      setSaving(false);
    }
  };

  const openViewKit = async (kit) => {
    const kitId = getKitId(kit);

    try {
      setActionLoading(`view-${kitId}`);
      setError("");
      setSuccess("");

      const res = await API.get(`/kits/${kitId}`);

      setViewKit(res.data?.data || kit);
    } catch (err) {
      setViewKit(kit);
      setError(err.response?.data?.message || "Showing saved kit details. Latest details could not be loaded.");
    } finally {
      setActionLoading("");
    }
  };

  const openEditKit = async (kit) => {
    const kitId = getKitId(kit);

    try {
      setActionLoading(`edit-${kitId}`);
      setError("");
      setSuccess("");
      setEditImageFile(null);

      const res = await API.get(`/kits/${kitId}`);
      const kitDetails = res.data?.data || kit;

      setEditKit(kitDetails);
      setEditForm(buildFormFromKit(kitDetails));
      setEditSelectedItems(buildSelectedItemsFromKit(kitDetails));

      setItemCatalog((currentCatalog) => {
        const nextCatalog = { ...currentCatalog };

        (kitDetails.items || []).forEach((item) => {
          const itemId = item.product?._id || item.product || item.id;

          if (itemId && !nextCatalog[itemId]) {
            nextCatalog[itemId] = {
              _id: itemId,
              title: item.product?.title || item.name || "Kit item",
              pricing: item.product?.pricing || { price: item.price || 0 },
              media: item.product?.media || { image: [item.image].filter(Boolean) },
              category: item.product?.category || { name: "Kit item" },
            };
          }
        });

        return nextCatalog;
      });

      setItems((currentItems) => {
        const nextItems = [...currentItems];

        (kitDetails.items || []).forEach((item) => {
          const itemId = item.product?._id || item.product || item.id;
          const itemExists = nextItems.some((currentItem) => currentItem._id === itemId);

          if (itemId && !itemExists) {
            nextItems.push({
              _id: itemId,
              title: item.product?.title || item.name || "Kit item",
              pricing: item.product?.pricing || { price: item.price || 0 },
              media: item.product?.media || { image: [item.image].filter(Boolean) },
              category: item.product?.category || { name: "Kit item" },
            });
          }
        });

        return nextItems;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load this kit for editing.");
    } finally {
      setActionLoading("");
    }
  };

  const closeViewKit = () => {
    setViewKit(null);
  };

  const closeEditKit = () => {
    setEditKit(null);
    setEditForm(emptyForm);
    setEditSelectedItems({});
    setEditImageFile(null);
  };

  const handleUpdateKit = async (event) => {
    event.preventDefault();

    if (!editForm.name.trim() || !editForm.kitPrice || !editKitItems.length) {
      setError("Name, kit price, and at least one item are required.");
      return;
    }

    try {
      const kitId = getKitId(editKit);

      setSaving(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("name", editForm.name.trim());
      formData.append("description", editForm.description.trim());
      formData.append("festivalType", editForm.festivalType.trim());
      formData.append("kitPrice", Number(editForm.kitPrice));
      formData.append("items", JSON.stringify(editKitItems));

      if (editImageFile) {
        formData.append("imageFile", editImageFile);
      }

      await API.put(`/kits/${kitId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchKits();
      closeEditKit();
      setSuccess("Samagran kit updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update Samagran kit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKit = async (kit) => {
    if (!window.confirm(`Delete "${kit.name}"?`)) return;

    try {
      const kitId = getKitId(kit);

      setActionLoading(`delete-${kitId}`);
      setError("");
      setSuccess("");

      await API.delete(`/kits/${kitId}`);

      setKits((currentKits) =>
        currentKits.filter((currentKit) => getKitId(currentKit) !== kitId)
      );
      setSuccess("Samagran kit deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete Samagran kit.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="special-kit-page">
      <section className="special-kit-hero">
        <div>
          <p className="special-kit-eyebrow">Samagran Kits</p>
          <h2>Create curated festival kits</h2>
          <p>Bundle active items into premium offerings and manage them from one place.</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowCreateForm((current) => !current)}>
            <FiPlus />
            {showCreateForm ? "Hide Form" : "Create Samagran Kit"}
          </button>
          <button type="button" onClick={fetchKits}>
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </section>

      {(error || success) && (
        <div className={error ? "special-kit-alert special-kit-alert--error" : "special-kit-alert"}>
          {error || success}
        </div>
      )}

      <div className="special-kit-layout">
        {showCreateForm && (
        <form className="special-kit-form" onSubmit={handleCreateKit}>
          <div>
            <p className="special-kit-eyebrow">New kit</p>
            <h3>Kit details</h3>
          </div>

          <div className="special-kit-form-grid">
            <label>
              Kit name
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Diwali essentials"
                required
              />
            </label>

            <label>
              Festival type
              <input
                name="festivalType"
                value={form.festivalType}
                onChange={handleFormChange}
                placeholder="Diwali"
              />
            </label>

            <label>
              Kit price
              <input
                type="number"
                name="kitPrice"
                value={form.kitPrice}
                onChange={handleFormChange}
                placeholder="999"
                min="0"
                required
              />
            </label>

          </div>

          <label>
            Upload kit image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setImageFile(event.target.files?.[0] || null);
              }}
            />
          </label>

          {previewImageUrl && (
            <div className="special-kit-preview">
              <img src={previewImageUrl} alt="Samagran kit preview" />
              {imageFile && (
                <button type="button" onClick={() => setImageFile(null)}>
                  Remove local image
                </button>
              )}
            </div>
          )}

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Everything needed for a festive pooja setup."
              rows="4"
            />
          </label>

          <div className="special-kit-items-head">
            <div>
              <p className="special-kit-eyebrow">Items</p>
              <h3>Select products</h3>
            </div>
            <div className="special-kit-price-summary">
              <span>{formatCurrency(selectedTotal)} total</span>
              <span>{formatCurrency(savedPrice)} saved</span>
            </div>
          </div>

          <div className="special-kit-item-search">
            <FiSearch />
            <input
              type="search"
              value={itemSearchTerm}
              onChange={(event) => setItemSearchTerm(event.target.value)}
              placeholder="Search items to add"
              aria-label="Search items to add to Samagran kit"
            />
            {itemSearchTerm && (
              <button
                type="button"
                onClick={() => setItemSearchTerm("")}
                aria-label="Clear item search"
              >
                <FiX />
              </button>
            )}
          </div>

          {itemsLoading ? (
            <div className="special-kit-state">Loading items...</div>
          ) : !items.length ? (
            <div className="special-kit-state">
              {itemSearchTerm ? "No items match your search." : "No active items available."}
            </div>
          ) : (
            <div className="special-kit-items">
              {items.map((item) => (
                <label className="special-kit-item" key={item._id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.category?.name || "Uncategorized"} - {formatCurrency(item.pricing?.price)}</span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={selectedItems[item._id] || ""}
                    onChange={(event) =>
                      handleQuantityChange(item._id, event.target.value)
                    }
                    placeholder="Qty"
                  />
                </label>
              ))}
            </div>
          )}

          <div className="special-kit-actions">
            <button type="button" onClick={resetForm}>
              Clear
            </button>
            <button type="submit" disabled={saving || itemsLoading}>
              <FiPlus />
              {saving ? "Creating..." : "Create Kit"}
            </button>
          </div>
        </form>
        )}

        <section className="special-kit-list-panel">
          <div className="special-kit-list-head">
            <div>
              <p className="special-kit-eyebrow">Catalog</p>
              <h3>Samagran kits</h3>
            </div>

            <span>{kits.length} kits</span>
          </div>

          <div className="special-kit-filters">
            <div className="special-kit-search">
              <FiSearch />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search kits"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear kit search"
                >
                  <FiX />
                </button>
              )}
            </div>

            <select
              value={festivalFilter}
              onChange={(event) => setFestivalFilter(event.target.value)}
            >
              <option value="All">All festivals</option>
              {[...new Set(kits.map((kit) => kit.festivalType).filter(Boolean))].map(
                (festival) => (
                  <option value={festival} key={festival}>
                    {festival}
                  </option>
                )
              )}
            </select>
          </div>

          {loading ? (
            <div className="special-kit-state">Loading kits...</div>
          ) : !kits.length ? (
            <div className="special-kit-state">No Samagran kits found.</div>
          ) : (
            <div className="special-kit-cards">
              {kits.map((kit) => (
                <article className="special-kit-card" key={kit._id}>
                  <div className="special-kit-image">
                    {kit.image ? (
                      <img src={formatImageUrl(kit.image)} alt={kit.name} />
                    ) : (
                      <span>{kit.name?.charAt(0)?.toUpperCase() || "K"}</span>
                    )}
                  </div>

                  <div className="special-kit-card-body">
                    <div>
                      <span>{kit.festivalType || "Samagran"}</span>
                      <h4>{kit.name}</h4>
                      <p>{kit.description || "Curated kit for festival orders."}</p>
                    </div>

                    <div className="special-kit-price-row">
                      <strong>{formatCurrency(kit.kitPrice)}</strong>
                      <em>Saved price {formatCurrency(Math.max(kit.savings || 0, 0))}</em>
                    </div>

                    <div className="special-kit-card-actions">
                      <button
                        type="button"
                        className="special-kit-action-btn special-kit-action-btn--view"
                        onClick={() => openViewKit(kit)}
                        disabled={actionLoading === `view-${getKitId(kit)}`}
                      >
                        <FiEye />
                        {actionLoading === `view-${getKitId(kit)}` ? "Loading..." : "View"}
                      </button>
                      <button
                        type="button"
                        className="special-kit-action-btn special-kit-action-btn--edit"
                        onClick={() => openEditKit(kit)}
                        disabled={actionLoading === `edit-${getKitId(kit)}`}
                      >
                        <FiEdit />
                        {actionLoading === `edit-${getKitId(kit)}` ? "Loading..." : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="special-kit-action-btn special-kit-action-btn--delete"
                        onClick={() => handleDeleteKit(kit)}
                        disabled={actionLoading === `delete-${getKitId(kit)}`}
                      >
                        <FiTrash2 />
                        {actionLoading === `delete-${getKitId(kit)}` ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {viewKit && (
        <div className="special-kit-modal-backdrop" role="presentation">
          <section className="special-kit-modal special-kit-view-modal" aria-label={`${viewKit.name} details`}>
            <div className="special-kit-modal-head">
              <div>
                <p className="special-kit-eyebrow">{viewKit.festivalType || "Samagran Kit"}</p>
                <h3>{viewKit.name}</h3>
              </div>
              <button type="button" className="special-kit-modal-close" onClick={closeViewKit}>
                <FiX />
              </button>
            </div>

            <div className="special-kit-view-body">
              <div className="special-kit-view-image">
                {viewKit.image ? (
                  <img src={formatImageUrl(viewKit.image)} alt={viewKit.name} />
                ) : (
                  <span>{viewKit.name?.charAt(0)?.toUpperCase() || "K"}</span>
                )}
              </div>

              <div className="special-kit-view-content">
                <p>{viewKit.description || "Curated kit for festival orders."}</p>

                <div className="special-kit-view-stats">
                  <div>
                    <span>Total item value</span>
                    <strong>{formatCurrency(viewKit.totalPrice)}</strong>
                  </div>
                  <div>
                    <span>Kit price</span>
                    <strong>{formatCurrency(viewKit.kitPrice)}</strong>
                  </div>
                  <div>
                    <span>Saved price</span>
                    <strong>{formatCurrency(Math.max(viewKit.savings || 0, 0))}</strong>
                  </div>
                </div>

                <div className="special-kit-view-items">
                  <h4>Included items</h4>
                  {viewKit.items?.length ? (
                    viewKit.items.map((item) => (
                      <div className="special-kit-view-item" key={item.id || item.product?._id || item.product}>
                        <div>
                          <strong>{item.name || item.product?.title || "Kit item"}</strong>
                          <span>{formatCurrency(item.price || item.product?.pricing?.price)}</span>
                        </div>
                        <em>Qty {item.quantity || 1}</em>
                      </div>
                    ))
                  ) : (
                    <div className="special-kit-state">No item details available.</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {editKit && (
        <div className="special-kit-modal-backdrop" role="presentation">
          <form className="special-kit-modal special-kit-edit-modal" onSubmit={handleUpdateKit}>
            <div className="special-kit-modal-head">
              <div>
                <p className="special-kit-eyebrow">Edit kit</p>
                <h3>{editKit.name}</h3>
              </div>
              <button type="button" className="special-kit-modal-close" onClick={closeEditKit}>
                <FiX />
              </button>
            </div>

            <div className="special-kit-modal-grid">
              <label>
                Kit name
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  placeholder="Diwali essentials"
                  required
                />
              </label>

              <label>
                Festival type
                <input
                  name="festivalType"
                  value={editForm.festivalType}
                  onChange={handleEditFormChange}
                  placeholder="Diwali"
                />
              </label>

              <label>
                Kit price
                <input
                  type="number"
                  name="kitPrice"
                  value={editForm.kitPrice}
                  onChange={handleEditFormChange}
                  placeholder="999"
                  min="0"
                  required
                />
              </label>

              <label>
                Replace kit image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setEditImageFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>

            {editPreviewImageUrl && (
              <div className="special-kit-preview">
                <img src={editPreviewImageUrl} alt={`${editForm.name || "Samagran kit"} preview`} />
                {editImageFile && (
                  <button type="button" onClick={() => setEditImageFile(null)}>
                    Keep current image
                  </button>
                )}
              </div>
            )}

            <label>
              Description
              <textarea
                name="description"
                value={editForm.description}
                onChange={handleEditFormChange}
                placeholder="Everything needed for a festive pooja setup."
                rows="4"
              />
            </label>

            <div className="special-kit-items-head">
              <div>
                <p className="special-kit-eyebrow">Items</p>
                <h3>Update products</h3>
              </div>
              <div className="special-kit-price-summary">
                <span>{formatCurrency(editTotal)} total</span>
                <span>{formatCurrency(editSavedPrice)} saved</span>
              </div>
            </div>

            <div className="special-kit-item-search">
              <FiSearch />
              <input
                type="search"
                value={itemSearchTerm}
                onChange={(event) => setItemSearchTerm(event.target.value)}
                placeholder="Search items to add"
                aria-label="Search items to add to Samagran kit"
              />
              {itemSearchTerm && (
                <button type="button" onClick={() => setItemSearchTerm("")} aria-label="Clear item search">
                  <FiX />
                </button>
              )}
            </div>

            {itemsLoading ? (
              <div className="special-kit-state">Loading items...</div>
            ) : !items.length ? (
              <div className="special-kit-state">No active items available.</div>
            ) : (
              <div className="special-kit-items special-kit-edit-items">
                {items.map((item) => (
                  <label className="special-kit-item" key={item._id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.category?.name || "Uncategorized"} - {formatCurrency(item.pricing?.price)}</span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      value={editSelectedItems[item._id] || ""}
                      onChange={(event) => handleEditQuantityChange(item._id, event.target.value)}
                      placeholder="Qty"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="special-kit-actions">
              <button type="button" onClick={closeEditKit}>
                Cancel
              </button>
              <button type="submit" disabled={saving || itemsLoading}>
                <FiEdit />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}



