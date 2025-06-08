import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import "./index.css";
import App from "./ChatStreaming";
import { AuthUI } from "./components/auth-ui";
import { LandingPage } from "./components/LandingPage";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function AppRouter() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Show loading screen while authentication state is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Clean route structure with single-source-of-truth authentication checks
  return (
    <Routes>
      <Route
        path="/signin"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthUI />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <LandingPage /> : <Navigate to="/signin" replace />}
      />
      <Route
        path="/chat"
        element={isAuthenticated ? <App /> : <Navigate to="/signin" replace />}
      />
      <Route
        path="/chat/:chatId"
        element={isAuthenticated ? <App /> : <Navigate to="/signin" replace />}
      />
      {/* Catch-all route - redirect to appropriate page based on auth status */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/" : "/signin"} replace />}
      />
    </Routes>
  );
}

function AppWithAuth() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      {/* 
        ConvexQueryCacheProvider provides intelligent caching across the entire app:
        - Eliminates redundant queries when switching between pages
        - Caches thread lists, messages, and user data
        - Automatically invalidates cache when data changes
        - Provides instant navigation between chats without loading states
      */}
      <ConvexQueryCacheProvider>
        <AppWithAuth />
      </ConvexQueryCacheProvider>
    </ConvexAuthProvider>
  </StrictMode>
);
