// useServerHealth.js
import { useContext } from "react";
import ServerHealthContext from "../context/ServerHealthContext";

const useServerHealth = () => useContext(ServerHealthContext);
export default useServerHealth;
