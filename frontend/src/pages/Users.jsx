import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import { FiEye, FiSearch, FiX } from "react-icons/fi";
import { MdDelete } from "react-icons/md";

const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const formatImageUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^backend\//i, "");
  const uploadPath = cleanPath.includes("/") ? cleanPath : `uploads/${cleanPath}`;

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
      <img
        className="h-16 w-16 rounded-2xl border border-[#D4AF37]/30 object-cover"
        src={imageUrl}
        alt={`${user?.name || "User"} profile`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8B1E3F,#D4AF37)] text-lg font-bold text-white">
      {getInitials(user)}
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async (searchValue = "") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/user/all", {
        params: searchValue.trim() ? { search: searchValue.trim() } : {},
      });

      setUsers(res.data?.data || []);
    } catch (err) {
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

  const handleDelete = async (id) => {
    try {
      if (!window.confirm("Delete this user?")) return;
      await API.delete(`/user/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleView = (userId) => {
    const user = users.find((currentUser) => currentUser._id === userId);
    setSelectedUser(user || null);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8B1E3F] dark:text-[#D4AF37]">Customers</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Customer Overview</h2>
      </section>

      <section className="rounded-[30px] border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.82),rgba(245,235,217,0.76))] p-6 shadow-[0_18px_60px_rgba(59,13,20,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.84),rgba(18,8,10,0.94))]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8B1E3F] dark:text-[#D4AF37]">Directory</p>
            <h3 className="mt-1 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">All Users</h3>
          </div>

          <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[#8B1E3F] dark:text-[#D4AF37]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, phone, email, address"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
              aria-label="Search users"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear user search"
                className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">Loading users...</p>
        ) : error ? (
          <p className="rounded-xl bg-red-100 p-6 text-sm font-medium text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>
        ) : !users.length ? (
          <p className="rounded-xl bg-white/60 p-6 text-sm dark:bg-white/5">
            {searchTerm ? "No users match your search." : "No users found."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#d8c4a5] dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#8B1E3F]/8 text-left text-[#5a1b2b] dark:bg-[#D4AF37]/10 dark:text-[#f6dfaf]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-[#e8d7bf] dark:border-white/10">
                    <td className="px-4 py-3 text-[#2f1618] dark:text-[#fff3dc]">{user.name || "N/A"}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">{user.email || "-"}</td>
                    <td className="px-4 py-3">{user.address || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(user._id)}
                          className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="grid h-9 w-9 place-items-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
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

      {selectedUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#dbc7a8]/60 bg-[linear-gradient(180deg,rgba(255,251,244,0.96),rgba(245,235,217,0.92))] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(59,13,20,0.95),rgba(18,8,10,0.98))]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-2xl leading-none">&times;</button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/70 p-4 dark:bg-white/5">
              <UserAvatar key={selectedUser._id} user={selectedUser} />
              <div>
                <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">{selectedUser.name || "Unnamed User"}</p>
                <span className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">
                  {selectedUser.isProfileComplete ? "Profile complete" : "Profile pending"}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span>Name</span><span>{selectedUser.name || "N/A"}</span></div>
              <div className="flex justify-between rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span>Phone</span><span>{selectedUser.phone || "-"}</span></div>
              <div className="flex justify-between rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span>Email</span><span>{selectedUser.email || "-"}</span></div>
              <div className="flex justify-between rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span>Address</span><span>{selectedUser.address || "-"}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
