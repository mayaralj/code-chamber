// ServerHealthContext.js
import { createContext } from "react";
const ServerHealthContext = createContext({ serverUnreachable: false });
export default ServerHealthContext;
