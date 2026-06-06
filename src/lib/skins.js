// Skins engine: fully automatic from hole-by-hole scores.
//
// Rules:
// - A skin requires birdie or better (score below par).
// - The score must be the UNIQUE lowest on that hole across the entire field.
// - Two birdies (with no eagle) cancel: no skin.
// - Skins pot splits evenly across the number of PLAYERS who won at least
//   one skin (not the number of skins).

export function computeSkins(rounds, holes, skinsPot = 0) {
  const skins = []; // { holeNumber, par, playerId, playerName, score }

  for (const hole of holes) {
    const idx = hole.number - 1;
    const entries = rounds
      .map((r) => ({ round: r, score: Number(r.scores[idx]) || 0 }))
      .filter((e) => e.score > 0);
    if (entries.length === 0) continue;

    const min = Math.min(...entries.map((e) => e.score));
    if (min >= hole.par) continue; // must be birdie or better
    const lowest = entries.filter((e) => e.score === min);
    if (lowest.length !== 1) continue; // canceled

    skins.push({
      holeNumber: hole.number,
      par: hole.par,
      playerId: lowest[0].round.playerId,
      playerName: lowest[0].round.playerName,
      score: min,
    });
  }

  const winnerIds = [...new Set(skins.map((s) => s.playerId))];
  const perPlayer = winnerIds.length > 0 ? skinsPot / winnerIds.length : 0;

  const payouts = winnerIds.map((id) => ({
    playerId: id,
    playerName: skins.find((s) => s.playerId === id).playerName,
    skinsWon: skins.filter((s) => s.playerId === id).length,
    money: perPlayer,
  }));

  return { skins, payouts, perPlayer };
}

// Per-group skins sheet view, mirroring the paper sheet:
// for each hole and group, the name of the player with the group's best
// score IF it's birdie-or-better and unique within the group; else blank.
export function groupSkinsSheet(rounds, holes, groupNumbers) {
  return holes.map((hole) => {
    const idx = hole.number - 1;
    const row = { holeNumber: hole.number, par: hole.par, groups: {} };
    for (const g of groupNumbers) {
      const entries = rounds
        .filter((r) => r.groupNumber === g)
        .map((r) => ({ round: r, score: Number(r.scores[idx]) || 0 }))
        .filter((e) => e.score > 0);
      row.groups[g] = '';
      if (entries.length === 0) continue;
      const min = Math.min(...entries.map((e) => e.score));
      if (min >= hole.par) continue;
      const lowest = entries.filter((e) => e.score === min);
      if (lowest.length === 1) row.groups[g] = lowest[0].round.playerName;
    }
    return row;
  });
}
