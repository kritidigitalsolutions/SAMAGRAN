import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiMoreVertical, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const initialForm = {
  name: "",
  code: "",
  description: "",
  subCategory: "",
  status: "active",
};

const formatImageUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiOrigin}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const pagedCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return categories.slice(start, start + pageSize);
  }, [categories, page, pageSize]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/categories", {
        params: {
          status: statusFilter,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        },
      });
      setCategories(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchCategories, 300);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  useEffect(() => {
    setPage(1);
  }, [categories.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-category-menu], [data-table-menu-popover]")) {
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
    setImageFile(null);
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (category) => {
    setForm({
      name: category?.name || "",
      code: category?.code || "",
      description: category?.description || "",
      subCategory: category?.subCategory?._id || category?.subCategory || "",
      status: category?.status || "active",
    });
    setEditingId(category?._id || "");
    setImageFile(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Category name is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("code", form.code.trim());
      payload.append("description", form.description.trim());
      payload.append("status", form.status);
      payload.append("subCategory", form.subCategory || "");

      if (imageFile) {
        payload.append("imageFile", imageFile);
      }

      if (editingId) {
        await API.put(`/admin/categories/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/categories", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchCategories();
      setSuccess(editingId ? "Category updated successfully." : "Category created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save category.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (!category?._id) return;
    if (!window.confirm(`Delete category "${category.name}"?`)) return;

    try {
      setError("");
      setSuccess("");
      await API.delete(`/admin/categories/${category._id}`);
      setCategories((current) => current.filter((entry) => entry._id !== category._id));
      setSelectedIds((current) => current.filter((id) => id !== category._id));
      setSuccess("Category deleted successfully.");
      if (editingId === category._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete category.");
    }
  };

  const buildCategoryPayload = (category, overrides = {}) => {
    const payload = new FormData();
    payload.append("name", String(overrides.name ?? category.name ?? "").trim());
    payload.append("code", String(overrides.code ?? category.code ?? "").trim());
    payload.append("description", String(overrides.description ?? category.description ?? "").trim());
    payload.append("status", overrides.status ?? category.status ?? "inactive");
    payload.append("subCategory", overrides.subCategory ?? category.subCategory?._id ?? "");
    return payload;
  };

  const handleToggleStatus = async (category) => {
    if (!category?._id) return;
    const nextStatus = category.status === "active" ? "inactive" : "active";

    try {
      const payload = buildCategoryPayload(category, { status: nextStatus });
      await API.put(`/admin/categories/${category._id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCategories((current) =>
        current.map((entry) => (entry._id === category._id ? { ...entry, status: nextStatus } : entry))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update category status.");
    }
  };

  const toggleSelection = (categoryId, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(categoryId) ? current : [...current, categoryId];
      }
      return current.filter((id) => id !== categoryId);
    });
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(categories.map((category) => category._id));
      return;
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected categories?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => API.delete(`/admin/categories/${id}`)));
      setCategories((current) => current.filter((entry) => !selectedIds.includes(entry._id)));
      setSelectedIds([]);
      setSuccess("Selected categories deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected categories.");
    }
  };



  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Catalog</p>
            <h2 className="mt-2 text-2xl font-bold">Manage categories</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">Add, update and organize categories for products.</p>
          </div>
          <button type="button" onClick={openCreate} className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow">
            <FiPlus className="h-4 w-4" /> Add Category
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
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-[#d9c3a2]/60 bg-white/80 p-5 shadow-[var(--admin-shadow)] dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{editingId ? "Edit Category" : "Create Category"}</h3>
            <button type="button" onClick={closeForm} className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <input name="code" value={form.code} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Category</label>
              <input name="subCategory" value={form.subCategory} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" placeholder="Enter sub-category name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea name="description" rows={3} value={form.description} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image (optional)</label>
            <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-[#d9c3a2] bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-black/20" />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={closeForm} className="w-full rounded-2xl border border-[#d9c3a2] bg-white px-4 py-3 text-sm font-semibold text-[#7b3a4b] dark:border-white/20 dark:bg-black/20">Cancel</button>
            <button type="submit" disabled={submitting} className="admin-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow disabled:opacity-60">{submitting ? "Saving..." : editingId ? "Save Changes" : "Create Category"}</button>
          </div>
        </form>
      )}

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[var(--admin-primary)]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search categories"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="button" onClick={fetchCategories} className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
              <FiRefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={handleDeleteSelected} disabled={!selectedIds.length} className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              Delete Selected
            </button>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading categories...</p>
        ) : !categories.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">No categories found.</p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="text-center py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={categories.length > 0 && selectedIds.length === categories.length}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">S.No</th>
                    <th className="px-4 py-3 font-semibold">Image</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Sub Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCategories.map((category, index) => (
                    <tr key={category._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                      <td className="text-center px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(category._id)}
                          onChange={(event) => toggleSelection(category._id, event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3">
                        {category.image ? (
                          <img src={formatImageUrl(category.image)} alt={category.name} className="h-10 w-10 rounded-lg border border-[#D4AF37]/30 object-cover" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f8ecda] text-xs text-[#7b5a4e]">No</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2f1618] dark:text-[#fff3dc]">{category.name}</td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{category.code || "-"}</td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0] max-w-[300px]"
                       title={category.description}
                       >
                        <span className="line-clamp-2">
                          {category.description || "-"}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{category.subCategory || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${category.status === "inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {category.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" data-category-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId = openMenuId === category._id ? "" : category._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === category._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedCategories.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(category);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleToggleStatus(category);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <span className="text-[#6f3945]">
                                  {category.status === "inactive" ? "Mark Active" : "Mark Inactive"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDelete(category);
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
              total={categories.length}
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
