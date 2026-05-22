import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { adminApi } from "../../api/admin/api";
import { toast } from "react-toastify";

const VendorDetails = () => {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        setLoading(true);
        const response = await adminApi.get(`/vendors/${vendorId}`);
        setVendor(response.data.data?.vendor || null);
      } catch (error) {
        console.error("Failed to fetch vendor details:", error);
        toast.error("Failed to fetch vendor details");
      } finally {
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [vendorId]);

  if (loading) {
    return <div>Loading vendor details...</div>;
  }

  if (!vendor) {
    return <div>Vendor not found.</div>;
  }

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        {vendor.name}
      </h1>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Vendor Information</h2>
            <p><strong>Email:</strong> {vendor.email || vendor.owner?.email || "N/A"}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  vendor.status === "active"
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                }`}
              >
                {vendor.status || "unknown"}
              </span>
            </p>
            <p><strong>Joined:</strong> {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : "N/A"}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Page Access</h2>
            <ul className="list-disc list-inside">
              {(vendor.pageAccess || []).map((page) => (
                <li key={page} className="capitalize">{page}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
