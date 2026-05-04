import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import API from "../api/axios";

const initialForm = {
  name: "",
  description: "",
  contactPhone: "",
  contactPerson: "",
  openingTime: "",
  closingTime: "",
  facilitiesText: "",
  status: "active",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    pinCode: "",
    landmark: "",
  },
};

export default function Temples() {
  const [temples, settemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const fetchtemples = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/temples", { params: { status: "all" } });
      settemples(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load temples.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchtemples();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
    setImageFile(null);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        [name]: value,
      },
    }));
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (temple) => {
    setForm({
      name: temple?.name || "",
      description: temple?.description || "",
      contactPhone: temple?.contactPhone || "",
      contactPerson: temple?.contactPerson || "",
      openingTime: temple?.openingTime || "",
      closingTime: temple?.closingTime || "",
      facilitiesText: Array.isArray(temple?.facilities) ? temple.facilities.join(", ") : "",
      status: temple?.status || "active",
      address: {
        line1: temple?.address?.line1 || "",
        line2: temple?.address?.line2 || "",
        city: temple?.address?.city || "",
        state: temple?.address?.state || "",
        pinCode: temple?.address?.pinCode || "",
        landmark: temple?.address?.landmark || "",
      },
    });
    setEditingId(temple?._id || "");
    setImageFile(null);
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

    if (!form.name.trim()) {
      setError("temple name is required.");
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
      payload.append("contactPhone", form.contactPhone.trim());
      payload.append("contactPerson", form.contactPerson.trim());
      payload.append("openingTime", form.openingTime.trim());
      payload.append("closingTime", form.closingTime.trim());
      payload.append("facilities", form.facilitiesText);
      payload.append("status", form.status);
      payload.append("address[line1]", form.address.line1.trim());
      payload.append("address[line2]", form.address.line2.trim());
      payload.append("address[city]", form.address.city.trim());
      payload.append("address[state]", form.address.state.trim());
      payload.append("address[pinCode]", form.address.pinCode.trim());
      payload.append("address[landmark]", form.address.landmark.trim());

      if (imageFile) {
        payload.append("imageFile", imageFile);
      }

      if (editingId) {
        await API.put(`/admin/temples/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/temples", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchtemples();
      setSuccess(editingId ? "temple updated successfully." : "temple created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save temple.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (temple) => {
    if (!temple?._id) return;
    if (!window.confirm(`Delete temple "${temple.name}"?`)) return;

    try {
      setDeletingId(temple._id);
      setError("");
      setSuccess("");
      await API.delete(`/admin/temples/${temple._id}`);
      settemples((current) => current.filter((entry) => entry._id !== temple._id));
      setSuccess("temple deleted successfully.");
      if (editingId === temple._id) {
        closeForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete temple.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">Admin temples</p>
            <h2 className="mt-2 text-2xl font-bold">Manage temple locations for booking</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Add temple details for temple ritual bookings. Users can select from this list when booking mode is temple ritual.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                openCreate();
              }
            }}
            className="admin-btn-primary rounded-2xl px-4 py-2 text-sm font-semibold shadow"
          >
            {showForm ? "Hide Form" : "Add temple"}
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
        <form onSubmit={handleSubmit} className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">{editingId ? "Edit temple" : "Add New temple"}</h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20"
              aria-label="Close form"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">temple Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                placeholder="e.g. Shri Durga temple"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image File</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFieldChange}
                rows={3}
                placeholder="Short details about this temple"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Person</label>
              <input
                type="text"
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleFieldChange}
                placeholder="Priest / Manager"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Phone</label>
              <input
                type="text"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleFieldChange}
                placeholder="+91..."
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Time</label>
              <input
                type="text"
                name="openingTime"
                value={form.openingTime}
                onChange={handleFieldChange}
                placeholder="06:00 AM"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Closing Time</label>
              <input
                type="text"
                name="closingTime"
                value={form.closingTime}
                onChange={handleFieldChange}
                placeholder="09:00 PM"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Facilities (comma separated)</label>
              <input
                type="text"
                name="facilitiesText"
                value={form.facilitiesText}
                onChange={handleFieldChange}
                placeholder="Parking, Wheelchair access, Prasad"
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 1</label>
              <input
                type="text"
                name="line1"
                value={form.address.line1}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 2</label>
              <input
                type="text"
                name="line2"
                value={form.address.line2}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input
                type="text"
                name="city"
                value={form.address.city}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <input
                type="text"
                name="state"
                value={form.address.state}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pin Code</label>
              <input
                type="text"
                name="pinCode"
                value={form.address.pinCode}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Landmark</label>
              <input
                type="text"
                name="landmark"
                value={form.address.landmark}
                onChange={handleAddressChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleFieldChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#23272e] dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Create temple"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="rounded-3xl border border-[#dcc7ab]/60 bg-white/75 p-5 dark:border-white/10 dark:bg-white/5">
        <h3 className="mb-4 text-lg font-bold">temple List</h3>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            Loading temples...
          </div>
        ) : temples.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7bf9b] px-4 py-6 text-sm text-[#7b5a4b] dark:border-white/15 dark:text-[#f7e3c0]/75">
            No temples added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                  <th className="px-3 py-3">Images</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">City</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {temples.map((temple) => (
                  <tr key={temple._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                    <td className="px-3 py-4 "><img src={temple.image} className="rounded" width={80} height={30} alt="" /></td>
                    <td className="px-3 py-4">
                      <p className="font-semibold">{temple.name}</p>
                      <p className="text-xs text-[#6e4b40] dark:text-[#f7e3c0]/80">{temple.address?.line1 || temple.address?.landmark || "-"}</p>
                    </td>
                    <td className="px-3 py-4">{temple.address?.city || "-"}</td>
                    <td className="px-3 py-4">{temple.contactPhone || "-"}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          temple.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                        }`}
                      >
                        {temple.status}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(temple)}
                          className="rounded-lg border border-[#d7bf9b] p-2 text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          title="Edit"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(temple)}
                          disabled={deletingId === temple._id}
                          className="rounded-lg border border-red-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                          title="Delete"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
