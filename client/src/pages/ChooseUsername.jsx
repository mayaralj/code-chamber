// Imports
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";
import usePageTitle from "../hooks/usePageTitle";
import useStableSession from "../hooks/useStableSession";

// ChooseUsername component
const ChooseUsername = () => {
  // Set page title
  usePageTitle("Choose Username");

  // Navigate
  const navigate = useNavigate();

  // Hooks
  const { setSuppressGuards } = useStableSession();

  // Release suppression after this page unmounts, once navigation commits.
  useEffect(() => () => setSuppressGuards(false), [setSuppressGuards]);

  // States
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle submit function
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Username cannot be empty.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // Suppress authentication redirects until this transition finishes.
    setSuppressGuards(true);

    try {
      const { error } = await authClient.updateUser({
        username: cleanUsername.toLowerCase(),
        displayUsername: cleanUsername,
        name: cleanUsername,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Failed to set username:", error);
      setError(error?.message || "Could not save username.");
      setIsSubmitting(false);
      setSuppressGuards(false);
      return;
    }

    try {
      await refreshSocketConnection();
    } catch (socketError) {
      console.error(
        "Username saved but socket refresh failed, navigating to profile page anyway",
        socketError,
      );
    }

    await navigate("/profile", { replace: true });
  };

  // Render
  return (
    <main className="relative flex min-h-[calc(100vh-72px)] justify-center overflow-hidden bg-[#0b0b0b] px-5 py-32 text-[#e8d9c0]">
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(rgba(91, 78, 62, 0.75) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.72)_100%)]" />

      <section className="relative w-full max-w-[465px]">
        <header className="mb-14 text-center">
          <h1 className="font-mono text-6xl font-black leading-[0.9] tracking-[-0.08em] text-[#ffd89a] sm:text-7xl">
            CODE
            <br />
            CHAMBER
          </h1>
        </header>

        <div className="border border-[#aa936f] bg-[#0d0d0d]/95 px-10 py-11 shadow-[0_0_60px_rgba(0,0,0,0.55)]">
          <p className="mb-9 font-mono text-sm text-[#c7baa4]">
            Username Must Be Entered To Play The Game.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-4 block font-mono text-xs font-bold tracking-[0.14em] text-[#d9c8ad]">
                USERNAME INPUT
              </span>

              <input
                className="w-full border-b border-[#665b4a] bg-transparent px-0 py-3 font-mono text-base tracking-[0.1em] text-[#f0ece5] outline-none placeholder:text-[#514d46] focus:border-[#ffd89a]"
                name="username"
                type="text"
                placeholder="USER_ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </label>

            {error && (
              <p className="mt-5 border border-red-900 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-300">
                ERROR: {error}
              </p>
            )}

            <button
              className="mt-10 flex w-full cursor-pointer items-center justify-center gap-4 bg-[#ffd89a] px-5 py-5 font-mono text-sm font-bold tracking-[0.14em] text-[#241d14] transition hover:bg-[#ffe4b4] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "CONFIRMING..." : "CONFIRM IDENTITY"}
              {!isSubmitting && <span className="text-xl leading-none">→</span>}
            </button>
          </form>
        </div>

        <footer className="mt-9 text-center font-mono text-xs tracking-[0.1em] text-[#504c45]">
          SESSION_SECURE
        </footer>
      </section>
    </main>
  );
};

export default ChooseUsername;
