// Imports
import { useEffect, useState, useRef, useCallback } from "react";
import {
  FaDiscord,
  FaGithub,
  FaGoogle,
  FaLink,
  FaShieldAlt,
  FaSignOutAlt,
  FaTimes,
  FaClipboardList,
  FaChevronDown,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router";
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";

// Config
const FETCH_TIMEOUT = 10 * 1000;
const MATCH_HISTORY_PAGE_SIZE = 5;

// Return the modified error message so users can better understand it
const returnProperErrorMessage = (error) => {
  if (!error) return "";

  switch (error) {
    case "account_already_linked_to_different_user":
      return "This Social Account is Already Connected to Another User.";
  }
  return "";
};

// Format a numeric-or-"N/A" stat for display
const formatStat = (value, suffix = "") =>
  value === "N/A" || value === null || value === undefined
    ? "N/A"
    : `${value}${suffix}`;

// Round a numeric-or-"N/A" stat to 2 decimal places, passing "N/A" through untouched
const roundStat = (value) =>
  typeof value === "number" ? Math.round(value * 100) / 100 : value;

// Format a total-seconds duration as MM:SS
const formatDuration = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) {
    return "N/A";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// Profile component
const Profile = () => {
  // Navigate and search params
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // States
  const [profileInfo, setProfileInfo] = useState(null);
  const [profileFetchStatus, setProfileFetchStatus] = useState("fetching");
  const [matchHistory, setMatchHistory] = useState(null);
  const [matchFetchError, setMatchFetchError] = useState("");
  const [isLoadingMoreMatches, setIsLoadingMoreMatches] = useState(false);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [isLanguageStatsOpen, setIsLanguageStatsOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Refs
  const abortControllerRef = useRef(null);
  const matchAbortControllerRef = useRef(null);

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
      localStorage.setItem("wasLoggedIn", "false");
    } catch (error) {
      console.error("Error during logout:", error);
      setErrorMessage("Logout failed.");
      setIsLoggingOut(false);
    }

    try {
      await refreshSocketConnection();
    } catch (error) {
      console.error("Error refreshing socket connection after logout:", error);
    }
    navigate("/", { replace: true });
  };

  // Handle delete account function (UI only for now, logic to be added later)
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setErrorMessage("");
    try {
      const { error } = await authClient.deleteUser();

      if (error) {
        setErrorMessage(error.message || "Could not delete account.");
        setIsDeletingAccount(false);
        return;
      }

      localStorage.setItem("wasLoggedIn", "false");
    } catch (error) {
      console.error(
        "Error refreshing socket connection after delete account:",
        error,
      );
      setErrorMessage("Error occurred while deleting account.");
      setIsDeletingAccount(false);
    }

    try {
      await refreshSocketConnection();
    } catch (error) {
      console.error(
        "Error refreshing socket connection after delete account:",
        error,
      );
    }
    navigate("/", { replace: true });
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

  const fetchProfileInfo = useCallback(async () => {
    // Cancel any ongoing fetch if it exists
    abortControllerRef.current?.abort();
    // Create new controller
    abortControllerRef.current = new AbortController();

    // Fetch profile info
    try {
      // Combine the abort signal with a timeout to ensure the fetch doesn't hang indefinitely
      const combinedSignal = AbortSignal.any([
        abortControllerRef.current.signal,
        AbortSignal.timeout(FETCH_TIMEOUT),
      ]);
      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        // Add the signal from the abort controller to the fetch request
        signal: combinedSignal,
      });

      // Log repsonse text
      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      setProfileInfo(data);
      setMatchHistory(data.matches);
      setProfileFetchStatus("success");
    } catch (error) {
      // ignore abort error
      if (error.name === "AbortError") {
        return;
      }
      setProfileFetchStatus("error");
    }
  }, [navigate]);

  // Fetch profile info on mount
  useEffect(() => {
    fetchProfileInfo();

    return () => {
      // Abort any ongoing fetch when the component unmounts
      abortControllerRef.current?.abort();
    };
  }, [fetchProfileInfo]);

  // Helper to fetch more matches
  const fetchMatchHistory = useCallback(
    async (offset = 0, limit = MATCH_HISTORY_PAGE_SIZE) => {
      setMatchFetchError("");
      matchAbortControllerRef.current?.abort();
      matchAbortControllerRef.current = new AbortController();

      try {
        const combinedSignal = AbortSignal.any([
          matchAbortControllerRef.current.signal,
          AbortSignal.timeout(FETCH_TIMEOUT),
        ]);

        const params = new URLSearchParams({ limit, offset });

        const response = await fetch(`/api/matchHistory?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: combinedSignal,
        });

        if (response.status === 401) {
          setMatchFetchError("Error Fetching Match History");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        setMatchHistory((current) =>
          offset === 0 ? data : [...current, ...data],
        );
        return data;
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setMatchFetchError("Error Fetching Match History");
      }
    },
    [],
  );

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

  // helper to handle retry profile fetch
  const refetchProfileInfo = () => {
    setProfileFetchStatus("fetching");
    fetchProfileInfo();
  };

  // Open the "ALL MATCHES" modal, resetting pagination back to the first page
  const openMatchHistoryModal = () => {
    setIsMatchHistoryOpen(true);
  };

  // Close the "ALL MATCHES" modal, resetting pagination
  const closeMatchHistoryModal = () => {
    setIsMatchHistoryOpen(false);
  };

  // Reveal the next page of matches
  const loadMoreMatches = async () => {
    if (isLoadingMoreMatches || !hasMoreMatches) return;

    setIsLoadingMoreMatches(true);
    const newMatches = await fetchMatchHistory(matchHistory.length);
    setIsLoadingMoreMatches(false);

    // If the server returned fewer than a full page, no more matches to load
    if (!newMatches || newMatches.length < MATCH_HISTORY_PAGE_SIZE) {
      setHasMoreMatches(false);
    }
  };

  // If profile info fetch error'd out, show an error message with a retry button
  if (profileFetchStatus === "error") {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] px-4 font-mono text-[#e7c49d]">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ffd89a]/40 bg-[#ffd89a]/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-6 w-6 text-[#ffd89a]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.007M12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z"
              />
            </svg>
          </div>

          <p className="text-sm font-bold uppercase tracking-wide text-[#ffd89a]">
            Couldn't load profile
          </p>
          <p className="text-xs text-[#e7c49d]/70">
            Something went wrong while fetching your profile. Please wait and
            try again.
          </p>

          <button
            type="button"
            onClick={refetchProfileInfo}
            className="mt-2 cursor-pointer rounded border border-[#ffd89a] px-5 py-2 font-mono text-sm font-bold text-[#ffd89a] transition-colors duration-150 hover:bg-[#ffd89a] hover:text-[#241d14] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd89a]/60"
          >
            RETRY
          </button>
        </div>
      </main>
    );
  } else if (profileFetchStatus === "fetching" || !profileInfo) {
    // If profile info is still being fetched, show a loading state
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

  // Pull game stats from the profle info
  const gameStats = profileInfo.gameStats ?? {};
  const {
    matches_played: matchesPlayed = 0,
    matches_won: matchesWon = 0,
    win_rate: winRate = "N/A",
    total_submissions: totalSubmissions = 0,
    passed_submissions: passedSubmissions = 0,
    pass_rate: passRate = "N/A",
    avg_execution_time: avgExecutionTime = "N/A",
    avg_submission_time: avgSubmissionTime = "N/A",
    languageStats = [],
  } = gameStats;

  // Build the "ALL" summary card plus one card per language for the modal
  const allLanguageStatsForModal = [
    {
      language: "ALL",
      total_submissions: totalSubmissions,
      passed_submissions: passedSubmissions,
      pass_rate: passRate,
      avg_execution_time: avgExecutionTime,
      avg_submission_time: avgSubmissionTime,
    },
    ...languageStats,
  ];

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
                    className={`flex cursor-pointer items-center gap-2 font-mono text-xs font-bold tracking-wider text-[#b9a282] transition ${linkedCount > 1 && "hover:text-red-300"} disabled:cursor-not-allowed disabled:opacity-40`}
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
                {matchesPlayed}
              </p>
            </div>

            <div className="border-l border-[#5d5549] pl-7">
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Won</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {matchesWon}
              </p>
            </div>

            <div className="border-l border-[#5d5549] pl-7">
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Win Rate</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {Number.isFinite(winRate)
                  ? `${Math.round(winRate * 100)}%`
                  : "N/A"}{" "}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 border-t border-[#5d5549] pt-6">
            <div>
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">
                Submissions
              </p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {totalSubmissions}
              </p>
            </div>

            <div className="border-l border-[#5d5549] pl-7">
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Passed</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {passedSubmissions}
              </p>
            </div>

            <div className="border-l border-[#5d5549] pl-7">
              <p className="mb-2 font-mono text-sm text-[#c6baa5]">Pass Rate</p>
              <p className="font-mono text-3xl font-black text-[#ffd89a]">
                {Number.isFinite(passRate)
                  ? `${Math.round(passRate * 100)}%`
                  : "N/A"}{" "}
              </p>
            </div>
          </div>

          <button
            className="mt-6 w-full cursor-pointer border border-[#5d5549] py-3 font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f] transition hover:border-[#ffd89a] hover:text-[#ffd89a]"
            type="button"
            onClick={() => setIsLanguageStatsOpen(true)}
          >
            SHOW MORE
          </button>
        </section>

        <section className="mt-7 border border-[#5d5549] bg-[#0e0e0e]/95 p-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f]">
              MATCH HISTORY
            </h2>
            <FaClipboardList className="text-[#b9a282]" size={14} />
          </div>

          {matchHistory.length === 0 ? (
            <p className="font-mono text-sm text-[#c6baa5]">
              No matches played yet.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {matchHistory
                  .slice(0, 3)
                  .map((match) =>
                    renderMatchCard(match, expandedMatchId, setExpandedMatchId),
                  )}
              </div>

              {matchHistory.length > 3 && (
                <button
                  className="mt-6 w-full cursor-pointer border border-[#5d5549] py-3 font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f] transition hover:border-[#ffd89a] hover:text-[#ffd89a]"
                  type="button"
                  onClick={openMatchHistoryModal}
                >
                  SHOW MORE
                </button>
              )}
            </>
          )}
        </section>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            className="inline-flex cursor-pointer items-center gap-3 border border-[#c9847c] px-8 py-3 font-mono text-sm font-bold tracking-[0.14em] text-[#e6aaa2] transition hover:bg-[#301c1b] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <FaSignOutAlt size={15} />
            {isLoggingOut ? "LOGGING OUT..." : "LOGOUT"}
          </button>

          <button
            className="mt-2 inline-flex cursor-pointer items-center gap-3 border border-red-700 bg-red-950/20 px-8 py-3 font-mono text-sm font-bold tracking-[0.14em] text-red-400 transition hover:bg-red-950/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            <FaExclamationTriangle size={15} />
            DELETE ACCOUNT
          </button>
        </div>

        <footer className="mt-9 text-center font-mono text-xs tracking-[0.1em] text-[#504c45]">
          SESSION_SECURE
        </footer>
      </section>

      {isLanguageStatsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5"
          onClick={() => setIsLanguageStatsOpen(false)}
        >
          <div
            className="modal-scroll relative max-h-[80vh] w-full max-w-[640px] overflow-y-auto  overscroll-contain border border-[#5d5549] bg-[#0e0e0e] p-7 [scrollbar-color:#5d5549_#0e0e0e] [scrollbar-width:thin]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f]">
                LANGUAGE STATISTICS
              </h2>
              <button
                className="cursor-pointer text-[#b9a282] transition hover:text-[#ffd89a]"
                type="button"
                onClick={() => setIsLanguageStatsOpen(false)}
              >
                <FaTimes size={16} />
              </button>
            </div>

            {languageStats.length === 0 ? (
              <p className="font-mono text-sm text-[#c6baa5]">
                No submissions yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {allLanguageStatsForModal.map((stat) => {
                  return (
                    <div
                      key={stat.language}
                      className={`border p-5 ${
                        stat.language === "ALL"
                          ? "border-[#ffd89a] bg-[#211a12]"
                          : "border-[#5d5549] bg-[#181716]"
                      }`}
                    >
                      <p className="mb-4 font-mono text-sm font-bold tracking-[0.1em] text-[#ffd89a]">
                        {stat.language.toLowerCase() === "cpp"
                          ? "C++"
                          : stat.language.toUpperCase()}
                      </p>

                      <div className="grid grid-cols-5 gap-3 font-mono">
                        <div>
                          <p className="mb-1 text-xs text-[#c6baa5]">
                            Submissions
                          </p>
                          <p className="text-lg font-bold text-[#e8d9c0]">
                            {stat.total_submissions}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-[#c6baa5]">Passed</p>
                          <p className="text-lg font-bold text-[#e8d9c0]">
                            {stat.passed_submissions}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-[#c6baa5]">
                            Pass Rate
                          </p>
                          <p className="text-lg font-bold text-[#e8d9c0]">
                            {Math.round(stat.pass_rate * 100)}%
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-[#c6baa5]">
                            Avg Exec
                          </p>
                          <p className="text-lg font-bold text-[#e8d9c0]">
                            {/* Execution time rounded to 2 decimal places */}
                            {formatStat(
                              roundStat(stat.avg_execution_time),
                              "ms",
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-[#c6baa5]">
                            Avg Submit
                          </p>
                          <p className="text-lg font-bold text-[#e8d9c0]">
                            {/* Submit time rounded to 2 decimal places */}
                            {formatStat(
                              roundStat(stat.avg_submission_time),
                              "s",
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {isMatchHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5"
          onClick={closeMatchHistoryModal}
        >
          <div
            className="modal-scroll relative max-h-[80vh] w-full max-w-[560px] overflow-y-auto  overscroll-contain border border-[#5d5549] bg-[#0e0e0e] p-7 [scrollbar-color:#5d5549_#0e0e0e] [scrollbar-width:thin]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f]">
                ALL MATCHES
              </h2>
              <button
                className="cursor-pointer text-[#b9a282] transition hover:text-[#ffd89a]"
                type="button"
                onClick={closeMatchHistoryModal}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {matchHistory.map((match) =>
                renderMatchCard(match, expandedMatchId, setExpandedMatchId),
              )}
            </div>

            {hasMoreMatches && (
              <>
                {matchFetchError && matchHistory.length > 0 && (
                  <p className="mt-4 text-center font-mono text-xs text-red-300">
                    {matchFetchError}
                  </p>
                )}
                <button
                  className="mt-3 w-full cursor-pointer border border-[#5d5549] py-3 font-mono text-xs font-bold tracking-[0.17em] text-[#d9bd8f] transition hover:border-[#ffd89a] hover:text-[#ffd89a] disabled:opacity-50"
                  type="button"
                  onClick={loadMoreMatches}
                  disabled={isLoadingMoreMatches}
                >
                  {isLoadingMoreMatches ? "LOADING..." : "LOAD MORE"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5"
          onClick={() => !isDeletingAccount && setIsDeleteConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-[440px] border border-red-700 bg-[#0e0e0e] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500" size={22} />
              <h2 className="font-mono text-sm font-black tracking-[0.17em] text-red-400">
                DELETE ACCOUNT
              </h2>
            </div>

            <p className="mb-2 font-mono text-sm text-[#e8d9c0]">
              This action is{" "}
              <span className="font-bold text-red-400">permanent</span> and
              cannot be undone.
            </p>
            <p className="mb-7 font-mono text-sm text-[#c6baa5]">
              Deleting your account will remove your profile, linked accounts,
              and match history. You will be immediately signed out.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 cursor-pointer border border-[#5d5549] py-3 font-mono text-xs font-bold tracking-[0.14em] text-[#c6baa5] transition hover:border-[#c6baa5] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingAccount}
              >
                CANCEL
              </button>

              <button
                className="flex-1 cursor-pointer border border-red-600 bg-red-950/40 py-3 font-mono text-xs font-bold tracking-[0.14em] text-red-300 transition hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "DELETING..." : "DELETE MY ACCOUNT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const renderMatchCard = (match, expandedMatchId, setExpandedMatchId) => {
  const isExpanded = expandedMatchId === match.id;

  // Username only, falling back to displayName then "Deleted User"
  const hostLabel =
    match.host?.username || match.host?.displayName || "Deleted User";

  return (
    <div
      key={match.id}
      className={`border transition ${
        match.won
          ? "border-green-800 bg-green-950/30"
          : "border-red-900 bg-red-950/30"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
        className={`flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition ${
          match.won ? "hover:bg-green-950/50" : "hover:bg-red-950/50"
        }`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`font-mono text-xs font-black tracking-[0.1em] ${
              match.won ? "text-green-400" : "text-red-400"
            }`}
          >
            {match.won ? "WON" : "LOST"}
          </span>
          <div>
            <p className="font-mono text-sm font-bold text-[#e8d9c0]">
              host: {hostLabel}
            </p>
            <p className="mt-1 font-mono text-xs text-[#c6baa5]">
              {match.difficulty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-[#8a8071]">
            {match.won ? "Match Time" : "Survived"}
          </span>
          <span className="font-mono text-xs font-bold text-[#ffd89a]">
            {formatDuration(match.survivalTime)}
          </span>
          <span className="text-[#5d5549]">•</span>
          <p className="font-mono text-xs text-[#b9a282]">
            {new Date(match.date).toLocaleDateString()}
          </p>
          <FaChevronDown
            className={`text-[#b9a282] transition-transform ${isExpanded ? "rotate-180" : ""}`}
            size={12}
          />
        </div>
      </button>

      {/* Match-level summary stats, always visible without needing to expand */}
      <div className="grid grid-cols-4 gap-2 border-t border-[#5d5549]/40 bg-black/20 px-5 py-3">
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-wide text-[#8a8071]">
            Rounds
          </p>
          <p className="font-mono text-sm font-bold text-[#e8d9c0]">
            {match.totalRounds}
          </p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-wide text-[#8a8071]">
            Tests
          </p>
          <p className="font-mono text-sm font-bold text-[#e8d9c0]">
            {match.testCasesPassed}/{match.totalTestCases}
          </p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-wide text-[#8a8071]">
            Avg Exec
          </p>
          <p className="font-mono text-sm font-bold text-[#e8d9c0]">
            {formatStat(roundStat(match.avgExecutionTime), "ms")}
          </p>
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11px] uppercase tracking-wide text-[#8a8071]">
            Avg Submit
          </p>
          <p className="font-mono text-sm font-bold text-[#e8d9c0]">
            {formatStat(roundStat(match.avgSubmissionTime), "s")}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 border-t border-[#5d5549]/60 px-5 py-4">
          {match.submissions.map((submission, index) => {
            const eliminatedList = submission.eliminated ?? [];

            return (
              <div
                key={submission.id}
                className="border border-[#5d5549] bg-[#181716] p-4"
              >
                <p className="mb-3 font-mono text-xs font-bold tracking-[0.1em] text-[#ffd89a]">
                  SUBMISSION #{index + 1}
                </p>
                <div className="grid grid-cols-4 gap-3 font-mono">
                  <div>
                    <p className="mb-1 text-xs text-[#c6baa5]">Language</p>
                    <p className="text-sm font-bold text-[#e8d9c0]">
                      {submission.language.toLowerCase() === "cpp"
                        ? "C++"
                        : submission.language.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#c6baa5]">Test Cases</p>
                    <p className="text-sm font-bold text-[#e8d9c0]">
                      {submission.testCasesPassed}/{submission.totalTestCases}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#c6baa5]">Exec Time</p>
                    <p className="text-sm font-bold text-[#e8d9c0]">
                      {formatStat(roundStat(submission.executionTime), "ms")}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#c6baa5]">Submit Time</p>
                    <p className="text-sm font-bold text-[#e8d9c0]">
                      {formatStat(roundStat(submission.submissionTime), "s")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#5d5549]/50 pt-3">
                  <p className="mb-1.5 text-xs text-[#c6baa5]">Eliminated</p>
                  {eliminatedList.length === 0 ? (
                    <span className="font-mono text-sm font-medium text-[#8a8071]">
                      MISSED
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {eliminatedList.map((eliminated, eliminatedIndex) => {
                        const isYou = eliminated.displayName === "YOU";
                        const isGuest = eliminated.username === "guest";
                        const label = isYou
                          ? "YOU"
                          : eliminated.username || eliminated.displayName;

                        return (
                          <span
                            key={
                              !isGuest && eliminated.username
                                ? eliminated.username
                                : `${label}-${eliminatedIndex}`
                            }
                            className={`rounded-sm border px-2 py-0.5 font-mono text-xs font-bold ${
                              isYou
                                ? "border-[#ffd89a]/50 bg-[#ffd89a]/10 text-[#ffd89a]"
                                : "border-[#5d5549] bg-[#242322] text-[#e8d9c0]"
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Profile;
