import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import TableMenuPopover from "../components/TableMenuPopover";
import {
  FiEdit2,
  FiEye,
  FiMoreVertical,
  FiPackage,
  FiSearch,
  FiShoppingCart,
  FiSlash,
  FiUnlock,
  FiX,
} from "react-icons/fi";
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
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl admin-btn-primary text-lg font-bold text-white">
      {getInitials(user)}
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState([]);
  const [selectedUserCart, setSelectedUserCart] = useState([]);
  const [ordersModalUser, setOrdersModalUser] = useState(null);
  const [cartModalUser, setCartModalUser] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    profileImage: "",
    isProfileComplete: false,
  });
  const [editProfileImageFile, setEditProfileImageFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingBlockId, setTogglingBlockId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUserOrderIds, setSelectedUserOrderIds] = useState([]);
  const [selectedUserCartIds, setSelectedUserCartIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);
  const [cartPage, setCartPage] = useState(1);
  const [cartPageSize, setCartPageSize] = useState(10);

  const normalizeAddressLine = (address = {}) => {
    return [address?.fullAddress, address?.city, address?.state, address?.pincode]
      .filter(Boolean)
      .join(", ");
  };

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  const pagedUserOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return selectedUserOrders.slice(start, start + ordersPageSize);
  }, [selectedUserOrders, ordersPage, ordersPageSize]);

  const pagedUserCart = useMemo(() => {
    const start = (cartPage - 1) * cartPageSize;
    return selectedUserCart.slice(start, start + cartPageSize);
  }, [selectedUserCart, cartPage, cartPageSize]);

  useEffect(() => {
    setPage(1);
  }, [users.length]);

  useEffect(() => {
    setOrdersPage(1);
  }, [selectedUserOrders.length, ordersModalUser?._id]);

  useEffect(() => {
    setCartPage(1);
  }, [selectedUserCart.length, cartModalUser?._id]);

  const handleEditImageFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setEditProfileImageFile(file);
  };


  const fetchUsers = useCallback(async (searchValue = "") => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("admin/user/all", {
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

  useEffect(() => {
    setSelectedUserOrderIds([]);
    setSelectedUserCartIds([]);
  }, [ordersModalUser, cartModalUser]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest("[data-user-menu], [data-table-menu-popover]")) {
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

  const handleDelete = async (id) => {
    try {
      if (!window.confirm("Delete this user?")) return;
      await API.delete(`admin/user/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setSuccess("User deleted successfully.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete user.");
    }
  };

  const handleView = async (userId) => {
    try {
      const res = await API.get(`admin/user/${userId}/details`);
      setSelectedUser(res.data?.data?.user || null);
      setSelectedUserOrders(res.data?.data?.orders || []);
      setSelectedUserCart(res.data?.data?.cart || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load user details.");
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      profileImage: getProfileImage(user) || "",
      isProfileComplete: Boolean(user?.isProfileComplete),
    });
    setError("");
    setSuccess("");
    setEditProfileImageFile(null);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditProfileImageFile(null);
  };

  const handleEditInput = (event) => {
    const { name, value, type, checked } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingUser?._id) return;

    try {
      setSavingEdit(true);
      const formData = new FormData();
      formData.append("name", editForm.name || "");
      formData.append("email", editForm.email || "");
      formData.append("phone", editForm.phone || "");
      formData.append("address", editForm.address || "");
      formData.append("profileImage", editForm.profileImage || "");
      formData.append("isProfileComplete", String(Boolean(editForm.isProfileComplete)));

      if (editProfileImageFile) {
        formData.append("profileImageFile", editProfileImageFile);
      }

      const res = await API.patch(`admin/user/${editingUser._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const updated = res.data?.data;

      setUsers((current) =>
        current.map((user) => (user._id === editingUser._id ? { ...user, ...updated } : user))
      );

      if (selectedUser?._id === editingUser._id) {
        setSelectedUser((current) => ({ ...current, ...updated }));
      }

      setSuccess("User updated successfully.");
      setError("");
      closeEdit();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update user.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleBlock = async (user) => {
    if (!user?._id) return;

    try {
      setTogglingBlockId(user._id);
      const res = await API.patch(`admin/user/${user._id}/block`, {
        isBlocked: !Boolean(user.isBlocked),
      });

      const nextBlocked = Boolean(res.data?.data?.isBlocked);

      setUsers((current) =>
        current.map((entry) =>
          entry._id === user._id ? { ...entry, isBlocked: nextBlocked } : entry
        )
      );

      if (selectedUser?._id === user._id) {
        setSelectedUser((current) => ({ ...current, isBlocked: nextBlocked }));
      }

      setSuccess(nextBlocked ? "User blocked successfully." : "User unblocked successfully.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update block status.");
    } finally {
      setTogglingBlockId("");
    }
  };

  const handleViewOrders = async (user) => {
    if (!user?._id) return;

    try {
      setLoadingOrders(true);
      const res = await API.get(`admin/user/${user._id}/orders`);
      setSelectedUserOrders(res.data?.data || []);
      setOrdersModalUser(user);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load user orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleViewCart = async (user) => {
    if (!user?._id) return;

    try {
      setLoadingCart(true);
      const res = await API.get(`admin/user/${user._id}/cart`);
      setSelectedUserCart(res.data?.data || []);
      setCartModalUser(user);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load user cart.");
    } finally {
      setLoadingCart(false);
    }
  };

  const toggleUserSelection = (userId, checked) => {
    setSelectedUserIds((current) => {
      if (checked) {
        return current.includes(userId) ? current : [...current, userId];
      }
      return current.filter((id) => id !== userId);
    });
  };

  const toggleAllUsers = (checked) => {
    if (checked) {
      setSelectedUserIds(users.map((user) => user._id));
      return;
    }
    setSelectedUserIds([]);
  };

  const toggleAllUserOrders = (checked) => {
    if (checked) {
      setSelectedUserOrderIds(selectedUserOrders.map((order) => order._id));
      return;
    }
    setSelectedUserOrderIds([]);
  };

  const toggleUserOrderSelection = (orderId, checked) => {
    setSelectedUserOrderIds((current) => {
      if (checked) {
        return current.includes(orderId) ? current : [...current, orderId];
      }
      return current.filter((id) => id !== orderId);
    });
  };

  const toggleAllUserCartItems = (checked) => {
    if (checked) {
      setSelectedUserCartIds(selectedUserCart.map((item) => item._id));
      return;
    }
    setSelectedUserCartIds([]);
  };

  const toggleUserCartSelection = (cartId, checked) => {
    setSelectedUserCartIds((current) => {
      if (checked) {
        return current.includes(cartId) ? current : [...current, cartId];
      }
      return current.filter((id) => id !== cartId);
    });
  };

  const summary = useMemo(() => {
    const blocked = users.filter((user) => Boolean(user.isBlocked)).length;
    const completeProfiles = users.filter((user) => Boolean(user.isProfileComplete)).length;

    return {
      total: users.length,
      blocked,
      active: users.length - blocked,
      completeProfiles,
    };
  }, [users]);

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--admin-primary)]">Customers</p>
        <h2 className="mt-2 text-2xl font-bold text-[#2f1618] dark:text-[#fff3dc]">Customer Overview</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#8B1E3F]/10 px-3 py-1 font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">Total {summary.total}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">Active {summary.active}</span>
          <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-200">Blocked {summary.blocked}</span>
          <span className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">Complete Profiles {summary.completeProfiles}</span>
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
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--admin-primary)]">Directory</p>
            <h3 className="mt-1 text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">All Users</h3>
          </div>

          <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <FiSearch className="text-[var(--admin-primary)]" />
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
                className="grid h-8 w-8 place-items-center rounded-md bg-[#8B1E3F]/10 text-[#8B1E3F] dark:bg-[var(--admin-surface)] dark:text-[var(--admin-primary)]"
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
          <>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                  <th className="px-4 py-3 font-semibold text-center">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUserIds.length === users.length}
                      onChange={(event) => toggleAllUsers(event.target.checked)}
                      className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">S.No</th>
                  <th className="px-4 py-3 font-semibold">Image</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pagedUsers.map((user, index) => (
                  <tr key={user._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user._id)}
                        onChange={(event) => toggleUserSelection(user._id, event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3">
                      <UserAvatar key={user._id} user={user} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">{user.name || "Unnamed User"}</p>
                      <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">ID: {user._id}</p>
                    </td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">{user.email || "-"}</td>
                    <td className="px-4 py-3">{user.address || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                            user.isBlocked
                              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                          }`}
                        >
                          {user.isBlocked ? "Blocked" : "Active"}
                        </span>
                        <span className="w-fit rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                          {user.isProfileComplete ? "Profile Complete" : "Profile Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" data-user-menu>
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(event) => {
                            const nextId = openMenuId === user._id ? "" : user._id;
                            setOpenMenuId(nextId);
                            setMenuAnchorRect(nextId ? event.currentTarget.getBoundingClientRect() : null);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                          aria-label="User actions"
                        >
                          <FiMoreVertical />
                        </button>
                        {openMenuId === user._id && (
                          <TableMenuPopover
                            open
                            anchorRect={menuAnchorRect}
                            preferUp={index >= pagedUsers.length - 3}
                            onClose={() => setOpenMenuId("")}
                            className="w-48 overflow-hidden rounded-xl border border-[#d9c3a2] bg-white text-sm shadow-lg dark:border-white/10 dark:bg-[#1b1f27]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleView(user._id);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEye className="text-[#6f3945]" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                openEdit(user);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiEdit2 className="text-[#6f3945]" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleToggleBlock(user);
                              }}
                              disabled={togglingBlockId === user._id}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10 disabled:opacity-60"
                            >
                              {user.isBlocked ? <FiUnlock className="text-[#6f3945]" /> : <FiSlash className="text-[#6f3945]" />}
                              {user.isBlocked ? "Unblock" : "Block"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleViewOrders(user);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiPackage className="text-[#6f3945]" /> Orders
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleViewCart(user);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-[#8B1E3F]/10"
                            >
                              <FiShoppingCart className="text-[#6f3945]" /> Cart
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId("");
                                handleDelete(user._id);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-500/10"
                            >
                              <MdDelete className="text-red-600" /> Delete
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
              total={users.length}
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

      {selectedUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10 dark:bg-[var(--admin-surface)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#2f1618] dark:text-[#fff3dc]">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-2xl leading-none">&times;</button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/70 p-4 dark:bg-white/5">
              <UserAvatar key={selectedUser._id} user={selectedUser} />
              <div>
                <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">{selectedUser.name || "Unnamed User"}</p>
                <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">User ID: {selectedUser._id}</p>
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
              <div className="flex justify-between rounded-xl bg-white/60 px-4 py-3 dark:bg-white/5"><span>Status</span><span>{selectedUser.isBlocked ? "Blocked" : "Active"}</span></div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#d8c4a5] p-4 dark:border-white/10">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary)]">All Saved Addresses</h4>
              {Array.isArray(selectedUser.savedAddresses) && selectedUser.savedAddresses.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {selectedUser.savedAddresses.map((address) => (
                    <div key={address._id} className="rounded-xl bg-white/60 px-3 py-3 dark:bg-white/5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#8B1E3F]/10 px-2 py-0.5 text-xs font-semibold text-[#6c1b2f] dark:bg-[#D4AF37]/20 dark:text-[#f6dfaf]">
                          {address.addressType || "others"}
                        </span>
                        {address.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                            Default
                          </span>
                        )}
                        {address.label && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                            {address.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-medium">{address.name} ({address.phone})</p>
                      <p className="text-xs opacity-80">{normalizeAddressLine(address) || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-white/60 px-3 py-3 text-sm dark:bg-white/5">No saved addresses found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <form onSubmit={handleSaveEdit} className="w-full max-w-xl rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button type="button" onClick={closeEdit} className="text-2xl leading-none">&times;</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">User Id</label>
                <input value={editingUser._id} disabled className="h-10 w-full rounded-xl border border-[#d7c3a3] bg-white/50 px-3 text-sm dark:border-white/10 dark:bg-white/5" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Name</label>
                <input name="name" value={editForm.name} onChange={handleEditInput} className="h-10 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Phone</label>
                <input name="phone" value={editForm.phone} onChange={handleEditInput} className="h-10 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5" />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Email</label>
                <input name="email" value={editForm.email} onChange={handleEditInput} className="h-10 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5" />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Address</label>
                <input name="address" value={editForm.address} onChange={handleEditInput} className="h-10 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5" />
              </div>

              {/* <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Profile Image URL</label>
                <input name="profileImage" value={editForm.profileImage} onChange={handleEditInput} className="h-10 w-full rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5" />
              </div> */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Profile Image File</label>
                <input
                  name="profileImageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageFileChange}
                  className="w-full rounded-xl border border-[#d7c3a3] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                />
                {editProfileImageFile ? (
                  <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Selected: {editProfileImageFile.name}</p>
                ) : editForm.profileImage ? (
                  <p className="text-xs text-[#7c5b4b] dark:text-[#dbcdb8]/70">Current image will remain unchanged if no file is selected.</p>
                ) : null}
              </div>

              <label className="mt-1 inline-flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" name="isProfileComplete" checked={editForm.isProfileComplete} onChange={handleEditInput} />
                Profile Complete
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" disabled={savingEdit} className="admin-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow disabled:opacity-60">
                {savingEdit ? "Saving..." : "Save User"}
              </button>
              <button type="button" onClick={closeEdit} className="rounded-xl border border-[#d7bf9b] px-4 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {ordersModalUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">All Orders: {ordersModalUser.name || ordersModalUser.phone}</h3>
              <button onClick={() => setOrdersModalUser(null)} className="text-2xl leading-none">&times;</button>
            </div>

            {loadingOrders ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">Loading orders...</p>
            ) : selectedUserOrders.length === 0 ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">No orders found for this user.</p>
            ) : (
              <>
                <div className="admin-table-wrap overflow-x-auto">
                  <table className="admin-table min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                      <th className="px-4 py-3 font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedUserOrders.length > 0 && selectedUserOrderIds.length === selectedUserOrders.length}
                          onChange={(event) => toggleAllUserOrders(event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">S.No</th>
                      <th className="px-4 py-3 font-semibold">Order Id</th>
                      <th className="px-4 py-3 font-semibold">Items</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Order Status</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUserOrders.map((order, index) => (
                      <tr key={order._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUserOrderIds.includes(order._id)}
                            onChange={(event) => toggleUserOrderSelection(order._id, event.target.checked)}
                            className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(ordersPage - 1) * ordersPageSize + index + 1}</td>
                        <td className="px-4 py-3">{order._id}</td>
                        <td className="px-4 py-3">{order.itemCount || order.items?.length || 0}</td>
                        <td className="px-4 py-3">Rs {Number(order.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">{order.paymentMethod} / {order.paymentStatus}</td>
                        <td className="px-4 py-3">{order.orderStatus}</td>
                        <td className="px-4 py-3">{new Date(order.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <TablePagination
                  page={ordersPage}
                  pageSize={ordersPageSize}
                  total={selectedUserOrders.length}
                  onPageChange={setOrdersPage}
                  onPageSizeChange={(size) => {
                    setOrdersPageSize(size);
                    setOrdersPage(1);
                  }}
                  pageSizeOptions={[10]}
                />
              </>
            )}
          </div>
        </div>
      )}

      {cartModalUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-4xl rounded-3xl border border-[#dbc7a8]/60 bg-[var(--admin-surface)] p-6 shadow-[0_24px_70px_rgba(59,13,20,0.24)] dark:border-white/10">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Cart: {cartModalUser.name || cartModalUser.phone}</h3>
              <button onClick={() => setCartModalUser(null)} className="text-2xl leading-none">&times;</button>
            </div>

            {loadingCart ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">Loading cart...</p>
            ) : selectedUserCart.length === 0 ? (
              <p className="rounded-xl bg-white/60 p-5 text-sm dark:bg-white/5">No cart items found for this user.</p>
            ) : (
              <>
                <div className="admin-table-wrap overflow-x-auto">
                  <table className="admin-table min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                      <th className="px-4 py-3 font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedUserCart.length > 0 && selectedUserCartIds.length === selectedUserCart.length}
                          onChange={(event) => toggleAllUserCartItems(event.target.checked)}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">S.No</th>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Quantity</th>
                      <th className="px-4 py-3 font-semibold">Price At Add</th>
                      <th className="px-4 py-3 font-semibold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUserCart.map((item, index) => (
                      <tr key={item._id} className="border-b border-[#f0e3d1] align-top last:border-none dark:border-white/10">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUserCartIds.includes(item._id)}
                            onChange={(event) => toggleUserCartSelection(item._id, event.target.checked)}
                            className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#6f3945] dark:text-[#f7e3c0]">{(cartPage - 1) * cartPageSize + index + 1}</td>
                        <td className="px-4 py-3">{item.product?.title || item.product?.name || "-"}</td>
                        <td className="px-4 py-3">{item.productType || "-"}</td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3">Rs {Number(item.priceAtAdd || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">Rs {(Number(item.quantity || 0) * Number(item.priceAtAdd || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <TablePagination
                  page={cartPage}
                  pageSize={cartPageSize}
                  total={selectedUserCart.length}
                  onPageChange={setCartPage}
                  onPageSizeChange={(size) => {
                    setCartPageSize(size);
                    setCartPage(1);
                  }}
                  pageSizeOptions={[10]}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


