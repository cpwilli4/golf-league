import React, { useState } from 'react';
import { saveKpEntry, deleteKpEntry } from '../api.js';
import { kpScoreWarnings } from '../lib/kp.js';

// KP entry grid laid out like the paper sheet:
// rows = par 3 holes, columns = groups.
export default function KPTab({ event, course, rounds, kpEntries, players, onChanged }) {
  const [error, setError] = useState('');
  const [busyCell, setBusyCell] = useState('');

  const par3s = course.holes.filter((h) => h.par === 3);
  const groups = event.groups || [];

  // local draft state per cell, keyed "hole-group"
  const [drafts, setDrafts] = useState({});

  function cellKey(hole, group) {
    return `${hole}-${group}`;
  }

  function existing(hole, group) {
    return kpEntries.find((e) => e.hole_number === hole && e.group_number === group);
  }

  function draftFor(hole, group) {
    const key = cellKey(hole, group);
    if (drafts[key]) return drafts[key];
    const ex = existing(hole, group);
    return ex
      ? {
          player_id: ex.player_id,
          feet: String(ex.distance_feet),
          inches: String(ex.distance_inches),
          made_par: ex.made_par,
        }
      : { player_id: '', feet: '', inches: '', made_par: true };
  }

  function setDraft(hole, group, field, value) {
    const key = cellKey(hole, group);
    setDrafts((d) => ({ ...d, [key]: { ...draftFor(hole, group), [field]: value } }));
  }

  async function saveCell(hole, group) {
    const d = draftFor(hole, group);
    if (!d.player_id) {
      setError(`Hole ${hole}, Group ${group}: pick a player.`);
      return;
    }
    setError('');
    setBusyCell(cellKey(hole, group));
    try {
      await saveKpEntry({
        event_id: event.id,
        hole_number: hole,
        group_number: group,
        player_id: d.player_id,
        distance_feet: Number(d.feet) || 0,
        distance_inches: Number(d.inches) || 0,
        made_par: !!d.made_par,
      });
      setDrafts((dr) => {
        const copy = { ...dr };
        delete copy[cellKey(hole, group)];
        return copy;
      });
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
    setBusyCell('');
  }

  async function clearCell(hole, group) {
    const ex = existing(hole, group);
    if (!ex) return;
    try {
      await deleteKpEntry(ex.id);
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  // Players in a group (from entered rounds) listed first for convenience.
  // Guests who didn't buy into KPs are excluded.
  function playerOptions(group) {
    const kpIneligible = rounds.filter((r) => r.isGuest && !r.playsKp).map((r) => r.playerId);
    const inGroup = rounds.filter((r) => r.groupNumber === group).map((r) => r.playerId);
    const sorted = [...players].filter((p) => !kpIneligible.includes(p.id)).sort((a, b) => {
      const ag = inGroup.includes(a.id) ? 0 : 1;
      const bg = inGroup.includes(b.id) ? 0 : 1;
      return ag - bg || a.name.localeCompare(b.name);
    });
    return sorted;
  }

  const warnings = kpScoreWarnings(
    kpEntries.map((e) => ({
      holeNumber: e.hole_number,
      playerId: e.player_id,
      playerName: e.players?.name || 'Unknown',
      madePar: e.made_par,
    })),
    rounds,
    course.holes
  );

  if (par3s.length === 0) {
    return <p>This course has no par 3 holes set. Edit the course to set pars.</p>;
  }

  return (
    <div>
      <h2>KP sheet (closest to the pin)</h2>
      <p className="muted">
        For each par 3, enter each group's closest player, the measured distance, and whether
        they made par. Leave a cell empty if the group had no one closest.
      </p>
      {error && <p className="error">{error}</p>}
      {warnings.map((w, i) => (
        <p key={i} className="warning">⚠ {w}</p>
      ))}
      <div className="kp-grid-wrap">
        <table className="kp-grid">
          <thead>
            <tr>
              <th>Hole</th>
              {groups.map((g) => <th key={g.number}>Group {g.number}</th>)}
            </tr>
          </thead>
          <tbody>
            {par3s.map((h) => (
              <tr key={h.number}>
                <td className="hole-label">#{h.number}</td>
                {groups.map((g) => {
                  const d = draftFor(h.number, g.number);
                  const ex = existing(h.number, g.number);
                  const key = cellKey(h.number, g.number);
                  return (
                    <td key={g.number} className="kp-cell">
                      <select value={d.player_id} onChange={(e) => setDraft(h.number, g.number, 'player_id', e.target.value)}>
                        <option value="">—</option>
                        {playerOptions(g.number).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {d.player_id && (
                        <>
                          <div className="row tight">
                            <input type="number" min="0" placeholder="ft" inputMode="numeric" value={d.feet} onChange={(e) => setDraft(h.number, g.number, 'feet', e.target.value)} />
                            <span>'</span>
                            <input type="number" min="0" max="11" placeholder="in" inputMode="numeric" value={d.inches} onChange={(e) => setDraft(h.number, g.number, 'inches', e.target.value)} />
                            <span>"</span>
                          </div>
                          <label className="checkbox">
                            <input type="checkbox" checked={!!d.made_par} onChange={(e) => setDraft(h.number, g.number, 'made_par', e.target.checked)} />
                            made par
                          </label>
                          <div className="row tight">
                            <button className="small" disabled={busyCell === key} onClick={() => saveCell(h.number, g.number)}>
                              {busyCell === key ? '...' : ex ? 'Update' : 'Save'}
                            </button>
                            {ex && <button className="small danger" onClick={() => clearCell(h.number, g.number)}>Clear</button>}
                          </div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
