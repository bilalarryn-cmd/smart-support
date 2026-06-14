import { createAdminClient } from '@/lib/supabase/admin'
import { CannedResponsesClient } from './client'

export default async function CannedResponsesPage() {
  const supabase = createAdminClient()

  const { data: responses } = await supabase
    .from('canned_responses')
    .select('*')
    .order('category')
    .order('title')

  return <CannedResponsesClient initialResponses={responses ?? []} />
}
