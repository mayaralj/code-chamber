// hooks/useStableSession.js
import { useContext } from "react";
import StableSessionContext from "../context/StableSessionContext";
const useStableSession = () => useContext(StableSessionContext);
export default useStableSession;
