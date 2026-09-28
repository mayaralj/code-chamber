import { Outlet } from "react-router";
import Navbar from "../components/MainComponents/Navbar";
import Footer from "../components/MainComponents/Footer";

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <div className="pt-18">
        <Outlet />
      </div>{" "}
      <Footer />
    </>
  );
};

export default MainLayout;
