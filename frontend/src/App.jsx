import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, AdminRoute, SalesRoute, PublicRoute } from "./ProtectedRoute";
import CatalogManagement from "./pages/CatalogManagement";
import Dashboard from "./pages/Dashboard";
import InvestmentCalculator from "./pages/InvestmentCalculator";
import ApprovedInquiries from "./pages/ApprovedInquiries";
import SuccessfulClients from "./pages/SuccessfulClients";
import FailedLeads from "./pages/FailedLeads";
import Login from "./pages/Login";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/catalog" element={<CatalogManagement />} />
        </Route>

        <Route element={<SalesRoute />}>
          <Route path="/inquiry" element={<InvestmentCalculator />} />
          <Route path="/inquiries/approved" element={<ApprovedInquiries />} />
          <Route path="/inquiries/successful" element={<SuccessfulClients />} />
          <Route path="/inquiries/failed" element={<FailedLeads />} />
          <Route path="/calculator" element={<Navigate to="/inquiry" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
