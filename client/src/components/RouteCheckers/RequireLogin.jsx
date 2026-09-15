// RequireLogin.jsx
import { Navigate, Outlet, useLocation } from "react-router";
import useStableSession from "../../hooks/useStableSession";
import toast from "react-hot-toast";

const RequireLogin = () => {
  const { session, isPending, error } = useStableSession();
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
        "SESSION ERROR — PLEASE LOG IN AGAIN"
      </main>
    );
  }

  if (!session?.user) {
    toast.error(
      "You must be logged in to access this page. Redirecting to login.",
    );
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireLogin;
