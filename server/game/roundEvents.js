// CONFIG
const eventOdds = {
  doubleElimination: 0.5,
  fasterTimer: 0.5,
  missedBullet: 0.5,
};
const events = {
  doubleElimination: {
    type: "beforeRound",
    set: true,
  },
  fasterTimer: {
    type: "beforeRound",
    set: true,
  },
  missedBullet: {
    type: "afterRound",
    set: true,
  },
};

// Determine all events
export const determineAllEvents = (io, code, roundData) => {
  // Loop through each event
  Object.keys(events).forEach((eventName) => {
    const event = events[eventName];
    // Determine if the event should run based on odds
    if (Math.random() <= eventOdds[eventName]) {
      if (!roundData[event.type]) {
        roundData[event.type] = [];
      }
      // If event should run, set it in the roundData
      roundData[event.type].push(eventName);
      console.log(`Event ${eventName} triggered for room ${code}`);
    }
  });
};
