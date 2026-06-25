import { Link, useNavigate } from "react-router-dom";
import { clearAuth, getStoredUser, isAdminUser } from "../api";

export default function AppLayout({ children, title, subtitle }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div>
          <div className="title-row">
            <h1>{title}</h1>
            {isAdmin && <span className="admin-badge">Admin</span>}
            {!isAdmin && <span className="sales-badge">Sales</span>}
          </div>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        <div className="header-actions">
          <nav className="app-nav">
            <Link to="/dashboard">Dashboard</Link>
            {isAdmin ? (
              <Link to="/admin/catalog">Catalog</Link>
            ) : (
              <>
                <Link to="/inquiry">New Inquiry</Link>
                <Link to="/inquiries/approved">Approved</Link>
                <Link to="/inquiries/successful">Successful</Link>
                <Link to="/inquiries/failed">Failed</Link>
              </>
            )}
          </nav>
          <button className="btn-secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
