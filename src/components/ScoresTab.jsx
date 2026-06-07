import React, { useState } from 'react';
import { saveRound, deleteRound, addPlayer } from '../api.js';
import { grossTotal } from '../lib/standings.js';

export default function ScoresTab({ event, course, rounds, players, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tees = course.tees || [];
  const groups = event.groups || [];

  function startNew() {
    setEditing({
      event_id: event.id,
      player_id: '',
      newPlayerName: '',
      tee: tees[0] || '',
      course_handicap: '',
      group_number: groups[0]?.number || 1,
      scores: Array(18).fill(''),
      is_guest: false,
      plays_skins: true,
      plays_kp: true,
    });
  }

  function startEdit(r) {
    setEditing({
      id: r.id,
      event_id: event.id,
      player_id: r.player_id,
      newPlayerName: '',
      tee: r.tee,
      course_handicap: r.course_handicap,
      group_number: r.group_number,
      scores: r.scores.map((s) => (s ? String(s) : '')),
      is_guest: !!r.is_guest,
      plays_skins: r.plays_skins !== false,
      plays_kp: r.plays_kp !== false,
    });
  }

  function setScore(i, v) {
    const scores = editing.scores.map((s, j) => (j === i ? v : s));
    setEditing({ ...editing, scores });
  }

  async function save() {
    setError('');
    let playerId = editing.player_id;
    const scores = editing.scores.map((s) => Number(s) || 0);
    if (!playerId && !editing.newPlayerName.trim()) {
      setError('Pick a player or type a new player name.');
      return;
    }
    if (!editing.is_guest && scores.some((s) => s < 1)) {
      setError('Enter a score for all 18 holes.');
      return;
    }
    if (!editing.is_guest && (editing.course_handicap === '' || isNaN(Number(editing.course_handicap)))) {
      setError('Enter the course handicap.');
      return;
    }
    setBusy(true);
    try {
      if (!playerId) {
        const p = await addPlayer(editing.newPlayerName.trim());
        playerId = p.id;
      }
      await saveRound({
        id: editing.id,
        event_id: event.id,
        player_id: playerId,
        tee: editing.tee,
        course_handicap: Number(editing.course_handicap) || 0,
        group_number: Number(editing.group_number),
        scores,
        is_guest: editing.is_guest,
        plays_skins: editing.is_guest ? editing.plays_skins : true,
        plays_kp: editing.is_guest ? editing.plays_kp : true,
      });
      setEditing(null);
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function remove(r) {
    if (!confirm(`Delete ${r.players?.name}'s round?`)) return;
    try {
      await deleteRound(r.id);
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  if (editing) {
    const front = course.holes.slice(0, 9);
    const back = course.holes.slice(9);
    const entered = editing.scores.map((s) => Number(s) || 0);
    const gross = grossTotal(entered);
    const net = gross - (Number(editing.course_handicap) || 0);
    const usedPlayerIds = rounds.filter((r) => r.id !== editing.id).map((r) => r.player_id);

    return (
      <div>
        <h2>{editing.id ? 'Edit round' : 'Add round'}</h2>
        <div className="row gap wrap">
          <label>
            Player
            <select value={editing.player_id} onChange={(e) => setEditing({ ...editing, player_id: e.target.value })}>
              <option value="">New player...</option>
              {players.filter((p) => !usedPlayerIds.includes(p.id)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          {!editing.player_id && (
            <label>
              New player name
              <input value={editing.newPlayerName} onChange={(e) => setEditing({ ...editing, newPlayerName: e.target.value })} />
            </label>
          )}
          <label>
            Tees
            <select value={editing.tee} onChange={(e) => setEditing({ ...editing, tee: e.target.value })}>
              {tees.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Course handicap
            <input type="number" value={editing.course_handicap} onChange={(e) => setEditing({ ...editing, course_handicap: e.target.value })} />
          </label>
          <label>
            Group
            <select value={editing.group_number} onChange={(e) => setEditing({ ...editing, group_number: e.target.value })}>
              {groups.map((g) => <option key={g.number} value={g.number}>Group {g.number}</option>)}
            </select>
          </label>
        </div>

        <div className="row gap wrap">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={editing.is_guest}
              onChange={(e) => setEditing({ ...editing, is_guest: e.target.checked })}
            />
            Guest (not ranked in standings)
          </label>
          {editing.is_guest && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editing.plays_skins}
                  onChange={(e) => setEditing({ ...editing, plays_skins: e.target.checked })}
                />
                Playing skins
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editing.plays_kp}
                  onChange={(e) => setEditing({ ...editing, plays_kp: e.target.checked })}
                />
                Playing KPs
              </label>
            </>
          )}
        </div>
        {editing.is_guest && (
          <p className="muted">
            Guest scores are optional. {editing.plays_skins
              ? 'For skins, enter at least the holes where the guest made birdie or better (their scores on those holes also cancel ties).'
              : 'You can leave all holes blank.'}
          </p>
        )}

        {[front, back].map((nine, half) => (
          <table key={half} className="score-grid">
            <thead>
              <tr>
                <th>Hole</th>
                {nine.map((h) => <th key={h.number}>{h.number}</th>)}
                <th>{half === 0 ? 'Out' : 'In'}</th>
              </tr>
              <tr className="muted-row">
                <th>Par</th>
                {nine.map((h) => <th key={h.number}>{h.par}</th>)}
                <th>{nine.reduce((a, h) => a + h.par, 0)}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Score</td>
                {nine.map((h) => (
                  <td key={h.number}>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      inputMode="numeric"
                      value={editing.scores[h.number - 1]}
                      onChange={(e) => setScore(h.number - 1, e.target.value)}
                    />
                  </td>
                ))}
                <td>{nine.reduce((a, h) => a + (Number(editing.scores[h.number - 1]) || 0), 0) || ''}</td>
              </tr>
            </tbody>
          </table>
        ))}

        <p>
          <strong>Gross: {gross || '-'}</strong>
          {' · '}
          <strong>Net: {editing.course_handicap !== '' && gross ? net : '-'}</strong>
        </p>
        {error && <p className="error">{error}</p>}
        <div className="row gap">
          <button onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save round'}</button>
          <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="row spread">
        <h2>Rounds ({rounds.length})</h2>
        <button onClick={startNew}>+ Add round</button>
      </div>
      {error && <p className="error">{error}</p>}
      {rounds.length === 0 ? (
        <p>No rounds entered yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Player</th><th>Group</th><th>Tee</th><th>Hcp</th><th>Gross</th><th>Net</th><th></th></tr>
          </thead>
          <tbody>
            {rounds.map((r) => {
              const gross = grossTotal(r.scores);
              const guestGames = r.is_guest
                ? [r.plays_skins !== false ? 'skins' : null, r.plays_kp !== false ? 'KP' : null].filter(Boolean).join(', ')
                : '';
              return (
                <tr key={r.id}>
                  <td>
                    {r.players?.name}
                    {r.is_guest && <span className="muted"> (guest{guestGames ? ': ' + guestGames : ''})</span>}
                  </td>
                  <td>{r.group_number}</td>
                  <td>{r.tee}</td>
                  <td>{r.is_guest ? '-' : r.course_handicap}</td>
                  <td>{r.is_guest ? '-' : gross}</td>
                  <td>{r.is_guest ? '-' : gross - r.course_handicap}</td>
                  <td className="row gap">
                    <button className="link" onClick={() => startEdit(r)}>Edit</button>
                    <button className="link danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
