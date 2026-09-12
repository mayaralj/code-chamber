// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ChooseUsername from "./ChooseUsername";

// Mocks
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));
const authClientMocks = {
  updateUser: vi.fn(),
};
vi.mock("../authClient", () => ({
  default: {
    updateUser: (...args) => authClientMocks.updateUser(...args),
  },
}));
const refreshSocketConnection = vi.fn();
vi.mock("../socket", () => ({
  refreshSocketConnection: (...args) => refreshSocketConnection(...args),
}));

// Helper to flush pending promises and allow React to commit state updates
const flush = () => act(async () => await Promise.resolve());

// Helper functions to get the input and submit button elements for testing
const getInput = () => screen.getByPlaceholderText("USER_ID");
const getSubmitButton = () =>
  screen.getByRole("button", { name: /CONFIRM IDENTITY|CONFIRMING/ });

// Helper to submit the form directly by firing a submit event on the form element
const submitFormDirectly = (container) =>
  fireEvent.submit(container.querySelector("form"));

// Before each test, clear mocks and reset their implementations to ensure a clean slate for each test
beforeEach(() => {
  mockNavigate.mockClear();
  authClientMocks.updateUser.mockReset().mockResolvedValue({ error: null });
  refreshSocketConnection.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// After each test, restore all mocks to their original implementations to avoid affecting other tests
afterEach(() => {
  vi.restoreAllMocks();
});

// Tests for the ChooseUsername page
describe("ChooseUsername - rendering", () => {
  it("renders the username input and submit button", () => {
    render(<ChooseUsername />);

    expect(getInput()).toBeInTheDocument();
    expect(screen.getByText("CONFIRM IDENTITY")).toBeInTheDocument();
    expect(screen.queryByText(/^ERROR:/)).not.toBeInTheDocument();
  });

  it("updates the input value as the user types", () => {
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });

    expect(getInput()).toHaveValue("coolcoder");
  });
});

describe("ChooseUsername - client-side validation", () => {
  it("shows an error and does not call updateUser when submitting an empty username", async () => {
    const { container } = render(<ChooseUsername />);

    submitFormDirectly(container);
    await flush();

    expect(screen.getByText(/Username cannot be empty\./)).toBeInTheDocument();
    expect(authClientMocks.updateUser).not.toHaveBeenCalled();
  });

  it("shows an error when submitting a whitespace-only username", async () => {
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "   " } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(screen.getByText(/Username cannot be empty\./)).toBeInTheDocument();
    expect(authClientMocks.updateUser).not.toHaveBeenCalled();
  });

  it("clears a previous error once a valid submission succeeds", async () => {
    const { container } = render(<ChooseUsername />);

    submitFormDirectly(container);
    await flush();
    expect(screen.getByText(/Username cannot be empty\./)).toBeInTheDocument();

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(
      screen.queryByText(/Username cannot be empty\./),
    ).not.toBeInTheDocument();
  });
});

describe("ChooseUsername - successful submission", () => {
  it("trims and lowercases the username for the username field, but preserves case for displayUsername/name", async () => {
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "  CoolCoder  " } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(authClientMocks.updateUser).toHaveBeenCalledWith({
      username: "coolcoder",
      displayUsername: "CoolCoder",
      name: "CoolCoder",
    });
  });

  it("refreshes the socket connection and navigates to /profile on success", async () => {
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(refreshSocketConnection).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/profile", { replace: true });
  });

  it("still navigates to /profile even if the socket refresh throws", async () => {
    refreshSocketConnection.mockRejectedValue(new Error("socket down"));
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(mockNavigate).toHaveBeenCalledWith("/profile", { replace: true });
  });

  it("shows CONFIRMING... and disables the button while submitting", async () => {
    let resolveUpdate;
    authClientMocks.updateUser.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());

    const button = screen.getByRole("button", { name: /CONFIRMING/ });
    expect(button).toBeDisabled();

    await act(async () => {
      resolveUpdate({ error: null });
      await Promise.resolve();
    });
  });
});

describe("ChooseUsername - failed submission", () => {
  it("shows the server error message and does not navigate when updateUser fails", async () => {
    authClientMocks.updateUser.mockResolvedValue({
      error: { message: "Username already taken." },
    });
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(screen.getByText(/Username already taken\./)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(refreshSocketConnection).not.toHaveBeenCalled();
  });

  it("falls back to a generic error message when the server error has no message", async () => {
    authClientMocks.updateUser.mockResolvedValue({ error: {} });
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(screen.getByText(/Could not save username\./)).toBeInTheDocument();
  });

  it("re-enables the submit button after a failed submission", async () => {
    authClientMocks.updateUser.mockResolvedValue({
      error: { message: "Username already taken." },
    });
    render(<ChooseUsername />);

    fireEvent.change(getInput(), { target: { value: "coolcoder" } });
    fireEvent.click(getSubmitButton());
    await flush();

    expect(
      screen.getByRole("button", { name: /CONFIRM IDENTITY/ }),
    ).not.toBeDisabled();
  });
});
