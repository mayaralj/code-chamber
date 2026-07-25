import { Navigate, Outlet } from "react-router-dom";
import authClient from "../authClient";

const RequireUsername = () => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0b0b] text-[#e7c49d]">
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but no username
  if (!session.user.username) {
    return <Navigate to="/choose-username" replace />;
  }

  // Logged in and has a username
  return <Outlet />;
};

export default RequireUsername;
