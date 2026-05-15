import { Routes, Route } from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";
import DeliveryRoute from "./routes/DeliveryRoute";

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
import Banner from "./pages/Banner";
import Coupons from "./pages/Coupons";
import Offers from "./pages/Offers";
import Legal from "./pages/Legal";
import CustomSamagri from "./pages/CustomSamagri";
import Notifications from "./pages/Notifications";
import DeliveryBoys from "./pages/DeliveryBoys";
import DeliveryLogin from "./pages/DeliveryLogin";
import DeliveryDashboard from "./pages/DeliveryDashboard";


function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<AdminLogin />} />
      <Route path="/delivery/login" element={<DeliveryLogin />} />
      <Route
        path="/delivery"
        element={
          <DeliveryRoute>
            <DeliveryDashboard />
          </DeliveryRoute>
        }
      />

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
        <Route path="banners" element={<Banner />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="offers" element={<Offers />} />
        <Route path="legal" element={<Legal />} />
        <Route path="custom-samagri" element={<CustomSamagri />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="delivery-boys" element={<DeliveryBoys />} />
      </Route>
    </Routes>
  );
}

export default App;
