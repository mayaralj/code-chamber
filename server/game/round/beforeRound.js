// Before Round
const beforeRound = (room, COUNTDOWN_TIMER) => {
  // Increment current round
  const curRound = room.currentRound + 1;
  room.currentRound = curRound;

  // Round Data
  const roundData = room.roundData[curRound];

  // Loop through all players and init their new round Data for this round
  room.players.forEach((player) => {
    const playerGameData = player.gameData;
    if (!playerGameData.roundData) {
      playerGameData.roundData = {};
    }
    playerGameData.roundData[curRound] = {
      codeStatus: "not-submitted",
      codeInput: "",
    };
  });

  // Begin initial countdown
  roundData.endsAt = Date.now() + COUNTDOWN_TIMER;

  // Update timestamp for last activity
  room.lastActivity = Date.now();

  console.log(roundData.roundEvents);

  return [curRound, roundData, roundData.roundEvents];
};

export default beforeRound;
