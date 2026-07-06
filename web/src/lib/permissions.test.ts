import { describe, expect, it } from 'vitest'
import { can } from './permissions'

describe('can', () => {
  it('denies every action when role is null or undefined', () => {
    expect(can(null, 'contacts', 'view')).toBe(false)
    expect(can(undefined, 'tickets', 'view')).toBe(false)
  })

  it('allows suporte to view/create/edit but not delete contacts, companies, deals, tasks, tickets', () => {
    for (const screen of ['contacts', 'companies', 'deals', 'tasks', 'tickets'] as const) {
      expect(can('suporte', screen, 'view')).toBe(true)
      expect(can('suporte', screen, 'create')).toBe(true)
      expect(can('suporte', screen, 'edit')).toBe(true)
      expect(can('suporte', screen, 'delete')).toBe(false)
    }
  })

  it('allows supervisor to delete contacts, companies, deals, tasks, tickets', () => {
    for (const screen of ['contacts', 'companies', 'deals', 'tasks', 'tickets'] as const) {
      expect(can('supervisor', screen, 'delete')).toBe(true)
    }
  })

  it('allows admin to delete contacts, companies, deals, tasks, tickets', () => {
    for (const screen of ['contacts', 'companies', 'deals', 'tasks', 'tickets'] as const) {
      expect(can('admin', screen, 'delete')).toBe(true)
    }
  })

  it('only lets admin manage the team', () => {
    expect(can('admin', 'team', 'manageTeam')).toBe(true)
    expect(can('supervisor', 'team', 'manageTeam')).toBe(false)
    expect(can('suporte', 'team', 'manageTeam')).toBe(false)
  })

  it('lets admin and supervisor manage company portal users, but not suporte', () => {
    expect(can('admin', 'companyUsers', 'manage')).toBe(true)
    expect(can('supervisor', 'companyUsers', 'manage')).toBe(true)
    expect(can('suporte', 'companyUsers', 'manage')).toBe(false)
  })

  it('lets admin and supervisor resolve the tickets decision matrix, but not suporte', () => {
    expect(can('admin', 'tickets', 'manage')).toBe(true)
    expect(can('supervisor', 'tickets', 'manage')).toBe(true)
    expect(can('suporte', 'tickets', 'manage')).toBe(false)
  })

  it('defaults unlisted actions to allowed for any known role', () => {
    // 'export' on tasks has no explicit entry in the matrix.
    expect(can('suporte', 'tasks', 'export')).toBe(true)
    expect(can('admin', 'tasks', 'export')).toBe(true)
  })
})
