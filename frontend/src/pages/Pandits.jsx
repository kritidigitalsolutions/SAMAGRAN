import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import { FiEye, FiSearch, FiX } from "react-icons/fi";

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

export default function Pandits() {
  const [pandits, setPandits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPandit, setSelectedPandit] = useState(null);

  const fetchPandits = useCallback(async (searchValue = "") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/admin/pandits", {
        params: searchValue.trim() ? { search: searchValue.trim() } : {},
      });

      setPandits(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load pandits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPandits(searchTerm);
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchPandits, searchTerm]);

  const summary = useMemo(() => {
    const active = pandits.filter((pandit) => pandit.status === "active").length;
    const pending = pandits.filter((pandit) => pandit.status === "pending").length;

    return {
      total: pandits.length,
      active,
      pending,
    };
  }, [pandits]);

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8B1E3F] dark:text-[#D4AF37]">Pandit Network</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">All Pandits</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Active {summary.active}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">Pending {summary.pending}</span>
        </div>
      </section>

      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Pandit Listing</h3>

          <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[#8B1E3F] dark:text-[#D4AF37]" />
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
                className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading pandits...</p>
        ) : error ? (
          <p className="rounded-xl bg-red-100 p-6 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        ) : !pandits.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm ? "No pandits match your search." : "No pandits found."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Experience</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pandits.map((pandit) => (
                  <tr key={pandit._id} className="border-t border-[#e8d7bf] dark:border-white/10">
                    <td className="px-4 py-3 text-[#2f1618] dark:text-[#fff3dc]">{pandit.fullName || "N/A"}</td>
                    <td className="px-4 py-3">{pandit.phone || "-"}</td>
                    <td className="px-4 py-3">{pandit.yearsOfExperience || 0} yrs</td>
                    <td className="px-4 py-3">{pandit.address?.city || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClass(pandit.status)}`}>
                        {pandit.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPandit(pandit)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        aria-label={`View ${pandit.fullName || "pandit"}`}
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

      {selectedPandit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.96),rgba(245,235,217,0.92))] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.95),rgba(18,8,10,0.98))]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Pandit Details</h3>
              <button onClick={() => setSelectedPandit(null)} className="text-2xl leading-none">&times;</button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
