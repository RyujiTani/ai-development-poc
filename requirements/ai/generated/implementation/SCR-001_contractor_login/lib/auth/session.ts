export function saveSession(userId: string, role: string, displayName: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("user_id", userId);
    sessionStorage.setItem("role", role);
    sessionStorage.setItem("display_name", displayName);
  }
}

export function getSession(): { userId: string | null; role: string | null; displayName: string | null } {
  if (typeof window !== "undefined") {
    return {
      userId: sessionStorage.getItem("user_id"),
      role: sessionStorage.getItem("role"),
      displayName: sessionStorage.getItem("display_name"),
    };
  }
  return { userId: null, role: null, displayName: null };
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("display_name");
  }
}
"}, {