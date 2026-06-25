const API_BASE = import.meta.env.VITE_API_URL || "";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === "undefined" || token === "null") {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    return user && typeof user === "object" ? user : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function isSalesUser(user = getStoredUser()) {
  return user?.role === "sales" || user?.role === "user";
}

export function isAdminUser(user = getStoredUser()) {
  return user?.role === "admin";
}

export function saveAuth(token, user) {
  if (!token || !user) {
    throw new Error("Invalid login response from server");
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  } else if (!API_BASE && path.startsWith("/api")) {
    throw new Error(
      "API is not configured. Set VITE_API_URL on the frontend service and redeploy."
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export function login(email, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchDashboard() {
  return apiRequest("/api/dashboard");
}

export function fetchAdminUsers() {
  return apiRequest("/api/admin/users");
}

export function fetchUserCategories() {
  return apiRequest("/api/admin/user-categories");
}

export function createUser(user) {
  return apiRequest("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function fetchProducts() {
  return apiRequest("/api/products");
}

export function createProduct(product) {
  return apiRequest("/api/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id) {
  return apiRequest(`/api/products/${id}`, { method: "DELETE" });
}

export function fetchMachines() {
  return apiRequest("/api/machines");
}

export function createMachine(machine) {
  return apiRequest("/api/machines", {
    method: "POST",
    body: JSON.stringify(machine),
  });
}

export function deleteMachine(id) {
  return apiRequest(`/api/machines/${id}`, { method: "DELETE" });
}

export function createInquiry(payload) {
  return apiRequest("/api/inquiries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchInquiries(view) {
  return apiRequest(`/api/inquiries?view=${view}`);
}

export function updateInquiryOutcome(inquiryId, outcome, reason = "") {
  return apiRequest(`/api/inquiries/${inquiryId}/outcome`, {
    method: "PATCH",
    body: JSON.stringify({ outcome, reason }),
  });
}
