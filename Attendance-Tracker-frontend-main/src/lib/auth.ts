export const ADMIN_EMAIL = "admin@attendance.local";
export const ADMIN_PASSWORD = "admin123";

export function validateAdminCredentials(
  email: string,
  password: string
): boolean {
  return (
    email === ADMIN_EMAIL &&
    password === ADMIN_PASSWORD
  );
}

export function createMockToken(): string {
  return `admin-token-${Date.now()}`;
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("admin-token", token);
  }
}

export function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("admin-token");
  }
  return null;
}

export function isTokenValid(token: string | null): boolean {
  return !!token && token.startsWith("admin-token");
}

export function clearStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin-token");
  }
}