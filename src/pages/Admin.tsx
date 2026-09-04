import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  Check,
  AlertTriangle,
  Calendar,
  FileText,
  CheckSquare,
  Wrench,
  Clock,
  ArrowLeft,
  Award,
  Sparkles,
  RefreshCw,
  Mail,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitialSeedForUser } from '../utils/seedData';
import { NavTab } from '../components/layout/Sidebar';

export interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  status: 'Active' | 'Pending' | 'Suspended';
  createdAt: string;
  role?: string;
  isDemo?: boolean;
}

interface UserCounts {
  documentsCount: number;
  problemsCount: number;
  actionsCount: number;
  deadlinesCount: number;
  opportunitiesCount: number;
}

interface AdminProps {
  onNavigate?: (tab: NavTab) => void;
  onExitAdmin?: () => void;
}

const STORAGE_KEY_ADMIN_USERS = 'lifeos_admin_users_list';
const ADMIN_API_TOKEN = 'lifeos-secure-admin-token-2026';

export const Admin: React.FC<AdminProps> = ({ onNavigate, onExitAdmin }) => {
  const { user: currentAuthUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Create Form states
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Pending' | 'Suspended'>('Active');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form states
  const [editName, setEditName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Pending' | 'Suspended'>('Active');
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch real registered users from secure server Admin API
  const fetchUsers = async () => {
    setIsLoading(true);
    setStorageError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${ADMIN_API_TOKEN}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        try {
          localStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(data.users));
        } catch {
          // ignore local cache errors
        }
      }
    } catch (err: any) {
      console.warn('[Admin] Server users fetch notice:', err.message);
      // Fallback to local storage cache if server request encounters transient offline issue
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ADMIN_USERS);
        if (stored) {
          setUsers(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
      setStorageError('Could not sync live users from backend: ' + (err.message || 'Network error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Helper to get actual storage counts for a user
  const getUserCounts = (targetUid: string, targetName: string): UserCounts => {
    try {
      const vaultRaw = localStorage.getItem(`lifeos_vault_${targetUid}`);
      const problemsRaw = localStorage.getItem(`lifeos_problems_${targetUid}`);
      const actionsRaw = localStorage.getItem(`lifeos_actions_${targetUid}`);
      const deadlinesRaw = localStorage.getItem(`lifeos_deadlines_${targetUid}`);
      const oppsRaw = localStorage.getItem(`lifeos_opportunities_${targetUid}`);

      // If user is Sridev or Alex and local storage hasn't been written to yet, fallback to seed
      const seed = getInitialSeedForUser(targetUid, '', targetName);

      const parseLen = (raw: string | null, fallbackLen: number) => {
        if (!raw) return fallbackLen;
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.length : fallbackLen;
        } catch {
          return fallbackLen;
        }
      };

      const documentsCount = parseLen(vaultRaw, seed?.vault?.length || 0);
      const problemsCount = parseLen(problemsRaw, seed?.problems?.length || 0);
      const actionsCount = parseLen(actionsRaw, seed?.actions?.length || 0);
      const deadlinesCount = parseLen(deadlinesRaw, seed?.deadlines?.length || 0);
      const opportunitiesCount = parseLen(oppsRaw, seed?.opportunities?.length || 0);

      return {
        documentsCount,
        problemsCount,
        actionsCount,
        deadlinesCount,
        opportunitiesCount
      };
    } catch {
      return {
        documentsCount: 0,
        problemsCount: 0,
        actionsCount: 0,
        deadlinesCount: 0,
        opportunitiesCount: 0
      };
    }
  };

  // Helper to get non-sensitive item names for a user
  const getUserItemSummaries = (targetUid: string, targetName: string) => {
    try {
      const vaultRaw = localStorage.getItem(`lifeos_vault_${targetUid}`);
      const problemsRaw = localStorage.getItem(`lifeos_problems_${targetUid}`);
      const deadlinesRaw = localStorage.getItem(`lifeos_deadlines_${targetUid}`);

      const seed = getInitialSeedForUser(targetUid, '', targetName);

      const parseList = (raw: string | null, fallbackList: any[] = []) => {
        if (!raw) return fallbackList;
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : fallbackList;
        } catch {
          return fallbackList;
        }
      };

      const vaultItems: any[] = parseList(vaultRaw, seed?.vault || []);
      const problemsList: any[] = parseList(problemsRaw, seed?.problems || []);
      const deadlinesList: any[] = parseList(deadlinesRaw, seed?.deadlines || []);

      return {
        documents: vaultItems.map(item => ({
          title: item.title,
          category: item.category,
          status: item.status || 'verified'
        })),
        problems: problemsList.map(item => ({
          title: item.title,
          category: item.category,
          status: item.status || 'Active'
        })),
        deadlines: deadlinesList.map(item => ({
          title: item.title,
          dueDate: item.dueDate,
          status: item.status || 'Pending'
        }))
      };
    } catch {
      return { documents: [], problems: [], deadlines: [] };
    }
  };

  // Filtered users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const queryLower = searchQuery.toLowerCase().trim();
    return users.filter(
      u =>
        u.displayName.toLowerCase().includes(queryLower) ||
        (u.email && u.email.toLowerCase().includes(queryLower)) ||
        u.uid.toLowerCase().includes(queryLower) ||
        u.status.toLowerCase().includes(queryLower)
    );
  }, [users, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormStatus('Active');
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Submit Real Firebase User Creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Client-side Validations
    if (!formName.trim()) {
      setFormError('Please enter the user\'s full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      setFormError('Please enter a valid email address (e.g. user@gmail.com).');
      return;
    }

    if (!formPassword || formPassword.length < 6) {
      setFormError('Password must be at least 6 characters long as required by Firebase Authentication.');
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_API_TOKEN}`
        },
        body: JSON.stringify({
          displayName: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          status: formStatus
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account in Firebase Authentication.');
      }

      const newUser: AdminUser = data.user;

      // Seed initial starting items for the new real user
      const initialSeed = getInitialSeedForUser(newUser.uid, newUser.email, newUser.displayName);
      try {
        localStorage.setItem(`lifeos_vault_${newUser.uid}`, JSON.stringify(initialSeed.vault));
        localStorage.setItem(`lifeos_problems_${newUser.uid}`, JSON.stringify(initialSeed.problems));
        localStorage.setItem(`lifeos_actions_${newUser.uid}`, JSON.stringify(initialSeed.actions));
        localStorage.setItem(`lifeos_deadlines_${newUser.uid}`, JSON.stringify(initialSeed.deadlines));
        localStorage.setItem(`lifeos_opportunities_${newUser.uid}`, JSON.stringify(initialSeed.opportunities));
      } catch (err) {
        console.warn('Initial seed storage notice:', err);
      }

      // Close modal and refresh list
      setIsCreateOpen(false);
      setSuccessBanner(`Real Firebase user "${newUser.displayName}" (${newUser.email}) created successfully. Firebase UID: ${newUser.uid}`);
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while creating the account.');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditName(user.displayName);
    setEditStatus(user.status);
    setEditError(null);
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      setEditError('User name cannot be empty.');
      return;
    }

    setIsEditing(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/users/${editingUser.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_API_TOKEN}`
        },
        body: JSON.stringify({
          displayName: editName.trim(),
          status: editStatus
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user details.');
      }

      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, displayName: editName.trim(), status: editStatus } : u));
      if (viewingUser && viewingUser.uid === editingUser.uid) {
        setViewingUser(prev => prev ? { ...prev, displayName: editName.trim(), status: editStatus } : null);
      }

      setEditingUser(null);
      setSuccessBanner(`User details updated for "${editName.trim()}".`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user.');
    } finally {
      setIsEditing(false);
    }
  };

  // Confirm Real Firebase Account Deletion
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const targetUid = userToDelete.uid;
    const targetName = userToDelete.displayName;
    const targetEmail = userToDelete.email;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/users/${targetUid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ADMIN_API_TOKEN}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user account from Firebase.');
      }

      // Remove from state immediately
      setUsers(prev => prev.filter(u => u.uid !== targetUid));

      // Remove user storage namespaces cleanly
      try {
        localStorage.removeItem(`lifeos_vault_${targetUid}`);
        localStorage.removeItem(`lifeos_problems_${targetUid}`);
        localStorage.removeItem(`lifeos_actions_${targetUid}`);
        localStorage.removeItem(`lifeos_deadlines_${targetUid}`);
        localStorage.removeItem(`lifeos_opportunities_${targetUid}`);
        localStorage.removeItem(`lifeos_notifications_${targetUid}`);
        localStorage.removeItem(`lifeos_copilot_${targetUid}`);
      } catch (e) {
        console.warn('Storage cleanup warning:', e);
      }

      if (viewingUser && viewingUser.uid === targetUid) {
        setViewingUser(null);
      }

      setUserToDelete(null);
      setSuccessBanner(`User "${targetName}" (${targetEmail || targetUid}) and their Firebase Authentication account were permanently deleted.`);
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                ADMIN DEMO
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Firebase Production Administration Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              User Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Demo Operator: <span className="font-semibold text-slate-700 dark:text-slate-200">Admin Demo</span> • Manage real Firebase Authentication accounts with server-side security.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onExitAdmin ? (
              <button
                type="button"
                onClick={onExitAdmin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            ) : onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Real User List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successBanner && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-xs cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Storage / Network Alert Banner */}
        {storageError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{storageError}</span>
            </div>
            <button
              type="button"
              onClick={() => setStorageError(null)}
              className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-xs cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Aggregate Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Users</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{users.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Active Accounts</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {users.filter(u => u.status === 'Active').length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Pending Review</span>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {users.filter(u => u.status === 'Pending').length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Suspended</span>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {users.filter(u => u.status === 'Suspended').length}
            </div>
          </div>
        </div>
      </div>

      {/* Search and User List Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, ID, or status..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredUsers.length}</span> of {users.length} users
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Firebase UID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-4 text-center">Problems</th>
                <th className="py-3 px-4 text-center">Actions</th>
                <th className="py-3 px-4 text-center">Deadlines</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Loading real Firebase users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Users className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {searchQuery ? `No users found matching "${searchQuery}".` : 'No registered users found.'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Click "Create User" to create a real Firebase Authentication account.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const counts = getUserCounts(u.uid, u.displayName);
                  return (
                    <tr
                      key={u.uid}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/10 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs uppercase">
                            {u.displayName.slice(0, 1)}
                          </div>
                          <div>
                            <div>{u.displayName}</div>
                            <div className="text-[11px] text-slate-500 font-mono font-normal">
                              {u.email || (u.isDemo ? `${u.displayName.toLowerCase().replace(/\s+/g, '.')}@lifeos.internal` : '—')}
                            </div>
                            {u.role && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                {u.role}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* User ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[140px] truncate" title={u.uid}>
                        {u.uid}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            u.status === 'Active'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : u.status === 'Pending'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* Documents count */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {counts.documentsCount}
                      </td>

                      {/* Problems count */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {counts.problemsCount}
                      </td>

                      {/* Actions count */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {counts.actionsCount}
                      </td>

                      {/* Deadlines count */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {counts.deadlinesCount}
                      </td>

                      {/* Created date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            title="View User Overview"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            title="Delete User"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Firebase User</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Creates a real Firebase Authentication account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isCreating && setIsCreateOpen(false)}
                disabled={isCreating}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  User Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isCreating}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail / Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    disabled={isCreating}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. jordan.miller@example.com"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    disabled={isCreating}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">User will use this email and password to log in directly.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={formStatus}
                  disabled={isCreating}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-75"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating in Firebase...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW USER OVERVIEW MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center uppercase">
                  {viewingUser.displayName.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {viewingUser.displayName}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        viewingUser.status === 'Active'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : viewingUser.status === 'Pending'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {viewingUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Email: <span className="font-mono text-slate-700 dark:text-slate-300">{viewingUser.email || '—'}</span>
                  </p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    UID: {viewingUser.uid} • Created {formatDate(viewingUser.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Counts Grid */}
            {(() => {
              const counts = getUserCounts(viewingUser.uid, viewingUser.displayName);
              const summaries = getUserItemSummaries(viewingUser.uid, viewingUser.displayName);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-center">
                      <FileText className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900 dark:text-white">{counts.documentsCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Documents</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-center">
                      <Wrench className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900 dark:text-white">{counts.problemsCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Problems</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-center">
                      <CheckSquare className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900 dark:text-white">{counts.actionsCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Actions</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-center">
                      <Clock className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900 dark:text-white">{counts.deadlinesCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Deadlines</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 text-center">
                      <Award className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <div className="text-base font-bold text-slate-900 dark:text-white">{counts.opportunitiesCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Opportunities</div>
                    </div>
                  </div>

                  {/* Summary Breakdown Lists */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      User Assets & Activity Preview
                    </h4>

                    {/* Documents */}
                    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                        <span>Vault Documents ({summaries.documents.length})</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Content masked for privacy</span>
                      </div>
                      {summaries.documents.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">No documents registered.</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {summaries.documents.map((d, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                            >
                              {d.title} ({d.category})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Problems */}
                    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                        Active Problems & Inquiries ({summaries.problems.length})
                      </div>
                      {summaries.problems.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">No problems logged.</div>
                      ) : (
                        <div className="space-y-1">
                          {summaries.problems.map((p, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                            >
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{p.title}</span>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase">{p.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const toDelete = viewingUser;
                  setViewingUser(null);
                  setUserToDelete(toDelete);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete User</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(viewingUser);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit User</h3>
                  <p className="text-[11px] font-mono text-slate-400">{editingUser.uid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isEditing && setEditingUser(null)}
                disabled={isEditing}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  User Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  disabled={isEditing}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isEditing}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-75"
                >
                  {isEditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111726] border border-rose-200 dark:border-rose-900/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete this user permanently?
                </h3>
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  This action permanently deletes their Firebase Authentication account.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{userToDelete.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 font-mono text-[11px]">{userToDelete.email || '—'}</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-500">Firebase UID:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={userToDelete.uid}>{userToDelete.uid}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Warning: Once deleted, this account cannot log in with their email and password anymore. All associated permissions will be revoked.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => !isDeleting && setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-75"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete User Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
