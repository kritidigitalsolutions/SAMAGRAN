import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { normalizeCities } from "../utils/normalizeCity";
import { FiEdit2, FiEye, FiMoreVertical, FiPlus, FiSearch, FiX, FiTrash2 } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import { getStoredAdmin } from "../utils/auth";

const formatAddress = (pandit) => {
  const parts = [
    pandit?.address?.line1,
    pandit?.address?.line2,
    pandit?.address?.city,
    pandit?.address?.state,
    pandit?.address?.pinCode,
  ].filter(Boolean);

  return parts.join(", ");
};

const statusClass = (status) => {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  if (status === "blocked") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
};

const statusOptions = ["pending", "active", "blocked"];

const initialForm = {
  phone: "",
  fullName: "",
  profileImage: "",
  bio: "",
  yearsOfExperience: 0,
  templeAssociated: "",
  languagesSpoken: "",
  status: "pending",
  isVerified: false,
  isPhoneVerified: false,
  isProfileComplete: false,
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pinCode: "",
};

export default function Pandits() {
  const isSuperAdmin = useMemo(() => getStoredAdmin()?.role === "super", []);
  const [pandits, setPandits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [availableCities, setAvailableCities] = useState([]);
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [availablePincodes, setAvailablePincodes] = useState([]);
  // const [activeTab, setActiveTab] = useState("all");
  const [selectedPandit, setSelectedPandit] = useState(null);
  const [panditBookings, setPanditBookings] = useState([]);
  const [bookingsModalPandit, setBookingsModalPandit] = useState(null);
  const [loadingPanditBookings, setLoadingPanditBookings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPanditId, setEditingPanditId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPanditId, setDeletingPanditId] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const [verifyingId, setVerifyingId] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [selectedPanditIds, setSelectedPanditIds] = useState([]);
  const [selectedPanditBookingIds, setSelectedPanditBookingIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsPageSize, setBookingsPageSize] = useState(10);

  const fetchPandits = useCallback(async (searchValue = "", statusValue = "all", cityValue = "", pincodeValue = "") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/admin/pandits", {
        params: {
          ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
          ...(cityValue.trim() ? { city: cityValue.trim() } : {}),
          ...(pincodeValue.trim() ? { pinCode: pincodeValue.trim() } : {}),
          status: statusValue,
        },
      });

      setPandits(res.data?.data || []);
      const incomingCities = res.data?.cities || [];
      if (Array.isArray(incomingCities) && incomingCities.length > 0) {
        setAvailableCities(normalizeCities(incomingCities));
      }
      const incomingPincodes = res.data?.pinCodes || [];
      if (Array.isArray(incomingPincodes) && incomingPincodes.length > 0) {
        const formatted = Array.from(new Set(incomingPincodes.map(p => String(p).trim())))
          .sort();
        setAvailablePincodes(formatted);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load pandits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPandits(searchTerm, statusFilter, cityFilter, pincodeFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchPandits, searchTerm, statusFilter, cityFilter, pincodeFilter]);

  // useEffect(() => {
  //   setActiveTab(statusFilter === "pending" ? "requests" : "all");
  // }, [statusFilter]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-pandit-menu], [data-table-menu-popover]")) {
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

  const summary = useMemo(() => {
    const active = pandits.filter((pandit) => pandit.status === "active").length;
    const pending = pandits.filter((pandit) => pandit.status === "pending").length;
    const blocked = pandits.filter((pandit) => pandit.status === "blocked").length;

    return {
      total: pandits.length,
      active,
      pending,
      blocked,
    };
  }, [pandits]);

  const pagedPandits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return pandits.slice(start, start + pageSize);
  }, [pandits, page, pageSize]);

  const pagedPanditBookings = useMemo(() => {
    const start = (bookingsPage - 1) * bookingsPageSize;
    return panditBookings.slice(start, start + bookingsPageSize);
  }, [panditBookings, bookingsPage, bookingsPageSize]);

  useEffect(() => {
    setPage(1);
  }, [pandits.length]);

  useEffect(() => {
    setBookingsPage(1);
  }, [panditBookings.length, bookingsModalPandit?._id]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingPanditId("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  // const handleTabChange = (tabKey) => {
  //   setActiveTab(tabKey);
  //   setStatusFilter(tabKey === "requests" ? "pending" : "all");
  // };

  const openEdit = (pandit) => {
    setForm({
      phone: pandit?.phone || "",
      fullName: pandit?.fullName || "",
      profileImage: pandit?.profileImage || "",
      bio: pandit?.bio || "",
      yearsOfExperience: Number(pandit?.yearsOfExperience || 0),
      templeAssociated: pandit?.templeAssociated || "",
      languagesSpoken: Array.isArray(pandit?.languagesSpoken) ? pandit.languagesSpoken.join(", ") : "",
      status: pandit?.status || "pending",
      isVerified: Boolean(pandit?.isVerified),
      isPhoneVerified: Boolean(pandit?.isPhoneVerified),
      isProfileComplete: Boolean(pandit?.isProfileComplete),
      addressLine1: pandit?.address?.line1 || "",
      addressLine2: pandit?.address?.line2 || "",
      city: pandit?.address?.city || "",
      state: pandit?.address?.state || "",
      pinCode: pandit?.address?.pinCode || "",
    });

    setEditingPanditId(pandit?._id || "");
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSavePandit = async (event) => {
    event.preventDefault();

    if (!form.phone.trim()) {
      setError("Phone is required.");
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        phone: form.phone.trim(),
        fullName: form.fullName,
        profileImage: form.profileImage,
        bio: form.bio,
        yearsOfExperience: Number(form.yearsOfExperience || 0),
        templeAssociated: form.templeAssociated,
        languagesSpoken: form.languagesSpoken,
        status: form.status,
        isVerified: form.isVerified,
        isPhoneVerified: form.isPhoneVerified,
        isProfileComplete: form.isProfileComplete,
        address: {
          line1: form.addressLine1,
          line2: form.addressLine2,
          city: form.city,
          state: form.state,
          pinCode: form.pinCode,
        },
      };

      if (editingPanditId) {
        await API.patch(`/admin/pandits/${editingPanditId}`, payload);
      } else {
        await API.post("/admin/pandits", payload);
      }

      await fetchPandits(searchTerm, statusFilter);
      setSuccess(editingPanditId ? "Pandit updated successfully." : "Pandit created successfully.");
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save pandit.");
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePandit = async (pandit) => {
    if (!pandit?._id) return;
    if (!window.confirm(`Delete pandit ${pandit.fullName || pandit.phone}?`)) return;

    try {
      setDeletingPanditId(pandit._id);
      setError("");
      setSuccess("");

      await API.delete(`/admin/pandits/${pandit._id}`);

      setPandits((current) => current.filter((entry) => entry._id !== pandit._id));
      if (selectedPandit?._id === pandit._id) {
        setSelectedPandit(null);
      }
      setSuccess("Pandit deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete pandit.");
    } finally {
      setDeletingPanditId("");
    }
  };

  const handleDeleteSelectedPandits = async () => {
    if (!selectedPanditIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedPanditIds.length} selected pandits?`)) return;

    try {
      await Promise.all(
        selectedPanditIds.map((id) => API.delete(`/admin/pandits/${id}`))
      );
      setPandits((current) =>
        current.filter((entry) => !selectedPanditIds.includes(entry._id))
      );
      setSelectedPanditIds([]);
      setSuccess("Selected pandits deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected pandits.");
    }
  };

  const handleDeleteSelectedPanditBookings = async () => {
    if (!selectedPanditBookingIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedPanditBookingIds.length} selected bookings?`)) return;

    try {
      await Promise.all(
        selectedPanditBookingIds.map((id) => API.delete(`/admin/pandit-bookings/${id}`))
      );
      setPanditBookings((current) =>
        current.filter((entry) => !selectedPanditBookingIds.includes(entry._id))
      );
      setSelectedPanditBookingIds([]);
      setSuccess("Selected bookings deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected bookings.");
    }
  };

  const handleStatusUpdate = async (panditId, nextStatus) => {
    try {
      setStatusUpdatingId(panditId);
      setError("");
      setSuccess("");

      const res = await API.patch(`/admin/pandits/${panditId}/status`, { status: nextStatus });
      const updated = res.data?.data;

      if (updated?._id) {
        setPandits((current) => current.map((entry) => (entry._id === updated._id ? updated : entry)));

        if (selectedPandit?._id === updated._id) {
          setSelectedPandit(updated);
        }
      }

      setSuccess("Pandit status updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update pandit status.");
    } finally {
      setStatusUpdatingId("");
    }
  };

  const handleToggleVerify = async (panditId, currentVerifiedStatus) => {
    try {
      setVerifyingId(panditId);
      setError("");
      setSuccess("");

      const nextVerified = !currentVerifiedStatus;
      const res = await API.patch(`/admin/pandits/${panditId}`, { isVerified: nextVerified });
      const updated = res.data?.data;

      if (res.data?.success) {
        setPandits((current) =>
          current.map((entry) =>
            entry._id === panditId
              ? { ...entry, isVerified: nextVerified, status: updated?.status || entry.status }
              : entry
          )
        );

        if (selectedPandit?._id === panditId) {
          setSelectedPandit((current) =>
            current
              ? { ...current, isVerified: nextVerified, status: updated?.status || current.status }
              : null
          );
        }

        setSuccess(`Pandit ${nextVerified ? "verified" : "unverified"} successfully.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update pandit verification status.");
    } finally {
      setVerifyingId("");
    }
  };

  const handleApprovePandit = (panditId) => handleStatusUpdate(panditId, "active");

  const handleRejectPandit = (panditId) => handleStatusUpdate(panditId, "blocked");

  const handleViewPandit = async (panditId) => {
    try {
      const res = await API.get(`/admin/pandits/${panditId}/details`);
      setSelectedPandit(res.data?.data?.pandit || null);
      setPanditBookings(res.data?.data?.bookings || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load pandit details.");
    }
  };

  const handleViewBookings = async (pandit) => {
    if (!pandit?._id) return;

    try {
      setLoadingPanditBookings(true);
      setError("");

      const res = await API.get(`/admin/pandits/${pandit._id}/bookings`);
      setPanditBookings(res.data?.data || []);
      setBookingsModalPandit(pandit);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load pandit bookings.");
    } finally {
      setLoadingPanditBookings(false);
    }
  };

  const togglePanditSelection = (panditId, checked) => {
    setSelectedPanditIds((current) => {
      if (checked) {
        return current.includes(panditId) ? current : [...current, panditId];
      }
      return current.filter((id) => id !== panditId);
    });
  };

  const toggleAllPandits = (checked) => {
    if (checked) {
      setSelectedPanditIds(pandits.map((pandit) => pandit._id));
      return;
    }
    setSelectedPanditIds([]);
  };

  const toggleAllPanditBookings = (checked) => {
    if (checked) {
      setSelectedPanditBookingIds(panditBookings.map((booking) => booking._id));
      return;
    }
    setSelectedPanditBookingIds([]);
  };

  const togglePanditBookingSelection = (bookingId, checked) => {
    setSelectedPanditBookingIds((current) => {
      if (checked) {
        return current.includes(bookingId) ? current : [...current, bookingId];
      }
      return current.filter((id) => id !== bookingId);
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px]  border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">

        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Pandit Network</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">All Pandits</h2>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Active {summary.active}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">Pending {summary.pending}</span>
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200">Blocked {summary.blocked}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* <div className="inline-flex rounded-xl border border-[#d8c4a5] bg-white/70 p-1 text-sm dark:border-white/10 dark:bg-white/5">
              {[
                // { key: "all", label: "All" },
                // { key: "requests", label: "Requests" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`rounded-lg px-3 py-1.5 font-medium ${activeTab === tab.key
                      ? "bg-[#8B1E3F] text-white"
                      : "text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:text-[#f7e3c0]"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div> */}
            <button
              type="button"
              onClick={openCreate}
              className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow"
            >
              <FiPlus className="h-4 w-4" />
              Add Pandit
            </button>
          </div>
        </div>

      </section>

      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${error
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
            }`}
        >
          {error || success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSavePandit} className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">{editingPanditId ? "Edit Pandit" : "Create Pandit"}</h3>
            <button type="button" onClick={closeForm} className="rounded-full border border-[#d9c3a2] p-2 text-[#7b3a4b] hover:bg-[#8B1E3F]/8 dark:border-white/20" aria-label="Close form">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input name="phone" value={form.phone} onChange={handleFormChange} required className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input name="fullName" value={form.fullName} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Profile Image URL</label>
              <input name="profileImage" value={form.profileImage} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Bio</label>
              <textarea name="bio" rows={3} value={form.bio} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Experience (years)</label>
              <input type="number" min="0" name="yearsOfExperience" value={form.yearsOfExperience} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Temple Associated</label>
              <input name="templeAssociated" value={form.templeAssociated} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Languages (comma separated)</label>
              <input name="languagesSpoken" value={form.languagesSpoken} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select name="status" value={form.status} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#23272e] dark:text-white">
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input name="city" value={form.city} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <input name="state" value={form.state} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PinCode</label>
              <input name="pinCode" value={form.pinCode} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 1</label>
              <input name="addressLine1" value={form.addressLine1} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 2</label>
              <input name="addressLine2" value={form.addressLine2} onChange={handleFormChange} className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#16181d] dark:text-white text-black" />
            </div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="isVerified" checked={form.isVerified} onChange={handleFormChange} /> Verified</label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="isPhoneVerified" checked={form.isPhoneVerified} onChange={handleFormChange} /> Phone Verified</label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="isProfileComplete" checked={form.isProfileComplete} onChange={handleFormChange} /> Profile Complete</label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60">
              {submitting ? "Saving..." : editingPanditId ? "Save Changes" : "Create Pandit"}
            </button>
            <button type="button" onClick={closeForm} className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">Cancel</button>
          </div>
        </form>
      )}

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[#e6d8c5] pb-5 dark:border-white/10">
          <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Pandit Listing</h3>

          <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[var(--admin-primary)]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, phone, city, temple"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              aria-label="Search pandits"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear pandit search"
                className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[var(--admin-surface)] dark:text-[var(--admin-primary)]"
              >
                <FiX />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white/70  text-gray-600 dark:text-white dark:bg-[#23272e] px-3 text-sm outline-none dark:border-white/10 "
          >
            <option value="all" >All status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
          >
            <option value="">All Cities</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={pincodeFilter}
            onChange={(e) => setPincodeFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
          >
            <option value="">All Pincodes</option>
            {availablePincodes.map((pincode) => (
              <option key={pincode} value={pincode}>{pincode}</option>
            ))}
          </select>
        </div>

        {/* 🔥 MAIN SUPER VISIBLE DELETE BANNER 🔥 */}
        {selectedPanditIds.length > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-900/10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200 font-bold text-red-700 dark:bg-red-800 dark:text-red-200">
                {selectedPanditIds.length}
              </div>
              <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                Pandits Selected
              </span>
            </div>
            <button
              type="button"
              onClick={handleDeleteSelectedPandits}
              disabled={selectedPanditIds.length === 0}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70 dark:disabled:bg-gray-700"
            >
              <FiTrash2 /> Delete Selected
            </button>
          </div>
        )}

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading pandits...</p>
        ) : error ? (
          <p className="rounded-xl bg-red-100 p-6 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        ) : !pandits.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm ? "No pandits match your search." : "No pandits found."}
          </p>
        ) : (
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table text-left min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-4 py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={pandits.length > 0 && selectedPanditIds.length === pandits.length}
                        onChange={(event) => toggleAllPandits(event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">S.No</th>
                    <th className="px-4 py-3 font-semibold">Image</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Experience</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold">Verification</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Update Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
 
                <tbody>
                  {pagedPandits.map((pandit, index) => (
                    <tr key={pandit._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPanditIds.includes(pandit._id)}
                          onChange={(event) => togglePanditSelection(pandit._id, event.target.checked)}
                          className="h-4 w-4 text-ce rounded-[4px] border border-[#d7c3a3] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3">
                        {pandit.profileImage ? (
                          <img src={pandit.profileImage} alt={pandit.fullName || "Pandit"} className="h-12 w-12 rounded-xl border border-[#D4AF37]/30 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl admin-btn-primary text-sm font-bold text-white">
                            {(pandit.fullName || pandit.phone || "P").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#2f1618] dark:text-[#fff3dc]">{pandit.fullName || "N/A"}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {pandit.vendorId ? (
                            <>
                              <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                                {pandit.vendorId.businessName || pandit.vendorId.name || "N/A"}
                              </p>
                              <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">
                                ID: {String(pandit.vendorId._id || "").slice(-6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                                {[pandit.vendorId.address?.city, pandit.vendorId.address?.state].filter(Boolean).join(", ")}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Super Admin / System</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">{pandit.phone || "-"}</td>
                      <td className="px-4 py-3">{pandit.yearsOfExperience || 0} yrs</td>
                      <td className="px-4 py-3">{pandit.address?.city || "-"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(pandit._id, pandit.isVerified)}
                          disabled={verifyingId === pandit._id}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                            pandit.isVerified
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                          }`}
                          title="Click to toggle verification status"
                        >
                          <span className={`h-2 w-2 rounded-full ${pandit.isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                          {verifyingId === pandit._id ? "Updating..." : pandit.isVerified ? "Verified" : "Not Verified"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(pandit.status)}`}>
                          {pandit.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={pandit.status || "pending"}
                          onChange={(event) => handleStatusUpdate(pandit._id, event.target.value)}
                          disabled={statusUpdatingId === pandit._id}
                          className="h-9 min-w-[130px] rounded-lg border border-[#d7c3a3] bg-white/75 px-2 text-xs outline-none dark:border-white/10 dark:bg-[#23272e] dark:text-white cursor-pointer"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right" data-pandit-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId = openMenuId === pandit._id ? "" : pandit._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                            aria-label="Pandit actions"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === pandit._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedPandits.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-48 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleViewPandit(pandit._id);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEye className="text-[#6f3945]" /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  openEdit(pandit);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEdit2 className="text-[#6f3945]" /> Edit
                              </button>
                              {pandit.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId("");
                                      handleApprovePandit(pandit._id);
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-emerald-700 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId("");
                                      handleRejectPandit(pandit._id);
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-500/10"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleToggleVerify(pandit._id, pandit.isVerified);
                                }}
                                disabled={verifyingId === pandit._id}
                                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold ${
                                  pandit.isVerified
                                    ? "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10"
                                    : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                                }`}
                              >
                                {pandit.isVerified ? "Mark Unverified" : "Verify Pandit"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleViewBookings(pandit);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                Bookings
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDeletePandit(pandit);
                                }}
                                disabled={deletingPanditId === pandit._id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-200 dark:hover:bg-red-500/10"
                              >
                                <MdDelete className="text-red-600" /> Delete
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
              total={pandits.length}
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

      {selectedPandit && (
        <div className="fixed inset-0 z-50 grid place-items-center  bg-black/45 p-4">
          <div className="w-full h-[90vh] max-w-2xl rounded-3xl border overflow-y-scroll border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[var(--admin-surface)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Pandit Details</h3>
              <button onClick={() => setSelectedPandit(null)} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="h-32 w-full p-2 rounded-sm relative overflow-hidden">
              <img src={selectedPandit.profileImage || "https://img.freepik.com/free-vector/flat-illustration-guru-purnima_23-2150428341.jpg"} className="h-full w-32 mx-auto border-gray-300 border-2 rounded-lg" alt="" />
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Name</span><strong>{selectedPandit.fullName || "N/A"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Phone</span><strong>{selectedPandit.phone || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Experience</span><strong>{selectedPandit.yearsOfExperience || 0} years</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2"><span className="block text-xs opacity-70">Address</span><strong>{formatAddress(selectedPandit) || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Temple</span><strong>{selectedPandit.templeAssociated || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Languages</span><strong>{selectedPandit.languagesSpoken?.length ? selectedPandit.languagesSpoken.join(", ") : "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Profile Complete</span><strong>{selectedPandit.isProfileComplete ? "Yes" : "No"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Aadhaar Linked</span><strong>{selectedPandit.aadhaar?.number ? "Yes" : "No"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Status</span><strong>{selectedPandit.status || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 flex items-center justify-between">
                <div>
                  <span className="block text-xs opacity-70">Verified</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    selectedPandit.isVerified
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}>
                    {selectedPandit.isVerified ? "Verified" : "Not Verified"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVerify(selectedPandit._id, selectedPandit.isVerified)}
                  disabled={verifyingId === selectedPandit._id}
                  className="admin-btn-primary px-3 py-1 text-xs rounded-lg font-medium"
                >
                  {verifyingId === selectedPandit._id ? "Updating..." : selectedPandit.isVerified ? "Unverify" : "Verify Now"}
                </button>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Phone Verified</span><strong>{selectedPandit.isPhoneVerified ? "Yes" : "No"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Rating</span><strong>{Number(selectedPandit.ratingAverage || 0).toFixed(1)} ({selectedPandit.ratingCount || 0})</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2"><span className="block text-xs opacity-70">Created</span><strong>{selectedPandit.createdAt ? new Date(selectedPandit.createdAt).toLocaleString() : "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2"><span className="block text-xs opacity-70">Updated</span><strong>{selectedPandit.updatedAt ? new Date(selectedPandit.updatedAt).toLocaleString() : "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2"><span className="block text-xs opacity-70">Total Bookings/Appointments</span><strong>{panditBookings.length}</strong></div>
            </div>

            {selectedPandit.aadhaar?.frontImage || selectedPandit.aadhaar?.backImage ? (
              <div className="mt-5 rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">Aadhaar</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedPandit.aadhaar?.frontImage && (
                    <a href={selectedPandit.aadhaar.frontImage} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm">Front Image</a>
                  )}
                  {selectedPandit.aadhaar?.backImage && (
                    <a href={selectedPandit.aadhaar.backImage} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm">Back Image</a>
                  )}
                </div>
              </div>
            ) : null}

            {selectedPandit.serviceTypes && (
              <div className="mt-5 rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">Service Types</h4>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>Online Pooja: <strong>{selectedPandit.serviceTypes.onlinePooja ? "Yes" : "No"}</strong></div>
                  <div>Home Visit: <strong>{selectedPandit.serviceTypes.homeVisit ? "Yes" : "No"}</strong></div>
                  <div>At Temple: <strong>{selectedPandit.serviceTypes.atTemple ? "Yes" : "No"}</strong></div>
                  <div>Travel For Special Poojas: <strong>{selectedPandit.serviceTypes.travelForSpecialPoojas ? "Yes" : "No"}</strong></div>
                  <div>Detected City: <strong>{selectedPandit.serviceTypes.detectedLocation?.city || "-"}</strong></div>
                  <div>Detected State: <strong>{selectedPandit.serviceTypes.detectedLocation?.state || "-"}</strong></div>
                </div>
              </div>
            )}

            {selectedPandit.poojaOfferings?.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">Pooja Offerings</h4>
                <div className="space-y-2">
                  {selectedPandit.poojaOfferings.map((off) => (
                    <div key={off.name} className="rounded-xl bg-white/60 p-3 dark:bg-white/5">
                      <div className="font-semibold">{off.name}</div>
                      <div className="text-xs opacity-80">Selected: {off.isSelected ? "Yes" : "No"} • Duration: {off.durationHours} hrs</div>
                      {off.customSamagriItems && off.customSamagriItems.length > 0 && (
                        <div className="mt-2 text-sm">
                          <div className="text-xs opacity-70">Custom Samagri Items</div>
                          <ul className="mt-1 space-y-1">
                            {off.customSamagriItems.map((it) => (
                              <li key={it._id} className="flex items-center justify-between">
                                <span>{it.itemName} (Qty: {it.quantity}{it.size ? `, ${it.size}` : ""})</span>
                                <span className="text-xs opacity-80">{it.approvalStatus}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(off.customSamagriNotes) && off.customSamagriNotes.length > 0 && (
                        <div className="mt-2 text-sm">
                          <div className="text-xs opacity-70">Custom Samagri Notes</div>
                          <ul className="mt-1 space-y-1">
                            {off.customSamagriNotes.map((note, idx) => (
                              <li key={`${off.name}-note-${idx}`}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panditBookings.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">Recent Bookings</h4>
                <div className="space-y-2">
                  {panditBookings.slice(0, 5).map((booking) => (
                    <div key={booking._id} className="rounded-xl bg-white/60 px-3 py-2 text-sm dark:bg-white/5">
                      <div className="font-semibold">{booking.ritual?.name || "Ritual"}</div>
                      <div className="text-xs opacity-80">{booking.bookingDate} | {booking.timeSlot?.label || "-"} | {booking.bookingStatus}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {bookingsModalPandit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[var(--admin-surface)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">All Appointments: {bookingsModalPandit.fullName || bookingsModalPandit.phone}</h3>
              <button onClick={() => setBookingsModalPandit(null)} className="text-2xl leading-none">&times;</button>
            </div>

            {/* 🔥 MODAL SUPER VISIBLE DELETE BANNER 🔥 */}
            {selectedPanditBookingIds.length > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-900/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200 font-bold text-red-700 dark:bg-red-800 dark:text-red-200">
                    {selectedPanditBookingIds.length}
                  </div>
                  <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                    Bookings Selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteSelectedPanditBookings}
                  disabled={selectedPanditBookingIds.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70 dark:disabled:bg-gray-700"
                >
                  <FiTrash2 /> Delete Selected
                </button>
              </div>
            )}

            {loadingPanditBookings ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">Loading bookings...</p>
            ) : panditBookings.length === 0 ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">No bookings found for this pandit.</p>
            ) : (
              <>
                <div className="admin-table-wrap overflow-x-auto">
                  <table className="admin-table min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                        <th className="px-4 py-3 font-semibold text-center">
                          <input
                            type="checkbox"
                            checked={panditBookings.length > 0 && selectedPanditBookingIds.length === panditBookings.length}
                            onChange={(event) => toggleAllPanditBookings(event.target.checked)}
                            className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">S.No</th>
                        <th className="px-4 py-3 font-semibold">Ritual</th>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Date & Slot</th>
                        <th className="px-4 py-3 font-semibold">Mode</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPanditBookings.map((booking, index) => (
                        <tr key={booking._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10 hover:bg-[#faf6f0] dark:hover:bg-white/5">
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedPanditBookingIds.includes(booking._id)}
                              onChange={(event) => togglePanditBookingSelection(booking._id, event.target.checked)}
                              className="h-4 w-4 rounded-[4px] border border-[#d7c3a3] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(bookingsPage - 1) * bookingsPageSize + index + 1}</td>
                          <td className="px-4 py-3">{booking.ritual?.name || "-"}</td>
                          <td className="px-4 py-3">{booking.user?.name || booking.user?.phone || "-"}</td>
                          <td className="px-4 py-3">{booking.bookingDate} | {booking.timeSlot?.label || "-"}</td>
                          <td className="px-4 py-3">{booking.bookingMode || "-"}</td>
                          <td className="px-4 py-3">Rs {Number(booking.bookingAmount || booking.dakshinaAmount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(pandits.status)}`}>
                              {booking.bookingStatus || "requested"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={bookingsPage}
                  pageSize={bookingsPageSize}
                  total={panditBookings.length}
                  onPageChange={setBookingsPage}
                  onPageSizeChange={(size) => {
                    setBookingsPageSize(size);
                    setBookingsPage(1);
                  }}
                  pageSizeOptions={[10]}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}