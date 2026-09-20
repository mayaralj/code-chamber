// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Browse from "./Browse";

// Mock
const navigateMock = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("../socket", async () => {
  const { createSocketMock } = await import("../test/socketMock");
  const socket = createSocketMock();
  return { socket };
});

// Import after mocks
import { socket } from "../socket";

// Vars
const JOIN_ROOM_LABEL = "JOIN ROOM ›";

// Helper to create a room object with default values, allowing overrides for testing
const makeRoom = (overrides = {}) => ({
  code: "AAA111",
  roomName: "Test Room",
  difficulty: "easy",
  maxPlayers: 4,
  playerCount: 1,
  isGameStarted: false,
  isGameStarting: false,
  host: undefined,
  ...overrides,
});

// beforeEach and afterEach hooks to reset socket state and mocks before and after each test
beforeEach(() => {
  socket.__reset();
  navigateMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to emit a "rooms-list" event with the given rooms, simulating the server sending a list of rooms to the client
const emitRoomsList = (rooms) => {
  act(() => {
    socket.__trigger("rooms-list", rooms);
  });
};

// Browse component tests
describe("Browse - mount effects", () => {
  it("notifies the server it's on the public rooms page on mount, and leaves on unmount", () => {
    const { unmount } = render(<Browse />);

    expect(socket.emit).toHaveBeenCalledWith("public-rooms", {
      onPage: true,
    });

    unmount();

    expect(socket.emit).toHaveBeenCalledWith("public-rooms", {
      onPage: false,
    });
  });

  it("requests the room list and subscribes to rooms-list on mount", () => {
    render(<Browse />);

    expect(socket.emit).toHaveBeenCalledWith("get-rooms");
    expect(socket.__listenerCount("rooms-list")).toBe(1);
  });

  it("renders rooms received from the rooms-list event", () => {
    render(<Browse />);

    emitRoomsList([makeRoom({ roomName: "Alpha Chamber" })]);

    expect(screen.getByText("Alpha Chamber")).toBeInTheDocument();
  });

  it("subscribes to rooms-batch-update on mount", () => {
    render(<Browse />);

    expect(socket.__listenerCount("rooms-batch-update")).toBe(1);
  });

  it("removes all socket listeners on unmount", () => {
    const { unmount } = render(<Browse />);

    unmount();

    expect(socket.__listenerCount("rooms-list")).toBe(0);
    expect(socket.__listenerCount("rooms-batch-update")).toBe(0);
    expect(socket.__listenerCount("room-joined")).toBe(0);
    expect(socket.__listenerCount("room-join-error")).toBe(0);
  });
});

describe("Browse - rooms-batch-update handling", () => {
  it("adds new rooms from a batch update", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ code: "R1", roomName: "Room One" })]);

    act(() => {
      socket.__trigger("rooms-batch-update", {
        added: [makeRoom({ code: "R2", roomName: "Room Two" })],
        updated: [],
        removed: [],
      });
    });

    expect(screen.getByText("Room One")).toBeInTheDocument();
    expect(screen.getByText("Room Two")).toBeInTheDocument();
  });

  it("updates existing rooms from a batch update", () => {
    render(<Browse />);
    emitRoomsList([
      makeRoom({ code: "R1", roomName: "Room One", playerCount: 1 }),
    ]);

    act(() => {
      socket.__trigger("rooms-batch-update", {
        added: [],
        updated: [
          makeRoom({ code: "R1", roomName: "Room One", playerCount: 3 }),
        ],
        removed: [],
      });
    });

    expect(screen.getByText("3/4")).toBeInTheDocument();
  });

  it("removes rooms from a batch update", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ code: "R1", roomName: "Room One" })]);

    act(() => {
      socket.__trigger("rooms-batch-update", {
        added: [],
        updated: [],
        removed: ["R1"],
      });
    });

    expect(screen.queryByText("Room One")).not.toBeInTheDocument();
    expect(
      screen.getByText("NO ACTIVE PUBLIC CHAMBERS DETECTED"),
    ).toBeInTheDocument();
  });
});

describe("Browse - empty state", () => {
  it("shows a message when there are no rooms", () => {
    render(<Browse />);

    expect(
      screen.getByText("NO ACTIVE PUBLIC CHAMBERS DETECTED"),
    ).toBeInTheDocument();
  });

  it("does not show the empty message once rooms arrive", () => {
    render(<Browse />);
    emitRoomsList([makeRoom()]);

    expect(
      screen.queryByText("NO ACTIVE PUBLIC CHAMBERS DETECTED"),
    ).not.toBeInTheDocument();
  });
});

describe("Browse - room card display", () => {
  it("falls back to ROOT_ADMIN when host is not provided", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ host: undefined })]);

    expect(screen.getByText("ROOT_ADMIN")).toBeInTheDocument();
  });

  it("displays the provided host when present", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ host: { username: "alice" } })]);

    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it.each([["easy"], ["medium"], ["hard"]])(
    "shows a joinable room with a working JOIN button for difficulty '%s'",
    (difficulty) => {
      render(<Browse />);
      emitRoomsList([makeRoom({ difficulty })]);

      const button = screen.getByRole("button", { name: JOIN_ROOM_LABEL });
      expect(button).toBeEnabled();
    },
  );

  it("shows ROOM FULL and disables the button when the room is at capacity", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ playerCount: 4, maxPlayers: 4 })]);

    expect(screen.getByText("ROOM FULL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FULL" })).toBeDisabled();
  });

  it("shows IN PROGRESS and disables the button when the game has started", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ isGameStarted: true })]);

    expect(screen.getAllByText("IN PROGRESS").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "IN PROGRESS" })).toBeDisabled();
  });

  it("shows GAME STARTING and disables the button when the game is starting", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ isGameStarting: true })]);

    expect(screen.getAllByText("GAME STARTING").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "GAME STARTING" }),
    ).toBeDisabled();
  });

  it("prioritizes IN PROGRESS styling over ROOM FULL when both are true", () => {
    render(<Browse />);
    emitRoomsList([
      makeRoom({ isGameStarted: true, playerCount: 4, maxPlayers: 4 }),
    ]);

    expect(
      screen.getByRole("button", { name: "IN PROGRESS" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "FULL" }),
    ).not.toBeInTheDocument();
  });
});

describe("Browse - filtering", () => {
  const rooms = [
    makeRoom({
      code: "R1",
      roomName: "Speed Run",
      difficulty: "easy",
      maxPlayers: 2,
      isGameStarted: false,
    }),
    makeRoom({
      code: "R2",
      roomName: "Boss Fight",
      difficulty: "hard",
      maxPlayers: 6,
      isGameStarted: true,
    }),
    makeRoom({
      code: "R3",
      roomName: "Casual Match",
      difficulty: "medium",
      maxPlayers: 4,
      isGameStarted: false,
    }),
  ];

  it("filters rooms by search text case-insensitively", () => {
    render(<Browse />);
    emitRoomsList(rooms);

    fireEvent.change(screen.getByPlaceholderText("SEARCH FOR ROOMS..."), {
      target: { value: "speed" },
    });

    expect(screen.getByText("Speed Run")).toBeInTheDocument();
    expect(screen.queryByText("Boss Fight")).not.toBeInTheDocument();
    expect(screen.queryByText("Casual Match")).not.toBeInTheDocument();
  });

  it("filters rooms by difficulty", () => {
    render(<Browse />);
    emitRoomsList(rooms);

    fireEvent.change(screen.getByDisplayValue("ALL DIFFICULTIES"), {
      target: { value: "hard" },
    });

    expect(screen.getByText("Boss Fight")).toBeInTheDocument();
    expect(screen.queryByText("Speed Run")).not.toBeInTheDocument();
  });

  it("filters rooms by max player count", () => {
    render(<Browse />);
    emitRoomsList(rooms);

    fireEvent.change(screen.getByDisplayValue("ALL PLAYER COUNTS"), {
      target: { value: "6" },
    });

    expect(screen.getByText("Boss Fight")).toBeInTheDocument();
    expect(screen.queryByText("Speed Run")).not.toBeInTheDocument();
  });

  it("filters rooms by in-progress status", () => {
    render(<Browse />);
    emitRoomsList(rooms);

    fireEvent.change(screen.getByDisplayValue("ALL GAMES"), {
      target: { value: "IN_PROGRESS" },
    });

    expect(screen.getByText("Boss Fight")).toBeInTheDocument();
    expect(screen.queryByText("Speed Run")).not.toBeInTheDocument();
  });

  it("filters rooms by not-in-progress status", () => {
    render(<Browse />);
    emitRoomsList(rooms);

    fireEvent.change(screen.getByDisplayValue("ALL GAMES"), {
      target: { value: "NOT_IN_PROGRESS" },
    });

    expect(screen.getByText("Speed Run")).toBeInTheDocument();
    expect(screen.getByText("Casual Match")).toBeInTheDocument();
    expect(screen.queryByText("Boss Fight")).not.toBeInTheDocument();
  });

  it("combines multiple filters with AND logic", () => {
    render(<Browse />);
    emitRoomsList(rooms);

    fireEvent.change(screen.getByDisplayValue("ALL DIFFICULTIES"), {
      target: { value: "medium" },
    });
    fireEvent.change(screen.getByDisplayValue("ALL PLAYER COUNTS"), {
      target: { value: "4" },
    });

    expect(screen.getByText("Casual Match")).toBeInTheDocument();
    expect(screen.queryByText("Speed Run")).not.toBeInTheDocument();
    expect(screen.queryByText("Boss Fight")).not.toBeInTheDocument();
  });
});

describe("Browse - pagination", () => {
  const manyRooms = Array.from({ length: 12 }, (_, i) =>
    makeRoom({ code: `R${i}`, roomName: `Room ${i}` }),
  );

  it("shows only the first 9 rooms initially", () => {
    render(<Browse />);
    emitRoomsList(manyRooms);

    expect(screen.getByText("Room 0")).toBeInTheDocument();
    expect(screen.getByText("Room 8")).toBeInTheDocument();
    expect(screen.queryByText("Room 9")).not.toBeInTheDocument();
  });

  it("shows the VIEW MORE CHAMBERS button when more rooms exist than are visible", () => {
    render(<Browse />);
    emitRoomsList(manyRooms);

    expect(
      screen.getByRole("button", { name: "VIEW MORE CHAMBERS" }),
    ).toBeInTheDocument();
  });

  it("reveals up to 9 more rooms per click, capped at the total available", () => {
    render(<Browse />);
    emitRoomsList(manyRooms);

    fireEvent.click(screen.getByRole("button", { name: "VIEW MORE CHAMBERS" }));

    expect(screen.getByText("Room 9")).toBeInTheDocument();
    expect(screen.getByText("Room 11")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "VIEW MORE CHAMBERS" }),
    ).not.toBeInTheDocument();
  });

  it("hides the VIEW MORE CHAMBERS button when 9 or fewer rooms exist", () => {
    render(<Browse />);
    emitRoomsList(manyRooms.slice(0, 5));

    expect(
      screen.queryByRole("button", { name: "VIEW MORE CHAMBERS" }),
    ).not.toBeInTheDocument();
  });

  it("does not reset pagination when a filter is applied after expanding", () => {
    render(<Browse />);
    emitRoomsList(manyRooms);
    fireEvent.click(screen.getByRole("button", { name: "VIEW MORE CHAMBERS" }));
    expect(screen.getByText("Room 11")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("SEARCH FOR ROOMS..."), {
      target: { value: "Room 1" },
    });
    expect(screen.getByText("Room 1")).toBeInTheDocument();
    expect(screen.getByText("Room 10")).toBeInTheDocument();
    expect(screen.getByText("Room 11")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "VIEW MORE CHAMBERS" }),
    ).not.toBeInTheDocument();
  });
});

describe("Browse - joining a public room", () => {
  it("emits join-room with the room's code when JOIN ROOM is clicked", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ code: "PUB123" })]);

    fireEvent.click(screen.getByRole("button", { name: JOIN_ROOM_LABEL }));

    expect(socket.emit).toHaveBeenCalledWith("join-room", { code: "PUB123" });
  });

  it("navigates to the room on a successful join", () => {
    render(<Browse />);
    emitRoomsList([makeRoom({ code: "PUB123" })]);
    fireEvent.click(screen.getByRole("button", { name: JOIN_ROOM_LABEL }));

    const roomInfo = { code: "PUB123", roomName: "Test Room" };
    act(() => {
      socket.__trigger("room-joined", { roomInfo });
    });

    expect(navigateMock).toHaveBeenCalledWith("/room-wait/PUB123", {
      state: { roomInfo },
    });
  });

  it("shows the join error scoped to the specific room that failed", () => {
    render(<Browse />);
    emitRoomsList([
      makeRoom({ code: "ROOM_A", roomName: "Room A" }),
      makeRoom({ code: "ROOM_B", roomName: "Room B" }),
    ]);

    fireEvent.click(
      screen.getAllByRole("button", { name: JOIN_ROOM_LABEL })[0],
    );

    act(() => {
      socket.__trigger("room-join-error", {
        message: "Room is no longer available",
      });
    });

    expect(screen.getByText("Room is no longer available")).toBeInTheDocument();
  });
});

describe("Browse - private join modal", () => {
  it("opens the modal when PRIVATE JOIN is clicked", () => {
    render(<Browse />);

    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));

    expect(screen.getByText("ACCESS PRIVATE CHAMBER")).toBeInTheDocument();
  });

  it("closes the modal and clears the code when the backdrop is clicked", () => {
    const { container } = render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));
    fireEvent.change(screen.getByPlaceholderText("ENTER ACCESS CODE..."), {
      target: { value: "ABC123" },
    });

    fireEvent.click(container.querySelector(".fixed.inset-0.z-\\[60\\]"));

    expect(
      screen.queryByText("ACCESS PRIVATE CHAMBER"),
    ).not.toBeInTheDocument();
  });

  it("does not close the modal when clicking inside its content", () => {
    render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));

    fireEvent.click(screen.getByText("ACCESS PRIVATE CHAMBER"));

    expect(screen.getByText("ACCESS PRIVATE CHAMBER")).toBeInTheDocument();
  });

  it("closes the modal via the CANCEL button", () => {
    render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));

    fireEvent.click(screen.getByRole("button", { name: "CANCEL" }));

    expect(
      screen.queryByText("ACCESS PRIVATE CHAMBER"),
    ).not.toBeInTheDocument();
  });

  it("shows an error inside the modal for a code shorter than CODE_LENGTH", () => {
    render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));
    fireEvent.change(screen.getByPlaceholderText("ENTER ACCESS CODE..."), {
      target: { value: "ABC" },
    });

    fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

    expect(
      screen.getByText("Code length must be 6 characters long"),
    ).toBeInTheDocument();
  });

  it("trims trailing whitespace before validating, so an otherwise-valid code is accepted", () => {
    render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));
    fireEvent.change(screen.getByPlaceholderText("ENTER ACCESS CODE..."), {
      target: { value: "ABCDEF " },
    });

    fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

    expect(
      screen.queryByText("Code length must be 6 characters long"),
    ).not.toBeInTheDocument();
    expect(socket.emit).toHaveBeenCalledWith("join-room", { code: "ABCDEF" });
  });

  it("trims leading and trailing whitespace before validating", () => {
    render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));
    fireEvent.change(screen.getByPlaceholderText("ENTER ACCESS CODE..."), {
      target: { value: " ABCDEF" },
    });

    fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

    expect(socket.emit).toHaveBeenCalledWith("join-room", { code: "ABCDEF" });
  });

  it("joins successfully with a valid private code and navigates on success", () => {
    render(<Browse />);
    fireEvent.click(screen.getByRole("button", { name: /PRIVATE JOIN/ }));
    fireEvent.change(screen.getByPlaceholderText("ENTER ACCESS CODE..."), {
      target: { value: "PRIV01" },
    });

    fireEvent.click(screen.getByRole("button", { name: "JOIN" }));

    expect(socket.emit).toHaveBeenCalledWith("join-room", { code: "PRIV01" });

    const roomInfo = { code: "PRIV01", roomName: "Private Room" };
    act(() => {
      socket.__trigger("room-joined", { roomInfo });
    });

    expect(navigateMock).toHaveBeenCalledWith("/room-wait/PRIV01", {
      state: { roomInfo },
    });
  });
});
