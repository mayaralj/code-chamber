// RequireNoUsername.jsx
import { Navigate, Outlet } from "react-router-dom";
import authClient from "../authClient";

const RequireNoUsername = () => {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (session.user.username || error) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default RequireNoUsername;
