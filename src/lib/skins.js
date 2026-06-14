// Skins engine: fully automatic from hole-by-hole scores.
//
// Rules:
// - A skin requires birdie or better (score below par).
// - The score must be the UNIQUE lowest on that hole across the entire field.
// - Two birdies (with no eagle) cancel: no skin.
// - Skins pot splits evenly across the total number of SKINS won. A player
//   who wins 2 skins gets 2 shares.
// - League members are always in. Guests are included only if they bought
//   into skins (playsSkins).

function skinsField(rounds) {
  return rounds.filter((r) => !r.isGuest || r.playsSkins);
}

export function computeSkins(allRounds, holes, skinsPot = 0) {
  const rounds = skinsField(allRounds);
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
  // Split the pot by the total number of skins won, not the number of players.
  const perSkin = skins.length > 0 ? skinsPot / skins.length : 0;

  const payouts = winnerIds.map((id) => {
    const skinsWon = skins.filter((s) => s.playerId === id).length;
    return {
      playerId: id,
      playerName: skins.find((s) => s.playerId === id).playerName,
      skinsWon,
      money: perSkin * skinsWon,
    };
  });

  return { skins, payouts, perSkin };
}

// Per-group skins sheet view, mirroring the paper sheet:
// for each hole and group, the name of the player with the group's best
// score IF it's birdie-or-better and unique within the group; else blank.
export function groupSkinsSheet(allRounds, holes, groupNumbers) {
  const rounds = skinsField(allRounds);
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
