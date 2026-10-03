// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Login from "./Login";
import { createLocalStorageMock } from "../test/localStorageMock";

import useStableSession from "../hooks/useStableSession";

// Mocks
vi.mock("../hooks/useStableSession", () => ({ default: vi.fn() }));
const navigateMock = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});
vi.mock("../authClient", () => ({
  default: {
    signIn: {
      social: vi.fn(),
      username: vi.fn(),
    },
  },
}));
vi.mock("../socket", () => ({
  refreshSocketConnection: vi.fn(),
}));
vi.mock("../utils/timeout", () => ({
  withTimeout: (promise) => promise,
}));

// Imports after mocks
import authClient from "../authClient";
import { refreshSocketConnection } from "../socket";

// Vars
const SUBMIT_LABEL = "EXECUTE LOGIN >_";

// Helper to render the Login component within a MemoryRouter for testing
const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

// Helper to fill the login form with the given username and password
const fillForm = (username, password) => {
  fireEvent.change(screen.getByPlaceholderText("enter_username"), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: password },
  });
};

// Helper to submit the login form by clicking the submit button
const submitForm = () => {
  fireEvent.click(screen.getByRole("button", { name: /EXECUTE LOGIN/ }));
};

// beforeEach and afterEach hooks to reset mocks and spies before and after each test
beforeEach(() => {
  useStableSession.mockReturnValue({ suppressGuards: false, setSuppressGuards: vi.fn() });
  navigateMock.mockClear();
  authClient.signIn.social.mockReset();
  authClient.signIn.username.mockReset();
  refreshSocketConnection.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("localStorage", createLocalStorageMock());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Login page tests
describe("Login - form basics", () => {
  it("renders username and password fields and an enabled submit button", () => {
    renderLogin();

    expect(screen.getByPlaceholderText("enter_username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
  });

  it("updates form state as the user types", () => {
    renderLogin();

    fillForm("alice", "hunter2");

    expect(screen.getByPlaceholderText("enter_username")).toHaveValue("alice");
    expect(screen.getByPlaceholderText("••••••••")).toHaveValue("hunter2");
  });

  it("renders a link to the signup page", () => {
    renderLogin();

    expect(screen.getByRole("link", { name: "SIGN UP HERE" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });
});

describe("Login - manual submit", () => {
  it("calls signIn.username with the trimmed username and password", async () => {
    authClient.signIn.username.mockResolvedValue({ data: { user: {} } });
    refreshSocketConnection.mockResolvedValue();
    renderLogin();

    fillForm("  alice  ", "hunter2");
    await act(async () => {
      submitForm();
    });

    expect(authClient.signIn.username).toHaveBeenCalledWith({
      username: "alice",
      password: "hunter2",
    });
  });

  it("shows the authenticating state and disables the submit button while in flight", () => {
    let resolveSignIn;
    authClient.signIn.username.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    renderLogin();
    fillForm("alice", "hunter2");

    submitForm();

    expect(
      screen.getByRole("button", { name: "AUTHENTICATING..." }),
    ).toBeDisabled();

    resolveSignIn({ data: { user: {} } });
  });

  it("shows the server error message when signIn.username returns an error", async () => {
    authClient.signIn.username.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    renderLogin();
    fillForm("alice", "wrongpass");

    await act(async () => {
      submitForm();
    });

    expect(screen.getByText("ERROR: Invalid credentials")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows a fallback error message when the error has no message", async () => {
    authClient.signIn.username.mockResolvedValue({ error: {} });
    renderLogin();
    fillForm("alice", "wrongpass");

    await act(async () => {
      submitForm();
    });

    expect(
      screen.getByText("ERROR: Invalid username or password."),
    ).toBeInTheDocument();
  });

  it("shows a fallback error message when signIn.username throws", async () => {
    authClient.signIn.username.mockRejectedValue(new Error());
    renderLogin();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(
      screen.getByText("ERROR: Something went wrong. Try again."),
    ).toBeInTheDocument();
  });

  it("shows the thrown error's message when available", async () => {
    authClient.signIn.username.mockRejectedValue(
      new Error("Network unreachable"),
    );
    renderLogin();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(screen.getByText("ERROR: Network unreachable")).toBeInTheDocument();
  });

  it("clears a previous error message when a new submit attempt starts", async () => {
    authClient.signIn.username.mockResolvedValueOnce({
      error: { message: "Invalid credentials" },
    });
    renderLogin();
    fillForm("alice", "wrongpass");
    await act(async () => {
      submitForm();
    });
    expect(screen.getByText("ERROR: Invalid credentials")).toBeInTheDocument();

    authClient.signIn.username.mockReturnValue(new Promise(() => {}));
    submitForm();

    expect(
      screen.queryByText("ERROR: Invalid credentials"),
    ).not.toBeInTheDocument();
  });

  it("refreshes the socket connection and navigates to /profile on success", async () => {
    authClient.signIn.username.mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    refreshSocketConnection.mockResolvedValue();
    renderLogin();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(refreshSocketConnection).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/profile", { replace: true });
  });

  it("still navigates to /profile even if refreshSocketConnection fails", async () => {
    authClient.signIn.username.mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    refreshSocketConnection.mockRejectedValue(new Error("socket down"));
    renderLogin();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(console.error).toHaveBeenCalledWith(
      "Login succeeded but socket refresh failed:",
      expect.any(Error),
    );
    expect(navigateMock).toHaveBeenCalledWith("/profile", { replace: true });
  });
});

describe("Login - social login", () => {
  it("calls signIn.social with the provider and callback URLs derived from window.location.origin", async () => {
    authClient.signIn.social.mockResolvedValue({});
    renderLogin();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );
    });

    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${window.location.origin}/profile`,
      newUserCallbackURL: `${window.location.origin}/choose-username`,
      errorCallbackURL: `${window.location.origin}/signup`,
    });
  });

  it("calls signIn.social with 'github' for the GitHub button", async () => {
    authClient.signIn.social.mockResolvedValue({});
    renderLogin();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with GitHub" }),
      );
    });

    expect(authClient.signIn.social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "github" }),
    );
  });

  it("calls signIn.social with 'discord' for the Discord button", async () => {
    authClient.signIn.social.mockResolvedValue({});
    renderLogin();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Discord" }),
      );
    });

    expect(authClient.signIn.social).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "discord" }),
    );
  });

  it("shows an error message when signIn.social returns an error", async () => {
    authClient.signIn.social.mockResolvedValue({
      error: { message: "OAuth denied" },
    });
    renderLogin();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );
    });

    expect(screen.getByText("ERROR: OAuth denied")).toBeInTheDocument();
    expect(localStorage.getItem("wasLoggedIn")).toBe("false");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("shows a fallback error message when signIn.social throws", async () => {
    authClient.signIn.social.mockRejectedValue(new Error());
    renderLogin();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );
    });

    expect(
      screen.getByText("ERROR: Something went wrong. Try again."),
    ).toBeInTheDocument();
  });

  it("remains in a loading state with no error on a successful social login (browser redirect assumed)", async () => {
    authClient.signIn.social.mockResolvedValue({});
    renderLogin();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );
    });

    expect(
      screen.getByRole("button", { name: "AUTHENTICATING..." }),
    ).toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe("Login - social buttons respect isLoading (fixed)", () => {
  it("disables the social login buttons while a manual submit is already in flight", () => {
    authClient.signIn.username.mockReturnValue(new Promise(() => {}));
    renderLogin();
    fillForm("alice", "hunter2");
    submitForm();

    expect(
      screen.getByRole("button", { name: "AUTHENTICATING..." }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with GitHub" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeDisabled();
  });
});
