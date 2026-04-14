import { Routes, Route } from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";

// Example pages
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Orders from "./pages/Orders";
import Items from "./pages/Items";
import SpecialKit from "./pages/SpecialKit";
import UserKit from "./pages/UserKit";


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
        <Route path="special-kit" element={<SpecialKit />} />
        <Route path="user-kits" element={<UserKit />} />
      </Route>
    </Routes>
  );
}

export default App;
