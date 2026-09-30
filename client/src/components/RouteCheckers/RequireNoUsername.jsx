// RequireNoUsername.jsx
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import useStableSession from "../../hooks/useStableSession";
import toast from "react-hot-toast";

const RequireNoUsername = () => {
  const { session, isPending, error, persistentError, suppressGuardRef } =
    useStableSession();
  const location = useLocation();

  const isLoggedIn = Boolean(session?.user);
  const hasUsername = Boolean(session?.user?.username?.trim());

  const shouldRedirectToLogin = !isPending && !error && !isLoggedIn;
  const shouldRedirectToProfile =
    !isPending && !error && isLoggedIn && hasUsername;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      toast.error("You must be logged in to choose a username.");
    }
  }, [shouldRedirectToLogin]);

  useEffect(() => {
    if (shouldRedirectToProfile && !suppressGuardRef.current) {
      toast.error("You already have a username. Redirecting to your profile.");
    }
  }, [shouldRedirectToProfile]);

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

  if (shouldRedirectToLogin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (shouldRedirectToProfile) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default RequireNoUsername;
