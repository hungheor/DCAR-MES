import React, { useState, useEffect } from 'react';
import {
  OrderItem,
  CRPWorkcenter,
  ProductionTeam,
  SystemAlert,
  ReportFilterPeriod,
  NavigationTarget,
  ClusterId,
} from '../types/mes';
import {
  PARETO_DEFECT_DATA,
  REWORK_STATS_SUMMARY,
  REWORK_TEAM_BREAKDOWN,
  EXECUTIVE_MEETING_KPIS,
  INITIAL_COMPLETED_ARCHIVE_ORDERS,
} from '../data/mockData';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Clock,
  RotateCcw,
  Target,
  Calendar,
  Filter,
  Users,
  CheckCircle,
  AlertOctagon,
  Timer,
  ArrowUpRight,
  ChevronRight,
  ExternalLink,
  PieChart,
  BarChart2,
  Archive,
  Printer,
  Search,
  FileText,
} from 'lucide-react';
import { ProductionOrderPrintModal } from './ProductionOrderPrintModal';
import { DailyTeamProductivityReport } from './DailyTeamProductivityReport';

interface ExecutiveDashboardProps {
  orders: OrderItem[];
  workcenters: CRPWorkcenter[];
  teams: ProductionTeam[];
  alerts: SystemAlert[];
  onNavigateTab: (tab: string) => void;
  onSelectOrder: (order: OrderItem) => void;
  onNavigate?: (target: NavigationTarget) => void;
  initialSubView?: string;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  orders,
  workcenters,
  teams,
  alerts,
  onNavigateTab,
  onSelectOrder,
  onNavigate,
  initialSubView,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportFilterPeriod>('WEEK_44');
  const [activeSection, setActiveSection] = useState<'MEETING' | 'QUALITY_PARETO' | 'CRP' | 'DAILY_PRODUCTIVITY' | 'COMPLETED_ARCHIVE'>(
    (initialSubView as any) || 'MEETING'
  );

  useEffect(() => {
    if (initialSubView) {
      setActiveSection(initialSubView as any);
    }
  }, [initialSubView]);

  // Chart type toggles (Cột / Đường / Tròn)
  const [healthChartType, setHealthChartType] = useState<'BAR' | 'LINE' | 'PIE'>('BAR');
  const [leadTimeChartType, setLeadTimeChartType] = useState<'BAR' | 'LINE' | 'PIE'>('BAR');
  const [paretoChartType, setParetoChartType] = useState<'PARETO_COMBO' | 'BAR' | 'PIE'>('PARETO_COMBO');
  const [clusterChartType, setClusterChartType] = useState<'BAR' | 'LINE' | 'PIE'>('BAR');

  // Completed Orders Archive State
  const [completedOrders, setCompletedOrders] = useState<OrderItem[]>(() => {
    const fromProps = orders.filter((o) => o.status === 'COMPLETED');
    const ids = new Set(fromProps.map((o) => o.id));
    const combined = [...fromProps];
    INITIAL_COMPLETED_ARCHIVE_ORDERS.forEach((item) => {
      if (!ids.has(item.id)) {
        combined.push(item);
      }
    });
    return combined;
  });
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'ALL' | 'G' | 'T' | 'B'>('ALL');

  // Print modal state
  const [printOrder, setPrintOrder] = useState<OrderItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const handleOpenPrint = (ord: OrderItem) => {
    setPrintOrder(ord);
    setIsPrintModalOpen(true);
  };

  const periodData = EXECUTIVE_MEETING_KPIS[selectedPeriod] || EXECUTIVE_MEETING_KPIS['WEEK_44'];

  // Critical alerts
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Báo Cáo Quản Trị &amp; Điều Hành Sản Xuất
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Báo cáo tổng hợp Ban Giám Đốc: Tiến độ giao xe OTD, OEE, Lead time chu kỳ, Pareto lỗi KCS 80/20 và Tùy biến đa dạng biểu đồ Cột, Đường, Tròn
          </p>
        </div>

        {/* Navigation Quick Links */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('scheduling')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
          >
            Lập Lịch &amp; Dispatch
          </button>
          <button
            onClick={() => onNavigateTab('orders')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Tracking Hành Trình Đơn
          </button>
        </div>
      </div>

      {/* FILTER BAR THEO TUẦN / THÁNG (MEETING FILTER TOOLBAR) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold shrink-0">
          <Filter className="w-4 h-4 text-amber-500" />
          <span>Kỳ Báo Cáo / Họp Sản Xuất:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'WEEK_44', label: 'Tuần 44 (Hiện Tại: 02/11 - 07/11)' },
              { id: 'WEEK_45', label: 'Tuần 45 (09/11 - 14/11)' },
              { id: 'MONTH_10', label: 'Tháng 10/2026' },
              { id: 'MONTH_11', label: 'Tháng 11/2026 (Cao Điểm)' },
              { id: 'ALL_Q4', label: 'Toàn Quý IV/2026' },
            ] as const
          ).map((p) => {
            const isSelected = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-slate-400 self-end md:self-center">
          {periodData.dateRangeDesc}
        </span>
      </div>

      {/* SUBTABS SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveSection('MEETING')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'MEETING'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>01. Họp Giao Ban: Tiến Độ, Hiệu Suất &amp; Lead Time Đơn</span>
        </button>

        <button
          onClick={() => setActiveSection('QUALITY_PARETO')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'QUALITY_PARETO'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-rose-500" />
          <span>02. Báo Cáo Chất Lượng &amp; Biểu Đồ Pareto 80/20</span>
        </button>

        <button
          onClick={() => setActiveSection('CRP')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'CRP'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>03. Tải Trọng Năng Lực 6 Xưởng &amp; 95 Thợ (CRP)</span>
        </button>

        <button
          onClick={() => setActiveSection('DAILY_PRODUCTIVITY')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'DAILY_PRODUCTIVITY'
              ? 'border-amber-500 text-slate-900 font-bold bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>04. Báo Cáo Năng Suất Theo Ngày (17 Tổ)</span>
          <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
            Mới
          </span>
        </button>

        <button
          onClick={() => setActiveSection('COMPLETED_ARCHIVE')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSection === 'COMPLETED_ARCHIVE'
              ? 'border-emerald-600 text-emerald-950 font-bold bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive className="w-4 h-4 text-emerald-600" />
          <span>05. Kho Lưu Trữ Đơn Hoàn Thành</span>
          <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
            {completedOrders.length} xe
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PRODUCTION MEETING, OTD, EFFICIENCY, LEAD TIME     */}
      {/* ======================================================== */}
      {activeSection === 'MEETING' && (
        <div className="space-y-6">
          {/* PRIMARY KPI CARDS DRIVEN BY PERIOD FILTER */}
          {/* PRIMARY KPI CARDS DRIVEN BY PERIOD FILTER (CLICK TO DRILL-DOWN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Orders */}
            <div
              onClick={() => {
                if (onNavigate) {
                  onNavigate({ tab: 'orders', subView: 'LIST', sourceDesc: 'KPI Tổng Lệnh Sản Xuất' });
                } else {
                  onNavigateTab('orders');
                }
              }}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-5 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
              title="Bấm để xem danh sách toàn bộ Lệnh sản xuất"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span className="group-hover:text-slate-900 transition-colors">Tổng Lệnh Sản Xuất</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {periodData.totalOrders}
                </span>
                <span className="text-xs text-slate-500">đơn trong kỳ</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>{periodData.orderMix.gCount} Bán (G) · {periodData.orderMix.tCount} Triển lãm (T)</span>
                <span className="text-amber-700 font-bold">{periodData.orderMix.bCount} Bảo hành (B)</span>
              </div>
            </div>

            {/* KPI 2: On-Time Delivery Rate */}
            <div
              onClick={() => {
                if (onNavigate) {
                  onNavigate({
                    tab: 'orders',
                    subView: 'JOURNEY_TRACKING',
                    orderId: 'B2610002',
                    sourceDesc: 'KPI Tỷ Lệ Đúng Hẹn (OTD) - Đơn Nguy Cơ',
                  });
                } else {
                  onNavigateTab('orders');
                }
              }}
              className="bg-white border border-slate-200 hover:border-emerald-400 rounded-lg p-5 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
              title="Bấm để xem hành trình các đơn trễ cần giải cứu"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span className="group-hover:text-emerald-900 transition-colors">Tỷ Lệ Đúng Hẹn (OTD)</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500 group-hover:text-emerald-700 transition-colors" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
                  {periodData.otdRatePercent}%
                </span>
                <span className="text-xs text-slate-500">Mục tiêu ≥ 95%</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>Đúng tiến độ: {periodData.healthBreakdown.onTrack} xe</span>
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <span>{periodData.healthBreakdown.delayed + periodData.healthBreakdown.rework} xe cần cứu</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* KPI 3: Workshop Efficiency OEE */}
            <div
              onClick={() => {
                if (onNavigate) {
                  onNavigate({
                    tab: 'scheduling',
                    subView: 'DAILY_DISPATCH',
                    sourceDesc: 'KPI Hiệu Suất Xưởng (OEE)',
                  });
                } else {
                  onNavigateTab('scheduling');
                }
              }}
              className="bg-white border border-slate-200 hover:border-amber-400 rounded-lg p-5 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
              title="Bấm để xem điều phối lịch trình theo ngày của 17 tổ"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span className="group-hover:text-amber-900 transition-colors">Hiệu Suất Xưởng (OEE)</span>
                <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:text-amber-700 transition-colors" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {periodData.efficiencyRatePercent}%
                </span>
                <span className="text-xs text-slate-500">95 thợ lành nghề</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>Định biên ca: 8h/ngày</span>
                <span className="text-emerald-700 font-semibold">+2.4% vs tháng trước</span>
              </div>
            </div>

            {/* KPI 4: Average Lead Time */}
            <div
              onClick={() => {
                if (onNavigate) {
                  onNavigate({
                    tab: 'matrix',
                    sourceDesc: 'KPI Lead Time Bình Quân Chế Tác',
                  });
                } else {
                  onNavigateTab('matrix');
                }
              }}
              className="bg-white border border-slate-200 hover:border-indigo-400 rounded-lg p-5 shadow-2xs space-y-2 cursor-pointer transition-all hover:shadow-xs group"
              title="Bấm để xem ma trận tiến độ 17 tổ qua 14 ngày chuyền"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span className="group-hover:text-indigo-900 transition-colors">Lead Time Chế Tác Bình Quân</span>
                <ArrowUpRight className="w-4 h-4 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-700 font-mono tabular-nums">
                  {periodData.avgLeadTimeDays}
                </span>
                <span className="text-xs text-slate-500">ngày / xe</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>Chuẩn: {periodData.standardLeadTimeDays} ngày</span>
                <span className="text-emerald-700 font-bold">Rút ngắn {Math.abs(periodData.leadTimeGapDays)} ngày</span>
              </div>
            </div>
          </div>

          {/* TWO COLUMN ROW: ORDER PROGRESS HEALTH + LEAD TIME VARIANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT (6 cols): PROGRESS & HEALTH BREAKDOWN */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Phân Bổ Tiến Độ &amp; Sức Khỏe Đơn Hàng (Health Distribution)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trạng thái tiến độ thực tế phục vụ chỉ đạo họp giao ban sản xuất
                  </p>
                </div>

                {/* Multi-chart type toggle: Cột | Đường | Tròn */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-center">
                  <button
                    onClick={() => setHealthChartType('BAR')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      healthChartType === 'BAR'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Xem dạng biểu đồ Cột"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Cột</span>
                  </button>
                  <button
                    onClick={() => setHealthChartType('LINE')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      healthChartType === 'LINE'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Xem dạng biểu đồ Đường xu hướng"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Đường</span>
                  </button>
                  <button
                    onClick={() => setHealthChartType('PIE')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      healthChartType === 'PIE'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Xem dạng biểu đồ Tròn cơ cấu"
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    <span>Tròn</span>
                  </button>
                </div>
              </div>

              {/* RENDER VIEW: BAR CHART */}
              {healthChartType === 'BAR' && (
                <div className="space-y-1.5">
                  <div className="w-full h-4 bg-slate-100 rounded-md overflow-hidden flex">
                    <div
                      style={{
                        width: `${(periodData.healthBreakdown.onTrack / periodData.totalOrders) * 100}%`,
                      }}
                      className="bg-emerald-500 h-full"
                      title={`Đúng tiến độ: ${periodData.healthBreakdown.onTrack}`}
                    />
                    <div
                      style={{
                        width: `${(periodData.healthBreakdown.atRisk / periodData.totalOrders) * 100}%`,
                      }}
                      className="bg-amber-400 h-full"
                      title={`Nguy cơ chậm: ${periodData.healthBreakdown.atRisk}`}
                    />
                    <div
                      style={{
                        width: `${(periodData.healthBreakdown.delayed / periodData.totalOrders) * 100}%`,
                      }}
                      className="bg-rose-500 h-full"
                      title={`Trễ hạn: ${periodData.healthBreakdown.delayed}`}
                    />
                    <div
                      style={{
                        width: `${(periodData.healthBreakdown.rework / periodData.totalOrders) * 100}%`,
                      }}
                      className="bg-purple-600 h-full"
                      title={`Vướng lỗi KCS / Rework: ${periodData.healthBreakdown.rework}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-100">
                      <span className="text-emerald-800 text-[11px] block font-medium">Đúng Tiến Độ (On-Track)</span>
                      <strong className="text-emerald-900 text-lg font-mono">
                        {periodData.healthBreakdown.onTrack}
                      </strong>
                      <span className="text-[10px] text-emerald-700 block">
                        {Math.round((periodData.healthBreakdown.onTrack / periodData.totalOrders) * 100)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-amber-50 border border-amber-100">
                      <span className="text-amber-800 text-[11px] block font-medium">Nguy Cơ Chậm (At-Risk)</span>
                      <strong className="text-amber-900 text-lg font-mono">
                        {periodData.healthBreakdown.atRisk}
                      </strong>
                      <span className="text-[10px] text-amber-700 block">Lệch 1 ngày</span>
                    </div>

                    <div
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate({
                            tab: 'orders',
                            subView: 'JOURNEY_TRACKING',
                            orderId: 'B2610002',
                            sourceDesc: 'Báo cáo: Đơn Trễ Hạn Cần Bù Tiến Độ',
                          });
                        } else {
                          onNavigateTab('orders');
                        }
                      }}
                      className="p-2.5 rounded bg-rose-50 border border-rose-200 hover:border-rose-400 cursor-pointer transition-all"
                      title="Bấm để mở trực tiếp đơn hàng trễ tiến độ B2610002"
                    >
                      <span className="text-rose-800 text-[11px] block font-medium flex items-center justify-between">
                        <span>Trễ Hạn (Delayed)</span>
                        <ArrowUpRight className="w-3 h-3 text-rose-500" />
                      </span>
                      <strong className="text-rose-900 text-lg font-mono">
                        {periodData.healthBreakdown.delayed}
                      </strong>
                      <span className="text-[10px] text-rose-700 block font-semibold">Cần tăng ca · Chi tiết ↗</span>
                    </div>

                    <div
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate({
                            tab: 'orders',
                            subView: 'JOURNEY_TRACKING',
                            orderId: 'B2610002',
                            sourceDesc: 'Báo cáo: Đơn Vướng Lỗi KCS Sửa Hàng',
                          });
                        } else {
                          onNavigateTab('orders');
                        }
                      }}
                      className="p-2.5 rounded bg-purple-50 border border-purple-200 hover:border-purple-400 cursor-pointer transition-all"
                      title="Bấm để mở trực tiếp đơn hàng vướng lỗi KCS B2610002"
                    >
                      <span className="text-purple-800 text-[11px] block font-medium flex items-center justify-between">
                        <span>Sửa Hàng (Rework)</span>
                        <ArrowUpRight className="w-3 h-3 text-purple-500" />
                      </span>
                      <strong className="text-purple-900 text-lg font-mono">
                        {periodData.healthBreakdown.rework}
                      </strong>
                      <span className="text-[10px] text-purple-700 block font-semibold">Lỗi KCS · Chi tiết ↗</span>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER VIEW: LINE TREND CHART */}
              {healthChartType === 'LINE' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Đường Xu Hướng Tiến Độ Qua Các Chặng Chuyền</span>
                    <span className="font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      OTD: {periodData.otdRatePercent}%
                    </span>
                  </div>

                  <div className="h-40 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 380 130">
                      <line x1="40" y1="20" x2="360" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="50" x2="360" y2="50" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="80" x2="360" y2="80" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="110" x2="360" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />

                      <text x="32" y="24" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">100%</text>
                      <text x="32" y="54" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">90%</text>
                      <text x="32" y="84" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">80%</text>

                      {/* 95% Benchmark Line */}
                      <line x1="40" y1="35" x2="360" y2="35" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />
                      <text x="362" y="38" fontSize="8.5" fill="#d97706" fontWeight="bold" fontFamily="monospace">Mục tiêu 95%</text>

                      {/* On-Track Trajectory Path */}
                      <path
                        d="M 60 45 Q 140 40, 240 32 T 340 26"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      <circle cx="60" cy="45" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="150" cy="38" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="240" cy="32" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="340" cy="26" r="5" fill="#047857" stroke="#ffffff" strokeWidth="2" />

                      <text x="340" y="16" fontSize="9.5" fill="#047857" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        {periodData.otdRatePercent}%
                      </text>

                      <text x="60" y="124" fontSize="8.5" fill="#64748b" textAnchor="middle">Tiếp Nhận</text>
                      <text x="150" y="124" fontSize="8.5" fill="#64748b" textAnchor="middle">Cụm 1-2</text>
                      <text x="240" y="124" fontSize="8.5" fill="#64748b" textAnchor="middle">Cụm 3-4</text>
                      <text x="340" y="124" fontSize="8.5" fill="#64748b" textAnchor="middle">KCS Giao Xe</text>
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200 pt-2 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>Thực tế OTD: <strong>{periodData.otdRatePercent}%</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed border-amber-600" />
                      <span>Ngưỡng chuẩn BGĐ: <strong>95%</strong></span>
                    </span>
                  </div>
                </div>
              )}

              {/* RENDER VIEW: PIE / DONUT CHART */}
              {healthChartType === 'PIE' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* SVG Donut */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="18"
                          strokeDasharray={`${(periodData.healthBreakdown.onTrack / periodData.totalOrders) * 238.76} 238.76`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="18"
                          strokeDasharray={`${(periodData.healthBreakdown.atRisk / periodData.totalOrders) * 238.76} 238.76`}
                          strokeDashoffset={`-${(periodData.healthBreakdown.onTrack / periodData.totalOrders) * 238.76}`}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#f43f5e"
                          strokeWidth="18"
                          strokeDasharray={`${(periodData.healthBreakdown.delayed / periodData.totalOrders) * 238.76} 238.76`}
                          strokeDashoffset={`-${((periodData.healthBreakdown.onTrack + periodData.healthBreakdown.atRisk) / periodData.totalOrders) * 238.76}`}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#9333ea"
                          strokeWidth="18"
                          strokeDasharray={`${(periodData.healthBreakdown.rework / periodData.totalOrders) * 238.76} 238.76`}
                          strokeDashoffset={`-${((periodData.healthBreakdown.onTrack + periodData.healthBreakdown.atRisk + periodData.healthBreakdown.delayed) / periodData.totalOrders) * 238.76}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black font-mono text-slate-900 leading-none">
                          {periodData.totalOrders}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Đơn LSX
                        </span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 space-y-1.5 text-xs font-mono w-full">
                      <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50/70 border border-emerald-100">
                        <span className="flex items-center gap-1.5 text-emerald-900 font-sans font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Đúng tiến độ</span>
                        </span>
                        <strong>{periodData.healthBreakdown.onTrack} xe ({Math.round((periodData.healthBreakdown.onTrack / periodData.totalOrders) * 100)}%)</strong>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-amber-50/70 border border-amber-100">
                        <span className="flex items-center gap-1.5 text-amber-900 font-sans font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>Nguy cơ trễ</span>
                        </span>
                        <strong>{periodData.healthBreakdown.atRisk} xe ({Math.round((periodData.healthBreakdown.atRisk / periodData.totalOrders) * 100)}%)</strong>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-rose-50/70 border border-rose-100">
                        <span className="flex items-center gap-1.5 text-rose-900 font-sans font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span>Trễ hạn</span>
                        </span>
                        <strong>{periodData.healthBreakdown.delayed} xe ({Math.round((periodData.healthBreakdown.delayed / periodData.totalOrders) * 100)}%)</strong>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-purple-50/70 border border-purple-100">
                        <span className="flex items-center gap-1.5 text-purple-900 font-sans font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                          <span>Sửa hàng KCS</span>
                        </span>
                        <strong>{periodData.healthBreakdown.rework} xe ({Math.round((periodData.healthBreakdown.rework / periodData.totalOrders) * 100)}%)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Health Distribution Footer Indicator */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Dữ liệu: Kiểm định 17 tổ chuyền sản xuất</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OTD chuẩn đạt {periodData.otdRatePercent}%</span>
                </span>
              </div>
            </div>

            {/* RIGHT (6 cols): LEAD TIME ACTUAL VS STANDARD BY VEHICLE MODEL */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    So Sánh Lead Time Thực Tế vs Định Mức Từng Dòng Xe
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chuẩn định mức 14 ngày chuyền tuyến tính qua 4 Cụm &amp; 17 Tổ
                  </p>
                </div>

                {/* Multi-chart type toggle: Cột | Đường | Tròn */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-center">
                  <button
                    onClick={() => setLeadTimeChartType('BAR')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      leadTimeChartType === 'BAR'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Biểu đồ Cột so sánh ngày chu kỳ"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Cột</span>
                  </button>
                  <button
                    onClick={() => setLeadTimeChartType('LINE')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      leadTimeChartType === 'LINE'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Biểu đồ Đường độ lệch chuẩn"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Đường</span>
                  </button>
                  <button
                    onClick={() => setLeadTimeChartType('PIE')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      leadTimeChartType === 'PIE'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Biểu đồ Tròn tỷ trọng ngày công"
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    <span>Tròn</span>
                  </button>
                </div>
              </div>

              {/* RENDER VIEW: BAR CHART */}
              {leadTimeChartType === 'BAR' && (
                <div className="space-y-3">
                  {periodData.modelLeadTimes.map((m) => {
                    const isFaster = m.varianceDays < 0;
                    const isSlower = m.varianceDays > 0;

                    return (
                      <div key={m.modelName} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{m.modelName}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-500 text-[11px]">
                              Thực tế: <strong>{m.actualDays} ngày</strong> (Chuẩn {m.targetDays}d)
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isFaster
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isSlower
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {m.varianceDays > 0 ? `+${m.varianceDays}d (Chậm)` : `${m.varianceDays}d (Nhanh)`}
                            </span>
                          </div>
                        </div>

                        {/* Bar Visualization */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${Math.min(100, (m.actualDays / 16) * 100)}%` }}
                            className={`h-full rounded-full transition-all ${
                              m.status === 'OPTIMAL'
                                ? 'bg-emerald-500'
                                : m.status === 'ACCEPTABLE'
                                ? 'bg-slate-800'
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* RENDER VIEW: LINE VARIANCE CHART */}
              {leadTimeChartType === 'LINE' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Đường Biến Thiên Lead Time (Thực Tế vs Chuẩn 14 Ngày)</span>
                    <span className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                      TB: {periodData.avgLeadTimeDays} ngày
                    </span>
                  </div>

                  <div className="h-40 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 380 130">
                      <line x1="40" y1="20" x2="360" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="55" x2="360" y2="55" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="90" x2="360" y2="90" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="110" x2="360" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />

                      <text x="32" y="24" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">16d</text>
                      <text x="32" y="59" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">14d</text>
                      <text x="32" y="94" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">10d</text>

                      {/* Standard 14d Reference Line */}
                      <line x1="40" y1="55" x2="360" y2="55" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" />
                      <text x="362" y="59" fontSize="8.5" fill="#2563eb" fontWeight="bold" fontFamily="monospace">Chuẩn 14d</text>

                      {/* Actual Lead Time Line */}
                      <polyline
                        points="60,68 130,76 200,64 270,48 340,95"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Data Dots */}
                      <circle cx="60" cy="68" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <text x="60" y="60" fontSize="8.5" fill="#047857" fontWeight="bold" textAnchor="middle" fontFamily="monospace">13.1d</text>

                      <circle cx="130" cy="76" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <text x="130" y="68" fontSize="8.5" fill="#047857" fontWeight="bold" textAnchor="middle" fontFamily="monospace">12.7d</text>

                      <circle cx="200" cy="64" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <text x="200" y="56" fontSize="8.5" fill="#047857" fontWeight="bold" textAnchor="middle" fontFamily="monospace">13.3d</text>

                      <circle cx="270" cy="48" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                      <text x="270" y="40" fontSize="8.5" fill="#b45309" fontWeight="bold" textAnchor="middle" fontFamily="monospace">14.4d</text>

                      <circle cx="340" cy="95" r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                      <text x="340" y="87" fontSize="8.5" fill="#4338ca" fontWeight="bold" textAnchor="middle" fontFamily="monospace">7.8d</text>

                      {/* X-axis labels */}
                      <text x="60" y="124" fontSize="8.5" fill="#475569" textAnchor="middle">Ford 11c</text>
                      <text x="130" y="124" fontSize="8.5" fill="#475569" textAnchor="middle">Ford 12c</text>
                      <text x="200" y="124" fontSize="8.5" fill="#475569" textAnchor="middle">Lounge</text>
                      <text x="270" y="124" fontSize="8.5" fill="#475569" textAnchor="middle">Solati 10c</text>
                      <text x="340" y="124" fontSize="8.5" fill="#475569" textAnchor="middle">BH VIP</text>
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200 pt-2 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block" />
                      <span>Đường thực tế từng mẫu</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block border-t border-dashed border-blue-600" />
                      <span>Định mức 14 ngày chuẩn</span>
                    </span>
                  </div>
                </div>
              )}

              {/* RENDER VIEW: PIE / DONUT CHART */}
              {leadTimeChartType === 'PIE' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* SVG Donut */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#0ea5e9" strokeWidth="18" strokeDasharray="52 238.76" strokeDashoffset="0" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray="50 238.76" strokeDashoffset="-52" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="18" strokeDasharray="53 238.76" strokeDashoffset="-102" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray="57 238.76" strokeDashoffset="-155" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ec4899" strokeWidth="18" strokeDasharray="27 238.76" strokeDashoffset="-212" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black font-mono text-slate-900 leading-none">
                          {periodData.avgLeadTimeDays}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Ngày / Xe
                        </span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 space-y-1 text-xs font-mono w-full">
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-sky-50 text-sky-900">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                          <span>Ford Thương Gia 11c</span>
                        </span>
                        <strong>13.1 ngày</strong>
                      </div>
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-emerald-50 text-emerald-900">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Ford Thương Gia 12c</span>
                        </span>
                        <strong>12.7 ngày</strong>
                      </div>
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-purple-50 text-purple-900">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <span>Ford VIP Lounge 2026</span>
                        </span>
                        <strong>13.3 ngày</strong>
                      </div>
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-amber-50 text-amber-900">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>Solati Maybach 10c</span>
                        </span>
                        <strong>14.4 ngày</strong>
                      </div>
                      <div className="flex items-center justify-between py-1 px-1.5 rounded bg-pink-50 text-pink-900">
                        <span className="flex items-center gap-1.5 font-sans">
                          <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                          <span>Solati Bảo Hành (B)</span>
                        </span>
                        <strong>7.8 ngày</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CLUSTER WORKLOAD & BOTTLENECK ANALYSIS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hiệu Suất &amp; Tải Trọng 4 Cụm Phân Xưởng (Giao Ban Báo Cáo)
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi giờ công kế hoạch vs thực tế và điểm nghẽn trọng yếu tại các cụm
                </p>
              </div>

              {/* Multi-chart type toggle: Cột | Đường | Tròn */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-center">
                <button
                  onClick={() => setClusterChartType('BAR')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    clusterChartType === 'BAR'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Biểu đồ Cột tải trọng cụm"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Cột</span>
                </button>
                <button
                  onClick={() => setClusterChartType('LINE')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    clusterChartType === 'LINE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Biểu đồ Đường công suất"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Đường</span>
                </button>
                <button
                  onClick={() => setClusterChartType('PIE')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    clusterChartType === 'PIE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Biểu đồ Tròn tỷ trọng giờ công cụm"
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Tròn</span>
                </button>
              </div>
            </div>

            {/* RENDER VIEW: BAR CHART (Cluster Cards & Comparisons) */}
            {clusterChartType === 'BAR' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {periodData.clusterPerformance.map((c) => {
                  const isOver = c.utilizationPercent > 100;

                  return (
                    <div
                      key={c.clusterId}
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate({
                            tab: 'scheduling',
                            subView: 'DAILY_DISPATCH',
                            clusterId: c.clusterId as ClusterId,
                            sourceDesc: `Tải trọng ${c.clusterName}`,
                          });
                        } else {
                          onNavigateTab('scheduling');
                        }
                      }}
                      className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-lg space-y-3 cursor-pointer transition-all hover:shadow-xs group"
                      title={`Bấm để mở lịch trình chi tiết của Cụm ${c.clusterId}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-amber-800 transition-colors flex items-center gap-1">
                          <span>{c.clusterName}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700" />
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            isOver ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.utilizationPercent}% Tải
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-xs">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Kế hoạch: {c.plannedHours}h</span>
                          <span>Thực tế: {c.actualHours}h</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Chất lượng KCS:</span>
                          <strong className="text-emerald-700">{c.qualityRatePercent}%</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                        <span className="text-slate-400 block text-[10px]">Điểm nghẽn cần tháo gỡ:</span>
                        <span className="font-medium text-slate-800">{c.bottleneckNotes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER VIEW: LINE UTILIZATION CHART */}
            {clusterChartType === 'LINE' && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Đường Biến Thiên Tỷ Lệ Tải Trọng Công Suất (%) Qua 4 Cụm Phân Xưởng</span>
                  <span className="font-mono text-slate-600 text-[11px]">Ngưỡng tới hạn an toàn: 100%</span>
                </div>

                <div className="h-44 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 140">
                    <line x1="40" y1="20" x2="380" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="40" y1="55" x2="380" y2="55" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="40" y1="90" x2="380" y2="90" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="40" y1="120" x2="380" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />

                    <text x="32" y="24" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">110%</text>
                    <text x="32" y="59" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">100%</text>
                    <text x="32" y="94" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">90%</text>

                    {/* 100% Capacity Threshold Line */}
                    <line x1="40" y1="55" x2="380" y2="55" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                    <text x="382" y="59" fontSize="8.5" fill="#dc2626" fontWeight="bold" fontFamily="monospace">100% Tối Đa</text>

                    {/* Utilization Curve */}
                    <polyline
                      points="70,66 160,47 250,67 340,51"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Dots with values */}
                    <circle cx="70" cy="66" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    <text x="70" y="57" fontSize="8.5" fill="#047857" fontWeight="bold" textAnchor="middle" fontFamily="monospace">96.7%</text>

                    <circle cx="160" cy="47" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                    <text x="160" y="38" fontSize="8.5" fill="#dc2626" fontWeight="bold" textAnchor="middle" fontFamily="monospace">102.6% (Quá tải)</text>

                    <circle cx="250" cy="67" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    <text x="250" y="58" fontSize="8.5" fill="#047857" fontWeight="bold" textAnchor="middle" fontFamily="monospace">96.4%</text>

                    <circle cx="340" cy="51" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                    <text x="340" y="42" fontSize="8.5" fill="#b45309" fontWeight="bold" textAnchor="middle" fontFamily="monospace">101.1%</text>

                    {/* X-axis Cluster labels */}
                    <text x="70" y="133" fontSize="8.5" fill="#475569" textAnchor="middle">Cụm 1: Phôi/CK</text>
                    <text x="160" y="133" fontSize="8.5" fill="#475569" textAnchor="middle">Cụm 2: May/Nệm</text>
                    <text x="250" y="133" fontSize="8.5" fill="#475569" textAnchor="middle">Cụm 3: Điện/Đèn</text>
                    <text x="340" y="133" fontSize="8.5" fill="#475569" textAnchor="middle">Cụm 4: Lắp Ráp</text>
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200 pt-2 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                    <span>Đường % tải thực tế</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-dashed border-rose-600" />
                    <span>Ngưỡng cảnh báo nghẽn chuyền (100%)</span>
                  </span>
                </div>
              </div>
            )}

            {/* RENDER VIEW: PIE / DONUT CHART */}
            {clusterChartType === 'PIE' && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* SVG Donut */}
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                      {/* Cụm 1: 890h (~20%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#0ea5e9" strokeWidth="18" strokeDasharray="48 238.76" strokeDashoffset="0" />
                      {/* Cụm 2: 1580h (~35%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray="83 238.76" strokeDashoffset="-48" />
                      {/* Cụm 3: 1080h (~24%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="18" strokeDasharray="57 238.76" strokeDashoffset="-131" />
                      {/* Cụm 4: 1840h (~41%) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray="98 238.76" strokeDashoffset="-188" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-black font-mono text-slate-900 leading-none">
                        5.390h
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Tổng Giờ
                      </span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono w-full">
                    <div className="p-2 rounded bg-sky-50 text-sky-950 border border-sky-100">
                      <span className="flex items-center gap-1.5 font-sans font-semibold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                        <span>Cụm 1: Phôi &amp; Cơ Khí</span>
                      </span>
                      <div className="mt-1 flex justify-between font-mono text-[11px]">
                        <span>890 giờ</span>
                        <strong className="text-sky-700">96.7% Tải</strong>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-amber-50 text-amber-950 border border-amber-200">
                      <span className="flex items-center gap-1.5 font-sans font-semibold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Cụm 2: May &amp; Bọc Nệm</span>
                      </span>
                      <div className="mt-1 flex justify-between font-mono text-[11px]">
                        <span>1.580 giờ</span>
                        <strong className="text-rose-700 font-bold">102.6% (Nghẽn)</strong>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-purple-50 text-purple-950 border border-purple-100">
                      <span className="flex items-center gap-1.5 font-sans font-semibold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <span>Cụm 3: Điện &amp; Đèn Xe</span>
                      </span>
                      <div className="mt-1 flex justify-between font-mono text-[11px]">
                        <span>1.080 giờ</span>
                        <strong className="text-purple-700">96.4% Tải</strong>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-emerald-50 text-emerald-950 border border-emerald-100">
                      <span className="flex items-center gap-1.5 font-sans font-semibold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Cụm 4: Lắp Ráp &amp; KCS</span>
                      </span>
                      <div className="mt-1 flex justify-between font-mono text-[11px]">
                        <span>1.840 giờ</span>
                        <strong className="text-amber-700">101.1% Tải</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: QUALITY PARETO 80/20 & REWORK ANALYSIS            */}
      {/* ======================================================== */}
      {activeSection === 'QUALITY_PARETO' && (
        <div className="space-y-6">
          {/* Top Metric Cards for Quality & Rework */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Tổng Số Lỗi KCS Ghi Nhận</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {REWORK_STATS_SUMMARY.totalDefectsRecorded}
                </span>
                <span className="text-xs text-slate-500">vụ việc</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                <span>Bình quân</span>
                <span>{REWORK_STATS_SUMMARY.avgHoursPerDefect} giờ / lỗi</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Thời Gian Sửa Hàng (Rework)</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-600 font-mono tabular-nums">
                  {REWORK_STATS_SUMMARY.totalReworkHours}
                </span>
                <span className="text-xs text-slate-500">giờ công</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                <span>Tỷ lệ giờ sửa / tổng giờ</span>
                <span className="text-rose-600 font-bold">{REWORK_STATS_SUMMARY.reworkRatioPercent}%</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Quy Luật Pareto 80/20</span>
                <Target className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-700 font-mono tabular-nums">
                  79.5%
                </span>
                <span className="text-xs text-slate-500">tập trung tại 3 lỗi đầu</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                <span>Tổ 16 (Ghế điện) + Tổ 07 (May) + Tổ 04 (Mộc)</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Chi Phí Giờ Công Hao Phí</span>
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  ~23.7 Tr
                </span>
                <span className="text-xs text-slate-500">VNĐ</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Đơn giá: 200.000 đ/giờ thợ</span>
                <span className="text-emerald-700 font-semibold">-12% vs tuần trước</span>
              </div>
            </div>
          </div>

          {/* PARETO 80/20 ANALYSIS CHART */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-rose-600 uppercase tracking-wider block">
                  Công Cụ Kiểm Soát Chất Lượng Nâng Cao (QC 7 Tools)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Biểu Đồ Pareto Lỗi KCS &amp; Phân Bổ Thời Gian Sửa Hàng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xác định 20% nhóm nguyên nhân cốt lõi gây ra 80% thời gian sửa hàng
                </p>
              </div>

              {/* Multi-chart type toggle: Pareto Combo | Cột Giờ Sửa | Tròn Cơ Cấu */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-center">
                <button
                  onClick={() => setParetoChartType('PARETO_COMBO')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    paretoChartType === 'PARETO_COMBO'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Biểu đồ Pareto Kết Hợp (Cột lỗi & Đường tích lũy)"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cột &amp; Đường Pareto</span>
                </button>
                <button
                  onClick={() => setParetoChartType('BAR')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    paretoChartType === 'BAR'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Biểu đồ Cột Giờ Sửa Hàng"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cột Giờ Sửa</span>
                </button>
                <button
                  onClick={() => setParetoChartType('PIE')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    paretoChartType === 'PIE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Biểu đồ Tròn Cơ Cấu Lỗi"
                >
                  <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tròn Cơ Cấu</span>
                </button>
              </div>
            </div>

            {/* VIEW 1: PARETO COMBO (BARS + CUMULATIVE LINE + 80% THRESHOLD) */}
            {paretoChartType === 'PARETO_COMBO' && (
              <div className="space-y-4">
                {/* SVG Combo Pareto Chart */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800">Biểu Đồ Kết Hợp Pareto 80/20 (Trục Kép: Số Ca Lỗi &amp; % Tích Lũy)</span>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-rose-500 rounded-xs inline-block" />
                        <span>Số ca lỗi (Trục trái)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-amber-500 inline-block" />
                        <span>% Tích lũy (Trục phải)</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                        <span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-dashed" />
                        <span>80% Cut-off</span>
                      </span>
                    </div>
                  </div>

                  <div className="h-52 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 540 160">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="500" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="50" x2="500" y2="50" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="80" x2="500" y2="80" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="110" x2="500" y2="110" stroke="#e2e8f0" strokeDasharray="3,3" />
                      <line x1="40" y1="130" x2="500" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Left Y-axis (Defect counts) */}
                      <text x="32" y="24" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">18</text>
                      <text x="32" y="60" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">12</text>
                      <text x="32" y="96" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">6</text>
                      <text x="32" y="134" fontSize="8.5" fill="#94a3b8" textAnchor="end" fontFamily="monospace">0</text>

                      {/* Right Y-axis (% Cumulative) */}
                      <text x="508" y="24" fontSize="8.5" fill="#d97706" textAnchor="start" fontFamily="monospace">100%</text>
                      <text x="508" y="60" fontSize="8.5" fill="#d97706" textAnchor="start" fontFamily="monospace">80%</text>
                      <text x="508" y="96" fontSize="8.5" fill="#d97706" textAnchor="start" fontFamily="monospace">50%</text>
                      <text x="508" y="134" fontSize="8.5" fill="#d97706" textAnchor="start" fontFamily="monospace">0%</text>

                      {/* 80% Pareto Reference Cutoff Line */}
                      <line x1="40" y1="60" x2="500" y2="60" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4,4" />
                      <text x="270" y="56" fontSize="8.5" fill="#e11d48" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        --- Ngưỡng Pareto 80% (3 nhóm lỗi cốt lõi) ---
                      </text>

                      {/* Column Bars (Defect count) */}
                      {/* Defect 1: 18 -> height ~100px */}
                      <rect x="60" y="30" width="36" height="100" rx="3" fill="#f43f5e" />
                      <text x="78" y="24" fontSize="8.5" fill="#9f1239" fontWeight="bold" textAnchor="middle" fontFamily="monospace">18</text>

                      {/* Defect 2: 12 -> height ~66px */}
                      <rect x="140" y="64" width="36" height="66" rx="3" fill="#fb7185" />
                      <text x="158" y="58" fontSize="8.5" fill="#9f1239" fontWeight="bold" textAnchor="middle" fontFamily="monospace">12</text>

                      {/* Defect 3: 5 -> height ~28px */}
                      <rect x="220" y="102" width="36" height="28" rx="3" fill="#fda4af" />
                      <text x="238" y="96" fontSize="8.5" fill="#9f1239" fontWeight="bold" textAnchor="middle" fontFamily="monospace">5</text>

                      {/* Defect 4: 4 -> height ~22px */}
                      <rect x="300" y="108" width="36" height="22" rx="3" fill="#cbd5e1" />
                      <text x="318" y="102" fontSize="8.5" fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">4</text>

                      {/* Defect 5: 3 -> height ~16px */}
                      <rect x="380" y="114" width="36" height="16" rx="3" fill="#cbd5e1" />
                      <text x="398" y="108" fontSize="8.5" fill="#475569" fontWeight="bold" textAnchor="middle" fontFamily="monospace">3</text>

                      {/* Defect 6: 2 -> height ~11px */}
                      <rect x="460" y="119" width="36" height="11" rx="3" fill="#e2e8f0" />
                      <text x="478" y="113" fontSize="8.5" fill="#64748b" fontWeight="bold" textAnchor="middle" fontFamily="monospace">2</text>

                      {/* Cumulative % Curve (Amber/Orange line) */}
                      {/* Points: (78, 93) 40.9% -> (158, 62) 68.2% -> (238, 52) 79.5% -> (318, 42) 88.6% -> (398, 32) 95.5% -> (478, 22) 100% */}
                      <polyline
                        points="78,93 158,62 238,52 318,42 398,32 478,22"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Cumulative Points with text */}
                      <circle cx="78" cy="93" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                      <text x="96" y="93" fontSize="8" fill="#92400e" fontWeight="bold" fontFamily="monospace">40.9%</text>

                      <circle cx="158" cy="62" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                      <text x="176" y="62" fontSize="8" fill="#92400e" fontWeight="bold" fontFamily="monospace">68.2%</text>

                      <circle cx="238" cy="52" r="4.5" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                      <text x="256" y="50" fontSize="8.5" fill="#dc2626" fontWeight="black" fontFamily="monospace">79.5% (80/20)</text>

                      <circle cx="318" cy="42" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="398" cy="32" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="478" cy="22" r="4" fill="#d97706" stroke="#ffffff" strokeWidth="2" />

                      {/* X-axis labels */}
                      <text x="78" y="145" fontSize="8" fill="#334155" textAnchor="middle">Ghế VIP (T16)</text>
                      <text x="158" y="145" fontSize="8" fill="#334155" textAnchor="middle">Da Nappa (T07)</text>
                      <text x="238" y="145" fontSize="8" fill="#334155" textAnchor="middle">Mộc/Gáo (T04)</text>
                      <text x="318" y="145" fontSize="8" fill="#334155" textAnchor="middle">Dây Điện (T09)</text>
                      <text x="398" y="145" fontSize="8" fill="#334155" textAnchor="middle">Trần LED (T12)</text>
                      <text x="478" y="145" fontSize="8" fill="#334155" textAnchor="middle">Sàn Gỗ (T14)</text>
                    </svg>
                  </div>
                </div>

                {/* Pareto Bars (Clickable to drill down into team schedule) */}
                <div className="space-y-3">
                  {PARETO_DEFECT_DATA.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate({
                            tab: 'scheduling',
                            subView: 'DAILY_DISPATCH',
                            teamId: item.relatedTeam,
                            sourceDesc: `Phân tích Pareto 80/20: ${item.categoryName}`,
                          });
                        } else {
                          onNavigateTab('scheduling');
                        }
                      }}
                      className="space-y-1.5 text-xs p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200 group"
                      title={`Bấm để chuyển sang lịch điều phối của ${item.relatedTeam}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-400 w-5">0{idx + 1}.</span>
                          <span className="font-bold text-slate-900 group-hover:text-rose-700 transition-colors flex items-center gap-1">
                            <span>{item.categoryName}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                          </span>
                          <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                            {item.relatedTeam} ↗
                          </span>
                        </div>
                        <div className="flex items-center gap-4 font-mono">
                          <span>{item.defectCount} lỗi ({item.percentage}%)</span>
                          <span className="font-bold text-rose-600">{item.reworkHours}h sửa</span>
                          <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.2 rounded">
                            Tích lũy: {item.cumulativePercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${(item.defectCount / 18) * 100}%` }}
                          className="bg-rose-500 h-full rounded-full transition-all group-hover:bg-rose-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 2: BAR CHART (REWORK HOURS & COST) */}
            {paretoChartType === 'BAR' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Xếp Hạng Giờ Công Sửa Hàng &amp; Thiệt Hại Chi Phí Phát Sinh</span>
                    <span className="font-mono text-rose-700">Tổng: {REWORK_STATS_SUMMARY.totalReworkHours}h công</span>
                  </div>

                  <div className="space-y-3">
                    {PARETO_DEFECT_DATA.map((item, idx) => {
                      const costVND = item.reworkHours * 200000;
                      return (
                        <div key={item.id} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">
                              0{idx + 1}. {item.categoryName} ({item.relatedTeam})
                            </span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-rose-600 font-bold">{item.reworkHours} giờ sửa</span>
                              <span className="text-slate-500 font-semibold">{costVND.toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${(item.reworkHours / 48) * 100}%` }}
                              className="bg-gradient-to-r from-amber-500 to-rose-600 h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: PIE / DONUT (DEFECT OCCURRENCE SHARE) */}
            {paretoChartType === 'PIE' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* SVG Donut */}
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                      <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                        {/* Ghế VIP: 40.9% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f43f5e" strokeWidth="18" strokeDasharray="97.6 238.76" strokeDashoffset="0" />
                        {/* Da Nappa: 27.3% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#fb7185" strokeWidth="18" strokeDasharray="65.2 238.76" strokeDashoffset="-97.6" />
                        {/* Mộc gáo: 11.4% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray="27.2 238.76" strokeDashoffset="-162.8" />
                        {/* Dây điện: 9.1% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#8b5cf6" strokeWidth="18" strokeDasharray="21.7 238.76" strokeDashoffset="-190" />
                        {/* Trần LED: 6.8% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#0ea5e9" strokeWidth="18" strokeDasharray="16.2 238.76" strokeDashoffset="-211.7" />
                        {/* Sàn gỗ: 4.5% */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray="10.8 238.76" strokeDashoffset="-227.9" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black font-mono text-slate-900 leading-none">
                          79.5%
                        </span>
                        <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">
                          3 Lỗi Đầu
                        </span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 space-y-1.5 text-xs font-mono w-full">
                      <div className="p-1.5 rounded bg-rose-50 border border-rose-200 flex justify-between items-center text-rose-950 font-sans">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span>1. Chập &amp; kẹt ray Ghế VIP (T16)</span>
                        </span>
                        <strong className="font-mono">18 lỗi (40.9%)</strong>
                      </div>
                      <div className="p-1.5 rounded bg-rose-50/60 border border-rose-100 flex justify-between items-center text-rose-900 font-sans">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                          <span>2. Nhăn &amp; lệch mũi chỉ Da (T07)</span>
                        </span>
                        <strong className="font-mono">12 lỗi (27.3%)</strong>
                      </div>
                      <div className="p-1.5 rounded bg-amber-50 border border-amber-200 flex justify-between items-center text-amber-950 font-sans">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>3. Cong vênh mộc &amp; tủ lạnh (T04)</span>
                        </span>
                        <strong className="font-mono">5 lỗi (11.4%)</strong>
                      </div>
                      <div className="p-1.5 rounded bg-purple-50/60 border border-purple-100 flex justify-between items-center text-purple-900 font-sans">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <span>4. Lỗi giắc bó dây điện (T09)</span>
                        </span>
                        <strong className="font-mono">4 lỗi (9.1%)</strong>
                      </div>
                      <div className="p-1.5 rounded bg-sky-50/60 border border-sky-100 flex justify-between items-center text-sky-900 font-sans">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                          <span>5. Đốm sáng trần đèn LED (T12)</span>
                        </span>
                        <strong className="font-mono">3 lỗi (6.8%)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rework hours breakdown table (Clickable rows) */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs space-y-2">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Thống Kê Chi Tiết Giờ Sửa Hàng &amp; Hành Động Khắc Phục (CAPA)
                </h3>
                <p className="text-xs text-slate-500">
                  Bấm vào từng tổ để điều chuyển trực tiếp sang lịch làm việc và phân công thợ
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">Click dòng để mở tổ ↗</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Tổ Chuyền</th>
                    <th className="py-2.5 px-3">Cụm Phân Xưởng</th>
                    <th className="py-2.5 px-2 text-center">Số Ca Lỗi</th>
                    <th className="py-2.5 px-3 text-right">Giờ Sửa Hàng</th>
                    <th className="py-2.5 px-3 text-right">Chi Phí (VNĐ)</th>
                    <th className="py-2.5 px-2 text-center">Tỷ Lệ Giờ</th>
                    <th className="py-2.5 px-3 text-center">Tác Vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {REWORK_TEAM_BREAKDOWN.map((t) => (
                    <tr
                      key={t.teamId}
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate({
                            tab: 'scheduling',
                            subView: 'DAILY_DISPATCH',
                            teamId: t.teamId,
                            sourceDesc: `Báo cáo Rework: ${t.teamName}`,
                          });
                        } else {
                          onNavigateTab('scheduling');
                        }
                      }}
                      className="hover:bg-slate-50 cursor-pointer group transition-colors"
                      title={`Bấm để mở lịch sản xuất của ${t.teamName}`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-sans group-hover:text-indigo-700 flex items-center gap-1.5">
                        <span>{t.teamName}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans">{t.clusterName}</td>
                      <td className="py-2.5 px-2 text-center text-rose-600 font-bold">{t.totalDefects}</td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-bold">{t.reworkHours}h</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {t.reworkCostVND.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-2 text-center">{t.reworkRatioPercent}%</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 text-[10px] bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-800 rounded font-semibold transition-colors">
                          Mở Điều Phối ↗
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CRP WORKCENTERS CAPACITY                           */}
      {/* ======================================================== */}
      {activeSection === 'CRP' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Năng Lực Khả Dụng &amp; Tải Trọng 6 Xưởng (CRP Capacity)
              </h3>
              <p className="text-xs text-slate-500">
                Định biên 95 thợ lành nghề phân bổ theo 4 cụm sản xuất DCAR Coachbuilder
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              Tiêu chuẩn ca: 8h/ngày · 6 ngày/tuần
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workcenters.map((wc) => (
              <div
                key={wc.workcenterId}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500">{wc.workcenterId}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      wc.status === 'OVERLOAD'
                        ? 'bg-rose-100 text-rose-800'
                        : wc.status === 'STARVATION'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {wc.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{wc.workcenterName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Định biên: <strong>{wc.headcount} thợ lành nghề</strong>
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Mức độ lấp đầy:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {wc.utilizationRate}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        wc.status === 'OVERLOAD'
                          ? 'bg-rose-500'
                          : wc.status === 'STARVATION'
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
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BÁO CÁO NĂNG SUẤT THEO NGÀY CỦA 17 TỔ SẢN XUẤT    */}
      {/* ======================================================== */}
      {activeSection === 'DAILY_PRODUCTIVITY' && (
        <DailyTeamProductivityReport
          onNavigateTab={onNavigateTab}
          onSelectOrder={onSelectOrder}
          onNavigate={onNavigate}
          orders={orders}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 5: KHO LƯU TRỮ ĐƠN HÀNG ĐÃ HOÀN THÀNH (ARCHIVE)      */}
      {/* ======================================================== */}
      {activeSection === 'COMPLETED_ARCHIVE' && (
        <div className="space-y-6">
          {/* Top KPI Cards for Archive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Tổng Xe Đã Xuất Xưởng</span>
                <Archive className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {completedOrders.length}
                </span>
                <span className="text-xs text-slate-500">xe thương mại</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>Hồ sơ lưu trữ:</span>
                <span className="text-emerald-700 font-bold">100% đầy đủ hồ sơ ISO</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Tỷ Lệ Giao Đúng Hạn (OTD)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
                  96.2%
                </span>
                <span className="text-xs text-slate-500">cam kết giao</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>Mục tiêu BGĐ: 95%</span>
                <span className="text-emerald-700 font-bold">+1.2% vượt chuẩn</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Lead Time Thực Tế Bình Quân</span>
                <Timer className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-700 font-mono tabular-nums">
                  12.9
                </span>
                <span className="text-xs text-slate-500">ngày / xe</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>Chuẩn định mức: 14 ngày</span>
                <span className="text-emerald-700 font-bold">Rút ngắn 1.1 ngày</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Kiểm Định KCS 120 Điểm</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-700 font-mono tabular-nums">
                  100%
                </span>
                <span className="text-xs text-slate-500">đạt chuẩn xuất xưởng</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                <span>Thử mưa 5 bar</span>
                <span className="text-emerald-700 font-bold">100% đạt tem Dcar</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar for Completed Orders */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo Mã LSX, Khách hàng, Số khung (VIN), Hợp đồng..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-sans"
                />
              </div>

              {/* Order Type Filter (G / T / B) */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold text-[11px] mr-1">Loại Đơn:</span>
                <button
                  onClick={() => setArchiveTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    archiveTypeFilter === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({completedOrders.length})
                </button>
                <button
                  onClick={() => setArchiveTypeFilter('G')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    archiveTypeFilter === 'G'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  Đơn Bán (G)
                </button>
                <button
                  onClick={() => setArchiveTypeFilter('T')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    archiveTypeFilter === 'T'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  Trưng Bày (T)
                </button>
                <button
                  onClick={() => setArchiveTypeFilter('B')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    archiveTypeFilter === 'B'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Bảo Hành (B)
                </button>
              </div>
            </div>

            {/* Completed Orders Data Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Mã LSX &amp; Loại</th>
                    <th className="py-2.5 px-3">Khách Hàng &amp; Hợp Đồng</th>
                    <th className="py-2.5 px-3">Dòng Xe &amp; Số Khung (VIN)</th>
                    <th className="py-2.5 px-3">Ngày Tiếp Nhận</th>
                    <th className="py-2.5 px-3">Ngày Xuất Xưởng</th>
                    <th className="py-2.5 px-3 text-center">Lead Time</th>
                    <th className="py-2.5 px-3 text-center">KCS 120 Điểm</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedOrders
                    .filter((ord) => {
                      const matchType = archiveTypeFilter === 'ALL' || ord.orderType === archiveTypeFilter;
                      const q = archiveSearch.toLowerCase();
                      const matchSearch =
                        !q ||
                        ord.id.toLowerCase().includes(q) ||
                        ord.customerName.toLowerCase().includes(q) ||
                        ord.conversionVersion.toLowerCase().includes(q) ||
                        (ord.vinNumber && ord.vinNumber.toLowerCase().includes(q)) ||
                        (ord.contractRef && ord.contractRef.toLowerCase().includes(q));
                      return matchType && matchSearch;
                    })
                    .map((ord) => {
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Mã LSX & Badge Loại */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center shrink-0 ${
                                  ord.orderType === 'G'
                                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                    : ord.orderType === 'T'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {ord.orderType}
                              </span>
                              <span className="font-mono font-bold text-slate-900 block">
                                {ord.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono pl-6.5">
                              {ord.orderType === 'G' ? 'Đơn Bán' : ord.orderType === 'T' ? 'Trưng Bày' : 'Bảo Hành'}
                            </span>
                          </td>

                          {/* Khách hàng & HĐ */}
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block truncate max-w-xs">
                              {ord.customerName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 block">
                              HĐ: {ord.contractRef || 'HĐ-GMG-2026'}
                            </span>
                          </td>

                          {/* Dòng xe & Số khung */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 block">
                              {ord.conversionVersion}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                              <span>VIN: <strong>{ord.vinNumber || '65541'}</strong></span>
                              <span>·</span>
                              <span>Màu: {ord.exteriorColor.split('(')[0]}</span>
                            </div>
                          </td>

                          {/* Ngày nhận */}
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {ord.receivedDate}
                          </td>

                          {/* Ngày xuất xưởng */}
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] block text-center">
                              {ord.completedDate || ord.dueDate}
                            </span>
                          </td>

                          {/* Lead Time */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-bold text-indigo-900 block text-xs">
                              {ord.actualLeadTimeDays || 13} ngày
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              Chuẩn {ord.standardLeadTimeDays || 14}d
                            </span>
                          </td>

                          {/* KCS 120 Điểm */}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>120/120 ĐẠT</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* NÚT IN LỆNH SẢN XUẤT THEO BIỂU MẪU CM-PR01-F01 */}
                              <button
                                onClick={() => handleOpenPrint(ord)}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="In Lệnh Sản Xuất chính thức (Biểu mẫu CM-PR01-F01)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>In Lệnh SX</span>
                              </button>

                              {/* Xem hồ sơ chi tiết */}
                              <button
                                onClick={() => onSelectOrder(ord)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                title="Xem hồ sơ chi tiết đơn hàng"
                              >
                                Chi Tiết
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

      {/* Production Order Print Modal (Biểu mẫu CM-PR01-F01) */}
      <ProductionOrderPrintModal
        order={printOrder}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};

