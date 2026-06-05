import { useState } from "react";
import { adminApi } from "../../../api/admin/api";
import { toast } from "react-toastify";

const EditVendorProfileModal = ({ vendor, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    name: vendor.name || "",
    businessName: vendor.businessName || "",
    contactPerson: vendor.contactPerson || "",
    image: vendor.image || "",
    email: vendor.email || "",
    phone: vendor.phone || "",
    status: vendor.status || "active",
    address: {
      line1: vendor.address?.line1 || "",
      line2: vendor.address?.line2 || "",
      city: vendor.address?.city || "",
      state: vendor.address?.state || "",
      pincode: vendor.address?.pincode || "",
    },
    notes: vendor.notes || "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      address: { ...current.address, [name]: value },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      await adminApi.patch(`/vendors/${vendor._id}`, form);
      toast.success("Vendor profile updated");
      onUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update vendor profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-[#0f1218] dark:text-white">
        <h2 className="text-xl font-bold">Edit Vendor Profile</h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Vendor Name
              <input name="name" value={form.name} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" required />
            </label>
            <label className="text-sm font-medium">
              Business Name
              <input name="businessName" value={form.businessName} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              Contact Person
              <input name="contactPerson" value={form.contactPerson} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              Image URL
              <input name="image" value={form.image} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              Email
              <input type="email" name="email" value={form.email} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" required />
            </label>
            <label className="text-sm font-medium">
              Phone
              <input name="phone" value={form.phone} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" required />
            </label>
            <label className="text-sm font-medium">
              Status
              <select name="status" value={form.status} onChange={handleChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 border-t pt-4 md:grid-cols-3 dark:border-white/10">
            <label className="text-sm font-medium md:col-span-2">
              Address Line 1
              <input name="line1" value={form.address.line1} onChange={handleAddressChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              Address Line 2
              <input name="line2" value={form.address.line2} onChange={handleAddressChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              City
              <input name="city" value={form.address.city} onChange={handleAddressChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              State
              <input name="state" value={form.address.state} onChange={handleAddressChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
            <label className="text-sm font-medium">
              Pincode
              <input name="pincode" value={form.address.pincode} onChange={handleAddressChange} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Notes
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm text-black" />
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary rounded-lg px-4 py-2 text-sm font-semibold" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVendorProfileModal;
