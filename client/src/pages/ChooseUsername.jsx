import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";

const ChooseUsername = () => {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session || !session.user) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.username) {
    return <Navigate to="/profile" replace />;
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    const { error } = await authClient.updateUser({
      username: username.trim().toLowerCase(),
      displayUsername: username.trim(),
    });

    if (error) {
      console.error("Failed to set username:", error);
      setError(error.message);
      return;
    }

    try {
      await refreshSocketConnection(); // Refresh the socket connection after setting username
    } catch (error) {
      setError("Username saved but failed to refresh socket connection.");
      console.warn("Socket refresh failed but it will keep retrying", error);
    }
    navigate("/profile", { replace: true });
  };

  return (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <div className="bg-gray-700 p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-3xl text-white font-bold mb-6">
          Choose a Username
        </h1>
        {error && (
          <p className="mb-4 w-full rounded bg-red-900 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-white">
            Username
            <input
              className="text-white bg-gray-700 border border-gray-600 rounded px-2 ml-2"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <button
            className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer"
            type="submit"
          >
            Set Username
          </button>
        </form>
      </div>
    </main>
  );
};

export default ChooseUsername;
