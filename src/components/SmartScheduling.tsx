import React, { useState, useMemo, useEffect } from 'react';
import {
  OrderItem,
  MRPItem,
  CRPWorkcenter,
  Role,
  DailyScheduleItem,
  PriorityLevel,
  ScheduleHealth,
  ClusterId,
  NavigationTarget,
} from '../types/mes';
import {
  runSmartScheduling,
  BatchGroupSuggestion,
} from '../services/mesEngine';
import {
  INITIAL_DAILY_SCHEDULES,
  INITIAL_TEAMS,
  CLUSTERS,
} from '../data/mockData';
import {
  Calendar,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  CheckSquare,
  Square,
  Filter,
  BarChart2,
  Wrench,
  Boxes,
  Send,
  Eye,
  ArrowUpRight,
  ChevronRight,
  Inbox,
  UserCheck,
  Zap,
  CornerDownRight,
  CheckCircle,
  Printer,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  X,
  Truck,
  HelpCircle,
  Activity,
  FileText,
  Users,
} from 'lucide-react';

interface SmartSchedulingProps {
  orders: OrderItem[];
  materials: MRPItem[];
  workcenters: CRPWorkcenter[];
  currentRole: Role;
  onApproveWeeklyPlan: (approvedOrderIds: string[]) => void;
  onApplyBatchGroups: (batches: BatchGroupSuggestion[]) => void;
  onKittingOrder: (materialCode: string, qty: number) => void;
  onNavigate?: (target: NavigationTarget) => void;
  initialClusterFilter?: ClusterId | 'ALL';
  initialTeamFilter?: string;
  isReadOnly?: boolean;
}

// Định mức giờ công chuẩn theo từng dòng xe chế tác DCAR
const STANDARD_HOURS_MAP: Record<string, number> = {
  'Ford Thương Gia 11c (10 ghế VIP)': 112,
  'Ford Thương Gia 12c': 108,
  'Ford VIP Lounge 2026': 138,
  'Solati Maybach 10 chỗ 2025': 142,
  'Solati Thượng Đỉnh 10c': 135,
  'Ford President Maybach Edition 10c': 145,
};

const DEFAULT_STANDARD_HOURS = 115;

const DAYS_OF_WEEK = [
  { dateStr: '2026-11-02', label: 'Thứ 2 (02/11 - Hôm Nay)', shortLabel: 'Thứ 2', isToday: true },
  { dateStr: '2026-11-03', label: 'Thứ 3 (03/11)', shortLabel: 'Thứ 3', isToday: false },
  { dateStr: '2026-11-04', label: 'Thứ 4 (04/11)', shortLabel: 'Thứ 4', isToday: false },
  { dateStr: '2026-11-05', label: 'Thứ 5 (05/11)', shortLabel: 'Thứ 5', isToday: false },
  { dateStr: '2026-11-06', label: 'Thứ 6 (06/11)', shortLabel: 'Thứ 6', isToday: false },
  { dateStr: '2026-11-07', label: 'Thứ 7 (07/11)', shortLabel: 'Thứ 7', isToday: false },
];

export const SmartScheduling: React.FC<SmartSchedulingProps> = ({
  orders,
  materials,
  workcenters,
  currentRole,
  onApproveWeeklyPlan,
  onApplyBatchGroups,
  onKittingOrder,
  onNavigate,
  initialClusterFilter,
  initialTeamFilter,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'DAILY_DISPATCH' | 'WEEKLY_PLAN' | 'BATCH' | 'MRP' | 'CRP'>('DAILY_DISPATCH');
  const [hasAppliedBatching, setHasAppliedBatching] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'FORD' | 'SOLATI' | 'MRP_READY'>('ALL');

  // Daily Schedule state (initialized from realistic workshop dispatch data)
  const [dailySchedules, setDailySchedules] = useState<DailyScheduleItem[]>(INITIAL_DAILY_SCHEDULES);
  const [selectedDay, setSelectedDay] = useState<string>('2026-11-02'); // Defaults to today
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<'ALL' | 1 | 2 | 3 | 4>(initialClusterFilter ?? 'ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(initialTeamFilter ?? 'ALL');
  const [scheduleViewRole, setScheduleViewRole] = useState<'PLANNER' | 'FOREMAN'>('PLANNER');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');

  // Shop floor shift and kiosk states
  const [selectedShift, setSelectedShift] = useState<'ALL' | 'SHIFT_1' | 'SHIFT_2'>('ALL');
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);
  const [showShiftSlipModal, setShowShiftSlipModal] = useState<boolean>(false);
  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, string>>({});
  const [stationReadyConfirmed, setStationReadyConfirmed] = useState<Record<string, boolean>>({});
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Sync navigation props when changed
  useEffect(() => {
    if (initialClusterFilter !== undefined) {
      setSelectedClusterFilter(initialClusterFilter);
    }
  }, [initialClusterFilter]);

  useEffect(() => {
    if (initialTeamFilter) {
      setSelectedTeamFilter(initialTeamFilter);
    }
  }, [initialTeamFilter]);

  // Toast auto-clear
  useEffect(() => {
    if (actionSuccessToast) {
      const timer = setTimeout(() => setActionSuccessToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessToast]);

  // Handlers for shop floor fast actions
  const handleToggleTaskStatus = (itemId: string, newStatus: string) => {
    setTaskStatusMap((prev) => ({ ...prev, [itemId]: newStatus }));
    setActionSuccessToast(`Đã cập nhật trạng thái tác nghiệp thành công!`);
  };

  const handleConfirmStationReadiness = (itemId: string) => {
    setStationReadyConfirmed((prev) => ({ ...prev, [itemId]: true }));
    setActionSuccessToast(`Tổ trưởng đã xác nhận trạm sẵn sàng đón xe & chuẩn bị dưỡng gá!`);
  };

  // Candidate Orders for Weekly Scheduling
  const candidateOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'COMPLETED');
  }, [orders]);

  // Selected orders state (defaults to active orders)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(() => {
    const drafts = candidateOrders.filter(
      (o) => o.status === 'SCHEDULED_DRAFT' || o.status === 'INTAKE' || o.id === 'G2610021' || o.id === 'G2610022'
    );
    return drafts.map((o) => o.id);
  });

  // Toggle single order
  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrderIds(filteredCandidateOrders.map((o) => o.id));
  };

  const handleDeselectAll = () => {
    setSelectedOrderIds([]);
  };

  // Run the batching algorithm
  const { suggestedBatches } = runSmartScheduling(orders);

  // Filtered candidate orders
  const filteredCandidateOrders = useMemo(() => {
    return candidateOrders.filter((order) => {
      if (filterType === 'FORD') return order.baseModel.toLowerCase().includes('ford');
      if (filterType === 'SOLATI') return order.baseModel.toLowerCase().includes('solati');
      if (filterType === 'MRP_READY') return order.mrpReady;
      return true;
    });
  }, [candidateOrders, filterType]);

  const selectedOrders = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id));
  }, [orders, selectedOrderIds]);

  // Total Cumulative Standard Man-Hours
  const cumulativeHours = useMemo(() => {
    return selectedOrders.reduce((sum, o) => {
      const h = STANDARD_HOURS_MAP[o.conversionVersion] || DEFAULT_STANDARD_HOURS;
      return sum + h;
    }, 0);
  }, [selectedOrders]);

  const equivalentWorkersNeeded = Math.round((cumulativeHours / 48) * 10) / 10;

  // Cumulative Material BOM Usage
  const cumulativeMaterialUsage = useMemo(() => {
    return materials.map((mat) => {
      let requiredQty = 0;
      selectedOrders.forEach((o) => {
        const perVehicle = mat.requiredPerVehicle[o.conversionVersion] || 0;
        requiredQty += perVehicle;
      });

      const balanceHHCITY0B = mat.stockHHCITY0B - requiredQty;
      const isShortfall = balanceHHCITY0B < 0;

      return {
        ...mat,
        cumulativeDemand: requiredQty,
        balanceHHCITY0B,
        isShortfall,
      };
    });
  }, [materials, selectedOrders]);

  const hasShortfallBOM = cumulativeMaterialUsage.some((m) => m.isShortfall && m.cumulativeDemand > 0);
  const shortfallCount = cumulativeMaterialUsage.filter((m) => m.isShortfall && m.cumulativeDemand > 0).length;

  // Workcenter standard load distributions
  const workcenterLoadFactors: Record<string, { share: number; capacity: number; name: string }> = {
    'WC-LASER': { share: 0.05, capacity: 96, name: 'Tổ 01: Cắt Laser & CNC Phôi' },
    'WC-CO-KHI': { share: 0.18, capacity: 384, name: 'Tổ 02: Cơ Khí Hàn Khung Ghế' },
    'WC-MOC': { share: 0.15, capacity: 192, name: 'Tổ 03 & 04: Mộc Gáo & Đúc Composite' },
    'WC-CAT-MAY': { share: 0.35, capacity: 816, name: 'Tổ 05 - 08: Cắt, May Da & Đổ Mút' },
    'WC-DIEN-AUDIO': { share: 0.12, capacity: 336, name: 'Tổ 09 - 13: Điện, Đèn & Âm Thanh' },
    'WC-LAP-RAP': { share: 0.15, capacity: 576, name: 'Tổ 14 - 17: Hạ Sàn, Ghế VIP & KCS' },
  };

  const cumulativeWorkcenterLoad = useMemo(() => {
    return Object.entries(workcenterLoadFactors).map(([wcId, config]) => {
      const loadHours = Math.round(cumulativeHours * config.share);
      const utilizationRate = Math.round((loadHours / config.capacity) * 100);
      const isOverload = utilizationRate > 100;
      const isOptimal = utilizationRate >= 75 && utilizationRate <= 100;

      return {
        wcId,
        name: config.name,
        capacity: config.capacity,
        loadHours,
        utilizationRate,
        isOverload,
        isOptimal,
      };
    });
  }, [cumulativeHours]);

  const canApprove =
    !isReadOnly &&
    (currentRole === 'Production_Manager' ||
      currentRole === 'Executive' ||
      currentRole === 'Order_Admin');

  const handleApprove = () => {
    if (!canApprove || selectedOrderIds.length === 0) return;
    onApproveWeeklyPlan(selectedOrderIds);
  };

  const handleApplyBatchingClick = () => {
    onApplyBatchGroups(suggestedBatches);
    setHasAppliedBatching(true);
  };

  // ==========================================
  // DAILY DISPATCH & PLANNER ADJUSTMENT LOGIC
  // ==========================================

  // Auto-prioritize orders with unstable progress
  const handleAutoElevatePriority = () => {
    if (isReadOnly) return;
    setDailySchedules((prev) =>
      prev.map((item) => {
        if (item.scheduleHealth === 'REWORK' || item.scheduleHealth === 'DELAYED' || item.scheduleHealth === 'AT_RISK') {
          return {
            ...item,
            priorityLevel: 'P1_CRITICAL',
            plannerNotes: `[ĐỀ XUẤT TỰ ĐỘNG BỞI HỆ THỐNG]: Đơn tiến độ không đảm bảo (${item.scheduleHealth}). Ưu tiên xử lý giải phóng chuyền.`,
          };
        }
        return item;
      })
    );
  };

  const handleChangePriority = (scheduleId: string, level: PriorityLevel) => {
    if (isReadOnly) return;
    setDailySchedules((prev) =>
      prev.map((item) => (item.id === scheduleId ? { ...item, priorityLevel: level } : item))
    );
  };

  const handleSaveNotes = (scheduleId: string) => {
    if (isReadOnly) return;
    setDailySchedules((prev) =>
      prev.map((item) => (item.id === scheduleId ? { ...item, plannerNotes: notesDraft } : item))
    );
    setEditingNotesId(null);
  };

  // Filter daily items for selected day, cluster, and team
  const currentDayInStationItems = useMemo(() => {
    return dailySchedules.filter((item) => {
      const matchDay = selectedDay === 'ALL_WEEK' || item.dateStr === selectedDay;
      const matchCluster = selectedClusterFilter === 'ALL' || item.clusterId === selectedClusterFilter;
      const matchTeam = selectedTeamFilter === 'ALL' || item.teamId === selectedTeamFilter;
      return matchDay && matchCluster && matchTeam && !item.isIncoming;
    });
  }, [dailySchedules, selectedDay, selectedClusterFilter, selectedTeamFilter]);

  // Incoming queue from upstream teams (for selected day / future days)
  const incomingUpstreamItems = useMemo(() => {
    return dailySchedules.filter((item) => {
      const matchCluster = selectedClusterFilter === 'ALL' || item.clusterId === selectedClusterFilter;
      const matchTeam = selectedTeamFilter === 'ALL' || item.teamId === selectedTeamFilter;
      return matchCluster && matchTeam && item.isIncoming;
    });
  }, [dailySchedules, selectedClusterFilter, selectedTeamFilter]);

  // Cluster statistics for daily overview
  const clusterDailyStats = useMemo(() => {
    const activeItems = dailySchedules.filter((item) => {
      const matchDay = selectedDay === 'ALL_WEEK' || item.dateStr === selectedDay;
      return matchDay && !item.isIncoming;
    });

    const c1 = activeItems.filter((i) => i.clusterId === 1);
    const c2 = activeItems.filter((i) => i.clusterId === 2);
    const c3 = activeItems.filter((i) => i.clusterId === 3);
    const c4 = activeItems.filter((i) => i.clusterId === 4);

    return {
      c1: { count: c1.length, hours: c1.reduce((s, i) => s + i.plannedHours, 0), p1: c1.filter((i) => i.priorityLevel === 'P1_CRITICAL').length },
      c2: { count: c2.length, hours: c2.reduce((s, i) => s + i.plannedHours, 0), p1: c2.filter((i) => i.priorityLevel === 'P1_CRITICAL').length },
      c3: { count: c3.length, hours: c3.reduce((s, i) => s + i.plannedHours, 0), p1: c3.filter((i) => i.priorityLevel === 'P1_CRITICAL').length },
      c4: { count: c4.length, hours: c4.reduce((s, i) => s + i.plannedHours, 0), p1: c4.filter((i) => i.priorityLevel === 'P1_CRITICAL').length },
    };
  }, [dailySchedules, selectedDay]);

  // Priority color styling
  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'P1_CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'P2_HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
      case 'P3_NORMAL':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getHealthBadge = (h: ScheduleHealth) => {
    switch (h) {
      case 'REWORK':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DELAYED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'AT_RISK':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ON_TRACK':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Lập Lịch Sản Xuất Từng Ngày &amp; Cân Đối MRP / CRP
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân bổ lịch trình từng ngày cho 17 tổ, ưu tiên đơn không đảm bảo tiến độ, hiển thị đơn sắp đến công đoạn
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={!canApprove || selectedOrderIds.length === 0}
            onClick={handleApprove}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm ${
              canApprove && selectedOrderIds.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>Phê Duyệt Kế Hoạch Tuần ({selectedOrderIds.length} Đơn)</span>
          </button>
        </div>
      </div>

      {isReadOnly && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Chế độ Chỉ Xem (VIEW ONLY):</strong> Tài khoản được cấp quyền tra cứu kế hoạch nhưng các nút điều chỉnh ưu tiên và phê duyệt đã được khóa.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DAILY_DISPATCH')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DAILY_DISPATCH'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>01. Lập Lịch Từng Ngày &amp; Điều Phối 17 Tổ (Daily Dispatch)</span>
          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-mono text-[10px] font-bold">
            Ưu Tiên P1
          </span>
        </button>

        <button
          onClick={() => setActiveTab('WEEKLY_PLAN')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'WEEKLY_PLAN'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-indigo-500" />
          <span>02. Lập Lịch Tuần &amp; Chọn Đơn Triển Khai (Cộng Dồn)</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-mono text-[10px] font-bold">
            {selectedOrderIds.length} Đã Chọn
          </span>
        </button>

        <button
          onClick={() => setActiveTab('BATCH')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'BATCH'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-slate-500" />
          <span>03. Gom Nhóm Dòng Xe (Batching ±2 Ngày)</span>
        </button>

        <button
          onClick={() => setActiveTab('MRP')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'MRP'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4 text-slate-500" />
          <span>04. Chi Tiết Vật Tư Kho (BOM HHCITY0B)</span>
        </button>

        <button
          onClick={() => setActiveTab('CRP')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CRP'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>05. Định Biên Năng Lực Xưởng (CRP 95 Thợ)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAILY DISPATCH & INCOMING WIP PIPELINE            */}
      {/* ======================================================== */}
      {activeTab === 'DAILY_DISPATCH' && (
        <div className="space-y-6">
          {/* ACTION SUCCESS TOAST */}
          {actionSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{actionSuccessToast}</span>
              </div>
              <button
                onClick={() => setActionSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* CONTROL TOOLBAR: DATE, SHIFT, VIEW ROLES & WORKSHOP UTILITIES */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  <h3 className="text-base font-bold text-slate-900">
                    Lịch Sản Xuất Từng Ngày &amp; Điều Phối 17 Tổ Chế Tác
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    DCAR LEAN DISPATCH
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Định dạng khoa học: Phân chia rõ việc cần làm tại trạm hôm nay &amp; các đơn sắp chuyển đến để chủ động dưỡng gá, BTP
                </p>
              </div>

              {/* Utility Action Buttons: Kiosk, Print Slip, Auto-P1 */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowShiftSlipModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="In hoặc xuất phiếu phân công việc ca cho tổ trưởng"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>In Phiếu Giao Việc Ca</span>
                </button>

                <button
                  onClick={() => setIsKioskMode(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Chế độ màn hình trạm sản xuất (Kiosk workshop full-screen)"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Màn Hình Kiosk Chuyền</span>
                </button>

                {/* Auto Suggest Priority Button (For Planner) */}
                {!isReadOnly && scheduleViewRole === 'PLANNER' && (
                  <button
                    onClick={handleAutoElevatePriority}
                    className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Tự động quét và đẩy các đơn có tiến độ không đảm bảo lên Ưu Tiên P1"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-950" />
                    <span>Đề Xuất Ưu Tiên Đơn Chậm (P1)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter controls: Days & Shifts */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              {/* Day Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  Ngày Làm Việc:
                </span>
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = selectedDay === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => setSelectedDay(d.dateStr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs'
                          : d.isToday
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold border border-amber-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {d.shortLabel} {d.isToday && '★ Hôm Nay'}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedDay('ALL_WEEK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedDay === 'ALL_WEEK'
                      ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Toàn Tuần
                </button>
              </div>

              {/* Shift Filter & Perspective Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <span className="text-[11px] font-medium text-slate-500 px-1.5">Ca:</span>
                  <button
                    onClick={() => setSelectedShift('ALL')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      selectedShift === 'ALL'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cả Ngày
                  </button>
                  <button
                    onClick={() => setSelectedShift('SHIFT_1')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      selectedShift === 'SHIFT_1'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ca 1 (07:30 - 16:30)
                  </button>
                  <button
                    onClick={() => setSelectedShift('SHIFT_2')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      selectedShift === 'SHIFT_2'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ca 2 (Tăng Ca)
                  </button>
                </div>

                {/* Perspective Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setScheduleViewRole('PLANNER')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      scheduleViewRole === 'PLANNER'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Wrench className="w-3 h-3 text-indigo-600" />
                    <span>Phòng Kế Hoạch</span>
                  </button>
                  <button
                    onClick={() => setScheduleViewRole('FOREMAN')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      scheduleViewRole === 'FOREMAN'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-3 h-3 text-amber-600" />
                    <span>Tổ Trưởng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SCIENTIFIC CLUSTER SELECTOR & 17 TEAMS WORKBENCH */}
          <div className="space-y-3">
            {/* 4 Clusters Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 1 as ClusterId,
                  name: 'Cụm 1: Sơ Chế & Khung Xương',
                  teamsDesc: 'Tổ 01 - Tổ 04 (Laser, Hàn khung, Composite, Mộc)',
                  stats: clusterDailyStats.c1,
                  color: 'border-blue-300 hover:border-blue-400',
                  activeBg: 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20',
                },
                {
                  id: 2 as ClusterId,
                  name: 'Cụm 2: Vỏ & Hoàn Thiện Thô',
                  teamsDesc: 'Tổ 05 - Tổ 08 (Cắt da, Đổ mút, May áo ghế, Bọc nệm)',
                  stats: clusterDailyStats.c2,
                  color: 'border-amber-300 hover:border-amber-400',
                  activeBg: 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20',
                },
                {
                  id: 3 as ClusterId,
                  name: 'Cụm 3: Bề Mặt & Điện Đèn',
                  teamsDesc: 'Tổ 09 - Tổ 13 (Bó dây điện, Ruột gà, Đèn LED, Âm thanh)',
                  stats: clusterDailyStats.c3,
                  color: 'border-purple-300 hover:border-purple-400',
                  activeBg: 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20',
                },
                {
                  id: 4 as ClusterId,
                  name: 'Cụm 4: Lắp Ráp, Ghế VIP & KCS',
                  teamsDesc: 'Tổ 14 - Tổ 17 (Hạ sàn, Vách trần, Ghế VIP điện, KCS 120 điểm)',
                  stats: clusterDailyStats.c4,
                  color: 'border-emerald-300 hover:border-emerald-400',
                  activeBg: 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20',
                },
              ].map((c) => {
                const isSelected = selectedClusterFilter === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (selectedClusterFilter === c.id) {
                        setSelectedClusterFilter('ALL');
                        setSelectedTeamFilter('ALL');
                      } else {
                        setSelectedClusterFilter(c.id);
                        setSelectedTeamFilter('ALL');
                      }
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                      isSelected ? c.activeBg : c.color + ' shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{c.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.stats.count} việc · {c.stats.hours}h
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {c.teamsDesc}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono">
                        {c.stats.p1 > 0 ? (
                          <strong className="text-rose-600 font-bold">⚠️ {c.stats.p1} đơn ưu tiên P1</strong>
                        ) : (
                          <span className="text-emerald-700 font-medium">✓ Nhịp chuyền chuẩn</span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {isSelected ? 'Đang chọn' : 'Bấm để lọc'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Individual Team Pills for quick selection */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Chọn Tổ Chuyền:
              </span>

              <button
                onClick={() => setSelectedTeamFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedTeamFilter === 'ALL'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất Cả 17 Tổ
              </button>

              {INITIAL_TEAMS.filter(
                (t) => selectedClusterFilter === 'ALL' || t.clusterId === selectedClusterFilter
              ).map((team) => {
                const isSelected = selectedTeamFilter === team.id;
                const inStationCount = dailySchedules.filter(
                  (s) => s.teamId === team.id && !s.isIncoming && (selectedDay === 'ALL_WEEK' || s.dateStr === selectedDay)
                ).length;
                const incomingCount = dailySchedules.filter(
                  (s) => s.teamId === team.id && s.isIncoming
                ).length;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamFilter(isSelected ? 'ALL' : team.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs ring-1 ring-slate-900'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={`${team.name} · ${team.assignedPosition}`}
                  >
                    <span className="font-mono font-bold">{team.id}</span>
                    <span>{team.name.split(':')[1]?.trim() || team.name}</span>
                    {inStationCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] font-bold">
                        {inStationCount}
                      </span>
                    )}
                    {incomingCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-mono text-[10px] font-bold" title="Xe sắp chuyển đến">
                        +{incomingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SCIENTIFIC DUAL-PANEL LAYOUT: "CẦN LÀM HÔM NAY" VS "ĐƠN SẮP ĐẾN TRONG CA" */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ----------------------------------------------------------------------- */}
            {/* LEFT PANEL (7 cols): CÔNG VIỆC CẦN LÀM HÔM NAY (ĐANG TẠI TỔ / IN-STATION)*/}
            {/* ----------------------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-emerald-500">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      CÔNG VIỆC CẦN LÀM HÔM NAY (Đang Tại Trạm)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các lệnh sản xuất đang nằm trực tiếp tại trạm công đoạn của tổ, cần thi công &amp; bàn giao KCS trong ca
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold">
                    {currentDayInStationItems.length} Xe Tại Trạm
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold">
                    {currentDayInStationItems.reduce((s, i) => s + i.plannedHours, 0)} Giờ Công
                  </span>
                </div>
              </div>

              {/* List of In-Station Work Orders */}
              <div className="space-y-4">
                {currentDayInStationItems.map((item) => {
                  const isP1 = item.priorityLevel === 'P1_CRITICAL';
                  const isP2 = item.priorityLevel === 'P2_HIGH';
                  const currentTaskStatus = taskStatusMap[item.id] || item.workstationTaskStatus || 'IN_PROGRESS';
                  const isEditingNotes = editingNotesId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white border rounded-xl p-5 shadow-xs space-y-4 transition-all ${
                        isP1
                          ? 'border-rose-300 ring-2 ring-rose-500/10'
                          : isP2
                          ? 'border-amber-300'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Traveler Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Clickable Order ID to navigate to tracking */}
                            <button
                              onClick={() => {
                                if (onNavigate) {
                                  onNavigate({
                                    tab: 'orders',
                                    subView: 'JOURNEY_TRACKING',
                                    orderId: item.orderId,
                                    sourceDesc: `Lịch điều phối ${item.teamName}`,
                                  });
                                }
                              }}
                              className="font-mono font-extrabold text-sm text-slate-900 hover:text-amber-600 transition-colors underline decoration-slate-300 hover:decoration-amber-500 cursor-pointer flex items-center gap-1"
                              title="Bấm để mở hành trình tracking 17 bước của đơn hàng này"
                            >
                              <span>{item.orderCode}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 hover:text-amber-500" />
                            </button>

                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-md border ${getPriorityBadge(
                                item.priorityLevel
                              )}`}
                            >
                              {item.priorityLevel === 'P1_CRITICAL'
                                ? 'P1 - KHẨN CẤP / BÙ TIẾN ĐỘ'
                                : item.priorityLevel === 'P2_HIGH'
                                ? 'P2 - ƯU TIÊN'
                                : 'P3 - TIÊU CHUẨN'}
                            </span>

                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${getHealthBadge(
                                item.scheduleHealth
                              )}`}
                            >
                              {item.scheduleHealth === 'REWORK'
                                ? '⚠️ VƯỚNG REWORK KCS'
                                : item.scheduleHealth === 'DELAYED'
                                ? '⚠️ TRỄ HẠN'
                                : item.scheduleHealth === 'AT_RISK'
                                ? 'CẢNH BÁO NGUY CƠ'
                                : '✓ ĐÚNG HẠN'}
                            </span>

                            <span className="text-[11px] font-mono text-slate-400">
                              {item.dayOfWeek} ({item.dateStr})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="font-semibold text-slate-900">{item.conversionVersion}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500">{item.customerName}</span>
                          </div>
                        </div>

                        {/* Task Status Pill */}
                        <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                              currentTaskStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : currentTaskStatus === 'WAITING_QC'
                                ? 'bg-indigo-100 text-indigo-800'
                                : currentTaskStatus === 'PAUSED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-900 text-amber-400'
                            }`}
                          >
                            {currentTaskStatus === 'COMPLETED'
                              ? 'ĐÃ NGHIỆM THU'
                              : currentTaskStatus === 'WAITING_QC'
                              ? 'CHỜ KCS KIỂM ĐỊNH'
                              : currentTaskStatus === 'PAUSED'
                              ? 'TẠM DỪNG'
                              : 'ĐANG THI CÔNG'}
                          </span>
                        </div>
                      </div>

                      {/* Current Step & Task Description */}
                      <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-3 text-xs">
                          <div>
                            <span className="font-mono text-[11px] font-bold text-indigo-700 block">
                              CÔNG ĐOẠN HIỆN TẠI [{item.stepId}] · {item.teamName}
                            </span>
                            <strong className="text-slate-900 text-sm block mt-0.5">
                              {item.stepName}
                            </strong>
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <span className="text-slate-400 text-[10px] block">Định mức công đoạn</span>
                            <span className="text-slate-900 font-bold text-sm">
                              {item.actualHours || item.plannedHours}h / {item.plannedHours}h
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                            <span>Tiến độ hoàn thiện trạm:</span>
                            <strong className="text-slate-900">{item.progressPercent}%</strong>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isP1 ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Craft Assignment & Jig Tools Specification */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Craftsman Assignment */}
                        <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-lg space-y-1">
                          <span className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            Phân Bổ Thợ Thi Công:
                          </span>
                          <span className="font-semibold text-slate-900 block font-mono text-[11px]">
                            {item.assignedCraftsman || 'Tổ trưởng bố trí 2 thợ chuyên môn'}
                          </span>
                        </div>

                        {/* Jig & Tool Preparation */}
                        <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-lg space-y-1">
                          <span className="text-slate-500 text-[11px] flex items-center gap-1 font-semibold">
                            <Wrench className="w-3.5 h-3.5 text-slate-500" />
                            Dưỡng Gá &amp; Thiết Bị Trạm:
                          </span>
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {item.jigToolPreparation || 'Dưỡng gá tiêu chuẩn DCAR Coachbuilder'}
                          </span>
                        </div>
                      </div>

                      {/* BTP Readiness Banner */}
                      <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-blue-900">
                            <strong>Mức độ đồng bộ BTP ({item.btpReadinessPercent || 100}%):</strong>{' '}
                            {item.btpReadinessNote || 'BTP đã sẵn sàng để tổ thi công.'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate({
                                tab: 'btp',
                                subView: 'ORDER_BTP_SYNC',
                                orderId: item.orderId,
                                sourceDesc: `Đồng bộ BTP lệnh ${item.orderCode}`,
                              });
                            }
                          }}
                          className="font-mono text-[11px] text-blue-700 hover:text-blue-950 font-bold underline cursor-pointer shrink-0 ml-2"
                        >
                          Kiểm tra BTP
                        </button>
                      </div>

                      {/* Delay Root Cause Warning (if delayed) */}
                      {item.delayDays > 0 && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Cảnh báo trễ tiến độ ({item.delayDays} ngày):</strong>{' '}
                            <span>
                              {item.plannerNotes || 'Chậm so với định mức 14 ngày, cần tập trung tăng ca.'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Planner Notes Inline Editor */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex-1">
                          {isEditingNotes ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg w-full bg-white text-slate-900"
                                placeholder="Nhập chỉ đạo điều phối ca..."
                              />
                              <button
                                onClick={() => handleSaveNotes(item.id)}
                                className="px-3 py-1 text-xs bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                if (scheduleViewRole === 'PLANNER' && !isReadOnly) {
                                  setEditingNotesId(item.id);
                                  setNotesDraft(item.plannerNotes || '');
                                }
                              }}
                              className={`text-[11px] text-slate-600 ${
                                scheduleViewRole === 'PLANNER' && !isReadOnly
                                  ? 'hover:text-indigo-600 cursor-pointer underline decoration-dotted'
                                  : ''
                              }`}
                              title={item.plannerNotes || 'Bấm để sửa chỉ đạo của phòng kế hoạch'}
                            >
                              <strong>Chỉ đạo điều phối:</strong>{' '}
                              <span>{item.plannerNotes || 'Chưa có chỉ đạo đặc biệt'}</span>
                            </div>
                          )}
                        </div>

                        {/* Fast Actions Bar for Foreman */}
                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {currentTaskStatus !== 'IN_PROGRESS' ? (
                              <button
                                onClick={() => handleToggleTaskStatus(item.id, 'IN_PROGRESS')}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3" />
                                <span>Bắt Đầu Làm</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleTaskStatus(item.id, 'PAUSED')}
                                className="px-2.5 py-1 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Pause className="w-3 h-3" />
                                <span>Tạm Dừng</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleTaskStatus(item.id, 'WAITING_QC')}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3 text-amber-400" />
                              <span>Báo KCS / Bàn Giao</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {currentDayInStationItems.length === 0 && (
                  <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Không Có Lệnh Sản Xuất Nào Đang Tồn Đọng Tại Trạm Này
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Tổ đã hoàn tất các hạng mục theo kế hoạch ca hoặc chưa có xe chuyển đến. Hãy kiểm tra cột bên phải để chuẩn bị đón các xe tiếp theo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* RIGHT PANEL (5 cols): ĐƠN HÀNG SẮP ĐẾN TRONG CA / TIẾP THEO (INCOMING WIP)*/}
            {/* ----------------------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-indigo-600">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      ĐƠN SẮP ĐẾN TRONG CA (Chuẩn Bị Đón Đầu)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hàng đợi xe từ trạm trước sắp bàn giao qua; tổ cần chuẩn bị trước dưỡng gá và BTP để không phát sinh thời gian chờ
                  </p>
                </div>

                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg shrink-0">
                  {incomingUpstreamItems.length} Xe Đang Đến
                </span>
              </div>

              {/* Incoming Cards */}
              <div className="space-y-4">
                {incomingUpstreamItems.map((item) => {
                  const isP1 = item.priorityLevel === 'P1_CRITICAL';
                  const isReady = stationReadyConfirmed[item.id] || false;

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-indigo-100 rounded-xl p-5 shadow-xs space-y-3 relative overflow-hidden"
                    >
                      {/* Incoming Ribbon */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                if (onNavigate) {
                                  onNavigate({
                                    tab: 'orders',
                                    subView: 'JOURNEY_TRACKING',
                                    orderId: item.orderId,
                                    sourceDesc: `Đơn sắp đến ${item.teamName}`,
                                  });
                                }
                              }}
                              className="font-mono font-extrabold text-sm text-indigo-900 hover:text-indigo-600 underline decoration-indigo-200 cursor-pointer flex items-center gap-1"
                            >
                              <span>{item.orderCode}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                            </button>

                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${getPriorityBadge(
                                item.priorityLevel
                              )}`}
                            >
                              {item.priorityLevel === 'P1_CRITICAL' ? 'Ưu Tiên P1' : 'P2/P3'}
                            </span>

                            <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                              ETA: {item.estimatedArrivalHour || `${item.dayOfWeek} (${item.dateStr.slice(5)})`}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700">
                            <strong className="text-slate-900">{item.conversionVersion}</strong> · {item.customerName}
                          </div>
                        </div>
                      </div>

                      {/* Upstream Handover Info */}
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Trạm trước đang thi công:</span>
                          <strong className="text-indigo-950 font-mono">
                            {item.upstreamTeamName || item.teamName}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Công đoạn tiếp nhận:</span>
                          <span className="font-semibold text-slate-900">{item.stepName}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Định mức giờ tại trạm:</span>
                          <span className="font-mono font-bold text-slate-900">{item.plannedHours} giờ</span>
                        </div>
                      </div>

                      {/* Pre-setup Checklist: Jigs, Tools & BTP */}
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-500" />
                            Dưỡng Gá &amp; Jig Cần Chuẩn Bị Trước:
                          </span>
                          <p className="text-slate-600 font-mono text-[11px] pl-5">
                            {item.jigToolPreparation || 'Chuẩn bị đồ gá tiêu chuẩn theo thiết kế DCAR'}
                          </p>
                        </div>

                        {/* BTP Readiness Progress */}
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-900 font-semibold">
                            <span className="flex items-center gap-1">
                              <Boxes className="w-3.5 h-3.5 text-emerald-700" />
                              Đồng Bộ BTP Của Xe:
                            </span>
                            <span className="font-mono">{item.btpReadinessPercent || 100}% Sẵn Sàng</span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            {item.btpReadinessNote || 'BTP đã sẵn sàng ở kho đệm.'}
                          </p>
                        </div>
                      </div>

                      {/* Foreman Confirmation Action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 italic">
                          {item.plannerNotes}
                        </span>

                        {!isReadOnly && (
                          <button
                            onClick={() => handleConfirmStationReadiness(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              isReady
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isReady ? 'text-emerald-700' : 'text-amber-400'}`} />
                            <span>{isReady ? 'Đã Chuẩn Bị Trạm Sẵn Sàng' : 'Xác Nhận Đã Soạn Dưỡng Gá'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {incomingUpstreamItems.length === 0 && (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-2">
                    <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">
                      Không Có Xe Nào Trong Hàng Đợi Chuyển Trạm Của Tổ
                    </h4>
                    <p className="text-xs text-slate-500">
                      Tất cả các trạm phía trước chưa phát sinh xe cần chuyển giao trong kỳ ca này.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODAL 1: PRINTABLE SHIFT DISPATCH SHEET ("PHIẾU GIAO VIỆC CA")            */}
          {/* ========================================================================= */}
          {showShiftSlipModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm">
                      DC
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        PHIẾU GIAO VIỆC CA SẢN XUẤT (WORK ORDER TRAVELER)
                      </h2>
                      <p className="text-xs text-slate-500 font-mono">
                        DCAR LIMOUSINE COACHBUILDER · BAN ĐIỀU HÀNH SẢN XUẤT
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowShiftSlipModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngày làm việc:</span>
                    <strong className="text-slate-900">{selectedDay}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cụm phân xưởng:</span>
                    <strong className="text-slate-900">
                      {selectedClusterFilter === 'ALL' ? 'Tất cả 4 Cụm' : `Cụm ${selectedClusterFilter}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tổ thực hiện:</span>
                    <strong className="text-slate-900">
                      {selectedTeamFilter === 'ALL' ? '17 Tổ Sản Xuất' : selectedTeamFilter}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ca làm việc:</span>
                    <strong className="text-slate-900">
                      {selectedShift === 'ALL' ? 'Toàn ca (8h-20h)' : selectedShift === 'SHIFT_1' ? 'Ca 1 (8h)' : 'Ca 2 Tăng ca'}
                    </strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Danh Sách Xe Cần Thi Công Tại Trạm Trong Ca:
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2.5">Mã LSX</th>
                          <th className="p-2.5">Dòng Xe &amp; Khách Hàng</th>
                          <th className="p-2.5">Công Đoạn &amp; Nhiệm Vụ</th>
                          <th className="p-2.5 text-center">Giờ Kế Hoạch</th>
                          <th className="p-2.5 text-center">Mức Ưu Tiên</th>
                          <th className="p-2.5 text-center">KCS Xác Nhận</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {currentDayInStationItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{item.orderCode}</td>
                            <td className="p-2.5 text-slate-700 font-sans">{item.conversionVersion}</td>
                            <td className="p-2.5 text-slate-900 font-sans">
                              <strong>[{item.stepId}]</strong> {item.stepName}
                            </td>
                            <td className="p-2.5 text-center font-bold">{item.plannedHours}h</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.priorityLevel === 'P1_CRITICAL'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {item.priorityLevel}
                              </span>
                            </td>
                            <td className="p-2.5 text-center text-slate-400">□ Chưa ký</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-6 text-slate-600">
                    <div>
                      <span className="block text-slate-400 text-[10px]">Kỹ Sư Kế Hoạch:</span>
                      <span className="font-bold">Đã Phê Duyệt Hệ Thống</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">Tổ Trưởng Tiếp Nhận:</span>
                      <span className="font-bold">Ký &amp; Ghi Rõ Họ Tên</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>In Ra Giấy / PDF</span>
                    </button>
                    <button
                      onClick={() => setShowShiftSlipModal(false)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL 2: WORKSHOP KIOSK MODE (FULLSCREEN WORKSTATION MONITOR VIEW)       */}
          {/* ========================================================================= */}
          {isKioskMode && (
            <div className="fixed inset-0 z-50 bg-slate-950 text-white p-6 flex flex-col overflow-y-auto">
              {/* Kiosk Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-amber-400 text-slate-950 flex items-center justify-center font-black text-base">
                    DC
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-amber-400 tracking-tight">
                      MÀN HÌNH ĐIỀU PHỐI TRẠM SẢN XUẤT · DCAR COACHBUILDER
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedDay} · {selectedClusterFilter === 'ALL' ? 'TẤT CẢ 4 CỤM' : `CỤM ${selectedClusterFilter}`} · {selectedTeamFilter === 'ALL' ? '17 TỔ SẢN XUẤT' : selectedTeamFilter}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold">
                    ONLINE REAL-TIME
                  </span>
                  <button
                    onClick={() => setIsKioskMode(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>Thoát Kiosk</span>
                  </button>
                </div>
              </div>

              {/* Kiosk Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6 flex-1">
                {currentDayInStationItems.map((item) => {
                  const isP1 = item.priorityLevel === 'P1_CRITICAL';
                  return (
                    <div
                      key={item.id}
                      className={`p-6 rounded-2xl border space-y-4 ${
                        isP1
                          ? 'bg-rose-950/40 border-rose-600 ring-2 ring-rose-500/30'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-2xl font-black font-mono text-amber-400 block">
                            {item.orderCode}
                          </span>
                          <span className="text-sm font-bold text-slate-200 block mt-0.5">
                            {item.conversionVersion}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-black font-mono ${
                            isP1 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.priorityLevel}
                        </span>
                      </div>

                      <div className="p-3 bg-black/40 rounded-xl space-y-1">
                        <span className="text-xs font-mono text-indigo-400 block font-bold">
                          {item.teamName} · [{item.stepId}]
                        </span>
                        <strong className="text-white text-base block">
                          {item.stepName}
                        </strong>
                      </div>

                      <div className="space-y-1.5 font-mono">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Tiến độ hoàn thiện:</span>
                          <strong className="text-white">{item.progressPercent}%</strong>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isP1 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
                        <span>Định mức: <strong>{item.plannedHours}h</strong></span>
                        <span className="text-amber-400">{item.assignedCraftsman}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kiosk Footer */}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs text-slate-500 font-mono">
                <span>DCAR LIMOUSINE MANUFACTURING EXECUTION SYSTEM</span>
                <span>Cập nhật lúc: 02/11/2026 16:30</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WEEKLY PLAN & CUMULATIVE ENGINE                   */}
      {/* ======================================================== */}
      {activeTab === 'WEEKLY_PLAN' && (
        <div className="space-y-6">
          {/* TOP KPI LIVE CALCULATOR BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                Số Xe Chọn Triển Khai
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {selectedOrders.length} <span className="text-sm font-normal text-slate-500">/ {candidateOrders.length} xe</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {Math.round((selectedOrders.length / (candidateOrders.length || 1)) * 100)}% kế hoạch
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Tổng Giờ Công Cộng Dồn
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-indigo-700">
                  {cumulativeHours} <span className="text-sm font-normal text-slate-500">giờ</span>
                </span>
                <span className="text-xs font-mono text-slate-500">
                  ~{equivalentWorkersNeeded} thợ-tuần
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
                Cân Đối Vật Tư BOM (HHCITY0B)
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    hasShortfallBOM ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {hasShortfallBOM ? `Thiếu ${shortfallCount} mã` : 'Đủ 100% Kho'}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Kho HHCITY0B
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-700" />
                Trạng Thái Tải Trọng Xưởng
              </span>
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    cumulativeWorkcenterLoad.some((w) => w.isOverload)
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  {cumulativeWorkcenterLoad.some((w) => w.isOverload)
                    ? 'Có Tổ Quá Tải'
                    : 'Cân Đối Tối Ưu'}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  95 thợ / 17 tổ
                </span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN LIVE IMPACT BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: CANDIDATE ORDERS TABLE WITH CHECKBOXES (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs space-y-3 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Danh Sách Đơn Hàng Ứng Viên Triển Khai Tuần
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm chọn / bỏ chọn đơn để hệ thống tự động tính toán lại giờ công, vật tư và tải xưởng
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    Chọn Tất Cả
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    Bỏ Chọn Hết
                  </button>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Lọc:</span>
                {(['ALL', 'FORD', 'SOLATI', 'MRP_READY'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterType(mode)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      filterType === mode
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mode === 'ALL'
                      ? 'Tất Cả'
                      : mode === 'FORD'
                      ? 'Dòng Ford Transit'
                      : mode === 'SOLATI'
                      ? 'Dòng Hyundai Solati'
                      : 'Đơn Đủ Vật Tư (MRP)'}
                  </button>
                ))}
              </div>

              {/* Table of Orders */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-2 text-center w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredCandidateOrders.length > 0 &&
                            filteredCandidateOrders.every((o) => selectedOrderIds.includes(o.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAll();
                            else handleDeselectAll();
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Mã LSX / Khách Hàng</th>
                      <th className="py-2.5 px-2">Dòng Xe &amp; Phiên Bản</th>
                      <th className="py-2.5 px-2 text-center font-mono">Định Mức</th>
                      <th className="py-2.5 px-2 text-center">Hẹn Giao</th>
                      <th className="py-2.5 px-2 text-center">Vật Tư MRP</th>
                      <th className="py-2.5 px-2 text-center">Năng Lực CRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidateOrders.map((order) => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      const stdHours = STANDARD_HOURS_MAP[order.conversionVersion] || DEFAULT_STANDARD_HOURS;

                      return (
                        <tr
                          key={order.id}
                          onClick={() => handleToggleOrder(order.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/60 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleOrder(order.id)}
                              className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">{order.id}</span>
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                                  order.orderType === 'G'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.orderType === 'T'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {order.orderType}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                              {order.customerName}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="font-semibold text-slate-800 block text-[11px]">
                              {order.conversionVersion}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {order.baseModel} · {order.seatCapacity} chỗ
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                            {stdHours}h
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                            {order.dueDate.slice(5)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                order.mrpReady
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {order.mrpReady ? 'ĐỦ 100%' : 'THIẾU BOM'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                order.crpFeasible
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.crpFeasible ? 'KHẢ THI' : 'CẬN TẢI'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: REAL-TIME CUMULATIVE BALANCE & CAPACITY PANELS (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* CRP Capacity Workcenter Loading Panel */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                    Cân Đối Tải Trọng 6 Tổ / Xưởng (CRP)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Tổng: {cumulativeHours}h cần
                  </span>
                </div>

                <div className="space-y-3">
                  {cumulativeWorkcenterLoad.map((wc) => (
                    <div key={wc.wcId} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{wc.name}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500 text-[11px]">
                            {wc.loadHours}h / {wc.capacity}h
                          </span>
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              wc.isOverload
                                ? 'bg-rose-100 text-rose-700'
                                : wc.isOptimal
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {wc.utilizationRate}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            wc.isOverload
                              ? 'bg-rose-500'
                              : wc.isOptimal
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, wc.utilizationRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cumulative Material BOM Balance Panel */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-600" />
                    Cân Đối Vật Tư Chủ Lực (Kho HHCITY0B)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    Nhu cầu {selectedOrders.length} xe
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {cumulativeMaterialUsage
                    .filter((m) => m.cumulativeDemand > 0)
                    .map((mat) => (
                      <div key={mat.materialCode} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5 truncate max-w-[200px]">
                          <span className="font-semibold text-slate-900 block truncate" title={mat.materialName}>
                            {mat.materialName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {mat.materialCode} ({mat.unit})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-right shrink-0">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Cần: {mat.cumulativeDemand}</span>
                            <span className="text-slate-700 block text-[10px]">Tồn: {mat.stockHHCITY0B}</span>
                          </div>

                          <div className="w-16">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold block ${
                                mat.isShortfall
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {mat.balanceHHCITY0B >= 0 ? `+${mat.balanceHHCITY0B}` : mat.balanceHHCITY0B}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {hasShortfallBOM && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Phát hiện thiếu hụt vật tư trong kho HHCITY0B. Đề xuất cấp điều chuyển từ kho phụ HHCITY00.
                    </span>
                  </div>
                )}
              </div>

              {/* TPSX Deployment Confirmation Box */}
              <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                    Quyết Định Triển Khai Tuần
                  </span>
                  <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    TPSX Authorization
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Khi nhấn phê duyệt, toàn bộ <strong>{selectedOrders.length} đơn hàng đã chọn</strong> (tương ứng <strong>{cumulativeHours} giờ công</strong>) sẽ chính thức được ban hành thành Lệnh Sản Xuất (LSX) xuống 17 tổ xưởng.
                </p>

                <button
                  disabled={!canApprove || selectedOrderIds.length === 0}
                  onClick={handleApprove}
                  className={`w-full py-2.5 px-4 rounded text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                    canApprove && selectedOrderIds.length > 0
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>XÁC NHẬN PHÊ DUYỆT TRIỂN KHAI ({selectedOrderIds.length} XE)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SMART BATCHING                                    */}
      {/* ======================================================== */}
      {activeTab === 'BATCH' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Cơ Chế Gom Nhóm Dòng Xe Tự Động (Smart Scheduling Algorithm)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>Tiêu chuẩn 1:</strong> Ưu tiên thứ tự Ngày giao xe cam kết. <br />
                  <strong>Tiêu chuẩn 2:</strong> Tự động phát hiện các đơn hàng có cùng dòng xe cơ sở hoặc cùng form nội thất có ngày nhận xe lệch nhau ≤ 2 ngày để <strong>gom chạy cùng chuyền</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  disabled={isReadOnly}
                  onClick={handleApplyBatchingClick}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shadow-sm disabled:opacity-50"
                >
                  {hasAppliedBatching ? 'Đã Gom Nhóm Thành Công' : 'Áp Dụng Gom Chuyền Ngay'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500 block">Số Lô Xe Gom Được:</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {suggestedBatches.length} Lô Chuyền
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-100">
                <span className="text-emerald-700 block">Tiết Kiệm Giờ Chuyển Đổi:</span>
                <span className="text-lg font-bold font-mono text-emerald-800">
                  ~{suggestedBatches.reduce((acc, b) => acc + b.timeSavingsHours, 0).toFixed(1)} Giờ Công
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-500 block">Lợi Ích Cốt Lõi:</span>
                <span className="text-xs font-medium text-slate-800 block mt-1">
                  Giảm thời gian đổi cữ Laser CNC, cữ may da &amp; khuôn dập composite
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Chi Tiết Các Lô Xe Gợi Ý Gom Chuyền Tuần 44 &amp; 45
            </h4>

            {suggestedBatches.map((batch) => {
              const matchedOrders = orders.filter((o) => batch.orderIds.includes(o.id));

              return (
                <div
                  key={batch.batchId}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-amber-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center">
                        {batch.batchId.slice(-3)}
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-slate-900">
                          {batch.groupName}
                        </h5>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Dòng xe: <strong>{batch.vehicleModel}</strong></span>
                          <span aria-hidden="true">·</span>
                          <span>{batch.reason}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded font-bold">
                        Tiết kiệm: +{batch.timeSavingsHours}h công
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {matchedOrders.map((ord) => (
                      <div key={ord.id} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                          <span className="font-mono text-[10px] text-slate-500">Hạn: {ord.dueDate}</span>
                        </div>
                        <span className="font-semibold text-slate-800 block truncate">{ord.customerName}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{ord.conversionVersion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MRP MATERIAL DETAILS                              */}
      {/* ======================================================== */}
      {activeTab === 'MRP' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cân Đối Định Mức Vật Tư (BOM Kho HHCITY0B &amp; HHCITY00)
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu đồng bộ trực tiếp từ KHVT.xlsx và hệ thống kho nguyên phụ liệu DCAR Coachbuilder
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              Tổng {materials.length} mã kiểm soát
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3">Mã Vật Tư</th>
                    <th className="py-3 px-3">Tên Vật Tư &amp; Quy Cách</th>
                    <th className="py-3 px-2 text-center">ĐVT</th>
                    <th className="py-3 px-3 text-right">Kho HHCITY0B</th>
                    <th className="py-3 px-3 text-right">Kho HHCITY00</th>
                    <th className="py-3 px-3 text-right font-bold">Tổng Tồn Kho</th>
                    <th className="py-3 px-3 text-right">Đã Cấp Phát</th>
                    <th className="py-3 px-3 text-right font-bold">Cân Đối</th>
                    <th className="py-3 px-3">Nhà Cung Cấp</th>
                    <th className="py-3 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((mat) => {
                    const isShort = mat.shortfall < 0;

                    return (
                      <tr
                        key={mat.materialCode}
                        className={`hover:bg-slate-50 ${isShort ? 'bg-rose-50/30' : ''}`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {mat.materialCode}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {mat.materialName}
                        </td>
                        <td className="py-3 px-2 text-center text-slate-500 font-mono">
                          {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                          {mat.stockHHCITY0B}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                          {mat.stockHHCITY00}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                          {mat.totalStock}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 font-semibold">
                          {mat.totalAllocated}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                          <span
                            className={
                              isShort
                                ? 'text-rose-600 px-1.5 py-0.5 rounded bg-rose-100'
                                : 'text-emerald-700'
                            }
                          >
                            {mat.shortfall > 0 ? `+${mat.shortfall}` : mat.shortfall}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                          {mat.supplier}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            disabled={isReadOnly}
                            onClick={() => onKittingOrder(mat.materialCode, 1)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 whitespace-nowrap disabled:opacity-50"
                          >
                            Xuất Kitting
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CRP CAPACITY WORKCENTERS                          */}
      {/* ======================================================== */}
      {activeTab === 'CRP' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Định Biên &amp; Năng Lực Sản Xuất Khả Dụng (CRP Capacity)
              </h3>
              <p className="text-xs text-slate-500">
                Dựa trên bảng định biên nhân sự 95 thợ và định mức năng suất tiêu chuẩn 2 xe / 4 xe / ngày
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              Tiêu chuẩn ca: 8h/ngày · 6 ngày/tuần
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workcenters.map((wc) => {
              const isOverload = wc.status === 'OVERLOAD';
              const isStarvation = wc.status === 'STARVATION';

              return (
                <div
                  key={wc.workcenterId}
                  className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {wc.workcenterId}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isOverload
                          ? 'bg-rose-100 text-rose-800'
                          : isStarvation
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {wc.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {wc.workcenterName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Định biên: <strong>{wc.headcount} thợ lành nghề</strong>
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Mức độ lấp đầy (Rate):</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {wc.utilizationRate}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOverload
                            ? 'bg-rose-500'
                            : isStarvation
                            ? 'bg-amber-400'
                            : 'bg-slate-900'
                        }`}
                        style={{ width: `${Math.min(100, wc.utilizationRate)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                      <span>Đã lên lịch: {wc.scheduledHours}h</span>
                      <span>Khả dụng: {wc.weeklyCapacityHours}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
