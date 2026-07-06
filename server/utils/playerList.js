export const buildPlayerList = (room) => {
  // Determine if game started to include more data
  const gameStarted = room.isGameStarted;

  // Build a list of all players with needed data
  const playerList = room.players.map((p) => ({
    username: p.username,
    ...(gameStarted && { judging: p.judging, submitted: p.submitted }),
  }));

  return playerList;
};
