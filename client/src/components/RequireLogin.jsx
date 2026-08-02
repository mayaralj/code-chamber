// RequireLogin.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useStableSession from "../hooks/useStableSession";

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

  if (error || !session?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireLogin;
