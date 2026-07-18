// Imports
import { useState, useEffect } from "react";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  // Profile info state
  const [profileInfo, setProfileInfo] = useState(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [githubLinked, setGithubLinked] = useState(false);
  const [discordLinked, setDiscordLinked] = useState(false);
  // Linked Count
  const [linkedCount, setLinkedCount] = useState(0);

  // Handle link google
  const handleLinkGoogle = async () => {
    await authClient.linkSocial({
      provider: "google",
      callbackURL: "http://localhost:3000/profile",
    });
  };

  // Handle unlink google
  const handleUnlinkGoogle = async () => {
    const { error } = await authClient.unlinkAccount({
      providerId: "google",
    });
    if (error) {
      console.error("Failed to unlink Google account:", error);
      return;
    }
    setGoogleLinked(false);
    setLinkedCount((prevCount) => prevCount - 1);
  };

  // Handle link github
  const handleLinkGithub = async () => {
    await authClient.linkSocial({
      provider: "github",
      callbackURL: "http://localhost:3000/profile",
    });
  };

  // Handle unlink github
  const handleUnlinkGithub = async () => {
    const { error } = await authClient.unlinkAccount({
      providerId: "github",
    });
    if (error) {
      console.error("Failed to unlink GitHub account:", error);
      return;
    }
    setGithubLinked(false);
    setLinkedCount((prevCount) => prevCount - 1);
  };

  // Handle link discord
  const handleLinkDiscord = async () => {
    await authClient.linkSocial({
      provider: "discord",
      callbackURL: "http://localhost:3000/profile",
    });
  };

  // Handle unlink discord
  const handleUnlinkDiscord = async () => {
    const { error } = await authClient.unlinkAccount({
      providerId: "discord",
    });
    if (error) {
      console.error("Failed to unlink Discord account:", error);
      return;
    }
    setDiscordLinked(false);
    setLinkedCount((prevCount) => prevCount - 1);
  };

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

  // Request profile info from server
  useEffect(() => {
    const fetchProfileInfo = async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for session
        });
        const data = await response.json();
        setProfileInfo(data);
      } catch (error) {
        console.error("Error fetching profile info:", error);
      }
    };

    fetchProfileInfo();
  }, []);

  // Check Social option linking status
  useEffect(() => {
    const loadSocialStatus = async () => {
      const { data: accounts, error } = await authClient.listAccounts();

      console.log({ accounts, error });

      if (error) {
        console.error("Could not load accounts:", error);
        return;
      }

      setGoogleLinked(
        accounts.some((account) => account.providerId === "google"),
      );

      setGithubLinked(
        accounts.some((account) => account.providerId === "github"),
      );

      setDiscordLinked(
        accounts.some((account) => account.providerId === "discord"),
      );

      setLinkedCount(accounts.length);
      console.log("Linked accounts count:", accounts.length);
    };

    loadSocialStatus();
  }, []);

  return profileInfo ? (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-white font-bold mb-6">Profile</h1>
      <div className="bg-gray-700 p-6 rounded shadow-md w-80">
        <p className="text-white mb-2">
          <strong>Username:</strong> {profileInfo.username || "Loading..."}
        </p>
        <p className="text-white mb-2">
          <strong>Email:</strong> {profileInfo.email || "Loading..."}
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
          onClick={handleLinkGoogle}
        >
          Link Google Account
        </button>
      )}

      {/* Link GitHub button */}
      {!githubLinked && (
        <button
          className="bg-gray-800 text-white font-bold py-2 px-4 rounded border border-gray-600 hover:bg-gray-700 cursor-pointer mt-4"
          onClick={handleLinkGithub}
        >
          Link GitHub Account
        </button>
      )}

      {/* Link Discord button */}
      {!discordLinked && (
        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer mt-4"
          onClick={handleLinkDiscord}
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
              onClick={handleUnlinkGoogle}
            >
              Unlink Google Account
            </button>
          )}

          {/* Unlink GitHub button */}
          {githubLinked && (
            <button
              className="bg-gray-800 text-white font-bold py-2 px-4 rounded border border-gray-600 hover:bg-gray-700 mt-4 cursor-pointer"
              onClick={handleUnlinkGithub}
            >
              Unlink GitHub Account
            </button>
          )}

          {/* Unlink Discord button */}
          {discordLinked && (
            <button
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer mt-4"
              onClick={handleUnlinkDiscord}
            >
              Unlink Discord Account
            </button>
          )}
        </>
      )}
    </main>
  ) : (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-white font-bold mb-6">Loading Profile...</h1>
    </main>
  );
};

export default Profile;
