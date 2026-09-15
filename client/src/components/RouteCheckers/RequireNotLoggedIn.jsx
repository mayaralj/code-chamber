// Imports
import { Navigate, Outlet, useLocation } from "react-router";
import useStableSession from "../../hooks/useStableSession";
import toast from "react-hot-toast";

const RequireNotLoggedIn = () => {
  const { session, isPending, error, persistentError } = useStableSession();
  const location = useLocation();

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

  if (session?.user) {
    toast.error("You are already logged in. Redirecting to your profile.");
    return (
      <Navigate to="/profile" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
};

export default RequireNotLoggedIn;
