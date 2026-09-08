import { Outlet } from "react-router";
import Navbar from "../components/mainComponents/Navbar";
import Footer from "../components/mainComponents/Footer";

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
