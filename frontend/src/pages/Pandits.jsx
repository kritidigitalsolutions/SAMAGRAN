import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiEdit2, FiEye, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

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
  ratingAverage: 4.5,
  ratingCount: 0,
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
  aadhaarNumber: "",
  aadhaarFrontImage: "",
  aadhaarBackImage: "",
  aadhaarConsentGiven: false,
  serviceOnlinePooja: false,
  serviceHomeVisit: false,
  serviceAtTemple: false,
  serviceTravelForSpecialPoojas: false,
  serviceDetectedCity: "",
  serviceDetectedState: "",
  serviceDistanceSelected: "",
  serviceDistanceCustomKm: 0,
  serviceWithinDistrict: false,
  serviceWithinState: false,
  serviceAnywhereInIndia: false,
  poojaOfferings: [{ title: "", description: "" }],
};

export default function Pandits() {
  const [pandits, setPandits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
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
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [aadhaarFrontImageFile, setAadhaarFrontImageFile] = useState(null);
  const [aadhaarBackImageFile, setAadhaarBackImageFile] = useState(null);

  const fetchPandits = useCallback(
    async (searchValue = "", statusValue = "all") => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/pandits", {
          params: {
            ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
            status: statusValue,
          },
        });

        setPandits(res.data?.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load pandits.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPandits(searchTerm, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchPandits, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const active = pandits.filter(
      (pandit) => pandit.status === "active",
    ).length;
    const pending = pandits.filter(
      (pandit) => pandit.status === "pending",
    ).length;
    const blocked = pandits.filter(
      (pandit) => pandit.status === "blocked",
    ).length;

    return {
      total: pandits.length,
      active,
      pending,
      blocked,
    };
  }, [pandits]);

  const visiblePandits = useMemo(() => {
    if (activeTab === "requests") {
      return pandits.filter(
        (pandit) => String(pandit.status || "").toLowerCase() === "pending",
      );
    }
    return pandits;
  }, [pandits, activeTab]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingPanditId("");
    setProfileImageFile(null);
    setAadhaarFrontImageFile(null);
    setAadhaarBackImageFile(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (pandit) => {
    setForm({
      phone: pandit?.phone || "",
      fullName: pandit?.fullName || "",
      profileImage: pandit?.profileImage || "",
      bio: pandit?.bio || "",
      ratingAverage: Number(pandit?.ratingAverage ?? 4.5),
      ratingCount: Number(pandit?.ratingCount || 0),
      yearsOfExperience: Number(pandit?.yearsOfExperience || 0),
      templeAssociated: pandit?.templeAssociated || "",
      languagesSpoken: Array.isArray(pandit?.languagesSpoken)
        ? pandit.languagesSpoken.join(", ")
        : "",
      status: pandit?.status || "pending",
      isVerified: Boolean(pandit?.isVerified),
      isPhoneVerified: Boolean(pandit?.isPhoneVerified),
      isProfileComplete: Boolean(pandit?.isProfileComplete),
      addressLine1: pandit?.address?.line1 || "",
      addressLine2: pandit?.address?.line2 || "",
      city: pandit?.address?.city || "",
      state: pandit?.address?.state || "",
      pinCode: pandit?.address?.pinCode || "",
      aadhaarNumber: pandit?.aadhaar?.number || "",
      aadhaarFrontImage: pandit?.aadhaar?.frontImage || "",
      aadhaarBackImage: pandit?.aadhaar?.backImage || "",
      aadhaarConsentGiven: Boolean(pandit?.aadhaar?.consentGiven),
      serviceOnlinePooja: Boolean(pandit?.serviceTypes?.onlinePooja),
      serviceHomeVisit: Boolean(pandit?.serviceTypes?.homeVisit),
      serviceAtTemple: Boolean(pandit?.serviceTypes?.atTemple),
      serviceTravelForSpecialPoojas: Boolean(
        pandit?.serviceTypes?.travelForSpecialPoojas,
      ),
      serviceDetectedCity: pandit?.serviceTypes?.detectedLocation?.city || "",
      serviceDetectedState: pandit?.serviceTypes?.detectedLocation?.state || "",
      serviceDistanceSelected:
        pandit?.serviceTypes?.serviceDistance?.selected || "",
      serviceDistanceCustomKm: Number(
        pandit?.serviceTypes?.serviceDistance?.customKm || 0,
      ),
      serviceWithinDistrict: Boolean(
        pandit?.serviceTypes?.outstationAvailability?.withinDistrict,
      ),
      serviceWithinState: Boolean(
        pandit?.serviceTypes?.outstationAvailability?.withinState,
      ),
      serviceAnywhereInIndia: Boolean(
        pandit?.serviceTypes?.outstationAvailability?.anywhereInIndia,
      ),
      poojaOfferings:
        Array.isArray(pandit?.poojaOfferings) && pandit.poojaOfferings.length
          ? pandit.poojaOfferings.map((entry) => ({
              title: entry?.name || entry?.title || "",
              description: entry?.description || "",
            }))
          : [{ title: "", description: "" }],
    });

    setEditingPanditId(pandit?._id || "");
    setShowForm(true);
    setError("");
    setSuccess("");
    setProfileImageFile(null);
    setAadhaarFrontImageFile(null);
    setAadhaarBackImageFile(null);
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

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    const file = files?.[0] || null;

    if (name === "profileImageFile") {
      setProfileImageFile(file);
      return;
    }

    if (name === "aadhaarFrontImageFile") {
      setAadhaarFrontImageFile(file);
      return;
    }

    if (name === "aadhaarBackImageFile") {
      setAadhaarBackImageFile(file);
    }
  };

  const handlePoojaOfferingChange = (index, field, value) => {
    setForm((current) => {
      const updated = [...current.poojaOfferings];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...current,
        poojaOfferings: updated,
      };
    });
  };

  const addPoojaOfferingRow = () => {
    setForm((current) => ({
      ...current,
      poojaOfferings: [
        ...current.poojaOfferings,
        { title: "", description: "" },
      ],
    }));
  };

  const removePoojaOfferingRow = (index) => {
    setForm((current) => {
      const updated = current.poojaOfferings.filter((_, idx) => idx !== index);
      return {
        ...current,
        poojaOfferings: updated.length
          ? updated
          : [{ title: "", description: "" }],
      };
    });
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

      const poojaOfferings = (form.poojaOfferings || [])
        .map((entry) => ({
          title: String(entry?.title || "").trim(),
          description: String(entry?.description || "").trim(),
        }))
        .filter((entry) => entry.title)
        .map((entry) => ({
          title: entry.title,
          description: entry.description,
          isSelected: true,
        }));

      const formData = new FormData();
      formData.append("phone", form.phone.trim());
      formData.append("fullName", form.fullName || "");
      formData.append("profileImage", form.profileImage || "");
      formData.append("bio", form.bio || "");
      formData.append("ratingAverage", String(Number(form.ratingAverage || 0)));
      formData.append("ratingCount", String(Number(form.ratingCount || 0)));
      formData.append(
        "yearsOfExperience",
        String(Number(form.yearsOfExperience || 0)),
      );
      formData.append("templeAssociated", form.templeAssociated || "");
      formData.append("languagesSpoken", form.languagesSpoken || "");
      formData.append("status", form.status || "pending");
      formData.append("isVerified", String(Boolean(form.isVerified)));
      formData.append("isPhoneVerified", String(Boolean(form.isPhoneVerified)));
      formData.append(
        "isProfileComplete",
        String(Boolean(form.isProfileComplete)),
      );

      formData.append(
        "address",
        JSON.stringify({
          line1: form.addressLine1,
          line2: form.addressLine2,
          city: form.city,
          state: form.state,
          pinCode: form.pinCode,
        }),
      );

      formData.append(
        "aadhaar",
        JSON.stringify({
          number: form.aadhaarNumber,
          frontImage: form.aadhaarFrontImage,
          backImage: form.aadhaarBackImage,
          consentGiven: form.aadhaarConsentGiven,
        }),
      );

      formData.append(
        "serviceTypes",
        JSON.stringify({
          onlinePooja: form.serviceOnlinePooja,
          homeVisit: form.serviceHomeVisit,
          atTemple: form.serviceAtTemple,
          travelForSpecialPoojas: form.serviceTravelForSpecialPoojas,
          detectedLocation: {
            city: form.serviceDetectedCity,
            state: form.serviceDetectedState,
          },
          serviceDistance: {
            selected: form.serviceDistanceSelected,
            customKm: Number(form.serviceDistanceCustomKm || 0),
          },
          outstationAvailability: {
            withinDistrict: form.serviceWithinDistrict,
            withinState: form.serviceWithinState,
            anywhereInIndia: form.serviceAnywhereInIndia,
          },
        }),
      );

      formData.append("poojaOfferings", JSON.stringify(poojaOfferings));

      if (profileImageFile) {
        formData.append("profileImageFile", profileImageFile);
      }
      if (aadhaarFrontImageFile) {
        formData.append("aadhaarFrontImageFile", aadhaarFrontImageFile);
      }
      if (aadhaarBackImageFile) {
        formData.append("aadhaarBackImageFile", aadhaarBackImageFile);
      }

      if (editingPanditId) {
        await API.patch(`/admin/pandits/${editingPanditId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await API.post("/admin/pandits", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await fetchPandits(searchTerm, statusFilter);
      setSuccess(
        editingPanditId
          ? "Pandit updated successfully."
          : "Pandit created successfully.",
      );
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
    if (!window.confirm(`Delete pandit ${pandit.fullName || pandit.phone}?`))
      return;

    try {
      setDeletingPanditId(pandit._id);
      setError("");
      setSuccess("");

      await API.delete(`/admin/pandits/${pandit._id}`);

      setPandits((current) =>
        current.filter((entry) => entry._id !== pandit._id),
      );
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

  const handleStatusUpdate = async (panditId, nextStatus) => {
    try {
      setStatusUpdatingId(panditId);
      setError("");
      setSuccess("");

      const res = await API.patch(`/admin/pandits/${panditId}/status`, {
        status: nextStatus,
      });
      const updated = res.data?.data;

      if (updated?._id) {
        setPandits((current) =>
          current.map((entry) => (entry._id === updated._id ? updated : entry)),
        );

        if (selectedPandit?._id === updated._id) {
          setSelectedPandit(updated);
        }
      }

      setSuccess("Pandit status updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update pandit status.",
      );
    } finally {
      setStatusUpdatingId("");
    }
  };

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
      setError(
        err.response?.data?.message || "Unable to load pandit bookings.",
      );
    } finally {
      setLoadingPanditBookings(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
          Pandit Network
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          All Pandits
        </h2>
        <div className="mt-4 flex justify-between ">
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">
              Total {summary.total}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
              Active {summary.active}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
              Pending {summary.pending}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200">
              Blocked {summary.blocked}
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="admin-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow"
          >
            <FiPlus className="h-4 w-4" />
            Add Pandit
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
        <form
          onSubmit={handleSavePandit}
          className="rounded-3xl border border-[#dcc7ab]/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {editingPanditId ? "Edit Pandit" : "Create Pandit"}
            </h3>
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
              <label className="text-sm font-medium">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleFormChange}
                required
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Profile Image File</label>
              <input
                name="profileImageFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
              {profileImageFile ? (
                <p className="text-xs opacity-70">
                  Selected: {profileImageFile.name}
                </p>
              ) : form.profileImage ? (
                <p className="text-xs opacity-70">
                  Current profile image will remain unchanged if no file is
                  selected.
                </p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Bio</label>
              <textarea
                name="bio"
                rows={3}
                value={form.bio}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Experience (years)</label>
              <input
                type="number"
                min="0"
                name="yearsOfExperience"
                value={form.yearsOfExperience}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating Average</label>
              <input
                type="number"
                min="0"
                step="0.1"
                name="ratingAverage"
                value={form.ratingAverage}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating Count</label>
              <input
                type="number"
                min="0"
                name="ratingCount"
                value={form.ratingCount}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Temple Associated</label>
              <input
                name="templeAssociated"
                value={form.templeAssociated}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Languages (comma separated)
              </label>
              <input
                name="languagesSpoken"
                value={form.languagesSpoken}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <input
                name="state"
                value={form.state}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PinCode</label>
              <input
                name="pinCode"
                value={form.pinCode}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 1</label>
              <input
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address Line 2</label>
              <input
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
              />
            </div>

            <div className="md:col-span-2 mt-2 rounded-2xl border border-[#d9c3a2]/70 p-4 dark:border-white/20">
              <h4 className="mb-3 text-sm font-semibold">Aadhaar Details</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aadhaar Number</label>
                  <input
                    name="aadhaarNumber"
                    value={form.aadhaarNumber}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Aadhaar Front Image File
                  </label>
                  <input
                    name="aadhaarFrontImageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  />
                  {aadhaarFrontImageFile ? (
                    <p className="text-xs opacity-70">
                      Selected: {aadhaarFrontImageFile.name}
                    </p>
                  ) : form.aadhaarFrontImage ? (
                    <p className="text-xs opacity-70">
                      Current front image will remain unchanged if no file is
                      selected.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">
                    Aadhaar Back Image File
                  </label>
                  <input
                    name="aadhaarBackImageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  />
                  {aadhaarBackImageFile ? (
                    <p className="text-xs opacity-70">
                      Selected: {aadhaarBackImageFile.name}
                    </p>
                  ) : form.aadhaarBackImage ? (
                    <p className="text-xs opacity-70">
                      Current back image will remain unchanged if no file is
                      selected.
                    </p>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    name="aadhaarConsentGiven"
                    checked={form.aadhaarConsentGiven}
                    onChange={handleFormChange}
                  />{" "}
                  Aadhaar Consent Given
                </label>
              </div>
            </div>

            <div className="md:col-span-2 mt-2 rounded-2xl border border-[#d9c3a2]/70 p-4 dark:border-white/20">
              <h4 className="mb-3 text-sm font-semibold">Service Types</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceOnlinePooja"
                    checked={form.serviceOnlinePooja}
                    onChange={handleFormChange}
                  />{" "}
                  Online Pooja
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceHomeVisit"
                    checked={form.serviceHomeVisit}
                    onChange={handleFormChange}
                  />{" "}
                  Home Visit
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceAtTemple"
                    checked={form.serviceAtTemple}
                    onChange={handleFormChange}
                  />{" "}
                  At Temple
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceTravelForSpecialPoojas"
                    checked={form.serviceTravelForSpecialPoojas}
                    onChange={handleFormChange}
                  />{" "}
                  Travel for Special Poojas
                </label>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Detected City</label>
                  <input
                    name="serviceDetectedCity"
                    value={form.serviceDetectedCity}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Detected State</label>
                  <input
                    name="serviceDetectedState"
                    value={form.serviceDetectedState}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Service Distance
                  </label>
                  <select
                    name="serviceDistanceSelected"
                    value={form.serviceDistanceSelected}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  >
                    <option value="">Select distance</option>
                    <option value="within5">Within 5 km</option>
                    <option value="within10">Within 10 km</option>
                    <option value="within25">Within 25 km</option>
                    <option value="within50">Within 50 km</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Custom Distance (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="serviceDistanceCustomKm"
                    value={form.serviceDistanceCustomKm}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceWithinDistrict"
                    checked={form.serviceWithinDistrict}
                    onChange={handleFormChange}
                  />{" "}
                  Within District
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="serviceWithinState"
                    checked={form.serviceWithinState}
                    onChange={handleFormChange}
                  />{" "}
                  Within State
                </label>
                <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    name="serviceAnywhereInIndia"
                    checked={form.serviceAnywhereInIndia}
                    onChange={handleFormChange}
                  />{" "}
                  Anywhere In India
                </label>
              </div>
            </div>

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Pooja Offerings</label>
                <button
                  type="button"
                  onClick={addPoojaOfferingRow}
                  className="rounded-lg border border-[#d7bf9b] px-3 py-1 text-xs font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                >
                  + Add Ritual
                </button>
              </div>

              {(form.poojaOfferings || []).map((offering, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#d9c3a2]/70 p-3 dark:border-white/20"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Ritual Title
                      </label>
                      <input
                        value={offering.title}
                        onChange={(event) =>
                          handlePoojaOfferingChange(
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                        placeholder="e.g. Griha Pravesh"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <input
                        value={offering.description}
                        onChange={(event) =>
                          handlePoojaOfferingChange(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-[#d9c3a2] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-black/20"
                        placeholder="Ritual description"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePoojaOfferingRow(index)}
                      className="rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isVerified"
                checked={form.isVerified}
                onChange={handleFormChange}
              />{" "}
              Verified
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPhoneVerified"
                checked={form.isPhoneVerified}
                onChange={handleFormChange}
              />{" "}
              Phone Verified
            </label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="isProfileComplete"
                checked={form.isProfileComplete}
                onChange={handleFormChange}
              />{" "}
              Profile Complete
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingPanditId
                  ? "Save Changes"
                  : "Create Pandit"}
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

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
              Pandit Listing
            </h3>
            <div className="inline-flex rounded-full border border-[#d8c4a5] bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  activeTab === "all"
                    ? "bg-[#8B1E3F] text-white"
                    : "text-[#6e4b40] dark:text-[#f7e3c0]"
                }`}
              >
                All Pandits ({summary.total})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("requests");
                  setStatusFilter("pending");
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  activeTab === "requests"
                    ? "bg-[#8B1E3F] text-white"
                    : "text-[#6e4b40] dark:text-[#f7e3c0]"
                }`}
              >
                Requests ({summary.pending})
              </button>
            </div>
          </div>

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
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setActiveTab("all");
            }}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none 
           dark:bg-[#1e1e1e] dark:text-white dark:border-white/20"
          >
            <option value="all">All status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            Loading pandits...
          </p>
        ) : error ? (
          <p className="rounded-xl bg-red-100 p-6 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        ) : !visiblePandits.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm
              ? "No pandits match your search."
              : activeTab === "requests"
                ? "No pending requests."
                : "No pandits found."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Profile</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Experience</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Update Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {visiblePandits.map((pandit) => (
                  <tr
                    key={pandit._id}
                    className="border-t border-[#e8d7bf] dark:border-white/10"
                  >
                    <td className="px-4 py-3">
                      {pandit.profileImage ? (
                        <img
                          src={pandit.profileImage}
                          alt={pandit.fullName || "Pandit"}
                          className="h-12 w-12 rounded-xl border border-[#D4AF37]/30 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl admin-btn-primary text-sm font-bold text-white">
                          {(pandit.fullName || pandit.phone || "P")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#2f1618] dark:text-[#fff3dc]">
                      {pandit.fullName || "N/A"}
                    </td>
                    <td className="px-4 py-3">{pandit.phone || "-"}</td>
                    <td className="px-4 py-3">
                      {pandit.yearsOfExperience || 0} yrs
                    </td>
                    <td className="px-4 py-3">{pandit.address?.city || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(pandit.status)}`}
                      >
                        {pandit.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {activeTab === "requests" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusUpdate(pandit._id, "active")
                            }
                            disabled={statusUpdatingId === pandit._id}
                            className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusUpdate(pandit._id, "blocked")
                            }
                            disabled={statusUpdatingId === pandit._id}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <select
                          value={pandit.status || "pending"}
                          onChange={(event) =>
                            handleStatusUpdate(pandit._id, event.target.value)
                          }
                          disabled={statusUpdatingId === pandit._id}
                          className="h-9 min-w-[130px] rounded-lg border border-[#d7c3a3] bg-white/75 px-2 text-xs outline-none dark:border-white/10 dark:bg-white/5"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewPandit(pandit._id)}
                          className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          aria-label={`View ${pandit.fullName || "pandit"}`}
                        >
                          <FiEye />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(pandit)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          aria-label={`Edit ${pandit.fullName || "pandit"}`}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewBookings(pandit)}
                          className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200"
                          aria-label="View bookings"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePandit(pandit)}
                          disabled={deletingPanditId === pandit._id}
                          className="grid h-9 w-9 place-items-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                          aria-label="Delete pandit"
                        >
                          <MdDelete />
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

      {selectedPandit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[var(--admin-surface)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
                Pandit Details
              </h3>
              <button
                onClick={() => setSelectedPandit(null)}
                className="text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">Name</span>
                <strong>{selectedPandit.fullName || "N/A"}</strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">Phone</span>
                <strong>{selectedPandit.phone || "-"}</strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">Experience</span>
                <strong>{selectedPandit.yearsOfExperience || 0} years</strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2">
                <span className="block text-xs opacity-70">Address</span>
                <strong>{formatAddress(selectedPandit) || "-"}</strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">Temple</span>
                <strong>{selectedPandit.templeAssociated || "-"}</strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">Languages</span>
                <strong>
                  {selectedPandit.languagesSpoken?.length
                    ? selectedPandit.languagesSpoken.join(", ")
                    : "-"}
                </strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">
                  Profile Complete
                </span>
                <strong>
                  {selectedPandit.isProfileComplete ? "Yes" : "No"}
                </strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5">
                <span className="block text-xs opacity-70">Aadhaar Linked</span>
                <strong>{selectedPandit.aadhaar?.number ? "Yes" : "No"}</strong>
              </div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2">
                <span className="block text-xs opacity-70">
                  Total Bookings/Appointments
                </span>
                <strong>{panditBookings.length}</strong>
              </div>
            </div>

            {panditBookings.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">
                  Recent Bookings
                </h4>
                <div className="space-y-2">
                  {panditBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking._id}
                      className="rounded-xl bg-white/60 px-3 py-2 text-sm dark:bg-white/5"
                    >
                      <div className="font-semibold">
                        {booking.ritual?.name || "Ritual"}
                      </div>
                      <div className="text-xs opacity-80">
                        {booking.bookingDate} |{" "}
                        {booking.dateAndTime?.label || "-"} |{" "}
                        {booking.bookingStatus}
                      </div>
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
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
                All Appointments:{" "}
                {bookingsModalPandit.fullName || bookingsModalPandit.phone}
              </h3>
              <button
                onClick={() => setBookingsModalPandit(null)}
                className="text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {loadingPanditBookings ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">
                Loading bookings...
              </p>
            ) : panditBookings.length === 0 ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">
                No bookings found for this pandit.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Ritual</th>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Date & Slot</th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panditBookings.map((booking) => (
                      <tr
                        key={booking._id}
                        className="border-t border-[#e8d7bf] dark:border-white/10"
                      >
                        <td className="px-4 py-3">
                          {booking.ritual?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {booking.user?.name || booking.user?.phone || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {booking.bookingDate} |{" "}
                          {booking.dateAndTime?.label || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {booking.bookingMode || "-"}
                        </td>
                        <td className="px-4 py-3">
                          Rs {Number(booking.dakshinaAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {booking.bookingStatus || "requested"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
