// RequireLogin.jsx
import { Navigate, Outlet, useLocation } from "react-router";
import useStableSession from "../../hooks/useStableSession";

const RequireNotLoggedIn = () => {
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
    const isNetworkFailure = !error.status || error.status === 0;
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        {isNetworkFailure
          ? "SERVER TEMPORARILY DOWN — RETRYING..."
          : "SESSION ERROR — PLEASE LOG IN AGAIN"}
      </main>
    );
  }

  if (session?.user) {
    return (
      <Navigate to="/profile" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
};

export default RequireNotLoggedIn;
