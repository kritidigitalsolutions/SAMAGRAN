import { useCallback, useEffect, useMemo, useState } from "react";
import { FiMail, FiPackage, FiPhone, FiRefreshCw, FiSearch, FiShoppingBag, FiUser, FiX } from "react-icons/fi";
import API from "../api/axios";
import "./UserKit.css";

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
        kit.user?.email,
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
    <div className="user-kit-page">
      <section className="user-kit-hero">
        <div>
          <p className="user-kit-eyebrow">User Custom Kits</p>
          <h2>Review the kits users build on their own</h2>
          <p>Only custom user kits are shown here, excluding template-based kits and empty drafts.</p>
        </div>

        <button type="button" onClick={fetchUserKits}>
          <FiRefreshCw />
          Refresh
        </button>
      </section>

      <section className="user-kit-stats">
        <article>
          <span>Total custom kits</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Ordered kits</span>
          <strong>{stats.ordered}</strong>
        </article>
        <article>
          <span>Draft kits</span>
          <strong>{stats.draft}</strong>
        </article>
        <article>
          <span>Total kit value</span>
          <strong>{formatCurrency(stats.totalValue)}</strong>
        </article>
      </section>

      <section className="user-kit-panel">
        <div className="user-kit-panel-head">
          <div>
            <p className="user-kit-eyebrow">Catalog</p>
            <h3>Custom kits from users</h3>
          </div>

          <span>{filteredKits.length} visible</span>
        </div>

        <div className="user-kit-filters">
          <div className="user-kit-search">
            <FiSearch />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by user, item, email, phone, kit"
              aria-label="Search user custom kits"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear kit search">
                <FiX />
              </button>
            )}
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
          </select>
        </div>

        {loading ? (
          <div className="user-kit-state">Loading user custom kits...</div>
        ) : error ? (
          <div className="user-kit-state user-kit-state--error">{error}</div>
        ) : !filteredKits.length ? (
          <div className="user-kit-state">
            {kits.length ? "No kits match the current filters." : "No custom user kits found."}
          </div>
        ) : (
          <div className="user-kit-cards">
            {filteredKits.map((kit) => (
              <article className="user-kit-card" key={kit._id}>
                <div className="user-kit-card-top">
                  <div>
                    <span className="user-kit-badge">{kit.status || "draft"}</span>
                    <h4>{kit.name || "Custom kit"}</h4>
                  </div>
                  <strong>{formatCurrency(kit.totalPrice)}</strong>
                </div>

                <div className="user-kit-card-meta">
                  <span><FiUser /> {kit.user?.name || "Unnamed user"}</span>
                  <span><FiPhone /> {kit.user?.phone || "No phone"}</span>
                  <span><FiMail /> {kit.user?.email || "No email"}</span>
                </div>

                <div className="user-kit-card-summary">
                  <div>
                    <small>Total items</small>
                    <strong>{kit.totalItems || 0}</strong>
                  </div>
                  <div>
                    <small>Products</small>
                    <strong>{kit.items?.length || 0}</strong>
                  </div>
                  <div>
                    <small>Created</small>
                    <strong>{formatDate(kit.createdAt)}</strong>
                  </div>
                </div>

                <div className="user-kit-chip-list">
                  {(kit.items || []).slice(0, 4).map((item) => (
                    <span key={`${kit._id}-${item.productId}`}>{item.name} x{item.quantity}</span>
                  ))}
                  {(kit.items?.length || 0) > 4 && <span>+{kit.items.length - 4} more</span>}
                </div>

                <button type="button" className="user-kit-view-btn" onClick={() => setSelectedKit(kit)}>
                  <FiShoppingBag />
                  View details
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedKit && (
        <div className="user-kit-modal-backdrop" role="presentation">
          <section className="user-kit-modal" aria-label={`${selectedKit.name || "Custom kit"} details`}>
            <div className="user-kit-modal-head">
              <div>
                <p className="user-kit-eyebrow">Kit details</p>
                <h3>{selectedKit.name || "Custom kit"}</h3>
              </div>
              <button type="button" onClick={() => setSelectedKit(null)} className="user-kit-close-btn">
                <FiX />
              </button>
            </div>

            <div className="user-kit-modal-grid">
              <section className="user-kit-user-card">
                <h4>User info</h4>
                <div><FiUser /> <span>{selectedKit.user?.name || "Unnamed user"}</span></div>
                <div><FiPhone /> <span>{selectedKit.user?.phone || "No phone"}</span></div>
                <div><FiMail /> <span>{selectedKit.user?.email || "No email"}</span></div>
                <div><FiPackage /> <span>Status: {selectedKit.status || "draft"}</span></div>
                <div><FiShoppingBag /> <span>Created: {formatDate(selectedKit.createdAt)}</span></div>
              </section>

              <section className="user-kit-overview-card">
                <h4>Kit overview</h4>
                <div className="user-kit-overview-stats">
                  <article>
                    <span>Total price</span>
                    <strong>{formatCurrency(selectedKit.totalPrice)}</strong>
                  </article>
                  <article>
                    <span>Total items</span>
                    <strong>{selectedKit.totalItems || 0}</strong>
                  </article>
                  <article>
                    <span>Products</span>
                    <strong>{selectedKit.items?.length || 0}</strong>
                  </article>
                </div>
              </section>
            </div>

            <section className="user-kit-items-section">
              <div className="user-kit-items-head">
                <h4>Items in this custom kit</h4>
                <span>{selectedKit.items?.length || 0} products</span>
              </div>

              <div className="user-kit-items-list">
                {(selectedKit.items || []).map((item, index) => (
                  <article className="user-kit-item-card" key={`${item.productId || item.name}-${index}`}>
                    <div className="user-kit-item-image">
                      {item.image ? (
                        <img src={formatImageUrl(item.image)} alt={item.name || "Kit item"} />
                      ) : (
                        <span>{item.name?.charAt(0)?.toUpperCase() || "K"}</span>
                      )}
                    </div>

                    <div className="user-kit-item-content">
                      <h5>{item.name || "Kit item"}</h5>
                      <p>{formatCurrency(item.price)} each</p>
                    </div>

                    <div className="user-kit-item-side">
                      <strong>Qty {item.quantity || 1}</strong>
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


