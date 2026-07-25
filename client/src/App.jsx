import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import Browse from "./pages/Browse";
import RoomWait from "./pages/RoomWait";
import Game from "./pages/Game";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ChooseUsername from "./pages/ChooseUsername";
// Layouts
import MainLayout from "./layouts/MainLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "/create", element: <CreateRoom /> },
      { path: "/browse", element: <Browse /> },
      { path: "/signup", element: <Signup /> },
      { path: "/login", element: <Login /> },
      { path: "/profile", element: <Profile /> },
      { path: "/choose-username", element: <ChooseUsername /> },
    ],
  },
  { path: "/room-wait/:code", element: <RoomWait /> },
  { path: "/game/:code", element: <Game /> },
  // 404 Route
  { path: "*", element: <Navigate to="/" replace /> }, // will be not found page later
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
