export const buildPlayerList = (room) => {
  // Determine if game started to include more data
  const gameStarted = room.isGameStarted;
  const currentRound = room.currentRound;

  console.log(room.players);

  // Build a list of all players with needed data
  const playerList = room.players.map((p) => ({
    username: p.username,
    ...(gameStarted && {
      judging: p?.gameData?.roundData?.[currentRound]?.judging,
      submitted: p?.gameData?.roundData?.[currentRound]?.submitted,
    }),
  }));

  return playerList;
};
