import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import { Wallet } from "lucide-react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-canvas">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-ink">
          <Wallet className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm font-medium text-ink/60">Loading ExpenseMate…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
