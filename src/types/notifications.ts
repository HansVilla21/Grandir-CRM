export type NotificationType =
  | 'approval'
  | 'revision_request'
  | 'new_application'
  | 'report_due'
  | 'contract_expiring'
  | 'disbursement_due'
  | 'process_delayed'

export type NotificationChannel = 'internal' | 'email' | 'both'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string | null
  contract_id: string | null
  investor_id: string | null
  read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationGroup {
  label: string
  items: NotificationItem[]
}
