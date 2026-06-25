import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import {
  createUser,
  fetchAdminUsers,
  fetchDashboard,
  fetchUserCategories,
} from "../api";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "sales",
};

export default function Dashboard() {
  const [message, setMessage] = useState("Loading...");
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([{ id: "sales", label: "Sales" }]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [error, setError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  async function loadUsers() {
    const adminData = await fetchAdminUsers();
    setUsers(adminData.users);
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDashboard();
        setMessage(data.message);
        setIsAdmin(data.isAdmin);

        if (data.isAdmin) {
          await loadUsers();
          const categoryData = await fetchUserCategories();
          setCategories(categoryData.categories);
        }
      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, []);

  async function handleCreateUser(e) {
    e.preventDefault();
    setError("");
    setUserSuccess("");
    setCreatingUser(true);

    try {
      await createUser(userForm);
      setUserForm(emptyUserForm);
      setUserSuccess("User created successfully.");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  return (
    <AppLayout title="Dashboard" subtitle="Your account overview">
      {error && <p className="error banner-error">{error}</p>}
      {userSuccess && <p className="success banner-success">{userSuccess}</p>}

      <section className="card welcome-card">
        <h2>{message}</h2>
        <p>
          {isAdmin
            ? "Manage the catalog, create sales users, and oversee the platform."
            : "Generate client inquiries with machine selection, MOQ, and selling prices."}
        </p>
        {isAdmin ? (
          <Link to="/admin/catalog" className="text-link">
            Manage Catalog →
          </Link>
        ) : (
          <div className="dashboard-links">
            <Link to="/inquiry" className="text-link">
              New Inquiry →
            </Link>
            <Link to="/inquiries/approved" className="text-link">
              Approved Inquiries →
            </Link>
            <Link to="/inquiries/successful" className="text-link">
              Successful Closed Clients →
            </Link>
            <Link to="/inquiries/failed" className="text-link">
              Failed Leads →
            </Link>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="card admin-panel">
          <h2>Create User</h2>
          <p className="admin-panel-desc">
            Add a new sales team member. Public registration is disabled.
          </p>

          <form className="user-form" onSubmit={handleCreateUser}>
            <label>
              Name
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Full name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="user@company.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </label>

            <label>
              Category
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create user"}
            </button>
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="card admin-panel">
          <h2>All Users</h2>
          <ul className="user-list">
            {users.map((siteUser) => (
              <li key={siteUser.id}>
                <div>
                  <strong>{siteUser.name}</strong>
                  <span className="user-email">{siteUser.email}</span>
                </div>
                <span
                  className={
                    siteUser.role === "admin" ? "role-badge admin" : "role-badge sales"
                  }
                >
                  {siteUser.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppLayout>
  );
}
