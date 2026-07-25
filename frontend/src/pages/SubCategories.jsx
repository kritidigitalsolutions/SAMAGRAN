import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiMoreVertical, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import { getAdminRole } from "../utils/auth";

import { formatImageUrl } from "../utils/imageUrl";

const initialForm = {
  name: "",
  description: "",
  categoryId: "",
  status: "active",
};

export default function SubCategories() {
  const isSuperAdmin = getAdminRole() === "super-admin";
  const [subCategories, setSubCategories] = useState([]);
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
  const [categoryFilter, setCategoryFilter] = useState("all");

  const pagedSubCategories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return subCategories.slice(start, start + pageSize);
  }, [subCategories, page, pageSize]);

  // Fetch active categories for dropdown options
  const fetchCategories = async () => {
    try {
      const res = await API.get("/admin/categories", { params: { status: "active" } });
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error("Unable to load parent categories:", err);
    }
  };

  const fetchSubCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        status: statusFilter,
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        ...(categoryFilter !== "all" ? { categoryId: categoryFilter } : {}),
      };
      const res = await API.get("/admin/sub-categories", { params });
      setSubCategories(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load sub-categories.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchSubCategories, 300);
    return () => clearTimeout(timer);
  }, [fetchSubCategories]);

  useEffect(() => {
    setPage(1);
  }, [subCategories.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-subcategory-menu], [data-table-menu-popover]")) {
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

  const openEdit = (subCategory) => {
    setForm({
      name: subCategory?.name || "",
      description: subCategory?.description || "",
      categoryId: subCategory?.categoryId?._id || subCategory?.categoryId || "",
      status: subCategory?.status || "active",
    });
    setEditingId(subCategory?._id || "");
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
      setError("Sub-category name is required.");
      setSuccess("");
      return;
    }

    if (!form.categoryId) {
      setError("Parent category selection is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = new FormData();
      payload.append("name", form.name.trim());
      payload.append("description", form.description.trim());
      payload.append("categoryId", form.categoryId);
      payload.append("status", form.status);

      if (imageFile) {
        payload.append("imageFile", imageFile);
      }

      if (editingId) {
        await API.put(`/admin/sub-categories/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/sub-categories", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchSubCategories();
      setSuccess(editingId ? "Sub-category updated successfully." : "Sub-category created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save sub-category.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (subCategory) => {
    if (!subCategory?._id) return;
    if (!window.confirm(`Delete sub-category "${subCategory.name}"?`)) return;

    try {
      setError("");
      setSuccess("");
      await API.delete(`/admin/sub-categories/${subCategory._id}`);
      setSubCategories((current) => current.filter((entry) => entry._id !== subCategory._id));
      setSelectedIds((current) => current.filter((id) => id !== subCategory._id));
      setSuccess("Sub-category deleted successfully.");
      if (editingId === subCategory._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete sub-category.");
    }
  };

  const handleToggleStatus = async (subCategory) => {
    if (!subCategory?._id) return;
    const nextStatus = subCategory.status === "active" ? "inactive" : "active";

    try {
      await API.put(`/admin/sub-categories/${subCategory._id}`, {
        name: subCategory.name,
        categoryId: subCategory.categoryId?._id || subCategory.categoryId,
        status: nextStatus,
      });
      setSubCategories((current) =>
        current.map((entry) => (entry._id === subCategory._id ? { ...entry, status: nextStatus } : entry))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update sub-category status.");
    }
  };

  const toggleSelection = (subCategoryId, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(subCategoryId) ? current : [...current, subCategoryId];
      }
      return current.filter((id) => id !== subCategoryId);
    });
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(subCategories.map((subCat) => subCat._id));
      return;
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected sub-categories?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => API.delete(`/admin/sub-categories/${id}`)));
      setSubCategories((current) => current.filter((entry) => !selectedIds.includes(entry._id)));
      setSelectedIds([]);
      setSuccess("Selected sub-categories deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected sub-categories.");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Catalog</p>
            <h2 className="mt-2 text-2xl font-bold">Manage Sub Categories</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">Add, update and organize sub-categories linked to parent categories.</p>
          </div>
          <button type="button" onClick={openCreate} className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow">
            <FiPlus className="h-4 w-4" /> Add Sub Category
          </button>
        </div>
      </section>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${error
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
            <h3 className="text-lg font-bold">{editingId ? "Edit Sub Category" : "Create Sub Category"}</h3>
            <button type="button" onClick={closeForm} className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Category Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Parent Category</label>
              <select name="categoryId" value={form.categoryId} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1d2026] dark:text-white" required>
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
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
            <button type="submit" disabled={submitting} className="admin-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow disabled:opacity-60">{submitting ? "Saving..." : editingId ? "Save Changes" : "Create Sub Category"}</button>
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
              placeholder="Search sub-categories"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white">
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button type="button" onClick={fetchSubCategories} className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
              <FiRefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={handleDeleteSelected} disabled={!selectedIds.length} className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              Delete Selected
            </button>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading sub-categories...</p>
        ) : !subCategories.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">No sub-categories found.</p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="text-center py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={subCategories.length > 0 && selectedIds.length === subCategories.length}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">S.No</th>
                    <th className="px-4 py-3 font-semibold">Image</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Parent Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSubCategories.map((subCat, index) => (
                    <tr key={subCat._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                      <td className="text-center px-4 py-3">
                        {(getAdminRole() !== "vendor-admin" || subCat.categoryId?.vendorId) && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(subCat._id)}
                            onChange={(event) => toggleSelection(subCat._id, event.target.checked)}
                            className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3">
                        {subCat.image ? (
                          <img src={formatImageUrl(subCat.image)} alt={subCat.name} className="h-10 w-10 rounded-lg border border-[#D4AF37]/30 object-cover" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f8ecda] text-xs text-[#7b5a4e]">No</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2f1618] dark:text-[#fff3dc]">{subCat.name}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {subCat.categoryId?.vendorId ? (
                            <>
                              <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc] text-sm">
                                {subCat.categoryId.vendorId.businessName || subCat.categoryId.vendorId.name || "N/A"}
                              </p>
                              <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">
                                ID: {String(subCat.categoryId.vendorId._id || "").slice(-6).toUpperCase()}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">Global / Admin</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{subCat.code || "-"}</td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0] max-w-[300px]"><span className="line-clamp-2" title={subCat.description}>{subCat.description || "-"}</span></td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#6f3945] dark:text-[#f7e3c0]">{subCat.categoryId?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${subCat.status === "inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {subCat.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" data-subcategory-menu>
                        {(getAdminRole() !== "vendor-admin" || subCat.categoryId?.vendorId) ? (
                          <div className="relative inline-flex">
                            <button
                               type="button"
                               onClick={(event) => {
                                 const nextId = openMenuId === subCat._id ? "" : subCat._id;
                                 setOpenMenuId(nextId);
                                 setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                               }}
                               className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                            >
                              <FiMoreVertical />
                            </button>
                            {openMenuId === subCat._id && (
                              <TableMenuPopover
                                open
                                anchorRect={menuAnchorRect}
                                preferUp={index >= pagedSubCategories.length - 3}
                                onClose={() => setOpenMenuId("")}
                                className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    openEdit(subCat);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                                >
                                  <FiEdit2 className="text-[#6f3945]" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    handleToggleStatus(subCat);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                                >
                                  <span className="text-[#6f3945]">
                                    {subCat.status === "inactive" ? "Mark Active" : "Mark Inactive"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    handleDelete(subCat);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-500/10"
                                >
                                  <FiTrash2 className="text-red-600" /> Delete
                                </button>
                              </TableMenuPopover>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#7f5a4f] dark:text-[#e7c98b] font-medium">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={subCategories.length}
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
