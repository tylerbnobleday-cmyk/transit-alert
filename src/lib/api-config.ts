/**
 * API Configuration
 * Manages the base URL for backend API requests.
 * Supports both development (local) and production (GitHub Pages + Render backend) environments.
 */

export function getApiBaseUrl(): string {
  // Check for explicit backend URL in environment
  const envBackendUrl = import.meta.env.VITE_API_BASE_URL;
  if (envBackendUrl) {
    return envBackendUrl.endsWith("/") ? envBackendUrl.slice(0, -1) : envBackendUrl;
  }

  // Development: Check if local backend is available
  if (import.meta.env.DEV) {
    // Default to localhost:3000 for development
    const devBackend = "http://localhost:3000";
    return devBackend;
  }

  // When the app is hosted directly from this PC or a custom host,
  // prefer same-origin API calls so the bundled frontend can talk to
  // the local Node server without extra env configuration.
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    const isGithubPagesHost = hostname.endsWith(".github.io");
    const isRenderHost = hostname.endsWith(".onrender.com");

    if (!isGithubPagesHost && !isRenderHost) {
      return window.location.origin;
    }
  }

  // Production: Use Render backend URL
  // This should be set as VITE_API_BASE_URL environment variable
  // during GitHub Actions build
  const prodBackend = "https://transit-alert.onrender.com";
  return prodBackend;
}

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
