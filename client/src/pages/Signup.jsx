import { useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(searchParams.get("error") || null);
  console.log("Error from search params:", error);

  // Form state
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  // Handle form change
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // HAndle google
  const handleGoogleSignup = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "http://localhost:3000/",
      errorCallbackURL: "http://localhost:3000/signup",
    });
  };

  // Handle Github
  const handleGithubSignup = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "http://localhost:3000/",
      errorCallbackURL: "http://localhost:3000/signup",
    });
  };

  // Handle Discord
  const handleDiscordSignup = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "http://localhost:3000/",
      errorCallbackURL: "http://localhost:3000/signup",
    });
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = form.username.trim().toLowerCase();

    // Call the signup function from authClient
    const { data, error } = await authClient.signUp.email({
      name: form.username.trim(),
      username: form.username.trim(),
      password: form.password,

      // Hide email
      email: `${cleanUsername}@users.yourapp.invalid`,
    });

    // Check for error
    if (error) {
      console.error("Signup failed:", error);
      setError(error.message);
      return;
    }

    console.log("Account created:", data.user);

    // Redirect to home page
    refreshSocketConnection(); // Refresh the socket connection after signup
    navigate("/", { replace: true });
  };

  return (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      {/* Center at the top the title */}
      <h1 className="text-3xl text-white font-bold mb-6">
        Create your Code Chamber account
      </h1>

      {/* Display error message */}
      {error === "account_not_linked" && (
        <p className="mb-4 w-80 rounded bg-red-900 p-3 text-sm text-red-200">
          An account already exists with this email. Log in with your password,
          then connect your social accounts.
        </p>
      )}

      {error && error !== "account_not_linked" && (
        <p className="mb-4 w-80 rounded bg-red-900 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <form className="flex flex-col gap-4 w-80" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-white">
          Username
          <input
            className="text-white bg-gray-700 border border-gray-600 rounded px-2 ml-2"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-white">
          Password
          <input
            className="text-white bg-gray-700 border border-gray-600 rounded px-2 ml-2"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer"
          type="submit"
        >
          Create account
        </button>

        {/* Give link to login page */}
        <p className="text-white">
          Already have an account?{" "}
          <NavLink to="/login" className="text-blue-500 hover:underline">
            Log in
          </NavLink>
        </p>
      </form>
      {/* Social login options */}
      <div className="flex flex-col gap-2 mt-4">
        <button
          className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 cursor-pointer"
          onClick={handleGoogleSignup}
        >
          Sign up with Google
        </button>

        <button
          className="bg-gray-800 text-white font-bold py-2 px-4 rounded border border-gray-600 hover:bg-gray-700 cursor-pointer"
          onClick={handleGithubSignup}
        >
          Sign up with GitHub
        </button>

        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 cursor-pointer"
          onClick={handleDiscordSignup}
        >
          Sign up with Discord
        </button>
      </div>
    </main>
  );
};

export default Signup;
