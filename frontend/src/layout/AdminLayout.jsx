import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "./AdminLayout.css";

export default function AdminLayout() {
  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <Sidebar />

      {/* Right side */}
      <div className="admin-layout__shell">

        {/* Top Navbar */}
        <Navbar />

        {/* Page content */}
        <main className="admin-layout__content content-scroll">
          <Outlet />
        </main>

      </div>
    </div>
  );
}