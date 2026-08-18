import { NavLink } from "react-router";
import { useLocation, useNavigate } from "react-router";
import { User } from "lucide-react";
import useStableSession from "../../hooks/useStableSession";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";
  const { session } = useStableSession();

  const linkClass =
    () =>
    ({ isActive }) =>
      `text-[17px] font-bold tracking-[0.05em] transition-colors duration-200 whitespace-nowrap ${
        isActive
          ? "text-[#ffd99d] border-b-1 border-[#ffd99d] -mt-1"
          : "text-[#ffedd1] hover:text-[#ffd99d]"
      }`;

  return (
    <nav className="fixed h-18 z-50 grid grid-cols-[1fr_auto_1fr] items-center w-full border-b border-[#4b4133] bg-[#080812] px-10 py-5 font-mono gap-10">
      {/* Left: logo */}
      <button
        onClick={() => navigate("/")}
        className="flex-shrink-0 cursor-pointer text-3xl font-black tracking-tighter text-[#ffedd1] hover:text-[#e7bc76] transition-colors duration-200 whitespace-nowrap justify-self-start"
      >
        CODE CHAMBER
      </button>

      {/* Center: truly centered regardless of side widths */}
      <div className="flex items-center justify-center gap-10 whitespace-nowrap">
        <NavLink to="/" className={linkClass()}>
          HOME
        </NavLink>
        <NavLink to="/create" className={linkClass()}>
          CREATE
        </NavLink>
        <NavLink to="/browse" className={linkClass()}>
          BROWSE
        </NavLink>
        <NavLink to="/leaderboard" className={linkClass()}>
          LEADERBOARD
        </NavLink>
      </div>

      <div className="flex-shrink-0 flex items-center gap-6 justify-self-end whitespace-nowrap">
        {session ? (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `p-2 rounded-full transition-colors duration-200 ${
                isActive
                  ? "text-[#ffd99d] bg-[#232330]"
                  : "text-[#ffedd1] bg-[#1a1a24] hover:bg-[#232330] hover:text-[#ffd99d]"
              }`
            }
          >
            <User size={22} strokeWidth={2} />
          </NavLink>
        ) : (
          <NavLink
            to={isLogin ? "/login" : "/signup"}
            className="bg-[#ffd89a] text-[#080812] font-bold text-sm tracking-wide px-8 mx-4 py-2  hover:bg-[#ffe4b4] transition-colors duration-200"
          >
            {isLogin ? "LOGIN" : "SIGNUP"}
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
