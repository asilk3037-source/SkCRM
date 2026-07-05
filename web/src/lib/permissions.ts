import type { OrgRole } from '../types/database'

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'manageTeam' | 'manage'
export type Screen = 'contacts' | 'companies' | 'deals' | 'tasks' | 'tickets' | 'team' | 'companyUsers'

const ALL_ROLES: OrgRole[] = ['admin', 'supervisor', 'suporte']

/**
 * Central permission matrix for the three existing org roles.
 *
 * Delete on contacts/companies/deals/tasks/tickets is enforced twice: here
 * (hides the button) and in Postgres RLS (`org_member_delete` policies —
 * rejects the request even if someone calls the API directly). Everything
 * else in this matrix is UI-level only.
 */
const MATRIX: Record<Screen, Partial<Record<Action, OrgRole[]>>> = {
  contacts: {
    view: ALL_ROLES,
    create: ALL_ROLES,
    edit: ALL_ROLES,
    delete: ['admin', 'supervisor'],
    export: ALL_ROLES,
    import: ALL_ROLES,
  },
  companies: {
    view: ALL_ROLES,
    create: ALL_ROLES,
    edit: ALL_ROLES,
    delete: ['admin', 'supervisor'],
    export: ALL_ROLES,
  },
  deals: {
    view: ALL_ROLES,
    create: ALL_ROLES,
    edit: ALL_ROLES,
    delete: ['admin', 'supervisor'],
  },
  tasks: {
    view: ALL_ROLES,
    create: ALL_ROLES,
    edit: ALL_ROLES,
    delete: ['admin', 'supervisor'],
  },
  tickets: {
    view: ALL_ROLES,
    create: ALL_ROLES,
    edit: ALL_ROLES,
    delete: ['admin', 'supervisor'],
    export: ALL_ROLES,
    // Resolver a matriz de decisão (mandar para Backlog ou encaminhar para um técnico) é do supervisor.
    manage: ['admin', 'supervisor'],
  },
  team: {
    view: ALL_ROLES,
    manageTeam: ['admin'],
  },
  companyUsers: {
    view: ALL_ROLES,
    manage: ['admin', 'supervisor'],
  },
}

/** Returns whether a given org role can perform `action` on `screen`. Unlisted actions default to allowed. */
export function can(role: OrgRole | null | undefined, screen: Screen, action: Action): boolean {
  if (!role) return false
  const allowed = MATRIX[screen]?.[action]
  return allowed ? allowed.includes(role) : true
}
