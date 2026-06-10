import { Outlet } from "react-router-dom";
import GameNavbar from "../components/GameComponents/GameNavbar";

const GameLayout = () => {
  return (
    <>
      <GameNavbar />
      <Outlet />
    </>
  );
};

export default GameLayout;
