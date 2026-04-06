import AthleteDetail from '@/components/admin/AthleteDetail'

export default function CoachAthletePage({ params }: { params: { id: string } }) {
  return <AthleteDetail athleteId={params.id} backHref="/coach" />
}
