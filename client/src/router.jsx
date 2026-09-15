import { createBrowserRouter } from "react-router";

import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import Browse from "./pages/Browse";
import RoomWait from "./pages/RoomWait";
import Game from "./pages/Game";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ChooseUsername from "./pages/ChooseUsername";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import RequireUsername from "./components/routeCheckers/RequireUsername";
import RequireNoUsername from "./components/routeCheckers/RequireNoUsername";
import RequireSocket from "./components/routeCheckers/RequireSocket";
import RequireLogin from "./components/routeCheckers/RequireLogin";
import RequireNotLoggedIn from "./components/routeCheckers/RequireNotLoggedIn";
import RequireServer from "./components/routeCheckers/RequireServer";
import MainLayout from "./layouts/MainLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      // Anyone allowed
      { index: true, element: <Home /> },
      // unknown route, redirect to home
      { path: "*", element: <NotFound /> },

      // Privacy and Terms pages
      { path: "terms", element: <Terms /> },
      { path: "privacy", element: <Privacy /> },

      {
        // Need a server connection to access these routes
        element: <RequireServer />,
        children: [
          { path: "leaderboard", element: <Leaderboard /> },
          // Must not be logged in
          {
            element: <RequireNotLoggedIn />,
            children: [
              { path: "signup", element: <Signup /> },
              { path: "login", element: <Login /> },
            ],
          },
          // Must be logged in
          {
            element: <RequireLogin />,
            children: [
              { path: "profile", element: <Profile /> },
              {
                // Must be logged in and have no username
                element: <RequireNoUsername />,
                children: [
                  { path: "choose-username", element: <ChooseUsername /> },
                ],
              },
            ],
          },
        ],
      },

      // Need a socket connection
      {
        path: "/",
        element: <RequireSocket />,
        children: [
          {
            // Need a socket connection and a username to play
            element: <RequireUsername />,
            children: [
              { path: "create", element: <CreateRoom /> },
              { path: "browse", element: <Browse /> },
            ],
          },
        ],
      },
    ],
  },

  // Outside of main layout
  {
    path: "/",
    element: (
      // Need socket connection to access these routes
      <RequireSocket />
    ),
    children: [
      {
        element: <RequireUsername />,
        children: [
          { path: "room-wait/:code", element: <RoomWait /> },
          { path: "game/:code", element: <Game /> },
        ],
      },
    ],
  },
]);

export default router;
