// RequireUsername.jsx
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import useStableSession from "../../hooks/useStableSession";
import toast from "react-hot-toast";

const RequireUsername = () => {
  const { session, isPending, error, persistentError, suppressGuards } = useStableSession();
  const location = useLocation();

  const isLoggedIn = Boolean(session?.user);
  const hasUsername = Boolean(session?.user?.username);

  // Only logged-in users without a username need to be redirected guests are allowed since they get a server-generated username
  const shouldRedirect = !isPending && !error && isLoggedIn && !hasUsername;

  useEffect(() => {
    if (shouldRedirect && !suppressGuards) {
      toast.error(
        "You need a username to access this page. Redirecting to choose username.",
      );
    }
  }, [shouldRedirect, suppressGuards]);

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

  if (shouldRedirect && !suppressGuards) {
    return (
      <Navigate
        to="/choose-username"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
};

export default RequireUsername;
