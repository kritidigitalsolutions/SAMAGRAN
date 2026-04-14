// import { useNavigate } from "react-router-dom";

// export default function Topbar() {
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     localStorage.removeItem("adminToken");
//     navigate("/", { replace: true });
//   };

//   return (
//     <header className="sticky top-0 z-20 border-b border-[#e6d7bd]/75 bg-[linear-gradient(180deg,rgba(255,248,238,0.95),rgba(248,238,222,0.92))] px-4 py-4 backdrop-blur-xl">
//       <div className="flex items-center justify-between gap-4">
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#9f3144]">
//             Admin Panel
//           </p>
//           <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#2f1618]">
//             Samagran Dashboard
//           </h1>
//         </div>

//         <button
//           type="button"
//           onClick={handleLogout}
//           className="rounded-xl bg-[#8B1E3F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f1732]"
//         >
//           Logout
//         </button>
//       </div>
//     </header>
//   );
// }
