import { Routes, Route } from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";

// Example pages
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Orders from "./pages/Orders";
import Items from "./pages/Items";
import Kits from "./pages/Kits";
import Pandits from "./pages/Pandits";
import PanditBookings from "./pages/PanditBookings";
import Rituals from "./pages/Rituals";
import Temples from "./pages/Temples";


function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<AdminLogin />} />

      {/* Protected Routes with Layout */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        {/* Nested Routes */}
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="orders" element={<Orders />} />
        <Route path="items" element={<Items />} />
        <Route path="kits" element={<Kits />} />
        <Route path="pandits" element={<Pandits />} />
        <Route path="rituals" element={<Rituals />} />
        <Route path="Temples" element={<Temples />} />
        <Route path="pandit-bookings" element={<PanditBookings />} />
      </Route>
    </Routes>
  );
}

export default App;
