// Imports
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";
import { FaGoogle, FaGithub, FaDiscord } from "react-icons/fa";
import { withTimeout } from "../utils/timeout";
import usePageTitle from "../hooks/usePageTitle";

// Login component
const Login = () => {
  // Page title
  usePageTitle("Login");

  // Navigate
  const navigate = useNavigate();

  // States
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle change function
  const handleChange = (e) => {
    setForm((currentForm) => ({
      ...currentForm,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle social login function
  const loginWithSocial = async (provider) => {
    const appUrl = window.location.origin;

    setErrorMessage("");
    setIsLoading(true);

    try {
      const { error } = await withTimeout(
        authClient.signIn.social({
          provider,
          callbackURL: `${appUrl}/profile`,
          newUserCallbackURL: `${appUrl}/choose-username`,
          errorCallbackURL: `${appUrl}/signup`,
        }),
        8000,
      );

      if (error) {
        setErrorMessage(error.message || "Social login failed. Try again.");
        setIsLoading(false);
        localStorage.setItem("wasLoggedIn", "false");
      }
      localStorage.setItem("wasLoggedIn", "true");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong. Try again.");
      setIsLoading(false);
      localStorage.setItem("wasLoggedIn", "false");
    }
  };

  // Handle submit function (manual login)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const { error } = await withTimeout(
        authClient.signIn.username({
          username: form.username.trim(),
          password: form.password,
        }),
        8000,
      );
      if (error) {
        setErrorMessage(error.message || "Invalid username or password.");
        setIsLoading(false);
        localStorage.setItem("wasLoggedIn", "false");
        return;
      }
      // Set in Local storage
      localStorage.setItem("wasLoggedIn", "true");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong. Try again.");
      setIsLoading(false);
      localStorage.setItem("wasLoggedIn", "false");
      return;
    }

    try {
      await refreshSocketConnection();
    } catch (socketError) {
      console.error("Login succeeded but socket refresh failed:", socketError);
    }

    navigate("/profile", { replace: true });
  };

  // Render
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b0b] px-5 py-12 text-[#e8d9c0]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(#7c7468 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <section className="relative mx-auto w-full max-w-[470px]">
        <header className="mb-6">
          <p className="font-mono text-4xl font-black tracking-[0.1em] text-[#ffd89a]">
            CODE CHAMBER
          </p>
          <div className="mt-3 h-px w-12 bg-[#ffd89a]" />
        </header>

        <div className="border border-[#5d5549] bg-[#0e0e0e]/95 px-10 py-11 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <p className="mb-2 font-mono text-xs font-bold tracking-[0.22em] text-[#d9bd8f]">
            AUTHENTICATION REQUIRED
          </p>

          <h1 className="mb-10 font-mono text-3xl font-black tracking-[-0.08em] text-[#f0ece5]">
            LOGIN<span className="text-[#ffd89a]">.</span>
          </h1>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block font-mono text-xs font-bold tracking-[0.15em] text-[#d9c8ad]">
                USERNAME
              </span>

              <input
                className="w-full border border-[#645a4b] bg-[#222120] px-4 py-3 font-mono text-sm text-[#f0ece5] outline-none placeholder:text-[#6e675d] focus:border-[#ffd89a]"
                name="username"
                type="text"
                placeholder="enter_username"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-xs font-bold tracking-[0.15em] text-[#d9c8ad]">
                PASSWORD
              </span>

              <input
                className="w-full border border-[#645a4b] bg-[#222120] px-4 py-3 font-mono text-sm text-[#f0ece5] outline-none placeholder:text-[#6e675d] focus:border-[#ffd89a]"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </label>

            {errorMessage && (
              <p className="border border-red-900 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-300">
                ERROR: {errorMessage}
              </p>
            )}

            <button
              className="w-full bg-[#ffd89a] px-4 py-4 font-mono text-sm font-bold tracking-[0.16em] text-[#241d14] transition hover:bg-[#ffe4b4] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "AUTHENTICATING..." : "EXECUTE LOGIN  >_"}
            </button>
          </form>

          <div className="my-11 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#302d29]" />
            <span className="font-mono text-xs font-bold tracking-[0.16em] text-[#cbb99a]">
              SOCIAL ACCESS
            </span>
            <div className="h-px flex-1 bg-[#302d29]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              className="flex items-center justify-center border border-[#645a4b] py-4 text-[#e8d9c0] transition hover:border-[#ffd89a] hover:bg-[#1b1917] cursor-pointer"
              type="button"
              onClick={() => loginWithSocial("google")}
              disabled={isLoading}
              aria-label="Continue with Google"
            >
              <FaGoogle size={22} />
            </button>

            <button
              className="flex items-center justify-center border border-[#645a4b] py-4 text-[#e8d9c0] transition hover:border-[#ffd89a] hover:bg-[#1b1917] cursor-pointer"
              type="button"
              onClick={() => loginWithSocial("github")}
              disabled={isLoading}
              aria-label="Continue with GitHub"
            >
              <FaGithub size={24} />
            </button>

            <button
              className="flex items-center justify-center border border-[#645a4b] py-4 text-[#e8d9c0] transition hover:border-[#ffd89a] hover:bg-[#1b1917] cursor-pointer"
              type="button"
              onClick={() => loginWithSocial("discord")}
              disabled={isLoading}
              aria-label="Continue with Discord"
            >
              <FaDiscord size={24} />
            </button>
          </div>

          <p className="mt-10 text-center font-mono text-xs tracking-wide text-[#cbb99a]">
            NO ACCOUNT?{" "}
            <NavLink
              to="/signup"
              className="font-bold text-[#ffd89a] transition hover:text-[#ffe4b4]"
            >
              SIGN UP HERE
            </NavLink>
          </p>
        </div>

        <footer className="mt-9 flex justify-between font-mono text-xs text-[#6d685f]">
          <span>■ SYSTEM: SECURED</span>
          <span>VER: 1.0.0</span>
        </footer>
      </section>
    </main>
  );
};

export default Login;
