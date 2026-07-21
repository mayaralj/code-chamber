import { NavLink } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import authClient from "../authClient";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";
  const { data: session, isPending } = authClient.useSession();

  // Link class
  const linkClass =
    (path) =>
    ({ isActive }) => {
      const isHighlighted =
        isActive || (path === "/join" && location.pathname === "/lobbies");

      return `text-[17px] font-bold tracking-[0.05em] transition-colors duration-200 ${
        isHighlighted ? "text-[#ffd99d]" : "text-[#ffedd1] hover:text-[#ffd99d]"
      }`;
    };

  return (
    <nav className="fixed z-50 flex w-full items-center justify-between border-b border-[#4b4133] bg-[#0b0b0b] px-10 py-5 font-mono">
      <button
        onClick={() => navigate("/")}
        className="cursor-pointer text-3xl font-black tracking-tighter text-[#ffedd1] transition-colors duration-200 hover:text-[#e7bc76]"
      >
        CODE CHAMBER
      </button>
      <div className="flex gap-10 px-10">
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
            <NavLink to="/profile" className={linkClass("/profile")}>
              Profile
            </NavLink>
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
