export type LessonTopic = 'Sport psychology' | 'Psychology' | 'Fitness' | 'Sports history'

export type LessonCard =
  | { kind: 'text'; heading: string; body: string }
  | { kind: 'reveal'; prompt: string; answer: string }
  | { kind: 'choice'; prompt: string; options: string[]; answer: number; explain: string }

export interface QuizQuestion { q: string; options: string[]; answer: number; explain: string }

export interface DailyLesson {
  id: string            // 'dl-001' .. 'dl-030', never reused
  topic: LessonTopic
  title: string         // max 48 chars
  minutes: number       // 2 or 3
  cards: LessonCard[]   // 4 to 5 cards; at least one 'reveal' or 'choice' card
  takeaway: string      // one line the athlete can use today, max 120 chars
  quiz: QuizQuestion[]  // exactly 3 questions, 3 or 4 options each, answer = index of the correct option
}

export const DAILY_LESSONS: DailyLesson[] = [
  {
    id: "dl-001",
    topic: "Sport psychology",
    title: "Your Pre-Performance Routine",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Why the best repeat themselves", body: "Watch elite free throw shooters, golfers, or servers. They do the same small steps every time. That is not superstition. It is a pre-performance routine, and it is one of the most studied tools in sport psychology." },
      { kind: "text", heading: "What a routine actually does", body: "A routine gives your mind a job right before you perform. It pulls attention away from worry and onto a few simple steps. It also tells your body, \"We have done this a thousand times.\" Familiar steps create a familiar state." },
      { kind: "choice", prompt: "Which is a routine, not a superstition?", options: ["Two dribbles, one breath, eyes on the rim, shoot", "Wearing the same socks every game", "Eating the same meal as last win", "Touching the wall on the way out"], answer: 0, explain: "A routine is made of steps that control your breathing, focus, and body. A superstition is a ritual with no direct link to the skill." },
      { kind: "text", heading: "Build yours in four parts", body: "1. A breath to settle your body. 2. A cue word to set your focus. 3. A picture of the result you want. 4. A trigger to start, then trust it. Keep it short. Use it in practice so it is automatic in games." },
      { kind: "reveal", prompt: "Who are you becoming when you use a routine?", answer: "An athlete who creates their own calm instead of waiting for it. Your routine is proof that you are prepared, no matter what the scoreboard says." }
    ],
    takeaway: "Pick one breath, one cue word, and one trigger. Use them before every rep today.",
    quiz: [
      { q: "What is the main job of a pre-performance routine?", options: ["To bring good luck", "To impress the coach", "To make the play take longer", "To direct attention and settle your body before you perform"], answer: 3, explain: "Routines give your mind a task that controls focus and arousal right before the skill." },
      { q: "Where should you first practice your routine?", options: ["Only in big games", "In practice, so it becomes automatic", "Only when you feel nervous", "Never, it should feel spontaneous"], answer: 1, explain: "Practicing the routine in training makes it automatic when pressure rises." },
      { q: "Which part of a routine sets your focus?", options: ["A lucky charm", "A long speech", "A cue word", "Checking the crowd"], answer: 2, explain: "A short cue word points your attention at what matters for the next rep." }
    ]
  },
  {
    id: "dl-002",
    topic: "Psychology",
    title: "Growth Mindset, Done Right",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Two beliefs about ability", body: "Psychologist Carol Dweck describes two mindsets. A fixed mindset says ability is set: you have it or you do not. A growth mindset says ability can be built through effort, good strategies, and help from others." },
      { kind: "text", heading: "Why it matters on the field", body: "If you think talent is fixed, every mistake feels like proof you are not good enough. So you avoid hard reps. If you think skill grows, mistakes become information. You stay in the hard drills long enough to improve." },
      { kind: "choice", prompt: "Which response shows a growth mindset after a bad game?", options: ["\"I'm just not a shooter.\"", "\"I tried hard, that's all that matters.\"", "\"The refs cost us.\"", "\"My release was rushed. I'll work on it this week.\""], answer: 3, explain: "Growth mindset is not just effort. It pairs effort with a specific strategy to get better." },
      { kind: "text", heading: "The honest version", body: "Growth mindset is not a magic switch. Large studies show its effects are real but modest. It works best when it changes what you actually do: choosing harder reps, asking for feedback, and changing strategies when stuck." },
      { kind: "reveal", prompt: "What is the most important word to add to \"I can't do this\"?", answer: "\"Yet.\" \"I can't do this yet\" turns a verdict into a plan. It describes where you are, not who you are." }
    ],
    takeaway: "When you miss today, name one thing to adjust. Effort plus strategy is how skill grows.",
    quiz: [
      { q: "Who is the researcher known for mindset theory?", options: ["Albert Bandura", "Carol Dweck", "Mihaly Csikszentmihalyi", "Leon Festinger"], answer: 1, explain: "Carol Dweck developed the fixed versus growth mindset framework." },
      { q: "A growth mindset is best described as:", options: ["Always staying positive", "Ignoring mistakes", "Praising effort no matter what", "Believing ability can be built with effort, strategy, and help"], answer: 3, explain: "Growth mindset is the belief that ability develops, which shows up as smarter effort and new strategies." },
      { q: "What does research say about the size of mindset effects?", options: ["They are huge for everyone", "They do not exist", "They only work for adults", "They are real but modest"], answer: 3, explain: "Large studies find real but modest effects, so mindset matters most when it changes behavior." }
    ]
  },
  {
    id: "dl-003",
    topic: "Fitness",
    title: "Progressive Overload",
    minutes: 2,
    cards: [
      { kind: "text", heading: "The rule behind every gain", body: "Your body adapts to the demands you place on it. Once a load feels easy, it stops forcing change. Progressive overload means slowly raising the challenge over time so your body keeps having a reason to adapt." },
      { kind: "text", heading: "More than just more weight", body: "You can overload by adding weight, reps, or sets. You can also add speed, cut rest time, or improve range of motion. Small steps win. Jumping too fast raises injury risk and wrecks your form." },
      { kind: "choice", prompt: "You squatted 3 sets of 8 easily last week. What is a smart next step?", options: ["Double the weight", "Do the exact same thing forever", "Skip legs this week", "Add a small amount of weight or one rep per set"], answer: 3, explain: "Small, steady increases keep the body adapting while keeping form and joints safe." },
      { kind: "reveal", prompt: "How does this connect to your mind?", answer: "Confidence works the same way. You build it by stacking slightly harder wins. Each one tells you, \"I'm the kind of athlete who handles more.\"" }
    ],
    takeaway: "Log your lifts. Next session, beat one number by a small amount with clean form.",
    quiz: [
      { q: "Progressive overload means:", options: ["Training to failure every day", "Lifting the heaviest weight possible", "Changing exercises every session", "Gradually increasing training demands over time"], answer: 3, explain: "Gradual increases give the body a steady reason to adapt." },
      { q: "Which is NOT a way to apply overload?", options: ["Adding reps", "Using worse form to lift more", "Shortening rest", "Adding a set"], answer: 1, explain: "Sacrificing form adds risk, not useful training stimulus." },
      { q: "Why avoid big jumps in load?", options: ["They are boring", "They make you too strong", "Coaches do not allow it", "They raise injury risk and break down form"], answer: 3, explain: "Large jumps outpace what your tissues and technique are ready for." }
    ]
  },
  {
    id: "dl-004",
    topic: "Sports history",
    title: "Bannister and the Four-Minute Mile",
    minutes: 3,
    cards: [
      { kind: "text", heading: "May 6, 1954", body: "At Iffley Road track in Oxford, England, medical student Roger Bannister ran a mile in 3:59.4. He became the first person on record to break four minutes. Teammates Chris Brasher and Chris Chataway helped pace him." },
      { kind: "text", heading: "A barrier in the mind", body: "For years, many people treated four minutes as a wall. Runners had come close but not broken it. Bannister trained with a plan, studied pacing, and believed it could be done. Then he did it." },
      { kind: "reveal", prompt: "How long did his record last?", answer: "Just 46 days. Australian John Landy ran 3:58.0 in June 1954. Once one person proved it was possible, others followed." },
      { kind: "text", heading: "The mental skill: vicarious belief", body: "Seeing someone like you succeed raises your belief that you can too. Psychologists call this vicarious experience. It is one of the main sources of confidence. Bannister did not just set a record. He changed what others believed." },
      { kind: "choice", prompt: "What is the best way to use this today?", options: ["Wait for someone else to go first", "Watch a teammate master a skill, then try it yourself", "Avoid hard goals", "Only compare yourself to pros"], answer: 1, explain: "Watching a similar peer succeed is a strong way to build belief before you try." }
    ],
    takeaway: "Find one teammate who did what you want to do. Study how they did it, then go do it.",
    quiz: [
      { q: "What was Bannister's time in 1954?", options: ["4:01.2", "3:43.1", "3:59.4", "3:58.0"], answer: 2, explain: "Bannister ran 3:59.4 on May 6, 1954." },
      { q: "What happened soon after Bannister's run?", options: ["No one broke four minutes for decades", "John Landy broke his record about six weeks later", "The mile was removed from track", "Bannister retired that day"], answer: 1, explain: "John Landy ran 3:58.0 just 46 days later." },
      { q: "Seeing a peer succeed builds confidence through:", options: ["Vicarious experience", "Luck", "Arousal", "Punishment"], answer: 0, explain: "Vicarious experience is watching someone similar succeed, which raises your own belief." }
    ]
  },
  {
    id: "dl-005",
    topic: "Sport psychology",
    title: "Self-Talk That Works",
    minutes: 3,
    cards: [
      { kind: "text", heading: "You are always talking", body: "Every athlete has a voice in their head during competition. Self-talk is what you say to yourself, out loud or silently. Research shows planned, practiced self-talk can improve performance. The key is choosing the words on purpose." },
      { kind: "text", heading: "Two kinds of self-talk", body: "Instructional self-talk tells you what to do: \"Elbow in,\" \"Low and drive.\" It helps with precision and technique. Motivational self-talk lifts effort and belief: \"Let's go,\" \"I've got this.\" It helps with power and grit." },
      { kind: "choice", prompt: "A golfer is lining up a short putt. Which self-talk fits best?", options: ["\"Crush it!\"", "\"Don't miss.\"", "\"Smooth stroke.\"", "\"Everyone is watching.\""], answer: 2, explain: "Fine motor tasks benefit from calm, instructional cues. \"Don't\" statements keep the mistake in mind." },
      { kind: "text", heading: "Try your own name", body: "Studies on distanced self-talk suggest that talking to yourself by name or as \"you\" can lower stress. \"Jordan, you've trained for this\" can feel steadier than \"I'm freaking out.\" It helps you coach yourself like a friend would." },
      { kind: "reveal", prompt: "What should replace \"Don't mess up\"?", answer: "Tell yourself what TO do. \"Don't mess up\" points your mind at the mistake. \"Quick feet, eyes up\" points it at the skill." }
    ],
    takeaway: "Write one instructional cue and one motivational phrase. Use them on purpose today.",
    quiz: [
      { q: "Instructional self-talk is best for:", options: ["Only weightlifting", "Tasks needing precision and technique", "Trash talk", "Ignoring the coach"], answer: 1, explain: "Instructional cues direct attention to technique, which helps precise skills." },
      { q: "Why avoid \"don't\" statements?", options: ["They keep the mistake at the center of your attention", "They are too long", "They are rude", "They make you too relaxed"], answer: 0, explain: "Saying what not to do still puts the unwanted action in mind." },
      { q: "Distanced self-talk means:", options: ["Talking quietly", "Not talking at all", "Talking to yourself by name or as \"you\"", "Yelling at teammates"], answer: 2, explain: "Using your name or \"you\" creates a little distance that can reduce stress." }
    ]
  },
  {
    id: "dl-006",
    topic: "Psychology",
    title: "The Habit Loop",
    minutes: 2,
    cards: [
      { kind: "text", heading: "Habits run on autopilot", body: "A large part of daily behavior happens out of habit, not choice. Habits form through a simple loop: a cue triggers a routine, and a reward makes your brain want to repeat it. Change the loop and you change the habit." },
      { kind: "choice", prompt: "You check your phone the moment practice ends. What is the cue?", options: ["The phone", "Scrolling", "Feeling entertained", "Practice ending"], answer: 3, explain: "The cue is the trigger. Practice ending sparks the routine of grabbing your phone." },
      { kind: "text", heading: "Hack the loop", body: "Keep the cue, swap the routine. Practice ends, then you do 5 minutes of mobility, then you check your phone as the reward. Stacking a new habit onto an old cue is one of the easiest ways to make it stick." },
      { kind: "reveal", prompt: "Why do habits matter for identity?", answer: "Every rep is a vote for who you are. Do the 5 minutes of mobility daily and you stop being someone who tries to recover. You become someone who recovers." }
    ],
    takeaway: "Pick one cue you already have. Attach one small, useful habit to it starting today.",
    quiz: [
      { q: "What are the three parts of the habit loop?", options: ["Goal, plan, result", "Start, middle, end", "Effort, rest, repeat", "Cue, routine, reward"], answer: 3, explain: "A cue triggers a routine, and a reward reinforces it." },
      { q: "Habit stacking means:", options: ["Doing many habits at once", "Quitting old habits cold", "Rewarding yourself first", "Attaching a new habit to an existing cue"], answer: 3, explain: "Using an existing cue as the trigger makes a new habit easier to start." },
      { q: "Why does the reward matter?", options: ["It is optional", "It replaces the cue", "It has no effect", "It makes the brain want to repeat the routine"], answer: 3, explain: "The reward reinforces the loop so the routine repeats next time." }
    ]
  },
  {
    id: "dl-007",
    topic: "Fitness",
    title: "Recovery Is Where You Grow",
    minutes: 2,
    cards: [
      { kind: "text", heading: "Training breaks you down", body: "A hard session creates stress and fatigue in your muscles and nervous system. You do not get stronger during the workout. You get stronger after, when your body repairs and adapts. That process needs time, food, and sleep." },
      { kind: "text", heading: "Stress plus rest equals adaptation", body: "Coaches use this simple idea: the right training stress, followed by enough recovery, makes you better. Too much stress with too little rest leads to stalled progress, nagging pain, and higher injury risk." },
      { kind: "choice", prompt: "Which is the strongest recovery tool for a teen athlete?", options: ["Expensive supplements", "Ice baths every night", "Consistent sleep", "Skipping meals"], answer: 2, explain: "Sleep is when much of the body's repair happens. Nothing else replaces it." },
      { kind: "reveal", prompt: "Is resting a sign of being soft?", answer: "No. Smart rest is part of the work. The athlete you are becoming trains hard and recovers on purpose, because both are needed to improve." }
    ],
    takeaway: "Tonight, protect your sleep and eat a real meal after training. That is training too.",
    quiz: [
      { q: "When does your body actually get stronger?", options: ["During recovery after the workout", "During the workout", "Only on game days", "While stretching"], answer: 0, explain: "Adaptation happens during the repair period after training stress." },
      { q: "Too much stress with too little rest can lead to:", options: ["Stalled progress and higher injury risk", "Faster gains", "Better sleep", "Nothing at all"], answer: 0, explain: "Without enough recovery, fatigue builds faster than the body can adapt." },
      { q: "Which recovery tool matters most?", options: ["Sleep", "Compression socks", "Energy drinks", "Foam rollers only"], answer: 0, explain: "Sleep supports tissue repair and nervous system recovery more than any add-on." }
    ]
  },
  {
    id: "dl-008",
    topic: "Sports history",
    title: "The Miracle on Ice",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Lake Placid, 1980", body: "At the 1980 Winter Olympics, a U.S. hockey team of college players faced the Soviet Union, the most dominant team in the world. Days before the Games, the Soviets had beaten them 10 to 3 in an exhibition at Madison Square Garden." },
      { kind: "reveal", prompt: "What happened on February 22, 1980?", answer: "The U.S. won 4 to 3. Two days later they beat Finland to win the gold medal. The win over the Soviets became known as the Miracle on Ice." },
      { kind: "text", heading: "Built for the moment", body: "Coach Herb Brooks picked players for fit and character, not just talent. He pushed their conditioning hard so they could skate with the Soviets late in games. The team believed in its process, not the scouting report." },
      { kind: "text", heading: "The mental skill: process over outcome", body: "If the U.S. had focused on the 10 to 3 loss, they would have played scared. Instead, they focused on what they could control: effort, shifts, and the next play. Outcome goals can scare you. Process goals give you a job." },
      { kind: "choice", prompt: "You face a team that beat you badly last month. Best focus?", options: ["The last score", "Your next shift, your effort, your assignment", "Their best player's stats", "What people online are saying"], answer: 1, explain: "Controllable process focus keeps you in the present and out of fear." }
    ],
    takeaway: "Before your next big game, write three things you control. Play those, not the scoreboard.",
    quiz: [
      { q: "Who did the U.S. beat in the Miracle on Ice?", options: ["Canada", "The Soviet Union", "Finland", "Sweden"], answer: 1, explain: "The U.S. beat the Soviet Union 4 to 3 on February 22, 1980." },
      { q: "Who coached the 1980 U.S. team?", options: ["Vince Lombardi", "Phil Jackson", "Mike Krzyzewski", "Herb Brooks"], answer: 3, explain: "Herb Brooks coached the 1980 U.S. Olympic hockey team." },
      { q: "Which lesson fits this story best?", options: ["Talent always wins", "Exhibitions predict everything", "Avoid hard opponents", "Focus on controllable process, not the last result"], answer: 3, explain: "The team stayed on what it could control instead of the earlier loss." }
    ]
  },
  {
    id: "dl-009",
    topic: "Sport psychology",
    title: "The Inverted-U: Find Your Zone",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Nerves are not the enemy", body: "Arousal is your body's level of activation: heart rate, energy, alertness. In 1908, researchers Yerkes and Dodson described a pattern later drawn as an inverted U. Performance rises with arousal, peaks, then drops when you get too wired." },
      { kind: "text", heading: "Too low, too high, just right", body: "Too low and you feel flat and slow. Too high and you get tight, rushed, and miss easy reads. Your best performance usually sits in the middle. That zone is different for every athlete and every skill." },
      { kind: "choice", prompt: "Which task usually needs LOWER arousal?", options: ["A football tackle", "A shot put throw", "A free throw", "A sprint start"], answer: 2, explain: "Fine motor skills like free throws need calm and control. Big power skills can handle more activation." },
      { kind: "text", heading: "Turn it up or down", body: "Too high? Slow your exhale. Breathe in for 4, out for 6. Relax your jaw and shoulders. Too low? Move, bounce, use upbeat music or a power cue. You are not stuck with how you feel. You can adjust it." },
      { kind: "reveal", prompt: "How do you find your personal zone?", answer: "After good and bad games, rate your energy from 1 to 10 before you started. Over time, a pattern appears. That number range is your zone." }
    ],
    takeaway: "Rate your energy 1 to 10 before practice. Breathe it down or move it up to hit your zone.",
    quiz: [
      { q: "The inverted-U says performance is best when arousal is:", options: ["As low as possible", "As high as possible", "Unrelated to performance", "At a moderate, individual level"], answer: 3, explain: "Performance peaks at a moderate level that varies by person and task." },
      { q: "Which breathing pattern helps calm you down?", options: ["Short, fast breaths", "Holding your breath", "Breathing only through the mouth fast", "A longer exhale than inhale"], answer: 3, explain: "A long exhale activates the body's calming response." },
      { q: "Which researchers are linked to this curve?", options: ["Locke and Latham", "Lazarus and Folkman", "Yerkes and Dodson", "Gilovich and Savitsky"], answer: 2, explain: "Yerkes and Dodson published the 1908 study behind the inverted-U idea." }
    ]
  },
  {
    id: "dl-010",
    topic: "Psychology",
    title: "Sleep Locks In Your Skills",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Practice saves, sleep files", body: "When you learn a new move, your brain stores it in a fragile form. During sleep, the brain replays and strengthens that memory. This is called memory consolidation. Studies show motor skills often improve after a night of sleep, with no extra practice." },
      { kind: "text", heading: "How much do teens need?", body: "Sleep experts recommend 8 to 10 hours a night for teenagers. Many athletes get far less. Short sleep slows reaction time, hurts decision making, and makes emotions harder to control." },
      { kind: "reveal", prompt: "What happened when Stanford basketball players slept more?", answer: "In a 2011 study, players aimed for 10 hours in bed for several weeks. Their sprint times got faster and their free throw and three-point shooting improved by about 9 percent." },
      { kind: "choice", prompt: "Big game tomorrow. Best plan tonight?", options: ["Stay up watching film until 1 a.m.", "Get to bed at a normal time, phone out of reach", "Sleep only 5 hours to stay sharp", "Drink caffeine late to stay alert"], answer: 1, explain: "A normal, protected bedtime gives your brain and body the recovery they need." }
    ],
    takeaway: "Set a phone-down time 30 minutes before bed tonight. Sleep is free skill work.",
    quiz: [
      { q: "Memory consolidation during sleep means:", options: ["Strengthening new memories and skills", "Forgetting what you learned", "Dreaming about games", "Resting only the muscles"], answer: 0, explain: "Sleep helps stabilize and strengthen newly learned skills." },
      { q: "How much sleep is recommended for teens?", options: ["5 to 6 hours", "6 to 7 hours", "8 to 10 hours", "12 or more hours"], answer: 2, explain: "Sleep experts recommend 8 to 10 hours for teenagers." },
      { q: "In the Stanford sleep study, shooting accuracy improved by about:", options: ["It got worse", "1 percent", "9 percent", "50 percent"], answer: 2, explain: "Players improved free throw and three-point accuracy by about 9 percent." }
    ]
  },
  {
    id: "dl-011",
    topic: "Sport psychology",
    title: "Where You Look: Focus Out, Not In",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Two places to aim your attention", body: "An internal focus is on your body: \"Snap my wrist.\" An external focus is on the effect of your movement: \"Drive the ball to the corner.\" Research led by Gabriele Wulf shows an external focus often improves performance and learning." },
      { kind: "text", heading: "Why external works", body: "Thinking hard about body parts can interrupt smooth, automatic movement. Focusing on the target or the effect lets your body organize itself. It is a big reason skilled athletes look so fluid under pressure." },
      { kind: "choice", prompt: "Which cue is EXTERNAL for a sprinter?", options: ["\"Lift my knees\"", "\"Push the ground away\"", "\"Pump my arms\"", "\"Keep my hips tall\""], answer: 1, explain: "\"Push the ground away\" focuses on the effect on the ground, not on a body part." },
      { kind: "reveal", prompt: "Turn this into an external cue: \"Extend my elbow on my shot.\"", answer: "Try \"Reach into the cookie jar\" or \"Shoot up and over the front rim.\" Same movement, but your attention is on the target." }
    ],
    takeaway: "Change one technique cue today from a body part to a target or effect.",
    quiz: [
      { q: "An external focus of attention is on:", options: ["Your muscles", "Your feelings", "The crowd", "The effect of your movement"], answer: 3, explain: "External focus points to the movement's effect, like the target or ball flight." },
      { q: "Whose research is best known for external focus findings?", options: ["Carol Dweck", "Walter Mischel", "Bluma Zeigarnik", "Gabriele Wulf"], answer: 3, explain: "Gabriele Wulf led much of the research on attentional focus in motor learning." },
      { q: "Why can internal focus hurt performance?", options: ["It makes you too relaxed", "It is against the rules", "It can interrupt smooth, automatic movement", "It only works for beginners"], answer: 2, explain: "Thinking about body parts can disrupt automatic control of skilled movement." }
    ]
  },
  {
    id: "dl-012",
    topic: "Fitness",
    title: "Protein: What Matters, What Doesn't",
    minutes: 2,
    cards: [
      { kind: "text", heading: "Why protein matters", body: "Protein provides the building blocks your muscles use to repair and adapt after training. Athletes need more than inactive teens. Good sources include eggs, milk, Greek yogurt, chicken, fish, beans, and lean meat." },
      { kind: "text", heading: "Spread it out", body: "Research suggests it helps to spread protein across the day, with some at each meal, instead of one huge serving at dinner. Your body uses it in steady amounts for repair." },
      { kind: "choice", prompt: "Do you need a protein shake within 30 minutes of training?", options: ["Yes, or the workout is wasted", "No, the window is wider than that. A real meal within a few hours works.", "Only on rest days", "Protein after training is harmful"], answer: 1, explain: "Studies show the post-workout window is wider than the old 30-minute rule. Total daily protein matters more." },
      { kind: "reveal", prompt: "Do teens need supplements to get enough protein?", answer: "Most do not. Real food covers it for most athletes. Talk to a parent, doctor, or dietitian before using any supplement." }
    ],
    takeaway: "Add a protein food to breakfast tomorrow, like eggs, yogurt, or milk.",
    quiz: [
      { q: "What does protein mainly help with after training?", options: ["Hydration", "Caffeine-like energy", "Muscle repair and adaptation", "Lowering heart rate"], answer: 2, explain: "Protein supplies the building blocks muscles use to repair and grow." },
      { q: "Which pattern is recommended?", options: ["Protein spread across meals", "All protein at one meal", "No protein on game days", "Only protein shakes"], answer: 0, explain: "Spreading protein across meals supports steady repair." },
      { q: "The strict 30-minute protein window is:", options: ["Wider than once thought", "Proven essential", "Only for adults", "Required by law"], answer: 0, explain: "Research shows the timing window is wider, and daily total matters most." }
    ]
  },
  {
    id: "dl-013",
    topic: "Sports history",
    title: "Jesse Owens: Focus Under Pressure",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Ann Arbor, 1935", body: "Running for Ohio State at the 1935 Big Ten championships, Jesse Owens set three world records and tied a fourth in about 45 minutes. It remains one of the greatest single days in track history." },
      { kind: "text", heading: "Berlin, 1936", body: "At the 1936 Olympics in Nazi Germany, Owens faced a hostile political setting. The regime promoted racist ideas about athletic superiority. Owens, a Black American, won four gold medals: the 100m, 200m, long jump, and 4x100m relay." },
      { kind: "reveal", prompt: "What could Owens control in Berlin?", answer: "Not the politics. Not the crowd. Not what others believed about him. He could control his preparation, his focus, and his next jump or race." },
      { kind: "text", heading: "The mental skill: control the controllables", body: "Pressure grows when you focus on things you cannot change. Strong competitors sort their worries into two piles: things they control and things they do not. Then they spend their energy only on the first pile." },
      { kind: "choice", prompt: "Which is in your control before a meet?", options: ["The weather", "The officials", "Your opponent's time", "Your warm-up and focus plan"], answer: 3, explain: "Your preparation and attention are yours. The rest is noise." }
    ],
    takeaway: "Make two lists before your next game: what you control and what you don't. Focus on list one.",
    quiz: [
      { q: "How many gold medals did Jesse Owens win in 1936?", options: ["Two", "Three", "Four", "Five"], answer: 2, explain: "Owens won the 100m, 200m, long jump, and 4x100m relay." },
      { q: "Where were the 1936 Summer Olympics held?", options: ["London", "Berlin", "Los Angeles", "Paris"], answer: 1, explain: "The 1936 Summer Olympics were held in Berlin, Germany." },
      { q: "Which mental skill fits this story best?", options: ["Ignoring practice", "Focusing on what you can control", "Copying opponents", "Avoiding big events"], answer: 1, explain: "Owens could not control the setting, only his preparation and performance." }
    ]
  },
  {
    id: "dl-014",
    topic: "Psychology",
    title: "Threat or Challenge?",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Same game, two reactions", body: "Psychologists Richard Lazarus and Susan Folkman showed that stress depends on appraisal: how you judge a situation. Two athletes face the same big game. One sees a threat. The other sees a challenge. Their bodies respond differently." },
      { kind: "text", heading: "The quick math your brain does", body: "Your brain compares demands to resources. If the demands feel bigger than what you have, it reads threat. If you feel you have what it takes, it reads challenge. Challenge is linked to better focus and performance." },
      { kind: "choice", prompt: "Your heart is pounding before kickoff. What is the most helpful thought?", options: ["\"I need to calm down or I'll blow it.\"", "\"Something is wrong with me.\"", "\"I hope I don't get the ball.\"", "\"My body is getting ready. This energy helps me.\""], answer: 3, explain: "Reframing arousal as useful energy shifts you toward a challenge state." },
      { kind: "text", heading: "Say \"I'm excited\"", body: "In a 2014 study, Alison Wood Brooks found that people who said \"I am excited\" before a stressful task did better than those who tried to calm down. The feelings are similar. The label changes what you do with them." },
      { kind: "reveal", prompt: "How can you add to your resources before a game?", answer: "List what you bring: your training, your skills, your teammates, your routine. Seeing your resources clearly tips your brain toward challenge." }
    ],
    takeaway: "When nerves hit, say \"I'm excited\" and name one thing you've trained for this.",
    quiz: [
      { q: "According to appraisal theory, stress depends on:", options: ["Only the situation", "Your height", "The weather", "How you judge the situation"], answer: 3, explain: "Lazarus and Folkman showed that stress depends on appraisal, not the event alone." },
      { q: "A challenge state happens when you feel:", options: ["Demands are greater than your resources", "Nothing at all", "Your resources can meet the demands", "Bored"], answer: 2, explain: "Challenge means you believe you have what it takes to meet the demands." },
      { q: "What did Brooks' 2014 study find?", options: ["Calming down always works best", "Nerves always hurt", "Saying \"I'm excited\" helped performance", "Talking to yourself is useless"], answer: 2, explain: "Reappraising anxiety as excitement improved performance compared to trying to calm down." }
    ]
  },
  {
    id: "dl-015",
    topic: "Sport psychology",
    title: "Imagery: Train in Your Head",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Your brain rehearses", body: "Imagery means creating or recreating an experience in your mind. When you vividly imagine a movement, your brain uses many of the same areas it uses to do it. Elite athletes use imagery to rehearse skills, plays, and pressure moments." },
      { kind: "text", heading: "Make it real", body: "The best imagery feels like the real thing. Researchers Holmes and Collins built the PETTLEP model. It says to match the physical setting, the task, the timing, and your emotions as closely as you can. Wear your gear. Use real speed." },
      { kind: "choice", prompt: "Which imagery session is closest to PETTLEP?", options: ["Lying in bed, imagining in slow motion", "Standing at the line in your uniform, picturing the shot at real speed, feeling the nerves", "Watching a highlight video", "Thinking about the result only"], answer: 1, explain: "Matching body position, setting, timing, and emotion makes imagery more effective." },
      { kind: "text", heading: "Use all your senses", body: "See it from your own eyes. Hear the gym. Feel the ball's grip. Notice your breath. Rehearse success, and also rehearse recovering from a mistake. That way, a bad moment feels familiar, not shocking." },
      { kind: "reveal", prompt: "Why imagine handling a mistake?", answer: "Because mistakes will happen. If you've already practiced resetting in your mind, your response is ready. You become the athlete who bounces back fast." }
    ],
    takeaway: "Spend 2 minutes tonight seeing your next big moment, at real speed, from your own eyes.",
    quiz: [
      { q: "What is sport imagery?", options: ["Daydreaming about trophies", "Watching other athletes", "Creating or recreating a performance in your mind", "Taking photos"], answer: 2, explain: "Imagery is deliberately creating a sensory experience of a skill or situation." },
      { q: "The PETTLEP model encourages imagery that is:", options: ["As relaxed as possible", "Always in slow motion", "Only visual", "As close to the real performance as possible"], answer: 3, explain: "PETTLEP matches setting, task, timing, and emotion to the real thing." },
      { q: "Why rehearse recovering from mistakes?", options: ["To expect failure", "So your reset is ready when it happens", "It is not useful", "To lower confidence"], answer: 1, explain: "Practicing a reset makes it automatic under pressure." }
    ]
  },
  {
    id: "dl-016",
    topic: "Fitness",
    title: "Hydration and Performance",
    minutes: 2,
    cards: [
      { kind: "text", heading: "Small losses, real effects", body: "Research shows that losing around 2 percent of your body weight in fluid can hurt endurance, focus, and decision making, especially in heat. For a 150 pound athlete, that is just 3 pounds of sweat." },
      { kind: "text", heading: "Simple checks", body: "Check your urine color. Pale yellow usually means you are hydrated. Dark yellow means drink more. Weigh yourself before and after a hard practice. Weight lost is mostly water you need to replace." },
      { kind: "choice", prompt: "When should hydration start for an afternoon game?", options: ["That morning and throughout the day", "During warm-up only", "Only when you feel thirsty in the game", "After the game"], answer: 0, explain: "Drinking steadily through the day means you start the game already hydrated." },
      { kind: "reveal", prompt: "When do sports drinks make sense?", answer: "For long or very sweaty sessions, often over an hour or in heat, sports drinks help replace sodium and fuel. For short practices, water is usually enough." }
    ],
    takeaway: "Carry a water bottle today and check that your urine is pale yellow by practice.",
    quiz: [
      { q: "Fluid loss of about what percent of body weight can hurt performance?", options: ["0.1 percent", "2 percent", "20 percent", "50 percent"], answer: 1, explain: "Losing around 2 percent of body weight in fluid can impair performance." },
      { q: "Pale yellow urine usually means:", options: ["You are well hydrated", "You are dehydrated", "You need caffeine", "You ate too much"], answer: 0, explain: "Pale yellow is a simple sign of good hydration." },
      { q: "Sports drinks are most useful for:", options: ["Every meal", "Long or very sweaty sessions", "Before bed", "Short stretching sessions"], answer: 1, explain: "They replace sodium and fuel lost during long or hot sessions." }
    ]
  },
  {
    id: "dl-017",
    topic: "Sports history",
    title: "Kerri Strug's Vault, 1996",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Atlanta, 1996", body: "In the women's gymnastics team final, Kerri Strug of the U.S. fell and hurt her ankle on her first vault. With the gold medal looking close, she went again. She landed on one foot, saluted the judges, then collapsed." },
      { kind: "text", heading: "Trained to the bone", body: "How could she run, flip, and land in pain? Years of practice. Her vault was so automatic that her body knew it without thinking. That is what thousands of correct reps give you: a skill that holds up under stress." },
      { kind: "reveal", prompt: "Did the team need her second vault to win?", answer: "It later turned out the U.S. would likely have won gold anyway. No one knew that in the moment. Her score of 9.712 sealed it." },
      { kind: "text", heading: "The honest lesson", body: "Her courage is real. So is the risk. Today, many experts say athletes should feel safe to speak up about injuries. Real toughness includes telling your coach the truth about your body." },
      { kind: "choice", prompt: "What made the vault possible under pressure?", options: ["Luck", "Skills practiced until they were automatic", "Not caring about the result", "A new technique tried that day"], answer: 1, explain: "Deeply practiced skills hold up when stress and pain are high." }
    ],
    takeaway: "Rep your key skill until it's automatic. And always tell your coach when you're hurt.",
    quiz: [
      { q: "At which Olympics did Strug make her famous vault?", options: ["1984 Los Angeles", "1992 Barcelona", "1996 Atlanta", "2000 Sydney"], answer: 2, explain: "Strug vaulted on an injured ankle at the 1996 Atlanta Olympics." },
      { q: "Why could she perform the skill while injured?", options: ["Years of reps made it automatic", "The vault was easy", "She skipped the run-up", "The judges helped"], answer: 0, explain: "Automatic skills hold up under stress because they need less conscious control." },
      { q: "What does modern thinking add to this story?", options: ["Always hide injuries", "Speaking up about injuries is part of real toughness", "Pain means you should push harder", "Injuries do not matter"], answer: 1, explain: "Experts now stress that athletes should feel safe reporting injuries." }
    ]
  },
  {
    id: "dl-018",
    topic: "Sport psychology",
    title: "Process Goals Beat Outcome Goals",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Three kinds of goals", body: "Outcome goals are about results: win the game. Performance goals are about your numbers: shoot 45 percent. Process goals are about how you play: follow through high, talk on defense. You fully control only the last one." },
      { kind: "text", heading: "Why process wins", body: "Goal setting research by Edwin Locke and Gary Latham shows specific, challenging goals improve performance. In sport, outcome goals give direction, but process goals give you something to do right now. That keeps you calm and locked in." },
      { kind: "choice", prompt: "Which is a process goal for a soccer defender?", options: ["Win state", "Stay goal side and talk on every set piece", "Allow zero goals", "Get recruited"], answer: 1, explain: "Process goals describe actions you can control on every play." },
      { kind: "reveal", prompt: "Should you drop outcome goals completely?", answer: "No. Keep the big outcome as your why. Then break it down into process goals you can win every practice. The dream sets direction. The process gets you there." }
    ],
    takeaway: "Write one outcome goal for the season and three process goals you can win today.",
    quiz: [
      { q: "Which goal type is fully in your control?", options: ["Process", "Outcome", "Performance", "Rankings"], answer: 0, explain: "Process goals are actions you control, no matter what opponents do." },
      { q: "Which researchers are known for goal setting theory?", options: ["Locke and Latham", "Yerkes and Dodson", "Holmes and Collins", "Lazarus and Folkman"], answer: 0, explain: "Edwin Locke and Gary Latham developed goal setting theory." },
      { q: "What is the best way to use outcome goals?", options: ["Use them for direction and break them into process goals", "Ignore them", "Focus on them every play", "Only share them with fans"], answer: 0, explain: "Outcome goals give direction, while process goals guide daily action." }
    ]
  },
  {
    id: "dl-019",
    topic: "Psychology",
    title: "Nobody Is Watching That Closely",
    minutes: 2,
    cards: [
      { kind: "text", heading: "The spotlight effect", body: "We tend to think others notice our mistakes and looks far more than they do. Psychologists call this the spotlight effect. It makes athletes play tight, afraid to try new skills or speak up." },
      { kind: "reveal", prompt: "What happened in the famous T-shirt study?", answer: "In a 2000 study by Thomas Gilovich and colleagues, students wore an embarrassing T-shirt into a room. They guessed about half the people noticed. In reality, only about a quarter did." },
      { kind: "choice", prompt: "You air-balled a shot in warm-ups. What are most people thinking about?", options: ["Your air ball, all game", "Telling everyone about it", "Your stats", "Mostly themselves and their own game"], answer: 3, explain: "Most people are focused on themselves. Your mistake fades for them fast." },
      { kind: "text", heading: "Play free", body: "Fear of looking bad is one of the biggest blocks to growth. When you know the spotlight is dimmer than it feels, you can take the shot, try the new move, and lead out loud. That is how a confident athlete is built." }
    ],
    takeaway: "Try one thing in practice today you've been afraid to look bad doing.",
    quiz: [
      { q: "The spotlight effect is:", options: ["Overestimating how much others notice you", "Playing better under lights", "A camera technique", "Ignoring the crowd"], answer: 0, explain: "It is our tendency to think others notice us more than they do." },
      { q: "In the T-shirt study, about how many people actually noticed the shirt?", options: ["About a quarter", "Almost everyone", "About half", "No one"], answer: 0, explain: "Wearers guessed about half noticed, but only about a quarter did." },
      { q: "How can knowing this help an athlete?", options: ["It makes them careless", "It means mistakes do not matter", "It helps them ignore coaches", "It frees them to take smart risks and try new skills"], answer: 3, explain: "Less fear of judgment makes it easier to try, learn, and lead." }
    ]
  },
  {
    id: "dl-020",
    topic: "Fitness",
    title: "Warm-Ups That Actually Work",
    minutes: 2,
    cards: [
      { kind: "text", heading: "Raise, activate, prepare", body: "A good warm-up raises your body temperature and heart rate, activates key muscles, moves joints through full range, then builds to sport-speed movements. Warmer muscles contract faster and move more freely." },
      { kind: "choice", prompt: "Right before a sprint, which is better?", options: ["Long static stretches held for a minute or more", "Dynamic moves like leg swings, skips, and build-up runs", "No warm-up at all", "Sitting and stretching your phone thumb"], answer: 1, explain: "Long static holds right before power work can slightly reduce output. Dynamic moves prepare you for speed." },
      { kind: "text", heading: "It protects you too", body: "Structured warm-up programs reduce injuries. In youth soccer, programs like FIFA 11+ have been shown to lower injury rates when teams use them consistently. Consistency is the key part." },
      { kind: "reveal", prompt: "How is a warm-up also a mental tool?", answer: "It is the first part of your routine. The same warm-up every time tells your mind it is time to compete. Your body gets ready and your focus follows." }
    ],
    takeaway: "Use a 10-minute dynamic warm-up today. Save long static stretches for after.",
    quiz: [
      { q: "A good warm-up should:", options: ["Only include static stretching", "Be skipped on game days", "Make you tired", "Raise temperature, activate muscles, and build to sport speed"], answer: 3, explain: "Effective warm-ups progress from general to sport-specific movement." },
      { q: "Long static stretches right before sprinting may:", options: ["Increase speed a lot", "Slightly reduce power output", "Have no effect ever", "Prevent all injuries"], answer: 1, explain: "Long static holds before power work can slightly lower performance." },
      { q: "FIFA 11+ is an example of:", options: ["A supplement", "A video game mode", "A recovery drink", "An injury prevention warm-up program"], answer: 3, explain: "FIFA 11+ is a structured warm-up shown to reduce injuries in soccer." }
    ]
  },
  {
    id: "dl-021",
    topic: "Sports history",
    title: "Michael Jordan and the JV Roster",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Wilmington, North Carolina", body: "As a sophomore at Laney High School, Michael Jordan tried out for varsity basketball. He did not make it. He was placed on the junior varsity team instead. The story is often told as \"cut from the team,\" but he played JV that year." },
      { kind: "text", heading: "What he did next", body: "Jordan played JV and kept working. He grew taller, improved his game, and made varsity the next year. Years later, he talked about using that disappointment as fuel to work harder." },
      { kind: "choice", prompt: "Which explanation for a setback leads to growth?", options: ["\"I'm not good enough and never will be.\"", "\"The coach just hates me.\"", "\"Basketball is dumb.\"", "\"I'm not there yet. Here's what I'll improve.\""], answer: 3, explain: "Explaining a setback as temporary and fixable keeps you working." },
      { kind: "text", heading: "The mental skill: attribution", body: "Attribution is how you explain why something happened. Blaming fixed traits (\"I'm not athletic\") drains motivation. Pointing to things you can change, like effort or strategy, keeps you building. The story you tell shapes what you do next." },
      { kind: "reveal", prompt: "What did the JV season give Jordan?", answer: "More playing time, more reps, and a reason to work. A setback can be a different path to the same goal, if you use it." }
    ],
    takeaway: "Think of your last setback. Rewrite why it happened using something you can change.",
    quiz: [
      { q: "What actually happened to Jordan as a sophomore?", options: ["He quit basketball", "He was placed on JV instead of varsity", "He was the varsity star", "He switched to baseball only"], answer: 1, explain: "Jordan did not make varsity as a sophomore and played on JV." },
      { q: "Attribution means:", options: ["Giving credit to teammates", "Your team's ranking", "A type of workout", "How you explain why things happen"], answer: 3, explain: "Attribution is the explanation you give for success or failure." },
      { q: "Which attribution best supports growth?", options: ["Fixed lack of talent", "Bad luck only", "The referee", "Effort and strategy you can change"], answer: 3, explain: "Controllable, changeable causes keep motivation and effort high." }
    ]
  },
  {
    id: "dl-022",
    topic: "Sport psychology",
    title: "Where Confidence Comes From",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Confidence is built, not found", body: "Psychologist Albert Bandura called it self-efficacy: your belief that you can do a specific task. In 1977 he described four main sources. Knowing them means you can build confidence on purpose." },
      { kind: "text", heading: "The four sources", body: "1. Mastery: past success doing it yourself. 2. Vicarious: seeing someone like you do it. 3. Verbal persuasion: trusted people telling you that you can. 4. Your physical and emotional state, and how you read it." },
      { kind: "choice", prompt: "Which source is usually the strongest?", options: ["Pep talks", "Watching pros on TV", "Lucky gear", "Mastery experiences"], answer: 3, explain: "Bandura found that doing it yourself successfully is the most powerful source of self-efficacy." },
      { kind: "text", heading: "Stack your proof", body: "Confidence follows evidence. Keep a short log of reps you nailed, hard drills you finished, and moments you handled well. Before games, read it. You are reminding yourself of who you already are." },
      { kind: "reveal", prompt: "Is confidence the same as feeling no nerves?", answer: "No. Confident athletes still feel nerves. They just trust their preparation more than their fear." }
    ],
    takeaway: "Start a confidence log tonight. Write three things you did well in training.",
    quiz: [
      { q: "Self-efficacy is:", options: ["General happiness", "Physical strength", "Belief that you can do a specific task", "Popularity on the team"], answer: 2, explain: "Bandura defined self-efficacy as task-specific belief in your ability." },
      { q: "Which is NOT one of Bandura's four sources?", options: ["Mastery experiences", "Vicarious experiences", "Expensive equipment", "Verbal persuasion"], answer: 2, explain: "The four sources are mastery, vicarious experience, persuasion, and physical or emotional states." },
      { q: "The strongest source of self-efficacy is usually:", options: ["Verbal persuasion", "Watching others", "Mastery experiences", "Superstitions"], answer: 2, explain: "Personal success at the task gives the most convincing evidence." }
    ]
  },
  {
    id: "dl-023",
    topic: "Psychology",
    title: "Comparison: Fuel or Poison?",
    minutes: 3,
    cards: [
      { kind: "text", heading: "We all compare", body: "In 1954, psychologist Leon Festinger proposed that people judge themselves by comparing to others. It is normal. Scrolling past other athletes' highlights makes comparison constant. The question is how you use it." },
      { kind: "text", heading: "Up and down", body: "Upward comparison is looking at people ahead of you. It can inspire you or crush you. Downward comparison is looking at people behind you. It can comfort you but also make you settle. Neither is good or bad on its own." },
      { kind: "choice", prompt: "You see a rival's highlight reel. Which response helps you most?", options: ["\"I'll never be that good.\"", "Post something to look better", "Unfollow everyone", "\"Their footwork is clean. I'll study it and drill it.\""], answer: 3, explain: "Turning upward comparison into a specific lesson makes it useful instead of harmful." },
      { kind: "text", heading: "Remember the highlight trap", body: "You compare your full, messy reality to someone else's best clips. That is not a fair test. The most useful comparison is you versus you: this month compared to last month." },
      { kind: "reveal", prompt: "What question turns comparison into growth?", answer: "\"What can I learn from them?\" instead of \"Am I better than them?\" One builds skill. The other builds anxiety." }
    ],
    takeaway: "Next time you compare, ask, \"What can I learn from them?\" Then track you vs. last month.",
    quiz: [
      { q: "Who proposed social comparison theory?", options: ["Carol Dweck", "Albert Bandura", "Herb Brooks", "Leon Festinger"], answer: 3, explain: "Leon Festinger proposed social comparison theory in 1954." },
      { q: "Upward comparison means comparing to:", options: ["People behind you", "Only yourself", "No one", "People ahead of you"], answer: 3, explain: "Upward comparison is looking at people who are performing better." },
      { q: "Why are highlight reels an unfair comparison?", options: ["They are too long", "They are always fake", "They are in slow motion", "They show only someone's best moments"], answer: 3, explain: "You see others' best clips but your own full, messy reality." }
    ]
  },
  {
    id: "dl-024",
    topic: "Sport psychology",
    title: "Flow: When It All Clicks",
    minutes: 3,
    cards: [
      { kind: "text", heading: "The zone has a name", body: "Psychologist Mihaly Csikszentmihalyi called it flow: total focus, effortless action, and time that seems to vanish. Athletes describe it as being \"in the zone.\" It is not luck. It shows up under certain conditions." },
      { kind: "text", heading: "Challenge meets skill", body: "Flow happens when the challenge is high and your skill is high enough to meet it. Too easy and you get bored. Too hard and you get anxious. Clear goals and instant feedback also help." },
      { kind: "choice", prompt: "Practice feels boring and easy. What could bring you closer to flow?", options: ["Coast through it", "Add a challenge, like a time limit or tougher defender", "Stop practicing", "Think about something else"], answer: 1, explain: "Raising the challenge to match your skill moves you toward flow." },
      { kind: "text", heading: "You can't force it", body: "Trying hard to get into flow usually pushes it away. Instead, set the conditions: clear goals, the right challenge, and full focus on the next play. Flow tends to show up when you stop chasing it." },
      { kind: "reveal", prompt: "Why is flow an identity achievement?", answer: "Flow shows up for athletes who trust their training enough to let go. You do not find the zone. You become the kind of athlete the zone finds." }
    ],
    takeaway: "Set one clear goal for each drill today and match the challenge to your skill.",
    quiz: [
      { q: "Who is known for researching flow?", options: ["Mihaly Csikszentmihalyi", "Roger Bannister", "Walter Mischel", "Edwin Locke"], answer: 0, explain: "Mihaly Csikszentmihalyi developed the concept of flow." },
      { q: "Flow is most likely when:", options: ["The task is very easy", "Challenge and skill are both high and balanced", "You are very tired", "You are thinking about the score"], answer: 1, explain: "Flow appears when a high challenge meets matching skill." },
      { q: "What happens if the challenge is far above your skill?", options: ["Anxiety", "Flow", "Boredom", "Nothing"], answer: 0, explain: "Challenges far above your skill tend to create anxiety, not flow." }
    ]
  },
  {
    id: "dl-025",
    topic: "Fitness",
    title: "Deloads and Rest Days",
    minutes: 2,
    cards: [
      { kind: "text", heading: "Planned easy weeks", body: "A deload is a planned period of lighter training, often a week with less volume or intensity. Many strength coaches use one every few weeks. It lets fatigue clear so your fitness can show up." },
      { kind: "text", heading: "Warning signs", body: "Constant soreness, poor sleep, lower motivation, getting sick more, and lifts going backward can all mean you need more recovery. Pushing harder through these signs usually makes things worse." },
      { kind: "choice", prompt: "What does a deload week usually look like?", options: ["No movement at all", "Twice the normal volume", "Only max lifts", "Same training but lighter loads or fewer sets"], answer: 3, explain: "Deloads keep you moving but reduce stress so the body can catch up." },
      { kind: "reveal", prompt: "Is a rest day a wasted day?", answer: "No. Rest days are when adaptation happens. Light walking, mobility, and good sleep make rest days active recovery. Disciplined athletes rest on purpose." }
    ],
    takeaway: "Check your sleep, soreness, and mood today. If two are off, ask your coach about a lighter day.",
    quiz: [
      { q: "A deload is:", options: ["A max test day", "Quitting for a month", "An extra workout", "A planned lighter training period"], answer: 3, explain: "A deload reduces training stress for a short planned period." },
      { q: "Which is a sign you may need more recovery?", options: ["Constant soreness and poor sleep", "Lifts improving steadily", "High motivation", "Feeling fresh"], answer: 0, explain: "Ongoing soreness and poor sleep often signal too much fatigue." },
      { q: "What is a good activity on a rest day?", options: ["Max sprints", "Two-a-days", "Light walking and mobility", "Skipping sleep"], answer: 2, explain: "Light activity supports recovery without adding much stress." }
    ]
  },
  {
    id: "dl-026",
    topic: "Sports history",
    title: "Wilma Rudolph: From Braces to Gold",
    minutes: 3,
    cards: [
      { kind: "text", heading: "A hard start", body: "Wilma Rudolph was born in Tennessee in 1940. As a young child she had polio, along with other serious illnesses. She wore a leg brace for years. Doctors were not sure she would walk normally." },
      { kind: "text", heading: "Step by step", body: "With treatments, family support, and daily therapy, she worked her way out of the brace. She became a basketball and track star in high school. At 16, she won a bronze medal in the relay at the 1956 Olympics." },
      { kind: "reveal", prompt: "What did she do at the 1960 Rome Olympics?", answer: "She won three gold medals: the 100m, 200m, and 4x100m relay. She was the first American woman to win three golds in track and field at a single Olympics." },
      { kind: "text", heading: "The mental skill: resilience", body: "Resilience is not never getting knocked down. It is how you respond after. Rudolph's comeback was built on small daily steps, support from others, and a long view. Big outcomes came from small, repeated actions." },
      { kind: "choice", prompt: "Which habit best builds resilience?", options: ["Taking small daily steps with support from others", "Waiting until you feel ready", "Doing it all alone", "Quitting after setbacks"], answer: 0, explain: "Steady small actions plus support help athletes recover and keep growing." }
    ],
    takeaway: "Pick one small step toward a comeback goal and do it today. Ask someone to keep you honest.",
    quiz: [
      { q: "What illness did Wilma Rudolph overcome as a child?", options: ["Asthma", "Polio", "A broken back", "Diabetes"], answer: 1, explain: "Rudolph had polio and wore a leg brace as a child." },
      { q: "How many gold medals did she win in 1960?", options: ["One", "Two", "Three", "Four"], answer: 2, explain: "She won gold in the 100m, 200m, and 4x100m relay in Rome." },
      { q: "Resilience is best described as:", options: ["Never failing", "Natural talent", "How you respond and keep going after setbacks", "Avoiding hard things"], answer: 2, explain: "Resilience is your response and recovery after difficulty." }
    ]
  },
  {
    id: "dl-027",
    topic: "Psychology",
    title: "The Marshmallow Test, Revisited",
    minutes: 3,
    cards: [
      { kind: "text", heading: "The famous study", body: "In studies led by Walter Mischel starting around 1970, young kids could eat one marshmallow now or wait and get two. Later follow-ups linked waiting longer to better outcomes as teens. It became famous as proof that willpower is everything." },
      { kind: "text", heading: "The twist", body: "A larger 2018 follow-up found the link was much weaker once family background and early skills were considered. Another study showed kids waited longer when the adult had been reliable. Trust and environment mattered." },
      { kind: "choice", prompt: "What is the best lesson from the updated research?", options: ["Willpower is the only thing that matters", "Never wait for anything", "The study was totally fake", "Delaying rewards is easier when your setup helps and the payoff is trustworthy"], answer: 3, explain: "Waiting depends on strategy, trust, and environment, not just raw willpower." },
      { kind: "text", heading: "Design, don't white-knuckle", body: "The kids who waited best often used strategies, like covering their eyes or singing. You can do the same. Put your phone in another room. Prep your meals. Make the right choice the easy choice." },
      { kind: "reveal", prompt: "Why does this matter for athletes?", answer: "Your progress is a delayed reward. You trust the training process because you've seen it pay off. Build systems that make discipline easier instead of relying on willpower alone." }
    ],
    takeaway: "Change one thing in your space today so the disciplined choice is the easy one.",
    quiz: [
      { q: "Who led the original marshmallow studies?", options: ["Carol Dweck", "Leon Festinger", "Albert Bandura", "Walter Mischel"], answer: 3, explain: "Walter Mischel led the original delay of gratification studies." },
      { q: "What did the larger 2018 follow-up find?", options: ["The link was stronger than thought", "Marshmallows are unhealthy", "The link was much weaker after accounting for background", "Waiting has no value"], answer: 2, explain: "Controlling for background and early skills shrank the link considerably." },
      { q: "What helped kids wait longer?", options: ["Strategies like distraction and a reliable adult", "Staring at the treat", "Being hungry", "Being alone without rules"], answer: 0, explain: "Distraction strategies and trust in the adult both helped kids delay." }
    ]
  },
  {
    id: "dl-028",
    topic: "Sport psychology",
    title: "The Mistake Reset",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Mistakes are guaranteed", body: "Even the best athletes miss shots, drop passes, and lose points. What separates them is not fewer mistakes. It is how fast they reset. One error becomes two or three when your mind stays stuck on the last play." },
      { kind: "text", heading: "Build a reset routine", body: "Make it physical and quick. 1. Release: a breath out, a clap, or wiping your hands. 2. Reframe: one word, like \"Next.\" 3. Refocus: one cue for the next play. Practice it until it is automatic." },
      { kind: "choice", prompt: "You just turned the ball over. What is the best next step?", options: ["Breathe out, say \"Next,\" focus on getting back on defense", "Replay it in your head all quarter", "Yell at yourself", "Ask to come out of the game"], answer: 0, explain: "A fast release and refocus keeps one mistake from becoming several." },
      { kind: "text", heading: "Learn later", body: "During the game, reset. After the game, review. Ask: what happened, why, and what will I do next time? Mistakes become lessons when you study them at the right time, not in the middle of play." },
      { kind: "reveal", prompt: "What does your reset say about your identity?", answer: "It says you are an athlete who is not defined by one play. Your next action shows who you are more than your last mistake." }
    ],
    takeaway: "Choose your reset: one physical release and one word. Use it after every mistake today.",
    quiz: [
      { q: "What separates top athletes when it comes to mistakes?", options: ["They reset faster", "They never make mistakes", "They blame others", "They ignore coaching"], answer: 0, explain: "Fast resets stop one error from leading to more." },
      { q: "A good reset routine is:", options: ["Long and complicated", "Only used in practice", "Done by the coach", "Short, physical, and practiced"], answer: 3, explain: "Short, physical routines work quickly under pressure." },
      { q: "When should you deeply analyze a mistake?", options: ["Right in the middle of play", "Never", "Only before bed", "After the game or practice"], answer: 3, explain: "Reset during play, review after, so learning does not cost the next play." }
    ]
  },
  {
    id: "dl-029",
    topic: "Psychology",
    title: "Unfinished Business: Clear Your Head",
    minutes: 2,
    cards: [
      { kind: "text", heading: "The open-loop problem", body: "In the 1920s, psychologist Bluma Zeigarnik studied how unfinished tasks seem to stick in our minds more than finished ones. Later research is mixed on the memory part, but most people know the feeling: open loops nag at you." },
      { kind: "text", heading: "A plan closes the loop", body: "A 2011 study by Masicampo and Baumeister found that making a specific plan for an unfinished goal reduced distracting thoughts about it. You do not have to finish the task. You just need a plan for when and how." },
      { kind: "choice", prompt: "You have a test and a game tomorrow. Your head is racing in warm-ups. What helps most?", options: ["Ignore it and hope it fades", "Before warm-ups, write when you'll study tonight", "Study during warm-ups", "Skip the game"], answer: 1, explain: "Writing a specific plan reduces the mental pull of the unfinished task." },
      { kind: "reveal", prompt: "How can you use this before bed?", answer: "Write tomorrow's top three tasks and when you'll do them. Your brain can let go, which helps you fall asleep faster." }
    ],
    takeaway: "Before practice, write down anything on your mind and when you'll handle it. Then play.",
    quiz: [
      { q: "The Zeigarnik effect is about:", options: ["Muscle growth", "Crowd noise", "Sleep cycles", "Unfinished tasks staying on our minds"], answer: 3, explain: "Zeigarnik studied how unfinished tasks tend to stay active in our minds." },
      { q: "What did Masicampo and Baumeister find?", options: ["Plans make worry worse", "Only finishing the task helps", "Writing things down is useless", "Making a specific plan reduces distracting thoughts"], answer: 3, explain: "A concrete plan reduced intrusive thoughts about unfinished goals." },
      { q: "Which is the best pre-game move when your mind is busy?", options: ["Scroll your phone", "Think harder about the tasks", "Write a quick plan for your other tasks", "Skip warm-ups"], answer: 2, explain: "A quick plan closes the loop so you can focus on the game." }
    ]
  },
  {
    id: "dl-030",
    topic: "Sport psychology",
    title: "Compete From Identity, Not Fear",
    minutes: 3,
    cards: [
      { kind: "text", heading: "Who you are vs. what you do", body: "Many athletes tie their whole worth to results. A good game means \"I'm good.\" A bad game means \"I'm nothing.\" That makes every play feel like a test of who you are. Pressure goes way up." },
      { kind: "text", heading: "Identity drives behavior", body: "When you see yourself as \"an athlete who prepares,\" you prepare even on bad days. Habits flow from identity. You are not trying to act confident. You are acting like the person you have decided to be." },
      { kind: "choice", prompt: "Which identity statement handles pressure best?", options: ["\"I'm only as good as my last game.\"", "\"I'm a competitor who prepares, resets, and gives full effort.\"", "\"I'm the best, no one can touch me.\"", "\"I'm the one who always chokes.\""], answer: 1, explain: "An identity built on controllable actions stays steady no matter the score." },
      { kind: "text", heading: "Peak performance is an identity achievement", body: "Flow, confidence, and clutch play are not just physical skills. They come from who you believe you are. Every routine, reset, and process goal you used this month is a vote for that identity." },
      { kind: "reveal", prompt: "Finish this sentence: \"I am an athlete who...\"", answer: "Write three endings using actions you control. Read them before every practice. That is your identity, and it does not change with the scoreboard." }
    ],
    takeaway: "Write \"I am an athlete who...\" with three actions you control. Read it before you compete.",
    quiz: [
      { q: "Why does tying your worth to results raise pressure?", options: ["It makes games shorter", "It improves focus", "It has no effect", "It makes every play feel like a test of who you are"], answer: 3, explain: "When results define your worth, every play carries too much weight." },
      { q: "A strong athletic identity is built on:", options: ["Controllable actions like preparation and effort", "Wins only", "What fans say", "Social media followers"], answer: 0, explain: "Identity based on controllable actions stays stable through ups and downs." },
      { q: "How do habits relate to identity?", options: ["They are unrelated", "Habits replace identity", "Only coaches have identities", "Each habit is a vote for who you are becoming"], answer: 3, explain: "Repeated actions reinforce the identity you are building." }
    ]
  }
]
