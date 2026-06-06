import React from 'react';
import { computeStandings } from '../lib/standings.js';
import { computeSkins, groupSkinsSheet } from '../lib/skins.js';
import { computeKPs, formatDistance } from '../lib/kp.js';

function money(n) {
  if (!n) return '';
  return `$${Number(n.toFixed(2))}`;
}

export default function ResultsTab({ event, course, rounds, kpEntries }) {
  const holes = course.holes;
  const groups = event.groups || [];
  const par3Numbers = holes.filter((h) => h.par === 3).map((h) => h.number);

  const standings = computeStandings(rounds, holes, event.points || [], event.payouts || []);
  const { skins, payouts: skinPayouts, perPlayer } = computeSkins(rounds, holes, event.skins_pot || 0);
  const sheet = groupSkinsSheet(rounds, holes, groups.map((g) => g.number));
  const kp = computeKPs(kpEntries, par3Numbers, event.kp_pot || 0);

  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  if (rounds.length === 0) {
    return <p>No rounds entered yet. Results will appear here.</p>;
  }

  return (
    <div className="results">
      <div className="row spread no-print">
        <h2>Results</h2>
        <button className="secondary" onClick={() => window.print()}>Print</button>
      </div>

      {/* ---- Standings ---- */}
      <table className="data-table results-table">
        <thead>
          <tr>
            <th>Place</th><th>Name</th><th>Score</th><th>Tee / Handicap</th><th>Net</th><th>LA Cup Points</th><th>Money</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <tr key={r.playerId}>
              <td>{ordinal(r.place)}{r.cardOff ? ' *' : ''}</td>
              <td>{r.playerName}</td>
              <td>{r.gross}</td>
              <td>{r.tee} / {r.courseHandicap}</td>
              <td>{r.net}</td>
              <td>{r.points || ''}</td>
              <td>{money(r.money)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {standings.some((r) => r.cardOff) && (
        <p className="muted">* Tie broken by card off (gross scores on handicap holes, starting at the #1 handicap hole).</p>
      )}

      {/* ---- Skins ---- */}
      <h2>Skins</h2>
      {skins.length === 0 ? (
        <p>No skins won.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr><th>Hole</th><th>Par</th><th>Score</th><th>Player</th></tr>
            </thead>
            <tbody>
              {skins.map((s) => (
                <tr key={s.holeNumber}>
                  <td>#{s.holeNumber}</td><td>{s.par}</td><td>{s.score}</td><td>{s.playerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="data-table">
            <thead>
              <tr><th>Player</th><th>Skins won</th><th>Money</th></tr>
            </thead>
            <tbody>
              {skinPayouts.map((p) => (
                <tr key={p.playerId}>
                  <td>{p.playerName}</td><td>{p.skinsWon}</td><td>{money(p.money)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Skins pot {money(event.skins_pot)} split across {skinPayouts.length}{' '}
            {skinPayouts.length === 1 ? 'player' : 'players'} = {money(perPlayer)} each.
          </p>
        </>
      )}

      {/* ---- Per-group skins sheet (verification view) ---- */}
      {groups.length > 0 && (
        <details className="no-print">
          <summary>Per-group skins sheet (compare against the paper sheet)</summary>
          <table className="data-table">
            <thead>
              <tr>
                <th>Hole</th>
                {groups.map((g) => <th key={g.number}>Group {g.number}</th>)}
              </tr>
            </thead>
            <tbody>
              {sheet.map((row) => (
                <tr key={row.holeNumber}>
                  <td>#{row.holeNumber}</td>
                  {groups.map((g) => <td key={g.number}>{row.groups[g.number]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* ---- KP ---- */}
      <h2>Closest to the Pin</h2>
      {par3Numbers.length === 0 ? (
        <p>This course has no par 3s configured.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr><th>Hole</th><th>Winner</th><th>Distance</th><th>Par?</th><th>Money</th></tr>
            </thead>
            <tbody>
              {kp.holes.map((h) => (
                <tr key={h.holeNumber}>
                  <td>#{h.holeNumber}</td>
                  {h.winner ? (
                    <>
                      <td>{h.winner.playerName}</td>
                      <td>{formatDistance(h.winner)}</td>
                      <td>{h.winner.madePar ? 'Yes' : 'No'}</td>
                      <td>{h.toFund ? `${money(kp.share)} → hole-in-one fund` : money(h.money)}</td>
                    </>
                  ) : (
                    <td colSpan="4" className="muted">No winner entered</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {kp.share > 0 && (
            <p className="muted">
              KP pot {money(event.kp_pot)} split across {kp.holes.filter((h) => h.winner).length} winning
              holes = {money(kp.share)} per hole.
            </p>
          )}
          {kp.holeInOneFund > 0 && (
            <p><strong>This event's hole-in-one fund contribution: {money(kp.holeInOneFund)}</strong></p>
          )}
        </>
      )}
    </div>
  );
}
