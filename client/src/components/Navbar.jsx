import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
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
      <div className="flex gap-6">
        <NavLink to="/" className={linkClass("/")}>
          Home
        </NavLink>
        <NavLink to="/create" className={linkClass("/create")}>
          Create Lobby
        </NavLink>
        <NavLink to="/join" className={linkClass("/join")}>
          Join Lobby
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
