// KP (closest to the pin) engine.
//
// Input entries mirror the paper KP sheet: one per (par 3 hole, group):
// { holeNumber, groupNumber, playerId, playerName, distanceFeet,
//   distanceInches, madePar }
//
// Rules:
// - Overall winner per hole = shortest distance across all groups.
// - KP pot divides evenly by the number of par 3 holes that HAVE a winner.
// - Winner made par: they get the share.
// - Winner missed par: the share still counts in the split but goes to the
//   hole-in-one fund.

export function distanceInches(e) {
  return (Number(e.distanceFeet) || 0) * 12 + (Number(e.distanceInches) || 0);
}

export function formatDistance(e) {
  return `${Number(e.distanceFeet) || 0}'${Number(e.distanceInches) || 0}"`;
}

export function computeKPs(kpEntries, par3HoleNumbers, kpPot = 0) {
  const results = []; // one per par 3 hole

  for (const holeNumber of par3HoleNumbers) {
    const entries = kpEntries.filter((e) => e.holeNumber === holeNumber);
    if (entries.length === 0) {
      results.push({ holeNumber, winner: null });
      continue;
    }
    const winner = entries.reduce((best, e) =>
      distanceInches(e) < distanceInches(best) ? e : best
    );
    results.push({ holeNumber, winner });
  }

  const holesWithWinner = results.filter((r) => r.winner);
  const share = holesWithWinner.length > 0 ? kpPot / holesWithWinner.length : 0;

  let holeInOneFund = 0;
  const finalized = results.map((r) => {
    if (!r.winner) return { ...r, money: 0, toFund: false };
    if (r.winner.madePar) return { ...r, money: share, toFund: false };
    holeInOneFund += share;
    return { ...r, money: 0, toFund: true };
  });

  return { holes: finalized, share, holeInOneFund };
}

// Cross-check a KP winner's "made par" claim against their recorded score.
// Returns a list of warnings (empty = all consistent).
export function kpScoreWarnings(kpEntries, rounds, holes) {
  const warnings = [];
  for (const e of kpEntries) {
    const hole = holes.find((h) => h.number === e.holeNumber);
    const round = rounds.find((r) => r.playerId === e.playerId);
    if (!hole || !round) continue;
    const score = Number(round.scores[e.holeNumber - 1]) || 0;
    if (score === 0) continue; // score not entered yet
    const madeParByScore = score <= hole.par;
    if (madeParByScore !== !!e.madePar) {
      warnings.push(
        `Hole ${e.holeNumber}: ${e.playerName} is marked "${
          e.madePar ? 'made par' : 'no par'
        }" on the KP sheet but their recorded score is ${score} (par ${hole.par}).`
      );
    }
  }
  return warnings;
}
