export type Role =
  | 'Order_Admin'
  | 'Planner'
  | 'Production_Manager'
  | 'Foreman'
  | 'Executive';

export type OrderType = 'G' | 'N' | 'T' | 'B'; // G: Bán thương mại, N: Bán thành phẩm (BTP trữ kho), T: Trưng bày, B: Bảo hành/Rework

export type OrderStatus =
  | 'INTAKE'                 // Tiếp nhận mới
  | 'SCHEDULED_DRAFT'       // Lịch tuần gợi ý (Draft)
  | 'QUEUED_FOR_PRODUCTION' // Đã duyệt kế hoạch - Chờ ngày triển khai sản xuất
  | 'APPROVED_LSX'          // TPSX đã phê duyệt, ban hành LSX
  | 'IN_PRODUCTION'         // Đang trên chuyền (Ngày 1-14)
  | 'KCS_TEST'              // KCS Kiểm định 120 điểm
  | 'REWORK_ALERT'          // Phát sinh lỗi KCS / Rework
  | 'COMPLETED';            // Đã nghiệm thu & Bàn giao

export type PriorityLevel = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_NORMAL';

export type ScheduleHealth = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'REWORK';

export interface VehicleEquivBreakdown {
  vehicleType: string; // Tên dòng xe: 'Ford Thương Gia 11c (10 ghế VIP)', 'Solati Maybach 10 chỗ 2025', etc.
  shortName: string; // 'Ford TG 11c', 'Solati Maybach', 'Ford VIP Lounge', etc.
  componentQty: number; // Số lượng linh kiện/công đoạn hoàn thành cho dòng xe này
  componentUnit: string; // Đơn vị tính: 'ghế VIP', 'bộ vách', 'vỏ xe sơn', 'bát định vị', v.v.
  componentsPerVehicle: number; // Định mức linh kiện/công đoạn để cấu thành 1 xe hoàn chỉnh
  equivalentVehicles: number; // Số xe quy đổi = componentQty / componentsPerVehicle
  standardHoursPerVehicle: number; // Định mức giờ công chuẩn của dòng xe
  orderCodes: string[]; // Các mã LSX áp dụng
}

export interface TeamDailyProductivity {
  id: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  clusterId: ClusterId;
  clusterName: string;
  assignedPosition: string;
  dateStr: string; // e.g. '2026-11-02'
  dayOfWeek: string; // 'Thứ 2', 'Thứ 3', ...
  standardHeadcount: number;
  actualHeadcount: number;
  standardHours: number; // Tổng giờ công định mức (vd: 32h)
  actualHours: number; // Tổng giờ công thực tế làm việc
  overtimeHours: number; // Giờ OT tăng ca
  targetOutputUnits: number; // Sản lượng định mức giao (bộ, chi tiết, xe)
  actualOutputUnits: number; // Sản lượng hoàn thành thực tế
  unitName: string; // 'bộ ghế', 'xe', 'bộ vách', 'bát sắt', v.v.
  efficiencyRate: number; // % Hiệu suất năng suất
  qualityPassRate: number; // % KCS đạt chuẩn lần đầu (FPY)
  defectCount: number; // Số lỗi phát sinh trong ngày
  status: 'EXCEEDED' | 'ACHIEVED' | 'UNDERPERFORMING';
  bottleneckReason?: string;
  supervisorNote: string;
  executedOrders: string[]; // Mã các LSX thi công trong ngày

  // Quy đổi ra xe (Vehicle Equivalency)
  targetEquivalentVehicles: number; // Kế hoạch quy đổi ra xe (Xe TĐ KH, vd: 1.20 xe)
  actualEquivalentVehicles: number; // Thực tế quy đổi ra xe (Xe TĐ TT, vd: 1.25 xe)
  vehicleEquivRate: number; // % Đạt sản lượng quy đổi xe (actual / target * 100)
  vehicleBreakdown: VehicleEquivBreakdown[]; // Chi tiết quy đổi về xe theo từng dòng xe
}

export interface BTPWaitingBufferItem {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  conversionVersion: string;
  btpCode: string;
  btpName: string;
  completedByTeamId: string;
  completedByTeamName: string;
  downstreamTeamId: string;
  downstreamTeamName: string;
  quantity: number;
  completedTimestamp: string;
  waitingHours: number;
  status: 'WAITING_TRANSFER' | 'ACCEPTED_IN_PRODUCTION' | 'HOLD_QC';
  notes?: string;
}

export interface OrderStepExecution {
  stepId: string;
  stepName: string;
  clusterId: ClusterId;
  teamId: string;
  teamName: string;
  dayIndex: number; // Day 1 - 14
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED_REWORK';
  standardHours: number;
  actualHours?: number;
  plannedStartDate: string;
  plannedCompletionDate: string;
  actualCompletionDate?: string;
  isDelayed: boolean;
  delayDays?: number;
  delayReason?: string; // Nguyên nhân trễ tiến độ
  completedByPosition?: string; // Chức danh tổ trưởng / KCS xác nhận
  qualityStatus?: 'PASS' | 'REWORK_REQUIRED' | 'PENDING_CHECK';
  notes?: string;
}

export interface ContractItem {
  id: string; // e.g. "HĐ-HM26/10-09"
  contractCode: string;
  customerName: string;
  customerType: string; // 'DOANH_NGHIEP_VAN_TAI' | 'TAP_DOAN_RESORT' | 'KHACH_VIP_CA_NHAN' | 'SHOWROOM_EXPO'
  signingDate: string;
  deliveryDeadline: string;
  totalVehicles: number;
  completedVehicles: number;
  inProgressVehicles: number;
  contractValueVND: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';
  notes: string;
  orderIds: string[];
}

export interface OrderBTPSyncItem {
  btpCode: string;
  btpName: string;
  teamId: string;
  teamName: string;
  clusterId: ClusterId;
  requiredQty: number;
  completedQty: number;
  isReady: boolean;
  status: 'READY' | 'IN_PROGRESS' | 'WAITING_MATERIAL' | 'BOTTLENECK_DELAY';
  waitingReason?: string; // Đang chờ gì
  expectedReadyDate: string;
}

export interface OrderBTPSynchronization {
  orderId: string;
  orderCode: string;
  customerName: string;
  conversionVersion: string;
  currentStepName: string;
  syncPercentage: number; // 0 - 100%
  isSynchronized: boolean; // true if 100%
  assemblyReadiness: 'READY_FOR_ASSEMBLY' | 'PARTIAL_SYNC' | 'BLOCKED';
  pendingItems: OrderBTPSyncItem[]; // Danh sách BTP đang chờ & nguyên nhân
  readyItems: OrderBTPSyncItem[];
}

export interface OrderItem {
  id: string; // e.g. G2610021, T2610002, B2610001
  orderType: OrderType;
  customerName: string;
  contractRef: string;
  contractId?: string;
  baseModel: string;
  conversionVersion: string;
  seatCapacity: number;
  exteriorColor: string;
  interiorColor: string;
  options: string[];
  receivedDate: string; // YYYY-MM-DD
  dueDate: string;      // YYYY-MM-DD
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  status: OrderStatus;
  progress: number; // 0 - 100
  currentDay: number; // 1 - 14
  currentCluster: 1 | 2 | 3 | 4;
  currentStepId?: string; // e.g. 'S16', 'S09'
  currentTeamId?: string; // e.g. 'T16', 'T09'
  currentStepName?: string;
  priorityLevel?: PriorityLevel;
  scheduleHealth?: ScheduleHealth;
  delayDays?: number;
  standardLeadTimeDays?: number;
  actualLeadTimeDays?: number;
  mrpReady: boolean;
  crpFeasible: boolean;
  batchGroupId?: string; // Mã nhóm mẻ gom xe (±2 ngày)
  // BTP & Fulfillment pairing for (G) and (N) orders
  fulfillmentType?: 'NEW_PRODUCTION' | 'PICK_FROM_BTP'; // Đơn hàng bán (G): sản xuất mới hoặc chọn từ BTP (N)
  pickedFromBtpOrderId?: string; // Mã đơn BTP (N) được gán cho đơn G này
  pickedFromBtpOrderCode?: string;
  btpStatus?: 'IN_INVENTORY' | 'ALLOCATED_TO_SALES'; // Trạng thái đơn hàng (N): 'Tồn kho' hoặc 'Đã xuất cho đơn bán (G)'
  allocatedToSalesOrderId?: string; // Đơn bán (G) đã nhận đơn BTP này
  allocatedToSalesOrderCode?: string;
  allocatedDate?: string; // Ngày xuất BTP cho đơn bán
  notes: string;
  stepExecutions?: OrderStepExecution[];
  vinNumber?: string; // Số khung xe
  contactPerson?: string; // Người liên lạc
  contactPhone?: string; // Điện thoại liên lạc
  deliveryLocation?: string; // Địa điểm giao xe
  completedDate?: string; // Ngày hoàn thành xuất xưởng
  specialRequirements?: string[]; // Yêu cầu đặc biệt
  inspection120Pass?: boolean; // Nghiệm thu KCS 120 điểm
  defectLog?: {
    teamId: string;
    teamName: string;
    issueDescription: string;
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    resolved: boolean;
  };
}

export interface DailyScheduleItem {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  conversionVersion: string;
  teamId: string;
  teamName: string;
  clusterId: ClusterId;
  stepId: string;
  stepName: string;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: string; // 'Thứ 2', 'Thứ 3', ...
  plannedHours: number;
  actualHours?: number;
  priorityLevel: PriorityLevel;
  scheduleHealth: ScheduleHealth;
  isIncoming: boolean; // true if incoming from upstream team
  progressPercent: number;
  delayDays: number;
  plannerNotes?: string;
  // Enhanced fields for scientific workshop dispatch
  upstreamTeamId?: string;
  upstreamTeamName?: string;
  estimatedArrivalHour?: string;
  btpReadinessPercent?: number;
  btpReadinessNote?: string;
  jigToolPreparation?: string;
  assignedCraftsman?: string;
  workstationTaskStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING_QC' | 'COMPLETED' | 'PAUSED';
}

export interface NavigationTarget {
  tab: AppModuleId;
  subView?: string; // e.g. 'FLOW_DIAGRAM' | 'JOURNEY_TRACKING' | 'CONTRACTS' | 'LIST' | 'DAILY_DISPATCH' | 'WEEKLY_PLAN' | 'ORDER_BTP_SYNC' | 'CLEARANCE_WIP' | 'QUALITY_PARETO' | 'MEETING' | 'DAILY_PRODUCTIVITY' | 'COMPLETED_ARCHIVE'
  orderId?: string;
  contractId?: string;
  teamId?: string;
  clusterId?: ClusterId | 'ALL';
  defectCategory?: string;
  sourceDesc?: string;
}

export type ReportFilterPeriod =
  | 'WEEK_44'
  | 'WEEK_45'
  | 'MONTH_10'
  | 'MONTH_11'
  | 'ALL_Q4';

export type ClusterId = 1 | 2 | 3 | 4;

export interface ClusterInfo {
  id: ClusterId;
  name: string;
  description: string;
  targetDays: string;
  leadTimeDays: number;
}

export type AccessLevel = 'NONE' | 'VIEW_ONLY' | 'FULL_ACCESS';

export type AppModuleId =
  | 'dashboard'
  | 'orders'
  | 'scheduling'
  | 'gantt'
  | 'matrix'
  | 'btp'
  | 'alerts'
  | 'roles';

export interface TeamCapacityStaffing {
  teamId: string;
  teamCode: string;
  teamName: string;
  clusterId: ClusterId;
  headcount: number;
  leadCraftsman: string;
  assistantCraftsmen: number;
  stdDailyCapacityVehicles: number;
  stdHoursPerVehicle: number;
  nominalEfficiencyRate: number; // e.g. 95%
  updatedAt?: string;
  notes?: string;
}

export interface StageCycleNorm {
  id: string;
  vehicleModel: string;
  stepId: string;
  stepName: string;
  teamId: string;
  teamName: string;
  clusterId: ClusterId;
  sequenceOrder: number;
  standardHours: number;
  dayStart: number;
  dayEnd: number;
  standardLeadDays: number;
  notes?: string;
}

export type UserModulePermissions = Record<AppModuleId, AccessLevel>;

export interface AppUser {
  id: string; // e.g. "USR-ADMIN", "USR-PLANNER", "USR-TPSX", "USR-FOREMAN-01"
  accountCode: string;
  role: Role;
  positionTitle: string; // Tên vị trí / chức danh công việc
  department: string;
  assignedWorkstations: string[]; // List of team IDs e.g. ['T01', 'T02'] or ['ALL']
  status: 'ACTIVE' | 'OFFLINE';
  permissions: UserModulePermissions;
}

export interface ParetoDefectCategory {
  id: string;
  categoryName: string;
  relatedTeam: string;
  defectCount: number;
  percentage: number;
  cumulativePercentage: number;
  reworkHours: number;
  primaryCause: string;
}

export interface ReworkTeamStat {
  teamId: string;
  teamName: string;
  clusterName: string;
  totalDefects: number;
  reworkHours: number;
  reworkCostVND: number;
  reworkRatioPercent: number; // Rework hours / total production hours
}

export interface ProductionTeam {
  id: string; // T01, T02...
  code: string;
  name: string;
  clusterId: ClusterId;
  clusterName: string;
  headcount: number;
  assignedPosition: string; // Vị trí chức danh phụ trách (e.g. "Tổ Trưởng Phụ Trách Tổ 01")
  assignedUserCode: string; // Mã user được phân quyền quản lý trạm
  standardCapacityDesc: string; // e.g. "3 xe / ngày", "2 xe / ngày"
  standardHoursPerVehicle: number;
  activeWipUnits: number;
  btpStockUnits: number; // Tồn kho bán thành phẩm
  btpName: string;
  defectRate: number; // %
  overloadStatus: 'NORMAL' | 'NEAR_CAPACITY' | 'BOTTLENECK';
}

export interface StepRouting {
  stepId: string;
  teamId: string;
  teamName: string;
  clusterId: ClusterId;
  stepName: string;
  dayStart: number;
  dayEnd: number;
  dependencies: string[]; // stepIds required before starting
  standardDurationDays: number;
}

export interface MRPItem {
  materialCode: string;
  materialName: string;
  unit: string;
  stockHHCITY0B: number; // Kho chính
  stockHHCITY00: number; // Kho phụ/đệm
  totalStock: number;
  requiredPerVehicle: Record<string, number>; // version -> qty
  totalAllocated: number;
  shortfall: number;
  category: string;
  leadTimeDays: number;
  supplier: string;
}

export interface CRPWorkcenter {
  workcenterId: string;
  workcenterName: string;
  headcount: number;
  shiftHoursPerDay: number;
  daysPerWeek: number;
  weeklyCapacityHours: number;
  scheduledHours: number;
  utilizationRate: number; // %
  status: 'OPTIMAL' | 'STARVATION' | 'OVERLOAD';
}

export interface BTPInventoryItem {
  id: string;
  teamId: string;
  teamName: string;
  btpCode: string;
  btpName: string;
  unit: string;
  quantity: number;
  maxBuffer: number;
  manHoursPerUnit: number;
  stageName: string;
  status: 'NORMAL' | 'HIGH_INVENTORY' | 'CRITICAL_ACCUMULATION';
}

export interface SystemAlert {
  id: string;
  type: 'DUE_DATE_RISK' | 'QUALITY_REWORK' | 'MATERIAL_SHORTFALL' | 'BOTTLENECK_LOAD';
  title: string;
  description: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  timestamp: string;
  targetRefId: string; // orderId or teamId
  acknowledged: boolean;
}
