import { FOODS_SEED } from '../lib/data/foods-seed'

function str(v: string): string {
  return `'${v.replace(/'/g, "''")}'`
}

function num(v: number | undefined): string {
  return v == null ? 'NULL' : String(v)
}

const values = FOODS_SEED.map(f =>
  `(${[
    str(f.slug),
    str(f.name),
    f.brand ? str(f.brand) : 'NULL',
    str(f.category),
    str(f.serving_size),
    num(f.serving_grams),
    String(f.calories),
    String(f.protein_g),
    String(f.carbs_g),
    String(f.fat_g),
    "'curated'",
  ].join(', ')})`
)

process.stdout.write(
  'INSERT INTO public.foods (slug, name, brand, category, serving_size, serving_grams, calories, protein_g, carbs_g, fat_g, source)\n' +
    'VALUES\n' +
    values.join(',\n') +
    '\nON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, brand=EXCLUDED.brand, category=EXCLUDED.category, serving_size=EXCLUDED.serving_size, serving_grams=EXCLUDED.serving_grams, calories=EXCLUDED.calories, protein_g=EXCLUDED.protein_g, carbs_g=EXCLUDED.carbs_g, fat_g=EXCLUDED.fat_g;\n'
)
