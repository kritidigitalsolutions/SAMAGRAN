import React, { useState } from "react";
import { adminApi } from "../../../api/admin/api";
import { toast } from "react-toastify";

const TABS = ["Basic Info", "Address", "KYC & Bank", "Page Access"];

const availablePages = [
  "dashboard", "orders", "products", "category", "sub-category", "items", "kits",
  "pandits", "rituals", "temples", "pandit-bookings",
  "banners", "coupons", "offers", "legal", "custom-samagri",
  "notifications", "delivery-boys", "settings",
  "transactions", "earnings", "withdrawals", "refunds",
];

const inputCls = "w-full rounded-xl border border-[#d7c3a3] bg-white/80 px-3 py-2 text-sm text-[#2f1618] outline-none focus:border-[#8B1E3F] dark:border-white/20 dark:bg-[#1a1e27] dark:text-white placeholder:text-[#9a7a6a]";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-[#7f5a4f] dark:text-[#e7c98b] mb-1.5";

const CheckBadge = ({ verified }) =>
  verified ? (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
      Verified
    </span>
  ) : null;

const AddVendorModal = ({ onClose, onVendorAdded }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [basic, setBasic] = useState({
    name: "", businessName: "", contactPerson: "", image: "",
    email: "", phone: "", password: "", notes: "",
  });
  const [address, setAddress] = useState({
    line1: "", line2: "", city: "", state: "", pincode: "",
  });
  const [kyc, setKyc] = useState({
    pan: "", panVerified: false,
    aadhaar: "", aadhaarVerified: false,
    gst: "", fssai: "", cin: "",
  });
  const [bank, setBank] = useState({
    accountHolder: "", bankName: "", accountNumber: "", ifsc: "", bankVerified: false,
  });
  const [pageAccess, setPageAccess] = useState([]);

  const setField = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const togglePage = (page) =>
    setPageAccess((prev) => prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]);

  const selectAllPages = () => setPageAccess([...availablePages]);
  const clearAllPages = () => setPageAccess([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!basic.name || !basic.email || !basic.phone || !basic.password) {
      toast.error("Name, email, phone and password are required");
      setActiveTab(0);
      return;
    }
    setLoading(true);
    try {
      await adminApi.post("/vendors", {
        ...basic,
        address,
        kyc,
        bank,
        pageAccess,
        role: "vendor",
      });
      toast.success("Vendor added successfully");
      onVendorAdded();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[92vh] rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] shadow-2xl dark:border-white/10 dark:bg-[#141820] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#e8d9c4] dark:border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8B1E3F]">Vendor Management</p>
            <h2 className="mt-0.5 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Add New Vendor</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-7 pt-4 pb-0 border-b border-[#e8d9c4] dark:border-white/10">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${activeTab === i
                ? "border-[#8B1E3F] text-[#8B1E3F] bg-[#8B1E3F]/5"
                : "border-transparent text-[#7f5a4f] hover:text-[#8B1E3F] dark:text-[#dbcdb8]/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
          {/* Tab 0: Basic Info */}
          {activeTab === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Vendor Name *</label>
                <input name="name" value={basic.name} onChange={setField(setBasic)} required className={inputCls} placeholder="Amit Kumar" />
              </div>
              <div>
                <label className={labelCls}>Business Name</label>
                <input name="businessName" value={basic.businessName} onChange={setField(setBasic)} className={inputCls} placeholder="Samagran Ranchi" />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input name="contactPerson" value={basic.contactPerson} onChange={setField(setBasic)} className={inputCls} placeholder="Partner Name" />
              </div>
              <div>
                <label className={labelCls}>Profile Image URL</label>
                <input name="image" value={basic.image} onChange={setField(setBasic)} className={inputCls} placeholder="https://..." />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" name="email" value={basic.email} onChange={setField(setBasic)} required className={inputCls} placeholder="partner@email.com" />
              </div>
              <div>
                <label className={labelCls}>Mobile Number *</label>
                <input type="tel" name="phone" value={basic.phone} onChange={setField(setBasic)} required className={inputCls} placeholder="10 digit mobile" />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input type="password" name="password" value={basic.password} onChange={setField(setBasic)} required className={inputCls} placeholder="Min 6 characters" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input name="notes" value={basic.notes} onChange={setField(setBasic)} className={inputCls} placeholder="Internal notes..." />
              </div>
            </div>
          )}

          {/* Tab 1: Address */}
          {activeTab === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelCls}>Address Line 1</label>
                <input name="line1" value={address.line1} onChange={setField(setAddress)} className={inputCls} placeholder="Street, Area" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Address Line 2</label>
                <input name="line2" value={address.line2} onChange={setField(setAddress)} className={inputCls} placeholder="Landmark" />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input name="city" value={address.city} onChange={setField(setAddress)} className={inputCls} placeholder="Ranchi" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input name="state" value={address.state} onChange={setField(setAddress)} className={inputCls} placeholder="Jharkhand" />
              </div>
              <div>
                <label className={labelCls}>Pincode</label>
                <input name="pincode" value={address.pincode} onChange={setField(setAddress)} className={inputCls} placeholder="834001" />
              </div>
            </div>
          )}

          {/* Tab 2: KYC & Bank */}
          {activeTab === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-3">KYC Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>PAN Number</label>
                    <input name="pan" value={kyc.pan} onChange={setField(setKyc)} className={inputCls} placeholder="ABCDE1234F" />
                    <label className="mt-2 flex items-center gap-2 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                      <input type="checkbox" name="panVerified" checked={kyc.panVerified} onChange={setField(setKyc)} className="h-4 w-4 rounded" />
                      PAN Verified
                      <CheckBadge verified={kyc.panVerified} />
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Aadhaar Number</label>
                    <input name="aadhaar" value={kyc.aadhaar} onChange={setField(setKyc)} className={inputCls} placeholder="XXXX XXXX XXXX" />
                    <label className="mt-2 flex items-center gap-2 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                      <input type="checkbox" name="aadhaarVerified" checked={kyc.aadhaarVerified} onChange={setField(setKyc)} className="h-4 w-4 rounded" />
                      Aadhaar Verified
                      <CheckBadge verified={kyc.aadhaarVerified} />
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>GST Number <span className="text-[10px] normal-case font-normal text-[#9a7a6a]">(Optional)</span></label>
                    <input name="gst" value={kyc.gst} onChange={setField(setKyc)} className={inputCls} placeholder="27AACFY8913A1Z8" />
                  </div>
                  <div>
                    <label className={labelCls}>FSSAI Number <span className="text-[10px] normal-case font-normal text-[#9a7a6a]">(If Applicable)</span></label>
                    <input name="fssai" value={kyc.fssai} onChange={setField(setKyc)} className={inputCls} placeholder="13323999000008" />
                  </div>
                  <div>
                    <label className={labelCls}>CIN Number <span className="text-[10px] normal-case font-normal text-[#9a7a6a]">(If Applicable)</span></label>
                    <input name="cin" value={kyc.cin} onChange={setField(setKyc)} className={inputCls} placeholder="U74140MH2025PTC055568" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e8d9c4] dark:border-white/10 pt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F] mb-3">Bank Account Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Account Holder Name</label>
                    <input name="accountHolder" value={bank.accountHolder} onChange={setField(setBank)} className={inputCls} placeholder="Amit Kumar" />
                  </div>
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input name="bankName" value={bank.bankName} onChange={setField(setBank)} className={inputCls} placeholder="HDFC Bank" />
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input name="accountNumber" value={bank.accountNumber} onChange={setField(setBank)} className={inputCls} placeholder="50100xxxxxxxxxx" />
                  </div>
                  <div>
                    <label className={labelCls}>IFSC Code</label>
                    <input name="ifsc" value={bank.ifsc} onChange={setField(setBank)} className={inputCls} placeholder="HDFC0001234" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#6f3945] dark:text-[#f7e3c0]">
                      <input type="checkbox" name="bankVerified" checked={bank.bankVerified} onChange={setField(setBank)} className="h-4 w-4 rounded" />
                      Bank Account Verified
                      <CheckBadge verified={bank.bankVerified} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Page Access */}
          {activeTab === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B1E3F]">Page Access</p>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllPages} className="text-xs px-3 py-1.5 rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">Select All</button>
                  <button type="button" onClick={clearAllPages} className="text-xs px-3 py-1.5 rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {availablePages.map((page) => (
                  <label key={page} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${pageAccess.includes(page) ? "border-[#8B1E3F]/40 bg-[#8B1E3F]/8 text-[#8B1E3F] dark:bg-[#8B1E3F]/20 dark:text-[#f7b8ca]" : "border-[#d7c3a3] text-[#6f3945] hover:bg-[#8B1E3F]/5 dark:border-white/10 dark:text-[#dbcdb8]"}`}>
                    <input type="checkbox" checked={pageAccess.includes(page)} onChange={() => togglePage(page)} className="h-4 w-4 rounded" />
                    <span className="capitalize">{page.replace(/-/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 border-t border-[#e8d9c4] dark:border-white/10 bg-[#fdf8f2] dark:bg-[#1a1e27]">
          <div className="flex gap-2">
            {TABS.map((_, i) => (
              <button key={i} type="button" onClick={() => setActiveTab(i)} className={`h-2 rounded-full transition-all ${activeTab === i ? "w-6 bg-[#8B1E3F]" : "w-2 bg-[#d7c3a3] dark:bg-white/20"}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {activeTab > 0 && (
              <button type="button" onClick={() => setActiveTab((t) => t - 1)} className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
                Back
              </button>
            )}
            {activeTab < TABS.length - 1 ? (
              <button type="button" onClick={() => setActiveTab((t) => t + 1)} className="rounded-xl bg-[#8B1E3F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a0233f]">
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl bg-[#8B1E3F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#a0233f] disabled:opacity-60 flex items-center gap-2"
              >
                {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                {loading ? "Adding..." : "Add Vendor"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddVendorModal;
