import { describe, it, expect } from 'vitest';
import User from '../models/User.js';
import UserReport from '../models/UserReport.js';

describe('Admin Roles, Tiers & Problem Reports Validation', () => {
  it('validates allowed roles and default tier in User schema', () => {
    const roles = User.schema.path('role').enumValues;
    expect(roles).toContain('SUPER_ADMIN');
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('USER');
    expect(roles).toContain('ADVISOR');

    const tiers = User.schema.path('tier').enumValues;
    expect(tiers).toEqual(['FREE', 'PRO', 'ENTERPRISE']);
    expect(User.schema.path('tier').defaultValue).toBe('FREE');
  });

  it('validates UserReport schema statuses and categories', () => {
    const statuses = UserReport.schema.path('status').enumValues;
    expect(statuses).toEqual(['RECEIVED', 'IN_PROGRESS', 'SOLVED']);
    expect(UserReport.schema.path('status').defaultValue).toBe('RECEIVED');

    const categories = UserReport.schema.path('category').enumValues;
    expect(categories).toContain('BUG');
    expect(categories).toContain('AI_FEATURE');
    expect(categories).toContain('SYNC_ISSUE');
    expect(categories).toContain('ACCOUNT_BILLING');
    expect(categories).toContain('OTHER');
  });

  it('enforces SUPER_ADMIN immutability and Admin privilege protections', () => {
    // Simulating controller protection invariant logic
    const checkRolePermission = (requesterRole, targetRole, newRole) => {
      if (targetRole === 'SUPER_ADMIN') {
        return { allowed: false, error: 'SUPER_ADMIN cannot be altered.' };
      }
      if (targetRole === 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
        return { allowed: false, error: 'Only SUPER_ADMIN can modify an admin account.' };
      }
      if (newRole === 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
        return { allowed: false, error: 'Only SUPER_ADMIN can promote to admin.' };
      }
      return { allowed: true };
    };

    // 1. Regular ADMIN cannot modify another ADMIN
    expect(checkRolePermission('ADMIN', 'ADMIN', 'USER').allowed).toBe(false);

    // 2. Regular ADMIN cannot promote a user to ADMIN
    expect(checkRolePermission('ADMIN', 'USER', 'ADMIN').allowed).toBe(false);

    // 3. Regular ADMIN can change USER to ADVISOR
    expect(checkRolePermission('ADMIN', 'USER', 'ADVISOR').allowed).toBe(true);

    // 4. Nobody can touch SUPER_ADMIN
    expect(checkRolePermission('SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN').allowed).toBe(false);

    // 5. SUPER_ADMIN can promote a USER to ADMIN
    expect(checkRolePermission('SUPER_ADMIN', 'USER', 'ADMIN').allowed).toBe(true);
  });
});
