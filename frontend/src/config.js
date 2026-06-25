let runtimeApiUrl = null;

export function getApiBase() {
  const buildTimeUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (buildTimeUrl) return buildTimeUrl;
  if (runtimeApiUrl) return runtimeApiUrl;
  return "";
}

export async function loadRuntimeConfig() {
  if (import.meta.env.VITE_API_URL) return;

  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return;
    const config = await response.json();
    runtimeApiUrl = (config.apiUrl || "").trim().replace(/\/$/, "");
  } catch {
    // Ignore — build-time env is preferred.
  }
}
