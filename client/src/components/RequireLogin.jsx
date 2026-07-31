// RequireLogin.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useStableSession from "../hooks/useStableSession";

const RequireLogin = () => {
  const { data: session, isPending, error } = useStableSession();
  const location = useLocation();

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] font-mono text-sm tracking-[0.16em] text-[#d9bd8f]">
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
