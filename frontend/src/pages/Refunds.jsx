import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import { toast } from "react-toastify";
import { getStoredAdmin } from "../utils/auth";

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function Refunds() {
  const isSuperAdmin = useMemo(() => getStoredAdmin()?.role === "super", []);
  const [activeTab, setActiveTab] = useState("complaints"); // "complaints" or "settings"
  
  // Complaints State
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selected Complaint for Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminResponseText, setAdminResponseText] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState("Resolved");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    whatsappNo: "",
    callNo: "",
    email: "",
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch Complaints
  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setErrorComplaints("");
      const res = await API.get("/admin/complaints");
      setComplaints(res.data?.data || []);
    } catch (err) {
      setErrorComplaints(err?.response?.data?.message || "Failed to load complaints");
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await API.get("/admin/support-settings");
      const data = res.data?.data || {};
      setSettingsForm({
        whatsappNo: data.whatsappNo || "",
        callNo: data.callNo || "",
        email: data.email || "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load support settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchSettings();
  }, []);

  // Filter and Search Complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      
      const userField = typeof c.user === "object" && c.user !== null ? c.user : {};
      const orderField = c.order || {};
      const bookingField = c.booking || {};
      
      const matchesSearch =
        String(userField.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(userField.phone || "").includes(searchQuery) ||
        String(orderField._id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(bookingField._id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.issue || "").toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchesStatus && matchesSearch;
    });
  }, [complaints, searchQuery, statusFilter]);

  // Paginated Complaints
  const pagedComplaints = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, page, pageSize]);

  // Handle Response Submit
  const handleRespondSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    try {
      setSubmittingResponse(true);
      const res = await API.patch(`/admin/complaints/${selectedComplaint._id}`, {
        status: resolutionStatus,
        adminResponse: adminResponseText,
      });
      
      toast.success(`Complaint marked as ${resolutionStatus} successfully`);
      
      // Update local state
      setComplaints((prev) =>
        prev.map((c) => (c._id === selectedComplaint._id ? { ...c, ...res.data.data } : c))
      );
      
      setSelectedComplaint(null);
      setAdminResponseText("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit response");
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Handle Settings Submit
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await API.patch("/admin/support-settings", settingsForm);
      toast.success("Support settings updated successfully!");
      if (res.data?.data) {
        setSettingsForm({
          whatsappNo: res.data.data.whatsappNo || "",
          callNo: res.data.data.callNo || "",
          email: res.data.data.email || "",
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update support settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const openRespondModal = (complaint) => {
    setSelectedComplaint(complaint);
    setAdminResponseText(complaint.adminResponse || "");
    setResolutionStatus(complaint.status === "Pending" ? "Resolved" : complaint.status);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Support & Refunds</h1>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
          Manage customer complaints, refund requests, and dynamic support channels.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--admin-border)] gap-6">
        <button
          onClick={() => setActiveTab("complaints")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "complaints"
              ? "border-[var(--admin-primary)] text-[var(--admin-primary)]"
              : "border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
          }`}
        >
          Customer Complaints & Refunds
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "settings"
              ? "border-[var(--admin-primary)] text-[var(--admin-primary)]"
              : "border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
          }`}
        >
          Dynamic Support Settings
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "complaints" ? (
        <div className="space-y-4">
          {/* Controls: Search, Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center flex-1 max-w-md rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[var(--admin-text-muted)]" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search user name, phone, order ID, or issue..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="ml-2 w-full bg-transparent text-sm text-[var(--admin-text)] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow)]">
            {loadingComplaints ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <div className="h-8 w-8 rounded-full border-4 border-[var(--admin-primary)]/20 border-t-[var(--admin-primary)] animate-spin" />
                <p className="text-sm text-[var(--admin-text-muted)]">Loading complaints...</p>
              </div>
            ) : errorComplaints ? (
              <div className="p-8 text-center text-red-600">{errorComplaints}</div>
            ) : (
              <table className="min-w-full text-left text-sm text-[var(--admin-text)]">
                <thead className="bg-[var(--admin-surface-soft)] text-xs uppercase tracking-wide text-[var(--admin-text-muted)]">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Order ID & Amount</th>
                    {isSuperAdmin && <th className="px-6 py-4">Vendor Details</th>}
                    <th className="px-6 py-4">Issue Details</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Raised Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {pagedComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? "7" : "6"} className="px-6 py-12 text-center text-[var(--admin-text-muted)]">
                        No complaints found.
                      </td>
                    </tr>
                  ) : (
                    pagedComplaints.map((c) => {
                      const user = typeof c.user === "object" && c.user !== null ? c.user : {};
                      const order = c.order;
                      const booking = c.booking;
                      const formattedDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-";
                      
                      return (
                        <tr key={c._id} className="hover:bg-[var(--admin-surface-soft)] transition">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-[var(--admin-text-strong)]">
                              {user.name || "N/A"}
                            </div>
                            <div className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                              {user.phone || ""} {user.email ? `• ${user.email}` : ""}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {booking ? (
                              <>
                                <div className="font-mono text-xs text-[var(--admin-text-strong)] font-semibold">
                                  Booking #{String(booking._id || "").slice(-8).toUpperCase()}
                                </div>
                                <div className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
                                  {formatMoney(booking.bookingAmount || booking.dakshinaAmount || 0)} ({booking.payment?.status || "N/A"})
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-mono text-xs text-[var(--admin-text-strong)] font-semibold">
                                  Order #{String(order?._id || "").slice(-8).toUpperCase()}
                                </div>
                                <div className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
                                  {formatMoney(order?.totalAmount || 0)} ({order?.paymentStatus || "N/A"})
                                </div>
                              </>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-6 py-4">
                              {(() => {
                                const vendor = booking?.pandit?.vendorId || order?.vendorId;
                                return vendor ? (
                                  <>
                                    <div className="font-semibold text-[var(--admin-text-strong)]">
                                      {vendor.businessName || vendor.name || "N/A"}
                                    </div>
                                    <div className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
                                      ID: {String(vendor._id || "").slice(-6).toUpperCase()}
                                    </div>
                                    <div className="text-[10px] text-[var(--admin-text-muted)] mt-0.5">
                                      {[vendor.address?.city, vendor.address?.state].filter(Boolean).join(", ")}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs text-[var(--admin-text-muted)]">Super Admin / System</span>
                                );
                              })()}
                            </td>
                          )}
                          <td className="px-6 py-4 max-w-xs">
                            <div className="font-semibold text-sm text-[var(--admin-text-strong)]">
                              {c.issue}
                            </div>
                            <div className="text-xs text-[var(--admin-text-muted)] truncate mt-1">
                              {c.details}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                c.status === "Resolved"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                  : c.status === "Rejected"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  c.status === "Resolved"
                                    ? "bg-green-500"
                                    : c.status === "Rejected"
                                    ? "bg-red-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-[var(--admin-text-muted)] font-medium">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openRespondModal(c)}
                              className="rounded-xl border border-[var(--admin-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-primary)] transition hover:bg-[var(--admin-primary)] hover:text-white"
                            >
                              {c.status === "Pending" ? "Respond" : "View Details"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loadingComplaints && filteredComplaints.length > 0 && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filteredComplaints.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </div>
      ) : (
        /* Settings Tab */
        <div className="max-w-2xl rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
          <h2 className="text-lg font-semibold text-[var(--admin-text)] border-b border-[var(--admin-border)] pb-3 mb-6">
            Configure Live Support Details
          </h2>

          {loadingSettings ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <div className="h-8 w-8 rounded-full border-4 border-[var(--admin-primary)]/20 border-t-[var(--admin-primary)] animate-spin" />
              <p className="text-sm text-[var(--admin-text-muted)]">Loading settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              {/* WhatsApp Support Number */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                  WhatsApp Support Link / Number
                </label>
                <div className="relative mt-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2.5 flex items-center">
                  <span className="text-sm mr-2">🟢</span>
                  <input
                    type="text"
                    name="whatsappNo"
                    value={settingsForm.whatsappNo}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNo: e.target.value })}
                    placeholder="e.g. +91 99887 76655"
                    className="w-full bg-transparent text-sm text-[var(--admin-text)] outline-none"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  The user will be redirected to WhatsApp chat with this number.
                </p>
              </div>

              {/* Call Support Number */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                  Voice Call Support Number
                </label>
                <div className="relative mt-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2.5 flex items-center">
                  <span className="text-sm mr-2">📞</span>
                  <input
                    type="text"
                    name="callNo"
                    value={settingsForm.callNo}
                    onChange={(e) => setSettingsForm({ ...settingsForm, callNo: e.target.value })}
                    placeholder="e.g. +91 99887 76655"
                    className="w-full bg-transparent text-sm text-[var(--admin-text)] outline-none"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  Direct dialing support number for customers.
                </p>
              </div>

              {/* Support Email */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                  Support Email Address
                </label>
                <div className="relative mt-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2.5 flex items-center">
                  <span className="text-sm mr-2">✉️</span>
                  <input
                    type="email"
                    name="email"
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    placeholder="e.g. support@samagran.com"
                    className="w-full bg-transparent text-sm text-[var(--admin-text)] outline-none"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  Support queries will be sent to this email address.
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t border-[var(--admin-border)]">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-[var(--admin-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60 transition"
                >
                  {savingSettings ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    "Save Configurations"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal Dialog for Complaint Resolution */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-2xl space-y-6 transform scale-100 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--admin-border)] pb-4">
              <div>
                <h3 className="text-xl font-bold text-[var(--admin-text-strong)]">
                  Complaint/Refund Resolution
                </h3>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  {selectedComplaint.booking ? "Booking ID" : "Order ID"}: #{String(selectedComplaint.booking?._id || selectedComplaint.order?._id || '').slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="rounded-xl p-1 text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-soft)] hover:text-[var(--admin-text)]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Details body */}
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {(() => {
                const compUser = typeof selectedComplaint.user === "object" && selectedComplaint.user !== null ? selectedComplaint.user : {};
                return (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      User Details
                    </span>
                    <p className="text-sm font-medium mt-1">
                      {compUser.name || "N/A"} ({compUser.phone || ""})
                    </p>
                  </div>
                );
              })()}

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                  Issue Category
                </span>
                <p className="text-sm font-semibold mt-1 text-[var(--admin-text-strong)]">
                  {selectedComplaint.issue}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                  Explanation in Detail
                </span>
                <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-3 mt-1.5 text-sm whitespace-pre-line">
                  {selectedComplaint.details}
                </div>
              </div>

              {selectedComplaint.booking && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                    Paid Amount Details
                  </span>
                  <div className="text-sm mt-1">
                    <div>Total Amount: {formatMoney(selectedComplaint.booking.bookingAmount || selectedComplaint.booking.dakshinaAmount || 0)}</div>
                    <div>Payment Method: {selectedComplaint.booking.payment?.method || "N/A"}</div>
                    <div>Payment Status: {selectedComplaint.booking.payment?.status || "N/A"}</div>
                  </div>
                </div>
              )}

              {selectedComplaint.order?.payableAmount !== undefined && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                    Paid Amount Details
                  </span>
                  <div className="text-sm mt-1">
                    <div>Total Amount: {formatMoney(selectedComplaint.order.totalAmount || 0)}</div>
                    <div>Paid Online: {formatMoney(selectedComplaint.order.payableAmount || 0)}</div>
                    <div>Paid via Wallet: {formatMoney(selectedComplaint.order.walletUsed || 0)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Form response input */}
            <form onSubmit={handleRespondSubmit} className="space-y-4 pt-4 border-t border-[var(--admin-border)]">
              {selectedComplaint.status === "Pending" ? (
                <>
                  {/* Select Resolution Status */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      Action / Decision
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] px-4 py-2.5 cursor-pointer text-sm font-semibold select-none flex-1 justify-center bg-[var(--admin-surface-soft)] hover:bg-[var(--admin-border)]">
                        <input
                          type="radio"
                          name="resolutionStatus"
                          value="Resolved"
                          checked={resolutionStatus === "Resolved"}
                          onChange={() => setResolutionStatus("Resolved")}
                          className="accent-[var(--admin-primary)]"
                        />
                        Resolve / Accept
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] px-4 py-2.5 cursor-pointer text-sm font-semibold select-none flex-1 justify-center bg-[var(--admin-surface-soft)] hover:bg-[var(--admin-border)]">
                        <input
                          type="radio"
                          name="resolutionStatus"
                          value="Rejected"
                          checked={resolutionStatus === "Rejected"}
                          onChange={() => setResolutionStatus("Rejected")}
                          className="accent-[var(--admin-primary)]"
                        />
                        Reject / Decline
                      </label>
                    </div>
                  </div>

                  {/* Feedback description */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      Admin Explanation Response
                    </label>
                    <textarea
                      rows={3}
                      value={adminResponseText}
                      onChange={(e) => setAdminResponseText(e.target.value)}
                      placeholder="Explain the resolution or rejection reasons for the customer..."
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text)] outline-none focus:border-[var(--admin-primary)]"
                      required
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedComplaint(null)}
                      className="rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-soft)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingResponse}
                      className="rounded-xl bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
                    >
                      {submittingResponse ? "Submitting..." : "Submit Response"}
                    </button>
                  </div>
                </>
              ) : (
                /* Already Resolved / Rejected view */
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      Resolution Status
                    </span>
                    <p className={`text-sm font-semibold mt-1 ${
                      selectedComplaint.status === "Resolved" ? "text-green-600" : "text-red-600"
                    }`}>
                      {selectedComplaint.status}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                      Resolution Feedback Response
                    </span>
                    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-3 mt-1.5 text-sm whitespace-pre-line">
                      {selectedComplaint.adminResponse || "No response details provided."}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedComplaint(null)}
                      className="rounded-xl bg-[var(--admin-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-primary-strong)]"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
