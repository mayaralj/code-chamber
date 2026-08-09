// Imports
import { useEffect, useState } from "react";
import {
  FaDiscord,
  FaGithub,
  FaGoogle,
  FaLink,
  FaShieldAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";

// Return the modified error message so users can better understand it
const returnProperErrorMessage = (error) => {
  if (!error) return "";

  switch (error) {
    case "account_already_linked_to_different_user":
      return "This Social Account is Already Connected to Another User.";
  }
  return "";
};

// Profile component
const Profile = () => {
  // Navigate and search params
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // States
  const [profileInfo, setProfileInfo] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  // Handle OAuth error from query params
  const oauthError = searchParams.get("error");
  const oauthErrorMessage = returnProperErrorMessage(oauthError);

  // Handle refresh accounts function
  const refreshAccounts = async () => {
    const { data, error } = await authClient.listAccounts();

    if (error) {
      console.error("Could not load accounts:", error);
      setErrorMessage(error.message || "Could not load linked accounts.");
      return;
    }

    setAccounts(data || []);
  };

  // Handle link social function
  const linkSocial = async (provider) => {
    const appUrl = window.location.origin;
    setErrorMessage("");

    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: `${appUrl}/profile`,
      errorCallbackURL: `${appUrl}/profile`,
    });

    if (error) {
      console.error(`Could not link ${provider}:`, error);
      setErrorMessage(error.message || `Could not link ${provider}.`);
    }
  };

  // Handle unlink social function
  const unlinkSocial = async (providerId) => {
    setErrorMessage("");

    const { error } = await authClient.unlinkAccount({ providerId });

    if (error) {
      console.error(`Could not unlink ${providerId}:`, error);
      setErrorMessage(error.message || `Could not unlink ${providerId}.`);
      return;
    }

    await refreshAccounts();
  };

  // Handle logout function
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setErrorMessage("");

    try {
      const { error } = await authClient.signOut();

      if (error) {
        console.error("Logout failed:", error);
        setErrorMessage(error.message || "Logout failed.");
        setIsLoggingOut(false);
        return;
      }

      await refreshSocketConnection();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error);
      setErrorMessage("Logout failed.");
      setIsLoggingOut(false);
    }
  };

  // Handle displayname change
  const handleDisplayNameChange = async () => {
    const cleanDisplayName = displayNameInput.trim();

    if (!cleanDisplayName) {
      setErrorMessage("Display name cannot be empty.");
      return;
    }

    setErrorMessage("");
    setIsSavingDisplayName(true);

    const { error } = await authClient.updateUser({
      displayUsername: cleanDisplayName,
      name: cleanDisplayName,
    });

    if (error) {
      setErrorMessage(error.message || "Could not update display name.");
      setIsSavingDisplayName(false);
      return;
    }

    setProfileInfo((currentProfile) => ({
      ...currentProfile,
      displayName: cleanDisplayName,
    }));

    setIsEditingDisplayName(false);
    setIsSavingDisplayName(false);
  };

  // Fetch profile info on mount
  useEffect(() => {
    let cancelled = false;

    const fetchProfileInfo = async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setProfileInfo(data);
        }
      } catch (error) {
        console.error("Error fetching profile info:", error);

        if (!cancelled) {
          setErrorMessage("Could not load profile data.");
        }
      }
    };

    fetchProfileInfo();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Fetch linked accounts on mount
  useEffect(() => {
    let cancelled = false;

    authClient.listAccounts().then(({ data, error }) => {
      if (cancelled) return;

      if (error) {
        console.error("Could not load accounts:", error);
        setErrorMessage(error.message || "Could not load linked accounts.");
        return;
      }

      setAccounts(data || []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // If profile info is not yet loaded, show a loading state
  if (!profileInfo) {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        LOADING PROFILE...
      </main>
    );
  }

  // Determine which social accounts are linked
  const googleLinked = accounts.some(
    (account) => account.providerId === "google",
  );
  const githubLinked = accounts.some(
    (account) => account.providerId === "github",
  );
  const discordLinked = accounts.some(
    (account) => account.providerId === "discord",
  );
  const linkedCount = accounts.length;

  // Check if the user has a username
  const hasUsername = Boolean(profileInfo.username?.trim());

  // Define social accounts array for rendering
  const socialAccounts = [
    {
      provider: "google",
      label: "Google Account",
      Icon: FaGoogle,
      linked: googleLinked,
    },
    {
      provider: "github",
      label: "GitHub Account",
      Icon: FaGithub,
      linked: githubLinked,
    },
    {
      provider: "discord",
      label: "Discord Account",
      Icon: FaDiscord,
      linked: discordLinked,
    },
  ];

  // Determine the visible error message to display (oAuth priority)
  const visibleError = oauthErrorMessage || errorMessage;

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
        <header className="mb-12 text-center">
          <h1 className="font-mono text-4xl font-black tracking-[0.14em] text-[#ffd89a]">
            PROFILE
          </h1>
          <div className="mx-auto mt-4 h-1 w-12 bg-[#ffd89a]" />
        </header>

        {!hasUsername && (
          <Link
            to="/choose-username"
            className="mb-6 block cursor-pointer border border-[#d99a6c] bg-[#2a1b16] px-5 py-4 text-center font-mono text-sm font-black tracking-[0.1em] text-[#ffd0aa] transition hover:bg-[#3a241b]"
          >
            NEED USERNAME TO PLAY
          </Link>
        )}

        {visibleError && (
          <p className="mb-6 border border-red-900 bg-red-950/40 px-4 py-3 font-mono text-xs text-red-300">
            ERROR: {visibleError}
          </p>
        )}

        <section className="border border-[#5d5549] bg-[#0e0e0e]/95 p-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f]">
              ACCOUNT DETAILS
            </h2>
            <FaShieldAlt className="text-[#b9a282]" size={14} />
          </div>

          <div className="space-y-5 font-mono">
            <div>
              <p className="mb-1 text-sm text-[#c6baa5]">Username:</p>
              <p className="text-lg font-bold text-[#ffd89a]">
                {hasUsername ? profileInfo.username : "NOT ASSIGNED"}
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm text-[#c6baa5]">Display Name:</p>

                {!isEditingDisplayName && (
                  <button
                    className="cursor-pointer font-mono text-xs font-bold tracking-wider text-[#ffd89a] transition hover:text-[#ffe4b4]"
                    type="button"
                    onClick={() => {
                      setDisplayNameInput(profileInfo.displayName || "");
                      setIsEditingDisplayName(true);
                    }}
                  >
                    EDIT
                  </button>
                )}
              </div>

              {isEditingDisplayName ? (
                <div className="flex gap-2">
                  <form
                    className="flex gap-2 w-full"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleDisplayNameChange();
                    }}
                  >
                    <input
                      className="min-w-0 flex-1 border border-[#645a4b] bg-[#222120] px-3 py-2 font-mono text-sm text-[#f0ece5] outline-none focus:border-[#ffd89a]"
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      maxLength={24}
                      autoFocus
                    />

                    <button
                      className="cursor-pointer border border-[#ffd89a] px-3 font-mono text-xs font-bold text-[#ffd89a] transition hover:bg-[#ffd89a] hover:text-[#241d14] disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={isSavingDisplayName}
                    >
                      {isSavingDisplayName ? "..." : "SAVE"}
                    </button>

                    <button
                      className="cursor-pointer border border-[#5d5549] px-3 font-mono text-xs font-bold text-[#c6baa5] transition hover:border-[#c6baa5] disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={() => setIsEditingDisplayName(false)}
                      disabled={isSavingDisplayName}
                    >
                      CANCEL
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-lg font-bold text-[#e8d9c0]">
                  {profileInfo.displayName || "UNAVAILABLE"}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-5 px-1 font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f]">
            LINKED ACCOUNTS
          </h2>

          <div className="space-y-3">
            {socialAccounts.map(({ provider, label, Icon, linked }) => (
              <div
                key={provider}
                className="flex items-center gap-4 border border-[#5d5549] bg-[#242322] px-5 py-4"
              >
                <Icon className="text-[#e8d9c0]" size={20} />

                <span className="flex-1 font-mono text-sm font-bold text-[#e8d9c0]">
                  {label}
                </span>

                {linked ? (
                  <button
                    className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold tracking-wider text-[#b9a282] transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    onClick={() => unlinkSocial(provider)}
                    disabled={linkedCount <= 1}
                    title={
                      linkedCount <= 1
                        ? "You must keep at least one login method."
                        : `Unlink ${label}`
                    }
                  >
                    <FaLink size={15} />
                    UNLINK
                  </button>
                ) : (
                  <button
                    className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold tracking-wider text-[#ffd89a] transition hover:text-[#ffe4b4]"
                    type="button"
                    onClick={() => linkSocial(provider)}
                  >
                    <FaLink size={15} />
                    LINK
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7 border border-[#5d5549] bg-[#0e0e0e]/95 p-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f]">
              GAME STATISTICS
            </h2>
            <span className="text-[#b9a282]">▥</span>
          </div>

          <div className="grid grid-cols-3">
            <div>
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Played</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {profileInfo.matches_played || 0}
              </p>
            </div>

            <div className="border-l border-[#5d5549] pl-7">
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Won</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {profileInfo.matches_won || 0}
              </p>
            </div>

            <div className="border-l border-[#5d5549] pl-7">
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Win Rate</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {profileInfo.matches_won && profileInfo.matches_played
                  ? `${Math.round((profileInfo.matches_won / profileInfo.matches_played) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 text-center">
          <button
            className="inline-flex cursor-pointer items-center gap-3 border border-[#c9847c] px-8 py-3 font-mono text-sm font-bold tracking-[0.14em] text-[#e6aaa2] transition hover:bg-[#301c1b] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <FaSignOutAlt size={15} />
            {isLoggingOut ? "LOGGING OUT..." : "LOGOUT"}
          </button>
        </div>

        <footer className="mt-9 text-center font-mono text-xs tracking-[0.1em] text-[#504c45]">
          CODE_CHAMBER.v1.0.0 // SESSION_SECURE
        </footer>
      </section>
    </main>
  );
};

export default Profile;
