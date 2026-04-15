import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.14),_transparent_22%),radial-gradient(circle_at_right,_rgba(139,30,63,0.10),_transparent_24%),linear-gradient(180deg,#f9f3ea_0%,#f4ebdc_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.10),_transparent_20%),radial-gradient(circle_at_right,_rgba(139,30,63,0.10),_transparent_22%),linear-gradient(180deg,#14060a_0%,#0a0405_100%)]">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div
        className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
        }`}
      >
        <Navbar
          onMenuClick={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="content-scroll flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}