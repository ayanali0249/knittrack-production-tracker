import { UserRole, OrderStatus, StageStatus, RiskLevel } from '@prisma/client';
import { Request } from 'express';

// Re-export Prisma enums for convenience
export { UserRole, OrderStatus, StageStatus, RiskLevel };

// Authenticated user payload stored in JWT
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  productionUnitId?: string | null;
  buyerId?: string | null;
}

// Extend Express Request with authenticated user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Delay calculation types
export interface StageDelayAnalysis {
  stageId: string;
  stageName: string;
  sequence: number;
  plannedQuantity: number;
  completedQuantity: number;
  remainingQuantity: number;
  daysElapsed: number;
  actualDailyRate: number;
  remainingBusinessDays: number;
  requiredDailyRate: number;
  estimatedCompletionDays: number;
  projectedCompletionDate: Date | null;
  projectedDelayDays: number;
  riskLevel: RiskLevel;
  explanation: string;
  status: StageStatus;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
}

export interface OrderDelayAnalysis {
  orderId: string;
  poNumber: string;
  overallRiskLevel: RiskLevel;
  exFactoryDate: Date;
  stages: StageDelayAnalysis[];
  summary: string;
  currentStage: string | null;
  projectedOrderDelay: number; // max delay across stages
}

// AI classification types
export interface AIClassificationResult {
  category: string | null;
  confidence: number | null;
  error?: string;
  fallbackMode?: boolean;
}

export type AICategory =
  | 'Machine breakdown'
  | 'Labour shortage'
  | 'Material shortage'
  | 'Quality issue'
  | 'Power outage'
  | 'Supplier delay'
  | 'Weather disruption'
  | 'Other';

// Dashboard types
export interface DashboardSummary {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  onTrackCount: number;
  atRiskCount: number;
  delayedCount: number;
  ordersByStatus: Record<string, number>;
  ordersByRisk: Record<string, number>;
  upcomingDeadlines: Array<{
    orderId: string;
    poNumber: string;
    exFactoryDate: Date;
    riskLevel: RiskLevel;
    daysUntilDeadline: number;
  }>;
  recentUpdates: Array<{
    id: string;
    date: Date;
    quantity: number;
    stageName: string;
    poNumber: string;
    supervisorName: string;
  }>;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Order creation input
export interface CreateOrderInput {
  poNumber: string;
  buyerId: string;
  styleName: string;
  description?: string;
  colour: string;
  sizes: Record<string, number>;
  totalQuantity: number;
  productionUnitId: string;
  exFactoryDate: string;
  stages: Array<{
    stageName: string;
    sequence: number;
    plannedStartDate: string;
    plannedEndDate: string;
    plannedQuantity: number;
  }>;
}

// Production update input
export interface CreateProductionUpdateInput {
  orderStageId: string;
  date: string;
  quantity: number;
  note?: string;
}
