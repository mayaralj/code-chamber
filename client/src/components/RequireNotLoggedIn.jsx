// RequireLogin.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import authClient from "../authClient";

const RequireNotLoggedIn = () => {
  const { data: session, isPending, error } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <main className="bg-gray-800 min-h-screen flex items-center justify-center">
        <h1 className="text-3xl text-white font-bold">Loading...</h1>
      </main>
    );
  }

  if (error || session?.user) {
    return (
      <Navigate to="/profile" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
};

export default RequireNotLoggedIn;
