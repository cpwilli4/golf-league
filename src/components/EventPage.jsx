import React, { useCallback, useEffect, useState } from 'react';
import { getEventFull, listPlayers } from '../api.js';
import ScoresTab from './ScoresTab.jsx';
import KPTab from './KPTab.jsx';
import ResultsTab from './ResultsTab.jsx';

export default function EventPage({ eventId, canEdit }) {
  const [data, setData] = useState(null); // { event, rounds, kpEntries }
  const [players, setPlayers] = useState([]);
  const [tab, setTab] = useState('results');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [full, pl] = await Promise.all([getEventFull(eventId), listPlayers()]);
      setData(full);
      setPlayers(pl);
    } catch (e) {
      setError(e.message);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (canEdit) setTab((t) => (t === 'results' ? 'scores' : t));
  }, [canEdit]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p>Loading...</p></div>;

  const { event, rounds, kpEntries } = data;
  const course = event.courses;

  // Normalize rounds for the engines
  const engineRounds = rounds.map((r) => ({
    id: r.id,
    playerId: r.player_id,
    playerName: r.players?.name || 'Unknown',
    tee: r.tee,
    courseHandicap: r.course_handicap,
    groupNumber: r.group_number,
    scores: r.scores,
  }));

  const engineKps = kpEntries.map((e) => ({
    id: e.id,
    holeNumber: e.hole_number,
    groupNumber: e.group_number,
    playerId: e.player_id,
    playerName: e.players?.name || 'Unknown',
    distanceFeet: e.distance_feet,
    distanceInches: e.distance_inches,
    madePar: e.made_par,
  }));

  return (
    <div className="page">
      <h1>{event.title || event.event_date}</h1>
      <p className="muted">{course.name} · {event.event_date}</p>

      <div className="tabs no-print">
        {canEdit && (
          <>
            <button className={tab === 'scores' ? 'tab active' : 'tab'} onClick={() => setTab('scores')}>Score entry</button>
            <button className={tab === 'kp' ? 'tab active' : 'tab'} onClick={() => setTab('kp')}>KP sheet</button>
          </>
        )}
        <button className={tab === 'results' ? 'tab active' : 'tab'} onClick={() => setTab('results')}>Results</button>
      </div>

      {tab === 'scores' && canEdit && (
        <ScoresTab event={event} course={course} rounds={rounds} players={players} onChanged={refresh} />
      )}
      {tab === 'kp' && canEdit && (
        <KPTab event={event} course={course} rounds={engineRounds} kpEntries={kpEntries} players={players} onChanged={refresh} />
      )}
      {tab === 'results' && (
        <ResultsTab event={event} course={course} rounds={engineRounds} kpEntries={engineKps} />
      )}
    </div>
  );
}
