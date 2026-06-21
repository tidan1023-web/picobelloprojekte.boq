'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { UserPlus, UserX, Star, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ExportButton } from '@/components/ui/ExportButton';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

export default function EmployeesPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.listUsers,
  });

  const users: (User & { isActive: boolean })[] = data?.users || [];

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const exportRows = filtered.map((u) => ({
    'Employee ID': u.employeeId,
    Name: u.name,
    Email: u.email,
    Role: u.role,
    Department: u.department || '',
    Status: u.isActive ? 'Active' : 'Inactive',
    Rating: u.performanceRating ?? 0,
    'Login Count': u.loginCount ?? 0,
    'Created': u.createdAt ? format(new Date(u.createdAt), 'yyyy-MM-dd') : '',
  }));

  const exportColumns = [
    { header: 'Employee ID', key: 'Employee ID' },
    { header: 'Name', key: 'Name' },
    { header: 'Email', key: 'Email' },
    { header: 'Role', key: 'Role' },
    { header: 'Department', key: 'Department' },
    { header: 'Status', key: 'Status' },
    { header: 'Rating', key: 'Rating' },
    { header: 'Login Count', key: 'Login Count' },
    { header: 'Created', key: 'Created' },
  ];

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    try {
      await authApi.deactivateUser(id);
      toast.success(`${name} deactivated`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCreating(true);
    try {
      await authApi.createUser({
        employeeId: (fd.get('employeeId') as string).toUpperCase().trim(),
        name: (fd.get('name') as string).trim(),
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role'),
      });
      toast.success('Employee created');
      setCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <>
        <Header title="Employees" />
        <div className="p-6">
          <p className="text-slate-500 dark:text-slate-400">Admin access required.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Employees"
        subtitle={`${users.filter((u) => u.isActive).length} active`}
        actions={
          <Button
            size="sm"
            onClick={() => setCreateModal(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Add
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Input
            placeholder="Search by name, ID or dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <ExportButton
            rows={exportRows}
            columns={exportColumns}
            baseName="employees"
            title="Employee Report"
          />
        </div>

        {isLoading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-slate-500 dark:text-slate-400">No employees found</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 sm:hidden">
              {filtered.map((u) => (
                <Link key={u.id} href={`/employees/${u.id}`}>
                  <Card padding="sm" className="hover:border-brand-300 dark:hover:border-brand-600 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white">
                          {u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.employeeId} · {u.department || u.role}</p>
                        <StarRating rating={u.performanceRating ?? 0} />
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={u.isActive ? 'green' : 'gray'}>
                          {u.isActive ? 'Active' : 'Off'}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <Card padding="none" className="hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                      {['Employee', 'Email', 'Dept / Role', 'Rating', 'Logins', 'Status', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/employees/${u.id}`} className="flex items-center gap-2.5 hover:text-brand-600 dark:hover:text-brand-400">
                            <div className="h-8 w-8 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-white">
                                {u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{u.name}</p>
                              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{u.employeeId}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {u.department || '—'}
                          <span className="ml-1">
                            <Badge variant={u.role === 'admin' ? 'purple' : 'blue'}>{u.role}</Badge>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StarRating rating={u.performanceRating ?? 0} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {u.loginCount ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.isActive ? 'green' : 'gray'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Link href={`/employees/${u.id}`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                            {u.isActive && u.id !== currentUser?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeactivate(u.id, u.name)}
                                leftIcon={<UserX className="h-3.5 w-3.5" />}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Off
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Add Employee" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="employeeId" label="Employee ID" placeholder="EMP001" required />
            <Input name="name" label="Full Name" placeholder="Jane Smith" required />
          </div>
          <Input name="email" type="email" label="Email" placeholder="jane@company.com" required />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Min 8 chars, upper + lower + number"
            required
          />
          <Select
            name="role"
            label="Role"
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'admin', label: 'Admin' },
            ]}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={creating} leftIcon={<UserPlus className="h-4 w-4" />}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
