/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  OrderItem,
  ClusterId,
  NavigationTarget,
  OrderType,
} from '../types/mes';
import {
  Calendar,
  Clock,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Printer,
  Maximize2,
  Info,
  Car,
  Activity,
  Boxes,
  Zap,
} from 'lucide-react';

interface ProductionGanttChartProps {
  orders: OrderItem[];
  onSelectOrder?: (order: OrderItem) => void;
  onNavigate?: (target: NavigationTarget) => void;
  isReadOnly?: boolean;
}

// Bảng màu phân định mức độ gần ngày giao: Đơn càng gần ngày giao càng gần với màu Đỏ
interface DeliveryUrgencyStyle {
  label: string;
  bgGradient: string;
  badgeClass: string;
  dotColor: string;
  borderColor: string;
  barColor: string;
  glowShadow: string;
}

export function getDeliveryUrgency(dueDateStr: string, baseDateStr = '2026-11-02'): {
  daysRemaining: number;
  style: DeliveryUrgencyStyle;
} {
  const base = new Date(baseDateStr).getTime();
  const due = new Date(dueDateStr).getTime();
  const days = Math.ceil((due - base) / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return {
      daysRemaining: days,
      style: {
        label: 'Quá Hạn / Giao Hôm Nay',
        bgGradient: 'from-red-600 to-rose-700',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/50',
        dotColor: 'bg-red-500',
        borderColor: 'border-red-500',
        barColor: 'bg-red-600',
        glowShadow: 'shadow-[0_0_12px_rgba(239,68,68,0.5)]',
      },
    };
  }
  if (days <= 2) {
    return {
      daysRemaining: days,
      style: {
        label: `Gần Giao (${days} ngày)`,
        bgGradient: 'from-rose-500 to-red-600',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dotColor: 'bg-rose-500',
        borderColor: 'border-rose-500',
        barColor: 'bg-rose-600',
        glowShadow: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      },
    };
  }
  if (days <= 5) {
    return {
      daysRemaining: days,
      style: {
        label: `Khẩn Cấp (${days} ngày)`,
        bgGradient: 'from-orange-500 to-rose-500',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        dotColor: 'bg-orange-400',
        borderColor: 'border-orange-500',
        barColor: 'bg-orange-500',
        glowShadow: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]',
      },
    };
  }
  if (days <= 8) {
    return {
      daysRemaining: days,
      style: {
        label: `Trung Bình (${days} ngày)`,
        bgGradient: 'from-amber-500 to-orange-500',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotColor: 'bg-amber-400',
        borderColor: 'border-amber-500',
        barColor: 'bg-amber-500',
        glowShadow: 'shadow-[0_0_8px_rgba(245,158,11,0.25)]',
      },
    };
  }
  if (days <= 12) {
    return {
      daysRemaining: days,
      style: {
        label: `Bình Thường (${days} ngày)`,
        bgGradient: 'from-lime-500 to-emerald-600',
        badgeClass: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
        dotColor: 'bg-lime-400',
        borderColor: 'border-lime-500',
        barColor: 'bg-lime-600',
        glowShadow: 'shadow-[0_0_8px_rgba(132,204,22,0.2)]',
      },
    };
  }
  return {
    daysRemaining: days,
    style: {
      label: `An Toàn (>12 ngày)`,
      bgGradient: 'from-emerald-500 to-teal-600',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dotColor: 'bg-emerald-400',
      borderColor: 'border-emerald-500',
      barColor: 'bg-emerald-600',
      glowShadow: 'shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    },
  };
}

export const ProductionGanttChart: React.FC<ProductionGanttChartProps> = ({
  orders,
  onSelectOrder,
  onNavigate,
  isReadOnly = false,
}) => {
  // View mode: By Order vs By 17 Workstations
  const [viewGrouping, setViewGrouping] = useState<'ORDER' | 'WORKCENTER'>('ORDER');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeZoom, setTimeZoom] = useState<'DAY' | 'WEEK' | 'SHOP_14_DAYS'>('SHOP_14_DAYS');
  const [hoveredOrder, setHoveredOrder] = useState<OrderItem | null>(null);

  // Base production timeline dates (Day 1 - Day 21)
  const timelineDays = useMemo(() => {
    const list: { dateStr: string; dayIndex: number; dayLabel: string; isToday: boolean; isWeekend: boolean }[] = [];
    const startDate = new Date('2026-11-01'); // CN
    for (let i = 1; i <= 21; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i - 1);
      const iso = d.toISOString().split('T')[0];
      const dayNum = d.getDay();
      const isWeekend = dayNum === 0 || dayNum === 6;
      const isToday = iso === '2026-11-02'; // Giả lập hôm nay là Thứ 2 02/11/2026

      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      list.push({
        dateStr: iso,
        dayIndex: i,
        dayLabel: `${dayNames[dayNum]} ${d.getDate()}/${d.getMonth() + 1}`,
        isToday,
        isWeekend,
      });
    }
    return list;
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesType = filterType === 'ALL' || o.orderType === filterType;
      const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
      const matchesSearch =
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.conversionVersion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [orders, filterType, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let criticalRed = 0;
    let inProgress = 0;
    let btpStock = 0;
    filteredOrders.forEach((o) => {
      const { daysRemaining } = getDeliveryUrgency(o.dueDate);
      if (daysRemaining <= 3 && o.status !== 'COMPLETED') criticalRed++;
      if (o.status === 'IN_PRODUCTION') inProgress++;
      if (o.orderType === 'N') btpStock++;
    });
    return {
      total: filteredOrders.length,
      criticalRed,
      inProgress,
      btpStock,
    };
  }, [filteredOrders]);

  // Helper calculate position in timeline for an order
  const getOrderBarMetrics = (order: OrderItem) => {
    const startStr = order.scheduledStartDate || order.receivedDate || '2026-11-02';
    const endStr = order.scheduledEndDate || order.dueDate || '2026-11-16';

    const timelineStart = new Date('2026-11-01').getTime();
    const oneDayMs = 1000 * 60 * 60 * 24;

    const startDiff = (new Date(startStr).getTime() - timelineStart) / oneDayMs;
    const endDiff = (new Date(endStr).getTime() - timelineStart) / oneDayMs;

    const startCol = Math.max(0, Math.min(20, Math.floor(startDiff)));
    const durationDays = Math.max(1, Math.min(21 - startCol, Math.ceil(endDiff - startDiff) + 1));

    const leftPercent = (startCol / 21) * 100;
    const widthPercent = (durationDays / 21) * 100;

    return {
      leftPercent,
      widthPercent,
      startStr,
      endStr,
      durationDays,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Biểu Đồ Gantt Sản Xuất &amp; Tiến Độ Tiến Chuyền 14 Ngày
                </h2>
                <span className="px-2 py-0.5 bg-slate-900 text-amber-400 font-mono text-[10px] font-bold rounded">
                  GANTT VIEW
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quan sát tiến độ đơn hàng theo thời gian thực. Đơn càng gần ngày giao càng chuyển sắc về <strong className="text-rose-600">Đỏ Rực</strong>.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] text-slate-500 block">Tổng Đơn Trên Gantt</span>
              <strong className="font-mono text-xs text-slate-900">{stats.total} Đơn</strong>
            </div>

            <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <span className="text-[10px] text-rose-700 block font-semibold">Gần Hạn Giao (Màu Đỏ)</span>
              <strong className="font-mono text-xs text-rose-600">{stats.criticalRed} Đơn</strong>
            </div>

            <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
              <span className="text-[10px] text-indigo-700 block font-semibold">Đang Trên Chuyền</span>
              <strong className="font-mono text-xs text-indigo-800">{stats.inProgress} Đơn</strong>
            </div>

            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <span className="text-[10px] text-emerald-700 block font-semibold">BTP Dự Phòng (N)</span>
              <strong className="font-mono text-xs text-emerald-800">{stats.btpStock} Đơn</strong>
            </div>
          </div>
        </div>

        {/* Filter and View Mode Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Search & Type filter */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã LSX, khách hàng, dòng xe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Filter Type (G, N, T, B) */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tất Cả Loại Đơn</option>
              <option value="G">Đơn Bán (G) - Thương mại</option>
              <option value="N">Đơn BTP (N) - Bán thành phẩm</option>
              <option value="T">Đơn Trưng Bày (T)</option>
              <option value="B">Đơn Bảo Hành (B)</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tất Cả Trạng Thái</option>
              <option value="IN_PRODUCTION">Đang Chuyền (In Production)</option>
              <option value="QUEUED_FOR_PRODUCTION">Đã Duyệt KH (Queued)</option>
              <option value="REWORK_ALERT">Phát Sinh Lỗi (Rework)</option>
              <option value="COMPLETED">Đã Hoàn Thành</option>
            </select>
          </div>

          {/* Color Scale Legend */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            <span className="font-bold text-slate-700">Mức Độ Gần Ngày Giao:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-xs" />
                ≤2 ngày
              </span>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 text-orange-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                3-5 ngày
              </span>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                6-8 ngày
              </span>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                &gt;8 ngày
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Gantt Canvas */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Gantt Header Timeline Bar */}
        <div className="flex items-stretch border-b border-slate-800 bg-slate-900 sticky top-0 z-20 select-none">
          {/* Left Column Header: Order Info */}
          <div className="w-72 sm:w-80 p-3 bg-slate-900 border-r border-slate-800 shrink-0 flex items-center justify-between text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" />
              <span>ĐƠN HÀNG / KHÁCH HÀNG / BTP</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">DÒNG XE</span>
          </div>

          {/* Right Column Timeline: 21 Days */}
          <div className="flex-1 grid grid-cols-21 divide-x divide-slate-800/60 overflow-hidden text-center text-[10px]">
            {timelineDays.map((td) => (
              <div
                key={td.dateStr}
                className={`py-2 px-0.5 flex flex-col items-center justify-center relative transition-colors ${
                  td.isToday
                    ? 'bg-amber-500/20 text-amber-300 font-black border-b-2 border-amber-400'
                    : td.isWeekend
                    ? 'bg-slate-950/40 text-slate-500'
                    : 'text-slate-400'
                }`}
              >
                {td.isToday && (
                  <span className="absolute -top-1 px-1 bg-amber-400 text-slate-950 text-[8px] font-black rounded-xs">
                    HÔM NAY
                  </span>
                )}
                <span className="font-bold">{td.dayLabel.split(' ')[0]}</span>
                <span className="font-mono text-[9px] text-slate-400">{td.dayLabel.split(' ')[1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Rows Container */}
        <div className="divide-y divide-slate-800/80 max-h-[620px] overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-semibold">Không tìm thấy đơn hàng nào phù hợp bộ lọc.</p>
              <button
                onClick={() => {
                  setFilterType('ALL');
                  setFilterStatus('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-amber-400 underline hover:text-amber-300 cursor-pointer"
              >
                Xóa bộ lọc để hiển thị toàn bộ
              </button>
            </div>
          ) : (
            filteredOrders.map((order, orderIdx) => {
              const { leftPercent, widthPercent, startStr, endStr, durationDays } =
                getOrderBarMetrics(order);
              const urgency = getDeliveryUrgency(order.dueDate);

              return (
                <div
                  key={order.id}
                  className="flex items-stretch hover:bg-slate-900/60 transition-colors group relative"
                  onMouseEnter={() => setHoveredOrder(order)}
                  onMouseLeave={() => setHoveredOrder(null)}
                >
                  {/* Left Column: Order Meta */}
                  <div className="w-72 sm:w-80 p-3 border-r border-slate-800 shrink-0 flex flex-col justify-between bg-slate-950/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-amber-400 text-xs">{order.id}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            order.orderType === 'G'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : order.orderType === 'N'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {order.orderType === 'G' ? 'ĐƠN BÁN (G)' : order.orderType === 'N' ? 'BTP KHO (N)' : order.orderType}
                        </span>

                        {order.orderType === 'N' && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              order.btpStatus === 'ALLOCATED_TO_SALES'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {order.btpStatus === 'ALLOCATED_TO_SALES' ? 'Đã Xuất Cho G' : 'Tồn Kho'}
                          </span>
                        )}

                        {order.fulfillmentType === 'PICK_FROM_BTP' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            Lắp Từ BTP (N)
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                        {order.progress}%
                      </span>
                    </div>

                    <div className="mt-1">
                      <p className="text-xs font-bold text-slate-200 truncate" title={order.customerName}>
                        {order.customerName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate" title={order.conversionVersion}>
                        {order.conversionVersion}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-1">
                      <span>Trạm: <strong className="text-slate-300">{order.currentTeamId || 'T01'}</strong></span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Giao: <strong className={urgency.style.badgeClass.split(' ')[1]}>{order.dueDate.slice(5)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Timeline Grid & Bar */}
                  <div className="flex-1 relative flex items-center min-h-[72px] overflow-hidden">
                    {/* Background Grid Lines (21 days) */}
                    <div className="absolute inset-0 grid grid-cols-21 divide-x divide-slate-800/40 pointer-events-none">
                      {timelineDays.map((td) => (
                        <div
                          key={td.dateStr}
                          className={`h-full ${
                            td.isToday
                              ? 'bg-amber-400/5'
                              : td.isWeekend
                              ? 'bg-slate-900/30'
                              : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Today Vertical Red/Amber Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      style={{ left: `${(1 / 21) * 100}%` }}
                    />

                    {/* Gantt Bar for This Order */}
                    <div
                      onClick={() => onSelectOrder && onSelectOrder(order)}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      className={`absolute h-9 rounded-md border ${
                        urgency.style.borderColor
                      } ${urgency.style.barColor} ${
                        urgency.style.glowShadow
                      } z-10 cursor-pointer shadow-md hover:scale-[1.01] hover:brightness-110 transition-all flex items-center px-2 text-white overflow-hidden`}
                    >
                      {/* Internal Progress Fill */}
                      <div
                        style={{ width: `${order.progress}%` }}
                        className="absolute inset-y-0 left-0 bg-white/20 pointer-events-none"
                      />

                      {/* Content inside Gantt Bar */}
                      <div className="relative z-10 flex items-center justify-between w-full text-[11px] font-semibold gap-1.5 truncate">
                        <span className="truncate flex items-center gap-1">
                          <span className="font-mono font-bold text-white drop-shadow-xs">{order.id}</span>
                          <span className="text-white/80 font-normal hidden sm:inline truncate">
                            · {order.customerName}
                          </span>
                        </span>

                        <span className="shrink-0 font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white font-bold">
                          {order.progress}% · {durationDays}d
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Gantt Footer Legend */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block" />
              <span>Vạch màu Vàng/Hổ Phách: Hôm nay (02/11/2026)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-red-600 inline-block" />
              <span>Thanh màu Đỏ: Đơn rất gần ngày giao (≤ 2 ngày)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span>Bấm vào thanh Gantt để mở xem chi tiết đơn hàng &amp; lộ trình 17 bước.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
