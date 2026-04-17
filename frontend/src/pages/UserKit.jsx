import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiMail,
  FiPackage,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiUser,
  FiX,
} from "react-icons/fi";
import API from "../api/axios";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatImageUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^backend\//i, "");
  const uploadPath = cleanPath.includes("/") ? cleanPath : `uploads/${cleanPath}`;

  return encodeURI(`${apiOrigin}/${uploadPath}`);
};

export default function UserKit() {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedKit, setSelectedKit] = useState(null);
  const [error, setError] = useState("");

  const fetchUserKits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/admin/user-kits/all");
      setKits(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load user custom kits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserKits();
  }, [fetchUserKits]);

  const filteredKits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return kits.filter((kit) => {
      const matchesStatus =
        statusFilter === "all" ? true : (kit.status || "").toLowerCase() === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        kit.name,
        kit.user?.name,
        kit.user?.phone,
        ...(kit.items || []).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [kits, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const orderedKits = kits.filter((kit) => kit.status === "ordered").length;
    const draftKits = kits.filter((kit) => kit.status === "draft").length;
    const totalValue = kits.reduce((sum, kit) => sum + Number(kit.totalPrice || 0), 0);

    return {
      total: kits.length,
      ordered: orderedKits,
      draft: draftKits,
      totalValue,
    };
  }, [kits]);

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8B1E3F] dark:text-[#D4AF37]">User Custom Kits</p>
            <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Review the kits users build on their own</h2>
            <p className="mt-2 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/70">Track draft and ordered kits in one devotional commerce dashboard.</p>
          </div>

          <button
            type="button"
            onClick={fetchUserKits}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/75 px-4 text-sm font-semibold text-[#5a1a2b] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f6dfaf]"
          >
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#dbc7a8]/60 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
          <span className="text-xs uppercase tracking-[0.22em] text-[#8B1E3F] dark:text-[#D4AF37]">Total custom kits</span>
          <strong className="mt-2 block text-2xl font-bold">{stats.total}</strong>
        </article>
        <article className="rounded-2xl border border-[#dbc7a8]/60 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
          <span className="text-xs uppercase tracking-[0.22em] text-[#8B1E3F] dark:text-[#D4AF37]">Ordered kits</span>
          <strong className="mt-2 block text-2xl font-bold">{stats.ordered}</strong>
        </article>
        <article className="rounded-2xl border border-[#dbc7a8]/60 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
          <span className="text-xs uppercase tracking-[0.22em] text-[#8B1E3F] dark:text-[#D4AF37]">Draft kits</span>
          <strong className="mt-2 block text-2xl font-bold">{stats.draft}</strong>
        </article>
        <article className="rounded-2xl border border-[#dbc7a8]/60 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
          <span className="text-xs uppercase tracking-[0.22em] text-[#8B1E3F] dark:text-[#D4AF37]">Total kit value</span>
          <strong className="mt-2 block text-2xl font-bold">{formatCurrency(stats.totalValue)}</strong>
        </article>
      </section>

      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8B1E3F] dark:text-[#D4AF37]">Catalog</p>
            <h3 className="mt-1 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Custom kits from users</h3>
          </div>
          <span className="rounded-full bg-[#D4AF37]/18 px-3 py-1 text-xs font-semibold text-[#5a1a2b] dark:text-[#f6dfaf]">{filteredKits.length} visible</span>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="flex w-full items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[#8B1E3F] dark:text-[#D4AF37]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by user, item, email, phone, kit"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[#8c7461]"
              aria-label="Search user custom kits"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear kit search" className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]">
                <FiX />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 min-w-[160px] rounded-xl border border-[#d7c3a3] bg-white/70 px-3 text-sm outline-none dark:border-white/10 dark:bg-white/5"
          >
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white/70 p-8 text-sm dark:bg-white/5">Loading user custom kits...</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-100 p-8 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</div>
        ) : !filteredKits.length ? (
          <div className="rounded-2xl bg-white/70 p-8 text-sm dark:bg-white/5">
            {kits.length ? "No kits match the current filters." : "No custom user kits found."}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredKits.map((kit) => (
              <article key={kit._id} className="rounded-2xl border border-[#dcc7ab]/60 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-[#8B1E3F]/12 px-3 py-1 text-xs font-semibold uppercase text-[#8B1E3F] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">
                      {kit.status || "draft"}
                    </span>
                    <h4 className="mt-2 text-lg font-bold text-[#2f1618] dark:text-[#fff3dc]">{kit.name || "Custom kit"}</h4>
                  </div>
                  <strong className="text-lg font-bold">{formatCurrency(kit.totalPrice)}</strong>
                </div>

                <div className="mb-4 space-y-2 text-sm text-[#5f3a31] dark:text-[#ecd9bb]">
                  <div className="flex items-center gap-2"><FiUser /> {kit.user?.name || "Unnamed user"}</div>
                  <div className="flex items-center gap-2"><FiPhone /> {kit.user?.phone || "No phone"}</div>
                  <div className="flex items-center gap-2"><FiMail /> {kit.user?.email || "No email"}</div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white/70 p-2 dark:bg-white/5"><span>Total items</span><strong className="mt-1 block text-sm">{kit.totalItems || 0}</strong></div>
                  <div className="rounded-lg bg-white/70 p-2 dark:bg-white/5"><span>Products</span><strong className="mt-1 block text-sm">{kit.items?.length || 0}</strong></div>
                  <div className="rounded-lg bg-white/70 p-2 dark:bg-white/5"><span>Created</span><strong className="mt-1 block text-sm">{formatDate(kit.createdAt)}</strong></div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedKit(kit)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#8B1E3F,#D4AF37)] px-4 text-sm font-semibold text-white"
                >
                  <FiShoppingBag />
                  View details
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedKit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <section className="w-full max-w-4xl rounded-3xl border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.96),rgba(245,235,217,0.92))] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.95),rgba(18,8,10,0.98))]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#8B1E3F] dark:text-[#D4AF37]">Kit details</p>
                <h3 className="mt-1 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">{selectedKit.name || "Custom kit"}</h3>
              </div>
              <button type="button" onClick={() => setSelectedKit(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 dark:bg-white/5"><FiX /></button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-2">
              <section className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                <h4 className="mb-3 font-semibold">User info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><FiUser /> {selectedKit.user?.name || "Unnamed user"}</div>
                  <div className="flex items-center gap-2"><FiPhone /> {selectedKit.user?.phone || "No phone"}</div>
                  <div className="flex items-center gap-2"><FiMail /> {selectedKit.user?.email || "No email"}</div>
                  <div className="flex items-center gap-2"><FiPackage /> Status: {selectedKit.status || "draft"}</div>
                  <div className="flex items-center gap-2"><FiShoppingBag /> Created: {formatDate(selectedKit.createdAt)}</div>
                </div>
              </section>

              <section className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                <h4 className="mb-3 font-semibold">Kit overview</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <article className="rounded-lg bg-white/80 p-2 dark:bg-white/5"><span>Total price</span><strong className="mt-1 block text-sm">{formatCurrency(selectedKit.totalPrice)}</strong></article>
                  <article className="rounded-lg bg-white/80 p-2 dark:bg-white/5"><span>Total items</span><strong className="mt-1 block text-sm">{selectedKit.totalItems || 0}</strong></article>
                  <article className="rounded-lg bg-white/80 p-2 dark:bg-white/5"><span>Products</span><strong className="mt-1 block text-sm">{selectedKit.items?.length || 0}</strong></article>
                </div>
              </section>
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold">Items in this custom kit</h4>
                <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">{selectedKit.items?.length || 0} products</span>
              </div>

              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                {(selectedKit.items || []).map((item, index) => (
                  <article key={`${item.productId || item.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-white/70 p-3 dark:bg-white/5">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#8B1E3F]/12 text-sm font-bold text-[#8B1E3F] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">
                      {item.image ? (
                        <img src={formatImageUrl(item.image)} alt={item.name || "Kit item"} className="h-full w-full object-cover" />
                      ) : (
                        <span>{item.name?.charAt(0)?.toUpperCase() || "K"}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h5 className="truncate font-semibold">{item.name || "Kit item"}</h5>
                      <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">{formatCurrency(item.price)} each</p>
                    </div>

                    <div className="text-right text-xs">
                      <strong className="block">Qty {item.quantity || 1}</strong>
                      <span>{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
