import { Outlet } from "react-router";
import Navbar from "../components/MainComponents/Navbar";
import Footer from "../components/MainComponents/Footer";

const MainLayout = () => {
  return (
    <>
      <Navbar />
      {/* Add minimum height so the footer doesn't appear right under navbar  */}
      <div className="pt-18 min-h-[calc(100vh-72px)]">
        <Outlet />
      </div>
      <Footer />
    </>
  );
};

export default MainLayout;
