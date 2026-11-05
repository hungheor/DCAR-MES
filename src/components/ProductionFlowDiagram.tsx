import React, { useState, useMemo } from 'react';
import {
  OrderItem,
  NavigationTarget,
  ClusterId,
} from '../types/mes';
import {
  ArrowRight,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Search,
  Filter,
  Eye,
  Maximize2,
  Calendar,
  ShieldAlert,
  Activity,
  Boxes,
  Zap,
  Info,
  ChevronRight,
  ExternalLink,
  X,
  Gauge,
  Workflow,
  Radio,
} from 'lucide-react';

interface ProductionFlowDiagramProps {
  orders: OrderItem[];
  onSelectOrder?: (order: OrderItem) => void;
  onNavigate?: (target: NavigationTarget) => void;
  isReadOnly?: boolean;
}

// Bảng màu phân biệt trực quan cho các Ngày Giao Hàng (Cùng ngày giao = Cùng màu sắc)
interface DeliveryColorPalette {
  name: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  cardBg: string;
  dotColor: string;
  glowClass: string;
  solidBg: string;
  accentText: string;
}

const DELIVERY_COLOR_PALETTES: DeliveryColorPalette[] = [
  {
    name: 'Emerald (Xanh Ngọc)',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    badgeText: 'text-emerald-400',
    borderClass: 'border-emerald-500/80 hover:border-emerald-400',
    cardBg: 'bg-emerald-950/40 hover:bg-emerald-950/60',
    dotColor: 'bg-emerald-400',
    glowClass: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    solidBg: 'bg-emerald-600',
    accentText: 'text-emerald-300',
  },
  {
    name: 'Amber (Vàng Hổ Phách)',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    badgeText: 'text-amber-400',
    borderClass: 'border-amber-500/80 hover:border-amber-400',
    cardBg: 'bg-amber-950/40 hover:bg-amber-950/60',
    dotColor: 'bg-amber-400',
    glowClass: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    solidBg: 'bg-amber-600',
    accentText: 'text-amber-300',
  },
  {
    name: 'Cyan (Xanh Biển)',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    badgeText: 'text-cyan-400',
    borderClass: 'border-cyan-500/80 hover:border-cyan-400',
    cardBg: 'bg-cyan-950/40 hover:bg-cyan-950/60',
    dotColor: 'bg-cyan-400',
    glowClass: 'shadow-[0_0_12px_rgba(6,182,212,0.3)]',
    solidBg: 'bg-cyan-600',
    accentText: 'text-cyan-300',
  },
  {
    name: 'Purple (Tím Hoàng Gia)',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    badgeText: 'text-purple-400',
    borderClass: 'border-purple-500/80 hover:border-purple-400',
    cardBg: 'bg-purple-950/40 hover:bg-purple-950/60',
    dotColor: 'bg-purple-400',
    glowClass: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
    solidBg: 'bg-purple-600',
    accentText: 'text-purple-300',
  },
  {
    name: 'Rose (Hồng San Hô)',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    badgeText: 'text-rose-400',
    borderClass: 'border-rose-500/80 hover:border-rose-400',
    cardBg: 'bg-rose-950/40 hover:bg-rose-950/60',
    dotColor: 'bg-rose-400',
    glowClass: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]',
    solidBg: 'bg-rose-600',
    accentText: 'text-rose-300',
  },
  {
    name: 'Blue (Xanh Lam)',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    badgeText: 'text-blue-400',
    borderClass: 'border-blue-500/80 hover:border-blue-400',
    cardBg: 'bg-blue-950/40 hover:bg-blue-950/60',
    dotColor: 'bg-blue-400',
    glowClass: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    solidBg: 'bg-blue-600',
    accentText: 'text-blue-300',
  },
  {
    name: 'Lime (Xanh Chanh)',
    badgeBg: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    badgeText: 'text-lime-400',
    borderClass: 'border-lime-500/80 hover:border-lime-400',
    cardBg: 'bg-lime-950/40 hover:bg-lime-950/60',
    dotColor: 'bg-lime-400',
    glowClass: 'shadow-[0_0_12px_rgba(132,204,22,0.3)]',
    solidBg: 'bg-lime-600',
    accentText: 'text-lime-300',
  },
  {
    name: 'Orange (Cam Tươi)',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    badgeText: 'text-orange-400',
    borderClass: 'border-orange-500/80 hover:border-orange-400',
    cardBg: 'bg-orange-950/40 hover:bg-orange-950/60',
    dotColor: 'bg-orange-400',
    glowClass: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]',
    solidBg: 'bg-orange-600',
    accentText: 'text-orange-300',
  },
];

// Định nghĩa 17 tổ sản xuất thuộc 4 cụm theo chuẩn dây chuyền DCAR Coachbuilder
interface TeamDefinition {
  id: string;
  code: string;
  name: string;
  shortName: string;
  clusterId: ClusterId;
  headcount: number;
  stdCapacity: string;
  stageSequence: number;
  outputDescription: string;
  isBottleneck?: boolean;
}

const TEAMS_CONFIG: TeamDefinition[] = [
  // Cụm 1: Gia Công Linh Kiện & Phôi (Pre-fabrication)
  {
    id: 'T01',
    code: 'AUDIO-LASER',
    name: 'Cắt Laser & CNC Kim Loại',
    shortName: 'T01: Laser & CNC',
    clusterId: 1,
    headcount: 2,
    stdCapacity: '3 xe/ngày',
    stageSequence: 1,
    outputDescription: 'Phôi thép tấm & bát sắt định vị',
  },
  {
    id: 'T02',
    code: 'CO-KHI-SAT',
    name: 'Cơ Khí Sắt Hàn Khung Sườn',
    shortName: 'T02: Khung Sắt',
    clusterId: 1,
    headcount: 8,
    stdCapacity: '3 xe/ngày',
    stageSequence: 2,
    outputDescription: 'Bộ khung ghế sắt hàn & ray điện',
  },
  {
    id: 'T03',
    code: 'KHUON-COMPOSITE',
    name: 'Khuôn Mẫu Composite & Đúc Form',
    shortName: 'T03: Composite',
    clusterId: 1,
    headcount: 5,
    stdCapacity: '2 xe/ngày',
    stageSequence: 3,
    outputDescription: 'Ốp lưng composite & hộc đồ',
  },
  {
    id: 'T04',
    code: 'MOC-GAO-GHE',
    name: 'Gia Công Mộc Gáo Ghế & Ốp Gỗ',
    shortName: 'T04: Mộc Gáo Ghế',
    clusterId: 1,
    headcount: 4,
    stdCapacity: '2.5 xe/ngày',
    stageSequence: 4,
    outputDescription: 'Gáo ghế ván ép & ốp gỗ taplo',
    isBottleneck: true,
  },

  // Cụm 2: May & Bọc Nệm Nội Thất (Leather & Foam Seating)
  {
    id: 'T05',
    code: 'CAT-DA-VAI',
    name: 'Cắt Da May & Rập Vải Ben',
    shortName: 'T05: Cắt Da & Rập',
    clusterId: 2,
    headcount: 7,
    stdCapacity: '3 xe/ngày',
    stageSequence: 1,
    outputDescription: 'Chi tiết da xén cữ chờ may',
  },
  {
    id: 'T06',
    code: 'DO-MUT-FORM',
    name: 'Đổ Mút Đệm Ghế & Phủ Form',
    shortName: 'T06: Đổ Mút PU',
    clusterId: 2,
    headcount: 4,
    stdCapacity: '3 xe/ngày',
    stageSequence: 2,
    outputDescription: 'Mút đệm ngồi & lưng tựa',
  },
  {
    id: 'T07',
    code: 'MAY-AO-GHE',
    name: 'May Áo Ghế VIP & Chần Chỉ Quả Trám',
    shortName: 'T07: May Áo Ghế VIP',
    clusterId: 2,
    headcount: 10,
    stdCapacity: '3 xe/ngày',
    stageSequence: 3,
    outputDescription: 'Bộ áo da VIP chần chỉ thủ công',
    isBottleneck: true,
  },
  {
    id: 'T08',
    code: 'BOC-VACH-TRAN',
    name: 'Bọc Da Vách Hông & La Phông Trần',
    shortName: 'T08: Bọc Da Vách/Trần',
    clusterId: 2,
    headcount: 8,
    stdCapacity: '2 xe/ngày',
    stageSequence: 4,
    outputDescription: 'Module trần dán Alcantara',
  },

  // Cụm 3: Cụm Điện & Đèn Xe (Electrical Harness & AV Electronics)
  {
    id: 'T09',
    code: 'AUDIO-DAY-DIEN',
    name: 'Bấm Cốt & Bó Dây Điện Tổng',
    shortName: 'T09: Bó Dây Điện',
    clusterId: 3,
    headcount: 5,
    stdCapacity: '2 xe/ngày',
    stageSequence: 1,
    outputDescription: 'Bó dây khoang khách chống cháy',
  },
  {
    id: 'T10',
    code: 'AUDIO-RUOT-GA',
    name: 'Vô Ruột Gà Chống Cháy',
    shortName: 'T10: Vô Ruột Gà',
    clusterId: 3,
    headcount: 2,
    stdCapacity: '3 xe/ngày',
    stageSequence: 2,
    outputDescription: 'Dây tín hiệu bọc ruột gà',
  },
  {
    id: 'T11',
    code: 'AUDIO-RUOT-DEN',
    name: 'Cắt Tán Quang & Ruột Đèn LED',
    shortName: 'T11: Ruột Đèn LED',
    clusterId: 3,
    headcount: 2,
    stdCapacity: '3 xe/ngày',
    stageSequence: 3,
    outputDescription: 'Ruột LED vô cực & laser tản sáng',
  },
  {
    id: 'T12',
    code: 'AUDIO-HT-DEN',
    name: 'Lắp Ráp & Test Đèn 127 Blue',
    shortName: 'T12: Đèn Trần 127 Blue',
    clusterId: 3,
    headcount: 3,
    stdCapacity: '4 xe/ngày',
    stageSequence: 4,
    outputDescription: 'Cụm đèn trần hiệu ứng dạ quang',
  },
  {
    id: 'T13',
    code: 'AUDIO-AM-THANH',
    name: 'Lắp Cụm Âm Thanh JBL & Tivi 43"',
    shortName: 'T13: Âm Thanh & Tivi 43"',
    clusterId: 3,
    headcount: 3,
    stdCapacity: '3 xe/ngày',
    stageSequence: 5,
    outputDescription: 'Giá nâng Tivi 43" kèm Ampli JBL',
  },

  // Cụm 4: Lắp Ráp Tổng Thể & Hoàn Thiện (Final Assembly & Quality Audit)
  {
    id: 'T14',
    code: 'HA-SAN-CACH-AM',
    name: 'Xử Lý Xe Nền, Hạ Sàn & Cách Âm 3 Lớp',
    shortName: 'T14: Hạ Sàn & Cách Âm',
    clusterId: 4,
    headcount: 6,
    stdCapacity: '2 xe/ngày',
    stageSequence: 1,
    outputDescription: 'Sàn gỗ công nghiệp chống nước',
  },
  {
    id: 'T15',
    code: 'LAP-VACH-TRAN',
    name: 'Lắp Khung Vách Cố Định, Quầy Bar & Trần Sao',
    shortName: 'T15: Lắp Vách & Trần Sao',
    clusterId: 4,
    headcount: 7,
    stdCapacity: '2 xe/ngày',
    stageSequence: 2,
    outputDescription: 'Khoang nội thất dựng vách cố định',
  },
  {
    id: 'T16',
    code: 'LAP-GHE-VIP-DIEN',
    name: 'Lắp Ráp Cụm Ghế VIP Chỉnh Điện & Massage',
    shortName: 'T16: Lắp Ghế VIP Điện',
    clusterId: 4,
    headcount: 8,
    stdCapacity: '2 xe/ngày',
    stageSequence: 3,
    outputDescription: 'Đấu nối điện, ghế VIP ngả trượt',
    isBottleneck: true,
  },
  {
    id: 'T17',
    code: 'KCS-TEST-NGHIEM-THU',
    name: 'Kiểm Định KCS 120 Điểm, Thử Mưa & Nghiệm Thu',
    shortName: 'T17: KCS 120 Điểm & PDI',
    clusterId: 4,
    headcount: 4,
    stdCapacity: '3 xe/ngày',
    stageSequence: 4,
    outputDescription: 'Biên bản nghiệm thu xuất xưởng',
  },
];

// Mapping helper to resolve an order to its active workstation team
export const resolveOrderTeamId = (order: OrderItem): string => {
  if (order.currentTeamId) return order.currentTeamId;
  // If not explicitly set, infer from currentStepId or currentCluster
  if (order.currentStepId) {
    const sId = order.currentStepId;
    if (sId === 'S01') return 'T01';
    if (sId === 'S02') return 'T02';
    if (sId === 'S03') return 'T03';
    if (sId === 'S04') return 'T04';
    if (sId === 'S05') return 'T09';
    if (sId === 'S06') return 'T10';
    if (sId === 'S07') return 'T11';
    if (sId === 'S08') return 'T12';
    if (sId === 'S09') return 'T13';
    if (sId === 'S10') return 'T05';
    if (sId === 'S11') return 'T06';
    if (sId === 'S12') return 'T07';
    if (sId === 'S13') return 'T08';
    if (sId === 'S14') return 'T14';
    if (sId === 'S15') return 'T15';
    if (sId === 'S16') return 'T16';
    if (sId === 'S17') return 'T17';
  }
  // Default based on cluster
  if (order.currentCluster === 1) return 'T01';
  if (order.currentCluster === 2) return 'T07';
  if (order.currentCluster === 3) return 'T13';
  return 'T16';
};

export const ProductionFlowDiagram: React.FC<ProductionFlowDiagramProps> = ({
  orders,
  onSelectOrder,
  onNavigate,
  isReadOnly = false,
}) => {
  // State for interactive filters
  const [selectedDueDateFilter, setSelectedDueDateFilter] = useState<string | 'ALL'>('ALL');
  const [selectedClusterFocus, setSelectedClusterFocus] = useState<ClusterId | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [densityMode, setDensityMode] = useState<'DETAILED' | 'COMPACT'>('DETAILED');
  const [inspectedOrder, setInspectedOrder] = useState<OrderItem | null>(null);

  // Filter active in-shop orders (excluding completed ones from shop floor flow)
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'COMPLETED');
  }, [orders]);

  // Extract unique due dates and sort chronologically
  const uniqueDueDates = useMemo(() => {
    const dates = Array.from(new Set(activeOrders.map((o) => o.dueDate))).filter(Boolean);
    return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [activeOrders]);

  // Helper: Tính toán bảng màu theo mức độ gần ngày giao xe (Đơn càng gần ngày giao càng gần với màu ĐỎ)
  const getProximityDeliveryPalette = (dueDateStr: string, baseDateStr = '2026-11-02'): DeliveryColorPalette => {
    const base = new Date(baseDateStr).getTime();
    const due = new Date(dueDateStr).getTime();

    if (isNaN(due)) {
      return {
        name: 'Xám (Chưa xác định)',
        badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/60',
        badgeText: 'text-slate-400',
        borderClass: 'border-slate-600 hover:border-slate-500',
        cardBg: 'bg-slate-900/60 hover:bg-slate-900/80',
        dotColor: 'bg-slate-500',
        glowClass: 'shadow-none',
        solidBg: 'bg-slate-600',
        accentText: 'text-slate-300',
      };
    }

    const days = Math.ceil((due - base) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return {
        name: 'Đỏ Thẫm (Quá Hạn / Giao Hôm Nay)',
        badgeBg: 'bg-red-500/20 text-red-300 border-red-500/60',
        badgeText: 'text-red-400',
        borderClass: 'border-red-500 hover:border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]',
        cardBg: 'bg-red-950/60 hover:bg-red-950/80',
        dotColor: 'bg-red-500',
        glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
        solidBg: 'bg-red-600',
        accentText: 'text-red-300',
      };
    }
    if (days <= 2) {
      return {
        name: 'Đỏ Tươi (Gần Giao ≤2 ngày)',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/60',
        badgeText: 'text-rose-400',
        borderClass: 'border-rose-500 hover:border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        cardBg: 'bg-rose-950/50 hover:bg-rose-950/70',
        dotColor: 'bg-rose-500',
        glowClass: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        solidBg: 'bg-rose-600',
        accentText: 'text-rose-300',
      };
    }
    if (days <= 5) {
      return {
        name: 'Cam Đỏ (Khẩn Cấp 3-5 ngày)',
        badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
        badgeText: 'text-orange-400',
        borderClass: 'border-orange-500 hover:border-orange-400',
        cardBg: 'bg-orange-950/40 hover:bg-orange-950/60',
        dotColor: 'bg-orange-400',
        glowClass: 'shadow-[0_0_10px_rgba(249,115,22,0.3)]',
        solidBg: 'bg-orange-600',
        accentText: 'text-orange-300',
      };
    }
    if (days <= 8) {
      return {
        name: 'Vàng Hổ Phách (6-8 ngày)',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        badgeText: 'text-amber-400',
        borderClass: 'border-amber-500 hover:border-amber-400',
        cardBg: 'bg-amber-950/40 hover:bg-amber-950/60',
        dotColor: 'bg-amber-400',
        glowClass: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
        solidBg: 'bg-amber-600',
        accentText: 'text-amber-300',
      };
    }
    if (days <= 12) {
      return {
        name: 'Xanh Chanh (9-12 ngày)',
        badgeBg: 'bg-lime-500/20 text-lime-300 border-lime-500/50',
        badgeText: 'text-lime-400',
        borderClass: 'border-lime-500 hover:border-lime-400',
        cardBg: 'bg-lime-950/40 hover:bg-lime-950/60',
        dotColor: 'bg-lime-400',
        glowClass: 'shadow-[0_0_10px_rgba(132,204,22,0.25)]',
        solidBg: 'bg-lime-600',
        accentText: 'text-lime-300',
      };
    }
    return {
      name: 'Xanh Lục Bảo (>12 ngày)',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      badgeText: 'text-emerald-400',
      borderClass: 'border-emerald-500 hover:border-emerald-400',
      cardBg: 'bg-emerald-950/40 hover:bg-emerald-950/60',
      dotColor: 'bg-emerald-400',
      glowClass: 'shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      solidBg: 'bg-emerald-600',
      accentText: 'text-emerald-300',
    };
  };

  // Create Delivery Date Color Palette Map:
  // Strictly assigns the SAME color to all orders sharing the SAME dueDate,
  // AND the color gradient shifts toward RED as the due date gets closer!
  const dueDateColorMap = useMemo(() => {
    const map = new Map<string, DeliveryColorPalette>();
    uniqueDueDates.forEach((date) => {
      const palette = getProximityDeliveryPalette(date);
      map.set(date, palette);
    });
    return map;
  }, [uniqueDueDates]);

  // Orders per delivery date counts for legend
  const ordersPerDueDate = useMemo(() => {
    const countMap: Record<string, number> = {};
    activeOrders.forEach((o) => {
      countMap[o.dueDate] = (countMap[o.dueDate] || 0) + 1;
    });
    return countMap;
  }, [activeOrders]);

  // Helper to fetch color palette for a given order
  const getOrderPalette = (dueDate: string): DeliveryColorPalette => {
    return dueDateColorMap.get(dueDate) || getProximityDeliveryPalette(dueDate);
  };

  // Map orders to their active teams (Hỗ trợ 1 đơn hàng sản xuất cùng lúc tại nhiều tổ song song!)
  const ordersByTeam = useMemo(() => {
    const map: Record<string, OrderItem[]> = {};
    TEAMS_CONFIG.forEach((t) => {
      map[t.id] = [];
    });

    activeOrders.forEach((order) => {
      const targetTeamIds = (order.activeTeamIds && order.activeTeamIds.length > 0)
        ? order.activeTeamIds
        : [resolveOrderTeamId(order)];

      targetTeamIds.forEach((teamId) => {
        if (map[teamId]) {
          map[teamId].push(order);
        } else {
          if (!map['T14']) map['T14'] = [];
          map['T14'].push(order);
        }
      });
    });

    return map;
  }, [activeOrders]);

  // Stats across clusters (tính tổng các xe/công đoạn đang gia công tại các cụm)
  const clusterStats = useMemo(() => {
    const getTeamsForOrder = (o: OrderItem) => (o.activeTeamIds && o.activeTeamIds.length > 0) ? o.activeTeamIds : [resolveOrderTeamId(o)];
    
    const c1Orders = activeOrders.filter((o) => getTeamsForOrder(o).some((t) => ['T01', 'T02', 'T03', 'T04'].includes(t)));
    const c2Orders = activeOrders.filter((o) => getTeamsForOrder(o).some((t) => ['T05', 'T06', 'T07', 'T08'].includes(t)));
    const c3Orders = activeOrders.filter((o) => getTeamsForOrder(o).some((t) => ['T09', 'T10', 'T11', 'T12', 'T13'].includes(t)));
    const c4Orders = activeOrders.filter((o) => getTeamsForOrder(o).some((t) => ['T14', 'T15', 'T16', 'T17'].includes(t)));

    return {
      total: activeOrders.length,
      c1: c1Orders.length,
      c2: c2Orders.length,
      c3: c3Orders.length,
      c4: c4Orders.length,
      criticalP1: activeOrders.filter((o) => o.priorityLevel === 'P1_CRITICAL').length,
      onHold: activeOrders.filter((o) => o.status === 'ON_HOLD').length,
      pendingDeployment: activeOrders.filter((o) => o.status === 'PENDING_DEPLOYMENT' || o.status === 'INTAKE').length,
      readyDelivery: activeOrders.filter((o) => o.status === 'READY_FOR_DELIVERY').length,
      atRiskOrDelayed: activeOrders.filter(
        (o) => o.scheduleHealth === 'AT_RISK' || o.scheduleHealth === 'DELAYED' || o.scheduleHealth === 'REWORK'
      ).length,
    };
  }, [activeOrders]);

  // Check if an order matches search and filter
  const isOrderVisible = (order: OrderItem): boolean => {
    if (selectedDueDateFilter !== 'ALL' && order.dueDate !== selectedDueDateFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCustomer = order.customerName.toLowerCase().includes(q);
      const matchModel = order.conversionVersion.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchModel) return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & METRICS BAR (HIGH-TECH VALUE STREAM OVERVIEW)            */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <span>SƠ ĐỒ DÒNG CHẢY SẢN XUẤT</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                    17 Tổ · 4 Cụm · Dây Chuyền DCAR
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Mô phỏng dòng chảy giá trị (Value Stream): Tiền chế song song Cụm 1-2-3 → Hội tụ tại Cụm 4 Lắp ráp & KCS
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">Đang trên chuyền:</span>
                <span className="font-bold text-white text-sm">{clusterStats.total} xe WIP</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <div>
                <span className="text-[10px] text-slate-400 block">Ưu tiên cấp bách:</span>
                <span className="font-bold text-rose-400 text-sm">{clusterStats.criticalP1} đơn P1</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">Cần can thiệp:</span>
                <span className="font-bold text-amber-300 text-sm">{clusterStats.atRiskOrDelayed} cảnh báo</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDensityMode(densityMode === 'DETAILED' ? 'COMPACT' : 'DETAILED')}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-sans font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Thay đổi mật độ hiển thị chi tiết / thu gọn"
              >
                <Maximize2 className="w-3 h-3 text-amber-400" />
                <span>{densityMode === 'DETAILED' ? 'Chế độ Thu gọn' : 'Chế độ Chi tiết'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DELIVERY DATE COLOR CODING LEGEND (CÙNG NGÀY GIAO = CÙNG MÃ MÀU)     */}
        {/* ========================================================================= */}
        <div className="pt-3 border-t border-slate-800/90 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-indigo-500/20 text-indigo-300">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Mã Màu Nhận Diện Theo Hạn Giao Hàng (Due Date Batching):
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (Các đơn cùng ngày giao mang cùng màu sắc đồng nhất)
              </span>
            </div>

            {selectedDueDateFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedDueDateFilter('ALL')}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer self-start"
              >
                ✕ Hủy lọc ngày (Hiển thị tất cả)
              </button>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 font-mono">
            <button
              type="button"
              onClick={() => setSelectedDueDateFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedDueDateFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <span>Tất Cả Ngày Giao</span>
              <span className="text-[10px] opacity-75 font-normal">({activeOrders.length})</span>
            </button>

            {uniqueDueDates.map((dueDate) => {
              const palette = getOrderPalette(dueDate);
              const count = ordersPerDueDate[dueDate] || 0;
              const isSelected = selectedDueDateFilter === dueDate;
              const formattedDate = dueDate.split('-').reverse().join('/');

              return (
                <button
                  key={dueDate}
                  type="button"
                  onClick={() => setSelectedDueDateFilter(isSelected ? 'ALL' : dueDate)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? `${palette.badgeBg} ${palette.borderClass} ${palette.glowClass} scale-105`
                      : `bg-slate-800/90 text-slate-300 border-slate-700 hover:border-slate-500`
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${palette.dotColor} shrink-0`} />
                  <span>Hạn: {formattedDate}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {count} xe
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. TOOLBAR: CLUSTER FILTER & SEARCH */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-slate-400 font-medium">Lọc Cụm:</span>
            {(['ALL', 1, 2, 3, 4] as const).map((cId) => (
              <button
                key={cId}
                type="button"
                onClick={() => setSelectedClusterFocus(cId)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedClusterFocus === cId
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cId === 'ALL'
                  ? 'Toàn Bộ 4 Cụm (Dòng Chảy Đầy Đủ)'
                  : cId === 1
                  ? 'Cụm 1: Phôi & Composite'
                  : cId === 2
                  ? 'Cụm 2: May & Nệm Da'
                  : cId === 3
                  ? 'Cụm 3: Điện & Đèn Xe'
                  : 'Cụm 4: Lắp Ráp & KCS'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã LSX, khách hàng, xe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 text-white placeholder-slate-500 text-xs pl-8 pr-3 py-1.5 rounded border border-slate-700 focus:outline-hidden focus:border-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. VISUAL FLOW STREAM: 4 CLUSTERS ARRANGED IN VALUE STREAM FLOW           */}
      {/* ========================================================================= */}
      <div className="space-y-8">
        {/* ========================================================================= */}
        {/* PHASE 1: PRE-FABRICATION UPSTREAM CLUSTERS (RUNNING IN PARALLEL)         */}
        {/* ========================================================================= */}
        {(selectedClusterFocus === 'ALL' || [1, 2, 3].includes(selectedClusterFocus as number)) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono">
                Giai Đoạn I
              </span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Gia Công Tiền Chế &amp; BTP Đồng Bộ (Cụm 1, 2, 3 Chạy Song Song)
              </h3>
              <span className="text-xs text-slate-500 font-mono hidden md:inline">
                → Chuẩn bị vật tư &amp; mô-đun trước khi xe nền hạ sàn
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ---------------------------------------------------- */}
              {/* CLUSTER 1: PHÔI KIM LOẠI & MỘC COMPOSITE            */}
              {/* ---------------------------------------------------- */}
              {(selectedClusterFocus === 'ALL' || selectedClusterFocus === 1) && (
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  {/* Cluster Header */}
                  <div className="bg-slate-800 text-white p-3.5 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center">
                        C1
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          Gia Công Linh Kiện &amp; Phôi
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          T01 - T04 · 19 thợ · Định hình khung sườn &amp; gáo
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-700/80 px-2 py-0.5 rounded text-amber-300">
                      {clusterStats.c1} xe tại Cụm
                    </span>
                  </div>

                  {/* Workstation List inside Cluster 1 */}
                  <div className="p-3.5 space-y-3 bg-slate-50/50 flex-1">
                    {TEAMS_CONFIG.filter((t) => t.clusterId === 1).map((team) => (
                      <WorkstationBox
                        key={team.id}
                        team={team}
                        orders={ordersByTeam[team.id] || []}
                        getOrderPalette={getOrderPalette}
                        isOrderVisible={isOrderVisible}
                        selectedDueDateFilter={selectedDueDateFilter}
                        densityMode={densityMode}
                        onInspectOrder={(order) => setInspectedOrder(order)}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>

                  {/* Flow Outgoing Badge */}
                  <div className="bg-slate-100 p-2 text-center text-[11px] font-mono font-bold text-slate-600 border-t border-slate-200 flex items-center justify-center gap-1.5">
                    <span>Cấp BTP Khung Sắt &amp; Gáo Gỗ</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-900 font-extrabold">Hội tụ về Cụm 4</span>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* CLUSTER 2: MAY & BỌC NỆM NỘI THẤT                   */}
              {/* ---------------------------------------------------- */}
              {(selectedClusterFocus === 'ALL' || selectedClusterFocus === 2) && (
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  {/* Cluster Header */}
                  <div className="bg-slate-800 text-white p-3.5 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center">
                        C2
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          May &amp; Bọc Nệm Nội Thất
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          T05 - T08 · 29 thợ · Áo da VIP &amp; Trần vách
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-700/80 px-2 py-0.5 rounded text-amber-300">
                      {clusterStats.c2} xe tại Cụm
                    </span>
                  </div>

                  {/* Workstation List inside Cluster 2 */}
                  <div className="p-3.5 space-y-3 bg-slate-50/50 flex-1">
                    {TEAMS_CONFIG.filter((t) => t.clusterId === 2).map((team) => (
                      <WorkstationBox
                        key={team.id}
                        team={team}
                        orders={ordersByTeam[team.id] || []}
                        getOrderPalette={getOrderPalette}
                        isOrderVisible={isOrderVisible}
                        selectedDueDateFilter={selectedDueDateFilter}
                        densityMode={densityMode}
                        onInspectOrder={(order) => setInspectedOrder(order)}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>

                  {/* Flow Outgoing Badge */}
                  <div className="bg-slate-100 p-2 text-center text-[11px] font-mono font-bold text-slate-600 border-t border-slate-200 flex items-center justify-center gap-1.5">
                    <span>Cấp Áo Da, Mút Đệm &amp; Trần Alcantara</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-900 font-extrabold">Hội tụ về Cụm 4</span>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* CLUSTER 3: CỤM ĐIỆN & ĐÈN XE                         */}
              {/* ---------------------------------------------------- */}
              {(selectedClusterFocus === 'ALL' || selectedClusterFocus === 3) && (
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  {/* Cluster Header */}
                  <div className="bg-slate-800 text-white p-3.5 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center">
                        C3
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          Cụm Điện &amp; Đèn Xe
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          T09 - T13 · 15 thợ · Dây tổng, Đèn 127 Blue &amp; AV
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-700/80 px-2 py-0.5 rounded text-amber-300">
                      {clusterStats.c3} xe tại Cụm
                    </span>
                  </div>

                  {/* Workstation List inside Cluster 3 */}
                  <div className="p-3.5 space-y-3 bg-slate-50/50 flex-1">
                    {TEAMS_CONFIG.filter((t) => t.clusterId === 3).map((team) => (
                      <WorkstationBox
                        key={team.id}
                        team={team}
                        orders={ordersByTeam[team.id] || []}
                        getOrderPalette={getOrderPalette}
                        isOrderVisible={isOrderVisible}
                        selectedDueDateFilter={selectedDueDateFilter}
                        densityMode={densityMode}
                        onInspectOrder={(order) => setInspectedOrder(order)}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>

                  {/* Flow Outgoing Badge */}
                  <div className="bg-slate-100 p-2 text-center text-[11px] font-mono font-bold text-slate-600 border-t border-slate-200 flex items-center justify-center gap-1.5">
                    <span>Cấp Bó Dây, Cụm Đèn &amp; Âm Thanh JBL</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-900 font-extrabold">Hội tụ về Cụm 4</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONVERGENCE CONNECTOR FLOW (HỘI TỤ TẤT CẢ VỀ XE NỀN CỤM 4)             */}
        {/* ========================================================================= */}
        {selectedClusterFocus === 'ALL' && (
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-dashed border-amber-400/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-900 text-amber-400 border border-amber-400/50 px-4 py-1.5 rounded-full text-xs font-mono font-black shadow-md flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>HỘI TỤ BTP TẠI XE NỀN → CHUYỂN TIẾP VÀO CỤM 4 LẮP RÁP TỔNG THỂ</span>
                <span className="text-slate-400 font-normal">▼</span>
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: CONVERGED FINAL ASSEMBLY & AUDIT (CỤM 4: T14 -> T17)             */}
        {/* ========================================================================= */}
        {(selectedClusterFocus === 'ALL' || selectedClusterFocus === 4) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 font-mono">
                Giai Đoạn II &amp; III
              </span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Lắp Ráp Hoàn Thiện &amp; Nghiệm Thu KCS (Cụm 4 Theo Thứ Tự Tuần Tự)
              </h3>
              <span className="text-xs text-slate-500 font-mono hidden md:inline">
                → Hạ sàn cách âm → Dựng vách &amp; trần sao → Lắp ghế VIP điện → Thử mưa &amp; PDI
              </span>
            </div>

            <div className="bg-white border-2 border-amber-400/80 rounded-xl overflow-hidden shadow-sm">
              {/* Cluster 4 Header */}
              <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-xs">
                    C4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
                        Cụm 4: Lắp Ráp Tổng Thể &amp; Hoàn Thiện
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-400 border border-amber-400/40">
                        CONVERGED ASSEMBLY LINE
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      T14 → T15 → T16 → T17 · 25 thợ kỹ thuật cao · Dòng chảy tuần tự trên thân xe
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="bg-slate-800 px-3 py-1 rounded text-slate-300 border border-slate-700">
                    WIP Cụm 4: <strong className="text-amber-400">{clusterStats.c4} xe</strong>
                  </span>
                </div>
              </div>

              {/* 4 Sequential Stations of Cluster 4 arranged horizontally with flow arrows */}
              <div className="p-4 bg-slate-50/70">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {TEAMS_CONFIG.filter((t) => t.clusterId === 4).map((team, idx) => (
                    <div key={team.id} className="relative flex flex-col">
                      <WorkstationBox
                        team={team}
                        orders={ordersByTeam[team.id] || []}
                        getOrderPalette={getOrderPalette}
                        isOrderVisible={isOrderVisible}
                        selectedDueDateFilter={selectedDueDateFilter}
                        densityMode={densityMode}
                        onInspectOrder={(order) => setInspectedOrder(order)}
                        onNavigate={onNavigate}
                        highlightCluster4
                        stationStepIndex={idx + 1}
                      />
                    </div>
                  ))}
                </div>

                {/* Final dispatch status bar */}
                <div className="mt-4 pt-4 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Sau khi vượt qua <strong>Tổ 17 (KCS 120 Điểm &amp; Buồng Thử Mưa)</strong>, xe sẽ được cấp tem xuất xưởng và chuyển sang trạng thái <strong>Đã Nghiệm Thu &amp; Bàn Giao (COMPLETED)</strong>.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 font-mono text-[11px]">Điểm kết thúc dòng chảy:</span>
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-xs flex items-center gap-1 border border-emerald-300">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Bàn Giao Showroom / Khách Hàng</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL: DETAILED ORDER INSPECTOR ON SHOP FLOOR                          */}
      {/* ========================================================================= */}
      {inspectedOrder && (
        <OrderInspectorModal
          order={inspectedOrder}
          palette={getOrderPalette(inspectedOrder.dueDate)}
          onClose={() => setInspectedOrder(null)}
          onNavigate={onNavigate}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: WORKSTATION BOX (TỔ SẢN XUẤT)
// =========================================================================
interface WorkstationBoxProps {
  team: TeamDefinition;
  orders: OrderItem[];
  getOrderPalette: (dueDate: string) => DeliveryColorPalette;
  isOrderVisible: (order: OrderItem) => boolean;
  selectedDueDateFilter: string | 'ALL';
  densityMode: 'DETAILED' | 'COMPACT';
  onInspectOrder: (order: OrderItem) => void;
  onNavigate?: (target: NavigationTarget) => void;
  highlightCluster4?: boolean;
  stationStepIndex?: number;
}

const WorkstationBox: React.FC<WorkstationBoxProps> = ({
  team,
  orders,
  getOrderPalette,
  isOrderVisible,
  selectedDueDateFilter,
  densityMode,
  onInspectOrder,
  onNavigate,
  highlightCluster4 = false,
  stationStepIndex,
}) => {
  const visibleOrders = orders.filter(isOrderVisible);
  const totalOrdersAtStation = orders.length;

  return (
    <div
      className={`rounded-lg border bg-white shadow-2xs overflow-hidden transition-all flex flex-col ${
        team.isBottleneck
          ? 'border-amber-400 ring-1 ring-amber-400/20'
          : highlightCluster4
          ? 'border-slate-300 hover:border-amber-400'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Workstation Header */}
      <div
        className={`p-2.5 flex items-center justify-between border-b ${
          highlightCluster4
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-slate-100 text-slate-800 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`font-mono font-black text-xs px-1.5 py-0.5 rounded shrink-0 ${
              highlightCluster4
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800 text-white'
            }`}
          >
            {team.id}
          </span>
          <div className="truncate">
            <h5
              className="text-xs font-bold truncate leading-tight"
              title={team.name}
            >
              {team.name}
            </h5>
            <span
              className={`text-[10px] block font-mono truncate ${
                highlightCluster4 ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {team.headcount} thợ · {team.stdCapacity}
            </span>
          </div>
        </div>

        {/* Station WIP Counter Badge */}
        <div className="shrink-0 flex items-center gap-1">
          {team.isBottleneck && (
            <span
              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 border border-amber-500/40"
              title="Trạm điểm nghẽn năng lực (Bottleneck)"
            >
              CẬN TẢI
            </span>
          )}
          <span
            className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-full ${
              totalOrdersAtStation > 0
                ? highlightCluster4
                  ? 'bg-amber-400 text-slate-950 font-extrabold'
                  : 'bg-slate-900 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalOrdersAtStation} xe
          </span>
        </div>
      </div>

      {/* Station Output Note */}
      <div className="px-2.5 py-1 bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-mono">
        <span className="truncate" title={team.outputDescription}>
          BTP: {team.outputDescription}
        </span>
        {stationStepIndex && (
          <span className="font-bold text-amber-700 shrink-0">
            Bước {stationStepIndex}/4
          </span>
        )}
      </div>

      {/* Orders Inside this Workstation */}
      <div className="p-2 space-y-2 flex-1 min-h-[90px] flex flex-col justify-start">
        {visibleOrders.length > 0 ? (
          visibleOrders.map((order) => {
            const palette = getOrderPalette(order.dueDate);
            const isMatchDueDate =
              selectedDueDateFilter === 'ALL' || order.dueDate === selectedDueDateFilter;

            return (
              <div
                key={order.id}
                onClick={() => onInspectOrder(order)}
                className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all transform hover:-translate-y-0.5 ${
                  palette.cardBg
                } ${palette.borderClass} ${
                  isMatchDueDate ? palette.glowClass : 'opacity-40'
                }`}
              >
                {/* Order Top Bar: ID, Type & Due Date */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-slate-950 dark:text-white text-xs">
                      {order.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-black px-1 py-0.2 rounded ${
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

                  {/* Delivery Due Date Badge (Colored by dueDate palette) */}
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border ${palette.badgeBg}`}
                    title={`Hạn giao khách hàng: ${order.dueDate}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${palette.dotColor}`} />
                    <span>Giao: {order.dueDate.slice(5)}</span>
                  </div>
                </div>

                {/* Customer & Vehicle Info */}
                <div className="space-y-0.5 mb-2">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate" title={order.customerName}>
                    {order.customerName}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {order.conversionVersion}
                  </span>
                </div>

                {/* Progress & Priority Alert */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Tiến độ xe:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{order.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${palette.solidBg}`}
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                </div>

                {/* Special Status Badges: Parallel, Hold, Pending, Ready for Delivery */}
                <div className="mt-1.5 space-y-1">
                  {order.activeTeamIds && order.activeTeamIds.length > 1 && (
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200" title={`Đang sản xuất đồng thời tại ${order.activeTeamIds.join(', ')}`}>
                        ⚡ Song song ({order.activeTeamIds.join(', ')})
                      </span>
                    </div>
                  )}

                  {order.status === 'ON_HOLD' && (
                    <div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300 block truncate" title={`Lý do treo: ${order.holdReason || 'Tạm dừng thi công'}`}>
                        ⏸️ TREO ĐƠN: {order.holdReason || 'Tạm dừng'}
                      </span>
                    </div>
                  )}

                  {order.status === 'READY_FOR_DELIVERY' && (
                    <div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 block">
                        🚚 CHỜ GIAO XE (ĐÃ KCS ĐẠT)
                      </span>
                    </div>
                  )}

                  {order.status === 'PENDING_DEPLOYMENT' && (
                    <div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300 block">
                        ⏳ CHỜ TRIỂN KHAI (CHƯA DUYỆT)
                      </span>
                    </div>
                  )}
                </div>

                {/* Badges for P1 and Delay if present */}
                {(order.priorityLevel === 'P1_CRITICAL' || order.delayDays || order.scheduleHealth === 'REWORK') && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between gap-1 text-[10px] font-mono">
                    {order.priorityLevel === 'P1_CRITICAL' && (
                      <span className="px-1.5 py-0.2 rounded font-black bg-rose-500 text-white animate-pulse">
                        P1 KHẨN
                      </span>
                    )}
                    {order.delayDays ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        ⚠️ Trễ {order.delayDays}d
                      </span>
                    ) : order.scheduleHealth === 'REWORK' ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        ⚠️ Sửa lỗi
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Đúng hạn
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-full min-h-[70px] flex flex-col items-center justify-center text-slate-400 text-center p-2 rounded border border-dashed border-slate-200">
            <span className="text-[11px] font-mono">Trạm sẵn sàng</span>
            <span className="text-[10px] text-slate-400">Không có xe chờ</span>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: ORDER INSPECTOR MODAL
// =========================================================================
interface OrderInspectorModalProps {
  order: OrderItem;
  palette: DeliveryColorPalette;
  onClose: () => void;
  onNavigate?: (target: NavigationTarget) => void;
  isReadOnly?: boolean;
}

const OrderInspectorModal: React.FC<OrderInspectorModalProps> = ({
  order,
  palette,
  onClose,
  onNavigate,
  isReadOnly,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header with Delivery Date Color Accent */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-sm text-white shadow-xs ${palette.solidBg}`}
            >
              {order.orderType}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{order.id}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${palette.badgeBg}`}
                >
                  Hạn Giao: {order.dueDate}
                </span>
                {order.priorityLevel === 'P1_CRITICAL' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    P1 CRITICAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {order.customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Key Parameters Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">Dòng xe độ:</span>
              <strong className="text-slate-900">{order.baseModel}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Phiên bản DCAR:</span>
              <strong className="text-slate-900">{order.conversionVersion}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Tổ đang đứng:</span>
              <strong className="text-amber-700">
                {order.currentTeamId || resolveOrderTeamId(order)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Tiến độ tổng thể:</span>
              <strong className="text-emerald-700">{order.progress}% (Ngày {order.currentDay}/14)</strong>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600">Tiến độ gia công hoàn thiện:</span>
              <span className="font-bold text-slate-900">{order.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all ${palette.solidBg}`}
                style={{ width: `${order.progress}%` }}
              />
            </div>
          </div>

          {/* Color matching note */}
          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${palette.badgeBg}`}
          >
            <span className={`w-3 h-3 rounded-full shrink-0 ${palette.dotColor}`} />
            <div className="text-[11px] leading-relaxed">
              <strong>Đồng bộ ngày giao xe ({order.dueDate}):</strong> Đơn hàng này thuộc lô giao ngày{' '}
              <strong>{order.dueDate.split('-').reverse().join('/')}</strong>, được gán mã màu trực quan{' '}
              <strong>{palette.name}</strong> để giám sát chung tiến độ cùng các đơn khác trong cùng đợt xuất xưởng.
            </div>
          </div>

          {/* Parallel Active Teams Banner */}
          {order.activeTeamIds && order.activeTeamIds.length > 1 && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs space-y-1.5">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                ⚡ Đang Sản Xuất Đồng Thời Tại Các Tổ (Parallel Teams):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {order.activeTeamIds.map((tId) => (
                  <span
                    key={tId}
                    className="px-2 py-0.5 rounded bg-white text-indigo-900 border border-indigo-300 font-mono font-bold text-[11px] shadow-2xs"
                  >
                    {tId}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Đơn hàng được phân bổ sản xuất đồng thời tại nhiều trạm/cụm chuyên biệt để rút ngắn tổng thời gian chu kỳ.
              </p>
            </div>
          )}

          {/* Hold Alert Banner */}
          {order.status === 'ON_HOLD' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-950 space-y-1">
              <span className="font-bold text-rose-900 flex items-center gap-1.5">
                ⏸️ ĐƠN HÀNG ĐANG BỊ TREO (TẠM DỪNG THI CÔNG):
              </span>
              <p><strong>Ngày bắt đầu treo:</strong> {order.holdDate || '2026-11-02'}</p>
              <p><strong>Nguyên nhân treo đơn:</strong> {order.holdReason || 'Chờ khách hàng chốt phương án thiết kế'}</p>
            </div>
          )}

          {/* Current station details */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              Công Đoạn &amp; Vị Trí Hiện Tại Trên Sơ Đồ:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Mã công đoạn:</span>
                <span className="font-mono font-bold text-slate-900">
                  {order.currentStepId || 'S01'} - {order.currentStepName || 'Gia công chi tiết'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Tình trạng tiến độ:</span>
                <span
                  className={`font-mono font-bold ${
                    order.scheduleHealth === 'REWORK' || order.scheduleHealth === 'DELAYED'
                      ? 'text-rose-600'
                      : order.scheduleHealth === 'AT_RISK'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {order.scheduleHealth === 'REWORK'
                    ? 'ĐANG SỬA LỖI (REWORK)'
                    : order.scheduleHealth === 'DELAYED'
                    ? `TRỄ ${order.delayDays || 1} NGÀY`
                    : order.scheduleHealth === 'AT_RISK'
                    ? 'CÓ NGUY CƠ TRỄ'
                    : 'ĐẢM BẢO TIẾN ĐỘ'}
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-700 font-mono border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-sans">Ghi chú kế hoạch &amp; điều phối:</span>
                {order.notes}
              </div>
            )}
          </div>

          {/* Special Equipment Options */}
          {order.options && order.options.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Gói Trang Bị Chuyên Biệt (Options):
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {order.options.map((opt, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] border border-slate-200"
                  >
                    • {opt}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Hợp đồng: <strong>{order.contractRef || 'HĐ-DCAR-2026'}</strong>
          </span>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate({
                    tab: 'orders',
                    subView: 'JOURNEY_TRACKING',
                    orderId: order.id,
                  });
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Xem Hành Trình 14 Ngày Chi Tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
