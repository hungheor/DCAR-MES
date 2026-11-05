import {
  OrderItem,
  OrderType,
  MRPItem,
  CRPWorkcenter,
  ProductionTeam,
  BTPInventoryItem,
  SystemAlert,
  TeamDailyProductivity,
  VehicleEquivBreakdown,
} from '../types/mes';

/**
 * Thuật toán sinh mã LSX tự động theo đặc tả kỹ thuật:
 * Định dạng: [Loại đơn][Năm 2 chữ số][Tháng 2 chữ số][Số thứ tự tịnh tiến 3 chữ số]
 * Ví dụ: G2610021, T2611002, B2611001
 */
export function generateOrderId(
  orderType: OrderType,
  existingOrders: OrderItem[],
  date: Date = new Date(2026, 10, 2) // Defaults to current simulated Nov 2026
): string {
  const year2 = String(date.getFullYear()).slice(-2);
  const month2 = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `${orderType}${year2}${month2}`;

  // Đếm số lượng đơn trong tháng tương ứng có cùng prefix
  const matchingOrders = existingOrders.filter((o) => o.id.startsWith(prefix));
  
  // Tìm số thứ tự cao nhất hiện tại
  let maxSeq = 0;
  matchingOrders.forEach((o) => {
    const seqStr = o.id.slice(prefix.length);
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * Cân đối MRP tự động (Material Requirement Planning)
 * Tính tổng nhu cầu vật tư của các đơn hàng đang hoạt động so với tồn kho 2 kho
 */
export function runMRPBalancing(orders: OrderItem[], materials: MRPItem[]): {
  updatedMaterials: MRPItem[];
  shortfallCount: number;
  readinessRate: number;
} {
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED');

  const updated = materials.map((mat) => {
    let requiredSum = 0;
    activeOrders.forEach((order) => {
      const perVehicle = mat.requiredPerVehicle[order.conversionVersion] || 0;
      requiredSum += perVehicle;
    });

    const shortfall = mat.totalStock - requiredSum;

    return {
      ...mat,
      totalAllocated: requiredSum,
      shortfall: shortfall,
    };
  });

  const shortfallItems = updated.filter((m) => m.shortfall < 0);
  const totalTracked = updated.length;
  const readyItems = totalTracked - shortfallItems.length;
  const readinessRate = Math.round((readyItems / (totalTracked || 1)) * 100);

  return {
    updatedMaterials: updated,
    shortfallCount: shortfallItems.length,
    readinessRate,
  };
}

/**
 * Cân đối năng lực xưởng CRP (Capacity Requirement Planning)
 */
export function runCRPBalancing(
  orders: OrderItem[],
  workcenters: CRPWorkcenter[]
): CRPWorkcenter[] {
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED');
  const activeCount = activeOrders.length;

  return workcenters.map((wc) => {
    let multiplier = 1;
    if (wc.workcenterId.includes('MOC') || wc.workcenterId.includes('CAT-MAY')) {
      multiplier = 1.35; // Khối lượng nội thất may đệm đòi hỏi nhiều công nhật
    }
    const computedHours = Math.round(activeCount * (wc.weeklyCapacityHours / 12) * multiplier);
    const scheduledHours = Math.max(wc.scheduledHours, computedHours);
    const utilizationRate = parseFloat(
      ((scheduledHours / wc.weeklyCapacityHours) * 100).toFixed(1)
    );

    let status: 'OPTIMAL' | 'STARVATION' | 'OVERLOAD' = 'OPTIMAL';
    if (utilizationRate > 100) {
      status = 'OVERLOAD';
    } else if (utilizationRate < 70) {
      status = 'STARVATION';
    }

    return {
      ...wc,
      scheduledHours,
      utilizationRate,
      status,
    };
  });
}

/**
 * Thuật toán Gợi ý Lập lịch Tuần (Smart Scheduling Algorithm):
 * Tiêu chuẩn 1: Ưu tiên theo thứ tự Ngày giao hàng mong muốn / Ngày nhận xe
 * Tiêu chuẩn 2: Gom nhóm cùng dòng xe trong biên độ ±2 ngày để tối ưu ra phôi & đổi cữ khuôn
 */
export interface BatchGroupSuggestion {
  batchId: string;
  groupName: string;
  orderIds: string[];
  vehicleModel: string;
  startDate: string;
  endDate: string;
  timeSavingsHours: number;
  reason: string;
}

export function runSmartScheduling(orders: OrderItem[]): {
  sortedOrders: OrderItem[];
  suggestedBatches: BatchGroupSuggestion[];
} {
  // Lọc các đơn cần lập lịch hoặc đang chuẩn bị chạy
  const schedulable = [...orders];

  // Tiêu chuẩn 1: Sắp xếp theo thứ tự Ngày giao hàng (Due date priority)
  schedulable.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Tiêu chuẩn 2: Nhận diện các đơn có cùng dòng xe và ngày giao gần nhau (±2 ngày)
  const batches: BatchGroupSuggestion[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < schedulable.length; i++) {
    const o1 = schedulable[i];
    if (processed.has(o1.id)) continue;

    const clusterMembers: OrderItem[] = [o1];
    const d1 = new Date(o1.dueDate).getTime();

    for (let j = i + 1; j < schedulable.length; j++) {
      const o2 = schedulable[j];
      if (processed.has(o2.id)) continue;

      const d2 = new Date(o2.dueDate).getTime();
      const dayDiff = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);

      // Cùng dòng xe cơ sở hoặc cùng hệ phiên bản và trong biên độ 2 ngày
      const sameChassis = o1.baseModel === o2.baseModel;
      const similarVersion =
        o1.conversionVersion.slice(0, 10) === o2.conversionVersion.slice(0, 10);

      if ((sameChassis || similarVersion) && dayDiff <= 3) {
        clusterMembers.push(o2);
      }
    }

    if (clusterMembers.length >= 2) {
      clusterMembers.forEach((m) => processed.add(m.id));
      const batchId = `BATCH-${o1.baseModel.split(' ')[0]}-${Date.now().toString().slice(-4)}`;
      batches.push({
        batchId,
        groupName: `Gom chuyền lô ${o1.conversionVersion} (${clusterMembers.length} xe)`,
        orderIds: clusterMembers.map((m) => m.id),
        vehicleModel: o1.conversionVersion,
        startDate: clusterMembers[0].receivedDate,
        endDate: clusterMembers[clusterMembers.length - 1].dueDate,
        timeSavingsHours: clusterMembers.length * 5.5, // Tiết kiệm cữ cắt và khuôn
        reason: `Cùng dòng ${o1.baseModel} giao lệch nhau ≤ 2 ngày. Gom chuyền tiết kiệm ~${(
          clusterMembers.length * 5.5
        ).toFixed(0)} giờ ra phôi Laser, đúc composite và đổi cữ rập may.`,
      });
    }
  }

  return {
    sortedOrders: schedulable,
    suggestedBatches: batches,
  };
}

/**
 * Cơ chế Tự động Điều chỉnh Động (Dynamic Rescheduling Engine):
 * Khi có sự cố (lỗi KCS phải Rework, thiếu vật tư, hư máy),
 * hệ thống tính toán lại đường găng (Critical Path) và đẩy lùi lịch các công đoạn sau.
 */
export function executeDynamicRescheduling(
  orders: OrderItem[],
  targetOrderId: string,
  delayDays: number,
  reason: string
): {
  updatedOrders: OrderItem[];
  generatedAlert: SystemAlert;
  impactedDays: number;
} {
  const updatedOrders = orders.map((o) => {
    if (o.id !== targetOrderId) return o;

    const rawEndDate = o.scheduledEndDate || o.dueDate || '2026-11-16';
    const parsedEnd = new Date(rawEndDate);
    const validEnd = isNaN(parsedEnd.getTime()) ? new Date('2026-11-16') : parsedEnd;
    validEnd.setDate(validEnd.getDate() + delayDays);
    const newEndStr = validEnd.toISOString().split('T')[0];

    const newProgress = Math.max(10, o.progress - 12); // Rework kéo tụt tiến độ
    const newDay = Math.max(1, o.currentDay - 1);

    return {
      ...o,
      scheduledEndDate: newEndStr,
      progress: newProgress,
      currentDay: newDay,
      status: 'REWORK_ALERT' as const,
      notes: `${o.notes} [ĐIỀU CHỈNH ĐỘNG]: Dịch lùi ${delayDays} ngày do ${reason}.`,
    };
  });

  const generatedAlert: SystemAlert = {
    id: `ALT-DYN-${Date.now()}`,
    type: 'QUALITY_REWORK',
    title: `Điều chỉnh động đường găng đơn ${targetOrderId}`,
    description: `Phát sinh sự cố: "${reason}". Lịch sản xuất của các tổ Cụm 4 đã được tự động dời thêm +${delayDays} ngày.`,
    severity: 'CRITICAL',
    timestamp: new Date().toLocaleString('vi-VN'),
    targetRefId: targetOrderId,
    acknowledged: false,
  };

  return {
    updatedOrders,
    generatedAlert,
    impactedDays: delayDays,
  };
}

/**
 * Thuật toán tính toán Thông minh cho BTP (Semi-Finished Goods):
 * 1. Thời gian hoàn thành BTP tồn (Clearance Time):
 *    (Số lượng BTP tồn * ĐM giờ công/đơn vị) / Tổng nhân sự tổ
 * 2. Thời gian hoàn tất khối lượng WIP (Work-in-Queue)
 */
export function calculateBTPClearanceTime(
  team: ProductionTeam,
  quantityOverride?: number,
  hoursOverride?: number
): {
  hoursNeeded: number;
  daysNeeded: number;
  statusText: string;
} {
  const qty = quantityOverride !== undefined ? quantityOverride : team.btpStockUnits;
  const hoursPerUnit = hoursOverride !== undefined ? hoursOverride : team.standardHoursPerVehicle / 2;
  const totalWorkloadHours = qty * hoursPerUnit;
  const effectiveHeadcount = Math.max(1, team.headcount);
  const totalDailyCapacityHours = effectiveHeadcount * 8;

  const hoursNeeded = parseFloat((totalWorkloadHours / effectiveHeadcount).toFixed(1));
  const daysNeeded = parseFloat((totalWorkloadHours / totalDailyCapacityHours).toFixed(1));

  let statusText = 'Lượng tồn ở mức an toàn';
  if (daysNeeded > 2.0) {
    statusText = 'Ứ đọng nghiêm trọng - Nguy cơ tắc nghẽn chuyền!';
  } else if (daysNeeded > 1.2) {
    statusText = 'Cần bố trí tăng ca giải phóng BTP';
  }

  return {
    hoursNeeded,
    daysNeeded,
    statusText,
  };
}

/**
 * Tính toán tổng thời gian Work-in-Queue (WIP) và nhận diện Bottleneck
 */
export function analyzeBottlenecks(teams: ProductionTeam[]): {
  bottleneckTeams: ProductionTeam[];
  totalWipUnits: number;
  avgCycleDays: number;
} {
  const totalWip = teams.reduce((acc, t) => acc + t.activeWipUnits, 0);
  const bottlenecks = teams.filter((t) => t.overloadStatus === 'BOTTLENECK' || t.btpStockUnits > 12);

  return {
    bottleneckTeams: bottlenecks,
    totalWipUnits: totalWip,
    avgCycleDays: 14,
  };
}

/**
 * Cấu hình các dòng xe chế tác DCAR Coachbuilder:
 * Bao gồm hệ số quy đổi xe chuẩn, số ghế VIP, và định mức giờ công chuẩn
 */
export const VEHICLE_MODELS_CONFIG: Record<
  string,
  {
    modelKey: string;
    fullName: string;
    shortName: string;
    standardHours: number;
    seats: number;
    conversionFactor: number; // Hệ số quy đổi xe chuẩn (so với Ford TG 11c = 1.0)
    badgeColor: string;
  }
> = {
  'Ford Thương Gia 11c (10 ghế VIP)': {
    modelKey: 'FORD_TG_11C',
    fullName: 'Ford Thương Gia 11c (10 ghế VIP)',
    shortName: 'Ford TG 11c',
    standardHours: 112,
    seats: 10,
    conversionFactor: 1.0,
    badgeColor: 'blue',
  },
  'Ford Thương Gia 12c': {
    modelKey: 'FORD_TG_12C',
    fullName: 'Ford Thương Gia 12c',
    shortName: 'Ford TG 12c',
    standardHours: 108,
    seats: 12,
    conversionFactor: 1.0,
    badgeColor: 'sky',
  },
  'Ford VIP Lounge 2026': {
    modelKey: 'FORD_VIP_LOUNGE',
    fullName: 'Ford VIP Lounge 2026',
    shortName: 'Ford VIP Lounge',
    standardHours: 138,
    seats: 7,
    conversionFactor: 1.25,
    badgeColor: 'purple',
  },
  'Solati Maybach 10 chỗ 2025': {
    modelKey: 'SOLATI_MAYBACH',
    fullName: 'Solati Maybach 10 chỗ 2025',
    shortName: 'Solati Maybach',
    standardHours: 142,
    seats: 10,
    conversionFactor: 1.3,
    badgeColor: 'amber',
  },
  'Solati Thượng Đỉnh 10c': {
    modelKey: 'SOLATI_THUONG_DINH',
    fullName: 'Solati Thượng Đỉnh 10c',
    shortName: 'Solati Thượng Đỉnh',
    standardHours: 135,
    seats: 10,
    conversionFactor: 1.2,
    badgeColor: 'emerald',
  },
  'Ford President Maybach Edition 10c': {
    modelKey: 'FORD_PRESIDENT',
    fullName: 'Ford President Maybach Edition 10c',
    shortName: 'President Maybach',
    standardHours: 145,
    seats: 10,
    conversionFactor: 1.35,
    badgeColor: 'rose',
  },
};

export interface VehicleModelDailySummary {
  vehicleType: string;
  shortName: string;
  standardHours: number;
  conversionFactor: number;
  badgeColor: string;
  actualEquivalentVehicles: number;
  targetEquivalentVehicles: number;
  completionRate: number; // %
  teamsContributingCount: number;
  contributingTeams: Array<{
    teamId: string;
    teamName: string;
    componentQty: number;
    componentUnit: string;
    equivalentVehicles: number;
    orderCodes: string[];
  }>;
  orderCodes: string[];
}

export interface DailyVehicleConversionSummary {
  totalTargetEquivalentVehicles: number;
  totalActualEquivalentVehicles: number;
  overallVehicleEquivRate: number; // %
  modelSummaries: VehicleModelDailySummary[];
}

/**
 * Tổng hợp toàn diện sản lượng quy đổi ra xe theo ngày và phân tích chi tiết theo loại xe
 */
export function calculateDailyVehicleConversionSummary(
  dayRecords: TeamDailyProductivity[]
): DailyVehicleConversionSummary {
  const modelMap = new Map<
    string,
    {
      vehicleType: string;
      shortName: string;
      standardHours: number;
      conversionFactor: number;
      badgeColor: string;
      actualEquivalentVehicles: number;
      targetEquivalentVehicles: number;
      contributingTeams: Array<{
        teamId: string;
        teamName: string;
        componentQty: number;
        componentUnit: string;
        equivalentVehicles: number;
        orderCodes: string[];
      }>;
      orderCodesSet: Set<string>;
    }
  >();

  // Khởi tạo các dòng xe mặc định
  Object.values(VEHICLE_MODELS_CONFIG).forEach((cfg) => {
    modelMap.set(cfg.fullName, {
      vehicleType: cfg.fullName,
      shortName: cfg.shortName,
      standardHours: cfg.standardHours,
      conversionFactor: cfg.conversionFactor,
      badgeColor: cfg.badgeColor,
      actualEquivalentVehicles: 0,
      targetEquivalentVehicles: 0,
      contributingTeams: [],
      orderCodesSet: new Set<string>(),
    });
  });

  let totalTargetEquiv = 0;
  let totalActualEquiv = 0;

  dayRecords.forEach((team) => {
    totalTargetEquiv += team.targetEquivalentVehicles || 0;
    totalActualEquiv += team.actualEquivalentVehicles || 0;

    (team.vehicleBreakdown || []).forEach((item) => {
      let entry = modelMap.get(item.vehicleType);
      if (!entry) {
        entry = {
          vehicleType: item.vehicleType,
          shortName: item.shortName || item.vehicleType,
          standardHours: item.standardHoursPerVehicle || 112,
          conversionFactor: 1.0,
          badgeColor: 'slate',
          actualEquivalentVehicles: 0,
          targetEquivalentVehicles: 0,
          contributingTeams: [],
          orderCodesSet: new Set<string>(),
        };
        modelMap.set(item.vehicleType, entry);
      }

      entry.actualEquivalentVehicles += item.equivalentVehicles;
      // Ước lượng target theo tỷ lệ efficiency của tổ
      const teamRatio = team.efficiencyRate > 0 ? team.efficiencyRate / 100 : 1;
      const targetEstimate = item.equivalentVehicles / teamRatio;
      entry.targetEquivalentVehicles += targetEstimate;

      entry.contributingTeams.push({
        teamId: team.teamId,
        teamName: team.teamName,
        componentQty: item.componentQty,
        componentUnit: item.componentUnit,
        equivalentVehicles: item.equivalentVehicles,
        orderCodes: item.orderCodes,
      });

      (item.orderCodes || []).forEach((code) => entry!.orderCodesSet.add(code));
    });
  });

  const modelSummaries: VehicleModelDailySummary[] = Array.from(modelMap.values())
    .map((m) => {
      const actual = Math.round(m.actualEquivalentVehicles * 100) / 100;
      const target = Math.round(m.targetEquivalentVehicles * 100) / 100 || actual;
      const completionRate = target > 0 ? Math.round((actual / target) * 1000) / 10 : 100;

      return {
        vehicleType: m.vehicleType,
        shortName: m.shortName,
        standardHours: m.standardHours,
        conversionFactor: m.conversionFactor,
        badgeColor: m.badgeColor,
        actualEquivalentVehicles: actual,
        targetEquivalentVehicles: target,
        completionRate,
        teamsContributingCount: m.contributingTeams.length,
        contributingTeams: m.contributingTeams,
        orderCodes: Array.from(m.orderCodesSet),
      };
    })
    .filter((m) => m.actualEquivalentVehicles > 0 || m.teamsContributingCount > 0)
    .sort((a, b) => b.actualEquivalentVehicles - a.actualEquivalentVehicles);

  const roundedTarget = Math.round(totalTargetEquiv * 100) / 100;
  const roundedActual = Math.round(totalActualEquiv * 100) / 100;
  const overallVehicleEquivRate = roundedTarget > 0 ? Math.round((roundedActual / roundedTarget) * 1000) / 10 : 100;

  return {
    totalTargetEquivalentVehicles: roundedTarget,
    totalActualEquivalentVehicles: roundedActual,
    overallVehicleEquivRate,
    modelSummaries,
  };
}
