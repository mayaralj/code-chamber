// CONFIG
const eventOdds = {
  doubleElimination: 0.35,
  fasterTimer: 0.35,
  missedBullet: 0.35,
};
const events = {
  doubleElimination: {
    type: "beforeRound",
    set: true,
  },
  fasterTimer: {
    type: "beforeRound",
    set: 1.5,
  },
  missedBullet: {
    type: "afterRound",
    set: true,
  },
};

// Determine all events
export const determineAllEvents = (room) => {
  let remaining = room.players.length;
  let currentRound = 1;

  // CONFIG
  let ALLOWED_EVENTS = {
    doubleElimination: 2,
    fasterTimer: 2,
    missedBullet: 2,
  };

  // Loop through rounds until all players - 1 are eliminated
  while (remaining > 0) {
    // Init and Get Round data
    room.roundData[currentRound] = {};
    const roundData = room.roundData[currentRound];

    // Loop through each event
    Object.keys(events).forEach((eventName) => {
      const event = events[eventName];
      // if an allowed event
      if (
        ALLOWED_EVENTS[eventName] <= 0 ||
        (eventName == "doubleElimination" && remaining <= 2)
      ) {
        return;
      }
      // Determine if the event should run based on odds
      if (Math.random() <= eventOdds[eventName]) {
        if (!roundData.roundEvents) {
          roundData.roundEvents = {};
        }
        if (!roundData.roundEvents[event.type]) {
          roundData.roundEvents[event.type] = {};
        }
        // If event should run, set it in the roundData
        roundData.roundEvents[event.type][eventName] = event.set;

        // Decrement the allowed counter
        ALLOWED_EVENTS[eventName]--;
      }
    });

    // Increment round and decrement remaining players
    currentRound++;
    // If missed bullet is in afterRound events, add 1 to remaining players
    if (roundData?.roundEvents?.afterRound?.missedBullet) {
      remaining += 1;
    }
    // If double elimination is in beforeRound events, subtract 2 from remaining players
    if (roundData?.roundEvents?.beforeRound?.doubleElimination) {
      remaining -= 2;
    } else {
      remaining -= 1;
    }
  }

  // Set total rounds in room
  room.totalRounds = currentRound - 1;
};
