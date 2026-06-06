import React, { useEffect, useState } from 'react';
import { listCourses, saveCourse } from '../api.js';

const emptyHoles = () =>
  Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));

export default function CoursesPage({ canEdit }) {
  const [courses, setCourses] = useState(null);
  const [editing, setEditing] = useState(null); // { id?, name, tees: 'a, b', holes: [...] }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setCourses(await listCourses());
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setEditing({ name: '', tees: 'Black, Blue', holes: emptyHoles() });
  }
  function startEdit(c) {
    setEditing({ id: c.id, name: c.name, tees: (c.tees || []).join(', '), holes: c.holes });
  }

  function setHole(i, field, value) {
    const holes = editing.holes.map((h, j) => (j === i ? { ...h, [field]: value } : h));
    setEditing({ ...editing, holes });
  }

  function validate() {
    if (!editing.name.trim()) return 'Course name is required.';
    const hcps = editing.holes.map((h) => Number(h.handicap));
    const pars = editing.holes.map((h) => Number(h.par));
    if (pars.some((p) => !(p >= 3 && p <= 6))) return 'Every hole needs a par between 3 and 6.';
    const sorted = [...hcps].sort((a, b) => a - b);
    for (let i = 0; i < 18; i++) {
      if (sorted[i] !== i + 1) return 'Hole handicaps must use each number 1 through 18 exactly once.';
    }
    return '';
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveCourse({
        id: editing.id,
        name: editing.name.trim(),
        tees: editing.tees.split(',').map((t) => t.trim()).filter(Boolean),
        holes: editing.holes.map((h) => ({
          number: h.number,
          par: Number(h.par),
          handicap: Number(h.handicap),
        })),
      });
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (editing) {
    const totalPar = editing.holes.reduce((a, h) => a + (Number(h.par) || 0), 0);
    return (
      <div className="page">
        <h1>{editing.id ? 'Edit course' : 'New course'}</h1>
        <label>
          Course name
          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Skylinks" />
        </label>
        <label>
          Tee options (comma separated)
          <input value={editing.tees} onChange={(e) => setEditing({ ...editing, tees: e.target.value })} placeholder="Black, Blue" />
        </label>
        <table className="holes-table">
          <thead>
            <tr><th>Hole</th><th>Par</th><th>Hole handicap (1-18)</th></tr>
          </thead>
          <tbody>
            {editing.holes.map((h, i) => (
              <tr key={h.number}>
                <td>{h.number}</td>
                <td><input type="number" min="3" max="6" value={h.par} onChange={(e) => setHole(i, 'par', e.target.value)} /></td>
                <td><input type="number" min="1" max="18" value={h.handicap} onChange={(e) => setHole(i, 'handicap', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td>Total</td><td>{totalPar}</td><td></td></tr>
          </tfoot>
        </table>
        {error && <p className="error">{error}</p>}
        <div className="row gap">
          <button onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save course'}</button>
          <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row spread">
        <h1>Courses</h1>
        {canEdit && <button onClick={startNew}>+ New course</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {courses === null ? (
        <p>Loading...</p>
      ) : courses.length === 0 ? (
        <p>No courses yet. {canEdit ? 'Add your first course to get started.' : ''}</p>
      ) : (
        <ul className="card-list">
          {courses.map((c) => (
            <li key={c.id} className="card">
              <div className="row spread">
                <strong>{c.name}</strong>
                {canEdit && <button className="link" onClick={() => startEdit(c)}>Edit</button>}
              </div>
              <div className="muted">
                Par {c.holes.reduce((a, h) => a + h.par, 0)} · Tees: {(c.tees || []).join(', ')} · Par 3s:{' '}
                {c.holes.filter((h) => h.par === 3).map((h) => `#${h.number}`).join(', ') || 'none'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
