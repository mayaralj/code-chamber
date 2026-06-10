import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import PublicRooms from "./pages/PublicRooms";
import RoomWait from "./pages/RoomWait";
import Join from "./pages/Join";
import Game from "./pages/Game";
// Layouts
import MainLayout from "./layouts/MainLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "/create", element: <CreateRoom /> },
      { path: "/join", element: <Join /> },
      { path: "/rooms", element: <PublicRooms /> },
    ],
  },
  { path: "/room-wait/:code", element: <RoomWait /> },
  { path: "/game/:code", element: <Game /> },
  // 404 Route
  { path: "*", element: <Home /> }, // will be not found page later
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
