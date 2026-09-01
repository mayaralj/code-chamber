// Imports
import { useState } from "react";
import {
  List,
  WifiOff,
  UserX,
  UserCheck,
  Flag,
  Rocket,
  CheckCircle2,
} from "lucide-react";

// Config
const MAX_HISTORY_EVENTS = 8;

// Event styles for different types of events
const EVENT_STYLES = {
  eliminated: { icon: UserX, color: "text-rose-400" },
  disconnected: { icon: WifiOff, color: "text-rose-400" },
  missed: { icon: UserCheck, color: "text-[#ffd687]" },
  submitted: { icon: CheckCircle2, color: "text-emerald-400" },
  round: { icon: Flag, color: "text-zinc-400" },
  game: { icon: Rocket, color: "text-[#4f5f9c]" },
};

// GameStatusBar component to display current round and latest event
const GameStatusBar = ({ events = [], currentRound }) => {
  // States
  const [showHistory, setShowHistory] = useState(false);

  // Most recent event is whatever was pushed last
  const latestEvent = events[events.length - 1];

  // Get the icon and color for the latest event, defaulting to a flag if none
  const { icon: Icon = Flag, color = "text-zinc-400" } =
    EVENT_STYLES[latestEvent?.type] || {};

  return (
    <div className="relative flex h-8 shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 text-xs">
      <style>{`
        @keyframes status-fade-in {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex items-center gap-2 text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ffd687]" />
        <span className="font-medium">Round {currentRound}</span>
      </div>

      <div
        key={events.length}
        className="flex flex-1 items-center justify-center gap-2 [animation:status-fade-in_0.3s_ease-out]"
      >
        {latestEvent ? (
          <>
            <Icon size={12} className={color} />
            <span className="text-zinc-300">{latestEvent.message}</span>
          </>
        ) : (
          <span className="text-zinc-600">No updates yet</span>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex cursor-pointer items-center gap-1.5 text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <List size={12} />
          History
        </button>

        {showHistory && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowHistory(false)}
            />
            <div className="modal-scroll absolute bottom-full right-0 z-50 mb-2 flex max-h-72 w-72 flex-col gap-1 overflow-y-auto rounded-xs border border-zinc-800 bg-zinc-900 p-3 shadow-xl">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Recent Updates
              </h2>
              {events.length === 0 ? (
                <p className="text-xs text-zinc-600">
                  Nothing has happened yet.
                </p>
              ) : (
                [...events]
                  .reverse()
                  .slice(0, MAX_HISTORY_EVENTS)
                  .map((event, index) => {
                    const {
                      icon: EventIcon = Flag,
                      color: eventColor = "text-zinc-400",
                    } = EVENT_STYLES[event.type] || {};
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60"
                      >
                        <EventIcon size={13} className={eventColor} />
                        <span className="flex-1">{event.message}</span>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameStatusBar;
