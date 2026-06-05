import React, { useState, useEffect, useMemo } from "react";
import {
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  UserPlusIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { FiMoreVertical, FiSearch, FiX, FiUnlock } from "react-icons/fi";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin/api";
import { toast } from "react-toastify";
import EditVendorAccessModal from "../../components/admin/modals/EditVendorAccessModal";
import AddVendorModal from "../../components/admin/modals/AddVendorModal";
import EditVendorProfileModal from "../../components/admin/modals/EditVendorProfileModal";
import Pagination from "../../components/common/Pagination";
import TableMenuPopover from "../../components/TableMenuPopover";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);

  const fetchVendors = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const response = await adminApi.get(
        `/vendors?page=${page}&limit=10&search=${search}`
      );
      const { vendors: vendorData, totalPages: newTotalPages } = response.data.data;
      setVendors(Array.isArray(vendorData) ? vendorData : []);
      setTotalPages(newTotalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      toast.error("Failed to fetch vendors");
      setVendors([]); // Clear vendors on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const searchTimer = setTimeout(() => {
      fetchVendors(1, searchTerm);
    }, 350);

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  useEffect(() => {
    fetchVendors(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleUpdateStatus = async (vendorId, status) => {
    try {
      if (status === "active") {
        await adminApi.patch(`/vendors/${vendorId}/approve`);
      } else if (status === "inactive") {
        await adminApi.patch(`/vendors/${vendorId}`, { status: "inactive" });
      } else {
        await adminApi.patch(`/vendors/${vendorId}`, { status });
      }
      toast.success(`Vendor status updated to ${status}`);
      fetchVendors(currentPage, searchTerm);
    } catch (error) {
      console.error("Failed to update vendor status:", error);
      toast.error("Failed to update vendor status");
    }
  };

  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setSelectedVendor(null);
    setIsEditModalOpen(false);
  };

  const openProfileModal = (vendor) => {
    setSelectedVendor(vendor);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setSelectedVendor(null);
    setIsProfileModalOpen(false);
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleAccessUpdate = () => {
    fetchVendors(currentPage, searchTerm);
  };

  const handleVendorAdded = () => {
    setSearchTerm("");
    fetchVendors(1, "");
  };

  const summary = useMemo(() => {
    // This summary is based on the current page, for a full summary an extra API call would be needed
    const active = vendors.filter((v) => v.status === "active").length;
    const inactive = vendors.filter((v) => v.status === "inactive").length;
    const pending = vendors.filter((v) => v.status === "pending").length;
    return {
      total: vendors.length, // Note: This is page total, not overall total
      active,
      blocked: inactive,
      pending,
    };
  }, [vendors]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-vendor-menu], [data-table-menu-popover]")) {
        setOpenMenuId("");
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
          Vendors
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          Vendor Overview
        </h2>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
            Active {summary.active}
          </span>
          <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200">
            Blocked {summary.blocked}
          </span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200">
            Pending {summary.pending}
          </span>
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--admin-primary)]">
              Directory
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
              All Vendors
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="text-[var(--admin-primary)]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, email"
                className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
                aria-label="Search vendors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear vendor search"
                  className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[var(--admin-surface)] dark:text-[var(--admin-primary)]"
                >
                  <FiX />
                </button>
              )}
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center admin-btn-primary whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white transition duration-300"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Vendor
            </button>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading vendors...</p>
        ) : !vendors.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm ? "No vendors match your search." : "No vendors found."}
          </p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-4 py-3 font-semibold">Vendor Name</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Products</th>
                    <th className="px-4 py-3 font-semibold">Total Orders</th>
                    <th className="px-4 py-3 font-semibold">Revenue</th>
                    <th className="px-4 py-3 font-semibold">Vendor Earning</th>
                    <th className="px-4 py-3 font-semibold">Super Admin Earning</th>
                    <th className="px-4 py-3 font-semibold">Pending Payout</th>
                    <th className="px-4 py-3 font-semibold">Joining</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor, index) => (
                    <tr
                      key={vendor._id}
                      className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">{vendor.name}</p>
                        <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                          ID: {vendor._id}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#2f1618] dark:text-[#fff3dc]">
                          {vendor.address?.city || "-"}
                        </p>
                        <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                          {vendor.address?.state || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#2f1618] dark:text-[#fff3dc]">
                          {vendor.phone || "-"}
                        </p>
                        <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                          {vendor.contactPerson || vendor.email || vendor.owner?.email || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold">{vendor.metrics?.products || 0}</td>
                      <td className="px-4 py-3 font-semibold">{vendor.metrics?.totalOrders || 0}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(vendor.metrics?.revenue)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-200">
                        {formatCurrency(vendor.metrics?.vendorEarning)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#8B1E3F] dark:text-[#f7b8ca]">
                        {formatCurrency(vendor.metrics?.superAdminEarning)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-200">
                        {formatCurrency(vendor.metrics?.pendingPayout)}
                      </td>
                      <td className="px-4 py-3">{formatDate(vendor.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                            vendor.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : vendor.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200"
                              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" data-vendor-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId = openMenuId === vendor._id ? "" : vendor._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(
                                nextId ? event.currentTarget.getBoundingClientRect() : null
                              );
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                            aria-label="Vendor actions"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === vendor._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= vendors.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-48 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <Link
                                to={`/dashboard/vendors/${vendor._id}`}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <EyeIcon className="h-4 w-4" /> View Details
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openProfileModal(vendor);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <PencilSquareIcon className="h-4 w-4" /> Edit Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEditModal(vendor);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <PencilSquareIcon className="h-4 w-4" /> Edit Access
                              </button>
                              {vendor.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId("");
                                      handleUpdateStatus(vendor._id, "active");
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-green-600 hover:bg-green-50"
                                  >
                                    <CheckCircleIcon className="h-4 w-4" /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId("");
                                      handleUpdateStatus(vendor._id, "rejected");
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                                  >
                                    <XCircleIcon className="h-4 w-4" /> Reject
                                  </button>
                                </>
                              )}
                              {vendor.status === "active" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    handleUpdateStatus(vendor._id, "inactive");
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                                >
                                  <NoSymbolIcon className="h-4 w-4" /> Block
                                </button>
                              )}
                              {vendor.status === "inactive" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId("");
                                    handleUpdateStatus(vendor._id, "active");
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-green-600 hover:bg-green-50"
                                >
                                  <FiUnlock className="h-4 w-4" /> Unblock
                                </button>
                              )}
                            </TableMenuPopover>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => fetchVendors(page, searchTerm)}
            />
          </>
        )}
      </section>

      {isEditModalOpen && selectedVendor && (
        <EditVendorAccessModal
          vendor={selectedVendor}
          onClose={closeEditModal}
          onAccessUpdate={handleAccessUpdate}
        />
      )}
      {isProfileModalOpen && selectedVendor && (
        <EditVendorProfileModal
          vendor={selectedVendor}
          onClose={closeProfileModal}
          onUpdated={handleAccessUpdate}
        />
      )}
      {isAddModalOpen && (
        <AddVendorModal onClose={closeAddModal} onVendorAdded={handleVendorAdded} />
      )}
    </div>
  );
};

export default Vendors;
