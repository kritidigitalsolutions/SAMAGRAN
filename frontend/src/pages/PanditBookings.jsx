import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { normalizeCities } from "../utils/normalizeCity";
import { FiEye, FiMoreVertical, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import { getStoredAdmin } from "../utils/auth";

const statusBadgeClass = (status) => {
  if (status === "confirmed") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }

  if (status === "completed") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
};

const paymentBadgeClass = (status) => {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
};

const formatAddress = (booking) => {
  const address = booking?.address || {};
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.pinCode,
  ]
    .filter(Boolean)
    .join(", ");
};

export default function PanditBookings() {
  const isSuperAdmin = useMemo(() => getStoredAdmin()?.role === "super", []);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [success, setSuccess] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState("");
  const [deletingBookingId, setDeletingBookingId] = useState("");
  const [generatingZoomId, setGeneratingZoomId] = useState("");
  const [statusUpdates, setStatusUpdates] = useState({});
  const [paymentUpdates, setPaymentUpdates] = useState({});
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cityFilter, setCityFilter] = useState("");
  const [availableCities, setAvailableCities] = useState([]);
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [availablePincodes, setAvailablePincodes] = useState([]);

  const fetchBookings = useCallback(
    async (
      searchValue = "",
      statusValue = "all",
      cityValue = "",
      pincodeValue = "",
    ) => {
      try {
        setLoading(true);
        setError("");

        const res = await API.get("/admin/pandit-bookings", {
          params: {
            ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
            ...(statusValue ? { status: statusValue } : {}),
            ...(cityValue.trim() ? { city: cityValue.trim() } : {}),
            ...(pincodeValue.trim() ? { pincode: pincodeValue.trim() } : {}),
          },
        });

        setBookings(res.data?.data || []);
        const incomingCities = res.data?.cities || [];
        if (Array.isArray(incomingCities) && incomingCities.length > 0) {
          setAvailableCities(normalizeCities(incomingCities));
        }
        const incomingPincodes = res.data?.pincodes || [];
        if (Array.isArray(incomingPincodes) && incomingPincodes.length > 0) {
          const formatted = Array.from(
            new Set(incomingPincodes.map((p) => String(p).trim())),
          ).sort();
          setAvailablePincodes(formatted);
        }
        setStatusUpdates((current) => {
          const next = { ...current };
          (res.data?.data || []).forEach((booking) => {
            if (!next[booking._id]) {
              next[booking._id] = booking.bookingStatus || "requested";
            }
          });
          return next;
        });
        setPaymentUpdates((current) => {
          const next = { ...current };
          (res.data?.data || []).forEach((booking) => {
            if (!next[booking._id]) {
              next[booking._id] = booking.payment?.status || "pending";
            }
          });
          return next;
        });
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load pandit bookings.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(searchTerm, statusFilter, cityFilter, pincodeFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchBookings, searchTerm, statusFilter, cityFilter, pincodeFilter]);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        !event.target.closest("[data-booking-menu], [data-table-menu-popover]")
      ) {
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

  const handleUpdateBooking = async (booking) => {
    if (!booking?._id) return;

    try {
      setUpdatingBookingId(booking._id);
      setError("");
      setSuccess("");

      const res = await API.patch(`/admin/pandit-bookings/${booking._id}`, {
        bookingStatus: statusUpdates[booking._id] || booking.bookingStatus,
        payment: {
          ...booking.payment,
          status:
            paymentUpdates[booking._id] || booking.payment?.status || "pending",
        },
      });

      const updated = res.data?.data;

      if (updated?._id) {
        setBookings((current) =>
          current.map((entry) => (entry._id === updated._id ? updated : entry)),
        );
        if (selectedBooking?._id === updated._id) {
          setSelectedBooking(updated);
        }
      }

      setSuccess("Booking updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update booking.");
    } finally {
      setUpdatingBookingId("");
    }
  };

  const handleDeleteBooking = async (booking) => {
    if (!booking?._id) return;
    if (!window.confirm(`Delete booking ${booking._id}?`)) return;

    try {
      setDeletingBookingId(booking._id);
      setError("");
      setSuccess("");
      await API.delete(`/admin/pandit-bookings/${booking._id}`);
      setBookings((current) =>
        current.filter((entry) => entry._id !== booking._id),
      );
      if (selectedBooking?._id === booking._id) {
        setSelectedBooking(null);
      }
      setSuccess("Booking deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete booking.");
    } finally {
      setDeletingBookingId("");
    }
  };

  const handleCreateZoomMeeting = async (bookingId) => {
    try {
      setGeneratingZoomId(bookingId);
      setError("");
      setSuccess("");
      const res = await API.post(
        `/admin/pandit-bookings/${bookingId}/zoom/create`,
      );
      if (res.data?.success) {
        setSuccess("Zoom meeting created successfully!");
        const updatedBooking = res.data.data;
        setBookings((current) =>
          current.map((b) => (b._id === bookingId ? updatedBooking : b)),
        );
        setSelectedBooking(updatedBooking);
      } else {
        setError(res.data?.message || "Failed to create Zoom meeting.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create Zoom meeting.");
    } finally {
      setGeneratingZoomId("");
    }
  };

  const toggleBookingSelection = (bookingId, checked) => {
    setSelectedBookingIds((current) => {
      if (checked) {
        return current.includes(bookingId) ? current : [...current, bookingId];
      }
      return current.filter((id) => id !== bookingId);
    });
  };

  // const toggleAllBookings = (checked) => {
  //   if (checked) {
  //     setSelectedBookingIds(bookings.map((booking) => booking._id));
  //     return;
  //   }
  //   setSelectedBookingIds([]);
  // };

  const toggleAllBookings = (checked) => {
  if (checked) {
    setSelectedBookingIds(
      pagedBookings.map((booking) => booking._id)
    );
    return;
  }

  setSelectedBookingIds([]);
};
  const summary = useMemo(() => {
    const requested = bookings.filter(
      (entry) => entry.bookingStatus === "requested",
    ).length;
    const confirmed = bookings.filter(
      (entry) => entry.bookingStatus === "confirmed",
    ).length;

    return {
      total: bookings.length,
      requested,
      confirmed,
    };
  }, [bookings]);

  const pagedBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bookings.slice(start, start + pageSize);
  }, [bookings, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [bookings.length]);

  const handleDeleteSelectedBooking = async () => {
    if (!selectedBookingIds.length) return;
    if (
      !window.confirm(`Delete ${selectedBookingIds.length} selected bookings?`)
    )
      return;

    try {
      await Promise.all(
        selectedBookingIds.map((bookingId) =>
          API.delete(`/admin/pandit-bookings/${bookingId}`),
        ),
      );
      setBookings((current) =>
        current.filter((entry) => !selectedBookingIds.includes(entry._id)),
      );
      setSelectedBookingIds([]);
      setSuccess("Selected bookings deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete selected bookings.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">
          Pandit Bookings
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
          User Booking Requests
        </h2>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">
            Total {summary.total}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
            Requested {summary.requested}
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
            Confirmed {summary.confirmed}
          </span>
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

      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
            All Booking Entries
          </h3>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="text-[var(--admin-primary)]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search ritual, city, date"
                className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
                aria-label="Search booking entries"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear booking search"
                  className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[var(--admin-surface)] dark:text-[var(--admin-primary)]"
                >
                  <FiX />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 text-sm outline-none dark:border-white/10 dark:bg-[#171b23] "
            >
              <option value="all">All status</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white text-black px-3 text-sm outline-none dark:bg-[#181c24] dark:text-white dark:border-white/20"
            >
              <option value="">All Pincodes</option>
              {availablePincodes.map((pincode) => (
                <option key={pincode} value={pincode}>
                  {pincode}
                </option>
              ))}
            </select>
          </div>
        </div>


        {/* --- DELETE SELECTED BAR --- */}
        <div className="mb-4 flex items-center justify-between p-3">
  <span className="text-sm font-medium">
    {selectedBookingIds.length} booking(s) selected
  </span>

  <button
    type="button"
    onClick={handleDeleteSelectedBooking}
    disabled={!selectedBookingIds.length}
    className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
  >
    Delete Selected
  </button>
</div>
        {/* --------------------------- */}
        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            Loading bookings...
          </p>
        ) : error ? (
          <p className="rounded-xl bg-red-100 p-6 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        ) : !bookings.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm || statusFilter !== "all"
              ? "No bookings match the current filter."
              : "No bookings found."}
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
                        checked={
                          bookings.length > 0 &&
                          selectedBookingIds.length === bookings.length
                        }
                        onChange={(event) =>
                          toggleAllBookings(event.target.checked)
                        }
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">S.No</th>
                    <th className="px-4 py-3 font-semibold">Ritual</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Pandit</th>
                    {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                    <th className="px-4 py-3 font-semibold">Date & Slot</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Update</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedBookings.map((booking, index) => (
                    <tr
                      key={booking._id}
                      className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10"
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.includes(booking._id)}
                          onChange={(event) =>
                            toggleBookingSelection(
                              booking._id,
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3 text-[#2f1618] dark:text-[#fff3dc]">
                        {booking.ritual?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {booking.user?.name || booking.user?.phone || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {booking.pandit?.fullName || "-"}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {booking.pandit?.vendorId ? (
                            <>
                              <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                                {booking.pandit.vendorId.businessName || booking.pandit.vendorId.name || "N/A"}
                              </p>
                              <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70 font-medium">
                                ID: {String(booking.pandit.vendorId._id || "").slice(-6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                                {[booking.pandit.vendorId.address?.city, booking.pandit.vendorId.address?.state].filter(Boolean).join(", ")}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Super Admin / System</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {booking.bookingDate} | {booking.timeSlot?.label || "-"}
                      </td>
                      <td className="px-4 py-3">
                        Rs{" "}
                        {Number(
                          booking.bookingAmount || booking.dakshinaAmount || 0,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusBadgeClass(booking.bookingStatus)}`}
                          >
                            {booking.bookingStatus}
                          </span>
                          <span
                            className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${paymentBadgeClass(booking.payment?.status)}`}
                          >
                            {booking.payment?.status || "pending"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[220px] items-center gap-2">
                          <select
                            value={
                              statusUpdates[booking._id] ||
                              booking.bookingStatus ||
                              "requested"
                            }
                            onChange={(event) =>
                              setStatusUpdates((current) => ({
                                ...current,
                                [booking._id]: event.target.value,
                              }))
                            }
                            className="h-9 rounded-lg border border-[#d7c3a3] bg-white/75 px-2 text-xs outline-none dark:border-white/10 dark:bg-[#171b23] "
                          >
                            <option value="requested">Requested</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                          </select>

                          <select
                            value={
                              paymentUpdates[booking._id] ||
                              booking.payment?.status ||
                              "pending"
                            }
                            onChange={(event) =>
                              setPaymentUpdates((current) => ({
                                ...current,
                                [booking._id]: event.target.value,
                              }))
                            }
                            className="h-9 rounded-lg border border-[#d7c3a3] bg-white/75 px-2 text-xs outline-none dark:border-white/10 dark:bg-[#171b23]"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleUpdateBooking(booking)}
                            disabled={updatingBookingId === booking._id}
                            className="rounded-lg bg-[#8B1E3F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {updatingBookingId === booking._id
                              ? "..."
                              : "Update"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" data-booking-menu>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={(event) => {
                              const nextId =
                                openMenuId === booking._id ? "" : booking._id;
                              setOpenMenuId(nextId);
                              setMenuAnchorRect(
                                nextId
                                  ? event.currentTarget.getBoundingClientRect()
                                  : null,
                              );
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                            aria-label="Booking actions"
                          >
                            <FiMoreVertical />
                          </button>
                          {openMenuId === booking._id && (
                            <TableMenuPopover
                              open
                              anchorRect={menuAnchorRect}
                              preferUp={index >= pagedBookings.length - 3}
                              onClose={() => setOpenMenuId("")}
                              className="w-40 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  setSelectedBooking(booking);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                              >
                                <FiEye className="text-[#6f3945]" /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId("");
                                  handleDeleteBooking(booking);
                                }}
                                disabled={deletingBookingId === booking._id}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-200 dark:hover:bg-red-500/10"
                              >
                                <FiTrash2 className="text-red-600" /> Delete
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
              total={bookings.length}
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

      {selectedBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-[#dbc7a8]/60 bg-white dark:bg-[#12161f] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="mb-5 flex items-center justify-between border-b border-[#f0e3d1] pb-4 dark:border-white/10">
              <div>
                <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">
                  Booking Information
                </h3>
                <span className="text-xs font-mono text-gray-500">
                  ID: {selectedBooking._id}
                </span>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 transition-colors"
                aria-label="Close modal"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar text-sm text-[#2f1618] dark:text-gray-200">
              {/* SECTION 1: Ritual & General Status */}
              <div className="space-y-3">
                <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                  Ritual & Booking Status
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 sm:col-span-2">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Ritual
                    </span>
                    {selectedBooking.ritual?.image && (
                      <img
                        src={selectedBooking.ritual.image}
                        alt={selectedBooking.ritual.name}
                        className="w-10 h-10 object-cover rounded-lg mr-3 float-left border border-gray-200 dark:border-white/10"
                      />
                    )}
                    <strong>{selectedBooking.ritual?.name || "-"}</strong>
                    {selectedBooking.ritual?.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {selectedBooking.ritual.description}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Booking Mode
                    </span>
                    <strong>{selectedBooking.bookingMode || "-"}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Booking Status
                    </span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${statusBadgeClass(selectedBooking.bookingStatus)}`}
                    >
                      {selectedBooking.bookingStatus}
                    </span>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Created At
                    </span>
                    <strong>
                      {selectedBooking.createdAt
                        ? new Date(selectedBooking.createdAt).toLocaleString()
                        : "-"}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Last Updated
                    </span>
                    <strong>
                      {selectedBooking.updatedAt
                        ? new Date(selectedBooking.updatedAt).toLocaleString()
                        : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* SECTION 2: User / Customer Information */}
              <div className="space-y-3">
                <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                  Customer Details
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Customer Name
                    </span>
                    <strong>{selectedBooking.user?.name || "-"}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Mobile Number
                    </span>
                    <strong>{selectedBooking.user?.phone || "-"}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Email Address
                    </span>
                    <strong>{selectedBooking.user?.email || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Pandit details */}
              <div className="space-y-3">
                <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                  Assigned Pandit Details
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Pandit Name
                    </span>
                    <strong>{selectedBooking.pandit?.fullName || "-"}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Mobile Number
                    </span>
                    <strong>{selectedBooking.pandit?.phone || "-"}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Experience
                    </span>
                    <strong>
                      {selectedBooking.pandit?.yearsOfExperience
                        ? `${selectedBooking.pandit.yearsOfExperience} Years`
                        : "-"}
                    </strong>
                  </div>
                  {selectedBooking.pandit?.templeAssociated && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 sm:col-span-2">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Associated Temple
                      </span>
                      <strong>{selectedBooking.pandit.templeAssociated}</strong>
                    </div>
                  )}
                  {selectedBooking.pandit?.status && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Pandit Status
                      </span>
                      <strong className="capitalize">
                        {selectedBooking.pandit.status}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Schedule & Address */}
              <div className="space-y-3">
                <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                  Date, Time & Address
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Preferred Date
                    </span>
                    <strong>{selectedBooking.bookingDate || "-"}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 md:col-span-2">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Time Slots
                    </span>
                    {selectedBooking.dateAndTime?.dateAndTime &&
                    selectedBooking.dateAndTime.dateAndTime.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {selectedBooking.dateAndTime.dateAndTime.map(
                          (dt, idx) => (
                            <span
                              key={idx}
                              className="font-semibold text-xs bg-[#8B1E3F]/5 dark:bg-[#D4AF37]/5 px-2 py-0.5 rounded border border-[#8B1E3F]/10 dark:border-[#D4AF37]/10 w-fit"
                            >
                              {dt.date}: {dt.time}
                            </span>
                          ),
                        )}
                      </div>
                    ) : (
                      <strong>
                        {selectedBooking.timeSlot?.label ||
                          selectedBooking.timeSlot?.time ||
                          "-"}
                      </strong>
                    )}
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Address Type
                    </span>
                    <strong className="capitalize">
                      {selectedBooking.address?.addressType || "Others"}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 md:col-span-2">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Address Details
                    </span>
                    <strong>{formatAddress(selectedBooking) || "-"}</strong>
                  </div>
                  {selectedBooking.address?.secondPhone && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Alternative Phone
                      </span>
                      <strong>{selectedBooking.address.secondPhone}</strong>
                    </div>
                  )}
                  {selectedBooking.address?.email && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 md:col-span-2">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Alternative Email
                      </span>
                      <strong>{selectedBooking.address.email}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: Temple Snapshot (if temple booking mode) */}
              {selectedBooking.templeSnapshot &&
                selectedBooking.templeSnapshot.name && (
                  <div className="space-y-3">
                    <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                      Temple Snapshot
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 sm:col-span-2">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Temple Name
                        </span>
                        {selectedBooking.templeSnapshot.image && (
                          <img
                            src={selectedBooking.templeSnapshot.image}
                            alt={selectedBooking.templeSnapshot.name}
                            className="w-10 h-10 object-cover rounded-lg mr-3 float-left border border-gray-200 dark:border-white/10"
                          />
                        )}
                        <strong>{selectedBooking.templeSnapshot.name}</strong>
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          City/State
                        </span>
                        <strong>
                          {selectedBooking.templeSnapshot.city},{" "}
                          {selectedBooking.templeSnapshot.state}
                        </strong>
                      </div>
                      {selectedBooking.templeSnapshot.line1 && (
                        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 sm:col-span-3">
                          <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                            Reg Address / Line 1
                          </span>
                          <strong>
                            {selectedBooking.templeSnapshot.line1}{" "}
                            {selectedBooking.templeSnapshot.landmark
                              ? `(Landmark: ${selectedBooking.templeSnapshot.landmark})`
                              : ""}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* SECTION 6: Payment & Pricing */}
              <div className="space-y-3">
                <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                  Pricing & Payment Details
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Booking Amount
                    </span>
                    <strong className="text-base text-[#8B1E3F] dark:text-[#D4AF37]">
                      Rs{" "}
                      {Number(
                        selectedBooking.bookingAmount ||
                          selectedBooking.dakshinaAmount ||
                          0,
                      )}
                    </strong>
                  </div>
                  {selectedBooking.price !== undefined && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Total Base Price
                      </span>
                      <strong>Rs {Number(selectedBooking.price || 0)}</strong>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Payment Status
                    </span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${paymentBadgeClass(selectedBooking.payment?.status)}`}
                    >
                      {selectedBooking.payment?.status || "pending"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Payment Method
                    </span>
                    <strong className="uppercase">
                      {selectedBooking.payment?.method || "-"}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Amount Paid (Wallet)
                    </span>
                    <strong>
                      Rs {Number(selectedBooking.payment?.walletAmount || 0)}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Amount Due
                    </span>
                    <strong
                      className={
                        Number(selectedBooking.payment?.amountDue || 0) > 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }
                    >
                      Rs {Number(selectedBooking.payment?.amountDue || 0)}
                    </strong>
                  </div>
                  {selectedBooking.payment?.gateway && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Gateway
                      </span>
                      <strong className="capitalize">
                        {selectedBooking.payment.gateway}
                      </strong>
                    </div>
                  )}
                  {selectedBooking.payment?.transactionId && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 md:col-span-2">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Transaction ID
                      </span>
                      <strong className="font-mono text-xs">
                        {selectedBooking.payment.transactionId}
                      </strong>
                    </div>
                  )}
                  {selectedBooking.payment?.razorpayOrderId && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 md:col-span-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Razorpay Details
                      </span>
                      <div className="grid gap-1 grid-cols-2 text-xs font-mono">
                        <div>
                          <span className="opacity-70">Order:</span>{" "}
                          {selectedBooking.payment.razorpayOrderId}
                        </div>
                        <div>
                          <span className="opacity-70">Payment:</span>{" "}
                          {selectedBooking.payment.razorpayPaymentId || "-"}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedBooking.payment?.paidAt && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Paid At
                      </span>
                      <strong>
                        {new Date(
                          selectedBooking.payment.paidAt,
                        ).toLocaleString()}
                      </strong>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Payout Status
                    </span>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${selectedBooking.payoutPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"}`}
                    >
                      {selectedBooking.payoutPaid ? "Settled" : "Pending"}
                    </span>
                  </div>
                  {selectedBooking.payoutPaidAt && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Settled At
                      </span>
                      <strong>
                        {new Date(
                          selectedBooking.payoutPaidAt,
                        ).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 7: Zoom Meeting (Only for Online Pooja / Zoom Available) */}
              {(selectedBooking.bookingMode === "onlinePooja" ||
                (selectedBooking.zoomMeeting &&
                  selectedBooking.zoomMeeting.meetingId)) && (
                <div className="space-y-3">
                  <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                    Zoom Video Meeting
                  </h4>
                  {selectedBooking.zoomMeeting &&
                  selectedBooking.zoomMeeting.meetingId ? (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Meeting ID
                        </span>
                        <strong className="font-mono">
                          {selectedBooking.zoomMeeting.meetingId}
                        </strong>
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Password / Passcode
                        </span>
                        <strong className="font-mono">
                          {selectedBooking.zoomMeeting.password || "-"}
                        </strong>
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 sm:col-span-2 md:col-span-3">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Join Link
                        </span>
                        <a
                          href={selectedBooking.zoomMeeting.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8B1E3F] hover:underline break-all dark:text-[#D4AF37] font-semibold flex items-center gap-1"
                        >
                          {selectedBooking.zoomMeeting.join_url}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#dbc7a8] dark:border-white/10 p-4 text-center">
                      <p className="text-xs text-gray-500 mb-3">
                        No Zoom meeting has been generated for this online
                        booking yet.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handleCreateZoomMeeting(selectedBooking._id)
                        }
                        disabled={generatingZoomId === selectedBooking._id}
                        className="rounded-lg bg-[#8B1E3F] px-4 py-2 text-xs font-bold text-white hover:bg-[#6c1b2f] disabled:opacity-65 transition-colors"
                      >
                        {generatingZoomId === selectedBooking._id
                          ? "Generating Zoom Meeting..."
                          : "Generate Zoom Meeting"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 8: Notes, Requests & Decisions */}
              <div className="space-y-3">
                <h4 className="border-b border-[#f0e3d1] pb-1 text-xs font-bold uppercase tracking-wider text-[#8B1E3F] dark:border-white/10 dark:text-[#D4AF37]">
                  Notes & Special Requests
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 sm:col-span-2">
                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      User Notes / Instructions
                    </span>
                    <strong>
                      {selectedBooking.notes || "No notes provided by user."}
                    </strong>
                  </div>
                  {selectedBooking.panditDecision &&
                    selectedBooking.panditDecision.samagriType && (
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Samagri Selection
                        </span>
                        <strong className="capitalize">
                          {selectedBooking.panditDecision.samagriType}
                        </strong>
                      </div>
                    )}
                  {selectedBooking.panditDecision &&
                    selectedBooking.panditDecision.note && (
                      <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                        <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                          Pandit Decision Note
                        </span>
                        <strong>{selectedBooking.panditDecision.note}</strong>
                      </div>
                    )}
                  {selectedBooking.panditDecision &&
                    selectedBooking.panditDecision.rejectReasonType && (
                      <div className="rounded-xl bg-red-50 dark:bg-red-900/10 p-3 sm:col-span-2 text-red-700 dark:text-red-200">
                        <span className="block text-[10px] uppercase tracking-wider text-red-500 dark:text-red-400 font-semibold mb-1">
                          Rejection Details
                        </span>
                        <strong>
                          Reason:{" "}
                          {selectedBooking.panditDecision.rejectReasonType.replace(
                            /_/g,
                            " ",
                          )}
                        </strong>
                        {selectedBooking.panditDecision.rejectReasonText && (
                          <p className="text-xs mt-1 opacity-90">
                            Note:{" "}
                            {selectedBooking.panditDecision.rejectReasonText}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Reschedule Requests */}
                  {selectedBooking.rescheduleRequests &&
                    selectedBooking.rescheduleRequests.length > 0 && (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-3 sm:col-span-2 border border-amber-200 dark:border-amber-900/30">
                        <span className="block text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold mb-1">
                          Reschedule Requests
                        </span>
                        <div className="space-y-2">
                          {selectedBooking.rescheduleRequests.map(
                            (req, idx) => (
                              <div
                                key={idx}
                                className="text-xs border-t border-amber-200 dark:border-amber-900/30 pt-1.5 first:border-none first:pt-0"
                              >
                                <div>
                                  <strong>Requested By:</strong>{" "}
                                  {req.requestedBy} (
                                  {req.requestedAt
                                    ? new Date(
                                        req.requestedAt,
                                      ).toLocaleDateString()
                                    : ""}
                                  )
                                </div>
                                {req.reason && (
                                  <div>
                                    <strong>Reason:</strong> {req.reason}
                                  </div>
                                )}
                                {req.notes && (
                                  <div>
                                    <strong>Notes:</strong> {req.notes}
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Cancellation Requests */}
                  {selectedBooking.cancellationRequests &&
                    selectedBooking.cancellationRequests.length > 0 && (
                      <div className="rounded-xl bg-red-50 dark:bg-red-900/10 p-3 sm:col-span-2 border border-red-200 dark:border-red-900/30">
                        <span className="block text-[10px] uppercase tracking-wider text-red-700 dark:text-red-400 font-bold mb-1">
                          Cancellation Requests
                        </span>
                        <div className="space-y-2">
                          {selectedBooking.cancellationRequests.map(
                            (req, idx) => (
                              <div
                                key={idx}
                                className="text-xs border-t border-red-200 dark:border-red-900/30 pt-1.5 first:border-none first:pt-0"
                              >
                                <div>
                                  <strong>Requested By:</strong>{" "}
                                  {req.requestedBy} (
                                  {req.requestedAt
                                    ? new Date(
                                        req.requestedAt,
                                      ).toLocaleDateString()
                                    : ""}
                                  )
                                </div>
                                {req.reason && (
                                  <div>
                                    <strong>Reason:</strong> {req.reason}
                                  </div>
                                )}
                                {req.notes && (
                                  <div>
                                    <strong>Notes:</strong> {req.notes}
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-3 border-t border-[#f0e3d1] dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl border border-[#dbc7a8] hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 px-6 py-2.5 text-xs font-bold text-[#6f3945] dark:text-[#f7e3c0]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
