// Imports
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StableSessionContext from "../../context/StableSessionContext";
import RequireLogin from "./RequireLogin";
import RequireNotLoggedIn from "./RequireNotLoggedIn";
import RequireUsername from "./RequireUsername";
import RequireNoUsername from "./RequireNoUsername";
import toast from "react-hot-toast";

// Mocks
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

// Before each clear all mocks
beforeEach(() => vi.clearAllMocks());

// Cases to test
const cases = [
  ["logged-out profile", RequireLogin, null, "/login"],
  [
    "logged-in login page",
    RequireNotLoggedIn,
    { user: { username: "alice" } },
    "/profile",
  ],
  ["missing username", RequireUsername, { user: {} }, "/choose-username"],
  ["logged-out username page", RequireNoUsername, null, "/login"],
  [
    "completed username",
    RequireNoUsername,
    { user: { username: "alice" } },
    "/profile",
  ],
];

// Tests
describe.each(cases)(
  "authentication guard: %s",
  (_name, Guard, session, destination) => {
    it.each([true, false])("suppression=%s", async (suppressed) => {
      const guardTree = (suppressed) => (
        <StableSessionContext.Provider
          value={{
            session,
            isPending: false,
            error: null,
            suppressGuards: suppressed,
          }}
        >
          <MemoryRouter initialEntries={["/source"]}>
            <Routes>
              <Route element={<Guard />}>
                <Route path="/source" element={<div>Transition page</div>} />
              </Route>
              <Route
                path={destination}
                element={<div>Guard destination</div>}
              />
            </Routes>
          </MemoryRouter>
        </StableSessionContext.Provider>
      );

      const { rerender } = render(guardTree(suppressed));

      if (suppressed) {
        expect(screen.getByText("Transition page")).toBeInTheDocument();
        expect(screen.queryByText("Guard destination")).not.toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
        rerender(guardTree(false));
        await screen.findByText("Guard destination");
        expect(toast.error).toHaveBeenCalled();
      } else {
        await screen.findByText("Guard destination");
        expect(screen.queryByText("Transition page")).not.toBeInTheDocument();
        expect(toast.error).toHaveBeenCalled();
      }
    });
  },
);
