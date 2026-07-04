import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeCities } from "../utils/normalizeCity";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import { getAdminRole } from "../utils/auth";
import "./Items.css";
import "./AddItem.css";
import {
  FiEye,
  FiEdit,
  FiFilter,
  FiMoreVertical,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";

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
  categoryId: "",
  subCategoryId: "",
  subCategoryName: "",
  brandId: "",
  subBrand: "",
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
  pincode: "",
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

  // Resolve populated categoryId — may be an object (populated) or an ID string
  const rawCategoryId = item.categoryId ?? fallback.categoryId ?? null;
  const categoryIdObj =
    rawCategoryId && typeof rawCategoryId === "object" ? rawCategoryId : null;
  const categoryIdStr =
    categoryIdObj?._id
      ? String(categoryIdObj._id)
      : rawCategoryId
        ? String(rawCategoryId)
        : "";

  // Resolve populated subCategoryId — may be an object (populated) or an ID string
  const rawSubCategoryId = item.subCategoryId ?? fallback.subCategoryId ?? null;
  const subCategoryIdObj =
    rawSubCategoryId && typeof rawSubCategoryId === "object" ? rawSubCategoryId : null;
  const subCategoryIdStr =
    subCategoryIdObj?._id
      ? String(subCategoryIdObj._id)
      : rawSubCategoryId
        ? String(rawSubCategoryId)
        : "";

  // Resolve populated brandId — may be an object (populated) or an ID string
  const rawBrandId = item.brandId ?? fallback.brandId ?? null;
  const brandIdObj =
    rawBrandId && typeof rawBrandId === "object" ? rawBrandId : null;
  const brandIdStr =
    brandIdObj?._id
      ? String(brandIdObj._id)
      : rawBrandId
        ? String(rawBrandId)
        : "";

  // Derive category display data: populated ref > item.category > fallback
  const categoryName =
    categoryIdObj?.name ||
    item.category?.name ||
    fallback.category?.name ||
    "";
  const categorySubCategory =
    subCategoryIdObj?.name ||
    categoryIdObj?.subCategory ||
    item.category?.subCategory ||
    fallback.category?.subCategory ||
    "";

  // Derive brand display data: populated ref > item.brand > details.brand > fallback
  const brandName =
    brandIdObj?.name ||
    item.brand?.name ||
    details.brand ||
    fallback.brand?.name ||
    fallback.details?.brand ||
    "";
  const brandSubBrand =
    brandIdObj?.subBrand ||
    item.brand?.subBrand ||
    details.subBrand ||
    fallback.brand?.subBrand ||
    fallback.details?.subBrand ||
    "";

  return {
    ...fallback,
    _id: item._id || item.id || fallback._id,
    title: item.title ?? fallback.title ?? "",
    description: item.description ?? fallback.description ?? "",
    slug: item.slug ?? fallback.slug,
    itemCode: item.itemCode || fallback.itemCode || "",
    // Expose populated ref objects for the form pre-population
    categoryId: categoryIdObj || (categoryIdStr ? { _id: categoryIdStr, name: categoryName, subCategory: categorySubCategory } : null),
    subCategoryId: subCategoryIdObj || (subCategoryIdStr ? { _id: subCategoryIdStr, name: categorySubCategory } : null),
    brandId: brandIdObj || (brandIdStr ? { _id: brandIdStr, name: brandName, subBrand: brandSubBrand } : null),
    // Normalized display objects — always safe to read from
    category: {
      name: categoryName,
      subCategory: categorySubCategory,
    },
    brand: {
      name: brandName,
      subBrand: brandSubBrand,
    },
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
      pincode: compliance.pincode ?? "",
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
  // categoryId and brandId may be populated objects or ID strings
  categoryId:
    item.categoryId?._id
      ? String(item.categoryId._id)
      : item.categoryId
        ? String(item.categoryId)
        : "",
  subCategoryId:
    item.subCategoryId?._id
      ? String(item.subCategoryId._id)
      : item.subCategoryId
        ? String(item.subCategoryId)
        : "",
  subCategoryName: item.category?.subCategory || item.categoryId?.subCategory || "",
  brandId:
    item.brandId?._id
      ? String(item.brandId._id)
      : item.brandId
        ? String(item.brandId)
        : "",
  subBrand: item.brand?.subBrand || item.brandId?.subBrand || item.details?.subBrand || "",
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
  pincode: item.compliance?.pincode || "",
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
  const adminRole = getAdminRole();
  const isSuperAdmin = adminRole === "super-admin";
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [subBrandFilter, setSubBrandFilter] = useState("all");
  const [hsnFilter, setHsnFilter] = useState("all");
  const [gstPercentFilter, setGstPercentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [pincodeFilter, setPincodeFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Fetch categories, subcategories and brands on mount
  useEffect(() => {
    const fetchCategoriesAndBrands = async () => {
      try {
        const [catRes, subCatRes, brandRes] = await Promise.all([
          API.get("/admin/categories", { params: { status: "all" } }),
          API.get("/admin/sub-categories", { params: { status: "active" } }),
          API.get("/admin/brands", { params: { status: "all" } }),
        ]);
        setCategories(catRes.data?.data || []);
        setSubCategories(subCatRes.data?.data || []);
        setBrands(brandRes.data?.data || []);
      } catch (err) {
        console.error("Error fetching categories/subcategories/brands:", err.message);
      }
    };
    fetchCategoriesAndBrands();
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/items", {
        params: {
          limit: 100,
          status: statusFilter,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          ...(brandFilter !== "all" ? { brandId: brandFilter } : {}),
          ...(subBrandFilter !== "all" ? { subBrand: subBrandFilter } : {}),
          ...(hsnFilter !== "all" ? { hsnCode: hsnFilter } : {}),
          ...(gstPercentFilter !== "all"
            ? { gstPercent: gstPercentFilter }
            : {}),
          ...(categoryFilter !== "all" ? { categoryId: categoryFilter } : {}),
          ...(subCategoryFilter !== "all"
            ? { subCategory: subCategoryFilter }
            : {}),
          // City filter — super-admin only
          ...(isSuperAdmin && cityFilter !== "all" ? { city: cityFilter } : {}),
          ...(isSuperAdmin && pincodeFilter !== "all" ? { pincode: pincodeFilter } : {}),
        },
      });

      const list = res.data?.data?.products || [];
      setItems(list.map((item) => normalizeItem(item)));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load items right now.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    statusFilter,
    brandFilter,
    subBrandFilter,
    hsnFilter,
    gstPercentFilter,
    categoryFilter,
    subCategoryFilter,
    cityFilter,
    pincodeFilter,
    isSuperAdmin,
  ]);
  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const brandOptions = useMemo(() => {
    return brands
      .filter((b) => b.status === "active")
      .map((b) => ({ id: b._id, name: b.name }));
  }, [brands]);

  const subBrandOptions = useMemo(() => {
    return Array.from(
      new Set(
        brands
          .filter((b) => b.status === "active" && b.subBrand)
          .map((b) => b.subBrand),
      ),
    ).sort();
  }, [brands]);

  const hsnOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.compliance?.hsnCode).filter(Boolean)),
    ).sort();
  }, [items]);

  const gstPercentOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => Number(item.pricing?.gstPercent || 0))),
    )
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  }, [items]);

  // City options derived from all loaded products (compliance.city)
  const cityOptions = useMemo(() => {
    const raw = items.map((item) => String(item.compliance?.city || ""));
    return normalizeCities(raw);
  }, [items]);

  const pincodeOptions = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => String(item.compliance?.pincode || "").trim())
          .filter(Boolean),
      ),
    ).sort();
  }, [items]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => c.status === "active")
      .map((c) => ({ id: c._id, name: c.name }));
  }, [categories]);

  const subCategoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        categories
          .filter((c) => c.status === "active" && c.subCategory)
          .map((c) => c.subCategory),
      ),
    ).sort();
  }, [categories]);

  const filteredItems = items;
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filteredItems.length]);

  const handleSelectChange = (setter) => (event) => {
    setter(event.target.value);
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (
        !event.target.closest("[data-item-menu], [data-table-menu-popover]")
      ) {
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

      await API.post("/items/add", formData);

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
        formData.append(
          "discountValue",
          String(Number(editForm.discountValue)),
        );
      }
      formData.append("discountIsActive", String(editForm.discountIsActive));
      formData.append("discountStartsAt", editForm.discountStartsAt || "");
      formData.append("discountExpiresAt", editForm.discountExpiresAt || "");

      formData.append("priceIncludesGst", String(editForm.priceIncludesGst));
      formData.append("categoryId", editForm.categoryId || "");
      formData.append("subCategoryId", editForm.subCategoryId || "");
      formData.append("subCategoryName", editForm.subCategoryName || "");
      formData.append("brandId", editForm.brandId || "");

      productDetailFields.forEach((field) => {
        formData.append(field.name, editForm[field.name] || "");
      });
      formData.append("hsnCode", editForm.hsnCode || "");
      formData.append("city", editForm.city || "");
      formData.append("pincode", editForm.pincode || "");
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

      const res = await API.put(`/items/${editItem._id}`, formData);
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
      
      // Optimistically remove item from UI
      setItems((current) => current.filter((entry) => entry._id !== item._id));
      
      // Then call API to delete
      await API.delete(`/items/${item._id}`);
    } catch (err) {
      // Revert if deletion fails
      await fetchItems();
      setActionError(err.response?.data?.message || "Unable to delete item.");
    } finally {
      setActionLoading("");
    }
  };

  const toggleItemSelection = (itemId, checked) => {
    setSelectedItemIds((current) => {
      if (checked) {
        return current.includes(itemId) ? current : [...current, itemId];
      }
      return current.filter((id) => id !== itemId);
    });
  };

  const toggleAllItems = (checked) => {
    if (checked) {
      setSelectedItemIds(filteredItems.map((item) => item._id));
      return;
    }
    setSelectedItemIds([]);
  };

  const handleDeleteSelectedItems = async () => {
    if (!selectedItemIds.length) return;
    if (!window.confirm(`Remove ${selectedItemIds.length} selected items?`))
      return;

    try {
      setActionLoading("delete-selected");
      setActionError("");
      
      // Optimistically remove items from UI
      setItems((current) =>
        current.filter((entry) => !selectedItemIds.includes(entry._id)),
      );
      
      // Then call APIs to delete
      await Promise.all(
        selectedItemIds.map((itemId) => API.delete(`/items/${itemId}`)),
      );
      setSelectedItemIds([]);
    } catch (err) {
      // Revert if deletion fails
      await fetchItems();
      setActionError(
        err.response?.data?.message || "Unable to delete selected items.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleToggleItemStatus = async (item) => {
    if (!item?._id) return;
    const nextStatus = item.status === "inactive" ? "active" : "inactive";

    try {
      setActionLoading(`status:${item._id}`);
      setActionError("");

      // Optimistically update status in UI
      setItems((current) =>
        current.map((entry) =>
          entry._id === item._id ? { ...entry, status: nextStatus } : entry,
        ),
      );

      const formData = new FormData();
      formData.append("status", nextStatus);

      await API.put(`/items/${item._id}`, formData);
    } catch (err) {
      // Revert if update fails and fetch latest
      await fetchItems();
      setActionError(
        err.response?.data?.message || "Unable to update item status.",
      );
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
              <select
                name="categoryId"
                value={createForm.categoryId}
                onChange={(e) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                    subCategoryId: "",
                    subCategoryName: "",
                  }));
                }}
                className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
              >
                <option value="">Select Category</option>
                {categories.filter(cat => cat.status === 'active').map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sub Category</label>
              <select
                name="subCategoryId"
                value={createForm.subCategoryId}
                onChange={(e) => {
                  const selectedSub = subCategories.find(s => s._id === e.target.value);
                  setCreateForm((prev) => ({
                    ...prev,
                    subCategoryId: e.target.value,
                    subCategoryName: selectedSub ? selectedSub.name : "",
                  }));
                }}
                className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
              >
                <option value="">Select Sub Category</option>
                {subCategories
                  .filter((sub) => (sub.categoryId?._id || sub.categoryId) === createForm.categoryId)
                  .map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label>Brand</label>
              <select
                name="brandId"
                value={createForm.brandId}
                onChange={(e) => {
                  const selectedBrand = brands.find(b => b._id === e.target.value);
                  setCreateForm((prev) => ({
                    ...prev,
                    brandId: e.target.value,
                    subBrand: selectedBrand?.subBrand || "",
                  }));
                }}
                className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
              >
                <option value="">Select Brand</option>
                {brands.filter(b => b.status === 'active').map((brand) => (
                  <option key={brand._id} value={brand._id}>{brand.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sub Brand</label>
              <input
                name="subBrand"
                value={createForm.subBrand}
                onChange={handleCreateChange}
                placeholder="Auto-filled from brand"
                className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
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
              <label>Pincode</label>
              <input
                name="pincode"
                value={createForm.pincode}
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
              <label>Product Images <span>(upload max 5 image)</span></label>
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

      <div className="items-toolbar">
        <div className="items-search-bar">
          <FiSearch />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search items, brand, sub brand, item code"
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

        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          className="items-filter-toggle"
        >
          <FiFilter />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="items-filter-panel">
          <div className="items-filter-grid">
            <label className="items-filter">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={handleSelectChange(setStatusFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="items-filter">
              <span>Brand</span>
              <select
                value={brandFilter}
                onChange={handleSelectChange(setBrandFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                {brandOptions.length ? (
                  brandOptions.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No brands
                  </option>
                )}
              </select>
            </label>
            <label className="items-filter">
              <span>Sub Brand</span>
              <select
                value={subBrandFilter}
                onChange={handleSelectChange(setSubBrandFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                {subBrandOptions.length ? (
                  subBrandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No sub brands
                  </option>
                )}
              </select>
            </label>
            <label className="items-filter">
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={handleSelectChange(setCategoryFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                {categoryOptions.length ? (
                  categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No categories
                  </option>
                )}
              </select>
            </label>
            <label className="items-filter">
              <span>Sub Category</span>
              <select
                value={subCategoryFilter}
                onChange={handleSelectChange(setSubCategoryFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                {subCategoryOptions.length ? (
                  subCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No sub categories
                  </option>
                )}
              </select>
            </label>
            <label className="items-filter">
              <span>HSN Code</span>
              <select
                value={hsnFilter}
                onChange={handleSelectChange(setHsnFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                {hsnOptions.length ? (
                  hsnOptions.map((hsn) => (
                    <option key={hsn} value={hsn}>
                      {hsn}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No HSN codes
                  </option>
                )}
              </select>
            </label>
            <label className="items-filter">
              <span>GST %</span>
              <select
                value={gstPercentFilter}
                onChange={handleSelectChange(setGstPercentFilter)}
                className="items-filter-input"
              >
                <option value="all">All</option>
                {gstPercentOptions.length ? (
                  gstPercentOptions.map((gst) => (
                    <option key={gst} value={String(gst)}>
                      {gst}%
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No GST
                  </option>
                )}
              </select>
            </label>

            {/* City filter — super-admin only */}
            {isSuperAdmin && (
              <label className="items-filter">
                <span>City</span>
                <select
                  value={cityFilter}
                  onChange={handleSelectChange(setCityFilter)}
                  className="items-filter-input"
                >
                  <option value="all">All Cities</option>
                  {cityOptions.length ? (
                    cityOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No cities
                    </option>
                  )}
                </select>
              </label>
            )}

            {/* Pincode filter — super-admin only */}
            {isSuperAdmin && (
              <label className="items-filter">
                <span>Pincode</span>
                <select
                  value={pincodeFilter}
                  onChange={handleSelectChange(setPincodeFilter)}
                  className="items-filter-input"
                >
                  <option value="all">All Pincodes</option>
                  {pincodeOptions.length ? (
                    pincodeOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No pincodes
                    </option>
                  )}
                </select>
              </label>
            )}

          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
          {selectedItemIds.length} selected
        </span>
        <button
          type="button"
          onClick={handleDeleteSelectedItems}
          disabled={
            !selectedItemIds.length || actionLoading === "delete-selected"
          }
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          Delete Selected
        </button>
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
        <>
          <div className="items-table-wrap">
            <table className="items-table">
              <thead className="dark:bg-[#2b2a25] text-left dark:text-[#f5deae] text-[#5c4a23]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        selectedItemIds.length === filteredItems.length
                      }
                      onChange={(event) => toggleAllItems(event.target.checked)}
                      className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                    />
                  </th>
                  <th className="px-2 py-3 font-semibold">S.No</th>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                  <th className="px-4 py-3 font-semibold">Item Code</th>
                  {/* <th className="px-4 py-3 font-semibold">Product</th> */}
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Subcategory</th>
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  {/* <th className="px-4 py-3 font-semibold">Sub Brand</th> */}
                  <th className="px-4 py-3 font-semibold">MRP</th>
                  {/* <th className="px-4 py-3 font-semibold">Base</th> */}
                  <th className="px-4 py-3 font-semibold">GST %</th>
                  {/* <th className="px-4 py-3 font-semibold">GST Amt</th> */}
                  <th className="px-4 py-3 font-semibold">Selling Price (₹)</th>
                  <th className="px-4 py-3 font-semibold">Earning Price (₹)</th>
                  <th className="px-4 py-3 font-semibold">Earning %</th>
                  <th className="px-4 py-3 font-semibold">HSN</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Pincode</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item, index) => (
                  <tr
                    key={item._id}
                    className="border-t-[1px] dark:border-[#53535398] text-black dark:text-white"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item._id)}
                        onChange={(event) =>
                          toggleItemSelection(item._id, event.target.checked)
                        }
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-7 flex gap-2">
                      {formatImageUrl(item.thumbnail) ? (
                        <img
                          src={formatImageUrl(item.thumbnail)}
                          alt={item.title}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#8B1E3F]/10" />
                      )}
                      
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p
                          className="font-semibold items-title-ellipsis text-wrap line-clamp-2"
                          title={item.title}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs opacity-70">
                          {item.pricing?.priceIncludesGst
                            ? "Incl GST"
                            : "Excl GST"}
                        </p>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {item.vendorId ? (
                          <>
                            <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc] text-sm">
                              {item.vendorId.businessName || item.vendorId.name || "N/A"}
                            </p>
                            <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">
                              ID: {String(item.vendorId._id || "").slice(-6).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                              {[item.vendorId.address?.city, item.vendorId.address?.state].filter(Boolean).join(", ")}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Super Admin / System</span>
                        )}
                      </td>
                    )}
                    {/* <td className="px-4 py-3 flex-row flex gap-2">
                    </td> */}
                    <td className="px-4 py-3 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">
                      {item.itemCode ||
                        `ITEM-${String(item._id || "")
                          .slice(-6)
                          .toUpperCase()}`}
                    </td>
                    {/* <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold items-title-ellipsis" title={item.title}>
                        {item.title}
                      </p>
                      <p className="text-xs opacity-70">
                        {item.pricing?.priceIncludesGst
                          ? "Incl GST"
                          : "Excl GST"}
                      </p>
                    </div>
                  </td> */}
                    <td className="px-4 py-3">
                      {item.category?.name || "Uncategorized"}
                    </td>
                    <td className="px-4 py-3">
                      {item.category?.subCategory || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {item.brand?.name || "-"}
                    </td>
                    {/* <td className="px-4 py-3">
                      {item.brand?.subBrand || "-"}
                    </td> */}
                    <td className="px-4 py-3">
                      {formatCurrency(item.pricing?.mrp)}
                    </td>
                    {/* <td className="px-4 py-3">
                    {formatCurrency(item.pricing?.basePrice)}
                  </td> */}
                    <td className="px-4 py-3">
                      {Number(item.pricing?.gstPercent || 0)}%
                    </td>
                    {/* <td className="px-4 py-3">
                    {formatCurrency(item.pricing?.gstAmount)}
                  </td> */}
                    <td className="px-4 py-3 font-semibold text-[#8B1E3F] dark:text-[#f7a8b8]">
                      {formatCurrency(item.pricing?.price)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                      {(() => {
                        const mrp = Number(item.pricing?.mrp || 0);
                        const price = Number(item.pricing?.price || 0);
                        const earning = mrp > price ? mrp - price : 0;
                        return earning > 0 ? formatCurrency(earning) : "—";
                      })()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                      {(() => {
                        const mrp = Number(item.pricing?.mrp || 0);
                        const price = Number(item.pricing?.price || 0);
                        if (!mrp || price >= mrp) return "—";
                        return `${Math.round(((mrp - price) / mrp) * 100)}%`;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {item.compliance?.hsnCode || "-"}
                    </td>
                    <td className="px-4 py-3">{item.stock?.quantity ?? "-"}</td>
                    <td className="px-4 py-3">
                      {item.compliance?.city || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {item.compliance?.pincode || "-"}
                    </td>
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
                    <td className="px-4 py-3 text-right" data-item-menu>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(event) => {
                            const nextId =
                              openMenuId === item._id ? "" : item._id;
                            setOpenMenuId(nextId);
                            setMenuAnchorRect(
                              nextId
                                ? event.currentTarget.getBoundingClientRect()
                                : null,
                            );
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === item._id && (
                          <TableMenuPopover
                            open
                            anchorRect={menuAnchorRect}
                            preferUp={index >= pagedItems.length - 3}
                            onClose={() => setOpenMenuId("")}
                            className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openViewModal(item);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEye className="text-[#6f3945]" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEditModal(item);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEdit className="text-[#6f3945]" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleToggleItemStatus(item);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <span className="text-[#6f3945]">
                                {item.status === "inactive"
                                  ? "Mark Active"
                                  : "Mark Inactive"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleDeleteItem(item);
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
            total={filteredItems.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            pageSizeOptions={[10]}
          />
        </>
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
                <div>
                  <span>Sub Category</span>
                  <strong>{viewItem.category?.subCategory || "-"}</strong>
                </div>
                <div>
                  <span>Brand</span>
                  <strong>{viewItem.brand?.name || "-"}</strong>
                </div>
                <div>
                  <span>Sub Brand</span>
                  <strong>{viewItem.brand?.subBrand || "-"}</strong>
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
                  <span>Pincode</span>
                  <strong>{viewItem.compliance?.pincode || "-"}</strong>
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
                <select
                  name="categoryId"
                  value={editForm.categoryId}
                  onChange={(e) => {
                    setEditForm((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                      subCategoryId: "",
                      subCategoryName: "",
                    }));
                  }}
                  className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.filter(cat => cat.status === 'active').map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </label>
              
              <label>
                Sub Category
                <select
                  name="subCategoryId"
                  value={editForm.subCategoryId}
                  onChange={(e) => {
                    const selectedSub = subCategories.find(s => s._id === e.target.value);
                    setEditForm((prev) => ({
                      ...prev,
                      subCategoryId: e.target.value,
                      subCategoryName: selectedSub ? selectedSub.name : "",
                    }));
                  }}
                  className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
                >
                  <option value="">Select Sub Category</option>
                  {subCategories
                    .filter((sub) => (sub.categoryId?._id || sub.categoryId) === editForm.categoryId)
                    .map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Brand
                <select
                  name="brandId"
                  value={editForm.brandId}
                  onChange={(e) => {
                    const selectedBrand = brands.find(b => b._id === e.target.value);
                    setEditForm((prev) => ({
                      ...prev,
                      brandId: e.target.value,
                      subBrand: selectedBrand?.subBrand || prev.subBrand,
                    }));
                  }}
                  className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
                >
                  <option value="">Select Brand</option>
                  {brands.filter(b => b.status === 'active').map((brand) => (
                    <option key={brand._id} value={brand._id}>{brand.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Sub Brand
                <input
                  name="subBrand"
                  value={editForm.subBrand}
                  onChange={handleEditChange}
                  placeholder="Auto-filled from brand"
                  className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm text-black outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
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
                Pincode
                <input
                  name="pincode"
                  value={editForm.pincode}
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
              <label>Product Images<span> (upload max 5 image)</span></label>
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
