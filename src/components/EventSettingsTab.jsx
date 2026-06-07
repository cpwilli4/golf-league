import React, { useState } from 'react';
import { updateEvent } from '../api.js';

// Edit an existing event's settings: title, date, payouts, points,
// skins/KP pots, and groups.
export default function EventSettingsTab({ event, onChanged }) {
  const [form, setForm] = useState({
    title: event.title || '',
    event_date: event.event_date,
    payout1: event.payouts?.[0] ?? '',
    payout2: event.payouts?.[1] ?? '',
    payout3: event.payouts?.[2] ?? '',
    points: (event.points || []).join(', '),
    skins_pot: event.skins_pot ?? '',
    kp_pot: event.kp_pot ?? '',
    numGroups: (event.groups || []).length || 1,
    firstTeeTime: event.groups?.[0]?.teeTime || '',
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const groups = Array.from({ length: Number(form.numGroups) || 1 }, (_, i) => ({
        number: i + 1,
        teeTime: i === 0 ? form.firstTeeTime : event.groups?.[i]?.teeTime || '',
      }));
      await updateEvent(event.id, {
        title: form.title.trim() || null,
        event_date: form.event_date,
        payouts: [form.payout1, form.payout2, form.payout3].map((p) => Number(p) || 0),
        points: form.points.split(',').map((p) => Number(p.trim()) || 0),
        skins_pot: Number(form.skins_pot) || 0,
        kp_pot: Number(form.kp_pot) || 0,
        groups,
      });
      setSaved(true);
      await onChanged();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="stack">
      <h2>Event settings</h2>
      <label>
        Title
        <input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label>
        Date
        <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} />
      </label>
      <div className="row gap wrap">
        <label>1st place $<input type="number" value={form.payout1} onChange={(e) => set('payout1', e.target.value)} /></label>
        <label>2nd place $<input type="number" value={form.payout2} onChange={(e) => set('payout2', e.target.value)} /></label>
        <label>3rd place $<input type="number" value={form.payout3} onChange={(e) => set('payout3', e.target.value)} /></label>
      </div>
      <label>
        LA Cup points by place (comma separated, 1st first)
        <input value={form.points} onChange={(e) => set('points', e.target.value)} />
      </label>
      <div className="row gap wrap">
        <label>Skins pot $<input type="number" step="any" value={form.skins_pot} onChange={(e) => set('skins_pot', e.target.value)} /></label>
        <label>KP pot $<input type="number" step="any" value={form.kp_pot} onChange={(e) => set('kp_pot', e.target.value)} /></label>
      </div>
      <div className="row gap wrap">
        <label>
          Number of groups
          <input type="number" min="1" max="10" value={form.numGroups} onChange={(e) => set('numGroups', e.target.value)} />
        </label>
        <label>
          First tee time
          <input value={form.firstTeeTime} onChange={(e) => set('firstTeeTime', e.target.value)} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {saved && <p className="muted">Saved. Results update automatically.</p>}
      <div className="row gap">
        <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
      </div>
    </form>
  );
}
