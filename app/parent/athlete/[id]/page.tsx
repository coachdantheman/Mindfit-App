import AthleteDetail from '@/components/admin/AthleteDetail'

export default function ParentAthletePage({ params }: { params: { id: string } }) {
  return <AthleteDetail athleteId={params.id} backHref="/parent" backLabel="My Athletes" readOnly />
}
