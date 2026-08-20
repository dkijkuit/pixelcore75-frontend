import type { User, Role } from '@/types/users'

export function hasRolePrefix(roles: Role[] | undefined): boolean {
  return (roles ?? []).some((r) => r.startsWith('ROLE_'))
}

export function detectBackendPrefixFromUsers(users: User[]): boolean {
  return users.some((u) => hasRolePrefix(u.roles))
}

export function toLabel(role: Role): string {
  return role.replace(/^ROLE_/, '')
}

export function toServerRole(roleOrLabel: Role): Role {
  // Your backend expects enum names (likely "USER"/"ADMIN"); strip any prefix
  return roleOrLabel.replace(/^ROLE_/, '')
}

export function buildRoleItems(
  users: User[],
  baseLabels: string[] = ['ADMIN', 'USER', 'MODERATOR'],
) {
  const backendPrefixed = detectBackendPrefixFromUsers(users)
  const val = (label: string) => (backendPrefixed ? `ROLE_${label}` : label)

  const base = baseLabels.map((label) => ({ title: label, value: val(label) }))
  const known = new Set(base.map((b) => b.value))

  users.forEach((u) =>
    (u.roles ?? []).forEach((r) => {
      if (!known.has(r)) {
        base.push({ title: toLabel(r), value: r })
        known.add(r)
      }
    }),
  )
  return { items: base, backendPrefixed }
}
