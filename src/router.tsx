import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes } from "react-router";
import App from "@/App";
import { useAppStore } from "@/store";
import { Welcome } from "@/views/welcome";

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <main className="loading-screen" aria-live="polite">
      <span className="loading-mark" aria-hidden="true" />
      <p>{t("status.loading")}</p>
    </main>
  );
}

function ProtectedDashboard() {
  const authStatus = useAppStore((state) => state.authStatus);
  if (authStatus === "idle" || authStatus === "initializing") {
    return <LoadingScreen />;
  }
  if (authStatus === "anonymous") {
    return <Navigate to="/welcome" replace />;
  }
  return <App />;
}

function PublicWelcome() {
  const authStatus = useAppStore((state) => state.authStatus);
  if (authStatus === "idle" || authStatus === "initializing") {
    return <LoadingScreen />;
  }
  if (authStatus === "authenticated") {
    return <Navigate to="/" replace />;
  }
  return <Welcome />;
}

export function AppRouter() {
  const initialize = useAppStore((state) => state.initialize);
  const authStatus = useAppStore((state) => state.authStatus);

  useEffect(() => {
    if (authStatus === "idle") {
      void initialize();
    }
  }, [authStatus, initialize]);

  return (
    <Routes>
      <Route path="/" element={<ProtectedDashboard />} />
      <Route path="/welcome" element={<PublicWelcome />} />
      <Route
        path="*"
        element={
          <Navigate
            to={authStatus === "authenticated" ? "/" : "/welcome"}
            replace
          />
        }
      />
    </Routes>
  );
}
