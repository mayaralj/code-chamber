// Imports
import { useState, useEffect } from "react";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  // Profile info state
  const [profileInfo, setProfileInfo] = useState(null);

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
    </main>
  ) : (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-white font-bold mb-6">Loading Profile...</h1>
    </main>
  );
};

export default Profile;
