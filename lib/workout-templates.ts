import { WorkoutExercise } from '@/types'

interface TemplateWorkout {
  name: string
  description: string
  day_of_week: number
  exercises: WorkoutExercise[]
}

interface TemplateBlock {
  name: string
  focus: string
  workouts: TemplateWorkout[]
}

interface PlanTemplate {
  title: string
  description: string
  blocks: TemplateBlock[]
}

// Shared with PlanSetupForm (client) and the AI generate route (server).
export const PLAN_SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Hockey',
  'Tennis', 'Track & Field', 'Swimming', 'Volleyball',
  'Lacrosse', 'Wrestling', 'Golf', 'Softball', 'Cross Country',
]

export const PLAN_GOALS = [
  { key: 'strength', label: 'Strength' },
  { key: 'speed', label: 'Speed' },
  { key: 'explosiveness', label: 'Explosiveness' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'flexibility', label: 'Flexibility' },
  { key: 'sport-specific', label: 'Sport-Specific Skills' },
  { key: 'bodybuilding', label: 'Bodybuilding (muscle & aesthetics)' },
]

export const PLAN_EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const

// A plan needs a sport unless Bodybuilding is the only goal.
export function sportOptional(goals: string[]): boolean {
  return goals.length > 0 && goals.every(g => g === 'bodybuilding')
}

export interface PlanRequest {
  sport: string
  goals: string[]
  experience: (typeof PLAN_EXPERIENCE)[number]
  daysPerWeek: number
  durationWeeks: number
}

const CUSTOM_SPORT_RE = /^[A-Za-z0-9][A-Za-z0-9 &'().\/-]{0,39}$/

// Validates the AI generate request body. Returns the clean request or an error message.
export function parsePlanRequest(body: unknown): PlanRequest | string {
  if (!body || typeof body !== 'object') return 'Invalid request'
  const b = body as Record<string, unknown>

  if (!Array.isArray(b.goals) || b.goals.length === 0) return 'Pick at least one goal'
  const goalKeys = PLAN_GOALS.map(g => g.key)
  if (!b.goals.every(g => typeof g === 'string' && goalKeys.includes(g))) return 'Unknown goal'
  const goals = [...new Set(b.goals as string[])]

  const sport = typeof b.sport === 'string' ? b.sport.trim() : b.sport == null ? '' : null
  if (sport === null) return 'Invalid sport'
  if (!sport && !sportOptional(goals)) return 'Pick a sport'
  if (sport && !PLAN_SPORTS.includes(sport) && !CUSTOM_SPORT_RE.test(sport)) return 'Invalid sport'

  const experience = PLAN_EXPERIENCE.find(e => e === b.experience_level)
  if (!experience) return 'Invalid experience level'

  const days = b.days_per_week
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 7) return 'Days per week must be 1–7'
  const weeks = b.duration_weeks
  if (typeof weeks !== 'number' || !Number.isInteger(weeks) || weeks < 1 || weeks > 52) return 'Duration must be 1–52 weeks'

  return { sport, goals, experience, daysPerWeek: days, durationWeeks: weeks }
}

// Core exercise pools by focus
const WARM_UP: WorkoutExercise[] = [
  { name: 'Jumping Jacks', sets: 1, reps: '30 sec', notes: 'Get blood flowing' },
  { name: 'High Knees', sets: 1, reps: '20 each', notes: 'Drive knees to hip height' },
  { name: 'Arm Circles', sets: 1, reps: '15 each direction', notes: 'Shoulders loose' },
  { name: 'Bodyweight Squats', sets: 1, reps: '10', notes: 'Warm up legs, full depth' },
]

const STRENGTH_UPPER_PUSH: WorkoutExercise[] = [
  { name: 'Bench Press', sets: 4, reps: '8-10', notes: 'Control the descent, drive up' },
  { name: 'Overhead Press', sets: 3, reps: '8-10', notes: 'Full lockout at top' },
  { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', notes: '30-degree incline' },
  { name: 'Dips', sets: 3, reps: '8-12', notes: 'Lean slightly forward for chest' },
  { name: 'Lateral Raises', sets: 3, reps: '12-15', notes: 'Light weight, controlled' },
  { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', notes: 'Squeeze at bottom' },
]

const STRENGTH_UPPER_PULL: WorkoutExercise[] = [
  { name: 'Pull-Ups', sets: 4, reps: '6-10', notes: 'Full hang to chin over bar' },
  { name: 'Barbell Rows', sets: 4, reps: '8-10', notes: 'Hinge at hips, pull to belly' },
  { name: 'Seated Cable Row', sets: 3, reps: '10-12', notes: 'Squeeze shoulder blades' },
  { name: 'Face Pulls', sets: 3, reps: '15', notes: 'Pull to forehead, external rotate' },
  { name: 'Dumbbell Curls', sets: 3, reps: '10-12', notes: 'No swinging' },
  { name: 'Hammer Curls', sets: 3, reps: '10-12', notes: 'Neutral grip' },
]

const STRENGTH_LOWER: WorkoutExercise[] = [
  { name: 'Back Squat', sets: 4, reps: '6-8', notes: 'Below parallel, drive through heels' },
  { name: 'Romanian Deadlift', sets: 3, reps: '8-10', notes: 'Hinge at hips, feel hamstrings' },
  { name: 'Bulgarian Split Squat', sets: 3, reps: '10 each', notes: 'Rear foot elevated' },
  { name: 'Leg Press', sets: 3, reps: '10-12', notes: 'Feet shoulder width' },
  { name: 'Leg Curls', sets: 3, reps: '12', notes: 'Squeeze at top' },
  { name: 'Calf Raises', sets: 3, reps: '15-20', notes: 'Full range of motion' },
]

const POWER_EXPLOSIVE: WorkoutExercise[] = [
  { name: 'Box Jumps', sets: 4, reps: '5', notes: 'Land softly, step down: max effort' },
  { name: 'Power Clean', sets: 4, reps: '3-5', notes: 'Explosive hip extension' },
  { name: 'Medicine Ball Slams', sets: 3, reps: '8', notes: 'Full extension, slam hard' },
  { name: 'Broad Jumps', sets: 3, reps: '5', notes: 'Full arm swing, stick the landing' },
  { name: 'Plyo Push-Ups', sets: 3, reps: '6-8', notes: 'Explode off the ground' },
  { name: 'Kettlebell Swings', sets: 3, reps: '12', notes: 'Snap hips, not arms' },
]

const SPEED_AGILITY: WorkoutExercise[] = [
  { name: '40-Yard Sprint', sets: 6, reps: '1', notes: '90 sec rest between: full recovery' },
  { name: 'Pro Agility (5-10-5)', sets: 4, reps: '1', notes: 'Low hips, explosive cuts' },
  { name: 'Ladder Drills', sets: 3, reps: '2 lengths', notes: 'Quick feet, stay light' },
  { name: 'Cone Drills (T-Drill)', sets: 4, reps: '1', notes: 'Touch each cone, sprint back' },
  { name: 'Backpedal to Sprint', sets: 4, reps: '1', notes: 'React to turn and go' },
  { name: 'Lateral Shuffles', sets: 3, reps: '20 yards each', notes: 'Stay low, push off outside foot' },
]

const ENDURANCE_CONDITIONING: WorkoutExercise[] = [
  { name: 'Tempo Run', sets: 1, reps: '20 min', notes: '70-80% effort, steady pace' },
  { name: 'Burpees', sets: 3, reps: '15', notes: '30 sec rest between sets' },
  { name: 'Mountain Climbers', sets: 3, reps: '30 sec', notes: 'Fast pace, keep hips level' },
  { name: 'Battle Ropes', sets: 3, reps: '30 sec', notes: 'Alternating waves' },
  { name: 'Rowing Machine', sets: 3, reps: '500m', notes: '90 sec rest between intervals' },
  { name: 'Jump Rope', sets: 3, reps: '2 min', notes: 'Stay on balls of feet' },
]

const FLEXIBILITY_MOBILITY: WorkoutExercise[] = [
  { name: 'Hip Flexor Stretch', sets: 2, reps: '30 sec each', notes: 'Squeeze glute of back leg' },
  { name: '90/90 Hip Switch', sets: 2, reps: '10 each', notes: 'Controlled rotation' },
  { name: 'Cat-Cow', sets: 1, reps: '10', notes: 'Breathe through each position' },
  { name: 'Pigeon Pose', sets: 2, reps: '30 sec each', notes: 'Relax into the stretch' },
  { name: 'Thoracic Spine Rotation', sets: 2, reps: '10 each', notes: 'Keep hips stable' },
  { name: 'World\'s Greatest Stretch', sets: 2, reps: '5 each', notes: 'Open up hips and thoracic' },
]

const CORE: WorkoutExercise[] = [
  { name: 'Plank', sets: 3, reps: '45 sec', notes: 'Squeeze glutes and brace core' },
  { name: 'Dead Bug', sets: 3, reps: '10 each', notes: 'Keep lower back on floor' },
  { name: 'Pallof Press', sets: 3, reps: '10 each', notes: 'Resist rotation' },
  { name: 'Hanging Leg Raises', sets: 3, reps: '10', notes: 'Control the swing' },
]

// Hypertrophy (bodybuilding) pools. Sets/reps/rest come from the block phase.
interface HypertrophyMove { name: string; cue: string; iso?: boolean }

const BB_CHEST = {
  bench: { name: 'Bench Press', cue: 'Shoulder blades pinned, lower to mid-chest under control' },
  incline: { name: 'Incline Dumbbell Press', cue: '30-degree bench, deep stretch at the bottom' },
  dbBench: { name: 'Dumbbell Bench Press', cue: 'Elbows about 45 degrees from your sides' },
  dips: { name: 'Dips', cue: 'Lean forward, lower until shoulders are just below elbows' },
  fly: { name: 'Cable Fly', cue: 'Soft elbows, hug a tree, squeeze the chest', iso: true },
}

const BB_BACK = {
  pullUp: { name: 'Pull-Ups', cue: 'Use a band or the assisted machine if you cannot hit 8' },
  pulldown: { name: 'Lat Pulldown', cue: 'Pull elbows to your back pockets, no leaning back' },
  row: { name: 'Barbell Rows', cue: 'Flat back, pull to the belly button' },
  cableRow: { name: 'Seated Cable Row', cue: 'Chest tall, squeeze shoulder blades together' },
  dbRow: { name: 'Single-Arm Dumbbell Row', cue: 'Pull toward the hip, full stretch at the bottom' },
  straightArm: { name: 'Straight-Arm Pulldown', cue: 'Arms long, sweep the bar to your thighs', iso: true },
}

const BB_SHOULDERS = {
  dbPress: { name: 'Dumbbell Shoulder Press', cue: 'Seated, press up and slightly in' },
  ohp: { name: 'Overhead Press', cue: 'Glutes tight, full lockout overhead' },
  lateral: { name: 'Lateral Raises', cue: 'Lead with elbows, stop at shoulder height', iso: true },
  rearDelt: { name: 'Rear Delt Fly', cue: 'Hinge forward, light weight, squeeze the back of the shoulders', iso: true },
  facePull: { name: 'Face Pulls', cue: 'Pull to the forehead and rotate out', iso: true },
}

const BB_ARMS = {
  bbCurl: { name: 'Barbell Curl', cue: 'Elbows pinned, no swinging', iso: true },
  dbCurl: { name: 'Dumbbell Curls', cue: 'Turn the pinky up at the top', iso: true },
  inclineCurl: { name: 'Incline Dumbbell Curl', cue: 'Arms hang behind you for a long stretch', iso: true },
  hammer: { name: 'Hammer Curls', cue: 'Neutral grip, slow on the way down', iso: true },
  preacher: { name: 'Preacher Curl', cue: 'Full stretch at the bottom, no bouncing', iso: true },
  pushdown: { name: 'Tricep Pushdowns', cue: 'Elbows still, squeeze at the bottom', iso: true },
  overhead: { name: 'Overhead Tricep Extension', cue: 'Elbows point up, deep stretch behind the head', iso: true },
  skull: { name: 'Skull Crushers', cue: 'Lower to the forehead slowly, elbows in', iso: true },
}

const BB_LEGS = {
  squat: { name: 'Back Squat', cue: 'Brace, sit to parallel or below with control' },
  frontSquat: { name: 'Front Squat', cue: 'Elbows high, chest up' },
  rdl: { name: 'Romanian Deadlift', cue: 'Push hips back, feel the hamstrings stretch' },
  legPress: { name: 'Leg Press', cue: 'Full depth without the lower back lifting off' },
  split: { name: 'Bulgarian Split Squat', cue: 'Rear foot elevated, front knee tracks over toes' },
  hipThrust: { name: 'Hip Thrust', cue: 'Chin tucked, squeeze glutes hard at the top' },
  lunge: { name: 'Walking Lunges', cue: 'Long stride, back knee kisses the floor' },
  legExt: { name: 'Leg Extensions', cue: 'Pause and squeeze at the top', iso: true },
  legCurl: { name: 'Leg Curls', cue: 'Slow on the way down', iso: true },
  calf: { name: 'Calf Raises', cue: 'Pause in the stretch, rise all the way up', iso: true },
  legRaise: { name: 'Hanging Leg Raises', cue: 'Curl the pelvis up, no swinging', iso: true },
}

const BB_DAYS: Record<string, { title: string; description: string; moves: HypertrophyMove[] }> = {
  'bb-full-a': { title: 'Full Body A', description: 'Squat, bench, row plus arms and delts', moves: [BB_LEGS.squat, BB_CHEST.bench, BB_BACK.row, BB_LEGS.legCurl, BB_SHOULDERS.lateral, BB_ARMS.pushdown] },
  'bb-full-b': { title: 'Full Body B', description: 'Hinge, press, pulldown plus chest and biceps', moves: [BB_LEGS.rdl, BB_SHOULDERS.dbPress, BB_BACK.pulldown, BB_LEGS.legPress, BB_CHEST.fly, BB_ARMS.bbCurl] },
  'bb-full-c': { title: 'Full Body C', description: 'Single-leg, incline, cable row plus rear delts and arms', moves: [BB_LEGS.split, BB_CHEST.incline, BB_BACK.cableRow, BB_LEGS.legExt, BB_SHOULDERS.rearDelt, BB_ARMS.hammer] },
  'bb-upper-a': { title: 'Upper A', description: 'Chest, back, shoulders, arms', moves: [BB_CHEST.bench, BB_BACK.row, BB_SHOULDERS.dbPress, BB_BACK.pulldown, BB_ARMS.dbCurl, BB_ARMS.pushdown] },
  'bb-upper-b': { title: 'Upper B', description: 'Upper chest, lats, side delts, arm isolation', moves: [BB_CHEST.incline, BB_BACK.dbRow, BB_CHEST.fly, BB_SHOULDERS.lateral, BB_ARMS.inclineCurl, BB_ARMS.overhead] },
  'bb-lower-a': { title: 'Lower A', description: 'Quads, hamstrings, calves, abs', moves: [BB_LEGS.squat, BB_LEGS.rdl, BB_LEGS.legPress, BB_LEGS.legCurl, BB_LEGS.calf, BB_LEGS.legRaise] },
  'bb-lower-b': { title: 'Lower B', description: 'Glutes, single-leg work, leg isolation', moves: [BB_LEGS.split, BB_LEGS.hipThrust, BB_LEGS.lunge, BB_LEGS.legExt, BB_LEGS.legCurl, BB_LEGS.calf] },
  'bb-push-a': { title: 'Push A', description: 'Chest, shoulders, triceps', moves: [BB_CHEST.bench, BB_SHOULDERS.dbPress, BB_CHEST.incline, BB_CHEST.fly, BB_SHOULDERS.lateral, BB_ARMS.pushdown] },
  'bb-push-b': { title: 'Push B', description: 'Shoulders, chest, triceps', moves: [BB_SHOULDERS.ohp, BB_CHEST.dbBench, BB_CHEST.dips, BB_SHOULDERS.lateral, BB_ARMS.overhead, BB_ARMS.skull] },
  'bb-pull-a': { title: 'Pull A', description: 'Back thickness, rear delts, biceps', moves: [BB_BACK.pullUp, BB_BACK.row, BB_BACK.cableRow, BB_SHOULDERS.facePull, BB_ARMS.bbCurl, BB_ARMS.hammer] },
  'bb-pull-b': { title: 'Pull B', description: 'Back width, rear delts, biceps', moves: [BB_BACK.pulldown, BB_BACK.dbRow, BB_BACK.straightArm, BB_SHOULDERS.rearDelt, BB_ARMS.inclineCurl, BB_ARMS.preacher] },
  'bb-legs-a': { title: 'Legs A', description: 'Quads, hamstrings, calves', moves: [BB_LEGS.squat, BB_LEGS.rdl, BB_LEGS.legPress, BB_LEGS.legExt, BB_LEGS.legCurl, BB_LEGS.calf] },
  'bb-legs-b': { title: 'Legs B', description: 'Quads, glutes, calves', moves: [BB_LEGS.frontSquat, BB_LEGS.hipThrust, BB_LEGS.split, BB_LEGS.legCurl, BB_LEGS.legExt, BB_LEGS.calf] },
}

// Foundation/Build/Peak/Taper reused as accumulation → intensification → deload.
const BB_PHASES = [
  {
    label: 'Foundation: Accumulation',
    focus: 'Technique first: learn every lift with a full range and a 2-second lowering. Each week add 1 rep per set; once every set hits the top of the range, add the smallest weight jump. Eat enough and sleep 8+ hours, or the muscle has nothing to grow from.',
    compound: { sets: 3, reps: '10-12' }, iso: { sets: 3, reps: '12-15' }, rest: '60 s', effort: 'Stop 2-3 reps short of failure',
  },
  {
    label: 'Build: Intensification',
    focus: 'Heavier and more sets. Each week beat last week: one more rep or a little more weight with the same clean form. Stay 1-2 reps short of failure.',
    compound: { sets: 4, reps: '8-10' }, iso: { sets: 3, reps: '10-12' }, rest: '90 s', effort: 'Stop 1-2 reps short of failure',
  },
  {
    label: 'Peak: Intensification',
    focus: 'Highest volume of the plan. Keep adding a rep or a little weight each week. If a lift stalls two weeks in a row, hold the weight and clean up the reps.',
    compound: { sets: 4, reps: '8-12' }, iso: { sets: 4, reps: '10-15' }, rest: '75-90 s', effort: 'Stop 1-2 reps short of failure',
  },
  {
    label: 'Taper: Deload',
    focus: 'Deload: fewer sets, same exercises, easy effort. Recovery is when the muscle is built. Keep eating and sleeping well.',
    compound: { sets: 2, reps: '8-10' }, iso: { sets: 2, reps: '10-12' }, rest: '60-90 s', effort: 'Easy: leave 3-4 reps in the tank',
  },
]

function hypertrophyExercise(move: HypertrophyMove, blockIdx: number, experience: string): WorkoutExercise {
  const phase = BB_PHASES[blockIdx % BB_PHASES.length]
  const rx = move.iso ? phase.iso : phase.compound
  const sets = experience === 'beginner' ? Math.min(3, rx.sets) : rx.sets
  return { name: move.name, sets, reps: rx.reps, notes: `${move.cue}. Rest ${phase.rest}. ${phase.effort}.` }
}

// Sport-specific additions
const SPORT_SPECIFICS: Record<string, WorkoutExercise[]> = {
  'Football': [
    { name: 'Sled Push', sets: 4, reps: '20 yards', notes: 'Low pad level, drive through' },
    { name: 'Farmer\'s Carry', sets: 3, reps: '40 yards', notes: 'Grip strength and stability' },
  ],
  'Basketball': [
    { name: 'Depth Jumps', sets: 3, reps: '5', notes: 'Step off box, immediately jump max height' },
    { name: 'Defensive Slide Drill', sets: 4, reps: '20 sec', notes: 'Low stance, quick feet' },
  ],
  'Baseball': [
    { name: 'Rotational Med Ball Throw', sets: 3, reps: '8 each', notes: 'Hip-driven rotation' },
    { name: 'Band Pull-Aparts', sets: 3, reps: '15', notes: 'Shoulder health and stability' },
  ],
  'Soccer': [
    { name: 'Single Leg RDL', sets: 3, reps: '8 each', notes: 'Balance and hamstring strength' },
    { name: 'Shuttle Runs', sets: 6, reps: '1', notes: '20-yard shuttles, 30 sec rest' },
  ],
  'Track & Field': [
    { name: 'Block Starts', sets: 6, reps: '1', notes: 'First 10 yards, explosive drive' },
    { name: 'Bounding', sets: 4, reps: '30 meters', notes: 'Exaggerated stride, max distance per step' },
  ],
  'Swimming': [
    { name: 'Lat Pulldowns', sets: 4, reps: '10', notes: 'Mimic pull phase' },
    { name: 'Flutter Kicks', sets: 3, reps: '30 sec', notes: 'Core and hip flexor endurance' },
  ],
  'Wrestling': [
    { name: 'Turkish Get-Up', sets: 3, reps: '3 each', notes: 'Full body strength and mobility' },
    { name: 'Bear Crawl', sets: 3, reps: '30 yards', notes: 'Stay low, scramble speed' },
  ],
  'Volleyball': [
    { name: 'Single Leg Box Jump', sets: 3, reps: '5 each', notes: 'Land softly' },
    { name: 'Shoulder External Rotation', sets: 3, reps: '15', notes: 'Light band, shoulder health' },
  ],
  'Tennis': [
    { name: 'Lateral Lunge', sets: 3, reps: '8 each', notes: 'Push back to center explosively' },
    { name: 'Rotational Cable Chop', sets: 3, reps: '10 each', notes: 'Core-driven rotation' },
  ],
  'Lacrosse': [
    { name: 'Single Arm Cable Row', sets: 3, reps: '10 each', notes: 'Rotational control' },
    { name: 'Carioca', sets: 3, reps: '20 yards each', notes: 'Quick hips and crossover' },
  ],
  'Hockey': [
    { name: 'Lateral Bounds', sets: 4, reps: '6 each', notes: 'Stick the landing' },
    { name: 'Copenhagen Plank', sets: 3, reps: '20 sec each', notes: 'Adductor strength' },
  ],
  'Golf': [
    { name: 'Cable Woodchop', sets: 3, reps: '10 each', notes: 'Controlled rotation through core' },
    { name: 'Hip CARs', sets: 2, reps: '5 each', notes: 'Full range hip circles' },
  ],
  'Cross Country': [
    { name: 'Tempo Run', sets: 1, reps: '25 min', notes: '75% effort, build aerobic base' },
    { name: 'Step-Ups', sets: 3, reps: '10 each', notes: 'Drive through front heel' },
  ],
}

function buildWorkoutDay(
  dayNum: number,
  focus: string,
  sport: string,
  goals: string[],
  blockIdx = 0,
  experience = 'intermediate',
): TemplateWorkout {
  const warmUp = WARM_UP.slice(0, 3)
  const bbDay = BB_DAYS[focus]
  if (bbDay) {
    return {
      name: bbDay.title,
      description: bbDay.description,
      day_of_week: dayNum,
      exercises: [...warmUp, ...bbDay.moves.map(m => hypertrophyExercise(m, blockIdx, experience))],
    }
  }
  let mainExercises: WorkoutExercise[] = []
  let name = ''
  let description = ''

  switch (focus) {
    case 'upper-push':
      name = 'Upper Body Push'
      description = 'Chest, shoulders, triceps'
      mainExercises = [...STRENGTH_UPPER_PUSH]
      break
    case 'upper-pull':
      name = 'Upper Body Pull'
      description = 'Back, biceps, rear delts'
      mainExercises = [...STRENGTH_UPPER_PULL]
      break
    case 'lower':
      name = 'Lower Body Strength'
      description = 'Squats, deadlifts, legs'
      mainExercises = [...STRENGTH_LOWER]
      break
    case 'power':
      name = 'Power & Explosiveness'
      description = 'Plyometrics and Olympic lifts'
      mainExercises = [...POWER_EXPLOSIVE]
      break
    case 'speed':
      name = 'Speed & Agility'
      description = 'Sprint work and change of direction'
      mainExercises = [...SPEED_AGILITY]
      break
    case 'conditioning':
      name = 'Conditioning'
      description = 'Endurance and work capacity'
      mainExercises = [...ENDURANCE_CONDITIONING]
      break
    case 'mobility':
      name = 'Mobility & Recovery'
      description = 'Flexibility and active recovery'
      mainExercises = [...FLEXIBILITY_MOBILITY]
      break
    default:
      name = 'Full Body'
      description = 'Total body training'
      mainExercises = [STRENGTH_LOWER[0], STRENGTH_UPPER_PUSH[0], STRENGTH_UPPER_PULL[0], ...CORE.slice(0, 2)]
  }

  // Add sport-specific exercises if available
  const sportEx = SPORT_SPECIFICS[sport]
  if (sportEx && (goals.includes('sport-specific') || focus === 'power' || focus === 'speed')) {
    mainExercises = [...mainExercises.slice(0, 4), ...sportEx]
  }

  // Add core work to strength days
  if (['upper-push', 'upper-pull', 'lower'].includes(focus)) {
    mainExercises = [...mainExercises.slice(0, 5), ...CORE.slice(0, 2)]
  }

  return {
    name,
    description,
    day_of_week: dayNum,
    exercises: [...warmUp, ...mainExercises.slice(0, 6)],
  }
}

function getDaySplits(daysPerWeek: number, goals: string[]): string[] {
  if (goals.includes('bodybuilding')) {
    switch (daysPerWeek) {
      case 3: return ['bb-full-a', 'bb-full-b', 'bb-full-c']
      case 4: return ['bb-upper-a', 'bb-lower-a', 'bb-upper-b', 'bb-lower-b']
      case 5: return ['bb-push-a', 'bb-pull-a', 'bb-legs-a', 'bb-upper-b', 'bb-lower-b']
      case 6: return ['bb-push-a', 'bb-pull-a', 'bb-legs-a', 'bb-push-b', 'bb-pull-b', 'bb-legs-b']
      default: return daysPerWeek < 3 ? ['bb-full-a', 'bb-full-b'].slice(0, daysPerWeek) : ['bb-upper-a', 'bb-lower-a', 'bb-upper-b', 'bb-lower-b']
    }
  }
  const hasSpeed = goals.includes('speed')
  const hasPower = goals.includes('explosiveness')
  const hasEndurance = goals.includes('endurance')
  const hasFlexibility = goals.includes('flexibility')

  switch (daysPerWeek) {
    case 3:
      return ['lower', hasPower ? 'power' : 'upper-push', hasSpeed ? 'speed' : 'upper-pull']
    case 4:
      return ['upper-push', 'lower', hasSpeed ? 'speed' : 'upper-pull', hasPower ? 'power' : 'lower']
    case 5:
      return ['upper-push', 'lower', hasSpeed ? 'speed' : 'conditioning', 'upper-pull', hasPower ? 'power' : 'lower']
    case 6:
      return ['upper-push', 'lower', hasSpeed ? 'speed' : 'conditioning', 'upper-pull', hasPower ? 'power' : 'lower', hasFlexibility ? 'mobility' : hasEndurance ? 'conditioning' : 'power']
    default:
      return ['upper-push', 'lower', 'upper-pull', 'power']
  }
}

const WEEKDAY_MAP: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 } // index to day_of_week (Mon-Sat)
// Hypertrophy days need a rest day between repeats of the same muscles.
const BB_WEEKDAYS: Record<number, number[]> = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5] }

export function generatePlanTemplate(
  sport: string,
  goals: string[],
  experience: string,
  daysPerWeek: number,
  durationWeeks: number,
): PlanTemplate {
  const splits = getDaySplits(daysPerWeek, goals).slice(0, daysPerWeek)
  const blocksCount = Math.ceil(durationWeeks / 4)
  const bodybuilding = goals.includes('bodybuilding')

  const blockNames = ['Foundation', 'Build', 'Peak', 'Taper']
  const blockFocuses = [
    'Movement quality, base strength, and work capacity',
    'Progressive overload, increasing intensity',
    'Peak performance, sport-specific power',
    'Deload and sharpen for competition',
  ]

  const blocks: TemplateBlock[] = []

  for (let bi = 0; bi < blocksCount; bi++) {
    const weekStart = bi * 4 + 1
    const weekEnd = Math.min((bi + 1) * 4, durationWeeks)
    const workouts: TemplateWorkout[] = []

    for (let week = weekStart; week <= weekEnd; week++) {
      splits.forEach((focus, dayIdx) => {
        const day = (bodybuilding && BB_WEEKDAYS[splits.length]?.[dayIdx]) || WEEKDAY_MAP[dayIdx]
        const workout = buildWorkoutDay(day, focus, sport, goals, bi, experience)
        workouts.push({
          ...workout,
          day_of_week: day,
        })
      })
    }

    const bbPhase = BB_PHASES[bi % BB_PHASES.length]
    blocks.push({
      name: bodybuilding ? bbPhase.label : blockNames[bi] || `Phase ${bi + 1}`,
      focus: bodybuilding ? bbPhase.focus : blockFocuses[bi] || 'Continued progression',
      workouts,
    })
  }

  return {
    title: bodybuilding
      ? `${sport ? `${sport} ` : ''}${durationWeeks}-Week Bodybuilding Program`
      : `${sport} ${durationWeeks}-Week Training Program`,
    description: `${experience.charAt(0).toUpperCase() + experience.slice(1)} level program focused on ${goals.join(', ')}. ${daysPerWeek} days per week with periodized progression.`,
    blocks,
  }
}
