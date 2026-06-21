'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { Camera, Upload, CheckCircle, XCircle, RefreshCw, ZoomIn } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { ProductImage, ImageViewType } from '@/types';
import { productsApi, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ImageSlot {
  viewType: ImageViewType;
  label: string;
  required: boolean;
}

const DEFAULT_SLOTS: ImageSlot[] = [
  { viewType: 'front', label: 'Front', required: true },
  { viewType: 'back', label: 'Back', required: true },
  { viewType: 'left', label: 'Left Side', required: true },
  { viewType: 'right', label: 'Right Side', required: true },
  { viewType: 'serial_number', label: 'Serial Number', required: true },
  { viewType: 'top', label: 'Top / Label', required: false },
  { viewType: 'packaging', label: 'Packaging', required: false },
];

interface ImageUploaderProps {
  productId: string;
  productSku: string;
  existingImages: ProductImage[];
  requiredViews: ImageViewType[];
  onImagesUpdated: () => void;
  readOnly?: boolean;
}

function UploadSlot({
  slot,
  existingImage,
  onUpload,
  uploading,
  readOnly,
}: {
  slot: ImageSlot;
  existingImage?: ProductImage;
  onUpload: (viewType: ImageViewType, file: File) => void;
  uploading: boolean;
  readOnly?: boolean;
}) {
  const [previewModal, setPreviewModal] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) onUpload(slot.viewType, acceptedFiles[0]);
    },
    [slot.viewType, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled: readOnly || uploading,
  });

  const hasImage = !!existingImage;
  const isRequired = slot.required;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700">
            {slot.label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          {hasImage ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          ) : isRequired ? (
            <XCircle className="h-3.5 w-3.5 text-red-400" />
          ) : null}
        </div>

        {hasImage ? (
          <div className="relative group aspect-square rounded-lg overflow-hidden border-2 border-green-400 bg-slate-100">
            <Image
              src={existingImage.s3Url}
              alt={slot.label}
              fill
              className="object-cover"
              sizes="200px"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setPreviewModal(true)}
                className="p-1.5 bg-white rounded-full shadow"
                title="View full size"
              >
                <ZoomIn className="h-3.5 w-3.5 text-slate-700" />
              </button>
              {!readOnly && (
                <label className="p-1.5 bg-white rounded-full shadow cursor-pointer" title="Replace image">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-700" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(slot.viewType, f);
                    }}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            {existingImage.uploadedAt && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                <p className="text-xs text-white truncate">
                  {new Date(existingImage.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={clsx(
              'aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
              isDragActive
                ? 'border-brand-400 bg-brand-50'
                : isRequired
                ? 'border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100',
              (readOnly || uploading) && 'cursor-not-allowed opacity-60'
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="h-5 w-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera className={clsx('h-6 w-6', isRequired ? 'text-red-400' : 'text-slate-400')} />
                <div className="text-center px-2">
                  <p className="text-xs font-medium text-slate-600">
                    {isDragActive ? 'Drop here' : 'Tap to capture'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">or drag & drop</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={previewModal} onClose={() => setPreviewModal(false)} title={`${slot.label} — ${existingImage?.uploadedAt ? new Date(existingImage.uploadedAt).toLocaleString() : ''}`} size="xl">
        {existingImage && (
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <Image src={existingImage.s3Url} alt={slot.label} fill className="object-contain rounded" sizes="700px" />
          </div>
        )}
        {existingImage?.notes && (
          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
            <span className="font-medium">Notes:</span> {existingImage.notes}
          </p>
        )}
      </Modal>
    </>
  );
}

export function ImageUploader({
  productId,
  productSku,
  existingImages,
  requiredViews,
  onImagesUpdated,
  readOnly,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState<ImageViewType | null>(null);

  const slots = DEFAULT_SLOTS.filter(
    (s) => requiredViews.includes(s.viewType) || !s.required
  ).concat(
    DEFAULT_SLOTS.filter((s) => !requiredViews.includes(s.viewType) && s.required)
      .map((s) => ({ ...s, required: false }))
  );

  const allRequiredSlots = DEFAULT_SLOTS.filter((s) => requiredViews.includes(s.viewType));

  const handleUpload = async (viewType: ImageViewType, file: File) => {
    setUploading(viewType);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('viewType', viewType);
      await productsApi.uploadImage(productId, formData);
      toast.success(`${viewType.replace(/_/g, ' ')} image uploaded`);
      onImagesUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  const uploadedViewTypes = new Set(existingImages.map((img) => img.viewType));
  const completedRequired = allRequiredSlots.filter((s) => uploadedViewTypes.has(s.viewType)).length;
  const totalRequired = allRequiredSlots.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Required images: {completedRequired} / {totalRequired}
          </p>
          <div className="mt-1.5 h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                completedRequired === totalRequired ? 'bg-green-500' : 'bg-brand-600'
              )}
              style={{ width: `${(completedRequired / totalRequired) * 100}%` }}
            />
          </div>
        </div>
        {!readOnly && (
          <label className="flex items-center gap-2 text-sm font-medium text-brand-600 cursor-pointer hover:text-brand-700">
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                // Upload first unmatched required view
                const remaining = allRequiredSlots.filter((s) => !uploadedViewTypes.has(s.viewType));
                files.forEach((file, i) => {
                  if (remaining[i]) handleUpload(remaining[i].viewType, file);
                });
              }}
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allRequiredSlots.map((slot) => (
          <UploadSlot
            key={slot.viewType}
            slot={slot}
            existingImage={existingImages.find((img) => img.viewType === slot.viewType)}
            onUpload={handleUpload}
            uploading={uploading === slot.viewType}
            readOnly={readOnly}
          />
        ))}
        {DEFAULT_SLOTS.filter((s) => !requiredViews.includes(s.viewType)).map((slot) => (
          <UploadSlot
            key={slot.viewType}
            slot={{ ...slot, required: false }}
            existingImage={existingImages.find((img) => img.viewType === slot.viewType)}
            onUpload={handleUpload}
            uploading={uploading === slot.viewType}
            readOnly={readOnly}
          />
        ))}
      </div>

      {completedRequired < totalRequired && !readOnly && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <XCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Dispatch blocked</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Missing:{' '}
              {allRequiredSlots
                .filter((s) => !uploadedViewTypes.has(s.viewType))
                .map((s) => s.label)
                .join(', ')}
            </p>
          </div>
        </div>
      )}

      {completedRequired === totalRequired && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            All required images uploaded — product can be verified for dispatch
          </p>
        </div>
      )}
    </div>
  );
}
