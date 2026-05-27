// import { useEffect, useState } from "react";
// import { FiCheck, FiX, FiRefreshCw } from "react-icons/fi";
// import API from "../api/axios";

// export default function CustomSamagri() {
//   const [pendingItems, setPendingItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [reviewingId, setReviewingId] = useState("");
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const fetchPendingItems = async () => {
//     try {
//       setLoading(true);
//       setError("");
//       setSuccess("");
//       const res = await API.get("/admin/rituals/custom-samagri");
//       setPendingItems(res.data?.data || []);
//     } catch (err) {
//       setError(err.response?.data?.message || "Unable to load pending custom samagri.");
//       setPendingItems([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchPendingItems();
//   }, []);

//   const handleReview = async (panditId, ritualId, itemId, status) => {
//     try {
//       setReviewingId(`${panditId}-${itemId}`);
//       setError("");
//       setSuccess("");

//       await API.patch(`/admin/rituals/custom-samagri/${panditId}/${ritualId}/${itemId}`, {
//         approvalStatus: status,
//       });

//       setSuccess(`Custom samagri ${status} successfully.`);
//       await fetchPendingItems();
//     } catch (err) {
//       setError(err.response?.data?.message || `Unable to ${status} custom samagri.`);
//     } finally {
//       setReviewingId("");
//     }
//   };

//   return (
//     <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
//       <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
//         <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
//           <h2 className="text-2xl font-bold">Custom Samagri Approvals</h2>
//           <button
//             onClick={fetchPendingItems}
//             disabled={loading}
//             className="admin-btn-primary flex items-center gap-2 rounded-2xl border border-transparent px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
//           >
//             <FiRefreshCw size={18} />
//             Refresh
//           </button>
//         </div>

//         {error && (
//           <div className="mb-4 rounded-xl bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
//             {error}
//           </div>
//         )}
//         {success && (
//           <div className="mb-4 rounded-xl bg-green-100 p-4 text-green-800 dark:bg-green-900 dark:text-green-200">
//             {success}
//           </div>
//         )}

//         {loading ? (
//           <div className="py-12 text-center">Loading pending approvals...</div>
//         ) : pendingItems.length === 0 ? (
//           <div className="py-12 text-center text-gray-500 dark:text-gray-400">
//             No pending custom samagri items to review.
//           </div>
//         ) : (
//           <div className="space-y-6">
//             {pendingItems.map((group, groupIdx) => (
//               <div
//                 key={groupIdx}
//                 className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4"
//               >
//                 <div className="mb-4 border-b border-[var(--admin-border)] pb-3">
//                   <div className="grid gap-2 md:grid-cols-2">
//                     <div>
//                       <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Pandit</p>
//                       <p className="font-semibold">{group.panditName || "Unknown Pandit"}</p>
//                       <p className="text-xs text-gray-600 dark:text-gray-300">📱 {group.panditPhone}</p>
//                     </div>
//                     <div>
//                       <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ritual</p>
//                       <p className="font-semibold">{group.ritualName}</p>
//                       <p className="text-xs text-gray-600 dark:text-gray-300">ID: {group.ritualId}</p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="space-y-3">
//                   {Array.isArray(group.customSamagriNotes) && group.customSamagriNotes.length > 0 && (
//                     <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] p-3">
//                       <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
//                         Custom Samagri Notes
//                       </p>
//                       <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
//                         {group.customSamagriNotes.map((note, idx) => (
//                           <li key={`${group.panditId}-note-${idx}`} className="flex items-start gap-2">
//                             <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
//                             <span>{note}</span>
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   )}
//                   {(group.customSamagriItems || []).map((item) => (
//                     <div
//                       key={item._id}
//                       className="flex flex-col gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input)] p-3 md:flex-row md:items-center md:justify-between"
//                     >
//                       <div className="flex-1">
//                         <p className="font-medium">{item.itemName}</p>
//                         <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
//                           <span>📦 Qty: {item.quantity}</span>
//                           {item.size && <span>📏 Size: {item.size}</span>}
//                         </div>
//                       </div>

//                       <div className="flex gap-2">
//                         <button
//                           onClick={() =>
//                             handleReview(group.panditId, group.ritualId, item._id, "approved")
//                           }
//                           disabled={reviewingId === `${group.panditId}-${item._id}`}
//                           className="flex items-center gap-2 rounded-lg bg-green-600/20 px-3 py-2 font-medium text-green-600 transition-all hover:bg-green-600/30 disabled:opacity-50 dark:text-green-400"
//                           title="Approve this item"
//                         >
//                           <FiCheck size={16} />
//                           Approve
//                         </button>
//                         <button
//                           onClick={() =>
//                             handleReview(group.panditId, group.ritualId, item._id, "rejected")
//                           }
//                           disabled={reviewingId === `${group.panditId}-${item._id}`}
//                           className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 font-medium text-red-600 transition-all hover:bg-red-600/30 disabled:opacity-50 dark:text-red-400"
//                           title="Reject this item"
//                         >
//                           <FiX size={16} />
//                           Reject
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       <section className="rounded-3xl border border-[var(--admin-border)] bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6">
//         <h3 className="mb-3 font-bold text-blue-600 dark:text-blue-400">ℹ️ How It Works</h3>
//         <ul className="space-y-2 text-sm">
//           <li>• Pandits add custom samagri items for their rituals</li>
//           <li>• Items appear here automatically with "Pending" status</li>
//           <li>• Review each item and approve or reject</li>
//           <li>• Approval status is updated in real-time</li>
//           <li>• Use Refresh button to check for new pending items</li>
//         </ul>
//       </section>
//     </div>
//   );
// }
