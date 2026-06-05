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
  subBrand: "",
  status: "active",
};

const formatImageUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiOrigin}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

export default function Brands() {
  const [brands, setBrands] = useState([]);
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

  const pagedBrands = useMemo(() => {
    const start = (page - 1) * pageSize;
    return brands.slice(start, start + pageSize);
  }, [brands, page, pageSize]);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/admin/brands", {
        params: {
          status: statusFilter,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        },
      });
      setBrands(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load brands.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchBrands, 300);
    return () => clearTimeout(timer);
  }, [fetchBrands]);

  useEffect(() => {
    setPage(1);
  }, [brands.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-brand-menu], [data-table-menu-popover]")) {
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

  const openEdit = (brand) => {
    setForm({
      name: brand?.name || "",
      code: brand?.code || "",
      description: brand?.description || "",
      subBrand: brand?.subBrand || "",
      status: brand?.status || "active",
    });
    setEditingId(brand?._id || "");
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
      setError("Brand name is required.");
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
      payload.append("subBrand", form.subBrand || "");

      if (imageFile) {
        payload.append("imageFile", imageFile);
      }

      if (editingId) {
        await API.put(`/admin/brands/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/brands", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchBrands();
      setSuccess(editingId ? "Brand updated successfully." : "Brand created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save brand.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brand) => {
    if (!brand?._id) return;
    if (!window.confirm(`Delete brand "${brand.name}"?`)) return;

    try {
      setError("");
      setSuccess("");
      await API.delete(`/admin/brands/${brand._id}`);
      setBrands((current) => current.filter((entry) => entry._id !== brand._id));
      setSelectedIds((current) => current.filter((id) => id !== brand._id));
      setSuccess("Brand deleted successfully.");
      if (editingId === brand._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete brand.");
    }
  };

  const buildBrandPayload = (brand, overrides = {}) => {
    const payload = new FormData();
    payload.append("name", String(overrides.name ?? brand.name ?? "").trim());
    payload.append("code", String(overrides.code ?? brand.code ?? "").trim());
    payload.append("description", String(overrides.description ?? brand.description ?? "").trim());
    payload.append("status", overrides.status ?? brand.status ?? "inactive");
    payload.append("subBrand", overrides.subBrand ?? brand.subBrand ?? "");
    return payload;
  };

  const handleToggleStatus = async (brand) => {
    if (!brand?._id) return;
    const nextStatus = brand.status === "active" ? "inactive" : "active";

    try {
      const payload = buildBrandPayload(brand, { status: nextStatus });
      await API.put(`/admin/brands/${brand._id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBrands((current) =>
        current.map((entry) => (entry._id === brand._id ? { ...entry, status: nextStatus } : entry))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update brand status.");
    }
  };

  const toggleSelection = (brandId, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(brandId) ? current : [...current, brandId];
      }
      return current.filter((id) => id !== brandId);
    });
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(brands.map((brand) => brand._id));
      return;
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected brands?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => API.delete(`/admin/brands/${id}`)));
      setBrands((current) => current.filter((entry) => !selectedIds.includes(entry._id)));
      setSelectedIds([]);
      setSuccess("Selected brands deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected brands.");
    }
  };



  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Catalog</p>
            <h2 className="mt-2 text-2xl font-bold">Manage brands</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">Add, update and organize product brands.</p>
          </div>
          <button type="button" onClick={openCreate} className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow">
            <FiPlus className="h-4 w-4" /> Add Brand
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
            <h3 className="text-lg font-bold">{editingId ? "Edit Brand" : "Create Brand"}</h3>
            <button type="button" onClick={closeForm} className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <input name="code" value={form.code} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Brand</label>
              <input name="subBrand" value={form.subBrand} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" placeholder="Enter sub-brand name" />
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
            <textarea name="description" rows={3} value={form.description} onChange={handleChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image (optional)</label>
            <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-dashed border-[#d9c3a2] bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={closeForm} className="w-full rounded-2xl border border-[#d9c3a2] bg-white px-4 py-3 text-sm font-semibold text-[#7b3a4b] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black">Cancel</button>
            <button type="submit" disabled={submitting} className="admin-btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow disabled:opacity-60">{submitting ? "Saving..." : editingId ? "Save Changes" : "Create Brand"}</button>
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
              placeholder="Search brands"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="button" onClick={fetchBrands} className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
              <FiRefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={handleDeleteSelected} disabled={!selectedIds.length} className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              Delete Selected
            </button>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading brands...</p>
        ) : !brands.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">No brands found.</p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table text-left min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="text-center py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={brands.length > 0 && selectedIds.length === brands.length}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">S.No</th>
                    <th className="px-4 py-3 font-semibold">Image</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Sub Brand</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBrands.map((brand, index) => (
                    <tr key={brand._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                      <td className="text-center px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(brand._id)}
                          onChange={(event) => toggleSelection(brand._id, event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3">
                        {brand.image ? (
                          <img src={formatImageUrl(brand.image)} alt={brand.name} className="h-10 w-10 rounded-lg border border-[#D4AF37]/30 object-cover" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f8ecda] text-xs text-[#7b5a4e]">No</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2f1618] dark:text-[#fff3dc] line-">{brand.name}</td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0] line-">{brand.code || "-"}</td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0] max-w-[300px]" title={brand.description}><span className="line-clamp-2">{brand.description || "-"}</span></td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0] line-">{brand.subBrand || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${brand.status === "inactive" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {brand.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" data-brand-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId = openMenuId === brand._id ? "" : brand._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === brand._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedBrands.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(brand);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleToggleStatus(brand);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <span className="text-[#6f3945]">
                                  {brand.status === "inactive" ? "Mark Active" : "Mark Inactive"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDelete(brand);
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
              total={brands.length}
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
