import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import authClient from "../authClient";

const Navbar = () => {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const { data: session, isPending } = authClient.useSession();
  const linkClass =
    (path) =>
    ({ isActive }) => {
      const isHighlighted =
        isActive || (path === "/join" && location.pathname === "/lobbies");
      return isHighlighted ? "text-orange-100" : "hover:text-orange-100";
    };
  return (
    <nav className="fixed w-full z-50 bg-gray-950 text-white py-4 px-8 flex items-center justify-between">
      <div className="text-2xl font-bold font-mono">Code Chamber</div>
      <div className="flex gap-8 px-8">
        <NavLink to="/" className={linkClass("/")}>
          Home
        </NavLink>
        <NavLink to="/create" className={linkClass("/create")}>
          Create
        </NavLink>
        <NavLink to="/join" className={linkClass("/join")}>
          Join
        </NavLink>
        {isPending ? null : session ? (
          <>
            <span className="text-white">{session.user.name}</span>

            <button
              type="button"
              onClick={() => authClient.signOut()}
              className="text-white hover:text-blue-400 cursor-pointer"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            {isLogin ? (
              <NavLink to="/signup" className={linkClass("/signup")}>
                Signup
              </NavLink>
            ) : (
              <NavLink to="/login" className={linkClass("/login")}>
                Login
              </NavLink>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
