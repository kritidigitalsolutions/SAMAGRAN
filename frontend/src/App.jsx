import { Routes, Route, Navigate } from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";
import DeliveryRoute from "./routes/DeliveryRoute";
import AccessRoute from "./routes/AccessRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Orders from "./pages/Orders";
import Items from "./pages/Items";
import Category from "./pages/Categories";
import CategoryCommission from "./pages/CategoryCommission";
import Brands from "./pages/Brands";
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
import Vendors from "./pages/admin/Vendors";
import VendorSettings from "./pages/VendorSettings";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import VendorDetails from "./pages/admin/VendorDetails";
import VendorCommissionReport from "./pages/admin/VendorCommissionReport";
import BookingPricing from "./pages/BookingPricing";
import Kits from "./pages/Kits";
import Invoices from "./pages/Invoices";
import DeliveryCharge from "./pages/DeliveryCharge";
import PanditEarnings from "./pages/PanditEarnings";

import { getHostRole } from "./utils/hostRouting";

function HostEntry() {
  const role = getHostRole();

  if (role === "vendor") {
    return <Navigate to="/vendor/login" replace />;
  }

  if (role === "delivery") {
    return <Navigate to="/delivery/login" replace />;
  }

  return <AdminLogin />;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HostEntry />} />
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
      <Route path="/vendor/login" element={<AdminLogin />} />

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
        <Route path="invoices" element={<AccessRoute pageKey="orders"><Invoices /></AccessRoute>} />
        <Route path="items" element={<AccessRoute pageKey="products"><Items /></AccessRoute>} />
        <Route path="category" element={<AccessRoute pageKey="category"><Category /></AccessRoute>} />
        <Route path="category-commission" element={<AccessRoute pageKey="category-commission"><CategoryCommission /></AccessRoute>} />
        <Route path="brands" element={<AccessRoute pageKey="brands"><Brands /></AccessRoute>} />
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
        <Route path="booking-pricing" element={<AccessRoute pageKey="booking-pricing"><BookingPricing /></AccessRoute>} />
        <Route path="settings" element={<AccessRoute pageKey="settings" vendorOnly={true}><VendorSettings /></AccessRoute>} />
        <Route path="super-settings" element={<AccessRoute pageKey="settings"><SuperAdminSettings /></AccessRoute>} />
        <Route path="delivery-boys" element={<AccessRoute pageKey="delivery-boys"><DeliveryBoys /></AccessRoute>} />
        <Route path="transactions" element={<AccessRoute pageKey="transactions"><Transactions /></AccessRoute>} />
        <Route path="earnings" element={<AccessRoute pageKey="earnings"><Earnings /></AccessRoute>} />
        <Route path="withdrawals" element={<AccessRoute pageKey="withdrawals"><Withdrawals /></AccessRoute>} />
        <Route path="refunds" element={<AccessRoute pageKey="refunds"><Refunds /></AccessRoute>} />
        <Route path="vendor-commission" element={<AccessRoute pageKey="vendor-commission"><VendorCommissionReport /></AccessRoute>} />
        <Route path="delivery-charges" element={<AccessRoute pageKey="delivery-charges" vendorOnly={true}><DeliveryCharge /></AccessRoute>} />
        <Route path="pandit-earnings" element={<AccessRoute pageKey="pandit-bookings"><PanditEarnings /></AccessRoute>} />
        <Route
          path="vendors"
          element={
            <AccessRoute pageKey="vendors">
              <Vendors />
            </AccessRoute>
          }
        />
        <Route
          path="vendors/:vendorId"
          element={
            <AccessRoute pageKey="vendors">
              <VendorDetails />
            </AccessRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
