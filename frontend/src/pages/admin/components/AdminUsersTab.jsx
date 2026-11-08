import React from 'react';
import { Search, Lock, UserCheck, AlertOctagon, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminUsersTab({ 
  users = [], 
  currentUser, 
  loading, 
  onRoleChange, 
  onStatusChange, 
  onTierChange, 
  onSearch, 
  searchQuery, 
  roleFilter, 
  setRoleFilter, 
  statusFilter, 
  setStatusFilter,
  tierFilter,
  setTierFilter,
  onRefresh 
}) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const safeUsers = Array.isArray(users) ? users : [];

  const handleRoleSelect = async (userId, currentRole, newRole) => {
    if (currentRole === newRole) return;

    const result = await Swal.fire({
      title: 'Confirm Role Change',
      text: `Change this user's role to ${newRole}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update Role',
      confirmButtonColor: '#6366f1',
      background: '#1e1e24',
      color: '#ffffff'
    });

    if (result.isConfirmed) {
      await onRoleChange(userId, newRole);
    }
  };

  const handleTierSelect = async (userId, currentTier, newTier) => {
    if (currentTier === newTier) return;
    await onTierChange(userId, newTier);
  };

  const handleStatusSelect = async (userId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;

    const isDestructive = newStatus === 'BANNED' || newStatus === 'SUSPENDED';
    const result = await Swal.fire({
      title: `Set status to ${newStatus}?`,
      text: isDestructive 
        ? 'This will immediately revoke or restrict the user session and access.' 
        : 'The user will regain full access to their account.',
      icon: isDestructive ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonText: `Confirm ${newStatus}`,
      confirmButtonColor: isDestructive ? '#ef4444' : '#10b981',
      background: '#1e1e24',
      color: '#ffffff'
    });

    if (result.isConfirmed) {
      await onStatusChange(userId, newStatus);
    }
  };

  return (
    <div className="card bg-base-100 shadow-md border border-base-content/10 p-5 space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="input input-bordered input-sm pl-9 w-full text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="select select-bordered select-sm text-xs font-semibold"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="ADVISOR">Advisor</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="select select-bordered select-sm text-xs font-semibold"
          >
            <option value="">All Tiers</option>
            <option value="FREE">Free</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select select-bordered select-sm text-xs font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>

          <button onClick={onRefresh} className="btn btn-ghost btn-sm btn-square" title="Refresh">
            <RefreshCw className="w-4 h-4 text-base-content/60" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="text-base-content/50 border-b border-base-content/10">
              <th>User</th>
              <th>Role</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <span className="loading loading-spinner loading-md text-primary" />
                </td>
              </tr>
            ) : safeUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-base-content/50 text-xs">
                  No users matched your filter criteria.
                </td>
              </tr>
            ) : (
              safeUsers.map((u) => {
                const isTargetSuperAdmin = u.role === 'SUPER_ADMIN';
                const isTargetAdmin = u.role === 'ADMIN';
                const isProtectedFromRequester = isTargetSuperAdmin || (isTargetAdmin && !isSuperAdmin);

                return (
                  <tr key={u._id} className="hover:bg-base-200/50">
                    <td>
                      <div className="font-bold text-xs">{u.name}</div>
                      <div className="text-[11px] text-base-content/50">{u.email}</div>
                    </td>

                    {/* Role Column */}
                    <td>
                      {isProtectedFromRequester ? (
                        <span className={`badge badge-sm text-[10px] font-bold gap-1 ${isTargetSuperAdmin ? 'badge-primary text-white' : 'badge-neutral'}`}>
                          <Lock className="w-2.5 h-2.5" /> {u.role}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleSelect(u._id, u.role, e.target.value)}
                          className="select select-bordered select-xs text-[11px] font-semibold"
                        >
                          <option value="USER">USER</option>
                          <option value="ADVISOR">ADVISOR</option>
                          {isSuperAdmin && <option value="ADMIN">ADMIN</option>}
                        </select>
                      )}
                    </td>

                    {/* Tier Column */}
                    <td>
                      <select
                        value={u.tier || 'FREE'}
                        disabled={isTargetSuperAdmin}
                        onChange={(e) => handleTierSelect(u._id, u.tier || 'FREE', e.target.value)}
                        className={`select select-bordered select-xs text-[11px] font-bold ${
                          u.tier === 'ENTERPRISE' ? 'text-secondary' : u.tier === 'PRO' ? 'text-primary' : 'text-base-content/70'
                        }`}
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </td>

                    {/* Status Column */}
                    <td>
                      <span className={`badge badge-sm text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'badge-success text-white' : u.status === 'SUSPENDED' ? 'badge-warning' : 'badge-error'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="text-[11px] text-base-content/50">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions Column */}
                    <td>
                      {isProtectedFromRequester ? (
                        <span className="text-[10px] text-base-content/40 italic flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {u.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusSelect(u._id, u.status, 'ACTIVE')}
                              className="btn btn-ghost btn-xs text-success"
                              title="Activate User"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {u.status !== 'SUSPENDED' && (
                            <button
                              onClick={() => handleStatusSelect(u._id, u.status, 'SUSPENDED')}
                              className="btn btn-ghost btn-xs text-warning"
                              title="Suspend User"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {u.status !== 'BANNED' && (
                            <button
                              onClick={() => handleStatusSelect(u._id, u.status, 'BANNED')}
                              className="btn btn-ghost btn-xs text-error"
                              title="Ban User"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
