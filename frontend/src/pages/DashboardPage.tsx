import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboard.service';
import { orderService } from '../services/order.service';
import type { DashboardSummary, ProductionOrder, OrderDelayAnalysis, RiskLevel } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner, TableSkeleton } from '../components/common/LoadingSpinner';
import { DelayExplanationModal } from '../components/common/DelayExplanationModal';
import {
  Search,
  Filter,
  Layers,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Eye,
  Plus,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Grouping
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [groupBy, setGroupBy] = useState<'NONE' | 'BUYER' | 'UNIT' | 'DATE'>('NONE');

  // Delay Modal State
  const [selectedAnalysis, setSelectedAnalysis] = useState<OrderDelayAnalysis | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [sumData, ordData] = await Promise.all([
        dashboardService.getSummary(),
        orderService.getOrders(),
      ]);
      setSummary(sumData);
      setOrders(ordData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenDelayModal = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const analysis = await dashboardService.getOrderDelay(orderId);
      setSelectedAnalysis(analysis);
      setModalOpen(true);
    } catch (err) {
      console.error('Failed to load delay analysis:', err);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.styleName.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer.name.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || o.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Calculate current completion per order
  const getOrderProgress = (order: ProductionOrder) => {
    if (!order.stages || order.stages.length === 0) return 0;
    const lastStage = order.stages[order.stages.length - 1];
    if (!lastStage) return 0;
    return Math.round((lastStage.completedQuantity / order.totalQuantity) * 100);
  };

  // Grouping logic
  const renderOrderList = (ordersToRender: ProductionOrder[]) => {
    if (ordersToRender.length === 0) {
      return (
        <div className="py-12 text-center text-slate-500 text-xs">
          No orders match the selected filters.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">PO Number & Style</th>
              <th className="py-3 px-4">Buyer</th>
              <th className="py-3 px-4">Production Unit</th>
              <th className="py-3 px-4">Ex-Factory Date</th>
              <th className="py-3 px-4">Total Qty</th>
              <th className="py-3 px-4">Current Stage Progress</th>
              <th className="py-3 px-4">Delay Risk</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordersToRender.map((order) => {
              const currentStage = order.stages?.find(
                (s) => s.status === 'IN_PROGRESS' || s.status === 'DELAYED'
              ) || order.stages?.[order.stages.length - 1];

              return (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {order.poNumber}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{order.styleName}</p>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {order.buyer.name}
                    <span className="block text-[10px] text-slate-400">{order.buyer.country}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {order.productionUnit.name.split('-')[0]}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800">
                      {new Date(order.exFactoryDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {order.totalQuantity.toLocaleString()} pcs
                  </td>
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>{currentStage?.stageName || 'N/A'}</span>
                      <span className="font-semibold text-slate-700">
                        {currentStage
                          ? `${Math.round((currentStage.completedQuantity / currentStage.plannedQuantity) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          order.riskLevel === 'ON_TRACK'
                            ? 'bg-emerald-500'
                            : order.riskLevel === 'AT_RISK'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${
                            currentStage
                              ? Math.min(100, (currentStage.completedQuantity / currentStage.plannedQuantity) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={(e) => handleOpenDelayModal(order.id, e)}
                      title="Click to view transparent formula breakdown"
                      className="group/btn"
                    >
                      <StatusBadge type="risk" value={order.riskLevel} />
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Production Management Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status monitoring, daily run rates, and explainable delay prediction for Tiruppur units
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => navigate('/orders/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            title="Active Orders"
            value={summary.activeOrders}
            subtitle={`${summary.totalQuantity.toLocaleString()} pcs total`}
            accentColor="blue"
          />
          <StatCard
            title="On Track"
            value={summary.onTrackCount}
            subtitle="Pacing on schedule"
            accentColor="emerald"
            onClick={() => setRiskFilter('ON_TRACK')}
          />
          <StatCard
            title="At Risk"
            value={summary.atRiskCount}
            subtitle="Projected 1-3 day delay"
            accentColor="amber"
            onClick={() => setRiskFilter('AT_RISK')}
          />
          <StatCard
            title="Delayed"
            value={summary.delayedCount}
            subtitle="Requires intervention"
            accentColor="rose"
            onClick={() => setRiskFilter('DELAYED')}
          />
          <StatCard
            title="Production Pace"
            value={`${summary.overallCompletionPct}%`}
            subtitle={`${summary.completedQuantity.toLocaleString()} completed`}
            accentColor="indigo"
          />
        </div>
      )}

      {/* Filters and Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search PO, style, or buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Filters & Grouping Options */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ON_TRACK">On Track (Green)</option>
              <option value="AT_RISK">At Risk (Amber)</option>
              <option value="DELAYED">Delayed (Red)</option>
            </select>
          </div>

          {/* Group By Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Group By:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="NONE">None (Flat List)</option>
              <option value="BUYER">Buyer</option>
              <option value="UNIT">Production Unit</option>
              <option value="DATE">Ex-Factory Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8">
            <TableSkeleton rows={6} />
          </div>
        ) : groupBy === 'NONE' ? (
          renderOrderList(filteredOrders)
        ) : groupBy === 'BUYER' ? (
          <div className="divide-y divide-slate-200">
            {Array.from(new Set(filteredOrders.map((o) => o.buyer.name))).map((buyerName) => {
              const buyerOrders = filteredOrders.filter((o) => o.buyer.name === buyerName);
              return (
                <div key={buyerName} className="p-4">
                  <div className="flex items-center justify-between mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-800">
                      Buyer: {buyerName} ({buyerOrders.length} orders)
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Total: {buyerOrders.reduce((acc, o) => acc + o.totalQuantity, 0).toLocaleString()} pcs
                    </span>
                  </div>
                  {renderOrderList(buyerOrders)}
                </div>
              );
            })}
          </div>
        ) : groupBy === 'UNIT' ? (
          <div className="divide-y divide-slate-200">
            {Array.from(new Set(filteredOrders.map((o) => o.productionUnit.name))).map((unitName) => {
              const unitOrders = filteredOrders.filter((o) => o.productionUnit.name === unitName);
              return (
                <div key={unitName} className="p-4">
                  <div className="flex items-center justify-between mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-800">
                      Unit: {unitName} ({unitOrders.length} orders)
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Total: {unitOrders.reduce((acc, o) => acc + o.totalQuantity, 0).toLocaleString()} pcs
                    </span>
                  </div>
                  {renderOrderList(unitOrders)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {Array.from(
              new Set(
                filteredOrders.map((o) =>
                  new Date(o.exFactoryDate).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })
                )
              )
            ).map((dateMonth) => {
              const monthOrders = filteredOrders.filter(
                (o) =>
                  new Date(o.exFactoryDate).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  }) === dateMonth
              );
              return (
                <div key={dateMonth} className="p-4">
                  <div className="flex items-center justify-between mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-800">
                      Ex-Factory Month: {dateMonth} ({monthOrders.length} orders)
                    </span>
                  </div>
                  {renderOrderList(monthOrders)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delay Explanation Modal */}
      <DelayExplanationModal
        analysis={selectedAnalysis}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
