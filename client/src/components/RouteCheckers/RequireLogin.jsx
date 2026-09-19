// RequireLogin.jsx
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import useStableSession from "../../hooks/useStableSession";
import toast from "react-hot-toast";

const RequireLogin = () => {
  const { session, isPending, error, persistentError } = useStableSession();
  const location = useLocation();

  const shouldRedirect = !isPending && !error && !session?.user;

  useEffect(() => {
    if (shouldRedirect) {
      toast.error(
        "You must be logged in to access this page. Redirecting to login.",
      );
    }
  }, [shouldRedirect]);

  if (isPending) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        LOADING...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        {persistentError
          ? "SESSION ERROR — STILL TRYING..."
          : "SESSION ERROR — RETRYING..."}
      </main>
    );
  }

  if (shouldRedirect) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireLogin;
