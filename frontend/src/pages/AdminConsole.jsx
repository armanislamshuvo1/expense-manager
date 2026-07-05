import React, { useEffect, useState } from 'react';
import { useAxiosSecure } from '../hooks/useApi';
import { BottomNav } from '../components/BottomNav';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminConsole() {
  const [users, setUsers] = useState([]);
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await axiosSecure.get('/api/admin/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const response = await axiosSecure.put(`/api/admin/users/${id}/status`, { status });
      if (response.data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-base-300 pb-24 text-base-content font-sans">
      <div className="bg-base-200 p-6 rounded-b-3xl shadow-lg border-b border-base-200 flex items-center gap-4">
        <button onClick={() => navigate('/more')} className="btn btn-ghost btn-circle btn-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-error flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Admin Portal
          </h1>
          <p className="text-[10px] opacity-60">Zero-Trust Account Control Management</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <h2 className="card-title text-sm font-bold opacity-75 mb-4">Manage User Accounts</h2>
            <div className="divide-y divide-base-200">
              {users.map((u) => (
                <div key={u._id} className="flex justify-between items-center py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{u.name}</span>
                    <span className="text-[10px] opacity-50">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'badge-primary' : 'badge-error'
                    }`}>
                      {u.status}
                    </span>
                    <select
                      value={u.status}
                      onChange={(e) => handleStatusChange(u._id, e.target.value)}
                      className="select select-xs select-bordered font-semibold text-[10px]"
                    >
                      <option value="ACTIVE">Activate</option>
                      <option value="SUSPENDED">Suspend</option>
                      <option value="BANNED">Ban</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
