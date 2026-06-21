'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  CheckCircle,
  Truck,
  AlertTriangle,
  ShoppingBag,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { productsApi, defectsApi, ebayApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { ProductStatusBadge, ShipReadinessBadge, SeverityBadge, DefectStatusBadge } from '@/components/ui/Badge';
import { ImageUploader } from '@/components/inventory/ImageUploader';
import { SpecsEditor } from '@/components/inventory/SpecsEditor';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { DefectLog } from '@/types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editSpecs, setEditSpecs] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [dispatchModal, setDispatchModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatching, setDispatching] = useState(false);

  const [defectModal, setDefectModal] = useState(false);
  const [defectSeverity, setDefectSeverity] = useState('medium');
  const [defectDescription, setDefectDescription] = useState('');
  const [loggingDefect, setLoggingDefect] = useState(false);

  const [ebayModal, setEbayModal] = useState(false);
  const [ebayPrice, setEbayPrice] = useState('');
  const [ebayQty, setEbayQty] = useState('1');
  const [ebayCondition, setEbayCondition] = useState('USED_EXCELLENT');
  const [syncingEbay, setSyncingEbay] = useState(false);

  const [verifying, setVerifying] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });

  const { data: defectsData, refetch: refetchDefects } = useQuery({
    queryKey: ['defects', id],
    queryFn: () => defectsApi.list({ productId: id }),
    enabled: !!id,
  });

  const product = data?.product;
  const defects: DefectLog[] = defectsData?.defects || [];

  const startEdit = () => {
    setEditSpecs(product?.specifications ? { ...product.specifications } : {});
    setEditName(product?.name || '');
    setEditCategory(product?.category || '');
    setEditDescription(product?.description || '');
    setEditMode(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await productsApi.update(id, {
        name: editName,
        category: editCategory,
        description: editDescription,
        specifications: editSpecs,
      });
      toast.success('Product updated');
      setEditMode(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await productsApi.verify(id);
      toast.success('Product verified — ready to dispatch');
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      await productsApi.dispatch(id, trackingNumber);
      toast.success('Product dispatched');
      setDispatchModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDispatching(false);
    }
  };

  const handleLogDefect = async () => {
    if (!defectDescription.trim()) {
      toast.error('Please describe the defect');
      return;
    }
    setLoggingDefect(true);
    try {
      await defectsApi.create({ productId: id, severity: defectSeverity, description: defectDescription });
      toast.success('Defect logged');
      setDefectModal(false);
      setDefectDescription('');
      refetch();
      refetchDefects();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoggingDefect(false);
    }
  };

  const handleEbaySync = async () => {
    if (!ebayPrice || isNaN(parseFloat(ebayPrice))) {
      toast.error('Enter a valid price');
      return;
    }
    setSyncingEbay(true);
    try {
      await ebayApi.syncProduct(id, {
        price: parseFloat(ebayPrice),
        quantity: parseInt(ebayQty),
        condition: ebayCondition,
      });
      toast.success('Listed on eBay');
      setEbayModal(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncingEbay(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Product Detail" />
        <div className="p-6"><PageLoader /></div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header title="Product Not Found" />
        <div className="p-6 text-center"><p className="text-slate-500">Product not found.</p></div>
      </>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isDispatched = product.status === 'dispatched';
  const canVerify = isAdmin && product.imageVerificationComplete && product.status !== 'verified' && product.status !== 'dispatched';
  const canDispatch = isAdmin && product.status === 'verified';

  return (
    <>
      <Header
        title={product.name}
        subtitle={`SKU: ${product.sku}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            {isAdmin && !isDispatched && !editMode && (
              <Button variant="outline" size="sm" onClick={startEdit} leftIcon={<Edit2 className="h-4 w-4" />}>
                Edit
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
        {/* Status Banner */}
        <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ProductStatusBadge status={product.status} />
            <ShipReadinessBadge ready={product.status === 'verified'} />
            {product.ebaySynced && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                Listed on eBay
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {canVerify && (
                <Button size="sm" variant="secondary" onClick={handleVerify} isLoading={verifying} leftIcon={<CheckCircle className="h-4 w-4" />}>
                  Verify Product
                </Button>
              )}
              {canDispatch && (
                <Button size="sm" onClick={() => setDispatchModal(true)} leftIcon={<Truck className="h-4 w-4" />}>
                  Dispatch
                </Button>
              )}
              {(product.status === 'verified' || product.status === 'dispatched') && !product.ebaySynced && (
                <Button size="sm" variant="outline" onClick={() => setEbayModal(true)} leftIcon={<ShoppingBag className="h-4 w-4" />}>
                  List on eBay
                </Button>
              )}
              {!isDispatched && (
                <Button size="sm" variant="outline" onClick={() => setDefectModal(true)} leftIcon={<AlertTriangle className="h-4 w-4" />}>
                  Log Defect
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — product info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader
                title="Product Info"
                action={
                  editMode ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} isLoading={saving} leftIcon={<Save className="h-3.5 w-3.5" />}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : undefined
                }
              />
              {editMode ? (
                <div className="space-y-3">
                  <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input label="Category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                  <Textarea label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                </div>
              ) : (
                <dl className="space-y-3">
                  {[
                    { label: 'SKU', value: product.sku },
                    { label: 'Category', value: product.category },
                    { label: 'Description', value: product.description || '—' },
                    {
                      label: 'Assigned To',
                      value: product.assignedTo
                        ? `${(product.assignedTo as { name: string; employeeId: string }).name} (${(product.assignedTo as { name: string; employeeId: string }).employeeId})`
                        : 'Unassigned',
                    },
                    { label: 'Created By', value: `${product.createdBy.name} (${product.createdBy.employeeId})` },
                    { label: 'Created', value: format(new Date(product.createdAt), 'MMM d, yyyy h:mm a') },
                    ...(product.verifiedAt ? [{ label: 'Verified', value: format(new Date(product.verifiedAt), 'MMM d, yyyy h:mm a') }] : []),
                    ...(product.dispatchedAt ? [{ label: 'Dispatched', value: format(new Date(product.dispatchedAt), 'MMM d, yyyy h:mm a') }] : []),
                    ...(product.trackingNumber ? [{ label: 'Tracking #', value: product.trackingNumber }] : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd className="text-sm text-slate-900 dark:text-white mt-0.5 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>

            <Card>
              <CardHeader title="Specifications" />
              <SpecsEditor
                specs={editMode ? editSpecs : (product.specifications as Record<string, string>) || {}}
                onChange={setEditSpecs}
                readOnly={!editMode}
              />
            </Card>

            {/* Defects */}
            {defects.length > 0 && (
              <Card>
                <CardHeader title="Defect Logs" subtitle={`${defects.length} defect${defects.length > 1 ? 's' : ''} logged`} />
                <div className="space-y-3">
                  {defects.map((defect) => (
                    <div key={defect._id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={defect.severity} />
                        <DefectStatusBadge status={defect.status} />
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{defect.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        By {defect.loggedBy.name} · {format(new Date(defect.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right column — images */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader
                title="Image Verification"
                subtitle={`${product.images?.length ?? 0} of ${product.requiredViews?.length ?? 5} required images uploaded`}
              />
              <ImageUploader
                productId={id}
                productSku={product.sku}
                existingImages={product.images || []}
                requiredViews={product.requiredViews || []}
                onImagesUpdated={refetch}
                readOnly={isDispatched}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      <Modal
        isOpen={dispatchModal}
        onClose={() => setDispatchModal(false)}
        title="Dispatch Product"
        footer={
          <>
            <Button variant="outline" onClick={() => setDispatchModal(false)}>Cancel</Button>
            <Button onClick={handleDispatch} isLoading={dispatching} leftIcon={<Truck className="h-4 w-4" />}>
              Confirm Dispatch
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              This product has been verified and is ready to ship.
            </p>
          </div>
          <Input
            label="Tracking Number (Optional)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1Z999AA1012345678"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Once dispatched, this product cannot be edited. This action is logged permanently.
          </p>
        </div>
      </Modal>

      {/* Defect Modal */}
      <Modal
        isOpen={defectModal}
        onClose={() => setDefectModal(false)}
        title="Log Defect"
        footer={
          <>
            <Button variant="outline" onClick={() => setDefectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleLogDefect} isLoading={loggingDefect} leftIcon={<AlertTriangle className="h-4 w-4" />}>
              Log Defect
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Severity"
            value={defectSeverity}
            onChange={(e) => setDefectSeverity(e.target.value)}
            options={[
              { value: 'low', label: 'Low — cosmetic issue' },
              { value: 'medium', label: 'Medium — functional concern' },
              { value: 'high', label: 'High — significant damage' },
              { value: 'critical', label: 'Critical — do not ship' },
            ]}
          />
          <Textarea
            label="Description"
            value={defectDescription}
            onChange={(e) => setDefectDescription(e.target.value)}
            placeholder="Describe the defect in detail..."
            rows={4}
            required
          />
          <p className="text-xs text-slate-500">
            High or critical defects will mark this product as defective and block dispatch.
          </p>
        </div>
      </Modal>

      {/* eBay Modal */}
      <Modal
        isOpen={ebayModal}
        onClose={() => setEbayModal(false)}
        title="List on eBay"
        footer={
          <>
            <Button variant="outline" onClick={() => setEbayModal(false)}>Cancel</Button>
            <Button onClick={handleEbaySync} isLoading={syncingEbay} leftIcon={<ShoppingBag className="h-4 w-4" />}>
              Publish Listing
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Price (USD)"
            type="number"
            step="0.01"
            min="0.01"
            value={ebayPrice}
            onChange={(e) => setEbayPrice(e.target.value)}
            placeholder="0.00"
            required
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={ebayQty}
            onChange={(e) => setEbayQty(e.target.value)}
          />
          <Select
            label="Condition"
            value={ebayCondition}
            onChange={(e) => setEbayCondition(e.target.value)}
            options={[
              { value: 'NEW', label: 'New' },
              { value: 'LIKE_NEW', label: 'Like New' },
              { value: 'USED_EXCELLENT', label: 'Used — Excellent' },
              { value: 'USED_GOOD', label: 'Used — Good' },
              { value: 'USED_ACCEPTABLE', label: 'Used — Acceptable' },
              { value: 'FOR_PARTS', label: 'For Parts' },
            ]}
          />
          <p className="text-xs text-slate-500">
            Product images and specifications will be included in the eBay listing automatically.
          </p>
        </div>
      </Modal>
    </>
  );
}
