import { Outlet } from "react-router";
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
