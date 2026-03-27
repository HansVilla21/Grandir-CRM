export interface BulletinListItem {
  id: string
  subject: string
  status: 'draft' | 'sent'
  target_group: 'all_active' | 'all_inactive' | 'by_plan' | 'custom'
  target_plan_name: string | null
  recipient_count: number
  sent_at: string | null
  created_at: string
}

export interface BulletinDetail extends BulletinListItem {
  body: string
  target_plan_id: string | null
  recipients: BulletinRecipient[]
}

export interface BulletinRecipient {
  id: string
  investor_id: string
  email: string
  delivered: boolean
  opened: boolean
  created_at: string
}

export const TARGET_GROUP_LABELS: Record<string, string> = {
  all_active: 'Todos los activos',
  all_inactive: 'Todos los inactivos',
  by_plan: 'Por plan',
  custom: 'Personalizado',
}
