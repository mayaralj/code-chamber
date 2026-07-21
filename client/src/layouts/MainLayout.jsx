import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <>
      <div className="border-b border-[#4b4133]">
        <Navbar />
      </div>

      <Outlet />
    </>
  );
};

export default MainLayout;
