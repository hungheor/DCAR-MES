import React, { useState, useMemo, useEffect } from 'react';
import {
  BTPInventoryItem,
  ProductionTeam,
  Role,
  OrderBTPSynchronization,
  NavigationTarget,
} from '../types/mes';
import {
  calculateBTPClearanceTime,
  analyzeBottlenecks,
} from '../services/mesEngine';
import {
  INITIAL_ORDER_BTP_SYNCS,
} from '../data/mockData';
import {
  Layers,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sliders,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Boxes,
  CheckCircle2,
  AlertOctagon,
  Search,
  Filter,
  Send,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface BTPManagementProps {
  btpItems: BTPInventoryItem[];
  teams: ProductionTeam[];
  currentRole: Role;
  onUpdateBTPQuantity: (btpId: string, newQty: number) => void;
  onReallocateWorkers: (fromTeamId: string, toTeamId: string, count: number) => void;
  onNavigate?: (target: NavigationTarget) => void;
  initialOrderId?: string;
  isReadOnly?: boolean;
}

export const BTPManagement: React.FC<BTPManagementProps> = ({
  btpItems,
  teams,
  currentRole,
  onUpdateBTPQuantity,
  onReallocateWorkers,
  onNavigate,
  initialOrderId,
  isReadOnly = false,
}) => {
  // Subtab navigation
  const [activeSubtab, setActiveSubtab] = useState<'CLEARANCE_WIP' | 'ORDER_BTP_SYNC'>('ORDER_BTP_SYNC');

  // Selected team for the Smart Calculation Widget
  const [selectedTeamId, setSelectedTeamId] = useState<string>('T04'); // Tổ Mộc (Bottleneck)
  const [simulatedQty, setSimulatedQty] = useState<number>(34);
  const [simulatedWorkers, setSimulatedWorkers] = useState<number>(4);

  // Order BTP synchronization state
  const [orderSyncs, setOrderSyncs] = useState<OrderBTPSynchronization[]>(INITIAL_ORDER_BTP_SYNCS);
  const [syncFilter, setSyncFilter] = useState<'ALL' | 'INCOMPLETE_ONLY' | 'READY_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState(initialOrderId ?? '');
  const [alertSuccessMsg, setAlertSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderId) {
      setSearchQuery(initialOrderId);
      setActiveSubtab('ORDER_BTP_SYNC');
    }
  }, [initialOrderId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const selectedBtp = btpItems.find((b) => b.teamId === selectedTeamId);

  // Run the smart calculation algorithms
  const clearanceResult = calculateBTPClearanceTime(
    {
      ...selectedTeam,
      headcount: simulatedWorkers,
      btpStockUnits: simulatedQty,
    },
    simulatedQty,
    selectedBtp?.manHoursPerUnit || selectedTeam.standardHoursPerVehicle / 2
  );

  // Work-in-Queue calculation
  const totalWorkInQueueHours = simulatedQty * (selectedBtp?.manHoursPerUnit || 2);
  const queueCompletionDays = parseFloat(
    (totalWorkInQueueHours / (simulatedWorkers * 8 || 1)).toFixed(1)
  );

  // Global analysis of bottlenecks
  const { bottleneckTeams } = analyzeBottlenecks(teams);

  const handleSelectTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    const team = teams.find((t) => t.id === teamId);
    const btp = btpItems.find((b) => b.teamId === teamId);
    if (team) {
      setSimulatedWorkers(team.headcount);
      setSimulatedQty(btp ? btp.quantity : team.btpStockUnits);
    }
  };

  // Filtered order BTP synchronizations
  const filteredOrderSyncs = useMemo(() => {
    return orderSyncs.filter((item) => {
      if (syncFilter === 'INCOMPLETE_ONLY' && item.isSynchronized) return false;
      if (syncFilter === 'READY_ONLY' && !item.isSynchronized) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.orderCode.toLowerCase().includes(q) ||
          item.customerName.toLowerCase().includes(q) ||
          item.conversionVersion.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orderSyncs, syncFilter, searchQuery]);

  // Overall BTP sync statistics
  const syncOverview = useMemo(() => {
    const total = orderSyncs.length;
    const ready = orderSyncs.filter((o) => o.isSynchronized).length;
    const incomplete = total - ready;
    const avgPercentage = Math.round(
      orderSyncs.reduce((sum, o) => sum + o.syncPercentage, 0) / (total || 1)
    );
    const totalPendingItems = orderSyncs.reduce(
      (sum, o) => sum + o.pendingItems.length,
      0
    );

    return { total, ready, incomplete, avgPercentage, totalPendingItems };
  }, [orderSyncs]);

  // Handler to mark a missing BTP item as completed
  const handleMarkItemReady = (orderId: string, btpCode: string) => {
    if (isReadOnly) return;
    setOrderSyncs((prev) =>
      prev.map((order) => {
        if (order.orderId !== orderId) return order;
        const itemIndex = order.pendingItems.findIndex((p) => p.btpCode === btpCode);
        if (itemIndex === -1) return order;

        const resolvedItem = {
          ...order.pendingItems[itemIndex],
          isReady: true,
          status: 'READY' as const,
          completedQty: order.pendingItems[itemIndex].requiredQty,
        };

        const newPending = order.pendingItems.filter((_, idx) => idx !== itemIndex);
        const newReady = [...order.readyItems, resolvedItem];
        const newPercentage = Math.round(
          (newReady.length / (newReady.length + newPending.length)) * 100
        );

        return {
          ...order,
          pendingItems: newPending,
          readyItems: newReady,
          syncPercentage: newPercentage,
          isSynchronized: newPercentage === 100,
          assemblyReadiness: (newPercentage === 100
            ? 'READY_FOR_ASSEMBLY'
            : 'PARTIAL_SYNC') as any,
        };
      })
    );

    setAlertSuccessMsg(`Đã ghi nhận bàn giao hoàn thành linh kiện ${btpCode} cho đơn ${orderId}!`);
    setTimeout(() => setAlertSuccessMsg(null), 4000);
  };

  // Handler to send alert nudge to team
  const handleNudgeTeam = (teamName: string, btpName: string, orderCode: string) => {
    setAlertSuccessMsg(
      `Đã gửi cảnh báo giục tiến độ khẩn cấp tới ${teamName} cho BTP: "${btpName}" (Lệnh SX: ${orderCode})!`
    );
    setTimeout(() => setAlertSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Subtab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Quản Lý Bán Thành Phẩm (BTP) &amp; Đồng Bộ Đơn Hàng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tính toán BTP đồng bộ theo đơn hàng, thể hiện đơn hàng chưa đồng bộ đang chờ gì, và kiểm soát tồn đọng 17 tổ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded">
            Định mức 8h * ngày / số người
          </span>
        </div>
      </div>

      {/* SUBTAB SWITCHER */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveSubtab('ORDER_BTP_SYNC')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSubtab === 'ORDER_BTP_SYNC'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4 text-amber-500" />
          <span>01. Tính Toán BTP Đồng Bộ Theo Đơn Hàng (Kit-to-Order)</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-mono text-[10px] font-bold">
            {syncOverview.incomplete} Đơn Chưa Đồng Bộ
          </span>
        </button>

        <button
          onClick={() => setActiveSubtab('CLEARANCE_WIP')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeSubtab === 'CLEARANCE_WIP'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>02. Tồn Kho BTP 17 Tổ &amp; Giải Tỏa Nút Thắt (Bottlenecks)</span>
        </button>
      </div>

      {/* ALERT SUCCESS MESSAGE TOAST */}
      {alertSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 font-medium flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alertSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAlertSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-mono text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 1: TÍNH TOÁN BTP ĐỒNG BỘ THEO ĐƠN HÀNG            */}
      {/* ======================================================== */}
      {activeSubtab === 'ORDER_BTP_SYNC' && (
        <div className="space-y-6">
          {/* KPI CARDS: BTP SYNCHRONIZATION OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Tỷ Lệ Đồng Bộ BTP Toàn Xưởng</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                  {syncOverview.avgPercentage}%
                </span>
                <span className="text-xs font-bold text-amber-600 font-mono">Đồng Bộ Kitting</span>
              </div>
              <p className="text-[11px] text-slate-400">Tỷ lệ các bộ linh kiện BTP đã sẵn sàng để lắp ráp</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Đơn Hàng Sẵn Sàng 100%</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-600 tabular-nums">
                  {syncOverview.ready} / {syncOverview.total}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready for Assembly
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Đã đủ 100% BTP ghế VIP, da trần, vách, dây điện</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Đơn Chưa Đồng Bộ (Chờ BTP)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-rose-600 tabular-nums">
                  {syncOverview.incomplete} Đơn
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Cần Giải Tỏa Gấp
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Có linh kiện BTP đang chậm, chưa thể lắp ráp tổng thể</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Tổng Cụm BTP Đang Chờ</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-amber-600 tabular-nums">
                  {syncOverview.totalPendingItems} Cụm
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">Tại 17 Tổ</span>
              </div>
              <p className="text-[11px] text-slate-400">Tổ May (T07), Tổ Âm thanh (T13), Tổ Ghế (T16)</p>
            </div>
          </div>

          {/* FILTER & SEARCH TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Lọc Đơn Hàng:
              </span>
              <button
                onClick={() => setSyncFilter('ALL')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  syncFilter === 'ALL'
                    ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất Cả ({orderSyncs.length})
              </button>
              <button
                onClick={() => setSyncFilter('INCOMPLETE_ONLY')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  syncFilter === 'INCOMPLETE_ONLY'
                    ? 'bg-rose-900 text-white font-bold shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                Chỉ Đơn Chưa Đồng Bộ ({syncOverview.incomplete})
              </button>
              <button
                onClick={() => setSyncFilter('READY_ONLY')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  syncFilter === 'READY_ONLY'
                    ? 'bg-emerald-900 text-white font-bold shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Đã Đồng Bộ 100% ({syncOverview.ready})
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã đơn, tên khách, phiên bản..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* LIST OF ORDERS WITH BTP SYNCHRONIZATION AND "WAITING FOR WHAT" DETAIL */}
          <div className="space-y-4">
            {filteredOrderSyncs.map((order) => {
              const isBlocked = order.assemblyReadiness === 'BLOCKED';
              const isPartial = order.assemblyReadiness === 'PARTIAL_SYNC';
              const isReady = order.isSynchronized;

              return (
                <div
                  key={order.orderId}
                  className={`bg-white border rounded-lg p-5 shadow-2xs space-y-4 transition-all ${
                    isBlocked
                      ? 'border-purple-300 ring-1 ring-purple-400/30'
                      : isPartial
                      ? 'border-amber-300 ring-1 ring-amber-400/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Header of Order Card */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          isReady
                            ? 'bg-emerald-600 text-white'
                            : isBlocked
                            ? 'bg-purple-900 text-amber-300'
                            : 'bg-slate-900 text-amber-400'
                        }`}
                      >
                        {order.orderCode.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 font-mono">
                            {order.orderCode}
                          </h3>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {order.customerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{order.conversionVersion}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-indigo-700 font-medium">
                            {order.currentStepName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Readiness Status Badge and Progress Percentage */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-slate-500 block">Độ Đồng Bộ BTP:</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${order.syncPercentage}%` }}
                              className={`h-full rounded-full ${
                                isReady
                                  ? 'bg-emerald-600'
                                  : isBlocked
                                  ? 'bg-purple-600'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <span className="font-mono font-extrabold text-sm text-slate-900">
                            {order.syncPercentage}%
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded text-xs font-bold border whitespace-nowrap ${
                          isReady
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : isBlocked
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {isReady
                          ? 'SẴN SÀNG LẮP RÁP 100%'
                          : isBlocked
                          ? 'BÁO ĐỘNG SỬA HÀNG (REWORK)'
                          : 'CHƯA ĐỒNG BỘ BTP'}
                      </span>

                      {onNavigate && (
                        <button
                          onClick={() => {
                            onNavigate({
                              tab: 'orders',
                              subView: 'JOURNEY_TRACKING',
                              orderId: order.orderCode,
                              sourceDesc: `Đồng Bộ BTP: ${order.orderCode} (${order.customerName})`,
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          title="Xem hành trình 17 công đoạn của đơn này"
                        >
                          <span>Tra Cứu 17 Bước</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* HIGHLIGHT SECTION: CÁC ĐƠN CHƯA ĐỒNG BỘ THỂ HIỆN ĐANG CHỜ GÌ */}
                  {/* ======================================================== */}
                  {order.pendingItems.length > 0 && (
                    <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-lg space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <h4 className="font-bold text-xs text-rose-900 uppercase font-mono tracking-wide">
                            Đang Chờ Gì? ({order.pendingItems.length} Cụm BTP Chưa Hoàn Thành)
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-rose-700 font-semibold">
                          Điểm Nghẽn Lắp Ráp Cụm 4
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {order.pendingItems.map((pending) => (
                          <div
                            key={pending.btpCode}
                            className="bg-white border border-rose-200 rounded p-3 text-xs space-y-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">
                                  {pending.btpName}
                                </span>
                                <span className="text-[11px] font-mono text-indigo-700 block mt-0.5">
                                  Tổ phụ trách: <strong>{pending.teamName}</strong>
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 shrink-0">
                                {pending.completedQty} / {pending.requiredQty} Đã Có
                              </span>
                            </div>

                            {/* Lý do chờ nổi bật */}
                            <div className="p-2 bg-slate-50 rounded border border-slate-200/80 text-[11px]">
                              <span className="text-slate-500 font-semibold block">Nguyên nhân nằm chờ:</span>
                              <span className="text-rose-900 font-medium block mt-0.5">
                                ⚠️ {pending.waitingReason || 'Đang chờ hoàn thiện công đoạn'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                              <span>Dự kiến xong: <strong>{pending.expectedReadyDate}</strong></span>

                              <div className="flex items-center gap-1.5">
                                {onNavigate && (
                                  <button
                                    onClick={() => {
                                      onNavigate({
                                        tab: 'scheduling',
                                        subView: 'DAILY_DISPATCH',
                                        teamId: pending.teamId,
                                        orderId: order.orderCode,
                                        sourceDesc: `Chờ BTP ${pending.btpName} từ ${pending.teamName}`,
                                      });
                                    }}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded font-semibold transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                                    title={`Xem kế hoạch và thợ tại ${pending.teamName}`}
                                  >
                                    <span>Lịch {pending.teamId}</span>
                                    <ArrowUpRight className="w-2.5 h-2.5 text-slate-600" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleNudgeTeam(pending.teamName, pending.btpName, order.orderCode)}
                                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Gửi tin nhắn hối tổ đẩy nhanh BTP"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Hối BTP</span>
                                </button>

                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleMarkItemReady(order.orderId, pending.btpCode)}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition-colors cursor-pointer"
                                    title="Xác nhận tổ đã bàn giao xong BTP này"
                                  >
                                    Đã Nhận Đủ
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* READY BTP ITEMS STRIP */}
                  {order.readyItems.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Các Cụm BTP Đã Sẵn Sàng Tại Chân Xe ({order.readyItems.length} Cụm):</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                          Đã Nghiệm Thu
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {order.readyItems.map((ready) => (
                          <div
                            key={ready.btpCode}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[11px] flex items-center gap-1.5 font-medium text-slate-800"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            <span>{ready.btpName}</span>
                            <span className="text-[10px] font-mono text-slate-400">({ready.teamId})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: TỒN KHO BTP 17 TỔ & GIẢI TỎA NÚT THẮT (WIP)     */}
      {/* ======================================================== */}
      {activeSubtab === 'CLEARANCE_WIP' && (
        <div className="space-y-6">
          {/* TOP SMART CALCULATION WIDGETS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WIDGET 1: THỜI GIAN HOÀN THÀNH BTP TỒN (BTP CLEARANCE TIME) */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-mono font-bold text-amber-600 uppercase tracking-wider block">
                    Thuật Toán Thông Minh 01
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Thời Gian Giải Tỏa Bán Thành Phẩm (BTP) Tồn
                  </h3>
                </div>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Dựa trên định mức năng suất thợ/giờ (<code className="text-slate-800">ĐỊNH MỨC, ĐỊnh biên.xlsx</code>),
                hệ thống tự động tính ra số giờ &amp; số ngày cần thiết để giải quyết dứt điểm lượng BTP đang nằm chờ.
              </p>

              {/* Interactive controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Chọn Tổ Nghiệp Vụ Cần Đo Lường:
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => handleSelectTeamChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.headcount} thợ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Lượng BTP Tồn Đang Nằm Chờ ({selectedBtp?.unit || 'đơn vị'}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={simulatedQty}
                    onChange={(e) => setSimulatedQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Result cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-4 bg-slate-900 text-white rounded-lg">
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Số Giờ Công Cần Thiết:
                  </span>
                  <span className="text-3xl font-extrabold font-mono text-amber-400 tabular-nums">
                    {clearanceResult.hoursNeeded}h
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    = {(clearanceResult.hoursNeeded * simulatedWorkers).toFixed(0)} man-hours tổng
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block font-mono">
                    Số Ngày Công Ca 8 Tiếng:
                  </span>
                  <span
                    className={`text-3xl font-extrabold font-mono tabular-nums ${
                      clearanceResult.daysNeeded > 2.0
                        ? 'text-rose-600'
                        : clearanceResult.daysNeeded > 1.0
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {clearanceResult.daysNeeded} ngày
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {clearanceResult.statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* WIDGET 2: THỜI GIAN HOÀN TẤT WIP (WORK-IN-QUEUE) & BOTTLENECK DETECTION */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-mono font-bold text-rose-600 uppercase tracking-wider block">
                    Thuật Toán Thông Minh 02
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Thời Gian Hoàn Tất WIP (Work-in-Queue) &amp; Nút Thắt
                  </h3>
                </div>
                <Zap className="w-5 h-5 text-rose-500" />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Tính toán chính xác thời gian tổ hoàn thành toàn bộ khối lượng hàng đã triển khai nhưng chưa qua công đoạn,
                giúp <strong>phát hiện sớm nút thắt cổ chai (Bottleneck)</strong> trước khi tắc chuyền.
              </p>

              {/* Bottleneck alert strip */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Tổ nghẽn trọng điểm:</strong>{' '}
                    {bottleneckTeams.map((t) => t.name).join(', ') || 'Chưa phát hiện'}
                  </span>
                </div>
                <span className="font-mono text-rose-700 font-bold shrink-0">
                  Tải &gt; 108%
                </span>
              </div>

              {/* Cross-workforce balancing simulator */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Mô Phỏng Điều Phối Nhân Sự Tăng Cường:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {simulatedWorkers} Thợ Hiện Tại
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500">Giảm bớt thợ:</span>
                  <button
                    disabled={simulatedWorkers <= 1}
                    onClick={() => setSimulatedWorkers(Math.max(1, simulatedWorkers - 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold hover:bg-slate-100 disabled:opacity-40"
                  >
                    -1 Thợ
                  </button>
                  <span className="text-slate-500">Tăng thợ chéo:</span>
                  <button
                    onClick={() => setSimulatedWorkers(simulatedWorkers + 1)}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded font-bold hover:bg-slate-800"
                  >
                    +1 Thợ
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-200">
                  💡 <strong>Khuyến nghị từ hệ thống MES:</strong> Nếu điều động thêm +2 thợ từ Tổ Laser (dư giờ công)
                  sang Tổ Mộc, thời gian hoàn tất WIP sẽ giảm từ <strong>{queueCompletionDays} ngày</strong> xuống chỉ còn{' '}
                  <strong>{(totalWorkInQueueHours / ((simulatedWorkers + 2) * 8)).toFixed(1)} ngày</strong>!
                </p>
              </div>
            </div>
          </div>

          {/* BTP INVENTORY TABLE ACROSS ALL 17 TEAMS */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bảng Theo Dõi Chi Tiết BTP Tồn Đọng Từng Tổ Nghiệp Vụ
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm soát số lượng BTP tồn, ngưỡng an toàn tối đa (Buffer) và giờ công ước tính
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Tổng {btpItems.length} danh mục BTP chính
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3">Mã BTP</th>
                    <th className="py-3 px-3">Tên Bán Thành Phẩm</th>
                    <th className="py-3 px-3">Tổ Nghiệp Vụ</th>
                    <th className="py-3 px-2 text-center">ĐVT</th>
                    <th className="py-3 px-3 text-right">Số Lượng Tồn</th>
                    <th className="py-3 px-3 text-right">Ngưỡng Buffer</th>
                    <th className="py-3 px-3 text-right">ĐM Giờ/Đơn Vị</th>
                    <th className="py-3 px-3">Công Đoạn Nằm Chờ</th>
                    <th className="py-3 px-3 text-center">Đánh Giá Tồn</th>
                    <th className="py-3 px-3 text-center">Điều Chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {btpItems.map((item) => {
                    const isCritical = item.status === 'CRITICAL_ACCUMULATION';
                    const isHigh = item.status === 'HIGH_INVENTORY';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 ${isCritical ? 'bg-rose-50/40' : ''}`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {item.btpCode}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item.btpName}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {item.teamName}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-500">
                          {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
                          {item.maxBuffer}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                          {item.manHoursPerUnit}h
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px] truncate max-w-xs">
                          {item.stageName}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800'
                                : isHigh
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              disabled={isReadOnly}
                              onClick={() => onUpdateBTPQuantity(item.id, Math.max(0, item.quantity - 2))}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono disabled:opacity-40"
                              title="Giảm 2 BTP xuất chuyền"
                            >
                              -2
                            </button>
                            <button
                              disabled={isReadOnly}
                              onClick={() => onUpdateBTPQuantity(item.id, item.quantity + 2)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono disabled:opacity-40"
                              title="Tăng 2 BTP hoàn thành"
                            >
                              +2
                            </button>
                          </div>
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
    </div>
  );
};
