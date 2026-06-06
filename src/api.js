import { supabase } from './supabase.js';

function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---- Courses ----
export async function listCourses() {
  return check(await supabase.from('courses').select('*').order('name'));
}
export async function saveCourse(course) {
  const row = { name: course.name, holes: course.holes, tees: course.tees };
  if (course.id) {
    return check(await supabase.from('courses').update(row).eq('id', course.id).select().single());
  }
  return check(await supabase.from('courses').insert(row).select().single());
}

// ---- Players ----
export async function listPlayers() {
  return check(await supabase.from('players').select('*').order('name'));
}
export async function addPlayer(name) {
  return check(await supabase.from('players').insert({ name }).select().single());
}

// ---- Events ----
export async function listEvents() {
  return check(
    await supabase
      .from('events')
      .select('*, courses(name)')
      .order('event_date', { ascending: false })
  );
}
export async function createEvent(ev) {
  return check(await supabase.from('events').insert(ev).select().single());
}
export async function updateEvent(id, fields) {
  return check(await supabase.from('events').update(fields).eq('id', id).select().single());
}
export async function getEventFull(eventId) {
  const event = check(
    await supabase.from('events').select('*, courses(*)').eq('id', eventId).single()
  );
  const rounds = check(
    await supabase.from('rounds').select('*, players(name)').eq('event_id', eventId)
  );
  const kpEntries = check(
    await supabase.from('kp_entries').select('*, players(name)').eq('event_id', eventId)
  );
  return { event, rounds, kpEntries };
}

// ---- Rounds ----
export async function saveRound(round) {
  const row = {
    event_id: round.event_id,
    player_id: round.player_id,
    tee: round.tee,
    course_handicap: round.course_handicap,
    group_number: round.group_number,
    scores: round.scores,
  };
  if (round.id) {
    return check(await supabase.from('rounds').update(row).eq('id', round.id).select().single());
  }
  return check(await supabase.from('rounds').insert(row).select().single());
}
export async function deleteRound(id) {
  check(await supabase.from('rounds').delete().eq('id', id));
}

// ---- KP entries ----
export async function saveKpEntry(entry) {
  const row = {
    event_id: entry.event_id,
    hole_number: entry.hole_number,
    group_number: entry.group_number,
    player_id: entry.player_id,
    distance_feet: entry.distance_feet,
    distance_inches: entry.distance_inches,
    made_par: entry.made_par,
  };
  return check(
    await supabase
      .from('kp_entries')
      .upsert(row, { onConflict: 'event_id,hole_number,group_number' })
      .select()
      .single()
  );
}
export async function deleteKpEntry(id) {
  check(await supabase.from('kp_entries').delete().eq('id', id));
}
