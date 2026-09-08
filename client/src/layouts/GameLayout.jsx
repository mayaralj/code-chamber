import { Outlet } from "react-router";
import GameNavbar from "../components/gameComponents/GameNavbar";

const GameLayout = () => {
  return (
    <>
      <GameNavbar />
      <Outlet />
    </>
  );
};

export default GameLayout;
