import AthleteDetail from '@/components/admin/AthleteDetail'

export default async function CoachAthletePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <AthleteDetail athleteId={params.id} backHref="/coach" backLabel="My Athletes" />
}
