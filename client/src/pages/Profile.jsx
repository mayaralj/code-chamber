// Imports
import { useState, useEffect } from "react";

const Profile = () => {
  // Profile info state
  const [profileInfo, setProfileInfo] = useState(null);

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
    </main>
  ) : (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl text-white font-bold mb-6">Loading Profile...</h1>
    </main>
  );
};

export default Profile;
