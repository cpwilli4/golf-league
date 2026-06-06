// Engine unit tests. Run: npm test (or: node tests/run-tests.js)
import { computeStandings, cardOffCompare, grossTotal } from '../src/lib/standings.js';
import { computeSkins, groupSkinsSheet } from '../src/lib/skins.js';
import { computeKPs, kpScoreWarnings } from '../src/lib/kp.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}
function assertEq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; }
  else { failed++; console.error('FAIL:', msg, '\n  expected:', JSON.stringify(expected), '\n  actual:  ', JSON.stringify(actual)); }
}

// --- Test course: 18 holes. Par 3s at 5, 9, 13, 16 (like Skylinks KP sheet).
const holes = [];
const par3s = [5, 9, 13, 16];
// Handicap assignment: hole 7 is #1 handicap, hole 12 is #2, then the rest.
const hcMap = { 7: 1, 12: 2, 1: 3, 10: 4, 3: 5, 14: 6, 6: 7, 18: 8, 2: 9, 11: 10, 8: 11, 4: 12, 15: 13, 17: 14, 5: 15, 9: 16, 13: 17, 16: 18 };
for (let n = 1; n <= 18; n++) {
  holes.push({ number: n, par: par3s.includes(n) ? 3 : 4, handicap: hcMap[n] });
}
const coursePar = holes.reduce((a, h) => a + h.par, 0); // 4*14 + 3*4 = 68

const evenRound = () => holes.map((h) => h.par); // shoots even par

function mkRound(name, hcp, scores, group = 1) {
  return { playerId: name, playerName: name, tee: 'Black', courseHandicap: hcp, scores, groupNumber: group };
}

// === Standings: basic net ranking ===
{
  const a = mkRound('Alice', 10, evenRound());           // gross 68, net 58
  const b = mkRound('Bob', 5, evenRound());              // gross 68, net 63
  const s = evenRound(); s[0] += 3;                      // gross 71
  const c = mkRound('Carl', 20, s);                      // net 51
  const st = computeStandings([a, b, c], holes, [475, 245, 140], [110, 66, 44]);
  assertEq(st.map((r) => r.playerName), ['Carl', 'Alice', 'Bob'], 'net ranking order');
  assertEq(st.map((r) => r.place), [1, 2, 3], 'places assigned');
  assertEq(st.map((r) => r.points), [475, 245, 140], 'points per event table');
  assertEq(st.map((r) => r.money), [110, 66, 44], 'money 1st/2nd/3rd');
  assert(st.every((r) => !r.cardOff), 'no card off when no ties');
}

// === Card off: two-player tie, decided on #1 handicap hole (hole 7) ===
{
  const sa = evenRound(); sa[6] = 5;  // Alice: 5 on hole 7 (#1 hcp)
  const sb = evenRound(); sb[0] = 5;  // Bob: 5 on hole 1 instead — same gross
  const a = mkRound('Alice', 10, sa);
  const b = mkRound('Bob', 10, sb);
  assert(grossTotal(sa) === grossTotal(sb), 'same gross for tie setup');
  const st = computeStandings([a, b], holes, [475, 245], [110, 66]);
  assertEq(st.map((r) => r.playerName), ['Bob', 'Alice'], 'card off: better #1 hcp hole wins');
  assert(st[0].cardOff && st[1].cardOff, 'card off flagged');
}

// === Card off: tie on #1 hcp hole, decided on #2 (hole 12) ===
{
  const sa = evenRound(); sa[11] = 5; // Alice worse on hole 12 (#2 hcp)
  const sb = evenRound(); sb[16] = 5; // Bob worse on hole 17 (#14 hcp)
  const a = mkRound('Alice', 10, sa);
  const b = mkRound('Bob', 10, sb);
  const st = computeStandings([a, b], holes, [], []);
  assertEq(st.map((r) => r.playerName), ['Bob', 'Alice'], 'card off moves to #2 hcp hole');
}

// === Card off: three-player tie ===
{
  const sa = evenRound(); sa[6] = 6;             // Alice: +2 on #1 hcp hole
  const sb = evenRound(); sb[6] = 5; sb[11] = 5; // Bob: +1 on #1, +1 on #2
  const sc = evenRound(); sc[6] = 5; sc[0] = 5;  // Carl: +1 on #1, +1 on hole 1 (#3 hcp)
  const a = mkRound('Alice', 10, sa);
  const b = mkRound('Bob', 10, sb);
  const c = mkRound('Carl', 10, sc);
  assert(grossTotal(sa) === grossTotal(sb) && grossTotal(sb) === grossTotal(sc), '3-way same gross');
  const st = computeStandings([a, b, c], holes, [], []);
  // #1 hcp hole (7): Alice 6, Bob 5, Carl 5 -> Alice last.
  // Bob vs Carl on #2 hcp hole (12): Bob 5, Carl 4 -> Carl ahead.
  assertEq(st.map((r) => r.playerName), ['Carl', 'Bob', 'Alice'], '3-way card off order');
}

// === Card off comparator: complete tie returns 0 ===
{
  const a = mkRound('A', 10, evenRound());
  const b = mkRound('B', 10, evenRound());
  assert(cardOffCompare(a, b, holes) === 0, 'identical cards compare equal');
}

// === Skins: unique birdie wins; two birdies cancel; eagle beats birdie ===
{
  const sa = evenRound(); sa[0] = 3;            // Alice birdie hole 1 (unique)
  const sb = evenRound(); sb[2] = 3; sb[9] = 2; // Bob birdie hole 3, eagle hole 10
  const sc = evenRound(); sc[2] = 3;            // Carl birdie hole 3 (cancels Bob)
  const a = mkRound('Alice', 0, sa, 1);
  const b = mkRound('Bob', 0, sb, 1);
  const c = mkRound('Carl', 0, sc, 2);
  const { skins, payouts, perPlayer } = computeSkins([a, b, c], holes, 120);
  assertEq(skins.map((s) => [s.holeNumber, s.playerName]), [[1, 'Alice'], [10, 'Bob']], 'skins: unique birdie + eagle, canceled birdies');
  assert(perPlayer === 60, 'pot split per player (120/2)');
  assertEq(payouts.map((p) => [p.playerName, p.skinsWon, p.money]), [['Alice', 1, 60], ['Bob', 1, 60]], 'skins payouts');
}

// === Skins: pot splits per PLAYER, not per skin ===
{
  const sa = evenRound(); sa[0] = 3; sa[1] = 3; // Alice 2 birdies
  const sb = evenRound(); sb[2] = 3;            // Bob 1 birdie
  const a = mkRound('Alice', 0, sa);
  const b = mkRound('Bob', 0, sb);
  const { payouts } = computeSkins([a, b], holes, 120);
  assertEq(payouts.map((p) => [p.playerName, p.skinsWon, p.money]), [['Alice', 2, 60], ['Bob', 1, 60]], 'even split across winning players');
}

// === Skins: par is never a skin even if unique lowest ===
{
  const sa = evenRound();                  // all pars
  const sb = evenRound(); sb[0] = 5;       // bogey hole 1
  const { skins } = computeSkins([mkRound('A', 0, sa), mkRound('B', 0, sb)], holes, 100);
  assert(skins.length === 0, 'no skins without birdie or better');
}

// === Group skins sheet: name only when unique birdie-or-better within group ===
{
  const sa = evenRound(); sa[0] = 3;
  const sb = evenRound(); sb[0] = 3;
  const sc = evenRound(); sc[0] = 3;
  const a = mkRound('Alice', 0, sa, 1);
  const b = mkRound('Bob', 0, sb, 1);   // cancels Alice within group 1
  const c = mkRound('Carl', 0, sc, 2);  // unique within group 2
  const sheet = groupSkinsSheet([a, b, c], holes, [1, 2]);
  assertEq(sheet[0].groups, { 1: '', 2: 'Carl' }, 'group sheet: cancel within group, name in other group');
}

// === KP: distances compared across groups; pot split by holes won ===
{
  const entries = [
    { holeNumber: 5, groupNumber: 1, playerId: 'Temo', playerName: 'Temo', distanceFeet: 22, distanceInches: 4, madePar: true },
    { holeNumber: 5, groupNumber: 2, playerId: 'Keegan', playerName: 'Keegan', distanceFeet: 14, distanceInches: 4, madePar: true },
    { holeNumber: 9, groupNumber: 2, playerId: 'Keegan', playerName: 'Keegan', distanceFeet: 59, distanceInches: 6, madePar: true },
    { holeNumber: 9, groupNumber: 3, playerId: 'Collin', playerName: 'Collin', distanceFeet: 6, distanceInches: 2, madePar: true },
    { holeNumber: 13, groupNumber: 2, playerId: 'Keegan', playerName: 'Keegan', distanceFeet: 9, distanceInches: 2, madePar: false },
    // hole 16: nobody closest
  ];
  const { holes: kpHoles, share, holeInOneFund } = computeKPs(entries, [5, 9, 13, 16], 90);
  // 3 of 4 holes have winners -> share = 30
  assert(share === 30, 'KP share = pot / holes with winners (90/3)');
  assertEq(kpHoles.map((h) => [h.holeNumber, h.winner ? h.winner.playerName : null, h.money, h.toFund]), [
    [5, 'Keegan', 30, false],
    [9, 'Collin', 30, false],
    [13, 'Keegan', 0, true],   // missed par -> share to fund
    [16, null, 0, false],
  ], 'KP winners, money, fund routing');
  assert(holeInOneFund === 30, 'hole-in-one fund gets missed-par share');
}

// === KP: all 4 holes won, one missed par -> divide by 4, one share to fund ===
{
  const mk = (hole, name, ft, par) => ({ holeNumber: hole, groupNumber: 1, playerId: name, playerName: name, distanceFeet: ft, distanceInches: 0, madePar: par });
  const entries = [mk(5, 'A', 10, true), mk(9, 'B', 12, true), mk(13, 'C', 8, false), mk(16, 'D', 20, true)];
  const { share, holeInOneFund } = computeKPs(entries, [5, 9, 13, 16], 100);
  assert(share === 25, 'share = 100/4 when all holes won');
  assert(holeInOneFund === 25, 'one missed-par share to fund');
}

// === KP warnings: made-par claim vs recorded score ===
{
  const s = evenRound(); s[4] = 4; // 4 on par-3 hole 5 = missed par
  const round = mkRound('Alice', 0, s);
  const entries = [{ holeNumber: 5, groupNumber: 1, playerId: 'Alice', playerName: 'Alice', distanceFeet: 10, distanceInches: 0, madePar: true }];
  const w = kpScoreWarnings(entries, [round], holes);
  assert(w.length === 1, 'warning when KP sheet says par but score says no');
  const entries2 = [{ ...entries[0], madePar: false }];
  assert(kpScoreWarnings(entries2, [round], holes).length === 0, 'no warning when consistent');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
