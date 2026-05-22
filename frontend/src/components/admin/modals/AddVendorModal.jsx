import React, { useState } from "react";
import { adminApi } from "../../../api/admin/api";
import { toast } from "react-toastify";

const AddVendorModal = ({ onClose, onVendorAdded }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pageAccess, setPageAccess] = useState([]);
  const [loading, setLoading] = useState(false);

  const availablePages = [
    "dashboard",
    "orders",
    "products",
    "customers",
    "analytics",
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
        email,
        phone,
        password,
        pageAccess,
        role: "vendor", // Add default role
      });
      toast.success("Vendor added successfully");
      onVendorAdded();
      onClose();
    } catch (error) {
      console.error("Failed to add vendor:", error);
      toast.error(error.response?.data?.message || "Failed to add vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Add New Vendor</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="name">
              Vendor Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
              Owner Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="phone">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="10 digit mobile"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
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
