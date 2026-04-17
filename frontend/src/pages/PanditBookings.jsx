import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiEye, FiSearch, FiX } from "react-icons/fi";

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
  return [address.line1, address.line2, address.city, address.state, address.pinCode]
    .filter(Boolean)
    .join(", ");
};

export default function PanditBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = useCallback(async (searchValue = "", statusValue = "all") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/admin/pandit-bookings", {
        params: {
          ...(searchValue.trim() ? { search: searchValue.trim() } : {}),
          ...(statusValue ? { status: statusValue } : {}),
        },
      });

      setBookings(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load pandit bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(searchTerm, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchBookings, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const requested = bookings.filter((entry) => entry.bookingStatus === "requested").length;
    const confirmed = bookings.filter((entry) => entry.bookingStatus === "confirmed").length;

    return {
      total: bookings.length,
      requested,
      confirmed,
    };
  }, [bookings]);

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8B1E3F] dark:text-[#D4AF37]">Pandit Bookings</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">User Booking Requests</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">Requested {summary.requested}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Confirmed {summary.confirmed}</span>
        </div>
      </section>

      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">All Booking Entries</h3>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
              <FiSearch className="text-[#8B1E3F] dark:text-[#D4AF37]" />
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
                  className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]"
                >
                  <FiX />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
            >
              <option value="all">All status</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading bookings...</p>
        ) : error ? (
          <p className="rounded-xl bg-red-100 p-6 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        ) : !bookings.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm || statusFilter !== "all" ? "No bookings match the current filter." : "No bookings found."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ritual</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Pandit</th>
                  <th className="px-4 py-3 font-semibold">Date & Slot</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-t border-[#e8d7bf] dark:border-white/10">
                    <td className="px-4 py-3 text-[#2f1618] dark:text-[#fff3dc]">{booking.ritual?.name || "-"}</td>
                    <td className="px-4 py-3">{booking.user?.name || booking.user?.phone || "-"}</td>
                    <td className="px-4 py-3">{booking.pandit?.fullName || "-"}</td>
                    <td className="px-4 py-3">{booking.bookingDate} | {booking.timeSlot?.label || "-"}</td>
                    <td className="px-4 py-3">Rs {Number(booking.dakshinaAmount || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusBadgeClass(booking.bookingStatus)}`}>
                          {booking.bookingStatus}
                        </span>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${paymentBadgeClass(booking.payment?.status)}`}>
                          {booking.payment?.status || "pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        aria-label="View booking"
                      >
                        <FiEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.96),rgba(245,235,217,0.92))] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.95),rgba(18,8,10,0.98))]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-2xl leading-none">&times;</button>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Ritual</span><strong>{selectedBooking.ritual?.name || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Booking Mode</span><strong>{selectedBooking.bookingMode || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">User</span><strong>{selectedBooking.user?.name || selectedBooking.user?.phone || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Pandit</span><strong>{selectedBooking.pandit?.fullName || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Date</span><strong>{selectedBooking.bookingDate || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Slot</span><strong>{selectedBooking.timeSlot?.label || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Payment</span><strong>{selectedBooking.payment?.status || "pending"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span className="block text-xs opacity-70">Amount</span><strong>Rs {Number(selectedBooking.dakshinaAmount || 0)}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2"><span className="block text-xs opacity-70">Address</span><strong>{formatAddress(selectedBooking) || "-"}</strong></div>
              <div className="rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5 md:col-span-2"><span className="block text-xs opacity-70">Notes</span><strong>{selectedBooking.notes || "-"}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
