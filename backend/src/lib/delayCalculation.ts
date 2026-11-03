/**
 * KnitTrack Delay Calculation Engine
 *
 * Transparent, deterministic delay prediction for production order stages.
 * All calculations use business days (Mon-Fri) and produce human-readable explanations.
 */

import { RiskLevel, StageStatus } from '@prisma/client';
import { RISK_THRESHOLDS } from './constants';
import type { StageDelayAnalysis, OrderDelayAnalysis } from '../types';

// ──────────────────────────────────────────────
// Business day utilities
// ──────────────────────────────────────────────

/**
 * Check if a date falls on a business day (Mon-Fri).
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Count business days between two dates (inclusive of start, exclusive of end).
 * If start >= end, returns 0.
 */
export function countBusinessDays(start: Date, end: Date): number {
  const startNorm = normalizeDate(start);
  const endNorm = normalizeDate(end);

  if (startNorm >= endNorm) return 0;

  let count = 0;
  const current = new Date(startNorm);
  while (current < endNorm) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Add business days to a date. Returns a new Date.
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = normalizeDate(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      added++;
    }
  }
  return result;
}

/**
 * Normalize a date to midnight UTC for consistent comparison.
 */
export function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ──────────────────────────────────────────────
// Stage-level delay analysis
// ──────────────────────────────────────────────

export interface StageInput {
  id: string;
  stageName: string;
  sequence: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  plannedQuantity: number;
  completedQuantity: number;
  status: StageStatus;
}

/**
 * Analyse a single production stage for delay risk.
 *
 * @param stage - Stage data
 * @param referenceDate - "today" for calculations (defaults to now, injectable for tests)
 */
export function analyseStage(
  stage: StageInput,
  referenceDate: Date = new Date()
): StageDelayAnalysis {
  const today = normalizeDate(referenceDate);
  const plannedStart = normalizeDate(stage.plannedStartDate);
  const plannedEnd = normalizeDate(stage.plannedEndDate);

  const remainingQuantity = Math.max(0, stage.plannedQuantity - stage.completedQuantity);

  // ── Already completed ───────────────────────────
  if (stage.completedQuantity >= stage.plannedQuantity || stage.status === 'COMPLETED') {
    return buildResult(stage, {
      remainingQuantity: 0,
      daysElapsed: countBusinessDays(stage.actualStartDate ?? plannedStart, stage.actualEndDate ?? today),
      actualDailyRate: 0,
      remainingBusinessDays: 0,
      requiredDailyRate: 0,
      estimatedCompletionDays: 0,
      projectedCompletionDate: stage.actualEndDate ?? today,
      projectedDelayDays: 0,
      riskLevel: RiskLevel.ON_TRACK,
      explanation: `Stage "${stage.stageName}" is complete. ${stage.completedQuantity} of ${stage.plannedQuantity} pieces finished.`,
    });
  }

  // ── Not started yet ─────────────────────────────
  if (stage.status === 'NOT_STARTED' && stage.completedQuantity === 0) {
    const remainingDays = countBusinessDays(today, plannedEnd);
    const pastDeadline = today > plannedEnd;

    if (pastDeadline) {
      return buildResult(stage, {
        remainingQuantity,
        daysElapsed: 0,
        actualDailyRate: 0,
        remainingBusinessDays: 0,
        requiredDailyRate: 0,
        estimatedCompletionDays: 0,
        projectedCompletionDate: null,
        projectedDelayDays: countBusinessDays(plannedEnd, today),
        riskLevel: RiskLevel.DELAYED,
        explanation: `Stage "${stage.stageName}" has not started and the deadline has already passed. ${remainingQuantity} pieces remain.`,
      });
    }

    const requiredDailyRate = remainingDays > 0 ? remainingQuantity / remainingDays : 0;
    return buildResult(stage, {
      remainingQuantity,
      daysElapsed: 0,
      actualDailyRate: 0,
      remainingBusinessDays: remainingDays,
      requiredDailyRate,
      estimatedCompletionDays: 0,
      projectedCompletionDate: null,
      projectedDelayDays: 0,
      riskLevel: today >= plannedStart ? RiskLevel.AT_RISK : RiskLevel.ON_TRACK,
      explanation: today >= plannedStart
        ? `Stage "${stage.stageName}" was planned to start but has no production data yet. ${remainingDays} business days remain.`
        : `Stage "${stage.stageName}" has not started yet. Planned to start on ${formatDate(plannedStart)} with ${remainingDays} business days until deadline.`,
    });
  }

  // ── In progress ─────────────────────────────────
  const effectiveStart = stage.actualStartDate ? normalizeDate(stage.actualStartDate) : plannedStart;
  const daysElapsed = Math.max(1, countBusinessDays(effectiveStart, today));
  const actualDailyRate = stage.completedQuantity / daysElapsed;
  const remainingDays = countBusinessDays(today, plannedEnd);

  // Past deadline with remaining quantity
  if (remainingDays <= 0) {
    const overdueDays = countBusinessDays(plannedEnd, today);
    const estDays = actualDailyRate > 0 ? Math.ceil(remainingQuantity / actualDailyRate) : 0;
    const projectedCompletion = actualDailyRate > 0 ? addBusinessDays(today, estDays) : null;
    const totalDelay = overdueDays + estDays;

    return buildResult(stage, {
      remainingQuantity,
      daysElapsed,
      actualDailyRate: round2(actualDailyRate),
      remainingBusinessDays: 0,
      requiredDailyRate: 0,
      estimatedCompletionDays: estDays,
      projectedCompletionDate: projectedCompletion,
      projectedDelayDays: totalDelay,
      riskLevel: RiskLevel.DELAYED,
      explanation: actualDailyRate > 0
        ? `Stage "${stage.stageName}" is past its deadline by ${overdueDays} business day(s). At the current rate of ${round2(actualDailyRate)} pieces/day, ${remainingQuantity} remaining pieces need ~${estDays} more business days.`
        : `Stage "${stage.stageName}" is past its deadline with ${remainingQuantity} pieces remaining and zero production rate.`,
    });
  }

  // Zero production rate (started but no output)
  if (actualDailyRate === 0) {
    return buildResult(stage, {
      remainingQuantity,
      daysElapsed,
      actualDailyRate: 0,
      remainingBusinessDays: remainingDays,
      requiredDailyRate: remainingQuantity / remainingDays,
      estimatedCompletionDays: 0,
      projectedCompletionDate: null,
      projectedDelayDays: 0,
      riskLevel: RiskLevel.DELAYED,
      explanation: `Stage "${stage.stageName}" has been active for ${daysElapsed} business day(s) with zero output. ${remainingQuantity} pieces remain with ${remainingDays} business days until deadline.`,
    });
  }

  // Normal in-progress calculation
  const requiredDailyRate = remainingQuantity / remainingDays;
  const estimatedCompletionDays = Math.ceil(remainingQuantity / actualDailyRate);
  const projectedCompletionDate = addBusinessDays(today, estimatedCompletionDays);
  const projectedDelayDays = Math.max(
    0,
    countBusinessDays(plannedEnd, projectedCompletionDate)
  );

  // Risk classification
  let riskLevel: RiskLevel;
  if (projectedDelayDays <= 0) {
    riskLevel = RiskLevel.ON_TRACK;
  } else if (
    projectedDelayDays <= RISK_THRESHOLDS.AT_RISK_DELAY_DAYS ||
    requiredDailyRate > actualDailyRate * RISK_THRESHOLDS.RATE_PRESSURE_FACTOR
  ) {
    riskLevel = RiskLevel.AT_RISK;
  } else {
    riskLevel = RiskLevel.DELAYED;
  }

  // Also mark AT_RISK if rate pressure even without projected delay
  if (
    riskLevel === RiskLevel.ON_TRACK &&
    requiredDailyRate > actualDailyRate * RISK_THRESHOLDS.RATE_PRESSURE_FACTOR
  ) {
    riskLevel = RiskLevel.AT_RISK;
  }

  const explanation = generateExplanation(
    stage.stageName,
    actualDailyRate,
    estimatedCompletionDays,
    remainingDays,
    projectedDelayDays,
    remainingQuantity,
    riskLevel
  );

  return buildResult(stage, {
    remainingQuantity,
    daysElapsed,
    actualDailyRate: round2(actualDailyRate),
    remainingBusinessDays: remainingDays,
    requiredDailyRate: round2(requiredDailyRate),
    estimatedCompletionDays,
    projectedCompletionDate,
    projectedDelayDays,
    riskLevel,
    explanation,
  });
}

// ──────────────────────────────────────────────
// Order-level delay analysis
// ──────────────────────────────────────────────

export interface OrderInput {
  id: string;
  poNumber: string;
  exFactoryDate: Date;
  stages: StageInput[];
}

/**
 * Analyse all stages of an order and produce an overall risk assessment.
 */
export function analyseOrder(
  order: OrderInput,
  referenceDate: Date = new Date()
): OrderDelayAnalysis {
  const stageAnalyses = order.stages.map((s) => analyseStage(s, referenceDate));

  // Overall risk = worst risk across stages
  let overallRisk: RiskLevel = RiskLevel.ON_TRACK;
  let maxDelay = 0;
  let currentStage: string | null = null;

  for (const sa of stageAnalyses) {
    if (sa.projectedDelayDays > maxDelay) {
      maxDelay = sa.projectedDelayDays;
    }
    if (riskSeverity(sa.riskLevel) > riskSeverity(overallRisk)) {
      overallRisk = sa.riskLevel;
    }
    if (sa.status === 'IN_PROGRESS' || sa.status === 'DELAYED') {
      currentStage = sa.stageName;
    }
  }

  const summary = buildOrderSummary(order.poNumber, overallRisk, maxDelay, currentStage, stageAnalyses);

  return {
    orderId: order.id,
    poNumber: order.poNumber,
    overallRiskLevel: overallRisk,
    exFactoryDate: order.exFactoryDate,
    stages: stageAnalyses,
    summary,
    currentStage,
    projectedOrderDelay: maxDelay,
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function buildResult(
  stage: StageInput,
  overrides: Omit<StageDelayAnalysis, 'stageId' | 'stageName' | 'sequence' | 'plannedQuantity' | 'completedQuantity' | 'status' | 'plannedStartDate' | 'plannedEndDate' | 'actualStartDate' | 'actualEndDate'>
): StageDelayAnalysis {
  return {
    stageId: stage.id,
    stageName: stage.stageName,
    sequence: stage.sequence,
    plannedQuantity: stage.plannedQuantity,
    completedQuantity: stage.completedQuantity,
    status: stage.status,
    plannedStartDate: stage.plannedStartDate,
    plannedEndDate: stage.plannedEndDate,
    actualStartDate: stage.actualStartDate,
    actualEndDate: stage.actualEndDate,
    ...overrides,
  };
}

function generateExplanation(
  stageName: string,
  actualDailyRate: number,
  estimatedDays: number,
  remainingDays: number,
  projectedDelay: number,
  remainingQty: number,
  riskLevel: RiskLevel
): string {
  const rate = round2(actualDailyRate);

  if (riskLevel === RiskLevel.ON_TRACK) {
    return `At the current production rate of ${rate} pieces/day, stage "${stageName}" is projected to complete within the ${remainingDays} remaining business days. ${remainingQty} pieces remaining.`;
  }

  if (riskLevel === RiskLevel.AT_RISK) {
    return `At the current production rate of ${rate} pieces/day, stage "${stageName}" requires approximately ${estimatedDays} production days, but only ${remainingDays} days remain. The order may finish ${projectedDelay} day(s) late.`;
  }

  return `At the current production rate of ${rate} pieces/day, stage "${stageName}" requires approximately ${estimatedDays} production days, but only ${remainingDays} days remain. The order is projected to finish ${projectedDelay} days late.`;
}

function buildOrderSummary(
  poNumber: string,
  overallRisk: RiskLevel,
  maxDelay: number,
  currentStage: string | null,
  stages: StageDelayAnalysis[]
): string {
  const completedStages = stages.filter((s) => s.completedQuantity >= s.plannedQuantity).length;
  const totalStages = stages.length;

  let summary = `Order ${poNumber}: ${completedStages}/${totalStages} stages complete.`;

  if (currentStage) {
    summary += ` Currently in "${currentStage}".`;
  }

  if (overallRisk === RiskLevel.ON_TRACK) {
    summary += ' Production is on track.';
  } else if (overallRisk === RiskLevel.AT_RISK) {
    summary += ` At risk — projected delay of up to ${maxDelay} day(s).`;
  } else {
    summary += ` DELAYED — projected delay of ${maxDelay} day(s).`;
  }

  return summary;
}

function riskSeverity(level: RiskLevel): number {
  switch (level) {
    case RiskLevel.ON_TRACK: return 0;
    case RiskLevel.AT_RISK: return 1;
    case RiskLevel.DELAYED: return 2;
    default: return 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
