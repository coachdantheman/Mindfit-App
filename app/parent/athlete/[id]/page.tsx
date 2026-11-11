import AthleteDetail from '@/components/admin/AthleteDetail'

export default async function ParentAthletePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <AthleteDetail athleteId={params.id} backHref="/parent" backLabel="My Athletes" readOnly />
}
