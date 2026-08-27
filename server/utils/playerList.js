export const buildPlayerList = (room) => {
  if (!room || !room.players) {
    return [];
  }
  // Determine if game started to include more data
  const gameStarted = room?.isGameStarted;
  const currentRound = room?.currentRound;

  // Build a list of all players with needed data
  const playerList = room.players.map((p) => ({
    username: p.username,
    displayName: p.displayName,
    isReconnecting: p.isReconnecting,
    ...(gameStarted && {
      codeStatus:
        p?.gameData?.roundData?.[currentRound]?.codeStatus || "not-submitted",
    }),
  }));

  return playerList;
};
