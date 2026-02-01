const SUPER_ADMIN_EMAILS = [
  'isaac@mergefund.org',
]

export const isSuperAdminEmail = (email) => {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(String(email).toLowerCase())
}
