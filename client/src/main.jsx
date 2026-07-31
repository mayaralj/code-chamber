import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PlayerProvider from "./context/PlayerProvider.jsx";
import StableSessionProvider from "./context/StableSessionProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StableSessionProvider>
    <PlayerProvider>
      <App />
    </PlayerProvider>
  </StableSessionProvider>,
);
