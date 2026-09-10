// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import Navbar from "./Navbar";
import useStableSession from "../../hooks/useStableSession";

// Mocks
vi.mock("../../hooks/useStableSession");

// Helper to display the current location for testing navigation
const LocationDisplay = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

// Helper to render the Navbar component within a MemoryRouter, allowing for route testing
const renderNavbar = (initialPath = "/") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
      <LocationDisplay />
    </MemoryRouter>,
  );

// Helper to find a link by its href attribute, useful for testing navigation links
const findLinkByHref = (href) =>
  screen
    .getAllByRole("link")
    .find((link) => link.getAttribute("href") === href);

// Helper to check if a navlink is cative
const isActiveNavLink = (link) => link.className.includes("border-b-1");

// Before each test in this suite, mock the useStableSession hook to return a null session
beforeEach(() => {
  useStableSession.mockReturnValue({ session: null });
});

// Tests for the Navbar component
describe("Navbar - logo", () => {
  it("renders the CODE CHAMBER logo button", () => {
    renderNavbar();

    expect(
      screen.getByRole("button", { name: "CODE CHAMBER" }),
    ).toBeInTheDocument();
  });

  it("navigates to / when the logo is clicked", () => {
    renderNavbar("/browse");

    fireEvent.click(screen.getByRole("button", { name: "CODE CHAMBER" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });
});

describe("Navbar - primary nav links", () => {
  it("renders HOME, CREATE, BROWSE, and LEADERBOARD links with correct destinations", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "HOME" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "CREATE" })).toHaveAttribute(
      "href",
      "/create",
    );
    expect(screen.getByRole("link", { name: "BROWSE" })).toHaveAttribute(
      "href",
      "/browse",
    );
    expect(screen.getByRole("link", { name: "LEADERBOARD" })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
  });

  it("applies the active styling to the link matching the current route", () => {
    renderNavbar("/browse");

    const browseLink = screen.getByRole("link", { name: "BROWSE" });
    const homeLink = screen.getByRole("link", { name: "HOME" });

    expect(isActiveNavLink(browseLink)).toBe(true);
    expect(isActiveNavLink(homeLink)).toBe(false);
  });

  it("marks HOME as active when on the root route", () => {
    renderNavbar("/");

    expect(isActiveNavLink(screen.getByRole("link", { name: "HOME" }))).toBe(
      true,
    );
  });
});

describe("Navbar - auth area when logged out", () => {
  it("shows a LOGIN link pointing to /login when not on the login page", () => {
    renderNavbar("/browse");

    expect(findLinkByHref("/login")).toBeTruthy();
    expect(screen.getByRole("link", { name: "LOGIN" })).toBeInTheDocument();
  });

  it("shows a SIGNUP link pointing to /signup when already on the login page", () => {
    renderNavbar("/login");

    expect(findLinkByHref("/signup")).toBeTruthy();
    expect(screen.getByRole("link", { name: "SIGNUP" })).toBeInTheDocument();
  });

  it("does not render a profile link when logged out", () => {
    renderNavbar();

    expect(findLinkByHref("/profile")).toBeUndefined();
  });
});

describe("Navbar - auth area when logged in", () => {
  beforeEach(() => {
    useStableSession.mockReturnValue({ session: { id: "user-1" } });
  });

  it("shows a profile icon link pointing to /profile instead of LOGIN/SIGNUP", () => {
    renderNavbar("/browse");

    expect(findLinkByHref("/login")).toBeUndefined();
    expect(findLinkByHref("/signup")).toBeUndefined();
    expect(findLinkByHref("/profile")).toBeTruthy();
  });

  it("applies active styling to the profile icon link when on /profile", () => {
    renderNavbar("/profile");

    const profileLink = findLinkByHref("/profile");
    expect(profileLink.className).toContain("text-[#ffd99d]");
    expect(profileLink.className).toContain("bg-[#232330]");
  });

  it("shows the profile link, not SIGNUP, even while on the /login route", () => {
    renderNavbar("/login");

    expect(findLinkByHref("/profile")).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "SIGNUP" }),
    ).not.toBeInTheDocument();
  });
});
