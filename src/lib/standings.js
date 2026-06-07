// Standings engine: net-score ranking with automatic card off.
//
// A "round" object: { playerId, playerName, tee, courseHandicap, scores: number[18] }
// "holes": [{ number, par, handicap }] for the course (handicap 1..18).

export function grossTotal(scores) {
  return scores.reduce((a, b) => a + (Number(b) || 0), 0);
}

export function netTotal(round) {
  return grossTotal(round.scores) - round.courseHandicap;
}

// Holes sorted by handicap rating: #1 handicap hole first.
export function handicapOrder(holes) {
  return [...holes]
    .sort((a, b) => a.handicap - b.handicap)
    .map((h) => h.number);
}

// Card-off comparator for two tied rounds: walk handicap holes in order,
// lower GROSS score on the first differing hole wins. Returns <0 if a wins.
export function cardOffCompare(a, b, holes) {
  for (const holeNumber of handicapOrder(holes)) {
    const idx = holeNumber - 1;
    const sa = Number(a.scores[idx]) || 0;
    const sb = Number(b.scores[idx]) || 0;
    if (sa !== sb) return sa - sb;
  }
  return 0; // complete tie (never happened in league history)
}

// Returns rounds in final order with place, net, gross, points, money,
// and a note when a card off decided the place.
// Guests (isGuest) are excluded from the rankings entirely.
export function computeStandings(rounds, holes, points = [], payouts = []) {
  const eligible = rounds.filter((r) => !r.isGuest);
  const withTotals = eligible.map((r) => ({
    ...r,
    gross: grossTotal(r.scores),
    net: netTotal(r),
    cardOff: false,
  }));

  // Group by net score
  const byNet = new Map();
  for (const r of withTotals) {
    if (!byNet.has(r.net)) byNet.set(r.net, []);
    byNet.get(r.net).push(r);
  }

  const ordered = [];
  const netScores = [...byNet.keys()].sort((a, b) => a - b);
  for (const net of netScores) {
    const group = byNet.get(net);
    if (group.length > 1) {
      group.sort((a, b) => cardOffCompare(a, b, holes));
      group.forEach((r) => (r.cardOff = true));
    }
    ordered.push(...group);
  }

  return ordered.map((r, i) => ({
    ...r,
    place: i + 1,
    points: points[i] ?? 0,
    money: payouts[i] ?? 0,
  }));
}
