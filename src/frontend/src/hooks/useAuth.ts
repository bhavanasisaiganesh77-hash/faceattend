import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const {
    login,
    clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    identity,
    loginStatus,
  } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogin = () => {
    login();
  };

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  const currentPrincipal = identity?.getPrincipal();

  return {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    identity,
    loginStatus,
    currentPrincipal,
    login: handleLogin,
    logout: handleLogout,
  };
}
