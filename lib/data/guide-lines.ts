import type { Voice } from '@/lib/guide-characters'

// What the guide characters say, by moment and voice: sky is Scout, pack is
// Ace, deep is Finn. A moment with two lines alternates by day.
//
// House rules, enforced by __tests__/guide-lines.test.ts: offers, never
// orders; no guilt for a missed day, a low score or an unmet objective; no
// exclamation marks, dashes or semicolons; ", {name}" only in that exact
// form (it drops out cleanly when there is no name); {streak} only in
// greet.streak.
export const LINES = {
  'greet.morning': {
    sky: [
      'Morning, {name}. Sleep first, then we set the one thing that matters today.',
      "Eyes up, {name}. Want to start with last night's sleep?",
    ],
    pack: [
      "Morning, {name}. We're up, and that counts. Want to start with last night's sleep?",
      "We're up, {name}. Ready to log last night's sleep and get our morning going?",
    ],
    deep: [
      "Morning, {name}. Your brain is still waking up, so we start easy: last night's sleep.",
      "Good morning, {name}. I'm curious how you slept, since it shapes how today feels.",
    ],
  },
  'greet.midday': {
    sky: [
      'Good to see you, {name}. Two minutes to check in, then one clear target.',
      'Afternoon, {name}. Want a clear read on where you stand today?',
    ],
    pack: [
      "Hey, {name}. Glad we're here. Quick check-in, then we get after it.",
      "Glad you're here, {name}. Want to do a quick check-in together?",
    ],
    deep: [
      'Hi, {name}. A quick check-in now makes the rest of the day easier to read.',
      'Afternoon, {name}. Naming how you feel can make it easier to handle. Want to check in?',
    ],
  },
  'greet.evening': {
    sky: [
      'Evening, {name}. A short check-in, then we close the day clean.',
      'Evening, {name}. Want a clear look at today before it closes?',
    ],
    pack: [
      "Evening, {name}. We made it to the end of the day. Quick check-in, when you're ready.",
      'Evening, {name}. Before we wrap up the day, want to check in together?',
    ],
    deep: [
      'Evening, {name}. A quick look at today helps tomorrow start smoother.',
      'Evening, {name}. The day is still fresh in your mind. Want to check in now?',
    ],
  },
  'greet.streak': {
    sky: [
      "{streak} days in a row. That's not luck. That's who you are.",
      "{streak} days in a row. That's a pattern, and the pattern is you.",
    ],
    pack: [
      '{streak} days straight, and we showed up for every one. Ready for today?',
      "We've shown up {streak} days straight. That's the kind of athlete you are.",
    ],
    deep: [
      '{streak} days in a row. Repeating something is how it becomes part of you.',
      '{streak} days in a row. What you repeat gets easier, and it becomes part of who you are.',
    ],
  },
  'greet.gameday': {
    sky: [
      'Game day, {name}. Who you are is already set, whatever the score says.',
      "Game day, {name}. You already know who you are. Let's get your mind ready.",
    ],
    pack: [
      "Game day, {name}. Whatever the score, I'm with you, and you get to play like you.",
      "Game day, {name}. I'm with you the whole way. Ready when you are.",
    ],
    deep: [
      "Game day, {name}. If you feel nerves, that's your body getting ready to play.",
      "Game day, {name}. The score isn't fully up to you, but playing like yourself is.",
    ],
  },
  'greet.back': {
    sky: [
      'Good to see you. Today is a clean page. Want to pick one target?',
      'New day, clear view. Ready when you are.',
    ],
    pack: [
      "Glad you're here. Today's brand new. Want to start it with me?",
      "Glad you're here. We get a fresh start today.",
    ],
    deep: [
      'Each day gets its own start, and this one is yours. Ready when you are.',
      'Nice to see you. Today stands on its own. Want to start it fresh?',
    ],
  },
  'sleep.ask': {
    sky: [
      'How did you sleep? An honest number helps us aim the day.',
      "Last night's sleep. The real numbers show where today starts.",
    ],
    pack: [
      'How did we sleep last night? Honest answers only help.',
      'How did last night go? We work with the real numbers, whatever they are.',
    ],
    deep: [
      'How was your sleep? Knowing it helps make sense of the day.',
      "I'm curious how last night went. The real answer is the useful one.",
    ],
  },
  'sleep.short': {
    sky: [
      "Short night. It happens. You could keep today's target simple.",
      'Short night. It happens, and going a little easier today is an option.',
    ],
    pack: [
      'Short night, and we can work with it. Want to go easier today or get to bed earlier?',
      'Short nights happen. We could go a little easier today, your call.',
    ],
    deep: [
      'Short nights are common. An earlier night tonight can help, if you want one.',
      "That happens. Going a little easier today is a fair choice, and it's yours to make.",
    ],
  },
  'sleep.good': {
    sky: [
      "Solid night. That's a sharp start.",
      "A full night. That's a strong base for today.",
    ],
    pack: [
      "Great night. We're starting with a full tank.",
      "Nice, a full night. We're rested and ready to put in good work.",
    ],
    deep: [
      'Nice. Sleep helps what you practiced settle in.',
      "That's a full night. A good base for whatever today asks.",
    ],
  },
  'routine.water': {
    sky: [
      'Water first. A clear head starts simple.',
      'Want to start with a glass of water? Simple things first.',
    ],
    pack: [
      'Glass of water. Easy first win for us.',
      "First up, a glass of water. Want to grab one and we'll get going?",
    ],
    deep: [
      'You wake up a little dry after a night without water. A glass now helps.',
      'You lose water overnight just by breathing. Want to start with a glass?',
    ],
  },
  'routine.identity': {
    sky: [
      'Read it out loud. Who you are comes before what you do.',
      "Your statement, out loud, when you're ready. Who you are leads what you do.",
    ],
    pack: [
      "Say it like you mean it. This is who we're showing up as today.",
      'This is who you are. Want to say it out loud so we both hear it?',
    ],
    deep: [
      'Say it out loud. Hearing your own words helps them stick.',
      'Words you say out loud tend to stick more than words you only read. Want to try it?',
    ],
  },
  'routine.breathe': {
    sky: [
      'Five slow breaths. In for four, out for six. Let everything settle.',
      'Want to settle your focus? Five breaths, four seconds in and six out.',
    ],
    pack: [
      'Five slow breaths, together. In for four, out for six.',
      'Want to breathe with me? Five slow ones, in for four and out for six.',
    ],
    deep: [
      'Breathe in for four, out for six. A longer exhale slows your heart rate.',
      'Breathing out slowly helps your body settle. Five slow breaths, about 50 seconds.',
    ],
  },
  'routine.see': {
    sky: [
      'Close your eyes. See today go right, one moment at a time.',
      'See it first. Want to take 60 seconds and picture today going right?',
    ],
    pack: [
      'Picture today going our way: practice, class, the moment that matters.',
      'Want to picture today going right with me? 60 seconds, start to finish.',
    ],
    deep: [
      'Picture the day going well. Your brain rehearses what it imagines.',
      'Picturing a skill uses some of the same brain areas as doing it. Want 60 seconds to try?',
    ],
  },
  'routine.objective': {
    sky: [
      'One target. What makes today a win?',
      'The one thing that makes today a win. What do you see?',
    ],
    pack: [
      "What's the one thing we're getting done today? Small is fine.",
      "What's our one thing today? Whatever you pick, I'm all in.",
    ],
    deep: [
      'Pick one thing for today. One clear goal is easier to hit than five.',
      "A clear goal gives your attention somewhere to go. What's your one thing today?",
    ],
  },
  'ratings.morning': {
    sky: [
      "Now you're awake. Where are you really at right now?",
      "You're awake and settled. Now the read is a true one.",
    ],
    pack: [
      "We're up and moving. How are we feeling, honestly?",
      "Routine done, nice work. Want to tell me honestly where you're at?",
    ],
    deep: [
      "You're settled now, so this read is more accurate. No right answers.",
      "Right after waking, things can feel foggy. Now that you're settled, how do you feel?",
    ],
  },
  'ratings.ask': {
    sky: [
      'A quick read on right now. Honest beats impressive.',
      'A quick read. Where are you right now?',
    ],
    pack: [
      'How are we doing right now? Just the truth.',
      "Quick check on how you feel. Honest is all we're after.",
    ],
    deep: [
      "Rate how you feel right now. It's information, not a grade.",
      "How you feel shifts through the day, so it helps to check. What's true right now?",
    ],
  },
  'lock.identity': {
    sky: [
      'This is you. Carry it into the day.',
      'Your words. Want one beat to let them settle?',
    ],
    pack: [
      "That's us today. Let's lock it in.",
      'This is who we show up as today. Want to take a beat with it?',
    ],
    deep: [
      'Read it once more. What you repeat, you start to believe.',
      'This is who you are, whatever today brings. A quiet beat helps it stay with you.',
    ],
  },
  'reveal.high': {
    sky: [
      "You're dialed in. Pick your target and go get it.",
      'A high read. A good day to go after your target.',
    ],
    pack: [
      "We're ready today. Let's make it count.",
      "That's a strong number. We're ready. Want to put it to good use?",
    ],
    deep: [
      'Strong read today. A good day to try something hard.',
      'Nice. Days when you feel ready are good for practicing the hard stuff, if you want to.',
    ],
  },
  'reveal.mid': {
    sky: [
      'A steady read. One clear target will sharpen it.',
      'Steady. Clear enough to do good work on one target.',
    ],
    pack: [
      'Solid. We can have a good day without a perfect one.',
      'Solid ground. We can build on this today.',
    ],
    deep: [
      'A middle read is normal. Most good days start right here.',
      'Nothing unusual here. A lot of progress comes from ordinary days like this one.',
    ],
  },
  'reveal.low': {
    sky: [
      'Lower number, same you. A smaller target is plenty today.',
      "Today asks for less. Who you are hasn't changed.",
    ],
    pack: [
      "Lower one today, and that's okay. We can go a little lighter, and you're still you.",
      "Okay. We can go lighter today, and you're still the same athlete.",
    ],
    deep: [
      'This number reads today, not you. Easier days are part of training, so a lighter one is fine.',
      'A low read is information, not a verdict. Want to start with one small thing?',
    ],
  },
  'step.mind': {
    sky: [
      'Next: your journal. Two minutes to aim the day.',
      'Want to get today on the page? That closes your Mind ring.',
    ],
    pack: [
      "Journal's next. Want to knock it out together?",
      "Want to get a few thoughts down with me? Today's entry closes the Mind ring.",
    ],
    deep: [
      "Writing a thought down makes it easier to see. Today's entry closes your Mind ring.",
      "Today's entry closes your Mind ring. Two minutes is plenty.",
    ],
  },
  'step.body': {
    sky: [
      "Next, today's training. Logging it closes the Body ring.",
      'Your work, on the record. Want to log training and close the Body ring?',
    ],
    pack: [
      "Let's log today's training. We earned that one.",
      'Practice, lift or run, it all counts. Ready to log it with me?',
    ],
    deep: [
      "Tracking shows progress you can't feel yet. Today's training is ready to log.",
      'A written record shows patterns memory misses. Logging today closes your Body ring.',
    ],
  },
  'step.fuel': {
    sky: [
      "Next, fuel. Logging a meal closes the ring, when you're ready.",
      'Want to log a meal? It closes your Fuel ring.',
    ],
    pack: [
      "Time to log a meal. We can't train on empty.",
      'We train better fed. Got a meal to log?',
    ],
    deep: [
      'Food is what your body rebuilds with. Logging a meal closes your Fuel ring.',
      'Your brain runs on fuel too, not just your muscles. Want to log a meal?',
    ],
  },
  'step.rest': {
    sky: [
      "Next, last night's sleep. Logging it closes the Rest ring.",
      'Rest shapes how clearly you see. Want to log last night?',
    ],
    pack: [
      "Let's log our sleep. Rest counts as training too.",
      'Rest is part of our work too. Want to log last night and close the Rest ring?',
    ],
    deep: [
      "Recovery is when the work turns into progress. Want to log last night's sleep?",
      'Knowing your sleep helps explain how you feel. Logging it closes your Rest ring.',
    ],
  },
  'step.pregame': {
    sky: [
      'Game day. Your pregame routine is ready when you are.',
      'Ready starts before the game does. Want to begin your pregame routine?',
    ],
    pack: [
      "Game day. Let's run our pregame routine.",
      "We get ready the same way every time. Pregame routine, whenever you're set.",
    ],
    deep: [
      "A routine before a game tells your body what's coming. Yours is ready.",
      'Doing the same steps before a game helps you feel steady. Pregame is ready when you are.',
    ],
  },
  'step.bonus': {
    sky: [
      'All four closed. One more rep, if you want it.',
      "Everything's closed. Want one more rep on your biggest need?",
    ],
    pack: [
      'Four for four. Want one bonus rep with me?',
      "We closed all four today. There's one extra rep if you feel like it.",
    ],
    deep: [
      "All four rings are closed. Here's one extra, only if you're curious.",
      'Your rings are all closed. A little extra on your biggest need adds up, if you want it.',
    ],
  },
  'need.calm': {
    sky: [
      'A lot is moving right now. Want a minute of slow breathing?',
      "Want a minute of slow breathing? It's here if you'd like it.",
    ],
    pack: [
      "I'm right here. Want to breathe slow with me for a minute?",
      "I'm right here with you. Want to breathe slowly together for a minute?",
    ],
    deep: [
      "Slow breathing can help your body settle. One minute, if you'd like.",
      'A long exhale slows your heart a little. Want to try a minute of slow breathing?',
    ],
  },
  'need.focus': {
    sky: [
      "A short visualization gives your attention one target. It's here if you want it.",
      'Want a short visualization? One clear picture to aim at.',
    ],
    pack: [
      'Want to do a quick visualization with me? One picture, one target.',
      'Scattered days happen. Want to do a short visualization with me?',
    ],
    deep: [
      'Picturing one rep gives your attention a place to land. Want to try it?',
      'A clear picture gives your attention a place to land. Want a short visualization?',
    ],
  },
  'need.confidence': {
    sky: [
      'Confidence follows evidence. Your identity statements are a good place to look.',
      "What's true about you is written down. Want to read your statements?",
    ],
    pack: [
      'We know what you can do. Want to read your identity statements?',
      'I know who you are, even on a low day. Want to read your statements with me?',
    ],
    deep: [
      'Your identity statements still stand on a low day. Want to reread them?',
      'Confidence tends to follow evidence. Want to read your identity statements?',
    ],
  },
  'need.motivation': {
    sky: [
      "The target hasn't moved. Want to look at your goal and take the smallest step?",
      'One small step is enough today. Want to look at your goal first?',
    ],
    pack: [
      'Some days start slow. Want to look at our goal and take one small step?',
      'We can show up without feeling like it. Want to look at your goal and take a small step?',
    ],
    deep: [
      'Motivation often shows up after you start. One small step could do it.',
      'Motivation goes up and down, but who you are stays. Want to take the smallest step?',
    ],
  },
  'end.clutch': {
    sky: [
      "All four rings closed. That's a Clutch Day. This is your standard.",
      'Clutch Day. This is who you are.',
    ],
    pack: [
      'Four for four. A Clutch Day, and we earned every ring.',
      "All four rings closed. I'm proud to be on your team today.",
    ],
    deep: [
      'Clutch Day. Mind, body, fuel and rest all worked together today.',
      'Every ring closed today. Days like this are how an athlete gets built, and this one is yours.',
    ],
  },
  'end.plan': {
    sky: [
      'Your plan is set. It will be here when you come back to it.',
      "Your next step is marked. It's here whenever you're ready.",
    ],
    pack: [
      "We've got a plan. Come find me whenever you're ready for the next step.",
      "The plan is set, so no rush. I'll be right here when you want to pick it back up.",
    ],
    deep: [
      'The plan is set. Nothing is lost by coming back later.',
      "Your plan is set, so there's nothing to hold in your head. It will be here later.",
    ],
  },
  'evening.check': {
    sky: [
      "Looking back at today's target. Where did it land?",
      'Your target for today. How did it go?',
    ],
    pack: [
      "How did we do on today's objective?",
      'How did our objective go today? Any answer works for me.',
    ],
    deep: [
      "Checking in on today's objective. An honest answer helps tomorrow.",
      "I'm curious how today's objective went. Any answer is useful to know.",
    ],
  },
  'evening.yes': {
    sky: [
      'Target hit. You did what you said you would.',
      'Done. You saw it and you finished it.',
    ],
    pack: [
      'Yes. We said it and we did it.',
      "We got it done. I'm proud of the work you put in today.",
    ],
    deep: [
      'Done. Keeping a promise to yourself builds trust in yourself.',
      'Following through is a skill, and you practiced it today. That adds up.',
    ],
  },
  'evening.partly': {
    sky: [
      'Partly done is still forward. You know where to aim next.',
      "Partway there. You can see what's left more clearly now.",
    ],
    pack: [
      "We got part of it. That's real progress to build on.",
      'Partly counts. We moved it forward, and that matters.',
    ],
    deep: [
      'Partly done still moved you forward. What would finish it tomorrow?',
      'Partly is useful. It shows what worked and what might help next time.',
    ],
  },
  'evening.no': {
    sky: [
      "Not today. Now you know more for tomorrow's target.",
      'Not today. That is a clear answer, and clear is useful.',
    ],
    pack: [
      "Not today, and that's okay. We go again tomorrow.",
      "That's okay. We learned something, and we get another go tomorrow.",
    ],
    deep: [
      "Not today. That's useful to know. Tomorrow's goal can fit the day better.",
      'Not today is just information. Maybe the goal was big, or maybe the day was full.',
    ],
  },
  'night.start': {
    sky: ['Want to close the day clean? Five short steps.'],
    pack: ["Want to wind down together? Five short steps and we're done."],
    deep: ["A short wind-down helps your brain let go of the day. Five steps, if you'd like."],
  },
  'night.grateful': {
    sky: [
      "Three things you're glad about today. Small counts.",
      'Want to look back and find three good things? Small is fine.',
    ],
    pack: [
      "Three good things from today. I'll bet we can find them.",
      'What are we grateful for today? Three things, and the small stuff counts.',
    ],
    deep: [
      'Name three good things. Gratitude helps your mind settle before sleep.',
      "What you look for, you notice more. Three things you're grateful for, and small counts.",
    ],
  },
  'night.review': {
    sky: [
      'Look back at today. What went well? What would you sharpen?',
      'The whole day, in view. What worked, and what would you change?',
    ],
    pack: [
      'How did today go for us? One win, one thing to do better.',
      'Want to look back with me? What went well, and what would we do better?',
    ],
    deep: [
      'Think back over today. Noticing what worked helps you repeat it.',
      'A quick review helps lessons stick. What went well today, and what would you adjust?',
    ],
  },
  'night.tomorrow': {
    sky: [
      "Pick tomorrow's one target now. Wake up already aimed.",
      "Want to set tomorrow's one target? You'll wake up knowing where to look.",
    ],
    pack: [
      "What's our one thing for tomorrow? Let's decide it now.",
      "Want to pick tomorrow's one objective now? Then we wake up ready.",
    ],
    deep: [
      "Choose tomorrow's one thing tonight. Deciding early makes the morning easier.",
      "Writing tomorrow's plan down lets your mind stop holding it. What's your one objective?",
    ],
  },
  'night.screens': {
    sky: [
      'Phone on the charger, out of reach. Give your mind some quiet.',
      'Phone on the charger, out of reach, 30 minutes before sleep. Your call.',
    ],
    pack: [
      "Phone goes on the charger. We'll be fine without it for a night.",
      "Want to park the phone on the charger 30 minutes before sleep? I'll be here tomorrow.",
    ],
    deep: [
      'Screens can keep your brain alert. Thirty minutes without one can make sleep come easier.',
      'A phone in reach is hard to ignore. Want it on the charger 30 minutes before sleep?',
    ],
  },
  'night.breathe': {
    sky: [
      'Ninety seconds. In for four, out for six. Let the day go.',
      'Want to slow it down? 90 seconds of breathing before sleep.',
    ],
    pack: [
      'Last one. Slow breaths together, in for four, out for six.',
      'Want to breathe slowly with me for 90 seconds? Then we rest.',
    ],
    deep: [
      "Slow breathing tells your body it's safe to rest. Ninety seconds.",
      'Slow breathing helps your body shift toward rest. Want to try 90 seconds before sleep?',
    ],
  },
  'night.done': {
    sky: [
      'Day closed. Sleep well. Tomorrow we aim again.',
      'Goodnight. A rested mind sees more clearly tomorrow.',
    ],
    pack: [
      "That's the day. Good work. Rest up and we'll go again tomorrow.",
      "That's our day. Sleep well, and I'll see you in the morning.",
    ],
    deep: [
      'Day closed. Sleep is part of training, so this counts too. Goodnight.',
      'Goodnight. While you sleep, your body repairs and your brain keeps what you practiced.',
    ],
  },
  'pick.intro': {
    sky: ["I'm Scout. I don't say much, but I see the whole field and help you find your one target."],
    pack: ["I'm Ace, loyal and all in. I'll show up with you every day, the good ones and the hard ones."],
    deep: ["I'm Finn, curious and steady. I'll show you why the small things work, like sleep, water and breathing."],
  },
  'tour.rings': {
    sky: ["Four rings: Mind, Body, Fuel, Rest. Close all four and it's a Clutch Day."],
    pack: ["We've got four rings to close: Mind, Body, Fuel, Rest. All four is a Clutch Day."],
    deep: ['Four rings track your day: Mind, Body, Fuel and Rest. All four closed is a Clutch Day.'],
  },
  'tour.morning': {
    sky: ["Each morning: last night's sleep, a short routine, one objective."],
    pack: ['Every morning we start the same way: sleep, a short routine, one objective.'],
    deep: ['Mornings start with sleep, a short routine and one objective. Simple on purpose.'],
  },
  'tour.steps': {
    sky: ['I only show you one step at a time. One target is enough.'],
    pack: ["I'll only ever hand you one next step. We take them one at a time."],
    deep: ["You'll see one next step at a time. Fewer choices makes starting easier."],
  },
  'tour.identity': {
    sky: ['Who are you as an athlete? Want to write it down, starting with "I am"?'],
    pack: ['Who do we show up as? Want to write your statement, starting with "I am"?'],
    deep: ['How you see yourself affects how you play. Want to write yours, starting with "I am"?'],
  },
  'tour.objective': {
    sky: ['One target for today. Small is fine.'],
    pack: ["What's one thing we can get done today? Small is fine."],
    deep: ["Pick one thing for today. A small goal you hit beats a big one you don't."],
  },
  'tour.daily': {
    sky: ['Want me here the first time you open the app each day? Your call.'],
    pack: ["Want me to meet you here every day? I'd like that. Up to you."],
    deep: ['I can meet you here each day to start things off. You can change this anytime.'],
  },
  'dayone.done': {
    sky: ["You're set, {name}. Tomorrow we start with sleep and your routine. Today, look around."],
    pack: ["We're all set, {name}. Tomorrow morning we start for real. Today, go explore."],
    deep: ['All set, {name}. Tomorrow starts with sleep and a short routine. Today is for exploring.'],
  },
  'evolve.new': {
    sky: ['A new form, earned one day at a time. Same eyes on the target.'],
    pack: ['Look at us. We grew, because we kept showing up together.'],
    deep: ['This is what repeating something does. It changes you, a little each day.'],
  },
  'tip.mindset': {
    sky: ['This is home base. The guide bar always holds your next step.'],
    pack: ['Home base. Tap the guide bar and we pick up where we left off.'],
    deep: ['Your journal and routine live here. The guide bar has your next step.'],
  },
  'tip.nutrition': {
    sky: ['One meal logged closes your Fuel ring.'],
    pack: ['Log one meal here and we close Fuel for the day.'],
    deep: ['One logged meal closes the Fuel ring. Search or scan, whichever is quicker.'],
  },
  'tip.exercise': {
    sky: ['Any training logged here closes the Body ring.'],
    pack: ['Practice, lift or run. Log it here and Body is ours.'],
    deep: ['Any session counts here. Logging it closes your Body ring.'],
  },
  'tip.sleep': {
    sky: ["Last night's sleep goes here. It closes Rest."],
    pack: ['Log last night here and we close Rest.'],
    deep: ['Sleep and recovery both live here. Either one closes your Rest ring.'],
  },
  'tip.progress': {
    sky: ['This is the long view. Your ratings and streak over time.'],
    pack: ["Here's how far we've come. Worth a look now and then."],
    deep: ['Trends show up here once you have a few entries. Patterns beat single days.'],
  },
  'tip.leaderboard': {
    sky: ["The Board ranks this month's points. Your title shows what you train most."],
    pack: ['This is The Board. Every log earns us points.'],
    deep: ['Points come from logging across all four rings. Balance earns the best titles.'],
  },
} satisfies Record<string, Record<Voice, string[]>>

export type LineKey = keyof typeof LINES

// seed picks between a moment's lines; pass the day (daySeed) so it holds still for the day.
export function guideLine(voice: Voice, key: LineKey, opts: { name?: string; streak?: number; seed?: number } = {}): string {
  const options: string[] = LINES[key][voice]
  const text = options[(opts.seed ?? 0) % options.length]
  return text
    .replace(', {name}', opts.name ? `, ${opts.name}` : '')
    .replace('{streak}', String(opts.streak ?? ''))
}
