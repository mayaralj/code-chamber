import { NavLink } from "react-router";
import { useLocation, useNavigate } from "react-router";
import useStableSession from "../../hooks/useStableSession";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";
  const { session } = useStableSession();

  // Link class
  const linkClass =
    (path) =>
    ({ isActive }) => {
      const isHighlighted =
        isActive ||
        (path == "/signup" && location.pathname === "/login") ||
        (path == "/login" && location.pathname === "/signup");

      return `text-[17px] font-bold tracking-[0.05em] transition-colors duration-200 ${
        isHighlighted
          ? "text-[#ffd99d] border-b-1 border-[#ffd99d] -mt-1"
          : "text-[#ffedd1] hover:text-[#ffd99d]"
      }`;
    };

  return (
    <nav className="fixed h-18 z-50 flex w-full items-center justify-between border-b border-[#4b4133] bg-[#080812] px-10 py-5 font-mono gap-10">
      {/* Title (Stays on left, never squishes) */}
      <button
        onClick={() => navigate("/")}
        className="z-10 flex-shrink-0 cursor-pointer text-3xl font-black tracking-tighter text-[#ffedd1] transition-colors duration-200 hover:text-[#e7bc76] whitespace-nowrap"
      >
        CODE CHAMBER
      </button>

      {/* Links Container */}
      <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center justify-start gap-10 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none py-2 max-w-full">
        <NavLink to="/" className={linkClass("/")}>
          Home
        </NavLink>
        <NavLink to="/create" className={linkClass("/create")}>
          Create
        </NavLink>
        <NavLink to="/browse" className={linkClass("/browse")}>
          Browse
        </NavLink>
        <NavLink to="/leaderboard" className={linkClass("/leaderboard")}>
          Leaderboard
        </NavLink>
        {session ? (
          <NavLink to="/profile" className={linkClass("/profile")}>
            Profile
          </NavLink>
        ) : (
          <NavLink
            to={isLogin ? "/signup" : "/login"}
            className={linkClass(isLogin ? "/signup" : "/login")}
          >
            {isLogin ? "Signup" : "Login"}
          </NavLink>
        )}
      </div>

      {/* Keeps spacing consistent on desktop layouts */}
      <div
        className="hidden md:block w-[258px] pointer-events-none"
        aria-hidden="true"
      />
    </nav>
  );
};

export default Navbar;
