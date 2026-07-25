// RequireLogin.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import authClient from "../authClient";

const RequireLogin = () => {
  const [status, setStatus] = useState("loading");
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const { data: session, error } = await authClient.getSession();

      if (cancelled) return;

      if (error) {
        console.error("Session check failed:", error);
        setStatus("loggedOut");
        return;
      }

      setStatus(session?.user ? "loggedIn" : "loggedOut");
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <main className="bg-gray-800 min-h-screen flex items-center justify-center">
        <h1 className="text-3xl text-white font-bold">Loading...</h1>
      </main>
    );
  }

  if (status === "loggedOut") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireLogin;
