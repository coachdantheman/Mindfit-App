import { EXERCISE_LIBRARY_SEED } from '../lib/data/exercise-library'

function str(v: string): string {
  return `'${v.replace(/'/g, "''")}'`
}

function arr(v: string[]): string {
  return v.length === 0 ? "'{}'::text[]" : `ARRAY[${v.map(str).join(', ')}]`
}

const values = EXERCISE_LIBRARY_SEED.map(e =>
  `(${[
    str(e.slug),
    str(e.name),
    arr(e.aliases),
    str(e.muscle_group),
    str(e.equipment),
    str(e.measure),
    e.standard_key ? str(e.standard_key) : 'NULL',
    "'curated'",
  ].join(', ')})`
)

process.stdout.write(
  'INSERT INTO public.exercise_library (slug, name, aliases, muscle_group, equipment, measure, standard_key, source)\n' +
    'VALUES\n' +
    values.join(',\n') +
    '\nON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, aliases=EXCLUDED.aliases, muscle_group=EXCLUDED.muscle_group, equipment=EXCLUDED.equipment, measure=EXCLUDED.measure, standard_key=EXCLUDED.standard_key;\n'
)
