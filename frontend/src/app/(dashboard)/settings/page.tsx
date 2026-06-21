'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Moon, Save, Trash2, Download, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

export default function SettingsPage() {
  const { user, login } = useAuth() as {
    user: {
      id: string;
      name: string;
      email: string;
      employeeId: string;
      role: string;
      department?: string;
      about?: string;
    } | null;
    login: (email: string, password: string) => Promise<void>;
  };
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [about, setAbout] = useState(user?.about || '');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    staleTime: 60_000,
  });

  const me = meData || user;

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      await authApi.updateProfile({ name, department, about });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      toast.success('Password changed');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await authApi.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data export downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm !== 'DELETE MY ACCOUNT') {
      toast.error('Type the confirmation phrase exactly');
      return;
    }
    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePw);
      toast.success('Account deleted');
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <>
      <Header title="Settings" subtitle="Account & preferences" />

      <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" subtitle="Update your personal information" />
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="h-16 w-16 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-white">
                  {me?.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{me?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{me?.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {me?.employeeId} · {me?.role}
                </p>
              </div>
            </div>

            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="Department"
              placeholder="e.g. Warehouse Operations"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <Textarea
              label="About"
              placeholder="Brief bio or notes..."
              rows={3}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleProfileSave}
                isLoading={profileSaving}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Profile
              </Button>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader title="Password" subtitle="Change your login password" />
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              hint="Min 8 chars, upper + lower + number"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={pwSaving} leftIcon={<Lock className="h-4 w-4" />}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader title="Appearance" subtitle="Customise how the app looks" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {theme === 'dark' ? 'Dark theme active' : 'Light theme active'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                theme === 'dark' ? 'bg-brand-600' : 'bg-slate-200'
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader title="Account Info" subtitle="Read-only account details" />
          <div className="space-y-3">
            {[
              { label: 'Employee ID', value: me?.employeeId },
              { label: 'Email', value: me?.email },
              { label: 'Role', value: me?.role },
              { label: 'Login Count', value: (meData as { loginCount?: number })?.loginCount ?? '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader
            title="Privacy & Data"
            subtitle="Download or permanently delete your account data"
          />
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Export my data</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Download a JSON file containing your profile, activity history, and manager
                  notes.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Export
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Permanently removes your account and all personal data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action is permanent and cannot be reversed.
                </p>
              </div>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <Input
                label="Your password"
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type{' '}
                  <span className="font-mono text-red-600 dark:text-red-400">DELETE MY ACCOUNT</span>{' '}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE MY ACCOUNT"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePw('');
                    setDeleteConfirm('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
                  isLoading={deleting}
                  disabled={deleteConfirm !== 'DELETE MY ACCOUNT' || !deletePw}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
