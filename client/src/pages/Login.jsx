import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";

const Login = () => {
  const navigate = useNavigate();
  // Form state
  const [form, setForm] = useState({
    email: "",
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
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "http://localhost:3000/",
      errorCallbackURL: "http://localhost:3000/login",
    });
  };

  // Handle Github
  const handleGithubLogin = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "http://localhost:3000/",
      errorCallbackURL: "http://localhost:3000/login",
    });
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data, error } = await authClient.signIn.email({
      email: form.email,
      password: form.password,
    });

    if (error) {
      console.error("Login failed:", error);
      return;
    }

    // Successful login
    console.log("Logged in:", data.user);

    // Redirect to home page
    refreshSocketConnection(); // Refresh the socket connection after login
    navigate("/", { replace: true });
  };

  return (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      {/* Center at the top the title */}
      <h1 className="text-3xl text-white font-bold mb-6">
        Log in to your Code Chamber account
      </h1>

      <form className="flex flex-col gap-4 w-80" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-white">
          Email
          <input
            className="text-white bg-gray-700 border border-gray-600 rounded px-2 ml-2"
            name="email"
            type="email"
            value={form.email}
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
          Log In
        </button>

        {/* Give link to signup page */}
        <p className="text-white">
          Don't have an account?{" "}
          <NavLink to="/signup" className="text-blue-500 hover:underline">
            Sign up
          </NavLink>
        </p>
      </form>
      <div className="mt-6">
        <button
          className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600 cursor-pointer"
          onClick={handleGoogleLogin}
        >
          Log in with Google
        </button>
        <button
          className="bg-gray-800 text-white font-bold py-2 px-4 rounded border border-gray-600 hover:bg-gray-700 cursor-pointer ml-4"
          onClick={handleGithubLogin}
        >
          Log in with GitHub
        </button>
      </div>
    </main>
  );
};

export default Login;
