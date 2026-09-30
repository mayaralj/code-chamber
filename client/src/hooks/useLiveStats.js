import { useContext } from "react";
import LiveStatsContext from "../context/LiveStatsContext.js";

const useLiveStats = () => {
  return useContext(LiveStatsContext);
};
export default useLiveStats;
