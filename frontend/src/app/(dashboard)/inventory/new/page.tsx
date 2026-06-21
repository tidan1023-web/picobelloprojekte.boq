'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, authApi, getErrorMessage } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { SpecsEditor } from '@/components/inventory/SpecsEditor';

const REQUIRED_VIEWS_OPTIONS = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left Side' },
  { value: 'right', label: 'Right Side' },
  { value: 'serial_number', label: 'Serial Number' },
  { value: 'top', label: 'Top' },
  { value: 'packaging', label: 'Packaging' },
];

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [requiredViews, setRequiredViews] = useState<string[]>([
    'front', 'back', 'left', 'right', 'serial_number',
  ]);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.listUsers,
  });

  const users = usersData?.users || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setIsLoading(true);
    try {
      const payload = {
        sku: (data.get('sku') as string).toUpperCase().trim(),
        name: (data.get('name') as string).trim(),
        category: (data.get('category') as string).trim(),
        description: (data.get('description') as string).trim(),
        assignedTo: data.get('assignedTo') || undefined,
        specifications: specs,
        requiredViews,
      };

      const result = await productsApi.create(payload);
      toast.success('Product created successfully');
      router.push(`/inventory/${result.product._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRequiredView = (view: string) => {
    setRequiredViews((prev) =>
      prev.includes(view) ? prev.filter((v) => v !== view) : [...prev, view]
    );
  };

  return (
    <>
      <Header
        title="Add Product"
        subtitle="Create a new inventory item"
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        }
      />

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader title="Product Information" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="sku"
                  label="SKU"
                  placeholder="e.g. MED-DEV-001"
                  required
                  hint="Unique identifier — letters, numbers, hyphens"
                />
                <Input name="name" label="Product Name" placeholder="e.g. Cardiac Monitor" required />
              </div>
              <Input name="category" label="Category" placeholder="e.g. Medical Devices" required />
              <Textarea
                name="description"
                label="Description"
                placeholder="Product description, model details, intended use..."
                rows={3}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Assignment" subtitle="Assign this product to a staff member" />
            <Select
              name="assignedTo"
              label="Assigned To"
              placeholder="Select employee (optional)"
              options={users
                .filter((u: { isActive: boolean }) => u.isActive)
                .map((u: { _id: string; name: string; employeeId: string }) => ({
                  value: u._id,
                  label: `${u.name} (${u.employeeId})`,
                }))}
            />
          </Card>

          <Card>
            <CardHeader
              title="Required Image Views"
              subtitle="Select which image angles are mandatory before dispatch"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REQUIRED_VIEWS_OPTIONS.map((opt) => {
                const selected = requiredViews.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleRequiredView(opt.value)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      selected
                        ? 'bg-brand-700 text-white border-brand-700'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-brand-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              {requiredViews.length} views required. Dispatch is blocked until all are uploaded.
            </p>
          </Card>

          <Card>
            <CardHeader title="Specifications" subtitle="Add technical specs as key-value pairs" />
            <SpecsEditor specs={specs} onChange={setSpecs} />
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
