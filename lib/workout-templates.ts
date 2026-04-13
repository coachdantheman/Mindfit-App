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
  { name: 'Box Jumps', sets: 4, reps: '5', notes: 'Land softly, step down — max effort' },
  { name: 'Power Clean', sets: 4, reps: '3-5', notes: 'Explosive hip extension' },
  { name: 'Medicine Ball Slams', sets: 3, reps: '8', notes: 'Full extension, slam hard' },
  { name: 'Broad Jumps', sets: 3, reps: '5', notes: 'Full arm swing, stick the landing' },
  { name: 'Plyo Push-Ups', sets: 3, reps: '6-8', notes: 'Explode off the ground' },
  { name: 'Kettlebell Swings', sets: 3, reps: '12', notes: 'Snap hips, not arms' },
]

const SPEED_AGILITY: WorkoutExercise[] = [
  { name: '40-Yard Sprint', sets: 6, reps: '1', notes: '90 sec rest between — full recovery' },
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
): TemplateWorkout {
  const warmUp = WARM_UP.slice(0, 3)
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

export function generatePlanTemplate(
  sport: string,
  goals: string[],
  experience: string,
  daysPerWeek: number,
  durationWeeks: number,
): PlanTemplate {
  const splits = getDaySplits(daysPerWeek, goals)
  const blocksCount = Math.ceil(durationWeeks / 4)

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
        const workout = buildWorkoutDay(WEEKDAY_MAP[dayIdx], focus, sport, goals)
        workouts.push({
          ...workout,
          day_of_week: WEEKDAY_MAP[dayIdx],
        })
      })
    }

    blocks.push({
      name: blockNames[bi] || `Phase ${bi + 1}`,
      focus: blockFocuses[bi] || 'Continued progression',
      workouts,
    })
  }

  return {
    title: `${sport} ${durationWeeks}-Week Training Program`,
    description: `${experience.charAt(0).toUpperCase() + experience.slice(1)} level program focused on ${goals.join(', ')}. ${daysPerWeek} days per week with periodized progression.`,
    blocks,
  }
}
