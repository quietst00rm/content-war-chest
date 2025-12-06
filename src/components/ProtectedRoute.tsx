import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

// TEMPORARY: Bypassing authentication for public demo mode
// To revert: restore from Lovable History to any point before this change
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
