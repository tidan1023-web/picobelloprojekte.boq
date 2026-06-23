import React, { useState, useRef } from 'react';
import { Camera, Save, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ROLE_LABEL = {
  admin: 'Administrator',
  qs: 'Quantity Surveyor',
  project_manager: 'Project Manager',
  client: 'Client',
};

function PasswordSection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (form.next !== form.confirm) return setError('New passwords do not match.');
    if (form.next.length < 6) return setError('New password must be at least 6 characters.');
    setSaving(true);
    try {
      await api.patch('/auth/me/password', { currentPassword: form.current, newPassword: form.next });
      setSuccess(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-900 pr-10';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={15} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Change Password</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {['current', 'next', 'confirm'].map((k) => (
          <div key={k}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {k === 'current' ? 'Current Password' : k === 'next' ? 'New Password' : 'Confirm New Password'}
            </label>
            <div className="relative">
              <input
                type={show[k] ? 'text' : 'password'}
                required
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className={fieldCls}
                placeholder={k === 'next' ? 'Minimum 6 characters' : '••••••••'}
              />
              <button
                type="button"
                onClick={() => toggle(k)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {show[k] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            Password changed successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !form.current || !form.next || !form.confirm}
          className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60"
        >
          <Lock size={15} />
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    jobTitle: user?.jobTitle ?? '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      fd.append('jobTitle', form.jobTitle);
      if (avatarFile) fd.append('avatar', avatarFile);

      const { data } = await api.patch('/auth/me/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (setUser) setUser(data.user);
      setSuccess(true);
      setAvatarFile(null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Update your display name, photo, and contact details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-900 flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? <User size={28} />}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow hover:bg-gray-50 transition-colors"
            >
              <Camera size={14} className="text-gray-600 dark:text-gray-300" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WEBP. Max 5 MB.</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 text-xs text-primary-900 dark:text-blue-400 font-medium hover:underline"
            >
              Change photo
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job Title</label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              placeholder="e.g. Quantity Surveyor"
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+234 000 000 0000"
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
            <input
              type="text"
              value={ROLE_LABEL[user?.role] ?? user?.role ?? ''}
              disabled
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            Profile updated successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <PasswordSection />
    </div>
  );
}
