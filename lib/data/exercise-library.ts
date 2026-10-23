import type { ExerciseMeasure, MuscleGroup, StandardKey } from '@/types/exercise'

export interface SeedExercise {
  slug: string
  name: string
  aliases: string[]
  muscle_group: MuscleGroup
  equipment: string
  measure: ExerciseMeasure
  standard_key: StandardKey | null
}

// [slug, name, muscle_group, equipment, measure, aliases, standard_key?]
// Aliases cover every exercise name used in lib/workout-templates.ts and
// seed-workouts.sql so plan workouts auto-link to a library row.
type Row = [string, string, MuscleGroup, string, ExerciseMeasure, string[], StandardKey?]

const ROWS: Row[] = [
  // ─── chest ─────────────────────────────────────────────────────────────
  ['bench-press', 'Bench Press', 'chest', 'barbell', 'weight_reps', ['Barbell Bench Press', 'Flat Bench', 'Flat Barbell Bench Press'], 'bench'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', 'weight_reps', ['Incline DB Press', 'Incline Press']],
  ['dumbbell-bench-press', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'weight_reps', ['DB Bench Press', 'Flat Dumbbell Press']],
  ['push-ups', 'Push-Ups', 'chest', 'bodyweight', 'reps', ['Push Ups', 'Pushups', 'Push-Up', 'Tempo Push-Ups', 'Wide Push-Ups', 'Decline Push-Ups', 'Band-Resisted Push-Up'], 'pushup'],
  ['diamond-push-ups', 'Diamond Push-Ups', 'arms', 'bodyweight', 'reps', ['Close-Grip Push-Ups', 'Archer Push-Ups']],
  ['plyo-push-ups', 'Plyo Push-Ups', 'chest', 'bodyweight', 'reps', ['Clap Push-Ups', 'Plyometric Push-Ups', 'Explosive Push-Ups']],
  ['dips', 'Dips', 'chest', 'bodyweight', 'reps', ['Parallel Bar Dips', 'Chest Dips', 'Tricep Dips', 'Bench Dips']],
  ['chest-pass-to-wall', 'Chest Pass to Wall', 'chest', 'med ball', 'reps', ['Med Ball Chest Pass', 'Medicine Ball Chest Pass']],
  ['landmine-press', 'Landmine Press', 'shoulders', 'barbell', 'weight_reps', ['Half-Kneeling Landmine Press']],

  // ─── back ──────────────────────────────────────────────────────────────
  ['pull-ups', 'Pull-Ups', 'back', 'bodyweight', 'reps', ['Pull Ups', 'Pullups', 'Pull-Up', 'Chin-Ups', 'Chin Ups', 'Pull-Ups or Inverted Rows', 'Explosive Pull-Up'], 'pullup'],
  ['inverted-rows', 'Inverted Rows', 'back', 'bodyweight', 'reps', ['Inverted Row', 'Bodyweight Rows', 'Australian Pull-Ups']],
  ['barbell-row', 'Barbell Row', 'back', 'barbell', 'weight_reps', ['Barbell Rows', 'Barbell Bent-Over Row', 'Bent-Over Row', 'Bent Over Row', 'Pendlay Row'], 'row'],
  ['single-arm-dumbbell-row', 'Single-Arm Dumbbell Row', 'back', 'dumbbell', 'weight_reps', ['Single Arm Dumbbell Row', 'One-Arm Dumbbell Row', 'Dumbbell Row', 'DB Row']],
  ['seated-cable-row', 'Seated Cable Row', 'back', 'cable', 'weight_reps', ['Cable Row', 'Single Arm Cable Row', 'Single-Arm Cable Row']],
  ['lat-pulldown', 'Lat Pulldown', 'back', 'cable', 'weight_reps', ['Lat Pulldowns', 'Pulldown']],
  ['face-pulls', 'Face Pulls', 'shoulders', 'cable', 'weight_reps', ['Face Pull', 'Band Face Pulls']],
  ['band-pull-aparts', 'Band Pull-Aparts', 'shoulders', 'band', 'reps', ['Band Pull Aparts', 'Band Pull-Apart']],
  ['deadlift', 'Deadlift', 'legs', 'barbell', 'weight_reps', ['Conventional Deadlift', 'Barbell Deadlift', 'Deadlifts'], 'deadlift'],
  ['trap-bar-deadlift', 'Trap Bar Deadlift', 'legs', 'trap bar', 'weight_reps', ['Hex Bar Deadlift']],
  ['romanian-deadlift', 'Romanian Deadlift', 'legs', 'barbell', 'weight_reps', ['RDL', 'Romanian Deadlifts', 'Stiff-Leg Deadlift']],
  ['single-leg-rdl', 'Single-Leg RDL', 'legs', 'dumbbell', 'weight_reps', ['Single Leg RDL', 'Single-Leg Romanian Deadlift', 'Single Leg Romanian Deadlift']],
  ['farmer-carry', "Farmer's Carry", 'full_body', 'dumbbell', 'weight_reps', ['Farmer Carries', 'Farmers Carry', 'Farmer Walk', 'Farmers Walk']],

  // ─── shoulders ─────────────────────────────────────────────────────────
  ['overhead-press', 'Overhead Press', 'shoulders', 'barbell', 'weight_reps', ['OHP', 'Military Press', 'Standing Press', 'Barbell Overhead Press', 'Shoulder Press'], 'ohp'],
  ['dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'weight_reps', ['DB Shoulder Press', 'Seated Dumbbell Press']],
  ['lateral-raises', 'Lateral Raises', 'shoulders', 'dumbbell', 'weight_reps', ['Lateral Raise', 'Side Raises', 'Dumbbell Lateral Raise']],
  ['shoulder-external-rotation', 'Shoulder External Rotation', 'shoulders', 'band', 'reps', ['Band External Rotation', 'External Rotation']],
  ['wall-slides', 'Wall Slides', 'shoulders', 'bodyweight', 'reps', ['Wall Slide']],
  ['arm-circles', 'Arm Circles', 'shoulders', 'bodyweight', 'reps', ['Arm Circle']],

  // ─── arms ──────────────────────────────────────────────────────────────
  ['barbell-curl', 'Barbell Curl', 'arms', 'barbell', 'weight_reps', ['Barbell Curls', 'Bicep Curl']],
  ['dumbbell-curls', 'Dumbbell Curls', 'arms', 'dumbbell', 'weight_reps', ['Dumbbell Curl', 'DB Curls', 'Bicep Curls']],
  ['hammer-curls', 'Hammer Curls', 'arms', 'dumbbell', 'weight_reps', ['Hammer Curl']],
  ['tricep-pushdowns', 'Tricep Pushdowns', 'arms', 'cable', 'weight_reps', ['Tricep Pushdown', 'Triceps Pushdown', 'Cable Pushdown', 'Rope Pushdown']],

  // ─── legs ──────────────────────────────────────────────────────────────
  ['back-squat', 'Back Squat', 'legs', 'barbell', 'weight_reps', ['Squat', 'Barbell Squat', 'Barbell Back Squat', 'Back Squats', 'Squats'], 'squat'],
  ['front-squat', 'Front Squat', 'legs', 'barbell', 'weight_reps', ['Front Squats', 'Barbell Front Squat'], 'front_squat'],
  ['goblet-squat', 'Goblet Squat', 'legs', 'dumbbell', 'weight_reps', ['Goblet Squats', 'Kettlebell Goblet Squat']],
  ['bodyweight-squats', 'Bodyweight Squats', 'legs', 'bodyweight', 'reps', ['Bodyweight Squat', 'Air Squats', 'Air Squat', 'Slow Bodyweight Squat', 'BOSU Ball Squat']],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'legs', 'dumbbell', 'weight_reps', ['Bulgarian Split Squats', 'Rear-Foot Elevated Split Squat', 'RFESS']],
  ['walking-lunges', 'Walking Lunges', 'legs', 'bodyweight', 'reps', ['Walking Lunge', 'Lunges', 'Forward Lunges', 'Reverse Lunges']],
  ['lateral-lunge', 'Lateral Lunge', 'legs', 'bodyweight', 'reps', ['Lateral Lunges', 'Side Lunge', 'Side Lunges', 'Cossack Squat']],
  ['step-ups', 'Step-Ups', 'legs', 'dumbbell', 'weight_reps', ['Step Ups', 'Step-Up', 'Box Step-Ups']],
  ['leg-press', 'Leg Press', 'legs', 'machine', 'weight_reps', ['Leg Press Machine']],
  ['leg-curls', 'Leg Curls', 'legs', 'machine', 'weight_reps', ['Leg Curl', 'Hamstring Curls', 'Lying Leg Curl', 'Seated Leg Curl', 'Nordic Curls']],
  ['leg-extensions', 'Leg Extensions', 'legs', 'machine', 'weight_reps', ['Leg Extension']],
  ['calf-raises', 'Calf Raises', 'legs', 'bodyweight', 'reps', ['Calf Raise', 'Standing Calf Raise', 'Seated Calf Raise']],
  ['wall-sit', 'Wall Sit', 'legs', 'bodyweight', 'time_sec', ['Wall Sits']],
  ['single-leg-squat-to-box', 'Single-Leg Squat to Box', 'legs', 'bodyweight', 'reps', ['Single Leg Squat to Box', 'Pistol Squat to Box', 'Single-Leg Box Squat']],
  ['sled-push', 'Sled Push', 'legs', 'sled', 'weight_reps', ['Sled Pushes', 'Prowler Push', 'Sled Push Sprint']],

  // ─── glutes ────────────────────────────────────────────────────────────
  ['hip-thrust', 'Hip Thrust', 'glutes', 'barbell', 'weight_reps', ['Barbell Hip Thrust', 'Hip Thrusts'], 'hip_thrust'],
  ['glute-bridge', 'Glute Bridge', 'glutes', 'bodyweight', 'reps', ['Glute Bridges', 'Single-Leg Glute Bridge', 'Single Leg Glute Bridge']],
  ['kettlebell-swings', 'Kettlebell Swings', 'glutes', 'kettlebell', 'weight_reps', ['Kettlebell Swing', 'KB Swings', 'Russian Kettlebell Swing']],

  // ─── core ──────────────────────────────────────────────────────────────
  ['plank', 'Plank', 'core', 'bodyweight', 'time_sec', ['Planks', 'Front Plank', 'Forearm Plank', 'Bear Crawl Hold']],
  ['side-plank', 'Side Plank', 'core', 'bodyweight', 'time_sec', ['Side Planks', 'Copenhagen Plank']],
  ['dead-bug', 'Dead Bug', 'core', 'bodyweight', 'reps', ['Dead Bugs', 'Deadbug']],
  ['bird-dog', 'Bird Dog', 'core', 'bodyweight', 'reps', ['Bird Dogs', 'Bird-Dog']],
  ['pallof-press', 'Pallof Press', 'core', 'cable', 'reps', ['Pallof Presses', 'Band Pallof Press']],
  ['hanging-leg-raises', 'Hanging Leg Raises', 'core', 'bodyweight', 'reps', ['Hanging Leg Raise', 'Hanging Knee Raises']],
  ['leg-raises', 'Leg Raises', 'core', 'bodyweight', 'reps', ['Leg Raise', 'Lying Leg Raises', 'Flutter Kicks']],
  ['hollow-body-hold', 'Hollow Body Hold', 'core', 'bodyweight', 'time_sec', ['Hollow Hold', 'Hollow Body']],
  ['v-ups', 'V-Ups', 'core', 'bodyweight', 'reps', ['V Ups', 'V-Up', 'Sit-Ups', 'Crunches', 'Bicycle Crunches']],
  ['mountain-climbers', 'Mountain Climbers', 'core', 'bodyweight', 'time_sec', ['Mountain Climber']],
  ['cable-woodchop', 'Cable Woodchop', 'core', 'cable', 'weight_reps', ['Rotational Cable Chop', 'Cable Chop', 'Woodchop', 'Half-Kneeling Chop', 'Wood Chop']],
  ['stir-the-pot', 'Stir the Pot', 'core', 'stability ball', 'reps', ['Stability Ball Stir the Pot']],
  ['turkish-get-up', 'Turkish Get-Up', 'full_body', 'kettlebell', 'weight_reps', ['Turkish Get Up', 'TGU', 'Get-Ups']],

  // ─── full body / power ─────────────────────────────────────────────────
  ['power-clean', 'Power Clean', 'full_body', 'barbell', 'weight_reps', ['Power Cleans', 'Hang Power Clean', 'Clean'], 'power_clean'],
  ['box-jumps', 'Box Jumps', 'legs', 'box', 'reps', ['Box Jump', 'Single Leg Box Jump', 'Single-Leg Box Jump']],
  ['depth-jumps', 'Depth Jumps', 'legs', 'box', 'reps', ['Depth Jump', 'Drop Jumps']],
  ['broad-jumps', 'Broad Jumps', 'legs', 'bodyweight', 'distance_in', ['Broad Jump', 'Standing Long Jump', 'Banded Broad Jumps'], 'broad_jump'],
  ['vertical-jump', 'Vertical Jump', 'legs', 'bodyweight', 'distance_in', ['Vert', 'Max Vertical', 'Countermovement Jump'], 'vertical_jump'],
  ['jump-squats', 'Jump Squats', 'legs', 'bodyweight', 'reps', ['Jump Squat', 'Squat Jumps', 'Trap Bar Jump Squat', 'Split Squat Jumps']],
  ['tuck-jumps', 'Tuck Jumps', 'legs', 'bodyweight', 'reps', ['Tuck Jump', 'Hurdle Hops']],
  ['bounding', 'Bounding', 'legs', 'bodyweight', 'distance_in', ['Bounds', 'Single-Leg Bounding', 'Single Leg Bounding']],
  ['lateral-bounds', 'Lateral Bounds', 'legs', 'bodyweight', 'reps', ['Lateral Bound', 'Skater Jumps', 'Lateral Bound & Hold', 'Single-Leg Hop & Stick']],
  ['medicine-ball-slams', 'Medicine Ball Slams', 'full_body', 'med ball', 'reps', ['Med Ball Slam', 'Med Ball Slams', 'Ball Slams', 'Slam Ball Push Press']],
  ['rotational-med-ball-throw', 'Rotational Med Ball Throw', 'core', 'med ball', 'reps', ['Rotational Medicine Ball Throw', 'Side Toss', 'Rotational Scoop Toss', 'Med Ball Rotational Throw']],
  ['overhead-med-ball-toss', 'Overhead Med Ball Toss', 'full_body', 'med ball', 'reps', ['Overhead Backward Toss', 'Backward Overhead Throw', 'Single-Leg Medicine Ball Pass', 'Unstable Surface Catch']],
  ['burpees', 'Burpees', 'conditioning', 'bodyweight', 'reps', ['Burpee']],
  ['bear-crawl', 'Bear Crawl', 'full_body', 'bodyweight', 'distance_in', ['Bear Crawls']],
  ['inchworms', 'Inchworms', 'full_body', 'bodyweight', 'reps', ['Inchworm', 'Inchworm Walkouts']],
  ['battle-ropes', 'Battle Ropes', 'conditioning', 'rope', 'time_sec', ['Battle Rope', 'Battling Ropes']],

  // ─── conditioning / speed ──────────────────────────────────────────────
  ['sprint', 'Sprint', 'conditioning', 'none', 'time_sec', ['40-Yard Sprint', '40-Yard Dash', '40 Yard Dash', 'Sprints', 'Hill Sprints', 'Flying 20s', '3-Point Start Sprint', 'Falling Starts', 'Block Starts', 'Ball Drop Sprint', 'Audible Cone Sprint', 'Cone Weave Sprint', 'Wall Drive March']],
  ['shuttle-run', 'Shuttle Run', 'conditioning', 'none', 'time_sec', ['Shuttle Runs', 'Pro Agility (5-10-5)', '5-10-5 Shuttle', 'Pro Agility', '5-10-5']],
  ['t-drill', 'T-Drill', 'conditioning', 'cones', 'time_sec', ['Cone Drills (T-Drill)', 'T Drill', 'Cone Drills']],
  ['ladder-drills', 'Ladder Drills', 'conditioning', 'agility ladder', 'reps', ['Agility Ladder', 'Agility Ladder — Icky Shuffle', 'Agility Ladder — In-Out', 'Ladder Drill']],
  ['backpedal-to-sprint', 'Backpedal to Sprint', 'conditioning', 'none', 'reps', ['Backpedal-to-Sprint', 'Deceleration Runs']],
  ['lateral-shuffles', 'Lateral Shuffles', 'conditioning', 'none', 'reps', ['Lateral Shuffle', 'Defensive Slide Drill', 'Defensive Slides', 'Partner Mirror Drill']],
  ['carioca', 'Carioca', 'conditioning', 'none', 'reps', ['Karaoke', 'Grapevine']],
  ['high-knees', 'High Knees', 'conditioning', 'bodyweight', 'reps', ['High Knee', 'Butt Kicks']],
  ['jumping-jacks', 'Jumping Jacks', 'conditioning', 'bodyweight', 'reps', ['Jumping Jack', 'Star Jumps']],
  ['jump-rope', 'Jump Rope', 'conditioning', 'jump rope', 'time_sec', ['Skipping', 'Skip Rope']],
  ['tempo-run', 'Tempo Run', 'conditioning', 'none', 'time_sec', ['Tempo Runs', 'Easy Run', 'Distance Run']],
  ['rowing-machine', 'Rowing Machine', 'conditioning', 'machine', 'time_sec', ['Rower', 'Erg', 'Row Erg']],

  // ─── mobility ──────────────────────────────────────────────────────────
  ['hip-flexor-stretch', 'Hip Flexor Stretch', 'mobility', 'none', 'time_sec', ['Couch Stretch', 'Kneeling Hip Flexor Stretch']],
  ['90-90-hip-switch', '90/90 Hip Switch', 'mobility', 'none', 'reps', ['90/90 Hip Switches', '90-90 Hip Switch', 'Hip CARs']],
  ['cat-cow', 'Cat-Cow', 'mobility', 'none', 'reps', ['Cat Cow', 'Cat-Camel']],
  ['pigeon-pose', 'Pigeon Pose', 'mobility', 'none', 'time_sec', ['Pigeon', 'Pigeon Stretch', 'Frog Stretch', 'Butterfly Stretch']],
  ['thoracic-spine-rotation', 'Thoracic Spine Rotation', 'mobility', 'none', 'reps', ['T-Spine Rotation', 'Thread the Needle', 'Open Books']],
  ['worlds-greatest-stretch', "World's Greatest Stretch", 'mobility', 'none', 'reps', ['Worlds Greatest Stretch', 'WGS']],
  ['leg-swings', 'Leg Swings', 'mobility', 'none', 'reps', ['Leg Swings — Forward/Back', 'Leg Swings — Lateral', 'Leg Swing']],
  ['hamstring-stretch', 'Hamstring Stretch', 'mobility', 'none', 'time_sec', ['Standing Hamstring Stretch', 'Standing Quad Stretch', 'Quad Stretch']],
  ['chest-stretch', 'Chest Stretch', 'mobility', 'none', 'time_sec', ['Chest Doorway Stretch', 'Cross-Body Shoulder Stretch', 'Doorway Stretch']],
  ['deep-squat-hold', 'Deep Squat Hold', 'mobility', 'none', 'time_sec', ["Child's Pose", 'Childs Pose', 'Squat Hold']],

  // ─── balance ───────────────────────────────────────────────────────────
  ['single-leg-stand', 'Single-Leg Stand', 'core', 'none', 'time_sec', ['Single Leg Stand', 'Single-Leg Balance', 'Eyes-Closed Single-Leg Stand', 'Yoga Tree Pose', 'Tandem Walk', 'Breathing + Balance']],
  ['star-excursion', 'Star Excursion', 'core', 'none', 'reps', ['Star Excursion Balance', 'Y-Balance', 'Foam Pad Balance Reach']],
]

export const EXERCISE_LIBRARY_SEED: SeedExercise[] = ROWS.map(([slug, name, muscle_group, equipment, measure, aliases, standard_key]) => ({
  slug,
  name,
  aliases,
  muscle_group,
  equipment,
  measure,
  standard_key: standard_key ?? null,
}))
