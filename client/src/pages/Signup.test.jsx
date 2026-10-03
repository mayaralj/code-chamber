// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Signup from "./Signup";
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
    signIn: { social: vi.fn() },
    signUp: { email: vi.fn() },
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
const SUBMIT_LABEL = "CREATE ACCOUNT >_";

// Helper to render the Signup component within a MemoryRouter for testing, allowing for navigation and route handling
const renderSignup = (initialPath = "/signup") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Signup />
    </MemoryRouter>,
  );

// Helper to fill the username and password fields in the Signup form for testing purposes
const fillForm = (username, password) => {
  fireEvent.change(screen.getByPlaceholderText("choose_username"), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: password },
  });
};

// Helper to submit the Signup form by clicking the submit button, simulating a user action in tests
const submitForm = () => {
  fireEvent.click(screen.getByRole("button", { name: /CREATE ACCOUNT/ }));
};

// beforeEach and afterEach hooks to reset mocks and spies before and after each test, ensuring a clean state for each test case
beforeEach(() => {
  useStableSession.mockReturnValue({ suppressGuards: false, setSuppressGuards: vi.fn() });
  navigateMock.mockClear();
  authClient.signIn.social.mockReset();
  authClient.signUp.email.mockReset();
  refreshSocketConnection.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("localStorage", createLocalStorageMock());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Tests for signup page
describe("Signup - form basics", () => {
  it("renders username and password fields and an enabled submit button", () => {
    renderSignup();

    expect(screen.getByPlaceholderText("choose_username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
  });

  it("updates form state as the user types", () => {
    renderSignup();

    fillForm("alice", "hunter2");

    expect(screen.getByPlaceholderText("choose_username")).toHaveValue("alice");
    expect(screen.getByPlaceholderText("••••••••")).toHaveValue("hunter2");
  });

  it("renders a link to the login page", () => {
    renderSignup();

    expect(screen.getByRole("link", { name: "LOGIN HERE" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("Signup - initial error from query params", () => {
  it("shows no error when there is no error query param", () => {
    renderSignup("/signup");

    expect(screen.queryByText(/^ERROR:/)).not.toBeInTheDocument();
  });

  it("shows the friendly account-linking message for account_not_linked", () => {
    renderSignup("/signup?error=account_not_linked");

    expect(
      screen.getByText(
        /An account already exists with this email\. Log in using your password/,
      ),
    ).toBeInTheDocument();
  });

  it("reflects any other error query param value verbatim", () => {
    renderSignup("/signup?error=some_provider_error");

    expect(screen.getByText("ERROR: some_provider_error")).toBeInTheDocument();
  });
});

describe("Signup - manual submit", () => {
  it("calls signUp.email with trimmed username, password, and a derived lowercase email", async () => {
    authClient.signUp.email.mockResolvedValue({ data: { user: {} } });
    refreshSocketConnection.mockResolvedValue();
    renderSignup();

    fillForm("  Alice  ", "hunter2");
    await act(async () => {
      submitForm();
    });

    expect(authClient.signUp.email).toHaveBeenCalledWith({
      name: "Alice",
      username: "Alice",
      password: "hunter2",
      email: "alice@users.yourapp.invalid",
    });
  });

  it("shows the creating-account state and disables the submit button while in flight", () => {
    authClient.signUp.email.mockReturnValue(new Promise(() => {}));
    renderSignup();
    fillForm("alice", "hunter2");

    submitForm();

    expect(
      screen.getByRole("button", { name: "CREATING ACCOUNT..." }),
    ).toBeDisabled();
  });

  it("shows the server error message when signUp.email returns an error", async () => {
    authClient.signUp.email.mockResolvedValue({
      error: { message: "Username already taken" },
    });
    renderSignup();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(
      screen.getByText("ERROR: Username already taken"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows a fallback error message when the error has no message", async () => {
    authClient.signUp.email.mockResolvedValue({ error: {} });
    renderSignup();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(
      screen.getByText("ERROR: Unable to create account."),
    ).toBeInTheDocument();
  });

  it("shows a fallback error message when signUp.email throws", async () => {
    authClient.signUp.email.mockRejectedValue(new Error());
    renderSignup();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(
      screen.getByText("ERROR: Something went wrong. Try again."),
    ).toBeInTheDocument();
  });

  it("clears a previous error message when a new submit attempt starts", async () => {
    authClient.signUp.email.mockResolvedValueOnce({
      error: { message: "Username already taken" },
    });
    renderSignup();
    fillForm("alice", "hunter2");
    await act(async () => {
      submitForm();
    });
    expect(
      screen.getByText("ERROR: Username already taken"),
    ).toBeInTheDocument();

    authClient.signUp.email.mockReturnValue(new Promise(() => {}));
    submitForm();

    expect(
      screen.queryByText("ERROR: Username already taken"),
    ).not.toBeInTheDocument();
  });

  it("refreshes the socket connection and navigates to /profile on success", async () => {
    authClient.signUp.email.mockResolvedValue({ data: { user: { id: "u1" } } });
    refreshSocketConnection.mockResolvedValue();
    renderSignup();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(refreshSocketConnection).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/profile", { replace: true });
  });

  it("still navigates to /profile even if refreshSocketConnection fails, since the account was already created", async () => {
    authClient.signUp.email.mockResolvedValue({ data: { user: { id: "u1" } } });
    refreshSocketConnection.mockRejectedValue(new Error("socket down"));
    renderSignup();
    fillForm("alice", "hunter2");

    await act(async () => {
      submitForm();
    });

    expect(console.error).toHaveBeenCalledWith(
      "Signup succeeded but socket refresh failed:",
      expect.any(Error),
    );
    expect(
      screen.queryByText("ERROR: Something went wrong. Try again."),
    ).not.toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith("/profile", { replace: true });
  });
});

describe("Signup - social signup", () => {
  it("calls signIn.social with the provider and callback URLs derived from window.location.origin", async () => {
    authClient.signIn.social.mockResolvedValue({});
    renderSignup();

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
    renderSignup();

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
    renderSignup();

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
    renderSignup();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );
    });

    expect(screen.getByText("ERROR: OAuth denied")).toBeInTheDocument();
  });

  it("shows a fallback error message when signIn.social throws", async () => {
    authClient.signIn.social.mockRejectedValue(new Error());
    renderSignup();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );
    });

    expect(
      screen.getByText("ERROR: Something went wrong. Try again."),
    ).toBeInTheDocument();
  });

  it("disables all social buttons while a manual submit is already in flight", () => {
    authClient.signUp.email.mockReturnValue(new Promise(() => {}));
    renderSignup();
    fillForm("alice", "hunter2");

    submitForm();

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

  it("disables the manual submit button while a social login is already in flight", () => {
    authClient.signIn.social.mockReturnValue(new Promise(() => {}));
    renderSignup();

    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(
      screen.getByRole("button", { name: "CREATING ACCOUNT..." }),
    ).toBeDisabled();
  });
});
