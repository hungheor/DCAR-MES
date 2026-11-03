import React, { useState, useMemo, useEffect } from 'react';
import {
  OrderItem,
  OrderType,
  OrderStatus,
  Role,
  PriorityLevel,
  ScheduleHealth,
  ContractItem,
  OrderStepExecution,
  NavigationTarget,
} from '../types/mes';
import { generateOrderId } from '../services/mesEngine';
import { STEP_ROUTINGS, CLUSTERS, INITIAL_CONTRACTS, createDefaultStepExecutions } from '../data/mockData';
import {
  Plus,
  Search,
  FileText,
  Printer,
  X,
  CheckCircle,
  Truck,
  Wrench,
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  ArrowRight,
  MapPin,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Navigation,
  Eye,
  AlertOctagon,
  Timer,
  Boxes,
  Sparkles,
  Building2,
  CheckCheck,
  Clock4,
  FileSignature,
  ChevronRight,
  PenSquare,
  BarChart3,
  BadgeAlert,
  Filter,
  ArrowUpRight,
} from 'lucide-react';

interface OrderManagementProps {
  orders: OrderItem[];
  currentRole: Role;
  onAddOrder: (newOrder: OrderItem) => void;
  onUpdateOrder: (updatedOrder: OrderItem) => void;
  onSelectOrder: (order: OrderItem) => void;
  selectedOrderModal: OrderItem | null;
  onCloseOrderModal: () => void;
  onNavigate?: (target: NavigationTarget) => void;
  initialMode?: 'LIST' | 'JOURNEY_TRACKING' | 'CONTRACTS';
  initialOrderId?: string;
  initialContractId?: string;
  isReadOnly?: boolean;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  currentRole,
  onAddOrder,
  onUpdateOrder,
  onSelectOrder,
  selectedOrderModal,
  onCloseOrderModal,
  onNavigate,
  initialMode,
  initialOrderId,
  initialContractId,
  isReadOnly = false,
}) => {
  // Navigation Mode
  const [managementMode, setManagementMode] = useState<'LIST' | 'JOURNEY_TRACKING' | 'CONTRACTS'>(
    initialMode ?? 'JOURNEY_TRACKING'
  );
  const [trackingOrderId, setTrackingOrderId] = useState<string>(
    initialOrderId ?? (orders[4]?.id || 'B2610002')
  );

  // Contract Tracking State
  const [contracts, setContracts] = useState<ContractItem[]>(INITIAL_CONTRACTS);
  const [contractFilter, setContractFilter] = useState<'ALL' | 'ON_TRACK' | 'AT_RISK_DELAYED'>('ALL');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    initialContractId ?? null
  );

  // Sync navigation target when passed from external reports
  useEffect(() => {
    if (initialMode) {
      setManagementMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialOrderId) {
      setTrackingOrderId(initialOrderId);
      setManagementMode('JOURNEY_TRACKING');
    }
  }, [initialOrderId]);

  useEffect(() => {
    if (initialContractId) {
      setSelectedContractId(initialContractId);
      setManagementMode('CONTRACTS');
    }
  }, [initialContractId]);

  // Step Completion & Delay Recording Modal State
  const [recordingStep, setRecordingStep] = useState<OrderStepExecution | null>(null);
  const [recordDate, setRecordDate] = useState<string>('2026-11-02');
  const [recordHours, setRecordHours] = useState<number>(16);
  const [recordQuality, setRecordQuality] = useState<'PASS' | 'REWORK_REQUIRED' | 'PENDING_CHECK'>('PASS');
  const [recordIsDelayed, setRecordIsDelayed] = useState<boolean>(false);
  const [recordDelayDays, setRecordDelayDays] = useState<number>(1);
  const [recordDelayReason, setRecordDelayReason] = useState<string>('');
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [orderType, setOrderType] = useState<OrderType>('G');
  const [customerName, setCustomerName] = useState('');
  const [contractRef, setContractRef] = useState('');
  const [baseModel, setBaseModel] = useState('Ford Transit 18c Premium');
  const [conversionVersion, setConversionVersion] = useState('Ford Thương Gia 11c (10 ghế VIP)');
  const [seatCapacity, setSeatCapacity] = useState<number>(11);
  const [exteriorColor, setExteriorColor] = useState('Đen Ánh Kim (Agate Black)');
  const [interiorColor, setInteriorColor] = useState('Da Bò Ý Nâu Cognac Phối Kem');
  const [receivedDate, setReceivedDate] = useState('2026-11-02');
  const [dueDate, setDueDate] = useState('2026-11-16');
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([
    'Google Tivi Sony 4K 43 inch K-43S30',
    'Bộ massage hơi QZ-KG005R',
    'Ampli JBL GT50011 + Subwoofer gầm',
    'Cần gạt thoát hiểm khẩn cấp NK',
  ]);

  // Available options catalog
  const availableOptions = [
    'Google Tivi Sony 4K 43 inch K-43S30',
    'Bộ massage hơi QZ-KG005R',
    'Ampli JBL GT50011 + Subwoofer gầm',
    'Ampli JBL GT90041',
    'Màn hình gối đầu 15.4" cho từng ghế',
    'Bầu trời sao Rolls-Royce 600 điểm',
    'Bàn làm việc ốp gỗ tự nhiên bóng gương',
    'Tủ lạnh Alpicool âm sàn 18L',
    'Bạc trượt Igus WW 10-120-10',
    'Bạc nhựa IGUS 1213-06',
    'Cần gạt thoát hiểm khẩn cấp NK',
    'Tem xe Cung Điện Di Động cao cấp',
    'Hệ thống rèm điện tổ ong cản sáng 100%',
    'Cổng sạc Type-C nhanh 45W từng ghế',
  ];

  // Dynamic preview of auto-generated ID
  const previewId = generateOrderId(orderType, orders, new Date(receivedDate));

  const handleToggleOption = (opt: string) => {
    if (selectedOptions.includes(opt)) {
      setSelectedOptions(selectedOptions.filter((o) => o !== opt));
    } else {
      setSelectedOptions([...selectedOptions, opt]);
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const newId = generateOrderId(orderType, orders, new Date(receivedDate));
    const newOrder: OrderItem = {
      id: newId,
      orderType,
      customerName: customerName.trim(),
      contractRef: contractRef.trim() || `HĐ-${newId}`,
      baseModel,
      conversionVersion,
      seatCapacity,
      exteriorColor,
      interiorColor,
      options: selectedOptions,
      receivedDate,
      dueDate,
      scheduledStartDate: receivedDate,
      scheduledEndDate: dueDate,
      status: 'INTAKE',
      progress: 0,
      currentDay: 1,
      currentCluster: 1,
      currentStepId: 'S01',
      currentTeamId: 'T01',
      currentStepName: 'Tiếp nhận mới, chờ cắt phôi CNC',
      priorityLevel: 'P3_NORMAL',
      scheduleHealth: 'ON_TRACK',
      delayDays: 0,
      standardLeadTimeDays: 14,
      actualLeadTimeDays: 0,
      mrpReady: false,
      crpFeasible: true,
      notes,
    };

    onAddOrder(newOrder);
    setShowCreateModal(false);
    // Reset form
    setCustomerName('');
    setContractRef('');
    setNotes('');
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesType = filterType === 'ALL' || order.orderType === filterType;
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.conversionVersion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // Tracking Order Object
  const currentTrackingOrder = orders.find((o) => o.id === trackingOrderId) || orders[0];

  const handleSwitchToTracking = (orderId: string) => {
    setTrackingOrderId(orderId);
    setManagementMode('JOURNEY_TRACKING');
  };

  // Health assessment text and styling
  const getHealthAssessment = (order: OrderItem) => {
    const health = order.scheduleHealth || (order.status === 'REWORK_ALERT' ? 'REWORK' : 'ON_TRACK');

    switch (health) {
      case 'REWORK':
        return {
          badge: 'bg-purple-100 text-purple-900 border-purple-300',
          title: 'TIẾN ĐỘ KHÔNG ĐẢM BẢO · BÁO ĐỘNG ĐỎ KCS / SỬA HÀNG',
          description: `Đơn hàng bảo hành VIP phát sinh lỗi chập vi mạch CAN-bus đệm massage tại Tổ 16. Chậm 2 ngày so với kế hoạch! Hạn giao xe chỉ còn 2 ngày (${order.dueDate}). Cần ưu tiên P1 tối thượng tại Tổ 16 và Tổ 07.`,
          bgColor: 'bg-purple-50/70 border-purple-300 text-purple-950',
          iconColor: 'text-purple-700',
          isSafe: false,
        };
      case 'DELAYED':
        return {
          badge: 'bg-rose-100 text-rose-900 border-rose-300',
          title: 'CẢNH BÁO TIẾN ĐỘ KHÔNG ĐẢM BẢO · CHẬM TIẾN ĐỘ',
          description: `Đơn hàng đang chậm ${order.delayDays || 2} ngày so với cam kết hợp đồng. Cần kích hoạt tăng ca (OT) tại các trạm hoàn thiện để kéo lại tiến độ giao xe.`,
          bgColor: 'bg-rose-50/70 border-rose-300 text-rose-950',
          iconColor: 'text-rose-700',
          isSafe: false,
        };
      case 'AT_RISK':
        return {
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
          title: 'CẢNH BÁO TIẾN ĐỘ: NGUY CƠ CHẬM TIẾN ĐỘ (LỆCH 1 NGÀY)',
          description: `Đang chậm 1 ngày tại Tổ 13 do chờ kiểm định loa DSP Ampli JBL. Cần bàn giao sang Tổ 14 dán sàn gỗ Teak trong sáng mai để không ảnh hưởng ngày xuất xưởng ${order.dueDate}.`,
          bgColor: 'bg-amber-50/70 border-amber-300 text-amber-950',
          iconColor: 'text-amber-700',
          isSafe: false,
        };
      case 'ON_TRACK':
      default:
        return {
          badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          title: 'TIẾN ĐỘ ĐẢM BẢO · ĐANG ĐÚNG TIẾN ĐỘ TIÊU CHUẨN',
          description: `Xe đang hoàn thành đúng nhịp độ tiêu chuẩn 14 ngày chuyền (Ngày ${order.currentDay}/14, tiến độ ${order.progress}%). Dự kiến nghiệm thu và bàn giao đúng hẹn cho khách hàng vào ngày ${order.dueDate}.`,
          bgColor: 'bg-emerald-50/70 border-emerald-300 text-emerald-950',
          iconColor: 'text-emerald-700',
          isSafe: true,
        };
    }
  };

  const healthAssessment = getHealthAssessment(currentTrackingOrder);

  // Step executions for currently selected tracking order
  const activeStepExecutions: OrderStepExecution[] = useMemo(() => {
    if (currentTrackingOrder.stepExecutions && currentTrackingOrder.stepExecutions.length > 0) {
      return currentTrackingOrder.stepExecutions;
    }
    return createDefaultStepExecutions(
      currentTrackingOrder.id,
      currentTrackingOrder.currentStepId,
      currentTrackingOrder.receivedDate
    );
  }, [currentTrackingOrder]);

  const delayedSteps = useMemo(() => {
    return activeStepExecutions.filter((s) => s.isDelayed || s.status === 'DELAYED_REWORK');
  }, [activeStepExecutions]);

  const completedStepsCount = activeStepExecutions.filter((s) => s.status === 'COMPLETED').length;
  const totalStandardHours = activeStepExecutions.reduce((s, i) => s + i.standardHours, 0);
  const totalActualHours = activeStepExecutions.reduce((s, i) => s + (i.actualHours || i.standardHours), 0);

  // Helper to open step recording modal
  const handleOpenStepRecordModal = (step: OrderStepExecution) => {
    setRecordingStep(step);
    setRecordDate(step.actualCompletionDate || step.plannedCompletionDate || '2026-11-02');
    setRecordHours(step.actualHours || step.standardHours || 16);
    setRecordQuality(step.qualityStatus || 'PASS');
    setRecordIsDelayed(step.isDelayed || false);
    setRecordDelayDays(step.delayDays || 1);
    setRecordDelayReason(step.delayReason || '');
    setRecordNotes(step.notes || '');
  };

  const handleSaveStepExecution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingStep) return;

    const updatedExecutions = activeStepExecutions.map((item) => {
      if (item.stepId === recordingStep.stepId) {
        return {
          ...item,
          status: recordQuality === 'REWORK_REQUIRED'
            ? ('DELAYED_REWORK' as const)
            : ('COMPLETED' as const),
          actualCompletionDate: recordDate,
          actualHours: Number(recordHours),
          qualityStatus: recordQuality,
          isDelayed: recordIsDelayed,
          delayDays: recordIsDelayed ? Number(recordDelayDays) : 0,
          delayReason: recordIsDelayed ? recordDelayReason : undefined,
          notes: recordNotes,
          completedByPosition: currentRole === 'Foreman' ? 'Tổ Trưởng Phụ Trách Trạm' : 'KCS / Kế Hoạch Sản Xuất',
        };
      }
      return item;
    });

    const maxDelayDays = updatedExecutions.reduce((max, x) => Math.max(max, x.delayDays || 0), 0);
    const hasRework = updatedExecutions.some((x) => x.qualityStatus === 'REWORK_REQUIRED');

    const updatedOrder: OrderItem = {
      ...currentTrackingOrder,
      stepExecutions: updatedExecutions,
      delayDays: maxDelayDays,
      scheduleHealth: hasRework
        ? 'REWORK'
        : maxDelayDays > 1
        ? 'DELAYED'
        : maxDelayDays === 1
        ? 'AT_RISK'
        : 'ON_TRACK',
    };

    onUpdateOrder(updatedOrder);
    setRecordingStep(null);
    setSuccessToast(
      `Đã ghi nhận công đoạn ${recordingStep.stepId} - ${recordingStep.stepName}: ${
        recordIsDelayed ? `Trễ ${recordDelayDays} ngày (${recordDelayReason || 'Chờ linh kiện'})` : 'Đã nghiệm thu hoàn thành'
      }`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar with Main Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Quản Lý Lệnh Sản Xuất &amp; Tracking Tiến Độ Chuyền
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi chi tiết đơn hàng đang ở công đoạn nào, cảnh báo tiến độ có đảm bảo hay không, và tiếp nhận LSX mới
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={isReadOnly}
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 text-xs font-semibold rounded flex items-center gap-1.5 whitespace-nowrap shadow-sm self-start sm:self-auto transition-colors ${
              isReadOnly
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'text-white bg-slate-900 hover:bg-slate-800 cursor-pointer'
            }`}
            title={isReadOnly ? 'Chế độ Chỉ Xem: Không có quyền tạo Lệnh Sản Xuất mới' : 'Tiếp nhận yêu cầu từ Kinh Doanh'}
          >
            <Plus className="w-4 h-4" />
            <span>Tiếp Nhận &amp; Tạo LSX Mới</span>
          </button>
        </div>
      </div>

      {/* Primary Subtabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setManagementMode('LIST')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            managementMode === 'LIST'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>01. Danh Sách Lệnh Sản Xuất ({orders.length} Đơn)</span>
        </button>

        <button
          onClick={() => setManagementMode('JOURNEY_TRACKING')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            managementMode === 'JOURNEY_TRACKING'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Navigation className="w-4 h-4 text-amber-500" />
          <span>02. Tracking Trực Tiếp Hành Trình &amp; Cảnh Báo Tiến Độ LSX</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold rounded">
            Live 17 Công Đoạn
          </span>
        </button>

        <button
          onClick={() => setManagementMode('CONTRACTS')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            managementMode === 'CONTRACTS'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>03. Xem Tiến Độ Theo Các Hợp Đồng ({contracts.length} HĐ)</span>
          <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-900 text-[10px] font-mono font-bold rounded">
            Hợp Đồng Khách Hàng
          </span>
        </button>
      </div>

      {/* SUCCESS TOAST ALERT */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-mono text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: ORDERS LIST TABLE & FILTER                       */}
      {/* ======================================================== */}
      {managementMode === 'LIST' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã LSX (G2610021...), khách hàng, dòng xe..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Interactive Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      filterType === 'ALL'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất Cả Loại
                  </button>
                  <button
                    onClick={() => setFilterType('G')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      filterType === 'G'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    G (Bán TM)
                  </button>
                  <button
                    onClick={() => setFilterType('T')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      filterType === 'T'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    T (Trưng Bày)
                  </button>
                  <button
                    onClick={() => setFilterType('B')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      filterType === 'B'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    B (Bảo Hành)
                  </button>
                </div>

                {/* Status Select */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Lọc theo trạng thái đơn hàng"
                  className="px-2.5 py-1.5 text-xs bg-slate-100 border-0 rounded text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="ALL">Mọi Trạng Thái</option>
                  <option value="INTAKE">Tiếp nhận mới (INTAKE)</option>
                  <option value="SCHEDULED_DRAFT">Lịch tuần gợi ý (DRAFT)</option>
                  <option value="APPROVED_LSX">Đã phê duyệt (APPROVED)</option>
                  <option value="IN_PRODUCTION">Đang sản xuất (IN PROD)</option>
                  <option value="REWORK_ALERT">Cảnh báo Rework (ALERT)</option>
                  <option value="KCS_TEST">KCS Nghiệm thu</option>
                  <option value="COMPLETED">Hoàn tất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Mã LSX</th>
                    <th className="py-3 px-4">Khách Hàng &amp; HĐ</th>
                    <th className="py-3 px-4">Dòng Xe &amp; Phiên Bản</th>
                    <th className="py-3 px-4 text-center">Tiến Độ Chuyền</th>
                    <th className="py-3 px-4 text-center">Cảnh Báo Sức Khỏe</th>
                    <th className="py-3 px-4 text-right">Hạn Giao Xe</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Không tìm thấy lệnh sản xuất nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const health = order.scheduleHealth || (order.status === 'REWORK_ALERT' ? 'REWORK' : 'ON_TRACK');

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => onSelectOrder(order)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-amber-600">
                            <div className="flex items-center gap-1.5">
                              <span>{order.id}</span>
                              {order.priorityLevel === 'P1_CRITICAL' && (
                                <span className="text-[9px] px-1 py-0.2 bg-rose-600 text-white font-bold rounded">
                                  P1
                                </span>
                              )}
                            </div>
                            {order.batchGroupId && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Lô {order.batchGroupId.slice(-8)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block truncate max-w-xs">
                              {order.customerName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {order.contractRef}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">
                              {order.conversionVersion}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {order.baseModel} · {order.seatCapacity} chỗ
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
                                Ngày {order.currentDay}/14 ({order.progress}%)
                              </span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    health === 'REWORK'
                                      ? 'bg-purple-600'
                                      : health === 'DELAYED'
                                      ? 'bg-rose-500'
                                      : health === 'AT_RISK'
                                      ? 'bg-amber-400'
                                      : 'bg-slate-900'
                                  }`}
                                  style={{ width: `${order.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                                health === 'REWORK'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : health === 'DELAYED'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : health === 'AT_RISK'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {health === 'REWORK'
                                ? 'VƯỚNG REWORK'
                                : health === 'DELAYED'
                                ? 'TRỄ HẠN'
                                : health === 'AT_RISK'
                                ? 'NGUY CƠ CHẬM'
                                : 'ĐÚNG HẠN'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 tabular-nums">
                            {order.dueDate}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${
                                order.status === 'IN_PRODUCTION'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.status === 'APPROVED_LSX'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'REWORK_ALERT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : order.status === 'KCS_TEST'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : order.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleSwitchToTracking(order.id)}
                                className="px-2 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded whitespace-nowrap transition-colors"
                                title="Xem bản đồ tracking 17 công đoạn và cảnh báo tiến độ chi tiết"
                              >
                                Tracking
                              </button>
                              <button
                                onClick={() => onSelectOrder(order)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors whitespace-nowrap"
                              >
                                Xem LSX
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: LIVE ORDER JOURNEY TRACKING & PROGRESS HEALTH    */}
      {/* ======================================================== */}
      {managementMode === 'JOURNEY_TRACKING' && (
        <div className="space-y-6">
          {/* ORDER SELECTOR HORIZONTAL STRIP */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-amber-500" />
                Chọn Lệnh Sản Xuất Để Tracking Hành Trình:
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Đang xem: {currentTrackingOrder.id}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {orders.map((ord) => {
                const isSelected = ord.id === currentTrackingOrder.id;
                const health = ord.scheduleHealth || (ord.status === 'REWORK_ALERT' ? 'REWORK' : 'ON_TRACK');

                return (
                  <button
                    key={ord.id}
                    onClick={() => setTrackingOrderId(ord.id)}
                    className={`px-3 py-2 rounded-lg border text-left transition-all shrink-0 min-w-[150px] ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 shadow-2xs ring-1 ring-amber-500/30'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-bold text-slate-900">{ord.id}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                          health === 'REWORK'
                            ? 'bg-purple-100 text-purple-800'
                            : health === 'DELAYED'
                            ? 'bg-rose-100 text-rose-800'
                            : health === 'AT_RISK'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {health === 'REWORK' ? 'REWORK' : health === 'AT_RISK' ? 'CẬN HẠN' : 'CHUẨN'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[140px] mt-0.5">
                      {ord.customerName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-700 block">
                      Ngày {ord.currentDay}/14 ({ord.progress}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COMPREHENSIVE SCHEDULE HEALTH WARNING BANNER */}
          <div className={`p-4 rounded-lg border shadow-xs space-y-2 ${healthAssessment.bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className={`w-5 h-5 ${healthAssessment.iconColor}`} />
                <h3 className="font-extrabold text-sm tracking-tight uppercase font-mono">
                  {healthAssessment.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-600">Hạn giao: <strong>{currentTrackingOrder.dueDate}</strong></span>
                <span className={`px-2 py-0.5 rounded font-bold border ${healthAssessment.badge}`}>
                  {currentTrackingOrder.priorityLevel || 'P1 Khẩn Cấp'}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed font-medium">
              {healthAssessment.description}
            </p>

            <div className="pt-2 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span>Mã LSX: <strong>{currentTrackingOrder.id}</strong> ({currentTrackingOrder.contractRef})</span>
              <span>Khách hàng: <strong>{currentTrackingOrder.customerName}</strong></span>
              <span>Phiên bản: <strong>{currentTrackingOrder.conversionVersion}</strong></span>
              <span>Độ lệch tiến độ: <strong className={currentTrackingOrder.delayDays ? 'text-rose-700' : 'text-emerald-700'}>
                {currentTrackingOrder.delayDays ? `Chậm ${currentTrackingOrder.delayDays} ngày` : '0 ngày (Chuẩn nhịp)'}
              </strong></span>
            </div>
          </div>

          {/* CURRENT WORKSTATION & PROGRESS SNAPSHOT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Vị Trí Công Đoạn Hiện Tại
              </span>
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  {currentTrackingOrder.currentStepName || 'Lắp Ráp Cụm Ghế VIP Điện'}
                </span>
                <span className="text-xs font-mono text-indigo-700 font-semibold block mt-0.5">
                  Bước {currentTrackingOrder.currentStepId || 'S16'} · Tổ {currentTrackingOrder.currentTeamId || 'T16'} (Cụm {currentTrackingOrder.currentCluster || 4})
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-indigo-500" />
                Thời Gian &amp; Tiến Độ Tuyến Tính
              </span>
              <div>
                <span className="text-sm font-bold text-slate-900 font-mono block">
                  Ngày {currentTrackingOrder.currentDay} / 14 Ngày Chuẩn
                </span>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div
                    style={{ width: `${currentTrackingOrder.progress}%` }}
                    className="h-full bg-slate-900 rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-emerald-500" />
                Trạng Thái Đồng Bộ Vật Tư BOM
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`text-sm font-bold block ${
                      currentTrackingOrder.mrpReady ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {currentTrackingOrder.mrpReady ? 'Sẵn Sàng 100% Kho' : 'Thiếu Linh Kiện BOM'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Kho HHCITY0B
                  </span>
                </div>
                <button
                  onClick={() => onSelectOrder(currentTrackingOrder)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                >
                  Xem Spec Đơn
                </button>
              </div>
            </div>
          </div>

          {/* 14-DAY VISUAL ROUTING TIMELINE (17 CÔNG ĐOẠN S01 -> S17 QUA 4 CỤM) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-amber-500" />
                  <span>Bản Đồ Hành Trình 17 Công Đoạn Tuyến Tính (14-Day Production Routing)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi chính xác từng bước công đoạn đã qua, công đoạn đang thi công tại trạm, và các bước tiếp theo
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đã xong
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" /> Đang tại trạm
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Chờ chuyển sang
                </span>
              </div>
            </div>

            {/* 4 Clusters Layout */}
            <div className="space-y-6">
              {CLUSTERS.map((cluster) => {
                const clusterSteps = STEP_ROUTINGS.filter((s) => s.clusterId === cluster.id);
                const isCurrentCluster = currentTrackingOrder.currentCluster === cluster.id;

                return (
                  <div
                    key={cluster.id}
                    className={`rounded-lg border p-4 space-y-3 transition-colors ${
                      isCurrentCluster
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-slate-900 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                          C{cluster.id}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900">
                          {cluster.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <span>Định mức: {cluster.targetDays}</span>
                        <span aria-hidden="true">·</span>
                        <span>{cluster.leadTimeDays} ngày lead time</span>
                        {isCurrentCluster && (
                          <span className="px-2 py-0.2 bg-amber-500 text-slate-950 font-bold rounded text-[10px]">
                            ĐANG THỰC HIỆN TẠI CỤM NÀY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Steps within Cluster */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {clusterSteps.map((step) => {
                        const stepNum = parseInt(step.stepId.replace('S', ''), 10);
                        const currentStepNum = currentTrackingOrder.currentStepId
                          ? parseInt(currentTrackingOrder.currentStepId.replace('S', ''), 10)
                          : 16;

                        const isDone = stepNum < currentStepNum;
                        const isCurrent = stepNum === currentStepNum;
                        const isUpcoming = stepNum > currentStepNum;

                        return (
                          <div
                            key={step.stepId}
                            className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all relative ${
                              isCurrent
                                ? 'border-amber-500 bg-white ring-2 ring-amber-500/40 shadow-sm'
                                : isDone
                                ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                                : 'border-slate-200 bg-white text-slate-500 opacity-75'
                            }`}
                          >
                            {/* Header of Step Card */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900">
                                {step.stepId}
                              </span>
                              {isDone && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Xong
                                </span>
                              )}
                              {isCurrent && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-amber-950 bg-amber-400 px-1.5 py-0.2 rounded animate-pulse">
                                  Đang Tại Trạm
                                </span>
                              )}
                              {isUpcoming && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  Chờ đón
                                </span>
                              )}
                            </div>

                            {/* Step Description */}
                            <div className="font-semibold text-slate-900 text-[11px] line-clamp-2">
                              {step.stepName}
                            </div>

                            {/* Team and Duration info */}
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span>{step.teamName}</span>
                              <span>{step.standardDurationDays} ngày</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GHI NHẬN THỜI GIAN HOÀN THÀNH CÁC CÔNG ĐOẠN & CÁC CÔNG ĐOẠN TRỄ TIẾN ĐỘ */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock4 className="w-4 h-4 text-amber-500" />
                  <span>Ghi Nhận Thời Gian Hoàn Thành Công Đoạn &amp; Giám Sát Trễ Tiến Độ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ghi nhận thời gian hoàn thành thực tế, số giờ sử dụng và lý do trễ tiến độ của từng bước công đoạn trong LSX {currentTrackingOrder.id}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">
                  {completedStepsCount} / 17 Bước Xong
                </span>
                <span className={`px-2.5 py-1 rounded font-bold border ${
                  delayedSteps.length > 0
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {delayedSteps.length} Bước Trễ Tiến Độ
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded">
                  {totalActualHours}h Thực Tế / {totalStandardHours}h ĐM
                </span>
              </div>
            </div>

            {/* CẢNH BÁO CÔNG ĐOẠN TRỄ TIẾN ĐỘ TRONG ĐƠN HÀNG */}
            {delayedSteps.length > 0 && (
              <div className="p-4 bg-rose-50/70 border border-rose-300 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BadgeAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <h4 className="font-extrabold text-xs text-rose-950 uppercase font-mono tracking-wide">
                      Các Công Đoạn Đang Bị Trễ Tiến Độ Trong Đơn Hàng ({delayedSteps.length} Bước)
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                    Cần KCS &amp; Kế Hoạch Xử Lý
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {delayedSteps.map((dStep) => (
                    <div
                      key={dStep.stepId}
                      className="bg-white border border-rose-200 rounded p-3 text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">
                          {dStep.stepId}: {dStep.stepName}
                        </span>
                        <span className="font-mono text-rose-700 font-extrabold px-1.5 py-0.5 bg-rose-100 rounded text-[10px]">
                          Trễ {dStep.delayDays || 1} ngày
                        </span>
                      </div>

                      <div className="p-2 bg-rose-50/50 rounded border border-rose-100 text-[11px]">
                        <span className="text-slate-500 font-semibold block">Nguyên nhân trễ tiến độ:</span>
                        <span className="text-rose-950 font-medium block mt-0.5">
                          ⚠️ {dStep.delayReason || 'Đang vướng lỗi kỹ thuật / thiếu linh kiện'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                        <span>Tổ phụ trách: <strong>{dStep.teamName}</strong></span>
                        <button
                          onClick={() => handleOpenStepRecordModal(dStep)}
                          className="px-2 py-0.5 bg-rose-900 text-white rounded text-[10px] font-bold hover:bg-rose-800 transition-colors"
                        >
                          Cập nhật / Nghiệm thu
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BẢNG CHI TIẾT 17 CÔNG ĐOẠN & GHI NHẬN */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Bước</th>
                    <th className="py-2.5 px-3">Tên Công Đoạn</th>
                    <th className="py-2.5 px-3">Tổ Phụ Trách</th>
                    <th className="py-2.5 px-3">Kế Hoạch Bắt Đầu - Xong</th>
                    <th className="py-2.5 px-3">Thực Tế Xong</th>
                    <th className="py-2.5 px-2 text-center">Giờ ĐM / TT</th>
                    <th className="py-2.5 px-3 text-center">Tình Trạng Tiến Độ</th>
                    <th className="py-2.5 px-3">Nguyên Nhân Trễ / Ghi Chú</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStepExecutions.map((step) => {
                    const isDone = step.status === 'COMPLETED';
                    const isDelayed = step.isDelayed || step.status === 'DELAYED_REWORK';

                    return (
                      <tr
                        key={step.stepId}
                        className={`hover:bg-slate-50 ${
                          isDelayed ? 'bg-rose-50/40' : isDone ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {step.stepId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-[200px] truncate">
                          {step.stepName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span>{step.teamName} (C{step.clusterId})</span>
                            {onNavigate && (
                              <button
                                onClick={() =>
                                  onNavigate({
                                    tab: 'scheduling',
                                    subView: 'DAILY_DISPATCH',
                                    teamId: step.teamId,
                                    clusterId: step.clusterId,
                                    orderId: currentTrackingOrder?.id,
                                    sourceDesc: `Công đoạn ${step.stepName} (${step.teamName})`,
                                  })
                                }
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-sans font-medium flex items-center gap-0.5 cursor-pointer transition-colors"
                                title="Xem kế hoạch ngày và thợ phụ trách tại tổ này"
                              >
                                <span>Lịch</span>
                                <ArrowUpRight className="w-2.5 h-2.5 text-indigo-600" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                          {step.plannedStartDate} → {step.plannedCompletionDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-[11px]">
                          {step.actualCompletionDate || (isDelayed ? 'Chưa xong (Vướng)' : 'Đang thực hiện')}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[11px]">
                          <span>{step.standardHours}h / </span>
                          <strong className={isDelayed ? 'text-rose-600' : 'text-slate-900'}>
                            {step.actualHours || step.standardHours}h
                          </strong>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDelayed ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              TRỄ {step.delayDays || 1} NGÀY
                            </span>
                          ) : isDone ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ĐÃ HOÀN THÀNH
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              ĐANG TIẾN HÀNH
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-[220px]">
                          {step.delayReason ? (
                            <span className="text-rose-900 font-medium">⚠️ {step.delayReason}</span>
                          ) : step.completedByPosition ? (
                            <span className="text-emerald-800 font-mono text-[10px]">✓ {step.completedByPosition}</span>
                          ) : (
                            <span className="text-slate-400 italic">Theo kế hoạch</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            disabled={isReadOnly}
                            onClick={() => handleOpenStepRecordModal(step)}
                            className="px-2 py-1 text-[11px] font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors flex items-center gap-1 mx-auto disabled:opacity-40"
                            title="Ghi nhận ngày hoàn thành thực tế và lý do trễ nếu có"
                          >
                            <PenSquare className="w-3 h-3 text-amber-600" />
                            <span>Ghi Nhận</span>
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
      {/* MODE 3: THEO DÕI TIẾN ĐỘ THEO CÁC HỢP ĐỒNG               */}
      {/* ======================================================== */}
      {managementMode === 'CONTRACTS' && (
        <div className="space-y-6">
          {/* CONTRACT SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Tổng Hợp Đồng Đang Triển Khai</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                  {contracts.length} HĐ
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                  {contracts.reduce((sum, c) => sum + c.totalVehicles, 0)} Xe Tổng
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Bao gồm hợp đồng xe bán (G), trưng bày (T), bảo hành (B)</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Tổng Giá Trị Hợp Đồng</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                  {(contracts.reduce((sum, c) => sum + c.contractValueVND, 0) / 1000000000).toFixed(2)} Tỷ
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">VND</span>
              </div>
              <p className="text-[11px] text-slate-400">Doanh số xe theo các hợp đồng ký kết trong Quý IV/2026</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">Hợp Đồng Đúng Tiến Độ Cam Kết</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-600 tabular-nums">
                  {contracts.filter((c) => c.status === 'ON_TRACK').length} / {contracts.length}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                  {Math.round((contracts.filter((c) => c.status === 'ON_TRACK').length / contracts.length) * 100)}% OTD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Không có rủi ro trễ hạn giao xe cho khách hàng</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-1">
              <span className="text-xs font-semibold text-slate-500">HĐ Có Nguy Cơ / Chậm Tiến Độ</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-rose-600 tabular-nums">
                  {contracts.filter((c) => c.status === 'AT_RISK' || c.status === 'DELAYED').length} HĐ
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">
                  Cần Giám Sát
                </span>
              </div>
              <p className="text-[11px] text-slate-400">HĐ Vận tải Hoa Mai (G2610023 vướng ampli), HĐ Thái (B2610002 CAN-bus)</p>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Lọc Hợp Đồng:
              </span>
              <button
                onClick={() => setContractFilter('ALL')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  contractFilter === 'ALL'
                    ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất Cả ({contracts.length})
              </button>
              <button
                onClick={() => setContractFilter('ON_TRACK')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  contractFilter === 'ON_TRACK'
                    ? 'bg-emerald-900 text-white font-bold shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Đúng Tiến Độ ({contracts.filter((c) => c.status === 'ON_TRACK').length})
              </button>
              <button
                onClick={() => setContractFilter('AT_RISK_DELAYED')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  contractFilter === 'AT_RISK_DELAYED'
                    ? 'bg-rose-900 text-white font-bold shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                Cảnh Báo / Trễ Tiến Độ ({contracts.filter((c) => c.status === 'AT_RISK' || c.status === 'DELAYED').length})
              </button>
            </div>

            <span className="text-xs font-mono text-slate-500">
              Cập nhật dữ liệu hợp đồng theo thời gian thực
            </span>
          </div>

          {/* LIST OF CONTRACT CARDS WITH PER-VEHICLE BREAKDOWN */}
          <div className="space-y-4">
            {contracts
              .filter((c) => {
                if (contractFilter === 'ON_TRACK') return c.status === 'ON_TRACK';
                if (contractFilter === 'AT_RISK_DELAYED') return c.status === 'AT_RISK' || c.status === 'DELAYED';
                return true;
              })
              .map((contract) => {
                const contractOrders = orders.filter((o) => contract.orderIds.includes(o.id));
                const isDelayed = contract.status === 'DELAYED';
                const isAtRisk = contract.status === 'AT_RISK';

                return (
                  <div
                    key={contract.id}
                    className={`bg-white border rounded-lg p-5 shadow-2xs space-y-4 transition-all ${
                      isDelayed
                        ? 'border-rose-300 ring-1 ring-rose-300/40'
                        : isAtRisk
                        ? 'border-amber-300 ring-1 ring-amber-300/30'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header of Contract Card */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-slate-900">
                            {contract.contractCode}
                          </span>
                          <span className="text-slate-400">·</span>
                          <h4 className="font-bold text-sm text-slate-800">
                            {contract.customerName}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                            {contract.customerType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>Ngày ký: <strong>{contract.signingDate}</strong></span>
                          <span>Hạn bàn giao hợp đồng: <strong className={isDelayed ? 'text-rose-600' : 'text-slate-900'}>{contract.deliveryDeadline}</strong></span>
                          <span>Giá trị: <strong>{(contract.contractValueVND / 1000000).toLocaleString('vi-VN')} đ</strong></span>
                        </div>
                      </div>

                      {/* Contract Health Badge */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded text-xs font-bold border ${
                            isDelayed
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : isAtRisk
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {isDelayed
                            ? 'CHẬM TIẾN ĐỘ CAM KẾT'
                            : isAtRisk
                            ? 'NGUY CƠ TRỄ HẠN'
                            : 'ĐẢM BẢO ĐÚNG HẸN'}
                        </span>
                      </div>
                    </div>

                    {/* Contract note */}
                    <p className="text-xs text-slate-600 italic">
                      💡 {contract.notes}
                    </p>

                    {/* Breakdown of Vehicles under this Contract */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
                        <span>Danh Sách Xe Thuộc Hợp Đồng ({contractOrders.length} Xe Đang Xử Lý):</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Tiến Độ Từng Xe
                        </span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {contractOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900 w-20">
                                {ord.id}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {ord.conversionVersion}
                                </span>
                                <span className="text-[11px] text-indigo-700 font-mono block mt-0.5">
                                  Bước {ord.currentStepId}: {ord.currentStepName} ({ord.currentTeamId})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  Tiến độ: Ngày {ord.currentDay}/14
                                </span>
                                <span className="font-mono font-bold text-xs text-slate-900">
                                  {ord.progress}%
                                </span>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  ord.scheduleHealth === 'REWORK'
                                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                                    : ord.scheduleHealth === 'AT_RISK'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {ord.scheduleHealth}
                              </span>

                              <button
                                onClick={() => handleSwitchToTracking(ord.id)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Tracking</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full my-8 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tiếp Nhận Đơn Hàng Mới &amp; Tạo Lệnh Sản Xuất
                </h3>
                <p className="text-xs text-slate-500">
                  Mã LSX tự động tính toán theo quy tắc: <strong>{previewId}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Chọn Loại Đơn Hàng & Tự Động Điều Chỉnh Mã LSX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Chọn Loại Đơn Hàng Sản Xuất *</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      (Quyết định tiền tố mã LSX: G / T / B)
                    </span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    Quy chuẩn mã: [Loại][Năm][Tháng][STT]
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Card 1: Đơn bán */}
                  <div
                    onClick={() => setOrderType('G')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      orderType === 'G'
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900 text-amber-400">
                        TIỀN TỐ G
                      </span>
                      {orderType === 'G' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1.5">
                      Đơn Bán (Commercial)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Hợp đồng bán xe mới cho khách cá nhân, doanh nghiệp vận tải
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-amber-700">G2611...</strong>
                    </div>
                  </div>

                  {/* Card 2: Đơn trưng bày */}
                  <div
                    onClick={() => setOrderType('T')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      orderType === 'T'
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-200">
                        TIỀN TỐ T
                      </span>
                      {orderType === 'T' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1.5">
                      Đơn Trưng Bày (Showroom)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Xe demo, triển lãm sự kiện, giao đại lý giới thiệu sản phẩm
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-indigo-700">T2611...</strong>
                    </div>
                  </div>

                  {/* Card 3: Đơn bảo hành */}
                  <div
                    onClick={() => setOrderType('B')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      orderType === 'B'
                        ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-rose-900 text-rose-200">
                        TIỀN TỐ B
                      </span>
                      {orderType === 'B' && (
                        <CheckCircle2 className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1.5">
                      Đơn Bảo Hành (Rework)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Bảo hành chuyên sâu, sửa chữa lỗi kỹ thuật, nâng cấp nội thất
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-rose-700">B2611...</strong>
                    </div>
                  </div>
                </div>

                {/* Banner kết quả mã LSX điều chỉnh theo loại đơn */}
                <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-amber-400 text-slate-950 font-black font-mono flex items-center justify-center text-sm">
                      {orderType}
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-300 block">
                        Đang chọn: <strong>{orderType === 'G' ? 'Đơn Bán' : orderType === 'T' ? 'Đơn Trưng Bày' : 'Đơn Bảo Hành'}</strong>
                      </span>
                      <span className="text-xs text-slate-400">
                        Mã LSX tự động gán vào hệ thống:
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-lg font-black tracking-wider text-amber-400">
                      {previewId}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      (STT tịnh tiến tự động)
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer and Contract */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Khách Hàng / Đơn Vị Tiếp Nhận *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="VD: Cty Du Lịch Hoa Mai, Khách VIP Mr. Tuấn..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Hợp Đồng / Mã Tham Chiếu KD
                  </label>
                  <input
                    type="text"
                    value={contractRef}
                    onChange={(e) => setContractRef(e.target.value)}
                    placeholder="VD: HĐ-2026/11-04"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Base Model & Version */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dòng Xe Cơ Sở (Base Chassis)
                  </label>
                  <select
                    value={baseModel}
                    onChange={(e) => setBaseModel(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Ford Transit 18c Premium">Ford Transit 18c Premium 2026</option>
                    <option value="Ford Transit 16c">Ford Transit 16c Standard</option>
                    <option value="Hyundai Solati 16c">Hyundai Solati 16c H350</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phiên Bản Độ Limousine DCAR
                  </label>
                  <select
                    value={conversionVersion}
                    onChange={(e) => setConversionVersion(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Ford Thương Gia 11c (10 ghế VIP)">Ford Thương Gia 11c (10 ghế VIP)</option>
                    <option value="Ford Thương Gia 12c">Ford Thương Gia 12c</option>
                    <option value="Ford VIP Lounge 2026">Ford VIP Lounge 2026 (Triển lãm)</option>
                    <option value="Solati Maybach 10 chỗ 2025">Solati Maybach 10 chỗ 2025</option>
                    <option value="Solati Thượng Đỉnh 10c">Solati Thượng Đỉnh 10c</option>
                    <option value="Ford President Maybach Edition 10c">Ford President Maybach Edition 10c</option>
                  </select>
                </div>
              </div>

              {/* Exterior & Interior Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Màu Sơn Ngoại Thất
                  </label>
                  <input
                    type="text"
                    value={exteriorColor}
                    onChange={(e) => setExteriorColor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chất Liệu &amp; Màu Da Nội Thất
                  </label>
                  <input
                    type="text"
                    value={interiorColor}
                    onChange={(e) => setInteriorColor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày Nhận Xe Cơ Sở (Start)
                  </label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày Giao Xe Hẹn Khách (Due Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Selected Options Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tùy Chọn Trang Thiết Bị &amp; Cấu Hình Cao Cấp
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded">
                  {availableOptions.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(opt)}
                        onChange={() => handleToggleOption(opt)}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi Chú Đơn Hàng &amp; Yêu Cầu Đặc Biệt
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm về yêu cầu bàn giao, đóng cữ dập..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Modal footer actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Xác Nhận Tạo Lệnh SX ({previewId})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAIL MODAL */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full my-8 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-slate-900 text-amber-400 font-mono font-bold text-sm flex items-center justify-center">
                  {selectedOrderModal.id.slice(0, 3)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lệnh Sản Xuất: {selectedOrderModal.id}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Hợp đồng: {selectedOrderModal.contractRef} · Tiếp nhận: {selectedOrderModal.receivedDate}
                  </span>
                </div>
              </div>
              <button
                onClick={onCloseOrderModal}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-100 space-y-1">
                <span className="text-slate-500 block">Khách Hàng / Đơn Vị:</span>
                <strong className="text-slate-900 text-sm block">
                  {selectedOrderModal.customerName}
                </strong>
                <span className="text-slate-600 block">
                  Phiên bản: {selectedOrderModal.conversionVersion}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100 space-y-1">
                <span className="text-slate-500 block">Tiến Độ Tuyến Tính 14 Ngày:</span>
                <strong className="text-slate-900 text-sm block font-mono">
                  Ngày {selectedOrderModal.currentDay} / 14 ({selectedOrderModal.progress}%)
                </strong>
                <span className="text-slate-600 block">
                  Hạn giao: <strong>{selectedOrderModal.dueDate}</strong>
                </span>
              </div>
            </div>

            {/* Options list */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Danh Sách Tùy Chọn Đã Cấu Hình:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedOrderModal.options.map((opt) => (
                  <div key={opt} className="p-2 bg-slate-50 border border-slate-100 rounded flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-800">{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  handleSwitchToTracking(selectedOrderModal.id);
                  onCloseOrderModal();
                }}
                className="px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded transition-colors flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Xem Bản Đồ Tracking 17 Công Đoạn</span>
              </button>

              <button
                onClick={onCloseOrderModal}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GHI NHẬN THỜI GIAN HOÀN THÀNH CÔNG ĐOẠN & NGUYÊN NHÂN TRỄ */}
      {recordingStep && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full my-8 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PenSquare className="w-4 h-4 text-amber-500" />
                  <span>Ghi Nhận Tiến Độ Công Đoạn {recordingStep.stepId}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lệnh sản xuất: <strong>{currentTrackingOrder.id}</strong> ({currentTrackingOrder.customerName})
                </p>
              </div>
              <button
                onClick={() => setRecordingStep(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStepExecution} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-semibold">Tên công đoạn:</span>
                <strong className="text-slate-900 block text-xs">{recordingStep.stepName}</strong>
                <span className="text-indigo-700 font-mono text-[11px] block mt-0.5">
                  Tổ: {recordingStep.teamName} (Cụm {recordingStep.clusterId}) · Định mức chuẩn: {recordingStep.standardHours}h
                </span>
              </div>

              {/* Completion date and hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Ngày Hoàn Thành Thực Tế *
                  </label>
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Số Giờ Công Thực Tế Đã Dùng *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={recordHours}
                    onChange={(e) => setRecordHours(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quality pass/rework status */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Đánh Giá Chất Lượng KCS Tại Trạm
                </label>
                <select
                  value={recordQuality}
                  onChange={(e) => setRecordQuality(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 font-medium focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="PASS">✓ Đạt Chuẩn (PASS) - Nghiệm thu chuyển trạm</option>
                  <option value="REWORK_REQUIRED">⚠️ Không Đạt - Phát sinh lỗi Rework / Sửa hàng</option>
                  <option value="PENDING_CHECK">⏳ Đang chờ KCS kiểm tra chuyên sâu</option>
                </select>
              </div>

              {/* Delayed progress toggle & reason */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900">
                  <input
                    type="checkbox"
                    checked={recordIsDelayed}
                    onChange={(e) => setRecordIsDelayed(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Công đoạn này có bị trễ tiến độ so với kế hoạch không?</span>
                </label>

                {recordIsDelayed && (
                  <div className="space-y-2 pt-2 border-t border-amber-200/60">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Số Ngày Trễ Tiến Độ:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={recordDelayDays}
                        onChange={(e) => setRecordDelayDays(parseInt(e.target.value, 10) || 1)}
                        className="w-24 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-rose-700"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Ghi Nhận Nguyên Nhân Trễ Tiến Độ *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={recordDelayReason}
                        onChange={(e) => setRecordDelayReason(e.target.value)}
                        placeholder="VD: Chờ keo dán sàn khô, thiếu ampli JBL từ kho HHCITY0B, chập vi mạch CAN-bus..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Additional notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ghi Chú Tổ Trưởng / KCS Xác Nhận
                </label>
                <input
                  type="text"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Xác nhận bởi tổ trưởng hoặc KCS..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecordingStep(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-2xs cursor-pointer"
                >
                  Lưu Ghi Nhận Công Đoạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
