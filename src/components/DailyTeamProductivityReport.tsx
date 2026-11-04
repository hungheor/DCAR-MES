import React, { useState, useMemo } from 'react';
import {
  TeamDailyProductivity,
  ClusterId,
  NavigationTarget,
  OrderItem,
  VehicleEquivBreakdown,
} from '../types/mes';
import {
  INITIAL_DAILY_TEAM_PRODUCTIVITY,
  INITIAL_TEAMS,
  CLUSTERS,
} from '../data/mockData';
import {
  calculateDailyVehicleConversionSummary,
  VehicleModelDailySummary,
  VEHICLE_MODELS_CONFIG,
} from '../services/mesEngine';
import {
  TrendingUp,
  BarChart3,
  BarChart2,
  PieChart,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Target,
  Timer,
  Award,
  Check,
  X,
  FileText,
  BadgeAlert,
  Car,
  Info,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

interface DailyTeamProductivityReportProps {
  onNavigateTab?: (tab: string) => void;
  onSelectOrder?: (order: OrderItem) => void;
  onNavigate?: (target: NavigationTarget) => void;
  orders?: OrderItem[];
  isReadOnly?: boolean;
}

const AVAILABLE_DAYS = [
  { dateStr: '2026-11-02', label: 'Thứ 2 (02/11/2026)', shortLabel: 'Thứ 2', isToday: true },
  { dateStr: '2026-11-03', label: 'Thứ 3 (03/11/2026)', shortLabel: 'Thứ 3', isToday: false },
  { dateStr: '2026-11-04', label: 'Thứ 4 (04/11/2026)', shortLabel: 'Thứ 4', isToday: false },
  { dateStr: '2026-11-05', label: 'Thứ 5 (05/11/2026)', shortLabel: 'Thứ 5', isToday: false },
  { dateStr: '2026-11-06', label: 'Thứ 6 (06/11/2026)', shortLabel: 'Thứ 6', isToday: false },
  { dateStr: '2026-11-07', label: 'Thứ 7 (07/11/2026)', shortLabel: 'Thứ 7', isToday: false },
];

export const DailyTeamProductivityReport: React.FC<DailyTeamProductivityReportProps> = ({
  onNavigateTab,
  onSelectOrder,
  onNavigate,
  orders = [],
  isReadOnly = false,
}) => {
  // Filters state
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-02'); // Default to Thứ 2
  const [selectedCluster, setSelectedCluster] = useState<ClusterId | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXCEEDED' | 'ACHIEVED' | 'UNDERPERFORMING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMode, setChartMode] = useState<'BAR' | 'LINE' | 'PIE'>('BAR');

  // Mode view: Vehicle Equivalent vs Raw Components vs Model Breakdown
  const [viewMetric, setViewMetric] = useState<'VEHICLE_EQUIV' | 'MODEL_BREAKDOWN' | 'RAW_UNITS'>('VEHICLE_EQUIV');
  const [selectedModelCard, setSelectedModelCard] = useState<string | null>(null);

  // Modals state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<TeamDailyProductivity | null>(null);

  // Generate complete dataset for the selected date
  const dayRecords: TeamDailyProductivity[] = useMemo(() => {
    const directMatches = INITIAL_DAILY_TEAM_PRODUCTIVITY.filter((p) => p.dateStr === selectedDate);
    const matchedTeamIds = new Set(directMatches.map((m) => m.teamId));

    // Baseline fallback for any of the 17 teams not explicitly overridden on this date
    const baselineRecords: TeamDailyProductivity[] = INITIAL_TEAMS.filter(
      (t) => !matchedTeamIds.has(t.id)
    ).map((t) => {
      const dateOffset = (selectedDate.charCodeAt(selectedDate.length - 1) % 5) * 1.5;
      const baseEff = Math.min(115, Math.max(82, 98 + dateOffset - (t.id === 'T04' ? 15 : 0)));
      const actualHours = t.headcount * 8 + (baseEff > 105 ? 2 : 0);
      const targetUnits = t.id === 'T01' ? 30 : t.id.startsWith('T1') ? 2 : 8;
      const actualUnits = Math.round((targetUnits * baseEff) / 100);

      const targetEquiv = t.id === 'T01' ? 2.0 : t.id.startsWith('T1') ? 2.0 : 1.0;
      const actualEquiv = Math.round(targetEquiv * (baseEff / 100) * 100) / 100;

      const fallbackBreakdown: VehicleEquivBreakdown[] = [
        {
          vehicleType: 'Ford Thương Gia 11c (10 ghế VIP)',
          shortName: 'Ford TG 11c',
          componentQty: actualUnits,
          componentUnit: t.btpName || 'chi tiết',
          componentsPerVehicle: Math.max(1, Math.round(actualUnits / (actualEquiv || 1))),
          equivalentVehicles: actualEquiv,
          standardHoursPerVehicle: 112,
          orderCodes: ['G2610021'],
        },
      ];

      return {
        id: `PROD-${selectedDate}-${t.id}`,
        teamId: t.id,
        teamCode: t.code,
        teamName: t.name,
        clusterId: t.clusterId,
        clusterName: t.clusterName,
        assignedPosition: t.assignedPosition,
        dateStr: selectedDate,
        dayOfWeek: AVAILABLE_DAYS.find((d) => d.dateStr === selectedDate)?.shortLabel || 'Thứ 2',
        standardHeadcount: t.headcount,
        actualHeadcount: t.headcount,
        standardHours: t.headcount * 8,
        actualHours,
        overtimeHours: actualHours > t.headcount * 8 ? actualHours - t.headcount * 8 : 0,
        targetOutputUnits: targetUnits,
        actualOutputUnits: actualUnits,
        unitName: t.btpName || 'chi tiết',
        efficiencyRate: Math.round(baseEff * 10) / 10,
        qualityPassRate: Math.round((95 + (baseEff % 5)) * 10) / 10,
        defectCount: baseEff < 90 ? 2 : baseEff > 105 ? 0 : 1,
        status: (baseEff >= 105 ? 'EXCEEDED' : baseEff >= 90 ? 'ACHIEVED' : 'UNDERPERFORMING') as 'EXCEEDED' | 'ACHIEVED' | 'UNDERPERFORMING',
        bottleneckReason: baseEff < 90 ? 'Kẹt cữ dưỡng gá uốn & keo lưu hóa chậm' : undefined,
        supervisorNote: baseEff >= 105 ? 'Vượt định mức ngày, hoàn thành đúng chỉ tiêu giao ban.' : 'Tiến độ gia công tại trạm bám sát định biên.',
        executedOrders: ['G2610021', 'G2610022'],
        targetEquivalentVehicles: targetEquiv,
        actualEquivalentVehicles: actualEquiv,
        vehicleEquivRate: baseEff,
        vehicleBreakdown: fallbackBreakdown,
      };
    });

    return [...directMatches, ...baselineRecords].sort((a, b) => a.teamId.localeCompare(b.teamId));
  }, [selectedDate]);

  // Aggregate Vehicle Conversion Summary across the day
  const vehicleSummary = useMemo(() => {
    return calculateDailyVehicleConversionSummary(dayRecords);
  }, [dayRecords]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return dayRecords.filter((rec) => {
      if (selectedCluster !== 'ALL' && rec.clusterId !== selectedCluster) return false;
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.teamName.toLowerCase().includes(q) ||
          rec.teamCode.toLowerCase().includes(q) ||
          rec.assignedPosition.toLowerCase().includes(q) ||
          rec.executedOrders.some((o) => o.toLowerCase().includes(q)) ||
          rec.vehicleBreakdown.some((b) => b.vehicleType.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dayRecords, selectedCluster, statusFilter, searchQuery]);

  // Summary Metrics calculations
  const totalStandardHours = useMemo(() => dayRecords.reduce((acc, r) => acc + r.standardHours, 0), [dayRecords]);
  const totalActualHours = useMemo(() => dayRecords.reduce((acc, r) => acc + r.actualHours, 0), [dayRecords]);
  const totalOvertimeHours = useMemo(() => dayRecords.reduce((acc, r) => acc + r.overtimeHours, 0), [dayRecords]);
  const totalPlannedUnits = useMemo(() => dayRecords.reduce((acc, r) => acc + r.targetOutputUnits, 0), [dayRecords]);
  const totalActualUnits = useMemo(() => dayRecords.reduce((acc, r) => acc + r.actualOutputUnits, 0), [dayRecords]);

  // Vehicle Equivalency Totals
  const totalTargetVehicles = vehicleSummary.totalTargetEquivalentVehicles;
  const totalActualVehicles = vehicleSummary.totalActualEquivalentVehicles;
  const overallVehicleRate = vehicleSummary.overallVehicleEquivRate;

  const averageEfficiency = useMemo(() => {
    if (dayRecords.length === 0) return 0;
    const sum = dayRecords.reduce((acc, r) => acc + r.efficiencyRate, 0);
    return Math.round((sum / dayRecords.length) * 10) / 10;
  }, [dayRecords]);

  const averageQualityFPY = useMemo(() => {
    if (dayRecords.length === 0) return 0;
    const sum = dayRecords.reduce((acc, r) => acc + r.qualityPassRate, 0);
    return Math.round((sum / dayRecords.length) * 10) / 10;
  }, [dayRecords]);

  const totalDefects = useMemo(() => dayRecords.reduce((acc, r) => acc + r.defectCount, 0), [dayRecords]);
  const totalPresentWorkers = useMemo(() => dayRecords.reduce((acc, r) => acc + r.actualHeadcount, 0), [dayRecords]);
  const totalStandardWorkers = useMemo(() => dayRecords.reduce((acc, r) => acc + r.standardHeadcount, 0), [dayRecords]);

  // Cluster breakdown summary
  const clusterProductivity = useMemo(() => {
    return CLUSTERS.map((cluster) => {
      const clusterTeams = dayRecords.filter((r) => r.clusterId === cluster.id);
      const avgEff = clusterTeams.length
        ? Math.round((clusterTeams.reduce((a, b) => a + b.efficiencyRate, 0) / clusterTeams.length) * 10) / 10
        : 0;
      const totalUnits = clusterTeams.reduce((a, b) => a + b.actualOutputUnits, 0);
      const totalPlan = clusterTeams.reduce((a, b) => a + b.targetOutputUnits, 0);
      const actualVehicles = Math.round(clusterTeams.reduce((a, b) => a + (b.actualEquivalentVehicles || 0), 0) * 10) / 10;
      const targetVehicles = Math.round(clusterTeams.reduce((a, b) => a + (b.targetEquivalentVehicles || 0), 0) * 10) / 10;
      const headcount = clusterTeams.reduce((a, b) => a + b.actualHeadcount, 0);

      return {
        clusterId: cluster.id,
        clusterName: cluster.name,
        teamCount: clusterTeams.length,
        avgEfficiency: avgEff,
        totalUnits,
        totalPlan,
        actualVehicles,
        targetVehicles,
        headcount,
      };
    });
  }, [dayRecords]);

  // Best & Bottleneck teams
  const bestTeam = useMemo(() => {
    return [...dayRecords].sort((a, b) => (b.actualEquivalentVehicles || b.efficiencyRate) - (a.actualEquivalentVehicles || a.efficiencyRate))[0];
  }, [dayRecords]);

  const bottleneckTeam = useMemo(() => {
    return [...dayRecords].sort((a, b) => a.efficiencyRate - b.efficiencyRate)[0];
  }, [dayRecords]);

  // Weekly Trend summary
  const weeklyDayTrends = useMemo(() => {
    return [
      { day: 'Thứ 2 (02/11)', eff: 98.4, fpy: 97.6, units: 108, equivVehicles: 24.8, otHours: 38 },
      { day: 'Thứ 3 (03/11)', eff: 102.5, fpy: 98.2, units: 114, equivVehicles: 25.4, otHours: 26 },
      { day: 'Thứ 4 (04/11)', eff: 101.1, fpy: 98.0, units: 112, equivVehicles: 25.0, otHours: 30 },
      { day: 'Thứ 5 (05/11)', eff: 99.8, fpy: 97.5, units: 110, equivVehicles: 24.6, otHours: 32 },
      { day: 'Thứ 6 (06/11)', eff: 104.2, fpy: 98.8, units: 116, equivVehicles: 26.0, otHours: 42 },
      { day: 'Thứ 7 (07/11)', eff: 97.0, fpy: 99.0, units: 98, equivVehicles: 22.0, otHours: 18 },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTION TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              <Car className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Báo Cáo Năng Suất Theo Ngày Của 17 Tổ Sản Xuất
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                  QUY ĐỔI RA XE (EQUIVALENT VEHICLES)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đo lường sản lượng thực tế, số giờ làm việc, giờ OT, hiệu suất định mức (%) và <strong>quy đổi tương đương ra xe theo từng dòng sản phẩm</strong>
              </p>
            </div>
          </div>

          {/* Action buttons: Print & Export */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="In biên bản giao ban năng suất ngày & bảng quy đổi ra xe"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>In Báo Cáo Giao Ban Ngày</span>
            </button>

            <button
              onClick={() => {
                alert(`Đã xuất báo cáo năng suất & quy đổi xe ngày ${selectedDate} sang file Excel.`);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* DATE & VIEW MODE SELECTOR TOOLBAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Day selection pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Ngày Báo Cáo:
            </span>
            {AVAILABLE_DAYS.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-amber-400 font-bold shadow-2xs'
                      : day.isToday
                      ? 'bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 border border-amber-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {day.label} {day.isToday && '★'}
                </button>
              );
            })}
          </div>

          {/* Metric View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start lg:self-center">
            <button
              onClick={() => setViewMetric('VEHICLE_EQUIV')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMetric === 'VEHICLE_EQUIV'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Quy Đổi Ra Xe (Xe TĐ)</span>
            </button>

            <button
              onClick={() => setViewMetric('MODEL_BREAKDOWN')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMetric === 'MODEL_BREAKDOWN'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chi Tiết Theo Dòng Xe</span>
            </button>

            <button
              onClick={() => setViewMetric('RAW_UNITS')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMetric === 'RAW_UNITS'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Sản Lượng BTP (Units)</span>
            </button>
          </div>
        </div>

        {/* SECONDARY FILTER TOOLBAR: CLUSTERS, STATUS, SEARCH */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Cluster filter */}
          <div className="md:col-span-5 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-slate-500 font-medium shrink-0">Cụm xưởng:</span>
            <button
              onClick={() => setSelectedCluster('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
                selectedCluster === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả (4 Cụm)
            </button>
            {CLUSTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCluster(c.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
                  selectedCluster === c.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cụm {c.id}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="md:col-span-4 flex items-center gap-1.5">
            <span className="text-slate-500 font-medium shrink-0">Hiệu suất:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800 font-medium cursor-pointer"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="EXCEEDED">Vượt định mức (≥ 105%)</option>
              <option value="ACHIEVED">Đạt yêu cầu (90% - 104%)</option>
              <option value="UNDERPERFORMING">Cần cải thiện (&lt; 90%)</option>
            </select>
          </div>

          {/* Search box */}
          <div className="md:col-span-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tổ, mã, dòng xe, LSX..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 2. TOP EXECUTIVE SUMMARY KPI CARDS (HIGHLIGHTING VEHICLE EQUIVALENCY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: QUY ĐỔI RA XE TOÀN NHÀ MÁY (NEW PRIMARY METRIC) */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-300 rounded-xl p-4 shadow-2xs space-y-1 lg:col-span-2">
          <div className="flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
              <Car className="w-4 h-4 text-emerald-700" />
              Tổng Sản Lượng Quy Đổi Ra Xe (Xe TĐ)
            </span>
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
              Đạt {overallVehicleRate}% KH
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-3xl font-black font-mono text-emerald-800">
                {totalActualVehicles}
              </span>
              <span className="text-sm font-bold text-slate-500 font-sans ml-1">
                / {totalTargetVehicles} Xe TĐ
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-emerald-200">
              {totalActualVehicles >= totalTargetVehicles
                ? `+${Math.round((totalActualVehicles - totalTargetVehicles) * 10) / 10} Xe TĐ`
                : `${Math.round((totalActualVehicles - totalTargetVehicles) * 10) / 10} Xe TĐ`}
            </span>
          </div>

          {/* Quick breakdown tags by top vehicle models */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            {vehicleSummary.modelSummaries.slice(0, 4).map((m) => (
              <span
                key={m.vehicleType}
                className="text-[10px] font-mono bg-white/90 text-slate-800 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 shadow-2xs"
              >
                <span className="font-bold text-emerald-700">{m.actualEquivalentVehicles}</span>
                <span className="text-slate-600 truncate max-w-[90px]">{m.shortName}</span>
              </span>
            ))}
          </div>
        </div>

        {/* KPI 2: Hiệu Suất Định Mức Bình Quân */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Hiệu Suất Năng Suất
            </span>
            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
              Chuẩn 100%
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span
              className={`text-2xl font-black font-mono ${
                averageEfficiency >= 100 ? 'text-emerald-700' : averageEfficiency >= 90 ? 'text-amber-600' : 'text-rose-600'
              }`}
            >
              {averageEfficiency}%
            </span>
            <span className="text-xs font-mono text-slate-500">
              {dayRecords.filter((r) => r.status === 'EXCEEDED').length} tổ vượt
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full ${averageEfficiency >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, averageEfficiency)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Giờ Công & Tăng Ca */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              Giờ Công / Tăng Ca
            </span>
            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">
              {totalPresentWorkers} thợ
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {totalActualHours}h
            </span>
            <span className="text-xs font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              +{totalOvertimeHours}h OT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Định mức: {totalStandardHours}h (Định biên: {totalStandardWorkers} thợ)
          </p>
        </div>

        {/* KPI 4: First Pass Yield Chất Lượng FPY */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Chất Lượng FPY
            </span>
            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
              120 Điểm
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-emerald-700">
              {averageQualityFPY}%
            </span>
            <span className="text-xs font-mono text-rose-600 font-bold">
              {totalDefects} lỗi
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {dayRecords.filter((r) => r.defectCount === 0).length} / 17 tổ không phát sinh lỗi
          </p>
        </div>
      </div>

      {/* 3. DEDICATED SECTION: BẢNG PHÂN TÍCH QUY ĐỔI NĂNG SUẤT VỀ XE THEO LOẠI XE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Thông Tin Chi Tiết Quy Về Xe Theo Loại Xe</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  {vehicleSummary.modelSummaries.length} Dòng Sản Phẩm
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tổng hợp khối lượng hoàn thành của 17 tổ tương đương theo từng dòng xe chế tác DCAR Coachbuilder
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-slate-500">
            Hệ số quy đổi: <strong>1.00 - 1.35x</strong> tùy độ phức tạp &amp; cấu hình VIP
          </span>
        </div>

        {/* Model Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicleSummary.modelSummaries.map((m) => {
            const isSelected = selectedModelCard === m.vehicleType;
            const isExceeded = m.actualEquivalentVehicles >= m.targetEquivalentVehicles;

            return (
              <div
                key={m.vehicleType}
                onClick={() => setSelectedModelCard(isSelected ? null : m.vehicleType)}
                className={`border rounded-xl p-4 transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase block tracking-wider">
                      HỆ SỐ CHUẨN: {m.conversionFactor.toFixed(2)}x · {m.standardHours}h/xe
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {m.shortName}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                      {m.vehicleType}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black font-mono text-indigo-700 block">
                      {m.actualEquivalentVehicles} <span className="text-xs font-normal text-slate-500">Xe TĐ</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isExceeded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {m.completionRate}% KH ({m.targetEquivalentVehicles} xe)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, m.completionRate)}%` }}
                  />
                </div>

                {/* Contributing Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-1 border-t border-slate-200/60">
                  <span>{m.teamsContributingCount} tổ đang gia công</span>
                  <div className="flex items-center gap-1">
                    {m.orderCodes.map((c) => (
                      <span key={c} className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800 font-bold text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded Details when Card is clicked */}
                {isSelected && (
                  <div className="pt-2 border-t border-indigo-200 space-y-2 text-xs">
                    <strong className="block text-[11px] text-indigo-900 font-bold uppercase">
                      Chi tiết các tổ hoàn thành linh kiện cho dòng xe này:
                    </strong>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {m.contributingTeams.map((ct) => (
                        <div key={ct.teamId} className="p-2 bg-white rounded border border-indigo-100 text-[11px] flex items-center justify-between">
                          <div>
                            <strong className="text-slate-900 block font-sans">
                              {ct.teamId} · {ct.teamName.split(':')[1]?.trim() || ct.teamName}
                            </strong>
                            <span className="text-slate-500 text-[10px]">
                              {ct.componentQty} {ct.componentUnit}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-emerald-700 block">
                              +{ct.equivalentVehicles} Xe TĐ
                            </span>
                            <span className="text-[9px] text-slate-400">
                              LSX: {ct.orderCodes.join(', ')}
                            </span>
                          </div>
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

      {/* 4. HIGHLIGHT SPOTLIGHT: BEST TEAM VS BOTTLENECK OF THE DAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Team */}
        {bestTeam && (
          <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Tổ Dẫn Đầu Sản Lượng Quy Đổi Trong Ngày
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {bestTeam.teamName}
              </h4>
              <p className="text-xs text-slate-600 leading-snug">
                {bestTeam.supervisorNote}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {bestTeam.vehicleBreakdown.map((b) => (
                  <span key={b.vehicleType} className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-900 font-bold">
                    {b.equivalentVehicles} xe {b.shortName}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black font-mono text-emerald-700 block">
                {bestTeam.actualEquivalentVehicles} <span className="text-xs font-normal text-slate-600">Xe TĐ</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                Hiệu suất: {bestTeam.efficiencyRate}%
              </span>
            </div>
          </div>
        )}

        {/* Bottleneck / Need Attention Team */}
        {bottleneckTeam && (
          <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-300 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-900 font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Trạm Cần Giám Sát Tiến Độ / Nút Thắt
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {bottleneckTeam.teamName}
              </h4>
              <p className="text-xs text-slate-600 leading-snug">
                {bottleneckTeam.bottleneckReason || bottleneckTeam.supervisorNote}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {bottleneckTeam.vehicleBreakdown.map((b) => (
                  <span key={b.vehicleType} className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900 font-bold">
                    {b.equivalentVehicles} xe {b.shortName}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-2xl font-black font-mono block ${
                  bottleneckTeam.efficiencyRate < 90 ? 'text-rose-600' : 'text-amber-700'
                }`}
              >
                {bottleneckTeam.actualEquivalentVehicles} <span className="text-xs font-normal text-slate-600">Xe TĐ</span>
              </span>
              <span className="text-[10px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded font-bold border border-amber-300">
                Định mức: {bottleneckTeam.targetEquivalentVehicles} Xe TĐ
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: TEAM PRODUCTIVITY & VEHICLE EQUIVALENCY CHART (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>
                  {viewMetric === 'VEHICLE_EQUIV'
                    ? 'Biểu Đồ Sản Lượng Quy Đổi Ra Xe (Xe TĐ) Của 17 Tổ'
                    : viewMetric === 'MODEL_BREAKDOWN'
                    ? 'Cơ Cấu Sản Lượng Quy Đổi Theo Dòng Xe'
                    : 'Biểu Đồ So Sánh Sản Lượng Chi Tiết BTP (Units)'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                So sánh Kế hoạch giao (màu nhạt) vs Thực tế hoàn thành quy đổi (màu xanh/cam)
              </p>
            </div>

            {/* Chart mode toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setChartMode('BAR')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  chartMode === 'BAR' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Biểu đồ cột"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartMode('LINE')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  chartMode === 'LINE' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Biểu đồ đường xu hướng"
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartMode('PIE')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  chartMode === 'PIE' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Biểu đồ tròn phân bổ"
              >
                <PieChart className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DYNAMIC CHART RENDERER (BAR, LINE, PIE) */}
          {chartMode === 'BAR' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                {filteredRecords.map((team) => {
                  const targetVehicles = team.targetEquivalentVehicles || 1;
                  const actualVehicles = team.actualEquivalentVehicles || 1;
                  const isExceeded = team.efficiencyRate >= 105;
                  const isAchieved = team.efficiencyRate >= 90 && team.efficiencyRate < 105;

                  return (
                    <div
                      key={team.teamId}
                      onClick={() => setSelectedTeamDetail(team)}
                      className="p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100 hover:border-slate-300 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate max-w-[200px]">
                          <strong className="text-slate-900 block font-mono text-[11px] truncate">
                            {team.teamId} · {team.teamName.split(':')[1]?.trim() || team.teamName}
                          </strong>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {team.clusterName}
                          </span>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <span className="font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 block">
                            {actualVehicles} Xe TĐ
                          </span>
                          <span className="text-[10px] text-slate-400">
                            KH: {targetVehicles} Xe
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar of Vehicle Output vs Target */}
                      <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded ? 'bg-emerald-500' : isAchieved ? 'bg-indigo-500' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (actualVehicles / Math.max(0.1, targetVehicles)) * 80)}%`,
                          }}
                        />
                      </div>

                      {/* Mini Breakdown Tags */}
                      <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono text-slate-500">
                        {team.vehicleBreakdown.map((b) => (
                          <span key={b.vehicleType} className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                            {b.equivalentVehicles} {b.shortName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {chartMode === 'LINE' && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Biểu đồ đường quy đổi sản lượng xe:</span> Đồ thị thể hiện số lượng xe tương đương mà từng tổ từ T01 đến T17 bàn giao trong ca ngày.
              </div>

              {/* Simulated SVG Line Chart */}
              <div className="h-64 w-full relative border-b border-l border-slate-300 pt-4 pb-6 px-4">
                <div className="absolute left-0 right-0 top-[40%] border-t-2 border-dashed border-indigo-400 z-0 flex items-center justify-end pr-2">
                  <span className="text-[10px] font-mono text-indigo-600 font-bold bg-white px-1">
                    Chuẩn 1.5 Xe TĐ/tổ
                  </span>
                </div>

                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={filteredRecords
                      .map((rec, idx) => {
                        const total = Math.max(1, filteredRecords.length - 1);
                        const x = (idx / total) * 100;
                        const v = rec.actualEquivalentVehicles || 1;
                        const y = 90 - (v / 2.5) * 80;
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                  />

                  {filteredRecords.map((rec, idx) => {
                    const total = Math.max(1, filteredRecords.length - 1);
                    const cx = (idx / total) * 100;
                    const v = rec.actualEquivalentVehicles || 1;
                    const cy = 90 - (v / 2.5) * 80;

                    return (
                      <g key={rec.teamId} className="cursor-pointer" onClick={() => setSelectedTeamDetail(rec)}>
                        <circle cx={`${cx}%`} cy={`${cy}%`} r="5" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                      </g>
                    );
                  })}
                </svg>

                <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-2 overflow-x-auto">
                  {filteredRecords.map((r) => (
                    <span key={r.teamId} className="truncate max-w-[36px] text-center">
                      {r.teamId}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chartMode === 'PIE' && (
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Tỷ trọng sản lượng quy đổi theo dòng xe (% trên tổng {totalActualVehicles} Xe TĐ):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vehicleSummary.modelSummaries.map((m) => {
                  const percentOfTotal = totalActualVehicles > 0
                    ? Math.round((m.actualEquivalentVehicles / totalActualVehicles) * 1000) / 10
                    : 0;

                  return (
                    <div key={m.vehicleType} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-slate-800 block truncate">
                        {m.shortName}
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black font-mono text-indigo-700">
                          {m.actualEquivalentVehicles} Xe
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {percentOfTotal}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentOfTotal}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CHART 2: CLUSTER BREAKDOWN & WEEKLY TREND (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cluster Performance Comparison Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                Sản Lượng Quy Đổi 4 Cụm Xưởng
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedDate}
              </span>
            </div>

            <div className="space-y-3.5">
              {clusterProductivity.map((cl) => {
                return (
                  <div key={cl.clusterId} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-800 truncate max-w-[190px]">
                        Cụm {cl.clusterId}: {cl.clusterName.split(':')[1]?.trim() || cl.clusterName}
                      </strong>
                      <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded text-[11px]">
                        {cl.actualVehicles} Xe TĐ
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (cl.actualVehicles / Math.max(1, cl.targetVehicles)) * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>{cl.teamCount} tổ · {cl.headcount} thợ</span>
                      <span>Kế hoạch: {cl.targetVehicles} Xe TĐ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Trend Mini-table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Tiến Độ Xe Quy Đổi Trong Tuần
              </h4>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                Tuần 44
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs font-mono">
              {weeklyDayTrends.map((d) => (
                <div key={d.day} className="py-2 flex items-center justify-between">
                  <span className="text-slate-700 font-sans text-[11px]">{d.day}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-indigo-700">{d.equivVehicles} Xe TĐ</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        d.eff >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {d.eff}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. DETAILED PRODUCTIVITY TABLE OF 17 TEAMS (WITH EQUIVALENT VEHICLES COLUMN) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Bảng Chi Tiết Năng Suất &amp; Quy Đổi Ra Xe Của 17 Tổ Ngày {selectedDate}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Bấm vào từng dòng để xem công thức và bảng quy đổi chi tiết theo từng dòng xe
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
              Tổng toàn xưởng: {totalActualVehicles} Xe TĐ
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-mono">
                <th className="py-3 px-3">Mã &amp; Tên Tổ</th>
                <th className="py-3 px-3">Cụm &amp; Phụ Trách</th>
                <th className="py-3 px-2 text-center">Thợ (CT/ĐB)</th>
                <th className="py-3 px-2 text-center">Giờ Làm / OT</th>
                {/* NEW PRIMARY COLUMN: QUY ĐỔI RA XE */}
                <th className="py-3 px-3 text-center bg-emerald-50/60 text-emerald-950 font-bold border-x border-emerald-100">
                  Quy Đổi Ra Xe (Xe TĐ)
                </th>
                <th className="py-3 px-2 text-center">Sản Lượng BTP</th>
                <th className="py-3 px-3 text-center">Hiệu Suất (%)</th>
                <th className="py-3 px-2 text-center">FPY (%)</th>
                <th className="py-3 px-3">Ghi Chú Tiến Độ / Dòng Xe</th>
                <th className="py-3 px-2 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Không tìm thấy tổ sản xuất nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((team) => {
                  const isExceeded = team.status === 'EXCEEDED';
                  const isUnder = team.status === 'UNDERPERFORMING';
                  const targetVehicles = team.targetEquivalentVehicles || 1;
                  const actualVehicles = team.actualEquivalentVehicles || 1;
                  const deltaVehicles = Math.round((actualVehicles - targetVehicles) * 100) / 100;

                  return (
                    <tr
                      key={team.teamId}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedTeamDetail(team)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {team.teamId}
                          </span>
                          <strong className="text-slate-900 text-xs block font-sans">
                            {team.teamName.split(':')[1]?.trim() || team.teamName}
                          </strong>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {team.teamCode}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-800 font-medium block text-[11px]">
                          {team.clusterName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[150px]">
                          {team.assignedPosition}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center font-mono">
                        <span
                          className={`font-bold ${
                            team.actualHeadcount < team.standardHeadcount ? 'text-amber-600' : 'text-slate-800'
                          }`}
                        >
                          {team.actualHeadcount}
                        </span>
                        <span className="text-slate-400">/{team.standardHeadcount}</span>
                      </td>

                      <td className="py-3 px-2 text-center font-mono">
                        <span className="text-slate-900 font-bold">{team.actualHours}h</span>
                        {team.overtimeHours > 0 ? (
                          <span className="text-[10px] text-amber-700 block font-bold">
                            (+{team.overtimeHours}h OT)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">
                            (0h OT)
                          </span>
                        )}
                      </td>

                      {/* NEW COLUMN: QUY ĐỔI RA XE */}
                      <td className="py-3 px-3 bg-emerald-50/40 border-x border-emerald-100 text-center font-mono">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-black text-sm text-emerald-800">
                              {actualVehicles}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              /{targetVehicles} Xe TĐ
                            </span>
                          </div>

                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                deltaVehicles >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {deltaVehicles >= 0 ? `+${deltaVehicles}` : deltaVehicles} Xe
                            </span>
                          </div>

                          {/* Mini breakdown of models */}
                          <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
                            {team.vehicleBreakdown.map((b) => (
                              <span
                                key={b.vehicleType}
                                className="text-[9px] bg-white px-1.5 py-0.2 rounded border border-emerald-200 text-slate-700 font-sans"
                                title={`${b.equivalentVehicles} xe ${b.vehicleType}`}
                              >
                                {b.equivalentVehicles} {b.shortName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center font-mono">
                        <span className="font-bold text-slate-900">{team.actualOutputUnits}</span>
                        <span className="text-slate-400 text-[10px]">/{team.targetOutputUnits}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[110px]">
                          {team.unitName}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono font-black text-xs ${
                              isExceeded
                                ? 'bg-emerald-100 text-emerald-800'
                                : isUnder
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {team.efficiencyRate}%
                          </span>
                          <div className="w-16 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isExceeded ? 'bg-emerald-500' : isUnder ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, team.efficiencyRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center font-mono">
                        <span
                          className={`font-bold ${
                            team.qualityPassRate >= 98
                              ? 'text-emerald-700'
                              : team.qualityPassRate >= 95
                              ? 'text-slate-800'
                              : 'text-rose-600'
                          }`}
                        >
                          {team.qualityPassRate}%
                        </span>
                        {team.defectCount > 0 && (
                          <span className="text-[10px] text-rose-600 block">
                            ({team.defectCount} lỗi)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs">
                        {team.bottleneckReason ? (
                          <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-rose-800 space-y-0.5">
                            <strong className="block text-[10px] font-bold text-rose-900">
                              ⚠️ Nút thắt:
                            </strong>
                            <span className="leading-tight block">{team.bottleneckReason}</span>
                          </div>
                        ) : (
                          <span className="line-clamp-2 leading-relaxed">{team.supervisorNote}</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTeamDetail(team)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer flex items-center gap-1 mx-auto"
                          title="Xem công thức và bảng quy đổi chi tiết theo từng dòng xe"
                        >
                          <Info className="w-3 h-3 text-indigo-600" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL: CHI TIẾT CÔNG THỨC & BẢNG QUY ĐỔI RA XE CỦA TỔ */}
      {selectedTeamDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedTeamDetail.teamId}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedTeamDetail.teamName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedTeamDetail.clusterName} · {selectedTeamDetail.assignedPosition}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeamDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Sản Lượng Quy Đổi:</span>
                <strong className="text-emerald-700 text-sm">
                  {selectedTeamDetail.actualEquivalentVehicles} / {selectedTeamDetail.targetEquivalentVehicles} Xe TĐ
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Hiệu Suất Định Mức:</span>
                <strong className="text-slate-900 text-sm">{selectedTeamDetail.efficiencyRate}%</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Giờ Thực Tế / OT:</span>
                <strong className="text-slate-900">{selectedTeamDetail.actualHours}h (+{selectedTeamDetail.overtimeHours}h OT)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Chất Lượng FPY:</span>
                <strong className="text-slate-900">{selectedTeamDetail.qualityPassRate}% ({selectedTeamDetail.defectCount} lỗi)</strong>
              </div>
            </div>

            {/* EQUIVALENCY BREAKDOWN TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Bảng Chi Tiết Quy Về Xe Theo Loại Xe Của Tổ
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  Công thức: <em>Số lượng BTP / Định mức 1 xe = Xe Quy Đổi</em>
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-mono font-semibold">
                    <tr>
                      <th className="p-2.5">Dòng Xe Chế Tác</th>
                      <th className="p-2.5">Chi Tiết / Nghiệp Vụ</th>
                      <th className="p-2.5 text-center">Định Mức 1 Xe</th>
                      <th className="p-2.5 text-center">SL Thực Hiện</th>
                      <th className="p-2.5 text-center bg-emerald-50 text-emerald-900 font-bold">
                        Quy Đổi (Xe TĐ)
                      </th>
                      <th className="p-2.5 text-center">Giờ Chuẩn/Xe</th>
                      <th className="p-2.5 text-center">Lệnh SX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTeamDetail.vehicleBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <strong className="text-slate-900 block font-sans">{item.shortName}</strong>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px] block">
                            {item.vehicleType}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700 font-sans">
                          {item.componentUnit}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">
                          {item.componentsPerVehicle} / xe
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                          {item.componentQty}
                        </td>
                        <td className="p-2.5 text-center font-mono font-black text-sm text-emerald-700 bg-emerald-50/50">
                          {item.equivalentVehicles} Xe TĐ
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">
                          {item.standardHoursPerVehicle}h
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {item.orderCodes.map((code) => (
                              <span key={code} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px]">
                                {code}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note & Bottleneck Box */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <strong className="text-slate-700 block font-bold">Ghi chú &amp; Đánh giá từ giám sát:</strong>
              <p className="text-slate-600 leading-relaxed">
                {selectedTeamDetail.bottleneckReason
                  ? `[Nút thắt]: ${selectedTeamDetail.bottleneckReason}. ${selectedTeamDetail.supervisorNote}`
                  : selectedTeamDetail.supervisorNote}
              </p>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTeamDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: IN PHIẾU BÁO CÁO GIAO BAN NĂNG SUẤT & QUY ĐỔI RA XE (PRINT-READY) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:max-w-none print:w-full print:p-0">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 print:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-base print:border print:border-slate-800">
                  DC
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    BIÊN BẢN GIAO BAN NĂNG SUẤT &amp; QUY ĐỔI RA XE · 17 TỔ SẢN XUẤT
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    DCAR COACHBUILDER VIETNAM · PHÒNG KẾ HOẠCH &amp; BAN ĐIỀU HÀNH SẢN XUẤT
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Meta info box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg text-xs font-mono border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Ngày làm việc:</span>
                <strong className="text-slate-900 text-sm">{selectedDate}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tổng quy đổi ra xe:</span>
                <strong className="text-emerald-700 text-sm">{totalActualVehicles} / {totalTargetVehicles} Xe TĐ ({overallVehicleRate}%)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tổng giờ thực tế / OT:</span>
                <strong className="text-slate-900">{totalActualHours}h (+{totalOvertimeHours}h OT)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tỷ lệ KCS lần đầu (FPY):</span>
                <strong className="text-slate-900">{averageQualityFPY}% ({totalDefects} lỗi)</strong>
              </div>
            </div>

            {/* SUB-TABLE: TỔNG HỢP QUY ĐỔI THEO DÒNG XE */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. BẢNG TỔNG HỢP KHỐI LƯỢNG QUY ĐỔI TƯƠNG ĐƯƠNG XE THEO LOẠI XE:
              </h4>

              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-mono font-semibold">
                  <tr>
                    <th className="border border-slate-300 p-2">Dòng Xe Chế Tác</th>
                    <th className="border border-slate-300 p-2 text-center">Hệ Số Quy Đổi</th>
                    <th className="border border-slate-300 p-2 text-center">Giờ Chuẩn / Xe</th>
                    <th className="border border-slate-300 p-2 text-center font-bold">Số Xe Quy Đổi (Xe TĐ)</th>
                    <th className="border border-slate-300 p-2 text-center">Kế Hoạch</th>
                    <th className="border border-slate-300 p-2 text-center">% Hoàn Thành</th>
                    <th className="border border-slate-300 p-2">Lệnh Sản Xuất Áp Dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {vehicleSummary.modelSummaries.map((m) => (
                    <tr key={m.vehicleType}>
                      <td className="border border-slate-300 p-2 font-bold font-sans">
                        {m.shortName} <span className="text-[10px] text-slate-500 font-normal">({m.vehicleType})</span>
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {m.conversionFactor.toFixed(2)}x
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {m.standardHours}h
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-black text-emerald-800 bg-emerald-50/50">
                        {m.actualEquivalentVehicles} Xe TĐ
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-600">
                        {m.targetEquivalentVehicles} Xe
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {m.completionRate}%
                      </td>
                      <td className="border border-slate-300 p-2">
                        {m.orderCodes.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Print Table 17 TEAMS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. CHI TIẾT NĂNG SUẤT 17 TỔ SẢN XUẤT TRONG NGÀY:
              </h4>

              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-mono font-semibold">
                  <tr>
                    <th className="border border-slate-300 p-2">Tổ Sản Xuất</th>
                    <th className="border border-slate-300 p-2 text-center">Thợ (CT/ĐB)</th>
                    <th className="border border-slate-300 p-2 text-center">Giờ Làm</th>
                    <th className="border border-slate-300 p-2 text-center">OT</th>
                    <th className="border border-slate-300 p-2 text-center font-bold bg-emerald-50">Quy Đổi Xe (TĐ)</th>
                    <th className="border border-slate-300 p-2 text-center">Sản Lượng BTP</th>
                    <th className="border border-slate-300 p-2 text-center">Hiệu Suất</th>
                    <th className="border border-slate-300 p-2 text-center">FPY (%)</th>
                    <th className="border border-slate-300 p-2">Đánh Giá &amp; Nút Thắt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {dayRecords.map((r) => (
                    <tr key={r.teamId}>
                      <td className="border border-slate-300 p-2 font-bold font-sans">
                        {r.teamName}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {r.actualHeadcount}/{r.standardHeadcount}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {r.actualHours}h
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {r.overtimeHours > 0 ? `+${r.overtimeHours}h` : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-black text-emerald-800 bg-emerald-50/50">
                        {r.actualEquivalentVehicles} Xe TĐ
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {r.actualOutputUnits}/{r.targetOutputUnits} {r.unitName}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {r.efficiencyRate}%
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {r.qualityPassRate}%
                      </td>
                      <td className="border border-slate-300 p-2 font-sans text-[10px]">
                        {r.bottleneckReason || r.supervisorNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature blocks (Roles, without hardcoded personal names) */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs font-mono">
              <div>
                <span className="block text-slate-700 text-xs uppercase font-bold">Kế Hoạch Sản Xuất</span>
                <span className="block text-slate-400 italic text-[10px] mt-0.5">(Ký &amp; Ghi rõ vị trí phân quyền)</span>
                <div className="h-14" />
                <span className="text-slate-500 font-sans block text-[11px] border-t border-dashed border-slate-300 pt-1">
                  Xác nhận kế hoạch &amp; định mức xe quy đổi
                </span>
              </div>

              <div>
                <span className="block text-slate-700 text-xs uppercase font-bold">Quản Lý Sản Xuất Cụm</span>
                <span className="block text-slate-400 italic text-[10px] mt-0.5">(Ký &amp; Ghi rõ vị trí phân quyền)</span>
                <div className="h-14" />
                <span className="text-slate-500 font-sans block text-[11px] border-t border-dashed border-slate-300 pt-1">
                  Kiểm soát tiến độ công đoạn &amp; giờ OT
                </span>
              </div>

              <div>
                <span className="block text-slate-700 text-xs uppercase font-bold">Trưởng Phòng Sản Xuất</span>
                <span className="block text-slate-400 italic text-[10px] mt-0.5">(Ký &amp; Đóng dấu phê duyệt)</span>
                <div className="h-14" />
                <span className="text-slate-500 font-sans block text-[11px] border-t border-dashed border-slate-300 pt-1">
                  Phê duyệt biên bản giao ban nhà máy
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
