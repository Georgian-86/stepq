/**
 * Every push notification line StepQ sends on its own, plus ready-made ideas for the admin's
 * "Surprise me" button. Plain data, shared by the server (nudges) and the dashboard (composer).
 *
 * Placeholders, filled per person when the push goes out:
 *   {name}   first name           {steps}  steps so far today   {goal}  daily goal
 *   {left}   steps left to goal   {km}     km walked today      {streak} days in a row
 * A line whose placeholder has no value (an admin push to someone with no steps yet, say) has
 * it replaced by a neutral word, so nothing ever shows a raw "{left}".
 *
 * Tone: a cheeky friend who walks a lot, not a fitness app. Short titles (they get cut on the
 * lock screen after ~40 characters), one emoji at most, no guilt-tripping, no medical claims.
 */

export type PushLine = { title: string; body: string };

export type NudgeKind =
  | 'morning'
  | 'water'
  | 'evening_behind'
  | 'evening_close'
  | 'streak_risk'
  | 'goal_reached'
  | 'comeback';

/** Which Android notification channel each kind lands in (see the app's StepqApplication). */
export const CHANNEL: Record<NudgeKind | 'campaign', 'nudges' | 'water' | 'news'> = {
  morning: 'nudges',
  water: 'water',
  evening_behind: 'nudges',
  evening_close: 'nudges',
  streak_risk: 'nudges',
  goal_reached: 'nudges',
  comeback: 'nudges',
  campaign: 'news',
};

export const NUDGES: Record<NudgeKind, PushLine[]> = {
  // 08:00–10:00 India time, when today's steps are still under 500.
  morning: [
    { title: 'Rise and stride, {name} ☀️', body: 'Your shoes called. They said they miss you.' },
    {
      title: 'Good morning from Piko',
      body: 'Today’s {goal} steps won’t walk themselves. Probably.',
    },
    {
      title: 'Chai first. Then steps?',
      body: 'A 10-minute walk now and you’re 1,000 steps up before lunch.',
    },
    {
      title: 'Fresh day, fresh steps',
      body: 'Yesterday is history. Today’s counter says 0 and it’s judging no one.',
    },
    {
      title: 'Your legs have a meeting',
      body: 'Agenda: walk. Duration: 10 mins. Attendance: mandatory-ish.',
    },
    {
      title: 'Plot twist: you walk today',
      body: 'Take the stairs once and let the story begin, {name}.',
    },
    { title: 'Breakfast of champions', body: 'Toast, chai, and 500 steps to the gate and back.' },
    {
      title: 'Piko is stretching',
      body: 'Piko is ready. Piko is waiting. Piko is a little dramatic.',
    },
  ],
  // Around 11:30 and 16:30.
  water: [
    { title: 'Glug glug o’clock 💧', body: 'Grab a glass, {name}. Your next walk will thank you.' },
    { title: 'Hydration check', body: 'Plants need water. You’re basically a plant that walks.' },
    { title: 'Paani break!', body: 'One glass now. Future-you on the evening walk says thanks.' },
    {
      title: 'Your bottle feels ignored',
      body: 'It’s been sitting there all day. Show it some love.',
    },
    { title: 'Sip happens', body: 'Small sips, big steps. Have a glass before you forget again.' },
    { title: 'Water you waiting for?', body: 'Sorry. Not sorry. Go drink some water, {name}.' },
    {
      title: 'Refill o’clock',
      body: 'Walk to the water cooler. That’s steps AND water. Big brain.',
    },
  ],
  // 18:30–20:00, under 60% of the goal.
  evening_behind: [
    {
      title: '{left} steps between you and glory',
      body: 'An evening walk gets you there before dinner, {name}.',
    },
    {
      title: 'The couch is winning 1–0',
      body: 'Equalise with a 20-minute walk. {steps} done, {left} to go.',
    },
    {
      title: 'Evening walk, anyone?',
      body: 'The weather’s nice (probably). {left} steps to hit your goal.',
    },
    {
      title: 'Netflix can wait 10 minutes',
      body: 'Walk first, binge after. {left} steps left today.',
    },
    {
      title: 'Your goal is still on',
      body: 'It’s not too late. {left} steps = one good playlist.',
    },
    {
      title: 'Dinner walk unlocked',
      body: 'Walk to get the sabzi. Walk back. Eat. Repeat tomorrow.',
    },
    {
      title: 'Low battery: {steps} steps',
      body: 'Charge up with a quick walk round the block, {name}.',
    },
  ],
  // 18:30–20:00, 60–99% of the goal.
  evening_close: [
    {
      title: 'Sooo close, {name}! 🔥',
      body: 'Only {left} steps left. That’s one lap of the building.',
    },
    {
      title: '{left} steps. That’s it.',
      body: 'You’ve done {steps}. Don’t leave the last bit on the table.',
    },
    {
      title: 'Almost there!',
      body: 'Walk while you’re on the phone and you’ll hit {goal} before you hang up.',
    },
    {
      title: 'The finish line can see you',
      body: '{left} steps to go. Piko’s holding the ribbon.',
    },
    { title: 'Last stretch!', body: 'A quick walk after dinner closes it out. {left} to go.' },
    { title: 'One more walk', body: 'You’re {left} steps away from a very smug feeling.' },
  ],
  // 20:30–22:00, on a streak of 2+ days and today is still under goal.
  streak_risk: [
    {
      title: 'Your {streak}-day streak is sweating 😰',
      body: '{left} steps before midnight keeps it alive.',
    },
    {
      title: 'Don’t break the chain, {name}',
      body: '{streak} days in a row. {left} steps keeps it going.',
    },
    {
      title: 'SOS from your streak',
      body: 'It’s been with you {streak} days. It deserves {left} more steps.',
    },
    { title: 'Streak in danger!', body: 'A short walk now saves {streak} days of hard work.' },
    { title: 'Tick tock, streak o’clock', body: '{left} steps till midnight. You’ve got this.' },
  ],
  // As soon as today's steps reach the goal (07:00–22:30).
  goal_reached: [
    { title: 'GOAL! 🎉 {steps} steps', body: 'You did it, {name}. Piko is doing a little dance.' },
    {
      title: 'Goal smashed!',
      body: '{steps} steps today. Take a bow. Then maybe a glass of water.',
    },
    { title: 'Legend behaviour', body: '{goal} steps done. Your shoes are proud of you.' },
    { title: 'That’s a wrap!', body: '{km} km today. Rest those legs, champ.' },
    { title: 'Ding ding ding!', body: 'Daily goal reached. See you on the leaderboard, {name}.' },
    { title: 'Mission accomplished', body: '{steps} steps. Anything else is a bonus round.' },
  ],
  // 10:00–12:00, after exactly 3 or 7 days with no steps synced.
  comeback: [
    {
      title: 'Piko misses you 🥺',
      body: 'It’s been a few days. A 5-minute walk is a great comeback.',
    },
    {
      title: 'Long time no walk, {name}',
      body: 'No pressure. Just 1,000 steps today and we’re even.',
    },
    { title: 'Your friends are walking…', body: '…and the leaderboard has a you-shaped gap.' },
    { title: 'Remember us?', body: 'StepQ here. Your step counter is ready when you are.' },
    { title: 'Restart button pressed', body: 'New streak, day 1. Let’s go, {name}.' },
  ],
};

/** Starting points for pushes an admin writes; "Surprise me" in the composer picks one. */
export const CAMPAIGN_IDEAS: PushLine[] = [
  {
    title: 'Weekend mode: ON 🏞️',
    body: 'Saturdays are for long walks and longer brunches, {name}.',
  },
  { title: 'Monday motivation', body: 'New week, new leaderboard. Be the first to 5,000 today.' },
  {
    title: 'New challenge just dropped',
    body: 'Open StepQ to join this week’s challenge before your friends do.',
  },
  { title: 'Rain? Walk the mall.', body: 'Indoor steps count too. Window shopping is cardio now.' },
  {
    title: 'It’s a beautiful evening',
    body: 'Perfect weather for a QRun. Find one near you in the app.',
  },
  {
    title: 'Bring a friend, double the fun',
    body: 'Invite a friend to StepQ and race them this week.',
  },
  {
    title: 'Festival feast incoming 🪔',
    body: 'Walk now, eat the extra laddoo later. That’s the deal.',
  },
  {
    title: 'Leaderboard update!',
    body: 'Someone just passed you. Are you going to take that, {name}?',
  },
  {
    title: 'Step up, India!',
    body: 'The whole country is walking today. Add your steps to the count.',
  },
  { title: 'Psst, {name}', body: 'Small walks add up. 10 minutes now = 1,000 steps closer.' },
];

export type PushValues = Partial<
  Record<'name' | 'steps' | 'goal' | 'left' | 'km' | 'streak', string | number>
>;

/** Words used when a placeholder has no value for this person. */
const FALLBACK: Record<string, string> = {
  name: 'friend',
  steps: 'a few',
  goal: 'your goal',
  left: 'a few more',
  km: 'a few',
  streak: 'multi',
};

const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('en-IN') : v);

/** Fills `{placeholders}` in `text`; unknown ones are left alone, missing ones get a fallback. */
export function fill(text: string, values: PushValues): string {
  return text.replace(/\{(name|steps|goal|left|km|streak)\}/g, (_, key: keyof PushValues) => {
    const v = values[key];
    return v === undefined || v === null || v === '' ? FALLBACK[key]! : fmt(v);
  });
}

/**
 * The line for `kind` on `day`, picked by a hash of the seed (user id) and day, so each person
 * gets a different line each day and two people on the same day usually get different ones.
 */
export function pickLine(kind: NudgeKind, seed: string, day: string): PushLine {
  const lines = NUDGES[kind];
  let h = 2166136261;
  for (const ch of `${kind}:${seed}:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return lines[(h >>> 0) % lines.length]!;
}
