// useServerHealth.js
import { useContext } from "react";
import ServerHealthContext from "./ServerHealthContext";

const useServerHealth = () => useContext(ServerHealthContext);
export default useServerHealth;
