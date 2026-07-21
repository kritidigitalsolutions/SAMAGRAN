import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiEye, FiMoreVertical, FiTrash2, FiX, FiPlus } from "react-icons/fi";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";

const initialForm = {
  title: "",
  description: "",
  offerType: "discount",
  discountType: "flat",
  value: "",
  minOrderAmount: "",
  maxBenefit: "",
  isActive: true,
  startsAt: "",
  expiresAt: "",
};

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedOfferIds, setSelectedOfferIds] = useState([]);
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pagedOffers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return offers.slice(start, start + pageSize);
  }, [offers, page, pageSize]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/offers");
      setOffers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [offers.length]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-offer-menu], [data-table-menu-popover]")) {
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
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (offer) => {
    setForm({
      title: offer?.title || "",
      description: offer?.description || "",
      offerType: offer?.offerType || "discount",
      discountType: offer?.discountType || "flat",
      value: offer?.value || "",
      minOrderAmount: offer?.minOrderAmount || "",
      maxBenefit: offer?.maxBenefit || "",
      isActive: offer?.isActive !== false,
      startsAt: offer?.startsAt ? new Date(offer.startsAt).toISOString().slice(0, 10) : "",
      expiresAt: offer?.expiresAt ? new Date(offer.expiresAt).toISOString().slice(0, 10) : "",
    });
    setEditingId(offer?._id || "");
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Offer title is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        offerType: form.offerType,
        discountType: form.discountType,
        value: Number(form.value || 0),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxBenefit: Number(form.maxBenefit || 0),
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      };

      if (editingId) {
        await API.put(`/admin/offers/${editingId}`, payload);
      } else {
        await API.post("/admin/offers", payload);
      }

      await fetchOffers();
      setSuccess(editingId ? "Offer updated successfully." : "Offer created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save offer.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (offer) => {
    if (!offer?._id) return;
    if (!window.confirm(`Delete offer "${offer.title}"?`)) return;

    try {
      setDeletingId(offer._id);
      setError("");
      setSuccess("");
      await API.delete(`/admin/offers/${offer._id}`);
      setOffers((current) => current.filter((entry) => entry._id !== offer._id));
      setSuccess("Offer deleted successfully.");
      if (editingId === offer._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete offer.");
    } finally {
      setDeletingId("");
    }
  };

  const buildOfferPayload = (offer, overrides = {}) => ({
    title: String(overrides.title ?? offer.title ?? "").trim(),
    description: String(overrides.description ?? offer.description ?? "").trim(),
    offerType: overrides.offerType ?? offer.offerType ?? "discount",
    discountType: overrides.discountType ?? offer.discountType ?? "flat",
    value: Number(overrides.value ?? offer.value ?? 0),
    minOrderAmount: Number(overrides.minOrderAmount ?? offer.minOrderAmount ?? 0),
    maxBenefit: Number(overrides.maxBenefit ?? offer.maxBenefit ?? 0),
    isActive: overrides.isActive ?? offer.isActive ?? false,
    startsAt: (overrides.startsAt ?? offer.startsAt)
      ? new Date(overrides.startsAt ?? offer.startsAt)
      : null,
    expiresAt: (overrides.expiresAt ?? offer.expiresAt)
      ? new Date(overrides.expiresAt ?? offer.expiresAt)
      : null,
  });

  const handleToggleOfferStatus = async (offer) => {
    if (!offer?._id) return;
    const nextStatus = !offer.isActive;

    try {
      const payload = buildOfferPayload(offer, { isActive: nextStatus });
      await API.put(`/admin/offers/${offer._id}`, payload);
      setOffers((current) =>
        current.map((entry) =>
          entry._id === offer._id ? { ...entry, isActive: nextStatus } : entry
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update offer status.");
    }
  };

  const toggleOfferSelection = (offerId, checked) => {
    setSelectedOfferIds((current) => {
      if (checked) {
        return current.includes(offerId) ? current : [...current, offerId];
      }
      return current.filter((id) => id !== offerId);
    });
  };

  const toggleAllOffers = (checked) => {
    if (checked) {
      setSelectedOfferIds(offers.map((offer) => offer._id));
      return;
    }
    setSelectedOfferIds([]);
  };

  const handleDeleteSelectedOffers = async () => {
    if (!selectedOfferIds.length) return;
    if (!window.confirm(`Delete ${selectedOfferIds.length} selected offers?`)) return;

    try {
      await Promise.all(selectedOfferIds.map((offerId) => API.delete(`/admin/offers/${offerId}`)));
      setOffers((current) => current.filter((entry) => !selectedOfferIds.includes(entry._id)));
      setSelectedOfferIds([]);
      setSuccess("Selected offers deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected offers.");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Manage Offers <span className="text-sm">(Offers are the content of explain the Coupon Discount)</span></h2>
          <button
            onClick={openCreate}
            className="admin-btn-primary flex items-center gap-2 rounded-2xl border border-transparent px-4 py-2 text-sm font-medium transition-all"
          >
            <FiPlus size={18} />
            Add Offer
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">
            {selectedOfferIds.length} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelectedOffers}
            disabled={!selectedOfferIds.length}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          >
            Delete Selected
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-100 p-4 text-green-800 dark:bg-green-900 dark:text-green-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="py-8 text-center">No offers yet. Create one to get started.</div>
        ) : (
          <>
          <div className="admin-table-wrap overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                  <th className="px-4 py-3 text-center font-semibold">
                    <input
                      type="checkbox"
                      checked={offers.length > 0 && selectedOfferIds.length === offers.length}
                      onChange={(event) => toggleAllOffers(event.target.checked)}
                      className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                    />
                  </th>
                  <th className="serial-col px-2 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Offer Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Title</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Value</th>
                  <th className="px-4 py-3 text-left font-semibold">Min Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Expires</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedOffers.map((offer, index) => (
                  <tr
                    key={offer._id}
                    className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-surface-soft)]"
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOfferIds.includes(offer._id)}
                        onChange={(event) => toggleOfferSelection(offer._id, event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </td>
                    <td className="serial-col px-2 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6f3945] dark:text-[#f7e3c0]">
                      OFFER-{String(offer._id || "").slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#D4AF37]">{offer.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          offer.offerType === "cashback"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200"
                        }`}
                      >
                        {offer.offerType === "cashback" ? "Cashback" : "Discount"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {offer.discountType === "percent" ? `${offer.value}%` : `₹${offer.value}`}
                    </td>
                    <td className="px-4 py-3">₹{offer.minOrderAmount || 0}</td>
                    <td className="px-4 py-3">
                      {offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          offer.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {offer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" data-offer-menu>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(event) => {
                            const nextId = openMenuId === offer._id ? "" : offer._id;
                            setOpenMenuId(nextId);
                            setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === offer._id && (
                          <TableMenuPopover
                            open
                            anchorRect={menuAnchorRect}
                            preferUp={index >= pagedOffers.length - 3}
                            onClose={() => setOpenMenuId("")}
                            className="w-44 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(offer);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEye className="text-[#6f3945]" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(offer);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEdit2 className="text-[#6f3945]" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleToggleOfferStatus(offer);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <span className="text-[#6f3945]">{offer.isActive ? "Mark Inactive" : "Mark Active"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleDelete(offer);
                              }}
                              disabled={deletingId === offer._id}
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
            total={offers.length}
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

      {showForm && (
        <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">
              {editingId ? "Edit Offer" : "Create New Offer"}
            </h3>
            <button onClick={closeForm} className="p-1" title="Close form">
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">
                  Offer Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Diwali Mega Sale"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Offer Type</label>
                <select
                  name="offerType"
                  value={form.offerType}
                  onChange={handleChange}
                  className="h-11 w-full rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
                >
                  <option value="discount">Discount</option>
                  <option value="cashback">Cashback</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">Benefit Type</label>
                <select
                  name="discountType"
                  value={form.discountType}
                  onChange={handleChange}
                  className="h-11 w-full rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#181c24] dark:text-white dark:border-white/20"
                >
                  <option value="flat">Flat Amount (₹)</option>
                  <option value="percent">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium">Benefit Value</label>
                <input
                  type="number"
                  name="value"
                  value={form.value}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Min Order Amount (₹)</label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={form.minOrderAmount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Max Benefit (₹)</label>
                <input
                  type="number"
                  name="maxBenefit"
                  value={form.maxBenefit}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Start Date</label>
                <input
                  type="date"
                  name="startsAt"
                  value={form.startsAt}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Expiry Date</label>
                <input
                  type="date"
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Offer description"
                rows="3"
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] px-4 py-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="rounded"
              />
              <label htmlFor="isActive" className="font-medium">
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn-primary flex-1 rounded-2xl border border-transparent px-4 py-2 font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Offer" : "Create Offer"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-[var(--admin-border)] px-4 py-2 font-medium transition-all hover:bg-[var(--admin-surface-soft)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
