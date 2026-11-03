import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/order.service';
import type { Buyer, ProductionUnit } from '../types';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const OrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [units, setUnits] = useState<ProductionUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [poNumber, setPoNumber] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [styleName, setStyleName] = useState('');
  const [description, setDescription] = useState('');
  const [colour, setColour] = useState('');
  const [productionUnitId, setProductionUnitId] = useState('');
  const [exFactoryDate, setExFactoryDate] = useState('');

  // Size Breakdowns
  const [sizes, setSizes] = useState<Array<{ size: string; quantity: number }>>([
    { size: 'S', quantity: 2000 },
    { size: 'M', quantity: 3500 },
    { size: 'L', quantity: 4000 },
    { size: 'XL', quantity: 2500 },
  ]);

  // Production Stages Template
  const [stages, setStages] = useState<
    Array<{
      stageName: string;
      sequence: number;
      plannedStartDate: string;
      plannedEndDate: string;
    }>
  >([
    { stageName: 'Cutting', sequence: 1, plannedStartDate: '2026-11-05', plannedEndDate: '2026-11-12' },
    { stageName: 'Stitching', sequence: 2, plannedStartDate: '2026-11-12', plannedEndDate: '2026-11-25' },
    { stageName: 'Printing', sequence: 3, plannedStartDate: '2026-11-15', plannedEndDate: '2026-11-20' },
    { stageName: 'Washing', sequence: 4, plannedStartDate: '2026-11-25', plannedEndDate: '2026-11-28' },
    { stageName: 'Finishing', sequence: 5, plannedStartDate: '2026-11-28', plannedEndDate: '2026-12-04' },
    { stageName: 'Packing', sequence: 6, plannedStartDate: '2026-12-04', plannedEndDate: '2026-12-08' },
  ]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [buyerList, unitList] = await Promise.all([
          orderService.getBuyers(),
          orderService.getProductionUnits(),
        ]);
        const safeBuyers = Array.isArray(buyerList) ? buyerList : [];
        const safeUnits = Array.isArray(unitList) ? unitList : [];
        setBuyers(safeBuyers);
        setUnits(safeUnits);
        if (safeBuyers[0]) setBuyerId(safeBuyers[0].id);
        if (safeUnits[0]) setProductionUnitId(safeUnits[0].id);
      } catch (err) {
        console.error('Failed to load buyers/units:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const totalQuantity = sizes.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const handleSizeChange = (index: number, field: 'size' | 'quantity', val: any) => {
    setSizes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const addSizeRow = () => {
    setSizes([...sizes, { size: 'XXL', quantity: 1000 }]);
  };

  const removeSizeRow = (index: number) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((_, i) => i !== index));
    }
  };

  const handleStageDateChange = (
    index: number,
    field: 'plannedStartDate' | 'plannedEndDate',
    val: string
  ) => {
    setStages((prev) =>
      prev.map((stage, i) => (i === index ? { ...stage, [field]: val } : stage))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber.trim()) {
      setError('PO Number is required.');
      return;
    }
    if (!buyerId) {
      setError('Please select a Buyer.');
      return;
    }
    if (!styleName.trim()) {
      setError('Style Name is required.');
      return;
    }
    if (!colour.trim()) {
      setError('Colour is required.');
      return;
    }
    if (!exFactoryDate) {
      setError('Ex-Factory Date is required.');
      return;
    }
    if (totalQuantity <= 0) {
      setError('Total quantity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const sizesObj: Record<string, number> = {};
    for (const item of sizes) {
      if (item.size) sizesObj[item.size] = Number(item.quantity) || 0;
    }

    const payload = {
      poNumber: poNumber.trim().toUpperCase(),
      buyerId,
      styleName: styleName.trim(),
      description: description.trim() || undefined,
      colour: colour.trim(),
      sizes: sizesObj,
      totalQuantity,
      productionUnitId,
      exFactoryDate: new Date(exFactoryDate).toISOString(),
      stages: stages.map((s) => ({
        stageName: s.stageName,
        sequence: s.sequence,
        plannedStartDate: new Date(s.plannedStartDate).toISOString(),
        plannedEndDate: new Date(s.plannedEndDate).toISOString(),
        plannedQuantity: totalQuantity,
      })),
    };

    try {
      const created = await orderService.createOrder(payload);
      navigate(`/orders/${created.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create production order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Production Board
        </button>
        <span className="text-xs text-slate-400">Merchandiser Portal</span>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Create Production Order & TNA Milestones
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Define purchase order parameters, size breakdown, and time-and-action factory schedule
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Order Metadata */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Order Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Order (PO) Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. B-PO-88250"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Export Buyer *
              </label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Style Name & Article *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Men's Vintage Washed Polo"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fabric Colour *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Navy Blue / Heather Grey"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Production Unit *
              </label>
              <select
                value={productionUnitId}
                onChange={(e) => setProductionUnitId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ex-Factory Delivery Date *
              </label>
              <input
                type="date"
                required
                value={exFactoryDate}
                onChange={(e) => setExFactoryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Garment Description & Specifications
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 100% Combed Compact Cotton, Single Jersey, 180 GSM, Soft Flow Dyed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Section 2: Size-Wise Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">2. Size Ratio & Quantities</h2>
              <p className="text-[11px] text-slate-500">
                Total Order Quantity calculated automatically: {totalQuantity.toLocaleString()} pcs
              </p>
            </div>
            <button
              type="button"
              onClick={addSizeRow}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Size
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sizes.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 relative">
                <div className="flex items-center justify-between mb-1">
                  <input
                    type="text"
                    value={item.size}
                    onChange={(e) => handleSizeChange(idx, 'size', e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-xs font-bold border border-slate-300 rounded text-center bg-white"
                  />
                  {sizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSizeRow(idx)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) =>
                    handleSizeChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-semibold text-slate-800 bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1">pieces</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Time-and-Action (TNA) Production Milestones */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900">
              3. Time-and-Action (TNA) Milestones
            </h2>
            <p className="text-[11px] text-slate-500">
              Planned sequential timelines for cutting, stitching, processing, and packing
            </p>
          </div>

          <div className="space-y-3">
            {stages.map((stage, idx) => (
              <div
                key={stage.stageName}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                    {stage.sequence}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{stage.stageName}</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Planned Start</label>
                  <input
                    type="date"
                    required
                    value={stage.plannedStartDate}
                    onChange={(e) =>
                      handleStageDateChange(idx, 'plannedStartDate', e.target.value)
                    }
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Planned End</label>
                  <input
                    type="date"
                    required
                    value={stage.plannedEndDate}
                    onChange={(e) => handleStageDateChange(idx, 'plannedEndDate', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Creating Order & Milestones...' : 'Save & Publish Order'}
          </button>
        </div>
      </form>
    </div>
  );
};
