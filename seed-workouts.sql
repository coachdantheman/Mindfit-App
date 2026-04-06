-- ============================================================
-- MindFit App — Seed Workout Categories + Workouts
-- Run AFTER supabase-migration-v2.sql
-- Supabase Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================

-- Insert the 6 workout categories
INSERT INTO workout_categories (name, description, sort_order) VALUES
  ('Speed', 'Build quickness and acceleration on the field', 0),
  ('Explosiveness', 'Develop power and fast-twitch muscle response', 1),
  ('Strength', 'Build raw strength for your sport', 2),
  ('Flexibility', 'Improve range of motion and prevent injury', 3),
  ('Calisthenics', 'Bodyweight training for functional athleticism', 4),
  ('Balance', 'Improve stability, coordination, and body control', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SPEED WORKOUTS
-- ============================================================

INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
((SELECT id FROM workout_categories WHERE name = 'Speed'),
 'Sprint Intervals',
 'Short burst speed work to build top-end velocity',
 '[{"name": "40-Yard Dash", "sets": 6, "reps": "1", "notes": "Full recovery between reps — 90 sec rest"},
   {"name": "Flying 20s", "sets": 4, "reps": "1", "notes": "Build up speed over 10 yards then sprint 20"},
   {"name": "Hill Sprints", "sets": 5, "reps": "1", "notes": "Find a moderate incline, sprint 30 yards"},
   {"name": "Deceleration Runs", "sets": 4, "reps": "1", "notes": "Sprint 30 yards then slow to a stop in 5 yards"}]',
 0),

((SELECT id FROM workout_categories WHERE name = 'Speed'),
 'Agility & Footwork',
 'Quick feet and change-of-direction speed',
 '[{"name": "Agility Ladder — Icky Shuffle", "sets": 3, "reps": "2 lengths", "notes": "Stay on the balls of your feet"},
   {"name": "Agility Ladder — In-Out", "sets": 3, "reps": "2 lengths", "notes": "Two feet in, two feet out"},
   {"name": "5-10-5 Shuttle", "sets": 5, "reps": "1", "notes": "Explode out of each cut — stay low"},
   {"name": "T-Drill", "sets": 4, "reps": "1", "notes": "Sprint, shuffle, backpedal — full speed"},
   {"name": "Cone Weave Sprint", "sets": 4, "reps": "1", "notes": "Set 6 cones 5 yards apart, weave through"}]',
 1),

((SELECT id FROM workout_categories WHERE name = 'Speed'),
 'Acceleration Development',
 'First-step quickness and drive phase mechanics',
 '[{"name": "Wall Drive March", "sets": 3, "reps": "10 each leg", "notes": "Hands on wall, drive knee up — hold 2 sec"},
   {"name": "Falling Starts", "sets": 6, "reps": "1", "notes": "Lean forward and sprint on the catch — 20 yards"},
   {"name": "Sled Push Sprint", "sets": 5, "reps": "20 yards", "notes": "Light load, focus on 45-degree body angle"},
   {"name": "3-Point Start Sprint", "sets": 6, "reps": "1", "notes": "Explode out of a 3-point stance — 15 yards"}]',
 2),

((SELECT id FROM workout_categories WHERE name = 'Speed'),
 'Reaction & Sport Speed',
 'Train game-speed decision making and reactive quickness',
 '[{"name": "Partner Mirror Drill", "sets": 4, "reps": "30 sec", "notes": "Mirror your partner shuffle for shuffle in a 5-yard box"},
   {"name": "Ball Drop Sprint", "sets": 6, "reps": "1", "notes": "Partner drops tennis ball — sprint and catch before 2nd bounce"},
   {"name": "Audible Cone Sprint", "sets": 5, "reps": "1", "notes": "4 cones in a square — partner calls color, sprint to it"},
   {"name": "Backpedal-to-Sprint", "sets": 5, "reps": "1", "notes": "Backpedal 5 yards, hip turn, sprint 15 yards"}]',
 3);

-- ============================================================
-- EXPLOSIVENESS WORKOUTS
-- ============================================================

INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
((SELECT id FROM workout_categories WHERE name = 'Explosiveness'),
 'Plyometric Power',
 'Jump training to develop fast-twitch muscle and reactive strength',
 '[{"name": "Box Jumps", "sets": 4, "reps": "5", "notes": "Step down, don''t jump down — protect your joints"},
   {"name": "Depth Jumps", "sets": 3, "reps": "5", "notes": "Step off box, land, immediately jump as high as possible"},
   {"name": "Broad Jumps", "sets": 4, "reps": "4", "notes": "Swing arms and explode forward — stick the landing"},
   {"name": "Single-Leg Bounding", "sets": 3, "reps": "6 each leg", "notes": "Drive knee high, cover max distance each bound"},
   {"name": "Tuck Jumps", "sets": 3, "reps": "8", "notes": "Jump and pull knees to chest at the top"}]',
 0),

((SELECT id FROM workout_categories WHERE name = 'Explosiveness'),
 'Medicine Ball Power',
 'Rotational and total body explosive power',
 '[{"name": "Med Ball Slam", "sets": 4, "reps": "8", "notes": "Reach overhead, slam as hard as possible into the ground"},
   {"name": "Rotational Scoop Toss", "sets": 3, "reps": "6 each side", "notes": "Load the hip, explode through rotation"},
   {"name": "Chest Pass to Wall", "sets": 4, "reps": "8", "notes": "Explosive push from the chest — catch and repeat fast"},
   {"name": "Overhead Backward Toss", "sets": 3, "reps": "6", "notes": "Squat, hinge, and launch the ball behind you for height"},
   {"name": "Side Toss", "sets": 3, "reps": "6 each side", "notes": "Stand sideways to wall, rotate and throw from the hip"}]',
 1),

((SELECT id FROM workout_categories WHERE name = 'Explosiveness'),
 'Lower Body Power',
 'Build explosive legs for jumping, sprinting, and cutting',
 '[{"name": "Trap Bar Jump Squat", "sets": 4, "reps": "5", "notes": "Light weight — focus on speed, not load"},
   {"name": "Kettlebell Swings", "sets": 4, "reps": "12", "notes": "Hinge at the hips, snap them forward — power from the glutes"},
   {"name": "Split Squat Jumps", "sets": 3, "reps": "6 each side", "notes": "Lunge position, jump and switch legs mid-air"},
   {"name": "Hurdle Hops", "sets": 4, "reps": "5", "notes": "Set 5 low hurdles — hop over each with minimal ground contact"},
   {"name": "Banded Broad Jumps", "sets": 3, "reps": "5", "notes": "Band around waist, partner holds — explode forward against resistance"}]',
 2),

((SELECT id FROM workout_categories WHERE name = 'Explosiveness'),
 'Upper Body Power',
 'Explosive pressing and pulling for athletic performance',
 '[{"name": "Clap Push-Ups", "sets": 4, "reps": "8", "notes": "Explode off the floor, clap, land soft"},
   {"name": "Landmine Press", "sets": 4, "reps": "6 each arm", "notes": "Drive the barbell up explosively — control the lower"},
   {"name": "Band-Resisted Push-Up", "sets": 3, "reps": "10", "notes": "Band across your back, push fast against the resistance"},
   {"name": "Explosive Pull-Up", "sets": 4, "reps": "5", "notes": "Pull so hard your hands leave the bar at the top"},
   {"name": "Slam Ball Push Press", "sets": 3, "reps": "8", "notes": "Dip and drive the slam ball overhead as fast as possible"}]',
 3);

-- ============================================================
-- STRENGTH WORKOUTS
-- ============================================================

INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
((SELECT id FROM workout_categories WHERE name = 'Strength'),
 'Upper Body Push',
 'Chest, shoulders, and triceps strength',
 '[{"name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "notes": "Control the bar down, explode up — full range of motion"},
   {"name": "Overhead Press", "sets": 4, "reps": "6-8", "notes": "Brace your core, press straight overhead"},
   {"name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "notes": "30-degree angle, squeeze at the top"},
   {"name": "Dips", "sets": 3, "reps": "8-12", "notes": "Lean slightly forward for chest emphasis"},
   {"name": "Tricep Pushdowns", "sets": 3, "reps": "12-15", "notes": "Keep elbows pinned, squeeze at the bottom"}]',
 0),

((SELECT id FROM workout_categories WHERE name = 'Strength'),
 'Upper Body Pull',
 'Back and biceps strength',
 '[{"name": "Pull-Ups", "sets": 4, "reps": "6-10", "notes": "Full dead hang to chin over bar — no kipping"},
   {"name": "Barbell Bent-Over Row", "sets": 4, "reps": "6-8", "notes": "45-degree torso angle, pull to your lower chest"},
   {"name": "Single-Arm Dumbbell Row", "sets": 3, "reps": "8-10 each", "notes": "Drive elbow back, squeeze the lat at the top"},
   {"name": "Face Pulls", "sets": 3, "reps": "15", "notes": "Pull to your forehead, rotate hands out at the end"},
   {"name": "Barbell Curl", "sets": 3, "reps": "10-12", "notes": "No swinging — strict form, squeeze at the top"}]',
 1),

((SELECT id FROM workout_categories WHERE name = 'Strength'),
 'Lower Body Strength',
 'Squat and hinge patterns for raw leg power',
 '[{"name": "Back Squat", "sets": 4, "reps": "5-6", "notes": "Below parallel — drive through your heels"},
   {"name": "Romanian Deadlift", "sets": 4, "reps": "8", "notes": "Slight knee bend, hinge at the hips — feel the hamstrings stretch"},
   {"name": "Bulgarian Split Squat", "sets": 3, "reps": "8 each leg", "notes": "Rear foot elevated on a bench"},
   {"name": "Leg Press", "sets": 3, "reps": "10-12", "notes": "Feet shoulder-width, full depth"},
   {"name": "Calf Raises", "sets": 4, "reps": "15", "notes": "Slow on the way down, pause at the bottom"}]',
 2),

((SELECT id FROM workout_categories WHERE name = 'Strength'),
 'Total Body Strength',
 'Compound movements that build full-body athleticism',
 '[{"name": "Deadlift", "sets": 4, "reps": "5", "notes": "Flat back, drive through the floor — lock out at the top"},
   {"name": "Front Squat", "sets": 4, "reps": "6", "notes": "Elbows high, core tight, below parallel"},
   {"name": "Barbell Hip Thrust", "sets": 3, "reps": "10", "notes": "Shoulders on bench, drive hips to full extension — squeeze glutes"},
   {"name": "Farmer Carries", "sets": 3, "reps": "40 yards", "notes": "Heavy dumbbells, walk tall — grip and core work"},
   {"name": "Turkish Get-Up", "sets": 2, "reps": "3 each side", "notes": "Slow and controlled — this is a full-body stability exercise"}]',
 3);

-- ============================================================
-- FLEXIBILITY WORKOUTS
-- ============================================================

INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
((SELECT id FROM workout_categories WHERE name = 'Flexibility'),
 'Full Body Stretch',
 '15-minute recovery routine for after training',
 '[{"name": "Standing Quad Stretch", "sets": 1, "reps": "30 sec each", "notes": "Pull heel to glute, keep knees together"},
   {"name": "Standing Hamstring Stretch", "sets": 1, "reps": "30 sec each", "notes": "Straight leg on a low surface, hinge forward"},
   {"name": "Hip Flexor Stretch", "sets": 1, "reps": "30 sec each", "notes": "Half-kneeling, push hips forward gently"},
   {"name": "Pigeon Pose", "sets": 1, "reps": "45 sec each", "notes": "Front shin across the body, sink hips down"},
   {"name": "Chest Doorway Stretch", "sets": 1, "reps": "30 sec each", "notes": "Arm on door frame at 90 degrees, lean through"},
   {"name": "Cat-Cow", "sets": 1, "reps": "10 cycles", "notes": "Slow, breathe into each position"},
   {"name": "Child''s Pose", "sets": 1, "reps": "60 sec", "notes": "Arms extended, sink hips back, breathe deep"}]',
 0),

((SELECT id FROM workout_categories WHERE name = 'Flexibility'),
 'Dynamic Warm-Up',
 'Pre-training movement prep to activate muscles and prevent injury',
 '[{"name": "Leg Swings — Forward/Back", "sets": 1, "reps": "15 each leg", "notes": "Hold something for balance, swing through full range"},
   {"name": "Leg Swings — Lateral", "sets": 1, "reps": "15 each leg", "notes": "Swing across the body and out"},
   {"name": "Walking Lunges", "sets": 1, "reps": "10 each leg", "notes": "Long stride, upright torso"},
   {"name": "Inchworms", "sets": 1, "reps": "8", "notes": "Walk hands out to plank, walk feet to hands"},
   {"name": "World''s Greatest Stretch", "sets": 1, "reps": "5 each side", "notes": "Lunge, rotate, reach — hit everything"},
   {"name": "High Knees", "sets": 1, "reps": "20 each", "notes": "Drive knees up, pump arms — light on your feet"},
   {"name": "Butt Kicks", "sets": 1, "reps": "20 each", "notes": "Quick cadence, heels to glutes"}]',
 1),

((SELECT id FROM workout_categories WHERE name = 'Flexibility'),
 'Hip Mobility Flow',
 'Open up tight hips for better movement on the field',
 '[{"name": "90/90 Hip Switch", "sets": 3, "reps": "8 each side", "notes": "Sit on the floor, rotate between internal and external rotation"},
   {"name": "Deep Squat Hold", "sets": 3, "reps": "30 sec", "notes": "Feet shoulder-width, elbows push knees out"},
   {"name": "Frog Stretch", "sets": 2, "reps": "45 sec", "notes": "On all fours, widen knees, rock back gently"},
   {"name": "Couch Stretch", "sets": 2, "reps": "45 sec each", "notes": "Rear foot on a wall or couch, front foot forward — stretch hip flexor"},
   {"name": "Butterfly Stretch", "sets": 2, "reps": "30 sec", "notes": "Feet together, press knees toward the floor"}]',
 2),

((SELECT id FROM workout_categories WHERE name = 'Flexibility'),
 'Shoulder & Upper Body Mobility',
 'Restore overhead range of motion and reduce stiffness',
 '[{"name": "Band Pull-Aparts", "sets": 3, "reps": "15", "notes": "Light band, pull to chest level — squeeze shoulder blades"},
   {"name": "Wall Slides", "sets": 3, "reps": "10", "notes": "Back flat against wall, slide arms up and down keeping contact"},
   {"name": "Thread the Needle", "sets": 2, "reps": "8 each side", "notes": "On all fours, reach one arm under and rotate"},
   {"name": "Cross-Body Shoulder Stretch", "sets": 1, "reps": "30 sec each", "notes": "Pull arm across chest, hold"},
   {"name": "Thoracic Spine Rotation", "sets": 2, "reps": "8 each side", "notes": "Side-lying, rotate top arm and follow with eyes"}]',
 3);

-- ============================================================
-- CALISTHENICS WORKOUTS
-- ============================================================

INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
((SELECT id FROM workout_categories WHERE name = 'Calisthenics'),
 'Bodyweight Circuit',
 'Full-body strength circuit — no equipment needed',
 '[{"name": "Push-Ups", "sets": 4, "reps": "15-20", "notes": "Full range — chest to floor, lock out at top"},
   {"name": "Bodyweight Squats", "sets": 4, "reps": "20", "notes": "Below parallel, drive through heels"},
   {"name": "Pull-Ups or Inverted Rows", "sets": 4, "reps": "8-12", "notes": "Use a bar, tree branch, or table edge for rows"},
   {"name": "Plank", "sets": 3, "reps": "45 sec", "notes": "Tight core, flat back — no sagging"},
   {"name": "Burpees", "sets": 3, "reps": "10", "notes": "Full extension at the top, chest to floor at the bottom"}]',
 0),

((SELECT id FROM workout_categories WHERE name = 'Calisthenics'),
 'Core Destroyer',
 'Targeted core work for stability and power transfer',
 '[{"name": "Hollow Body Hold", "sets": 3, "reps": "30 sec", "notes": "Lower back pressed into the floor, arms overhead"},
   {"name": "Bicycle Crunches", "sets": 3, "reps": "20 each side", "notes": "Slow and controlled — elbow to opposite knee"},
   {"name": "Leg Raises", "sets": 3, "reps": "12", "notes": "Flat on your back, legs straight, lower slowly"},
   {"name": "Dead Bug", "sets": 3, "reps": "10 each side", "notes": "Opposite arm and leg extend — keep lower back flat"},
   {"name": "Side Plank", "sets": 2, "reps": "30 sec each side", "notes": "Stack feet or stagger — keep hips high"},
   {"name": "V-Ups", "sets": 3, "reps": "12", "notes": "Hands and feet meet at the top — control the lower"}]',
 1),

((SELECT id FROM workout_categories WHERE name = 'Calisthenics'),
 'Push-Up Progression',
 'Master the push-up and build pressing strength',
 '[{"name": "Diamond Push-Ups", "sets": 3, "reps": "10-12", "notes": "Hands together under your chest — tricep emphasis"},
   {"name": "Wide Push-Ups", "sets": 3, "reps": "12-15", "notes": "Hands wider than shoulders — chest emphasis"},
   {"name": "Decline Push-Ups", "sets": 3, "reps": "10", "notes": "Feet elevated on a bench or step"},
   {"name": "Archer Push-Ups", "sets": 3, "reps": "6 each side", "notes": "One arm extends out to the side as you lower"},
   {"name": "Tempo Push-Ups", "sets": 2, "reps": "8", "notes": "3 seconds down, 1 second pause, explode up"}]',
 2),

((SELECT id FROM workout_categories WHERE name = 'Calisthenics'),
 'Leg Burner — No Equipment',
 'Build leg strength and endurance with bodyweight only',
 '[{"name": "Jump Squats", "sets": 4, "reps": "12", "notes": "Squat deep, explode up, land soft"},
   {"name": "Walking Lunges", "sets": 3, "reps": "12 each leg", "notes": "Long stride, knee tracks over toes"},
   {"name": "Single-Leg Glute Bridge", "sets": 3, "reps": "12 each", "notes": "Drive through heel, squeeze glute at top"},
   {"name": "Wall Sit", "sets": 3, "reps": "45 sec", "notes": "Back flat against wall, thighs parallel to floor"},
   {"name": "Step-Ups", "sets": 3, "reps": "10 each leg", "notes": "Use a bench or sturdy chair — drive through the front leg"}]',
 3);

-- ============================================================
-- BALANCE WORKOUTS
-- ============================================================

INSERT INTO workouts (category_id, name, description, exercises, sort_order) VALUES
((SELECT id FROM workout_categories WHERE name = 'Balance'),
 'Stability Foundations',
 'Build single-leg stability and body control',
 '[{"name": "Single-Leg Stand", "sets": 3, "reps": "30 sec each", "notes": "Eyes open first, then try eyes closed"},
   {"name": "Single-Leg RDL", "sets": 3, "reps": "8 each leg", "notes": "Hinge at hip, reach toward the floor — stay balanced"},
   {"name": "BOSU Ball Squat", "sets": 3, "reps": "10", "notes": "Stand on the flat side of a BOSU, squat with control"},
   {"name": "Tandem Walk", "sets": 3, "reps": "20 steps", "notes": "Heel to toe in a straight line — like a tightrope"},
   {"name": "Star Excursion", "sets": 2, "reps": "5 each direction each leg", "notes": "Stand on one leg, reach the other foot forward, side, and back"}]',
 0),

((SELECT id FROM workout_categories WHERE name = 'Balance'),
 'Athletic Balance',
 'Sport-specific stability for cutting, landing, and absorbing contact',
 '[{"name": "Single-Leg Hop & Stick", "sets": 3, "reps": "6 each leg", "notes": "Hop forward, land on one foot, hold 3 seconds"},
   {"name": "Lateral Bound & Hold", "sets": 3, "reps": "6 each side", "notes": "Jump sideways, land on outside foot, stick it"},
   {"name": "Single-Leg Squat to Box", "sets": 3, "reps": "6 each leg", "notes": "Sit back to a bench on one leg, stand up without help"},
   {"name": "Unstable Surface Catch", "sets": 3, "reps": "10 catches each side", "notes": "Stand on one leg on a pillow, partner tosses a ball"},
   {"name": "Single-Leg Medicine Ball Pass", "sets": 2, "reps": "10 each leg", "notes": "Stand on one leg, rotate and pass a med ball to a partner or wall"}]',
 1),

((SELECT id FROM workout_categories WHERE name = 'Balance'),
 'Core Stability & Control',
 'Anti-rotation and anti-extension work for a bulletproof core',
 '[{"name": "Pallof Press", "sets": 3, "reps": "10 each side", "notes": "Band or cable at chest height — press out and resist rotation"},
   {"name": "Bird Dog", "sets": 3, "reps": "8 each side", "notes": "On all fours, extend opposite arm and leg — hold 2 sec"},
   {"name": "Bear Crawl Hold", "sets": 3, "reps": "30 sec", "notes": "Hands and toes, knees 1 inch off the ground — don''t move"},
   {"name": "Stir the Pot", "sets": 3, "reps": "8 circles each direction", "notes": "Forearms on a stability ball, make small circles"},
   {"name": "Half-Kneeling Chop", "sets": 3, "reps": "8 each side", "notes": "Band or cable — pull diagonally from high to low, resist rotation"}]',
 2),

((SELECT id FROM workout_categories WHERE name = 'Balance'),
 'Proprioception & Recovery',
 'Low-intensity balance work for active recovery days',
 '[{"name": "Eyes-Closed Single-Leg Stand", "sets": 3, "reps": "20 sec each", "notes": "Remove visual input — trust your body"},
   {"name": "Slow Bodyweight Squat", "sets": 3, "reps": "8", "notes": "5 seconds down, 5 seconds up — total control"},
   {"name": "Foam Pad Balance Reach", "sets": 2, "reps": "6 each direction each leg", "notes": "Stand on a foam pad on one leg, reach the other foot in all directions"},
   {"name": "Yoga Tree Pose", "sets": 2, "reps": "30 sec each side", "notes": "Foot on inner thigh or calf — never on the knee"},
   {"name": "Breathing + Balance", "sets": 2, "reps": "60 sec each leg", "notes": "Single-leg stand with slow box breathing — 4 in, 4 hold, 4 out, 4 hold"}]',
 3);
