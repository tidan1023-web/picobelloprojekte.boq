'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Package,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { productsApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Product, ProductStatus } from '@/types';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ProductStatusBadge, ShipReadinessBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ExportButton } from '@/components/ui/ExportButton';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'images_uploaded', label: 'Images Uploaded' },
  { value: 'verified', label: 'Verified' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'defective', label: 'Defective' },
];

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, status: statusFilter, category: categoryFilter, page }],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.getCategories,
  });

  const products: Product[] = data?.products || [];
  const pagination = data?.pagination;
  const categories: string[] = categoriesData?.categories || [];

  return (
    <>
      <Header
        title="Inventory"
        subtitle={`${pagination?.total ?? 0} products`}
        actions={
          user?.role === 'admin' && (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => router.push('/inventory/new')}
            >
              Add Product
            </Button>
          )
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex-1">
              <Input
                placeholder="Search by SKU or name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                leftAddon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as ProductStatus | ''); setPage(1); }}
              placeholder="All Statuses"
              className="sm:w-44"
            />
            <Select
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              placeholder="All Categories"
              className="sm:w-44"
            />
            <div className="flex items-center gap-2 sm:ml-auto">
              <ExportButton
                rows={products.map((p) => ({
                  SKU: p.sku,
                  Name: p.name,
                  Category: p.category,
                  Status: p.status,
                  'Assigned To': (p.assignedTo as { name: string } | null)?.name || '',
                  Images: p.images?.length ?? 0,
                  'Dispatched At': p.dispatchedAt ? format(new Date(p.dispatchedAt), 'yyyy-MM-dd') : '',
                  'Tracking #': p.trackingNumber || '',
                }))}
                columns={[
                  { header: 'SKU', key: 'SKU' },
                  { header: 'Name', key: 'Name' },
                  { header: 'Category', key: 'Category' },
                  { header: 'Status', key: 'Status' },
                  { header: 'Assigned To', key: 'Assigned To' },
                  { header: 'Images', key: 'Images' },
                  { header: 'Dispatched At', key: 'Dispatched At' },
                  { header: 'Tracking #', key: 'Tracking #' },
                ]}
                baseName="inventory"
                title="Inventory Report"
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <PageLoader />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No products found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              {search || statusFilter ? 'Try adjusting your filters' : 'Add your first product to get started'}
            </p>
            {user?.role === 'admin' && !search && !statusFilter && (
              <Button className="mt-4" size="sm" onClick={() => router.push('/inventory/new')}>
                Add Product
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Product List */}
            <div className="space-y-2">
              {products.map((product) => {
                const isReady = product.status === 'verified';
                const assignee = product.assignedTo as { name: string; employeeId: string } | null;

                return (
                  <Link
                    key={product._id}
                    href={`/inventory/${product._id}`}
                    className="block"
                  >
                    <Card
                      padding="sm"
                      className="hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{product.name}</p>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{product.sku}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{product.category}</span>
                            {assignee && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                → {assignee.name}
                              </span>
                            )}
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {product.images?.length ?? 0}/{product.requiredViews?.length ?? 5} imgs
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <ShipReadinessBadge ready={isReady} />
                          <ProductStatusBadge status={product.status} />
                          <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
