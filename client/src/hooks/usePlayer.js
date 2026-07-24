import { useContext } from "react";
import PlayerContext from "../context/PlayerContext";

const usePlayer = () => {
  return useContext(PlayerContext);
};
export default usePlayer;
