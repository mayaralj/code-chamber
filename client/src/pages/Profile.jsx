// Imports
import { useState, useEffect } from "react";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  // Is logged in state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Profile info state'
  const [profileInfo, setProfileInfo] = useState(null);
  // Accounts state
  const [accounts, setAccounts] = useState([]);

  // Load social linking status
  const refreshAccounts = async () => {
    const { data: accounts, error } = await authClient.listAccounts();
    if (error) {
      console.error("Could not load accounts:", error);
      return;
    }
    setAccounts(accounts || []);
  };

  // Link social account
  const APP_URL = "http://localhost:3000";
  const linkSocial = async (provider) => {
    await authClient.linkSocial({
      provider,
      callbackURL: `${APP_URL}/`,
      errorCallbackURL: `${APP_URL}/signup`,
    });
  };

  const handleGoogleLink = () => linkSocial("google");
  const handleGithubLink = () => linkSocial("github");
  const handleDiscordLink = () => linkSocial("discord");

  // Unlink social account
  const unlinkSocial = async (providerId) => {
    const { error } = await authClient.unlinkAccount({ providerId });
    if (error) {
      console.error(`Failed to unlink ${providerId} account:`, error);
      return;
    }
    // Refresh accounts to update the state
    await refreshAccounts();
  };

  const handleGoogleUnlink = () => unlinkSocial("google");
  const handleGithubUnlink = () => unlinkSocial("github");
  const handleDiscordUnlink = () => unlinkSocial("discord");

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        console.error("Logout failed:", error);
        return;
      }
      console.log("Logged out successfully");
      // Redirect to home page
      refreshSocketConnection(); // Refresh the socket connection after signup
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Check if user is logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: session, error } = await authClient.getSession();
      if (error) {
        console.error("Error checking login status:", error);
        return;
      }
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      console.log("User is logged in:", loggedIn);

      // Redirect to signup if not logged in
      if (!loggedIn) {
        navigate("/signup", { replace: true });
      }
    };

    checkLoginStatus();
  }, []);

  // Request profile info from server
  useEffect(() => {
    // Ignore if not logged in
    if (!isLoggedIn) {
      return;
    }

    // Fetch profile info from server
    const fetchProfileInfo = async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for session
        });

        //  Check if status code is 401 to redirect
        if (response.status === 401) {
          // Redirect to signup page
          navigate("/signup", { replace: true });
          return;
        }
        // check if response is ok
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Set profile info state
        const data = await response.json();
        console.log("Profile info received:", data);
        setProfileInfo(data);
      } catch (error) {
        console.error("Error fetching profile info:", error);
      }
    };

    fetchProfileInfo();
  }, [isLoggedIn, navigate]);

  // Check Social option linking status
  useEffect(() => {
    // Ignore if not logged in
    if (!isLoggedIn) {
      return;
    }
    let cancelled = false;
    authClient.listAccounts().then(({ data: accounts, error }) => {
      // If the component has unmounted, do not update state
      if (cancelled) return;

      // Check for error
      if (error) {
        console.error("Could not load accounts:", error);
        return;
      }

      // Update state
      setAccounts(accounts || []);
    });

    // Cleanup function to set cancelled flag if component unmounts
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Determine if each social account is linked
  const googleLinked = accounts.some(
    (account) => account.providerId === "google",
  );
  const githubLinked = accounts.some(
    (account) => account.providerId === "github",
  );
  const discordLinked = accounts.some(
    (account) => account.providerId === "discord",
  );
  // Count linked accounts
  const linkedCount = accounts.length;

  return profileInfo ? (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-white font-bold mb-6">Profile</h1>
      <div className="bg-gray-700 p-6 rounded shadow-md w-80">
        <p className="text-white mb-2">
          <strong>Username:</strong> {profileInfo.username || "Loading..."}
        </p>
      </div>

      {/* Logout button */}
      <button
        className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 mt-6 cursor-pointer"
        onClick={handleLogout}
      >
        Logout
      </button>

      {/* Link Google button */}
      {!googleLinked && (
        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 mt-4 cursor-pointer"
          onClick={handleGoogleLink}
        >
          Link Google Account
        </button>
      )}

      {/* Link GitHub button */}
      {!githubLinked && (
        <button
          className="bg-gray-800 text-white font-bold py-2 px-4 rounded border border-gray-600 hover:bg-gray-700 cursor-pointer mt-4"
          onClick={handleGithubLink}
        >
          Link GitHub Account
        </button>
      )}

      {/* Link Discord button */}
      {!discordLinked && (
        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer mt-4"
          onClick={handleDiscordLink}
        >
          Link Discord Account
        </button>
      )}

      {/* Unlinked buttons only show when >1 account is linked */}
      {linkedCount > 1 && (
        <>
          {/* Unlink Google button */}
          {googleLinked && (
            <button
              className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 mt-4 cursor-pointer"
              onClick={handleGoogleUnlink}
            >
              Unlink Google Account
            </button>
          )}

          {/* Unlink GitHub button */}
          {githubLinked && (
            <button
              className="bg-gray-800 text-white font-bold py-2 px-4 rounded border border-gray-600 hover:bg-gray-700 mt-4 cursor-pointer"
              onClick={handleGithubUnlink}
            >
              Unlink GitHub Account
            </button>
          )}

          {/* Unlink Discord button */}
          {discordLinked && (
            <button
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer mt-4"
              onClick={handleDiscordUnlink}
            >
              Unlink Discord Account
            </button>
          )}
        </>
      )}
      {/* Display match stats */}
      <div className="bg-gray-700 p-6 rounded shadow-md w-80 mt-6">
        <p className="text-white mb-2">
          <strong>Matches Played:</strong> {profileInfo.matches_played || 0}
        </p>
        <p className="text-white mb-2">
          <strong>Matches Won:</strong> {profileInfo.matches_won || 0}
        </p>
      </div>
    </main>
  ) : (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-white font-bold mb-6">Loading Profile...</h1>
    </main>
  );
};

export default Profile;
