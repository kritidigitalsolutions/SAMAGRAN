import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import "./Users.css";
import { FiEye, FiSearch, FiX } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const formatImageUrl = (path) => {
  if (!path) {
    return "";
  }

  if (typeof path !== "string") {
    return "";
  }

  const normalizedPath = path.trim();

  if (!normalizedPath) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const cleanPath = normalizedPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^backend\//i, "");
  const uploadPath = cleanPath.includes("/")
    ? cleanPath
    : `uploads/${cleanPath}`;

  return encodeURI(`${apiOrigin}/${uploadPath}`);
};

const getProfileImage = (user = {}) => {
  const image =
    user.profileImage ||
    user.profilePicture ||
    user.profilePic ||
    user.avatar ||
    user.photo ||
    user.image ||
    user.profile?.image ||
    "";

  if (typeof image === "string") {
    return image;
  }

  return image?.url || image?.path || image?.src || "";
};

const getInitials = (user = {}) => {
  const name = user.name || user.email || user.phone || "User";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

function UserAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const profileImage = getProfileImage(user);
  const imageUrl = formatImageUrl(profileImage);

  useEffect(() => {
    setImageFailed(false);
  }, [profileImage, user?._id]);

  if (imageUrl && !imageFailed) {
    return (
      <div className="user-profile-avatar-wrap">
        <img
          className="user-profile-avatar"
          src={imageUrl}
          alt={`${user?.name || "User"} profile`}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="user-profile-avatar-wrap">
      <div className="user-profile-avatar user-profile-avatar--fallback">
        {getInitials(user)}
      </div>
      <span className="user-profile-avatar-note">
        {profileImage ? "Image unavailable" : "No profile image"}
      </span>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  // 🔥 Fetch users
  const fetchUsers = useCallback(async (searchValue = "") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/user/all", {
        params: searchValue.trim() ? { search: searchValue.trim() } : {},
      });

      setUsers(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(() => {
      fetchUsers(searchTerm);
    }, 350);

    return () => clearTimeout(searchTimer);
  }, [fetchUsers, searchTerm]);

  // 🔴 DELETE USER
 const handleDelete = async (id) => {
  try {
    if (!window.confirm("Delete this user?")) return;

    await API.delete(`/user/${id}`);

    // update UI instantly
    setUsers((prev) => prev.filter((u) => u._id !== id));
  } catch (err) {
    console.error(err);
  }
};



  // 🔵 VIEW USER
 const handleView = (userId) => {
  const user = users.find((currentUser) => currentUser._id === userId);
  setSelectedUser(user || null);
};

  return (
    <div className="users-page">
      <section className="users-page__panel">
        <h2>Customer Overview</h2>
      </section>

      <section className="users-page__panel">
        <div className="users-toolbar">
          <div>
            <p className="users-page__eyebrow">Customers</p>
            <h3>All Users</h3>
          </div>

          <div className="users-search">
            <FiSearch />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, phone, email, address"
              aria-label="Search users"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear user search"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="users-table-state">Loading users...</p>
        ) : error ? (
          <p className="users-table-state users-table-state--error">{error}</p>
        ) : !users.length ? (
          <p className="users-table-state">
            {searchTerm ? "No users match your search." : "No users found."}
          </p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name || "N/A"}</td>
                  <td>{user.phone}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.address || "-"}</td>

                  <td className="actions">
  <button onClick={() => handleView(user._id)}>
    <FiEye />
  </button>

  <button
    onClick={() => handleDelete(user._id)}
  >
    <MdDelete />
  </button>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {selectedUser && (
  <div className="modal-overlay">
    <div className="modal">

      <div className="modal-header">
        <h2>User Details</h2>
        <button onClick={() => setSelectedUser(null)}>✕</button>
      </div>

  <div className="modal-body">
  <div className="user-profile-card">
    <UserAvatar key={selectedUser._id} user={selectedUser} />
    <div>
      <p>{selectedUser.name || "Unnamed User"}</p>
      <span>{selectedUser.isProfileComplete ? "Profile complete" : "Profile pending"}</span>
    </div>
  </div>

  <div className="user-row">
    <span className="label">Name</span>
    <span className="value">{selectedUser.name || "N/A"}</span>
  </div>

  <div className="user-row">
    <span className="label">Phone</span>
    <span className="value">{selectedUser.phone || "-"}</span>
  </div>

  <div className="user-row">
    <span className="label">Email</span>
    <span className="value">{selectedUser.email || "-"}</span>
  </div>

  <div className="user-row">
    <span className="label">Address</span>
    <span className="value">{selectedUser.address || "-"}</span>
  </div>
</div>

    </div>
  </div>
)}
    </div>
  );
}


