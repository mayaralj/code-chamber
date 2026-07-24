import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PlayerProvider from "./context/PlayerProvider.jsx";

createRoot(document.getElementById("root")).render(
  <PlayerProvider>
    <App />
  </PlayerProvider>,
);
