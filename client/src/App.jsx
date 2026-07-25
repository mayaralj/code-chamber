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

import RequireUsername from "./components/RequireUsername";
import RequireSocket from "./components/RequireSocket";
import RequireLogin from "./components/RequireLogin";
import MainLayout from "./layouts/MainLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      // Anyone allowed
      { index: true, element: <Home /> },
      { path: "signup", element: <Signup /> },
      { path: "login", element: <Login /> },

      // Must be logged in
      {
        element: <RequireLogin />,
        children: [
          { path: "profile", element: <Profile /> },
          { path: "choose-username", element: <ChooseUsername /> },
        ],
      },

      // Need a socket connection
      {
        element: <RequireSocket />,
        children: [
          {
            element: <RequireUsername />,
            children: [
              { path: "create", element: <CreateRoom /> },
              { path: "browse", element: <Browse /> },
              { path: "room-wait/:code", element: <RoomWait /> },
              { path: "game/:code", element: <Game /> },
            ],
          },
        ],
      },
    ],
  },

  // unknown route, redirect to home
  { path: "*", element: <Navigate to="/" replace /> },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
