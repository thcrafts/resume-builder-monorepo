import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AuthProvider from "./components/common/AuthContext";
import ThemeModeProvider, { useThemeMode } from "./components/common/ThemeContext";
import ToastPositionProvider, {
  useToastPosition,
} from "./components/common/ToastPositionContext";
import AdminLayout from "./components/common/AdminLayout";
import NonPrivateLayout from "./components/common/NonPrivateLayout";
import Login from "./pages/login";
import Register from "./pages/register";
import Users from "./pages/users";
import Resumes from "./pages/resumes";
import CreateResume from "./pages/resumes/CreateResume";
import LayoutWithoutHeader from "./components/common/LayoutWithoutHeader";
import NonAdminLayout from "./components/common/NonAdminLayout";
import { AiModelsProvider } from "./components/common/AiModelsContext";
import Profile from "./pages/profile";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      {
        element: <LayoutWithoutHeader />,
        children: [
          { path: "users", element: <Users /> },
        ],
      },
    ],
  },

  {
    path: "/",
    element: <NonAdminLayout />,
    children: [
      {
        element: <LayoutWithoutHeader />,
        children: [
          { path: "resumes", element: <Resumes /> },
          { path: "resumes/new", element: <CreateResume /> },
          { path: "fromjson", element: <Navigate to="/resumes/new?fromJson=1" replace /> },
          { path: "settings", element: <Profile /> },
        ],
      },
    ],
  },

  {
    path: "/",
    element: <NonPrivateLayout />,
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
    ],
  },

  { path: "*", element: <Navigate to="/resumes" replace /> },
]);

const AppContent: React.FC = () => {
  const { mode } = useThemeMode();
  const { position } = useToastPosition();

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer
        key={position}
        position={position}
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={mode}
      />
    </>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeModeProvider>
        <ToastPositionProvider>
          <AiModelsProvider>
            <AppContent />
          </AiModelsProvider>
        </ToastPositionProvider>
      </ThemeModeProvider>
    </AuthProvider>
  </StrictMode>
);
