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
import {
  STEP_ROUTINGS,
  CLUSTERS,
  INITIAL_CONTRACTS,
  INITIAL_TEAMS,
  createDefaultStepExecutions,
} from '../data/mockData';
import {
  generateCompletedOrdersCsv,
  downloadCsvFile,
  archiveCompletedOrderToSheet,
} from '../services/googleSheetService';
import { ProductionOrderPrintModal } from './ProductionOrderPrintModal';
import { ProductionFlowDiagram } from './ProductionFlowDiagram';
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
  Workflow,
  FileSpreadsheet,
  Edit3,
  PauseCircle,
  Download,
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
  initialMode?: 'FLOW_DIAGRAM' | 'JOURNEY_TRACKING' | 'LIST' | 'CONTRACTS' | 'COMPLETED_ARCHIVE';
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
  // Navigation Mode (defaults to FLOW_DIAGRAM for intuitive shop-floor overview)
  const [managementMode, setManagementMode] = useState<
    'FLOW_DIAGRAM' | 'JOURNEY_TRACKING' | 'LIST' | 'CONTRACTS' | 'COMPLETED_ARCHIVE'
  >(initialMode ?? 'FLOW_DIAGRAM');
  const [trackingOrderId, setTrackingOrderId] = useState<string>(
    initialOrderId ?? (orders[4]?.id || 'B2610002')
  );
  const [printingOrder, setPrintingOrder] = useState<OrderItem | null>(null);

  // Phân quyền Quản lý đơn hàng: TPSX (Production_Manager), NV Đơn Hàng (Order_Admin), Ban Giám Đốc (Executive)
  const canManageOrders = !isReadOnly && (
    currentRole === 'Order_Admin' ||
    currentRole === 'Production_Manager' ||
    currentRole === 'Executive'
  );

  // Edit Order Modal State (Chỉnh sửa thông tin đơn hàng & phân bổ các tổ SX song song)
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContractRef, setEditContractRef] = useState('');
  const [editBaseModel, setEditBaseModel] = useState('');
  const [editConversionVersion, setEditConversionVersion] = useState('');
  const [editSeatCapacity, setEditSeatCapacity] = useState<number>(11);
  const [editExteriorColor, setEditExteriorColor] = useState('');
  const [editInteriorColor, setEditInteriorColor] = useState('');
  const [editReceivedDate, setEditReceivedDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editScheduledStartDate, setEditScheduledStartDate] = useState('');
  const [editScheduledEndDate, setEditScheduledEndDate] = useState('');
  const [editStatus, setEditStatus] = useState<OrderStatus>('IN_PRODUCTION');
  const [editPriorityLevel, setEditPriorityLevel] = useState<PriorityLevel>('P3_NORMAL');
  const [editActiveTeamIds, setEditActiveTeamIds] = useState<string[]>([]);
  const [editHoldReason, setEditHoldReason] = useState('');
  const [editHoldDate, setEditHoldDate] = useState('');
  const [editVinNumber, setEditVinNumber] = useState('');
  const [editDeliveryLocation, setEditDeliveryLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);

  // Quick Status Transition Modal State (Chuyển đổi trạng thái, Treo đơn, Chờ giao, Hoàn thành)
  const [statusChangeOrder, setStatusChangeOrder] = useState<OrderItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('IN_PRODUCTION');
  const [statusHoldReason, setStatusHoldReason] = useState<string>('');
  const [statusHoldDate, setStatusHoldDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [statusCompletedDate, setStatusCompletedDate] = useState<string>(new Date().toISOString().slice(0, 10));

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
  const [fulfillmentType, setFulfillmentType] = useState<'NEW_PRODUCTION' | 'PICK_FROM_BTP'>('NEW_PRODUCTION');
  const [selectedBtpOrderNId, setSelectedBtpOrderNId] = useState<string>('');
  const [btpStatusForN, setBtpStatusForN] = useState<'IN_INVENTORY' | 'ALLOCATED_TO_SALES'>('IN_INVENTORY');
  const [allocatedToSalesOrderCode, setAllocatedToSalesOrderCode] = useState<string>('');
  const [assigningBtpOrder, setAssigningBtpOrder] = useState<OrderItem | null>(null);
  const [targetSalesOrderId, setTargetSalesOrderId] = useState<string>('');

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

  // Danh sách các đơn BTP (N) đang tồn kho sẵn sàng xuất
  const availableNOrdersInInventory = useMemo(() => {
    return orders.filter((o) => o.orderType === 'N' && (o.btpStatus === 'IN_INVENTORY' || !o.btpStatus));
  }, [orders]);

  // Danh sách các đơn bán (G) đang xử lý
  const availableGOrdersForAllocation = useMemo(() => {
    return orders.filter((o) => o.orderType === 'G' && o.status !== 'COMPLETED');
  }, [orders]);

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
    
    // Nếu đơn bán G chọn từ BTP (N)
    const pickedN = orderType === 'G' && fulfillmentType === 'PICK_FROM_BTP'
      ? orders.find((o) => o.id === selectedBtpOrderNId)
      : undefined;

    const newOrder: OrderItem = {
      id: newId,
      orderType,
      customerName: customerName.trim(),
      contractRef: contractRef.trim() || `HĐ-${newId}`,
      baseModel: pickedN ? pickedN.baseModel : baseModel,
      conversionVersion: pickedN ? pickedN.conversionVersion : conversionVersion,
      seatCapacity,
      exteriorColor,
      interiorColor: pickedN ? pickedN.interiorColor : interiorColor,
      options: selectedOptions,
      receivedDate,
      dueDate,
      scheduledStartDate: receivedDate,
      scheduledEndDate: dueDate,
      status: 'INTAKE',
      progress: pickedN ? 50 : 0,
      currentDay: pickedN ? 7 : 1,
      currentCluster: pickedN ? 3 : 1,
      currentStepId: pickedN ? 'S14' : 'S01',
      currentTeamId: pickedN ? 'T14' : 'T01',
      currentStepName: pickedN ? 'Ghép BTP vào xe nền, hạ sàn & cách âm' : 'Tiếp nhận mới, chờ cắt phôi CNC',
      priorityLevel: 'P3_NORMAL',
      scheduleHealth: 'ON_TRACK',
      delayDays: 0,
      standardLeadTimeDays: pickedN ? 8 : 14,
      actualLeadTimeDays: 0,
      mrpReady: !!pickedN,
      crpFeasible: true,
      // BTP Fields
      fulfillmentType: orderType === 'G' ? fulfillmentType : undefined,
      pickedFromBtpOrderId: pickedN ? pickedN.id : undefined,
      pickedFromBtpOrderCode: pickedN ? `${pickedN.id} - ${pickedN.customerName}` : undefined,
      btpStatus: orderType === 'N' ? btpStatusForN : undefined,
      allocatedToSalesOrderId: orderType === 'N' && btpStatusForN === 'ALLOCATED_TO_SALES' ? allocatedToSalesOrderCode : undefined,
      allocatedDate: orderType === 'N' && btpStatusForN === 'ALLOCATED_TO_SALES' ? receivedDate : undefined,
      notes: notes + (pickedN ? ` [LẮP TỪ BTP]: Chọn từ đơn BTP tồn kho ${pickedN.id}. Tiết kiệm 6 ngày chuyền.` : ''),
    };

    onAddOrder(newOrder);

    // Nếu chọn từ đơn N tồn kho, cập nhật đơn N thành Đã xuất cho đơn bán G này
    if (pickedN) {
      onUpdateOrder({
        ...pickedN,
        btpStatus: 'ALLOCATED_TO_SALES',
        allocatedToSalesOrderId: newId,
        allocatedToSalesOrderCode: `${newId} - ${customerName.trim()}`,
        allocatedDate: receivedDate,
        notes: `${pickedN.notes} [ĐÃ XUẤT CHO ĐƠN G]: Đã xuất cấp bán thành phẩm cho đơn ${newId} (${customerName.trim()}) vào ngày ${receivedDate}.`,
      });
    }

    setShowCreateModal(false);
    // Reset form
    setCustomerName('');
    setContractRef('');
    setNotes('');
    setFulfillmentType('NEW_PRODUCTION');
    setSelectedBtpOrderNId('');
    setSuccessToast(`Đã tạo thành công đơn hàng ${newId} (${orderType === 'G' ? 'Đơn Bán' : orderType === 'N' ? 'Bán Thành Phẩm BTP' : orderType})!`);
  };

  // Handler: Xuất đơn BTP (N) cho một đơn hàng bán (G) cụ thể
  const handleConfirmAllocateBtpToSales = () => {
    if (!assigningBtpOrder || !targetSalesOrderId) return;
    const targetG = orders.find((o) => o.id === targetSalesOrderId);
    if (!targetG) return;

    // Cập nhật đơn BTP (N)
    const updatedN: OrderItem = {
      ...assigningBtpOrder,
      btpStatus: 'ALLOCATED_TO_SALES',
      allocatedToSalesOrderId: targetG.id,
      allocatedToSalesOrderCode: `${targetG.id} - ${targetG.customerName}`,
      allocatedDate: new Date().toISOString().split('T')[0],
      notes: `${assigningBtpOrder.notes} [ĐÃ XUẤT CHO ĐƠN G]: Đã xuất cho đơn ${targetG.id} (${targetG.customerName}) ngày ${new Date().toLocaleDateString('vi-VN')}.`,
    };
    onUpdateOrder(updatedN);

    // Cập nhật đơn bán (G)
    const updatedG: OrderItem = {
      ...targetG,
      fulfillmentType: 'PICK_FROM_BTP',
      pickedFromBtpOrderId: assigningBtpOrder.id,
      pickedFromBtpOrderCode: `${assigningBtpOrder.id} - ${assigningBtpOrder.customerName}`,
      notes: `${targetG.notes} [BỔ SUNG BTP]: Nhận cụm BTP từ đơn kho ${assigningBtpOrder.id}.`,
    };
    onUpdateOrder(updatedG);

    setAssigningBtpOrder(null);
    setTargetSalesOrderId('');
    setSuccessToast(`Đã xuất đơn BTP ${assigningBtpOrder.id} cho đơn bán ${targetG.id} thành công!`);
  };

  // HANDLER: Mở form chỉnh sửa thông tin đơn hàng
  const handleOpenEditModal = (order: OrderItem) => {
    if (!canManageOrders) return;
    setEditingOrder(order);
    setEditCustomerName(order.customerName);
    setEditContactPerson(order.contactPerson || '');
    setEditContactPhone(order.contactPhone || '');
    setEditContractRef(order.contractRef || '');
    setEditBaseModel(order.baseModel);
    setEditConversionVersion(order.conversionVersion);
    setEditSeatCapacity(order.seatCapacity || 11);
    setEditExteriorColor(order.exteriorColor);
    setEditInteriorColor(order.interiorColor);
    setEditReceivedDate(order.receivedDate);
    setEditDueDate(order.dueDate);
    setEditScheduledStartDate(order.scheduledStartDate || order.receivedDate);
    setEditScheduledEndDate(order.scheduledEndDate || order.dueDate);
    setEditStatus(order.status);
    setEditPriorityLevel(order.priorityLevel || 'P3_NORMAL');
    setEditActiveTeamIds(
      order.activeTeamIds && order.activeTeamIds.length > 0
        ? [...order.activeTeamIds]
        : [order.currentTeamId || 'T01']
    );
    setEditHoldReason(order.holdReason || '');
    setEditHoldDate(order.holdDate || new Date().toISOString().slice(0, 10));
    setEditVinNumber(order.vinNumber || '');
    setEditDeliveryLocation(order.deliveryLocation || '');
    setEditNotes(order.notes || '');
    setEditOptions(order.options ? [...order.options] : []);
  };

  const handleToggleEditTeam = (teamId: string) => {
    if (editActiveTeamIds.includes(teamId)) {
      if (editActiveTeamIds.length === 1) return; // Luôn giữ ít nhất 1 tổ
      setEditActiveTeamIds(editActiveTeamIds.filter((t) => t !== teamId));
    } else {
      setEditActiveTeamIds([...editActiveTeamIds, teamId]);
    }
  };

  const handleToggleEditOption = (opt: string) => {
    if (editOptions.includes(opt)) {
      setEditOptions(editOptions.filter((o) => o !== opt));
    } else {
      setEditOptions([...editOptions, opt]);
    }
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const primaryTeamId = editActiveTeamIds[0] || editingOrder.currentTeamId || 'T01';
    const updatedOrder: OrderItem = {
      ...editingOrder,
      customerName: editCustomerName.trim(),
      contactPerson: editContactPerson.trim(),
      contactPhone: editContactPhone.trim(),
      contractRef: editContractRef.trim(),
      baseModel: editBaseModel,
      conversionVersion: editConversionVersion,
      seatCapacity: editSeatCapacity,
      exteriorColor: editExteriorColor,
      interiorColor: editInteriorColor,
      receivedDate: editReceivedDate,
      dueDate: editDueDate,
      scheduledStartDate: editScheduledStartDate,
      scheduledEndDate: editScheduledEndDate,
      status: editStatus,
      priorityLevel: editPriorityLevel,
      currentTeamId: primaryTeamId,
      activeTeamIds: editActiveTeamIds,
      holdReason: editStatus === 'ON_HOLD' ? editHoldReason.trim() : undefined,
      holdDate: editStatus === 'ON_HOLD' ? editHoldDate : undefined,
      vinNumber: editVinNumber.trim(),
      deliveryLocation: editDeliveryLocation.trim(),
      notes: editNotes.trim(),
      options: editOptions,
    };

    onUpdateOrder(updatedOrder);
    setEditingOrder(null);
    setSuccessToast(`Đã cập nhật thông tin đơn hàng ${updatedOrder.id} (${updatedOrder.customerName}) thành công!`);
  };

  // HANDLER: Mở modal chuyển đổi trạng thái nhanh
  const handleOpenStatusModal = (order: OrderItem) => {
    if (!canManageOrders) return;
    setStatusChangeOrder(order);
    setTargetStatus(order.status);
    setStatusHoldReason(order.holdReason || '');
    setStatusHoldDate(order.holdDate || new Date().toISOString().slice(0, 10));
    setStatusCompletedDate(order.completedDate || new Date().toISOString().slice(0, 10));
  };

  const handleSaveStatusTransition = () => {
    if (!statusChangeOrder) return;

    let updated: OrderItem = {
      ...statusChangeOrder,
      status: targetStatus,
    };

    if (targetStatus === 'ON_HOLD') {
      const reason = statusHoldReason.trim() || 'Chờ khách hàng chốt phương án thiết kế';
      updated = {
        ...updated,
        holdReason: reason,
        holdDate: statusHoldDate,
        notes: `${updated.notes} [TREO ĐƠN ${statusHoldDate}]: ${reason}`,
      };
    } else if (targetStatus === 'COMPLETED') {
      updated = {
        ...updated,
        progress: 100,
        currentDay: 14,
        completedDate: statusCompletedDate,
        archivedToExcel: true,
        archivedDate: new Date().toISOString().slice(0, 10),
        notes: `${updated.notes} [HOÀN THÀNH & LƯU TRỮ]: Nghiệm thu xuất xưởng ngày ${statusCompletedDate}.`,
      };
      // Đồng bộ sang Google Sheet nếu có kết nối
      archiveCompletedOrderToSheet(updated).catch(() => {});
    } else if (targetStatus === 'READY_FOR_DELIVERY') {
      updated = {
        ...updated,
        progress: 98,
        inspection120Pass: true,
        notes: `${updated.notes} [CHỜ GIAO XE]: Đã nghiệm thu KCS 120 điểm đạt chuẩn, chuyển bãi chờ bàn giao.`,
      };
    } else if (targetStatus === 'PENDING_DEPLOYMENT') {
      updated = {
        ...updated,
        notes: `${updated.notes} [CHỜ TRIỂN KHAI]: Chờ duyệt kế hoạch tuần từ TPSX.`,
      };
    }

    onUpdateOrder(updated);
    setStatusChangeOrder(null);
    setSuccessToast(`Đã chuyển đổi trạng thái đơn ${updated.id} sang "${targetStatus}" thành công!`);
  };

  // HANDLER: Tải file CSV Kho lưu trữ đơn hoàn thành
  const handleDownloadCompletedArchiveCsv = () => {
    const csv = generateCompletedOrdersCsv(orders);
    downloadCsvFile(`LuuTru_DonHoanThanh_DCAR_${new Date().toISOString().split('T')[0]}.csv`, csv);
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

  // Danh sách các đơn hàng đã hoàn thành / lưu trữ Excel
  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'COMPLETED' || o.archivedToExcel);
  }, [orders]);

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
    if (!currentTrackingOrder) return [];
    if (currentTrackingOrder.stepExecutions && currentTrackingOrder.stepExecutions.length > 0) {
      return currentTrackingOrder.stepExecutions;
    }
    return createDefaultStepExecutions(
      currentTrackingOrder.id || 'ORDER',
      currentTrackingOrder.currentStepId || 'S01',
      currentTrackingOrder.receivedDate || currentTrackingOrder.scheduledStartDate || '2026-10-28'
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
          onClick={() => setManagementMode('FLOW_DIAGRAM')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            managementMode === 'FLOW_DIAGRAM'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4 text-amber-500" />
          <span>01. Sơ Đồ Dòng Chảy Sản Xuất (17 Tổ / 4 Cụm)</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold rounded">
            Mã Màu Lô Hẹn Giao
          </span>
        </button>

        <button
          onClick={() => setManagementMode('JOURNEY_TRACKING')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
          onClick={() => setManagementMode('LIST')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            managementMode === 'LIST'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>03. Danh Sách Lệnh Sản Xuất ({orders.length} Đơn)</span>
        </button>

        <button
          onClick={() => setManagementMode('CONTRACTS')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            managementMode === 'CONTRACTS'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>04. Tiến Độ Hợp Đồng ({contracts.length} HĐ)</span>
          <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-900 text-[10px] font-mono font-bold rounded">
            Hợp Đồng Khách Hàng
          </span>
        </button>

        <button
          onClick={() => setManagementMode('COMPLETED_ARCHIVE')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            managementMode === 'COMPLETED_ARCHIVE'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>05. Kho Lưu Trữ Đơn Hoàn Thành ({orders.filter((o) => o.status === 'COMPLETED' || o.archivedToExcel).length} Đơn)</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 text-[10px] font-mono font-bold rounded">
            Lưu Trữ Excel
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
      {/* MODE 0: SƠ ĐỒ DÒNG CHẢY SẢN XUẤT (17 TỔ / 4 CỤM)         */}
      {/* ======================================================== */}
      {managementMode === 'FLOW_DIAGRAM' && (
        <ProductionFlowDiagram
          orders={orders}
          onSelectOrder={onSelectOrder}
          onNavigate={onNavigate}
          onUpdateOrder={onUpdateOrder}
          isReadOnly={isReadOnly}
        />
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
                    onClick={() => setFilterType('N')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      filterType === 'N'
                        ? 'bg-white text-emerald-800 shadow-sm font-bold'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    N (Bán Thành Phẩm BTP)
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{order.id}</span>
                              <span
                                className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                                  order.orderType === 'G'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.orderType === 'N'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {order.orderType === 'G' ? 'ĐƠN G' : order.orderType === 'N' ? 'BTP (N)' : order.orderType}
                              </span>
                              {order.priorityLevel === 'P1_CRITICAL' && (
                                <span className="text-[9px] px-1 py-0.2 bg-rose-600 text-white font-bold rounded">
                                  P1
                                </span>
                              )}
                            </div>

                            {/* BTP specific badges */}
                            {order.orderType === 'N' && (
                              <div className="mt-1">
                                {order.btpStatus === 'ALLOCATED_TO_SALES' ? (
                                  <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-900 border border-cyan-300">
                                    Đã xuất cho đơn G: {order.allocatedToSalesOrderId || ''}
                                  </span>
                                ) : (
                                  <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    TỒN KHO BTP
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Sales order linked to BTP */}
                            {order.orderType === 'G' && order.fulfillmentType === 'PICK_FROM_BTP' && (
                              <div className="mt-1">
                                <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                                  Ghép BTP: {order.pickedFromBtpOrderId || ''}
                                </span>
                              </div>
                            )}

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
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${
                                  order.status === 'ON_HOLD'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                                    : order.status === 'READY_FOR_DELIVERY'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                                    : order.status === 'PENDING_DEPLOYMENT'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
                                    : order.status === 'IN_PRODUCTION'
                                    ? 'bg-amber-100 text-amber-800'
                                    : order.status === 'APPROVED_LSX'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.status === 'REWORK_ALERT'
                                    ? 'bg-purple-100 text-purple-800'
                                    : order.status === 'KCS_TEST'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : order.status === 'COMPLETED'
                                    ? 'bg-slate-900 text-emerald-400 font-bold'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {order.status === 'ON_HOLD'
                                  ? '⏸️ TREO ĐƠN'
                                  : order.status === 'READY_FOR_DELIVERY'
                                  ? '🚚 CHỜ GIAO XE'
                                  : order.status === 'PENDING_DEPLOYMENT'
                                  ? '⏳ CHỜ TRIỂN KHAI'
                                  : order.status === 'COMPLETED'
                                  ? '✓ HOÀN THÀNH'
                                  : order.status}
                              </span>

                              {order.status === 'ON_HOLD' && order.holdReason && (
                                <span className="text-[10px] text-rose-700 max-w-[140px] truncate block" title={order.holdReason}>
                                  {order.holdReason}
                                </span>
                              )}

                              {canManageOrders && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(order)}
                                  className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer flex items-center gap-0.5"
                                  title="Chuyển đổi trạng thái đơn hàng (Treo đơn, Chờ giao, Hoàn thành...)"
                                >
                                  <span>Chuyển TT</span>
                                  <ChevronRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {canManageOrders && (
                                <button
                                  onClick={() => handleOpenEditModal(order)}
                                  className="px-2 py-1 text-[11px] font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Chỉnh sửa thông tin đơn hàng, ngày kế hoạch, phân quyền và các tổ sản xuất song song"
                                >
                                  <PenSquare className="w-3 h-3 text-indigo-600" />
                                  <span>Sửa Đơn</span>
                                </button>
                              )}
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
                              {order.orderType === 'N' && (order.btpStatus === 'IN_INVENTORY' || !order.btpStatus) && (
                                <button
                                  onClick={() => {
                                    setAssigningBtpOrder(order);
                                    if (availableGOrdersForAllocation.length > 0) {
                                      setTargetSalesOrderId(availableGOrdersForAllocation[0].id);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Xuất bán thành phẩm này gán cho đơn hàng bán (G)"
                                >
                                  <Boxes className="w-3 h-3 text-emerald-700" />
                                  <span>Xuất Cho G</span>
                                </button>
                              )}
                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                                title="In Lệnh Sản Xuất theo biểu mẫu chuẩn ISO CM-PR01-F01"
                              >
                                <Printer className="w-3 h-3 text-slate-800" />
                                <span>In LSX</span>
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

            {/* Quick Management Action Strip in Journey Tracking */}
            <div className="pt-2 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Trạng thái hiện tại:</span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
                    currentTrackingOrder.status === 'ON_HOLD'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : currentTrackingOrder.status === 'READY_FOR_DELIVERY'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : currentTrackingOrder.status === 'PENDING_DEPLOYMENT'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : currentTrackingOrder.status === 'COMPLETED'
                      ? 'bg-slate-900 text-emerald-400 border-slate-700'
                      : 'bg-white text-slate-900 border-slate-300'
                  }`}
                >
                  {currentTrackingOrder.status === 'ON_HOLD'
                    ? '⏸️ TREO ĐƠN HÀNG (TẠM DỪNG)'
                    : currentTrackingOrder.status === 'READY_FOR_DELIVERY'
                    ? '🚚 ĐƠN HÀNG CHỜ GIAO XE'
                    : currentTrackingOrder.status === 'PENDING_DEPLOYMENT'
                    ? '⏳ CHỜ TRIỂN KHAI (CHƯA DUYỆT)'
                    : currentTrackingOrder.status === 'COMPLETED'
                    ? '✓ HOÀN THÀNH & LƯU TRỮ'
                    : currentTrackingOrder.status}
                </span>
              </div>

              {canManageOrders && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenStatusModal(currentTrackingOrder)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-300 rounded font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Chuyển đổi trạng thái đơn (Treo đơn, Chờ giao, Hoàn thành)"
                  >
                    <Workflow className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Chuyển Đổi Trạng Thái</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(currentTrackingOrder)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Chỉnh sửa thông tin chi tiết đơn hàng, ngày kế hoạch và các tổ sản xuất song song"
                  >
                    <PenSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sửa Thông Tin Đơn</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PARALLEL TEAMS PRODUCTION ALERT */}
          {currentTrackingOrder.activeTeamIds && currentTrackingOrder.activeTeamIds.length > 1 && (
            <div className="p-3.5 bg-indigo-50/90 border border-indigo-200 rounded-lg text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>ĐƠN HÀNG ĐANG ĐƯỢC SẢN XUẤT ĐỒNG THỜI TẠI {currentTrackingOrder.activeTeamIds.length} TỔ:</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                  Sản xuất song song (Parallel WIP)
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {currentTrackingOrder.activeTeamIds.map((tId) => {
                  const tInfo = INITIAL_TEAMS.find((t) => t.id === tId);
                  return (
                    <span
                      key={tId}
                      className="px-2.5 py-1 rounded bg-white text-indigo-950 border border-indigo-300 font-mono font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <strong>{tId}:</strong> {tInfo?.name || tId}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-indigo-700">
                Các tổ trên đang cùng lúc thi công các cụm bán thành phẩm (khung ghế, may da, dây điện) trước khi hội tụ về Cụm 4 để lắp ráp tổng thành.
              </p>
            </div>
          )}

          {/* ON-HOLD DETAILED REASON ALERT */}
          {currentTrackingOrder.status === 'ON_HOLD' && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-lg text-xs text-rose-950 space-y-2 shadow-xs">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <PauseCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                  <span>LỆNH SẢN XUẤT NÀY ĐANG BỊ TREO (TẠM DỪNG THI CÔNG TRÊN CHUYỀN)</span>
                </div>
                <span className="font-mono text-xs text-rose-700 font-bold bg-white px-2 py-0.5 rounded border border-rose-300">
                  Treo từ: {currentTrackingOrder.holdDate || '2026-11-02'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block font-semibold">Nguyên nhân treo đơn / tạm dừng:</span>
                <p className="p-2.5 bg-white border border-rose-200 rounded text-rose-950 font-medium leading-relaxed">
                  {currentTrackingOrder.holdReason || 'Đang chờ khách hàng phản hồi phê duyệt phương án thiết kế màu da và option phụ trợ.'}
                </p>
              </div>
              {canManageOrders && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenStatusModal(currentTrackingOrder)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>Mở Lại Chuyền / Tiếp Tục Sản Xuất</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

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
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPrintingOrder(currentTrackingOrder)}
                    className="px-2.5 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="In Lệnh Sản Xuất theo biểu mẫu chuẩn ISO CM-PR01-F01"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>In Lệnh SX</span>
                  </button>
                  <button
                    onClick={() => onSelectOrder(currentTrackingOrder)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Xem Spec Đơn
                  </button>
                </div>
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
                      (Quyết định tiền tố mã LSX: G / N / T / B)
                    </span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    Quy chuẩn mã: [Loại][Năm][Tháng][STT]
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {/* Card 1: Đơn bán G */}
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
                      Đơn Bán (G)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Hợp đồng bán xe mới cho khách cá nhân, doanh nghiệp vận tải
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-amber-700">G2611...</strong>
                    </div>
                  </div>

                  {/* Card 2: Đơn bán thành phẩm N */}
                  <div
                    onClick={() => setOrderType('N')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      orderType === 'N'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300">
                        TIỀN TỐ N
                      </span>
                      {orderType === 'N' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1.5">
                      Bán Thành Phẩm (N)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Đơn BTP trữ kho đệm (khung ghế, vách, dây điện) sẵn sàng xuất
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-emerald-700">N2611...</strong>
                    </div>
                  </div>

                  {/* Card 3: Đơn trưng bày T */}
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
                      Đơn Trưng Bày (T)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Xe demo, triển lãm sự kiện, giao đại lý giới thiệu sản phẩm
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-indigo-700">T2611...</strong>
                    </div>
                  </div>

                  {/* Card 4: Đơn bảo hành B */}
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
                      Đơn Bảo Hành (B)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Bảo hành chuyên sâu, sửa chữa lỗi kỹ thuật, nâng cấp nội thất
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-600">
                      Mã mẫu: <strong className="text-rose-700">B2611...</strong>
                    </div>
                  </div>
                </div>

                {/* Đơn hàng bán (G): Cho phép Sản xuất mới HOẶC Chọn từ BTP (N) */}
                {orderType === 'G' && (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Hình Thức Triển Khai Cho Đơn Bán (G) *</span>
                      </label>
                      <span className="text-[10px] font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-bold border border-amber-300">
                        {availableNOrdersInInventory.length} Đơn BTP Có Sẵn Trong Kho
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => {
                          setFulfillmentType('NEW_PRODUCTION');
                          setSelectedBtpOrderNId('');
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          fulfillmentType === 'NEW_PRODUCTION'
                            ? 'bg-white border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">1. Sản Xuất Mới Toàn Bộ</span>
                          {fulfillmentType === 'NEW_PRODUCTION' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Chạy trọn vẹn 14 ngày chuyền từ Tổ 01 (Cắt phôi) đến Tổ 17 (KCS bàn giao).
                        </p>
                        <span className="text-[10px] font-mono text-slate-600 font-bold block mt-2">
                          Thời lượng chuẩn: 14 ngày chuyền
                        </span>
                      </div>

                      <div
                        onClick={() => {
                          setFulfillmentType('PICK_FROM_BTP');
                          if (availableNOrdersInInventory.length > 0 && !selectedBtpOrderNId) {
                            setSelectedBtpOrderNId(availableNOrdersInInventory[0].id);
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          fulfillmentType === 'PICK_FROM_BTP'
                            ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-950">2. Chọn Từ Đơn Bán Thành Phẩm (N)</span>
                          {fulfillmentType === 'PICK_FROM_BTP' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Tận dụng khung ghế, vách may sẵn từ đơn BTP (N) đang tồn kho.
                        </p>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-2">
                          Rút ngắn tiến độ: Chỉ còn 6 - 8 ngày!
                        </span>
                      </div>
                    </div>

                    {fulfillmentType === 'PICK_FROM_BTP' && (
                      <div className="pt-2 border-t border-amber-200 space-y-2">
                        <label className="text-xs font-bold text-indigo-950 block">
                          Chọn Đơn Hàng Bán Thành Phẩm (N) Tồn Kho Cần Ghép:
                        </label>
                        {availableNOrdersInInventory.length === 0 ? (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                            Hiện không có đơn hàng (N) nào đang ở trạng thái Tồn Kho. Vui lòng chọn "Sản xuất mới" hoặc tạo thêm đơn (N).
                          </div>
                        ) : (
                          <select
                            value={selectedBtpOrderNId}
                            onChange={(e) => setSelectedBtpOrderNId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-300 rounded text-xs font-mono font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                          >
                            {availableNOrdersInInventory.map((nOrd) => (
                              <option key={nOrd.id} value={nOrd.id}>
                                {nOrd.id} · {nOrd.customerName} · {nOrd.conversionVersion} (Tiến độ {nOrd.progress}%, Trạm {nOrd.currentTeamId})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Nếu là đơn hàng bán thành phẩm (N), cho phép chọn trạng thái Tồn Kho hay Đã Xuất */}
                {orderType === 'N' && (
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span>Trạng Thái Đơn Hàng Bán Thành Phẩm (N) *</span>
                      </label>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                        BTP ĐỆM KHO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setBtpStatusForN('IN_INVENTORY')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          btpStatusForN === 'IN_INVENTORY'
                            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-950">Tồn Kho (Sẵn Sàng Xuất)</span>
                          {btpStatusForN === 'IN_INVENTORY' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Trữ kho đệm bán thành phẩm chờ các đơn hàng bán (G) tiếp nhận.
                        </p>
                      </div>

                      <div
                        onClick={() => setBtpStatusForN('ALLOCATED_TO_SALES')}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          btpStatusForN === 'ALLOCATED_TO_SALES'
                            ? 'bg-white border-cyan-500 ring-2 ring-cyan-500/30 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-cyan-950">Đã Xuất Cho Đơn Bán (G)</span>
                          {btpStatusForN === 'ALLOCATED_TO_SALES' && <CheckCircle2 className="w-4 h-4 text-cyan-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Đã điều chuyển / gán BTP này cho một Lệnh sản xuất thương mại (G).
                        </p>
                      </div>
                    </div>

                    {btpStatusForN === 'ALLOCATED_TO_SALES' && (
                      <div className="pt-2 border-t border-emerald-200 space-y-1.5">
                        <label className="text-xs font-semibold text-cyan-950 block">
                          Chọn Đơn Hàng Bán (G) Được Xuất Tới:
                        </label>
                        <select
                          value={allocatedToSalesOrderCode}
                          onChange={(e) => setAllocatedToSalesOrderCode(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-cyan-300 rounded text-xs font-mono font-semibold text-slate-900"
                        >
                          <option value="">-- Chọn đơn hàng G nhận BTP --</option>
                          {availableGOrdersForAllocation.map((gOrd) => (
                            <option key={gOrd.id} value={gOrd.id}>
                              {gOrd.id} · {gOrd.customerName} ({gOrd.conversionVersion})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Banner kết quả mã LSX điều chỉnh theo loại đơn */}
                <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-amber-400 text-slate-950 font-black font-mono flex items-center justify-center text-sm">
                      {orderType}
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-300 block">
                        Đang chọn:{' '}
                        <strong>
                          {orderType === 'G'
                            ? 'Đơn Bán (G)'
                            : orderType === 'N'
                            ? 'Bán Thành Phẩm (N)'
                            : orderType === 'T'
                            ? 'Đơn Trưng Bày (T)'
                            : 'Đơn Bảo Hành (B)'}
                        </strong>
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

      {/* 05. KHO LƯU TRỮ ĐƠN HÀNG HOÀN THÀNH (LƯU TRỮ EXCEL / GOOGLE SHEETS) */}
      {managementMode === 'COMPLETED_ARCHIVE' && (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Kho Lưu Trữ Đơn Hoàn Thành &amp; Nghiệm Thu Xuất Xưởng
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hồ sơ điện tử lưu trữ các đơn hàng Limousine đã hoàn thành xuất xưởng · Tự động đồng bộ sang bảng <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-bold">LuuTru_DonHoanThanh</code> trên Excel / Google Sheets
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleDownloadCompletedArchiveCsv}
                className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải File Excel/CSV Lưu Trữ ({completedOrders.length} Đơn)</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tổng Xe Hoàn Thành
                </span>
                <span className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                  <CheckCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {completedOrders.length}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">xe xuất xưởng</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đã kiểm tra 120 hạng mục</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Đúng Hạn Cam Kết
                </span>
                <span className="p-1.5 rounded bg-blue-100 text-blue-800">
                  <Timer className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">100%</span>
                <span className="text-xs text-blue-700 font-semibold">OTD Delivery</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Không phát sinh phạt hợp đồng</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Chuẩn KCS 120 Điểm
                </span>
                <span className="p-1.5 rounded bg-amber-100 text-amber-800">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700 font-mono">100%</span>
                <span className="text-xs text-emerald-800 font-semibold">PASS KCS</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đạt tiêu chuẩn xuất khẩu &amp; lưu thông</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Lưu Trữ Google Sheets
                </span>
                <span className="p-1.5 rounded bg-purple-100 text-purple-800">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-800 font-mono">
                  {completedOrders.filter((o) => o.archivedToExcel).length} / {completedOrders.length}
                </span>
                <span className="text-xs text-purple-700 font-semibold">Đã lưu trữ</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Đồng bộ cloud realtime</p>
            </div>
          </div>

          {/* Completed Orders Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Danh Sách Lệnh Sản Xuất Đã Xuất Xưởng ({completedOrders.length})
                </h4>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold font-mono">
                  LƯU TRỮ VĨNH VIỄN
                </span>
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">
                  Chưa có đơn hàng nào được đánh dấu hoàn thành xuất xưởng.
                </p>
                <p className="text-[11px] text-slate-400">
                  Chuyển trạng thái đơn sang "Hoàn thành đơn" tại bảng theo dõi tiến độ để lưu trữ vào kho này.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Mã LSX &amp; Loại</th>
                      <th className="py-2.5 px-3">Khách Hàng &amp; Hợp Đồng</th>
                      <th className="py-2.5 px-3">Số Khung (VIN) &amp; Dòng Xe</th>
                      <th className="py-2.5 px-3">Phiên Bản &amp; Nội Thất</th>
                      <th className="py-2.5 px-3">Ngày Hoàn Thành</th>
                      <th className="py-2.5 px-3">Nghiệm Thu KCS</th>
                      <th className="py-2.5 px-3">Địa Điểm Bàn Giao</th>
                      <th className="py-2.5 px-3">Lưu Trữ Sheet</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {ord.id}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                            {ord.orderType === 'G' ? 'Đơn Bán' : ord.orderType === 'N' ? 'BTP' : ord.orderType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{ord.customerName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            HĐ: {ord.contractRef || 'HĐ-DCAR'}
                            {ord.contactPhone && ` · ${ord.contactPhone}`}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-xs font-bold text-slate-800">
                            {ord.vinNumber || 'VIN-DCAR-2026-99'}
                          </div>
                          <div className="text-[11px] text-slate-500">{ord.baseModel}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{ord.conversionVersion}</div>
                          <div className="text-[11px] text-slate-500">{ord.interiorColor}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <div className="text-emerald-700 font-bold">
                            {ord.completedDate || ord.dueDate}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Hạn giao: {ord.dueDate}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            120/120 ĐẠT
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-xs text-slate-700">
                            {ord.deliveryLocation || 'Showroom DCAR'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Người nhận: {ord.contactPerson || ord.customerName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                            <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                            {ord.archivedToExcel ? 'ĐÃ LƯU TRỮ' : 'CHỜ ĐỒNG BỘ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPrintingOrder(ord)}
                              title="In Lệnh Sản Xuất Hoàn Thành"
                              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onSelectOrder(ord)}
                              title="Xem Chi Tiết Đơn Hàng"
                              className="p-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManageOrders && (
                              <button
                                onClick={() => handleOpenEditModal(ord)}
                                title="Sửa Thông Tin Đơn (TPSX / NV Đơn Hàng)"
                                className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSwitchToTracking(selectedOrderModal.id);
                    onCloseOrderModal();
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Xem Bản Đồ Tracking 17 Công Đoạn</span>
                </button>

                <button
                  onClick={() => setPrintingOrder(selectedOrderModal)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>In Lệnh SX (CM-PR01-F01)</span>
                </button>
              </div>

              <button
                onClick={onCloseOrderModal}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
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

      {/* MODAL XUẤT ĐƠN HÀNG BTP (N) CHO ĐƠN HÀNG BÁN (G) */}
      {assigningBtpOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Xuất Đơn BTP ({assigningBtpOrder.id}) Cho Đơn Hàng Bán (G)
                </h3>
              </div>
              <button
                onClick={() => setAssigningBtpOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
              <p>
                <strong>Đơn BTP nguồn:</strong> <span className="font-mono font-bold">{assigningBtpOrder.id}</span> · {assigningBtpOrder.customerName}
              </p>
              <p>
                <strong>Dòng xe &amp; Phiên bản:</strong> {assigningBtpOrder.conversionVersion} (Tiến độ {assigningBtpOrder.progress}%)
              </p>
              <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200">
                Khi xuất, đơn hàng (N) sẽ chuyển trạng thái sang <strong>Đã xuất cho đơn bán (G)</strong>, và đơn bán (G) được nhận BTP để lắp ráp ngay!
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Chọn Đơn Hàng Bán Thương Mại (G) Tiếp Nhận:
              </label>
              {availableGOrdersForAllocation.length === 0 ? (
                <p className="text-xs text-rose-600 italic">Hiện không có đơn bán (G) nào đang cần nhận BTP.</p>
              ) : (
                <select
                  value={targetSalesOrderId}
                  onChange={(e) => setTargetSalesOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                >
                  {availableGOrdersForAllocation.map((gOrd) => (
                    <option key={gOrd.id} value={gOrd.id}>
                      {gOrd.id} · {gOrd.customerName} · {gOrd.conversionVersion} (Hạn giao: {gOrd.dueDate})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setAssigningBtpOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmAllocateBtpToSales}
                disabled={!targetSalesOrderId}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác Nhận Xuất Cấp Cho Đơn G</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA THÔNG TIN ĐƠN HÀNG (DÀNH CHO TPSX & NV ĐƠN HÀNG) */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-4xl w-full my-8 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded bg-blue-100 text-blue-800">
                    <Edit3 className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chỉnh Sửa Thông Tin Đơn Hàng: <span className="font-mono text-blue-700">{editingOrder.id}</span>
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-300">
                    {editingOrder.orderType === 'G' ? 'Đơn Hàng Bán' : editingOrder.orderType === 'N' ? 'Bán Thành Phẩm (BTP)' : editingOrder.orderType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân quyền: <strong className="text-slate-800">Trưởng Phòng Sản Xuất (TPSX) &amp; Quản Lý/NV Đơn Hàng</strong> có toàn quyền cập nhật
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4 text-xs">
              {/* Section 1: Khách hàng & Hợp đồng */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Thông Tin Khách Hàng &amp; Hợp Đồng Thương Mại</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tên Khách Hàng / Đơn Vị *
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Người Liên Hệ
                    </label>
                    <input
                      type="text"
                      value={editContactPerson}
                      onChange={(e) => setEditContactPerson(e.target.value)}
                      placeholder="VD: Anh Tuấn (QL Đội Xe)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số Điện Thoại
                    </label>
                    <input
                      type="text"
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                      placeholder="VD: 0988.xxx.xxx"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số Hợp Đồng / Tham Chiếu KD
                    </label>
                    <input
                      type="text"
                      value={editContractRef}
                      onChange={(e) => setEditContractRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số Khung Xe Cơ Sở (VIN)
                    </label>
                    <input
                      type="text"
                      value={editVinNumber}
                      onChange={(e) => setEditVinNumber(e.target.value)}
                      placeholder="VD: VN-TRANSIT-2026-X88"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Dòng xe & Phiên bản độ */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. Thông Số Kỹ Thuật &amp; Phiên Bản Độ Limousine</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Xe Cơ Sở (Base Chassis)
                    </label>
                    <select
                      value={editBaseModel}
                      onChange={(e) => setEditBaseModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Ford Transit 18c Premium">Ford Transit 18c Premium 2026</option>
                      <option value="Ford Transit 16c">Ford Transit 16c Standard</option>
                      <option value="Hyundai Solati 16c">Hyundai Solati 16c H350</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Phiên Bản Độ Limousine
                    </label>
                    <select
                      value={editConversionVersion}
                      onChange={(e) => setEditConversionVersion(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="Ford Thương Gia 11c (10 ghế VIP)">Ford Thương Gia 11c (10 ghế VIP)</option>
                      <option value="Ford Thương Gia 12c">Ford Thương Gia 12c</option>
                      <option value="Ford VIP Lounge 2026">Ford VIP Lounge 2026 (Triển lãm)</option>
                      <option value="Solati Maybach 10 chỗ 2025">Solati Maybach 10 chỗ 2025</option>
                      <option value="Solati Thượng Đỉnh 10c">Solati Thượng Đỉnh 10c</option>
                      <option value="Ford President Maybach Edition 10c">Ford President Maybach Edition 10c</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số Chỗ Ngồi (Ghế VIP)
                    </label>
                    <input
                      type="number"
                      min={7}
                      max={19}
                      value={editSeatCapacity}
                      onChange={(e) => setEditSeatCapacity(parseInt(e.target.value, 10) || 11)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Màu Sơn Ngoại Thất
                    </label>
                    <input
                      type="text"
                      value={editExteriorColor}
                      onChange={(e) => setEditExteriorColor(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Chất Liệu &amp; Màu Da Nội Thất
                    </label>
                    <input
                      type="text"
                      value={editInteriorColor}
                      onChange={(e) => setEditInteriorColor(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Kế hoạch thời gian */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>3. Kế Hoạch Thời Gian &amp; Tiến Độ Cam Kết</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ngày Nhận Xe Cơ Sở
                    </label>
                    <input
                      type="date"
                      value={editReceivedDate}
                      onChange={(e) => setEditReceivedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ngày Hẹn Giao Xe (Due Date) *
                    </label>
                    <input
                      type="date"
                      required
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono font-bold text-amber-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      KH Bắt Đầu (TPSX Chọn)
                    </label>
                    <input
                      type="date"
                      value={editScheduledStartDate}
                      onChange={(e) => setEditScheduledStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      KH Hoàn Thành (TPSX Chọn)
                    </label>
                    <input
                      type="date"
                      value={editScheduledEndDate}
                      onChange={(e) => setEditScheduledEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Trạng thái & Ưu tiên */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>4. Trạng Thái Đơn Hàng &amp; Mức Ưu Tiên Sản Xuất</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Trạng Thái Đơn Hàng
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PENDING_DEPLOYMENT">Chờ triển khai (Chưa duyệt kế hoạch tuần)</option>
                      <option value="INTAKE">Tiếp nhận đơn hàng mới</option>
                      <option value="QUEUED_FOR_PRODUCTION">Đã duyệt kế hoạch tuần, xếp hàng vào chuyền</option>
                      <option value="IN_PRODUCTION">Đang sản xuất trên chuyền</option>
                      <option value="ON_HOLD">⏸️ Treo đơn hàng (Tạm dừng gia công)</option>
                      <option value="REWORK_ALERT">Sửa hàng / Cảnh báo KCS</option>
                      <option value="KCS_TEST">Kiểm tra KCS 120 điểm</option>
                      <option value="READY_FOR_DELIVERY">Đơn hàng chờ giao xe</option>
                      <option value="COMPLETED">Hoàn thành &amp; Lưu trữ Excel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mức Ưu Tiên Sản Xuất
                    </label>
                    <select
                      value={editPriorityLevel}
                      onChange={(e) => setEditPriorityLevel(e.target.value as PriorityLevel)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="P1_URGENT">P1 - Khẩn cấp (Sự kiện / Triển lãm / VIP)</option>
                      <option value="P2_HIGH">P2 - Ưu tiên cao</option>
                      <option value="P3_NORMAL">P3 - Tiêu chuẩn bình thường</option>
                      <option value="P4_LOW">P4 - Ưu tiên thấp</option>
                    </select>
                  </div>
                </div>

                {/* Nếu chọn Treo Đơn: Nhập Lý Do & Ngày Treo */}
                {editStatus === 'ON_HOLD' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <PauseCircle className="w-4 h-4 text-amber-600" />
                      <span>Thông Tin Treo Đơn Hàng (Bắt Buộc Nhập Lý Do)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-amber-900 text-[11px] mb-1">
                          Ngày Bắt Đầu Treo Đơn *
                        </label>
                        <input
                          type="date"
                          required
                          value={editHoldDate}
                          onChange={(e) => setEditHoldDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-slate-900 font-mono text-xs focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-amber-900 text-[11px] mb-1">
                          Lý Do Treo Đơn Chi Tiết *
                        </label>
                        <input
                          type="text"
                          required
                          value={editHoldReason}
                          onChange={(e) => setEditHoldReason(e.target.value)}
                          placeholder="VD: Chờ khách hàng chốt mẫu da Nappa Cognac, linh kiện ampli JBL nhập khẩu về trễ..."
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: SẢN XUẤT ĐỒNG THỜI TẠI NHIỀU TỔ (MULTI-STATION PARALLEL) */}
              <div className="p-3.5 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Workflow className="w-4 h-4 text-indigo-700" />
                    <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-[11px]">
                      5. Phân Bổ Các Tổ Đang Sản Xuất Đồng Thời (Song Song)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-300">
                    {editActiveTeamIds.length} Tổ Đang Tham Gia SX
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  Một đơn hàng có thể được triển khai gia công song song tại nhiều tổ cùng lúc (ví dụ: Tổ phôi khung T02, Tổ may ghế T05, Tổ dây điện T09). Hãy tích chọn các tổ đang đồng thời thi công đơn hàng này:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto">
                  {INITIAL_TEAMS.map((t) => {
                    const isChecked = editActiveTeamIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditTeam(t.id)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0">
                          <span className={`block font-mono text-[11px] ${isChecked ? 'text-indigo-100 font-bold' : 'text-slate-900 font-semibold'}`}>
                            {t.id}
                          </span>
                          <span className={`block text-[10px] truncate ${isChecked ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {t.name}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 6: Địa điểm bàn giao & Ghi chú */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Địa Điểm Bàn Giao Xe
                  </label>
                  <input
                    type="text"
                    value={editDeliveryLocation}
                    onChange={(e) => setEditDeliveryLocation(e.target.value)}
                    placeholder="VD: Showroom DCAR TP.HCM hoặc Giao tận nơi tại Đà Nẵng"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ghi Chú Kỹ Thuật / Điều Phối
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ghi chú đặc biệt cho chuyền sản xuất..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Section 7: Tùy chọn cấu hình */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Tùy Chọn Phụ Kiện &amp; Option Cấu Hình Xe:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded">
                  {availableOptions.map((opt) => {
                    const isChecked = editOptions.includes(opt);
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-2 p-1 text-[11px] text-slate-800 cursor-pointer hover:bg-slate-100 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditOption(opt)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Thay Đổi Đơn Hàng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHUYỂN ĐỔI TRẠNG THÁI NHANH / TREO ĐƠN HÀNG */}
      {statusChangeOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full my-8 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-amber-100 text-amber-800">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chuyển Đổi Trạng Thái Đơn Hàng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lệnh SX: <strong className="font-mono text-slate-800">{statusChangeOrder.id}</strong> ({statusChangeOrder.customerName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatusChangeOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  Chọn Trạng Thái Đích Tiếp Theo:
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'PENDING_DEPLOYMENT',
                      label: '⏳ Chờ triển khai',
                      desc: 'Kế hoạch tuần chưa được duyệt bởi TPSX',
                      color: 'border-slate-300 hover:bg-slate-50',
                    },
                    {
                      id: 'QUEUED_FOR_PRODUCTION',
                      label: '📋 Đã duyệt, xếp hàng vào chuyền',
                      desc: 'Đã sẵn sàng vật tư phôi xe, chờ tổ cắt CNC tiếp nhận',
                      color: 'border-blue-300 hover:bg-blue-50',
                    },
                    {
                      id: 'IN_PRODUCTION',
                      label: '⚡ Đang sản xuất trên chuyền',
                      desc: 'Các tổ chế tác đang đồng thời gia công lắp ráp',
                      color: 'border-emerald-300 hover:bg-emerald-50',
                    },
                    {
                      id: 'ON_HOLD',
                      label: '⏸️ Treo đơn hàng (Tạm dừng sản xuất)',
                      desc: 'Treo thi công để chờ ý kiến khách hàng, linh kiện nhập khẩu hoặc thay đổi thiết kế',
                      color: 'border-amber-400 bg-amber-50/50 hover:bg-amber-100/50',
                    },
                    {
                      id: 'KCS_TEST',
                      label: '🔍 Nghiệm thu KCS 120 điểm',
                      desc: 'Chuyển sang buồng kiểm định chất lượng xuất xưởng',
                      color: 'border-indigo-300 hover:bg-indigo-50',
                    },
                    {
                      id: 'READY_FOR_DELIVERY',
                      label: '🚚 Đơn hàng chờ giao xe',
                      desc: 'KCS 120 điểm đã PASS, xe đậu bãi chờ khách nhận',
                      color: 'border-teal-300 hover:bg-teal-50',
                    },
                    {
                      id: 'COMPLETED',
                      label: '✅ Hoàn thành đơn & Lưu trữ Excel',
                      desc: 'Khách hàng đã nhận xe, tự động lưu trữ vào LuuTru_DonHoanThanh trên Sheet',
                      color: 'border-purple-300 hover:bg-purple-50',
                    },
                  ].map((st) => (
                    <label
                      key={st.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${st.color} ${
                        targetStatus === st.id
                          ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50 shadow-xs'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetStatusRadio"
                        checked={targetStatus === st.id}
                        onChange={() => setTargetStatus(st.id as OrderStatus)}
                        className="mt-0.5 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="min-w-0">
                        <strong className="block text-slate-900 text-xs">{st.label}</strong>
                        <span className="text-[11px] text-slate-500 block leading-snug">{st.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Nhập lý do treo đơn nếu targetStatus === 'ON_HOLD' */}
              {targetStatus === 'ON_HOLD' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 mt-3">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <PauseCircle className="w-4 h-4 text-amber-600" />
                    <span>Chi Tiết Treo Đơn Hàng</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Ngày Bắt Đầu Treo:
                    </label>
                    <input
                      type="date"
                      value={statusHoldDate}
                      onChange={(e) => setStatusHoldDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded font-mono text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Lý Do Treo Đơn:
                    </label>
                    <textarea
                      rows={2}
                      value={statusHoldReason}
                      onChange={(e) => setStatusHoldReason(e.target.value)}
                      placeholder="VD: Chờ khách hàng duyệt lại phương án màu da Nappa Cognac..."
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Thông báo nếu targetStatus === 'COMPLETED' */}
              {targetStatus === 'COMPLETED' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2 mt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    <span>Lưu Trữ Tự Động Sang Excel / Google Sheet</span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-snug">
                    Đơn hàng sẽ được chuyển sang tiến độ 100%, ghi nhận hoàn thành và đồng bộ lưu trữ vào bảng <code className="bg-purple-100 font-mono font-bold px-1 rounded">LuuTru_DonHoanThanh</code>.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      Ngày Hoàn Thành Xuất Xưởng Thực Tế:
                    </label>
                    <input
                      type="date"
                      value={statusCompletedDate}
                      onChange={(e) => setStatusCompletedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded font-mono text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusChangeOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveStatusTransition}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác Nhận Chuyển Trạng Thái</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN LỆNH SẢN XUẤT CHUẨN ISO CM-PR01-F01 */}
      <ProductionOrderPrintModal
        order={printingOrder}
        isOpen={!!printingOrder}
        onClose={() => setPrintingOrder(null)}
      />
    </div>
  );
};
