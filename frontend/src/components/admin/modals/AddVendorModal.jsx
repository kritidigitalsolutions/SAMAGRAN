import React, { useState } from "react";
import { adminApi } from "../../../api/admin/api";
import { toast } from "react-toastify";

const AddVendorModal = ({ onClose, onVendorAdded }) => {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [image, setImage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [pageAccess, setPageAccess] = useState([]);
  const [loading, setLoading] = useState(false);

  const availablePages = [
    "dashboard", "orders", "products", "items", "kits",
    "pandits", "rituals", "temples", "pandit-bookings",
    "banners", "coupons", "offers", "legal", "custom-samagri",
    "notifications", "delivery-boys", "settings",
    "transactions", "earnings", "withdrawals", "refunds"
  ];

  const handlePageAccessChange = (page) => {
    setPageAccess((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.post("/vendors", {
        name,
        businessName,
        contactPerson,
        image,
        email,
        phone,
        password,
        pageAccess,
        address,
        role: "vendor", // Add default role
      });
      toast.success("Vendor added successfully");
      onVendorAdded();
      onClose();
    } catch (error) {
      console.error("Failed to add vendor:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to add vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Add New Vendor</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="name">Vendor Name</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" required />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="businessName">Business Name</label>
              <input type="text" id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="contactPerson">Contact Person</label>
              <input type="text" id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="image">Image URL</label>
              <input type="url" id="image" value={image} onChange={(e) => setImage(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="email">Owner Email</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" required />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" placeholder="10 digit mobile" required />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="password">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" required />
            </div>
          </div>

          <div className="mb-4 border-t pt-4 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="line1">Line 1</label>
                <input
                  type="text" id="line1" value={address.line1}
                  onChange={(e) => setAddress({...address, line1: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="line2">Line 2</label>
                <input
                  type="text" id="line2" value={address.line2}
                  onChange={(e) => setAddress({...address, line2: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="city">City</label>
                <input
                  type="text" id="city" value={address.city}
                  onChange={(e) => setAddress({...address, city: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="state">State</label>
                <input
                  type="text" id="state" value={address.state}
                  onChange={(e) => setAddress({...address, state: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm" htmlFor="pincode">Pincode</label>
                <input
                  type="text" id="pincode" value={address.pincode}
                  onChange={(e) => setAddress({...address, pincode: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Page Access</label>
            <div className="grid grid-cols-2 gap-2">
              {availablePages.map((page) => (
                <label key={page} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={pageAccess.includes(page)}
                    onChange={() => handlePageAccessChange(page)}
                    className="form-checkbox h-5 w-5"
                  />
                  <span className="capitalize">{page}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVendorModal;
