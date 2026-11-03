export type UserRole = 'ADMIN' | 'MERCHANDISER' | 'SUPERVISOR' | 'BUYER';
export type OrderStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type StageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
export type RiskLevel = 'ON_TRACK' | 'AT_RISK' | 'DELAYED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  productionUnitId?: string | null;
  buyerId?: string | null;
  productionUnit?: {
    id: string;
    name: string;
    location: string;
  } | null;
  buyer?: {
    id: string;
    name: string;
    country: string;
  } | null;
}

export interface Buyer {
  id: string;
  name: string;
  country: string;
  contactEmail: string;
  contactPerson: string;
}

export interface ProductionUnit {
  id: string;
  name: string;
  location: string;
  capacity: number;
}

export interface ProductionPhoto {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  approved: boolean;
  createdAt: string;
}

export interface ProductionUpdate {
  id: string;
  orderStageId: string;
  supervisorId: string;
  date: string;
  quantity: number;
  note?: string | null;
  originalNote?: string | null;
  aiCategory?: string | null;
  aiConfidence?: number | null;
  correctedCategory?: string | null;
  createdAt: string;
  supervisor?: {
    id: string;
    name: string;
    email: string;
  };
  orderStage?: {
    id: string;
    stageName: string;
    orderId: string;
    order?: {
      poNumber: string;
      styleName: string;
    };
  };
  photos?: ProductionPhoto[];
}

export interface OrderStage {
  id: string;
  orderId: string;
  stageName: string;
  sequence: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  plannedQuantity: number;
  completedQuantity: number;
  status: StageStatus;
  productionUpdates?: ProductionUpdate[];
}

export interface ProductionOrder {
  id: string;
  poNumber: string;
  buyerId: string;
  buyer: Buyer;
  styleName: string;
  description?: string | null;
  colour: string;
  sizes: Record<string, number>;
  totalQuantity: number;
  productionUnitId: string;
  productionUnit: ProductionUnit;
  exFactoryDate: string;
  status: OrderStatus;
  riskLevel: RiskLevel;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  stages: OrderStage[];
  photos?: ProductionPhoto[];
  delayAnalysis?: OrderDelayAnalysis;
}

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
  projectedCompletionDate: string | null;
  projectedDelayDays: number;
  riskLevel: RiskLevel;
  explanation: string;
  status: StageStatus;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
}

export interface OrderDelayAnalysis {
  orderId: string;
  poNumber: string;
  overallRiskLevel: RiskLevel;
  exFactoryDate: string;
  stages: StageDelayAnalysis[];
  summary: string;
  currentStage: string | null;
  projectedOrderDelay: number;
}

export interface DashboardSummary {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  onTrackCount: number;
  atRiskCount: number;
  delayedCount: number;
  totalQuantity: number;
  completedQuantity: number;
  overallCompletionPct: number;
  ordersByBuyer: Array<{
    buyerName: string;
    country: string;
    count: number;
    totalQuantity: number;
    completedQuantity: number;
    delayedCount: number;
  }>;
  ordersByUnit: Array<{
    unitName: string;
    location: string;
    count: number;
    totalQuantity: number;
    completedQuantity: number;
    delayedCount: number;
  }>;
  ordersByRisk: Record<RiskLevel, number>;
  upcomingDeadlines: Array<{
    orderId: string;
    poNumber: string;
    styleName: string;
    buyerName: string;
    exFactoryDate: string;
    riskLevel: RiskLevel;
    daysUntilDeadline: number;
  }>;
  recentUpdates: Array<{
    id: string;
    date: string;
    quantity: number;
    stageName: string;
    poNumber: string;
    supervisorName: string;
    aiCategory?: string | null;
    originalNote?: string | null;
  }>;
}

export interface AIClassificationResult {
  category: string | null;
  confidence: number | null;
  error?: string;
  fallbackMode?: boolean;
}

export interface CreateOrderPayload {
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

export interface SubmitProductionUpdatePayload {
  orderStageId: string;
  quantity: number;
  date?: string;
  note?: string;
  photo?: File;
}
