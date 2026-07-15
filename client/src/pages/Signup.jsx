import { useState } from "react";
import { NavLink } from "react-router-dom";

const Signup = () => {
  // Form state
  const [form, setForm] = useState({
    username: "",
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

  // Handle Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", form);
  };

  return (
    <main className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      {/* Center at the top the title */}
      <h1 className="text-3xl text-white font-bold mb-6">
        Create your Code Chamber account
      </h1>

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
    </main>
  );
};

export default Signup;
