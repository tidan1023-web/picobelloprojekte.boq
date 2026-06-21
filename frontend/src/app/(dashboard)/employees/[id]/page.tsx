'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Star,
  MessageSquarePlus,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  ImageIcon,
  LogIn,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLog, EmployeeStats } from '@/types';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ExportButton } from '@/components/ui/ExportButton';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';

interface EmployeeUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department?: string;
  about?: string;
  isActive: boolean;
  performanceRating: number;
  loginCount: number;
  createdAt: string;
  lastLogin?: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              s <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [ratingModal, setRatingModal] = useState(false);
  const [commentModal, setCommentModal] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['employee', params.id],
    queryFn: () => authApi.getUserById(params.id),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats', params.id],
    queryFn: () => authApi.getUserStats(params.id),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['employee-comments', params.id],
    queryFn: () => authApi.getComments(params.id),
    enabled: currentUser?.role === 'admin',
  });

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => authApi.updatePerformanceRating(params.id, rating),
    onSuccess: () => {
      toast.success('Rating updated');
      queryClient.invalidateQueries({ queryKey: ['employee', params.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setRatingModal(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await authApi.addComment(params.id, comment);
      toast.success('Comment added');
      setComment('');
      setCommentModal(false);
      queryClient.invalidateQueries({ queryKey: ['employee-comments', params.id] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const employee: EmployeeUser = userData?.user;
  const stats: EmployeeStats = statsData?.stats;
  const recentActivity: AuditLog[] = statsData?.recentActivity || [];
  const comments = commentsData?.comments || [];

  if (userLoading) {
    return (
      <>
        <Header title="Employee" />
        <div className="p-6">
          <PageLoader />
        </div>
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <Header title="Employee" />
        <div className="p-6">
          <p className="text-slate-500 dark:text-slate-400">Employee not found.</p>
        </div>
      </>
    );
  }

  const exportRows = stats
    ? [
        {
          Name: employee.name,
          'Employee ID': employee.employeeId,
          Email: employee.email,
          Role: employee.role,
          Department: employee.department || '',
          Rating: employee.performanceRating,
          Logins: stats.logins,
          Dispatches: stats.dispatches,
          Verifications: stats.verifications,
          'Defects Logged': stats.defects,
          'Images Uploaded': stats.images,
          'Products Created': stats.products,
        },
      ]
    : [];

  const exportCols = [
    { header: 'Name', key: 'Name' },
    { header: 'Employee ID', key: 'Employee ID' },
    { header: 'Email', key: 'Email' },
    { header: 'Role', key: 'Role' },
    { header: 'Department', key: 'Department' },
    { header: 'Rating', key: 'Rating' },
    { header: 'Logins', key: 'Logins' },
    { header: 'Dispatches', key: 'Dispatches' },
    { header: 'Verifications', key: 'Verifications' },
    { header: 'Defects Logged', key: 'Defects Logged' },
    { header: 'Images Uploaded', key: 'Images Uploaded' },
    { header: 'Products Created', key: 'Products Created' },
  ];

  return (
    <>
      <Header
        title={employee.name}
        subtitle={`${employee.employeeId} · ${employee.department || employee.role}`}
        actions={
          <ExportButton
            rows={exportRows}
            columns={exportCols}
            baseName={`employee-${employee.employeeId}`}
            title={`Employee Report — ${employee.name}`}
          />
        }
      />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Back */}
        <Link
          href="/employees"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Profile */}
          <div className="space-y-5">
            <Card>
              <div className="flex flex-col items-center text-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="h-20 w-20 rounded-full bg-brand-700 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {employee.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-900 dark:text-white">{employee.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{employee.email}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Badge variant={employee.role === 'admin' ? 'purple' : 'blue'}>{employee.role}</Badge>
                    <Badge variant={employee.isActive ? 'green' : 'gray'}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${
                        s <= employee.performanceRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-2.5 text-sm">
                {[
                  { label: 'Employee ID', value: employee.employeeId },
                  { label: 'Department', value: employee.department || '—' },
                  { label: 'Login Count', value: employee.loginCount ?? 0 },
                  {
                    label: 'Last Login',
                    value: employee.lastLogin
                      ? format(new Date(employee.lastLogin), 'MMM d, yyyy')
                      : 'Never',
                  },
                  {
                    label: 'Member Since',
                    value: format(new Date(employee.createdAt), 'MMM d, yyyy'),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>

              {employee.about && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1.5">About</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{employee.about}</p>
                </div>
              )}

              {currentUser?.role === 'admin' && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    leftIcon={<Star className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setNewRating(employee.performanceRating || 0);
                      setRatingModal(true);
                    }}
                  >
                    Rate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    leftIcon={<MessageSquarePlus className="h-3.5 w-3.5" />}
                    onClick={() => setCommentModal(true)}
                  >
                    Comment
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Stats + Activity */}
          <div className="lg:col-span-2 space-y-5">
            {/* Performance Stats */}
            <Card>
              <CardHeader title="Performance Stats" subtitle="Lifetime activity metrics" />
              {statsLoading ? (
                <PageLoader />
              ) : stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatItem icon={LogIn} label="Logins" value={stats.logins} color="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" />
                  <StatItem icon={Truck} label="Dispatches" value={stats.dispatches} color="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" />
                  <StatItem icon={CheckCircle} label="Verifications" value={stats.verifications} color="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400" />
                  <StatItem icon={AlertTriangle} label="Defects Logged" value={stats.defects} color="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" />
                  <StatItem icon={ImageIcon} label="Images" value={stats.images} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" />
                  <StatItem icon={Package} label="Products Created" value={stats.products} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" />
                </div>
              ) : null}
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader title="Recent Activity" subtitle="Last 10 actions" />
              <ActivityFeed logs={recentActivity} />
            </Card>

            {/* Comments */}
            {currentUser?.role === 'admin' && (
              <Card>
                <CardHeader
                  title="Manager Comments"
                  subtitle="Notes and feedback from admins"
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<MessageSquarePlus className="h-3.5 w-3.5" />}
                      onClick={() => setCommentModal(true)}
                    >
                      Add
                    </Button>
                  }
                />
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No comments yet</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map(
                      (c: { id: string; authorName: string; authorEmployeeId: string; comment: string; createdAt: string }) => (
                        <div key={c.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {c.authorName} ({c.authorEmployeeId})
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{c.comment}</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <Modal isOpen={ratingModal} onClose={() => setRatingModal(false)} title="Update Performance Rating" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rate {employee.name}&apos;s overall performance (1–5 stars)
          </p>
          <div className="flex justify-center">
            <StarPicker value={newRating} onChange={setNewRating} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRatingModal(false)}>Cancel</Button>
            <Button
              isLoading={ratingMutation.isPending}
              onClick={() => ratingMutation.mutate(newRating)}
              disabled={!newRating}
            >
              Save Rating
            </Button>
          </div>
        </div>
      </Modal>

      {/* Comment Modal */}
      <Modal isOpen={commentModal} onClose={() => setCommentModal(false)} title="Add Comment" size="md">
        <div className="space-y-4">
          <Textarea
            label="Comment"
            placeholder="Add a note about this employee's performance or behaviour..."
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCommentModal(false)}>Cancel</Button>
            <Button
              isLoading={submittingComment}
              onClick={handleAddComment}
              disabled={!comment.trim()}
            >
              Add Comment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
