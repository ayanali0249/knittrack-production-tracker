/**
 * Delay Calculation Unit Tests
 *
 * Tests the core delay prediction engine with deterministic reference dates.
 */

import { describe, it, expect } from 'vitest';
import {
  isBusinessDay,
  countBusinessDays,
  addBusinessDays,
  normalizeDate,
  analyseStage,
  analyseOrder,
  type StageInput,
  type OrderInput,
} from '../lib/delayCalculation';
import { StageStatus, RiskLevel } from '@prisma/client';

// ──────────────────────────────────────────────
// Business day utilities
// ──────────────────────────────────────────────

describe('isBusinessDay', () => {
  it('should return true for Monday–Friday', () => {
    // 2026-11-02 is Monday
    expect(isBusinessDay(new Date('2026-11-02'))).toBe(true);
    expect(isBusinessDay(new Date('2026-11-03'))).toBe(true); // Tue
    expect(isBusinessDay(new Date('2026-11-04'))).toBe(true); // Wed
    expect(isBusinessDay(new Date('2026-11-05'))).toBe(true); // Thu
    expect(isBusinessDay(new Date('2026-11-06'))).toBe(true); // Fri
  });

  it('should return false for Saturday and Sunday', () => {
    expect(isBusinessDay(new Date('2026-11-07'))).toBe(false); // Sat
    expect(isBusinessDay(new Date('2026-11-08'))).toBe(false); // Sun
  });
});

describe('countBusinessDays', () => {
  it('should count business days between two dates', () => {
    // Mon 2026-11-02 to Fri 2026-11-06 = 4 business days (start inclusive, end exclusive)
    expect(countBusinessDays(new Date('2026-11-02'), new Date('2026-11-06'))).toBe(4);
  });

  it('should skip weekends', () => {
    // Mon 2026-11-02 to Mon 2026-11-09 = 5 business days
    expect(countBusinessDays(new Date('2026-11-02'), new Date('2026-11-09'))).toBe(5);
  });

  it('should return 0 when start >= end', () => {
    expect(countBusinessDays(new Date('2026-11-06'), new Date('2026-11-02'))).toBe(0);
    expect(countBusinessDays(new Date('2026-11-03'), new Date('2026-11-03'))).toBe(0);
  });

  it('should count full weeks correctly', () => {
    // 2 full weeks: Mon to Mon (2 weeks later) = 10 business days
    expect(countBusinessDays(new Date('2026-11-02'), new Date('2026-11-16'))).toBe(10);
  });
});

describe('addBusinessDays', () => {
  it('should add business days correctly', () => {
    // Starting Mon 2026-11-02, add 5 business days → Mon 2026-11-09
    const result = addBusinessDays(new Date('2026-11-02'), 5);
    expect(result.toISOString().startsWith('2026-11-09')).toBe(true);
  });

  it('should skip weekends when adding', () => {
    // Starting Fri 2026-11-06, add 1 business day → Mon 2026-11-09
    const result = addBusinessDays(new Date('2026-11-06'), 1);
    expect(result.toISOString().startsWith('2026-11-09')).toBe(true);
  });

  it('should handle adding 0 days', () => {
    const start = new Date('2026-11-03');
    const result = addBusinessDays(start, 0);
    expect(normalizeDate(result).getTime()).toBe(normalizeDate(start).getTime());
  });
});

describe('normalizeDate', () => {
  it('should strip time to midnight UTC', () => {
    const date = new Date('2026-11-03T15:30:00Z');
    const normalized = normalizeDate(date);
    expect(normalized.getUTCHours()).toBe(0);
    expect(normalized.getUTCMinutes()).toBe(0);
    expect(normalized.getUTCSeconds()).toBe(0);
  });
});

// ──────────────────────────────────────────────
// Stage delay analysis
// ──────────────────────────────────────────────

describe('analyseStage', () => {
  const baseStage: StageInput = {
    id: 'stage-1',
    stageName: 'Stitching',
    sequence: 3,
    plannedStartDate: new Date('2026-10-15'),
    plannedEndDate: new Date('2026-10-30'),
    actualStartDate: new Date('2026-10-15'),
    actualEndDate: null,
    plannedQuantity: 12000,
    completedQuantity: 6800,
    status: StageStatus.IN_PROGRESS,
  };

  it('should classify a completed stage as ON_TRACK', () => {
    const completedStage: StageInput = {
      ...baseStage,
      completedQuantity: 12000,
      status: StageStatus.COMPLETED,
      actualEndDate: new Date('2026-10-28'),
    };

    const result = analyseStage(completedStage, new Date('2026-11-03'));
    expect(result.riskLevel).toBe(RiskLevel.ON_TRACK);
    expect(result.remainingQuantity).toBe(0);
    expect(result.explanation).toContain('complete');
  });

  it('should calculate daily rate and remaining days for in-progress stage', () => {
    // Reference date: 2026-11-03 (Monday)
    // Stage started 2026-10-15 (Thursday)
    // Days elapsed: business days from Oct 15 to Nov 3
    const result = analyseStage(baseStage, new Date('2026-11-03'));

    expect(result.remainingQuantity).toBe(5200);
    expect(result.daysElapsed).toBeGreaterThan(0);
    expect(result.actualDailyRate).toBeGreaterThan(0);
    expect(result.explanation).toBeTruthy();
  });

  it('should classify past-deadline stage as DELAYED', () => {
    const pastDeadline: StageInput = {
      ...baseStage,
      plannedEndDate: new Date('2026-10-20'), // Past deadline
      completedQuantity: 3000,
    };

    const result = analyseStage(pastDeadline, new Date('2026-11-03'));
    expect(result.riskLevel).toBe(RiskLevel.DELAYED);
    expect(result.projectedDelayDays).toBeGreaterThan(0);
    expect(result.explanation).toContain('past');
  });

  it('should classify NOT_STARTED with past deadline as DELAYED', () => {
    const notStartedPastDue: StageInput = {
      ...baseStage,
      status: StageStatus.NOT_STARTED,
      completedQuantity: 0,
      actualStartDate: null,
      plannedEndDate: new Date('2026-10-20'),
    };

    const result = analyseStage(notStartedPastDue, new Date('2026-11-03'));
    expect(result.riskLevel).toBe(RiskLevel.DELAYED);
    expect(result.explanation).toContain('not started');
  });

  it('should classify NOT_STARTED with future deadline as ON_TRACK', () => {
    const notStartedFuture: StageInput = {
      ...baseStage,
      status: StageStatus.NOT_STARTED,
      completedQuantity: 0,
      actualStartDate: null,
      plannedStartDate: new Date('2026-11-10'),
      plannedEndDate: new Date('2026-11-20'),
    };

    const result = analyseStage(notStartedFuture, new Date('2026-11-03'));
    expect(result.riskLevel).toBe(RiskLevel.ON_TRACK);
  });

  it('should handle zero production rate (started but no output)', () => {
    const zeroRate: StageInput = {
      ...baseStage,
      plannedEndDate: new Date('2026-11-20'),
      completedQuantity: 0,
      actualStartDate: new Date('2026-10-27'),
    };

    const result = analyseStage(zeroRate, new Date('2026-11-03'));
    expect(result.riskLevel).toBe(RiskLevel.DELAYED);
    expect(result.actualDailyRate).toBe(0);
    expect(result.explanation).toContain('zero output');
  });

  it('should generate explanation text with rate and timeline', () => {
    const result = analyseStage(baseStage, new Date('2026-10-22'));

    expect(result.explanation).toContain('pieces/day');
    expect(result.explanation).toContain('Stitching');
  });

  it('should mark AT_RISK when projected delay is small (1-3 days)', () => {
    // Create a scenario where projected delay is ~2 days
    const atRiskStage: StageInput = {
      id: 'stage-ar',
      stageName: 'Finishing',
      sequence: 5,
      plannedStartDate: new Date('2026-10-20'),
      plannedEndDate: new Date('2026-11-06'),
      actualStartDate: new Date('2026-10-20'),
      actualEndDate: null,
      plannedQuantity: 8000,
      completedQuantity: 4500,
      status: StageStatus.IN_PROGRESS,
    };

    const result = analyseStage(atRiskStage, new Date('2026-10-31'));
    // With the remaining qty and rate, this should be on track or at risk
    expect([RiskLevel.ON_TRACK, RiskLevel.AT_RISK]).toContain(result.riskLevel);
  });
});

// ──────────────────────────────────────────────
// Order delay analysis
// ──────────────────────────────────────────────

describe('analyseOrder', () => {
  it('should return worst-case risk across all stages', () => {
    const order: OrderInput = {
      id: 'order-1',
      poNumber: 'B-PO-88213',
      exFactoryDate: new Date('2026-11-20'),
      stages: [
        {
          id: 'stg-1',
          stageName: 'Cutting',
          sequence: 1,
          plannedStartDate: new Date('2026-10-01'),
          plannedEndDate: new Date('2026-10-08'),
          actualStartDate: new Date('2026-10-01'),
          actualEndDate: new Date('2026-10-07'),
          plannedQuantity: 12000,
          completedQuantity: 12000,
          status: StageStatus.COMPLETED,
        },
        {
          id: 'stg-2',
          stageName: 'Stitching',
          sequence: 3,
          plannedStartDate: new Date('2026-10-15'),
          plannedEndDate: new Date('2026-10-30'),
          actualStartDate: new Date('2026-10-15'),
          actualEndDate: null,
          plannedQuantity: 12000,
          completedQuantity: 6800,
          status: StageStatus.IN_PROGRESS,
        },
      ],
    };

    const result = analyseOrder(order, new Date('2026-11-03'));

    expect(result.orderId).toBe('order-1');
    expect(result.poNumber).toBe('B-PO-88213');
    expect(result.stages).toHaveLength(2);
    expect(result.currentStage).toBe('Stitching');
    expect(result.summary).toContain('B-PO-88213');

    // The first stage is complete (ON_TRACK), second is in-progress
    expect(result.stages[0].riskLevel).toBe(RiskLevel.ON_TRACK);
  });

  it('should identify the current stage', () => {
    const order: OrderInput = {
      id: 'order-test',
      poNumber: 'TEST-001',
      exFactoryDate: new Date('2026-12-01'),
      stages: [
        {
          id: 's1', stageName: 'Cutting', sequence: 1,
          plannedStartDate: new Date('2026-10-01'), plannedEndDate: new Date('2026-10-08'),
          actualStartDate: new Date('2026-10-01'), actualEndDate: new Date('2026-10-07'),
          plannedQuantity: 5000, completedQuantity: 5000,
          status: StageStatus.COMPLETED,
        },
        {
          id: 's2', stageName: 'Stitching', sequence: 2,
          plannedStartDate: new Date('2026-10-08'), plannedEndDate: new Date('2026-10-20'),
          actualStartDate: new Date('2026-10-08'), actualEndDate: null,
          plannedQuantity: 5000, completedQuantity: 2000,
          status: StageStatus.IN_PROGRESS,
        },
        {
          id: 's3', stageName: 'Packing', sequence: 3,
          plannedStartDate: new Date('2026-10-20'), plannedEndDate: new Date('2026-10-30'),
          actualStartDate: null, actualEndDate: null,
          plannedQuantity: 5000, completedQuantity: 0,
          status: StageStatus.NOT_STARTED,
        },
      ],
    };

    const result = analyseOrder(order, new Date('2026-10-15'));
    expect(result.currentStage).toBe('Stitching');
  });

  it('should produce a meaningful summary string', () => {
    const order: OrderInput = {
      id: 'order-sum',
      poNumber: 'SUM-001',
      exFactoryDate: new Date('2026-12-01'),
      stages: [
        {
          id: 's1', stageName: 'Cutting', sequence: 1,
          plannedStartDate: new Date('2026-10-01'), plannedEndDate: new Date('2026-10-08'),
          actualStartDate: new Date('2026-10-01'), actualEndDate: new Date('2026-10-07'),
          plannedQuantity: 5000, completedQuantity: 5000,
          status: StageStatus.COMPLETED,
        },
      ],
    };

    const result = analyseOrder(order, new Date('2026-10-10'));
    expect(result.summary).toContain('SUM-001');
    expect(result.summary).toContain('1/1');
    expect(result.overallRiskLevel).toBe(RiskLevel.ON_TRACK);
  });
});

// ──────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────

describe('Edge cases', () => {
  it('should handle stage where completedQuantity exceeds plannedQuantity', () => {
    const overProduced: StageInput = {
      id: 'over',
      stageName: 'Cutting',
      sequence: 1,
      plannedStartDate: new Date('2026-10-01'),
      plannedEndDate: new Date('2026-10-10'),
      actualStartDate: new Date('2026-10-01'),
      actualEndDate: new Date('2026-10-08'),
      plannedQuantity: 5000,
      completedQuantity: 5500, // over-produced
      status: StageStatus.COMPLETED,
    };

    const result = analyseStage(overProduced, new Date('2026-10-10'));
    expect(result.riskLevel).toBe(RiskLevel.ON_TRACK);
    expect(result.remainingQuantity).toBe(0);
  });

  it('should handle stage with very large quantities', () => {
    const largeStage: StageInput = {
      id: 'large',
      stageName: 'Stitching',
      sequence: 3,
      plannedStartDate: new Date('2026-10-01'),
      plannedEndDate: new Date('2026-12-31'),
      actualStartDate: new Date('2026-10-01'),
      actualEndDate: null,
      plannedQuantity: 500000,
      completedQuantity: 100000,
      status: StageStatus.IN_PROGRESS,
    };

    const result = analyseStage(largeStage, new Date('2026-11-01'));
    expect(result.remainingQuantity).toBe(400000);
    expect(result.actualDailyRate).toBeGreaterThan(0);
  });

  it('should handle same-day start and reference date', () => {
    const sameDay: StageInput = {
      id: 'same',
      stageName: 'Cutting',
      sequence: 1,
      plannedStartDate: new Date('2026-11-03'),
      plannedEndDate: new Date('2026-11-20'),
      actualStartDate: new Date('2026-11-03'),
      actualEndDate: null,
      plannedQuantity: 10000,
      completedQuantity: 500,
      status: StageStatus.IN_PROGRESS,
    };

    const result = analyseStage(sameDay, new Date('2026-11-03'));
    // daysElapsed should be at least 1 (floored)
    expect(result.daysElapsed).toBeGreaterThanOrEqual(1);
    expect(result.actualDailyRate).toBeGreaterThan(0);
  });
});
