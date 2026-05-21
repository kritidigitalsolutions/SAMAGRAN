import { Routes, Route } from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";
import DeliveryRoute from "./routes/DeliveryRoute";
import AccessRoute from "./routes/AccessRoute";

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
import Transactions from "./pages/Transactions";
import Earnings from "./pages/Earnings";
import Withdrawals from "./pages/Withdrawals";
import Refunds from "./pages/Refunds";
import DeliveryLogin from "./pages/DeliveryLogin";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import VendorSignup from "./pages/vendor/VendorSignup";
import Vendors from "./pages/admin/Vendors";
import VendorSettings from "./pages/VendorSettings";

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<AdminLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/delivery/login" element={<DeliveryLogin />} />
      <Route
        path="/delivery"
        element={
          <DeliveryRoute>
            <DeliveryDashboard />
          </DeliveryRoute>
        }
      />
      <Route path="/vendor/signup" element={<VendorSignup />} />

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
        <Route index element={<AccessRoute pageKey="dashboard"><Dashboard /></AccessRoute>} />
        <Route path="users" element={<AccessRoute pageKey="users"><Users /></AccessRoute>} />
        <Route path="orders" element={<AccessRoute pageKey="orders"><Orders /></AccessRoute>} />
        <Route path="items" element={<AccessRoute pageKey="products"><Items /></AccessRoute>} />
        <Route path="kits" element={<AccessRoute pageKey="kits"><Kits /></AccessRoute>} />
        <Route path="pandits" element={<AccessRoute pageKey="pandits"><Pandits /></AccessRoute>} />
        <Route path="rituals" element={<AccessRoute pageKey="rituals"><Rituals /></AccessRoute>} />
        <Route path="Temples" element={<AccessRoute pageKey="temples"><Temples /></AccessRoute>} />
        <Route path="pandit-bookings" element={<AccessRoute pageKey="pandit-bookings"><PanditBookings /></AccessRoute>} />
        <Route path="banners" element={<AccessRoute pageKey="banners"><Banner /></AccessRoute>} />
        <Route path="coupons" element={<AccessRoute pageKey="coupons"><Coupons /></AccessRoute>} />
        <Route path="offers" element={<AccessRoute pageKey="offers"><Offers /></AccessRoute>} />
        <Route path="legal" element={<AccessRoute pageKey="legal"><Legal /></AccessRoute>} />
        <Route path="custom-samagri" element={<AccessRoute pageKey="custom-samagri"><CustomSamagri /></AccessRoute>} />
        <Route path="notifications" element={<AccessRoute pageKey="notifications"><Notifications /></AccessRoute>} />
        <Route path="settings" element={<AccessRoute pageKey="settings"><VendorSettings /></AccessRoute>} />
        <Route path="delivery-boys" element={<AccessRoute pageKey="delivery-boys"><DeliveryBoys /></AccessRoute>} />
        <Route path="transactions" element={<AccessRoute pageKey="transactions"><Transactions /></AccessRoute>} />
        <Route path="earnings" element={<AccessRoute pageKey="earnings"><Earnings /></AccessRoute>} />
        <Route path="withdrawals" element={<AccessRoute pageKey="withdrawals"><Withdrawals /></AccessRoute>} />
        <Route path="refunds" element={<AccessRoute pageKey="refunds"><Refunds /></AccessRoute>} />
        <Route
          path="vendors"
          element={
            <AccessRoute pageKey="vendors">
              <Vendors />
            </AccessRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
