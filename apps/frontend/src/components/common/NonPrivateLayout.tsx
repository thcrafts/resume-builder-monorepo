import * as React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "./AuthContext";

const NonPrivateLayout: React.FC = () => {
  const { token } = useAuth();
  return token ? (
    <Navigate to="/resumes" replace />
  ) : (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 text-foreground">
      <Outlet />
    </div>
  );
};

export default NonPrivateLayout;
