import React, { useState, useEffect } from "react";
import {
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { adminApi } from "../../api/admin/api";
import { toast } from "react-toastify";
import EditVendorAccessModal from "../../components/admin/modals/EditVendorAccessModal";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get("/vendors");
      const vendorList = response.data?.data?.vendors || [];
      setVendors(Array.isArray(vendorList) ? vendorList : []);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      toast.error("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleUpdateStatus = async (vendorId, status) => {
    try {
      if (status === "approved") {
        await adminApi.patch(`/vendors/${vendorId}/approve`);
      } else if (status === "rejected") {
        await adminApi.patch(`/vendors/${vendorId}`, { status: "inactive" });
      }
      toast.success(`Vendor ${status}`);
      fetchVendors();
    } catch (error) {
      console.error("Failed to update vendor status:", error);
      toast.error("Failed to update vendor status");
    }
  };

  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setSelectedVendor(null);
    setIsModalOpen(false);
  };

  const handleAccessUpdate = () => {
    fetchVendors(); // Refresh vendor list after access update
  };

  if (loading) {
    return <div>Loading vendors...</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage Vendors</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Vendor Name
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Owner Email
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Page Access
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">
                      {vendor.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">
                      {vendor.owner?.email || "N/A"}
                    </p>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <span
                      className={`relative inline-block px-3 py-1 font-semibold leading-tight ${
                        vendor.status === "active"
                          ? "text-green-900"
                          : vendor.status === "pending"
                          ? "text-yellow-900"
                          : "text-red-900"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`absolute inset-0 ${
                          vendor.status === "active"
                            ? "bg-green-200"
                            : vendor.status === "pending"
                            ? "bg-yellow-200"
                            : "bg-red-200"
                        } opacity-50 rounded-full`}
                      ></span>
                      <span className="relative">{vendor.status}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">
                      {vendor.pageAccess.join(", ")}
                    </p>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <div className="flex items-center space-x-3">
                      {vendor.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateStatus(vendor._id, "approved")
                            }
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(vendor._id, "rejected")
                            }
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openEditModal(vendor)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Page Access"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && selectedVendor && (
        <EditVendorAccessModal
          vendor={selectedVendor}
          onClose={closeEditModal}
          onAccessUpdate={handleAccessUpdate}
        />
      )}
    </div>
  );
};

export default Vendors;