import React, { useState } from "react";
import { adminApi } from "../../../api/admin/api";
import { toast } from "react-toastify";

const ALL_PAGES = [
  "dashboard",
  "users",
  "orders",
  "products",
  "kits",
  "pandits",
  "rituals",
  "temples",
  "pandit-bookings",
  "banners",
  "coupons",
  "offers",
  "legal",
  "custom-samagri",
  "notifications",
  "settings",
  "delivery-boys",
  "delivery-charges",
  "transactions",
  "earnings",
  "withdrawals",
  "refunds",
  "vendors",
];

const EditVendorAccessModal = ({ vendor, onClose, onAccessUpdate }) => {
  const [selectedPages, setSelectedPages] = useState(vendor.pageAccess || []);

  const handleCheckboxChange = (page) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.patch(`/vendors/${vendor._id}/page-access`, {
        pageAccess: selectedPages,
      });
      toast.success("Vendor page access updated successfully!");
      onAccessUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update vendor access:", error);
      toast.error("Failed to update vendor access.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-[#0f1218] dark:text-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">
          Edit Page Access for {vendor.name}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {ALL_PAGES.map((page) => (
              <label key={page} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page)}
                  onChange={() => handleCheckboxChange(page)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-gray-700 dark:text-white capitalize">
                  {page.replace(/-/g, " ")}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVendorAccessModal;