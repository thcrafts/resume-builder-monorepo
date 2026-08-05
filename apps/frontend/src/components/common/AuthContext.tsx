import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { isTokenExpired } from "../../utils/authSession";
import {
  registerSessionExpiredHandler,
  resetSessionExpiredHandling,
} from "../../utils/sessionExpiredHandler";
import { clearStoredDateFilter } from "../../constants/resumeDateFilterStorage";

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  handleSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("access_token") ?? null
  );

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("access_token");
    clearStoredDateFilter();
    resetSessionExpiredHandling();
  }, []);

  const handleSessionExpired = useCallback(() => {
    logout();
    toast.error("Your session has expired. Please log in again.");
    window.location.replace("/login");
  }, [logout]);

  const login = (newToken: string) => {
    resetSessionExpiredHandling();
    setToken(newToken);
    localStorage.setItem("access_token", newToken);
  };

  useEffect(() => {
    registerSessionExpiredHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken && isTokenExpired(storedToken)) {
      handleSessionExpired();
    }
  }, [handleSessionExpired]);

  return (
    <AuthContext.Provider
      value={{ token, login, logout, handleSessionExpired }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)!;
export default AuthProvider;
