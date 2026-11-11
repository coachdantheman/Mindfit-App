import AthleteDetail from '@/components/admin/AthleteDetail'

export default async function AdminAthletePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <AthleteDetail athleteId={params.id} backHref="/admin?tab=athletes" backLabel="Athletes" />
}
