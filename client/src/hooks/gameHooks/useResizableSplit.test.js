// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useResizableSplit from "./useResizableSplit";

// Helpers
const fakeContainer = (rect) => ({
  getBoundingClientRect: () => rect,
});
const fireMouseMove = (clientX, clientY) => {
  window.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY }));
};
const fireMouseUp = () => {
  window.dispatchEvent(new MouseEvent("mouseup"));
};

// Reset the document body styles before each test
beforeEach(() => {
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});

// useResizableSplit tests
describe("useResizableSplit", () => {
  it("defaults to horizontal axis and a size of 50 when no options are given", () => {
    const { result } = renderHook(() => useResizableSplit());

    expect(result.current.size).toBe(50);
  });

  it("uses the provided initialSize", () => {
    const { result } = renderHook(() => useResizableSplit({ initialSize: 30 }));

    expect(result.current.size).toBe(30);
  });

  it("sets a col-resize cursor and disables text selection on drag start for horizontal axis", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "horizontal" }),
    );

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
    });

    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");
  });

  it("sets a row-resize cursor for vertical axis", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "vertical" }),
    );

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
    });

    expect(document.body.style.cursor).toBe("row-resize");
  });

  it("calls preventDefault on drag start", () => {
    const { result } = renderHook(() => useResizableSplit());
    const preventDefault = vi.fn();

    act(() => {
      result.current.handleDragStart({ preventDefault });
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it("does not change size on mousemove before a drag has started", () => {
    const { result } = renderHook(() => useResizableSplit());
    result.current.containerRef.current = fakeContainer({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      fireMouseMove(300, 100);
    });

    expect(result.current.size).toBe(50);
  });

  it("does not change size on mousemove if containerRef has no element attached", () => {
    const { result } = renderHook(() => useResizableSplit());

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(300, 100);
    });

    expect(result.current.size).toBe(50);
  });

  it("updates size based on horizontal mouse position within bounds", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "horizontal" }),
    );
    result.current.containerRef.current = fakeContainer({
      left: 100,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(300, 0);
    });

    expect(result.current.size).toBe(50);
  });

  it("updates size based on vertical mouse position within bounds", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "vertical" }),
    );
    result.current.containerRef.current = fakeContainer({
      left: 0,
      top: 50,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(0, 150);
    });

    expect(result.current.size).toBe(50);
  });

  it("clamps size to minSize when the mouse moves past the lower bound", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "horizontal", minSize: 20, maxSize: 80 }),
    );
    result.current.containerRef.current = fakeContainer({
      left: 100,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(50, 0);
    });

    expect(result.current.size).toBe(20);
  });

  it("clamps size to maxSize when the mouse moves past the upper bound", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "horizontal", minSize: 20, maxSize: 80 }),
    );
    result.current.containerRef.current = fakeContainer({
      left: 100,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(600, 0);
    });

    expect(result.current.size).toBe(80);
  });

  it("respects custom minSize and maxSize bounds", () => {
    const { result } = renderHook(() =>
      useResizableSplit({ axis: "horizontal", minSize: 10, maxSize: 90 }),
    );
    result.current.containerRef.current = fakeContainer({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(0, 0);
    });

    expect(result.current.size).toBe(10);
  });

  it("stops updating size after mouseup", () => {
    const { result } = renderHook(() => useResizableSplit());
    result.current.containerRef.current = fakeContainer({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(200, 0);
    });
    const sizeAfterDrag = result.current.size;

    act(() => {
      fireMouseUp();
      fireMouseMove(400, 0);
    });

    expect(result.current.size).toBe(sizeAfterDrag);
  });

  it("resets cursor and text selection styles on mouseup", () => {
    const { result } = renderHook(() => useResizableSplit());

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
    });
    expect(document.body.style.cursor).not.toBe("");

    act(() => {
      fireMouseUp();
    });

    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });

  it("does nothing on mouseup if a drag was never started", () => {
    renderHook(() => useResizableSplit());

    expect(() => {
      act(() => {
        fireMouseUp();
      });
    }).not.toThrow();

    expect(document.body.style.cursor).toBe("");
  });

  it("allows dragging again after a previous mouseup", () => {
    const { result } = renderHook(() => useResizableSplit());
    result.current.containerRef.current = fakeContainer({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(200, 0);
      fireMouseUp();
    });

    act(() => {
      result.current.handleDragStart({ preventDefault: vi.fn() });
      fireMouseMove(300, 0);
    });

    expect(result.current.size).toBe(75);
  });

  it("exposes a manual setSize setter", () => {
    const { result } = renderHook(() => useResizableSplit());

    act(() => {
      result.current.setSize(65);
    });

    expect(result.current.size).toBe(65);
  });

  it("removes mousemove and mouseup listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useResizableSplit());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
  });
});
