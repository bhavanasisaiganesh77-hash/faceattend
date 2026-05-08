import type { Role } from "@/backend";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useGetMyProfile } from "@/hooks/useProfile";
import { useNavigate, useRouter } from "@tanstack/react-router";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetched,
  } = useGetMyProfile();
  const navigate = useNavigate();

  if (isInitializing || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-primary/50" />
        </div>
        <div className="space-y-2 w-48">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    void navigate({ to: "/login" });
    return null;
  }

  if (isFetched && !profile) {
    void navigate({ to: "/setup" });
    return null;
  }

  if (requiredRole && profile && profile.role !== requiredRole) {
    void navigate({ to: "/" });
    return null;
  }

  return <>{children}</>;
}
