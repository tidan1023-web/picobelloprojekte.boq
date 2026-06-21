export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin?: string;
  department?: string;
  about?: string;
  profilePicture?: { s3Key: string; s3Url: string } | null;
  performanceRating?: number;
  loginCount?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface EmployeeStats {
  dispatches: number;
  verifications: number;
  defects: number;
  images: number;
  products: number;
  logins: number;
}

export interface EmployeeComment {
  id: string;
  targetUserId: string;
  authorId: string;
  authorName: string;
  authorEmployeeId: string;
  comment: string;
  mentionedEmployeeIds: string[];
  createdAt: string;
}

export type ProductStatus = 'pending' | 'images_uploaded' | 'verified' | 'dispatched' | 'defective';

export type ImageViewType =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'serial_number'
  | 'packaging'
  | 'custom';

export interface ProductImage {
  _id: string;
  viewType: ImageViewType;
  label: string;
  s3Key: string;
  s3Url: string;
  uploadedBy: { name: string; employeeId: string } | string;
  uploadedAt: string;
  notes?: string;
}

export interface Product {
  _id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  specifications: Record<string, string>;
  status: ProductStatus;
  assignedTo?: { _id: string; name: string; employeeId: string; email: string } | null;
  images: ProductImage[];
  requiredViews: ImageViewType[];
  imageVerificationComplete: boolean;
  verifiedBy?: { name: string; employeeId: string } | null;
  verifiedAt?: string;
  dispatchedBy?: { name: string; employeeId: string } | null;
  dispatchedAt?: string;
  trackingNumber?: string;
  ebaySynced: boolean;
  ebaySyncedAt?: string;
  ebayItemId?: string;
  createdBy: { name: string; employeeId: string };
  createdAt: string;
  updatedAt: string;
}

export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'open' | 'acknowledged' | 'resolved';

export interface DefectImage {
  _id: string;
  s3Key: string;
  s3Url: string;
  annotationNotes?: string;
}

export interface DefectLog {
  _id: string;
  productId: { _id: string; sku: string; name: string } | string;
  productSku: string;
  severity: DefectSeverity;
  description: string;
  images: DefectImage[];
  status: DefectStatus;
  loggedBy: { name: string; employeeId: string };
  acknowledgedBy?: { name: string; employeeId: string } | null;
  acknowledgedAt?: string;
  resolvedBy?: { name: string; employeeId: string } | null;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId: string;
  employeeId: string;
  userEmail: string;
  userName: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  totalProducts: number;
  pendingProducts: number;
  imagesUploadedProducts: number;
  verifiedProducts: number;
  dispatchedProducts: number;
  defectiveProducts: number;
  openDefects: number;
  criticalDefects: number;
  totalUsers: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}
