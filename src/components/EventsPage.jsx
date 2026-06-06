import React, { useEffect, useState } from 'react';
import { listEvents, listCourses, createEvent } from '../api.js';

const DEFAULT_POINTS = '475, 245, 140, 85, 45, 35, 25, 20, 15, 10, 5';

export default function EventsPage({ canEdit }) {
  const [events, setEvents] = useState(null);
  const [courses, setCourses] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    course_id: '',
    title: '',
    event_date: new Date().toISOString().slice(0, 10),
    numGroups: 4,
    firstTeeTime: '10:00am',
    payout1: '',
    payout2: '',
    payout3: '',
    points: DEFAULT_POINTS,
    skins_pot: '',
    kp_pot: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [ev, co] = await Promise.all([listEvents(), listCourses()]);
        setEvents(ev);
        setCourses(co);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.course_id) {
      setError('Pick a course. Add one on the Courses page first if needed.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const groups = Array.from({ length: Number(form.numGroups) || 1 }, (_, i) => ({
        number: i + 1,
        teeTime: i === 0 ? form.firstTeeTime : '',
      }));
      const ev = await createEvent({
        course_id: form.course_id,
        title: form.title.trim() || null,
        event_date: form.event_date,
        payouts: [form.payout1, form.payout2, form.payout3].map((p) => Number(p) || 0),
        points: form.points.split(',').map((p) => Number(p.trim()) || 0),
        skins_pot: Number(form.skins_pot) || 0,
        kp_pot: Number(form.kp_pot) || 0,
        groups,
      });
      window.location.hash = `#/event/${ev.id}`;
    } catch (e2) {
      setError(e2.message);
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="page">
        <h1>New event</h1>
        <form onSubmit={submit} className="stack">
          <label>
            Course
            <select value={form.course_id} onChange={(e) => set('course_id', e.target.value)}>
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} />
          </label>
          <label>
            Title (optional)
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Saturday September 14th, 2024" />
          </label>
          <div className="row gap">
            <label>
              Number of groups
              <input type="number" min="1" max="10" value={form.numGroups} onChange={(e) => set('numGroups', e.target.value)} />
            </label>
            <label>
              First tee time
              <input value={form.firstTeeTime} onChange={(e) => set('firstTeeTime', e.target.value)} />
            </label>
          </div>
          <div className="row gap">
            <label>1st place $<input type="number" value={form.payout1} onChange={(e) => set('payout1', e.target.value)} /></label>
            <label>2nd place $<input type="number" value={form.payout2} onChange={(e) => set('payout2', e.target.value)} /></label>
            <label>3rd place $<input type="number" value={form.payout3} onChange={(e) => set('payout3', e.target.value)} /></label>
          </div>
          <label>
            LA Cup points by place (comma separated, 1st first)
            <input value={form.points} onChange={(e) => set('points', e.target.value)} />
          </label>
          <div className="row gap">
            <label>Skins pot $<input type="number" value={form.skins_pot} onChange={(e) => set('skins_pot', e.target.value)} /></label>
            <label>KP pot $<input type="number" value={form.kp_pot} onChange={(e) => set('kp_pot', e.target.value)} /></label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="row gap">
            <button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create event'}</button>
            <button type="button" className="secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row spread">
        <h1>Events</h1>
        {canEdit && <button onClick={() => setCreating(true)}>+ New event</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {events === null ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <ul className="card-list">
          {events.map((ev) => (
            <li key={ev.id} className="card clickable" onClick={() => (window.location.hash = `#/event/${ev.id}`)}>
              <strong>{ev.title || ev.event_date}</strong>
              <div className="muted">{ev.courses?.name} · {ev.event_date}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
