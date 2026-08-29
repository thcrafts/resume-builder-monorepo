import * as React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "./AuthContext";
import { getProfile, type UserResponse } from "../../services/userService";
import {
  getAxiosErrorStatus,
  isTokenExpired,
} from "../../utils/authSession";
import { Button } from "../ui/button";
import { Alert, Spinner } from "../ui/misc";

export type ProtectedLayoutContext = {
  user: UserResponse;
};

type ProtectedLayoutProps = {
  requiredRole?: "admin" | "user";
};

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ requiredRole }) => {
  const { token, handleSessionExpired } = useAuth();
  const [user, setUser] = React.useState<UserResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      handleSessionExpired();
      return;
    }

    setLoading(true);
    setProfileError(null);

    try {
      const profile = await getProfile();
      setUser(profile);
    } catch (error: unknown) {
      if (getAxiosErrorStatus(error) === 401) {
        handleSessionExpired();
        return;
      }

      setUser(null);
      setProfileError("Unable to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, handleSessionExpired]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Alert variant="destructive" className="flex max-w-md items-center justify-between gap-4">
          <span>{profileError}</span>
          <Button variant="outline" size="sm" onClick={() => void loadProfile()}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (requiredRole === "admin" && user && user.role !== "admin") {
    return <Navigate to="/resumes" replace />;
  }

  if (requiredRole === "user" && user?.role === "admin") {
    return <Navigate to="/users" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet context={{ user } satisfies ProtectedLayoutContext} />;
};

export default ProtectedLayout;
