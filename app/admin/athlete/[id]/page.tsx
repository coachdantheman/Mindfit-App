import AthleteDetail from '@/components/admin/AthleteDetail'

export default function AdminAthletePage({ params }: { params: { id: string } }) {
  return <AthleteDetail athleteId={params.id} backHref="/admin" />
}
