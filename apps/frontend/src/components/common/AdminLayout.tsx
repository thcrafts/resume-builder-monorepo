import * as React from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { useAuth } from "./AuthContext";
import { Navigate, Outlet } from "react-router";
import { getProfile, type UserResponse } from "../../services/userService";
import {
  getAxiosErrorStatus,
  isTokenExpired,
} from "../../utils/authSession";
import type { ProtectedLayoutContext } from "./NonAdminLayout";

const AdminLayout: React.FC = () => {
  const { token, handleSessionExpired } = useAuth();
  const [user, setUser] = React.useState<UserResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [authInvalid, setAuthInvalid] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isTokenExpired(token)) {
      setAuthInvalid(true);
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
        setAuthInvalid(true);
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

  if (authInvalid) {
    return null;
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (profileError) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
          px: 2,
        }}
      >
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadProfile()}>
              Retry
            </Button>
          }
        >
          {profileError}
        </Alert>
      </Box>
    );
  }

  if (user && user.role !== "admin") {
    return <Navigate to="/resumes" replace />;
  }

  if (!user) {
    return null;
  }

  return <Outlet context={{ user } satisfies ProtectedLayoutContext} />;
};

export default AdminLayout;
