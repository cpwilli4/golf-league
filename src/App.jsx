import React, { useEffect, useState } from 'react';
import { supabase, isConfigured } from './supabase.js';
import CoursesPage from './components/CoursesPage.jsx';
import EventsPage from './components/EventsPage.jsx';
import EventPage from './components/EventPage.jsx';
import Login from './components/Login.jsx';

// Tiny hash router: '' or '#/events', '#/courses', '#/event/<id>'
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [page, id] = h.split('/');
  if (page === 'event' && id) return { page: 'event', eventId: id };
  if (page === 'courses') return { page: 'courses' };
  return { page: 'events' };
}

export default function App() {
  const [route, setRoute] = useState(parseHash());
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <div className="setup-notice">
        <h1>Golf Club of LA League</h1>
        <p>
          Almost there! The app is not connected to a database yet. Open{' '}
          <code>src/config.js</code> and paste in your Supabase URL and anon
          key, then redeploy. See the README for step-by-step instructions.
        </p>
      </div>
    );
  }

  const canEdit = !!session;

  return (
    <div className="app">
      <header className="topbar no-print">
        <span className="brand" onClick={() => (window.location.hash = '#/events')}>
          ⛳ GCLA League
        </span>
        <nav>
          <a href="#/events" className={route.page !== 'courses' ? 'active' : ''}>Events</a>
          <a href="#/courses" className={route.page === 'courses' ? 'active' : ''}>Courses</a>
        </nav>
        <div className="auth">
          {canEdit ? (
            <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
          ) : (
            <button className="link" onClick={() => setShowLogin(true)}>Scorekeeper sign in</button>
          )}
        </div>
      </header>

      {!canEdit && (
        <div className="banner no-print">
          Viewing in read-only mode. Sign in to enter scores.
        </div>
      )}

      {showLogin && !canEdit && <Login onClose={() => setShowLogin(false)} />}

      <main>
        {route.page === 'courses' && <CoursesPage canEdit={canEdit} />}
        {route.page === 'events' && <EventsPage canEdit={canEdit} />}
        {route.page === 'event' && <EventPage eventId={route.eventId} canEdit={canEdit} />}
      </main>
    </div>
  );
}
