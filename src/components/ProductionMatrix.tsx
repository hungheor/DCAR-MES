import React, { useState } from 'react';
import {
  OrderItem,
  ProductionTeam,
  StepRouting,
  Role,
} from '../types/mes';
import {
  CLUSTERS,
  STEP_ROUTINGS,
} from '../data/mockData';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Layers,
  Sparkles,
  User,
  Wrench,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface ProductionMatrixProps {
  orders: OrderItem[];
  teams: ProductionTeam[];
  currentRole: Role;
  onUpdateOrder: (order: OrderItem) => void;
  onTriggerDynamicReschedule: (orderId: string, delayDays: number, reason: string) => void;
  onReportDefect: (orderId: string, teamId: string, issue: string, severity: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  isReadOnly?: boolean;
}

export const ProductionMatrix: React.FC<ProductionMatrixProps> = ({
  orders,
  teams,
  currentRole,
  onUpdateOrder,
  onTriggerDynamicReschedule,
  onReportDefect,
  isReadOnly = false,
}) => {
  // Select active order to view matrix
  const inProdOrders = orders.filter((o) => o.status !== 'COMPLETED');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    inProdOrders[0]?.id || 'G2610021'
  );

  // Defect Modal State
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [defectTeamId, setDefectTeamId] = useState('T16');
  const [defectIssue, setDefectIssue] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');

  // Dynamic Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [delayDays, setDelayDays] = useState(2);
  const [rescheduleReason, setRescheduleReason] = useState(
    'Lỗi KCS vi mạch massage ghế VIP và trễ giao linh kiện Tivi Sony 43"'
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleUpdateStepProgress = (newProgress: number, newDay: number) => {
    if (!selectedOrder) return;
    let cluster: 1 | 2 | 3 | 4 = 1;
    if (newDay >= 9) cluster = 4;
    else if (newDay >= 5) cluster = 3;
    else if (newDay >= 3) cluster = 2;

    const updated: OrderItem = {
      ...selectedOrder,
      progress: newProgress,
      currentDay: newDay,
      currentCluster: cluster,
      status: newProgress >= 100 ? 'COMPLETED' : 'IN_PRODUCTION',
    };
    onUpdateOrder(updated);
  };

  const handleConfirmDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectIssue.trim() || !selectedOrder) return;

    onReportDefect(selectedOrder.id, defectTeamId, defectIssue.trim(), defectSeverity);
    setShowDefectModal(false);
    setDefectIssue('');
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    onTriggerDynamicReschedule(selectedOrder.id, delayDays, rescheduleReason);
    setShowRescheduleModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tiến Độ 17 Tổ Nghiệp Vụ & Dòng Chảy Tuyến Tính 14 Ngày
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi 4 Cụm sản xuất: Gia công linh kiện · May & bọc nệm · Điện & đèn · Lắp ráp tổng thể & KCS
          </p>
        </div>

        {/* Action Buttons for Rescheduling and Defects */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDefectModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Báo Lỗi KCS / Yêu Cầu Rework</span>
          </button>

          <button
            onClick={() => setShowRescheduleModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Chạy Tái Lập Lịch Động (Reschedule)</span>
          </button>
        </div>
      </div>

      {/* Active Order Selector Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 pl-1">
            Chọn Lệnh SX:
          </span>
          {inProdOrders.map((ord) => {
            const isSelected = ord.id === selectedOrderId;
            const isRework = ord.status === 'REWORK_ALERT';

            return (
              <button
                key={ord.id}
                onClick={() => setSelectedOrderId(ord.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="font-mono font-bold">{ord.id}</span>
                <span className="text-[11px] opacity-80 truncate max-w-[140px]">
                  {ord.customerName.split(' ')[0]}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    isRework
                      ? 'bg-rose-500 text-white'
                      : isSelected
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {isRework ? 'Rework' : `N${ord.currentDay}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Order Current Status Card */}
      {selectedOrder && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {selectedOrder.id}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-sm font-bold text-slate-800">
                  {selectedOrder.customerName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedOrder.conversionVersion} · Hạn giao: <strong>{selectedOrder.dueDate}</strong>
              </p>
            </div>

            {/* Overall Progress and Stepper Controller */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Đang Ở Ngày</span>
                <span className="font-mono text-base font-extrabold text-amber-600">
                  Ngày {selectedOrder.currentDay} / 14
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={selectedOrder.currentDay <= 1}
                  onClick={() =>
                    handleUpdateStepProgress(
                      Math.max(5, selectedOrder.progress - 7),
                      selectedOrder.currentDay - 1
                    )
                  }
                  className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40"
                  title="Lùi 1 ngày tiến độ"
                >
                  -1N
                </button>
                <button
                  disabled={selectedOrder.currentDay >= 14}
                  onClick={() =>
                    handleUpdateStepProgress(
                      Math.min(100, selectedOrder.progress + 7),
                      selectedOrder.currentDay + 1
                    )
                  }
                  className="px-2 py-1 text-xs bg-slate-900 text-white rounded hover:bg-slate-800 font-semibold"
                  title="Tăng 1 ngày tiến độ"
                >
                  +1N
                </button>
              </div>
            </div>
          </div>

          {/* 14-Day Timeline Stepper Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Bắt Đầu: {selectedOrder.scheduledStartDate || selectedOrder.receivedDate}</span>
              <span className="font-bold text-slate-800">
                Tiến Độ Dòng Chảy: {selectedOrder.progress}%
              </span>
              <span>KCS Hoàn Tất: {selectedOrder.scheduledEndDate || selectedOrder.dueDate}</span>
            </div>

            <div className="grid grid-cols-14 gap-1 h-3 bg-slate-100 p-0.5 rounded">
              {Array.from({ length: 14 }).map((_, i) => {
                const dayNum = i + 1;
                const isPassed = dayNum < selectedOrder.currentDay;
                const isCurrent = dayNum === selectedOrder.currentDay;
                const isRework = selectedOrder.status === 'REWORK_ALERT' && isCurrent;

                return (
                  <div
                    key={dayNum}
                    className={`h-full rounded-xs transition-colors ${
                      isRework
                        ? 'bg-rose-500'
                        : isCurrent
                        ? 'bg-amber-500 animate-pulse'
                        : isPassed
                        ? 'bg-slate-900'
                        : 'bg-slate-200'
                    }`}
                    title={`Ngày ${dayNum}/14`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>N01 (Cắt/Phôi)</span>
              <span>N04 (Mộc/Hàn)</span>
              <span>N07 (May/Dây Điện)</span>
              <span>N11 (Lắp Ghế Điện)</span>
              <span>N14 (KCS Giao Xe)</span>
            </div>
          </div>

          {/* Defect Alert Notice if present */}
          {selectedOrder.defectLog && !selectedOrder.defectLog.resolved && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-start gap-2.5 text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">
                  Cảnh Báo Lỗi Rework tại {selectedOrder.defectLog.teamName} ({selectedOrder.defectLog.timestamp})
                </span>
                <p className="mt-0.5 text-rose-800">{selectedOrder.defectLog.issueDescription}</p>
              </div>
              <button
                onClick={() => {
                  const updated: OrderItem = {
                    ...selectedOrder,
                    status: 'IN_PRODUCTION',
                    defectLog: {
                      ...selectedOrder.defectLog!,
                      resolved: true,
                    },
                  };
                  onUpdateOrder(updated);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded whitespace-nowrap"
              >
                Xác Nhận Đã Sửa Xong
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 PRODUCTION CLUSTERS WITH 17 TEAMS */}
      <div className="space-y-6">
        {CLUSTERS.map((cluster) => {
          const clusterTeams = teams.filter((t) => t.clusterId === cluster.id);
          const clusterRoutings = STEP_ROUTINGS.filter((r) => r.clusterId === cluster.id);

          const isCurrentActiveCluster = selectedOrder?.currentCluster === cluster.id;

          return (
            <div
              key={cluster.id}
              className={`bg-white border rounded-lg overflow-hidden shadow-sm transition-all ${
                isCurrentActiveCluster
                  ? 'border-amber-400 ring-1 ring-amber-400/30'
                  : 'border-slate-200'
              }`}
            >
              {/* Cluster Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                    {cluster.id}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {cluster.name}
                    </h3>
                    <p className="text-xs text-slate-500">{cluster.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold">
                    {cluster.targetDays}
                  </span>
                  <span className="text-slate-500">
                    Lead time: {cluster.leadTimeDays} ngày
                  </span>
                </div>
              </div>

              {/* Teams & Step Routing Table */}
              <div className="p-5 divide-y divide-slate-100">
                {clusterRoutings.map((routing) => {
                  const team = teams.find((t) => t.id === routing.teamId);
                  const isWorkingNow =
                    selectedOrder &&
                    selectedOrder.currentDay >= routing.dayStart &&
                    selectedOrder.currentDay <= routing.dayEnd;
                  const isCompleted =
                    selectedOrder && selectedOrder.currentDay > routing.dayEnd;

                  return (
                    <div
                      key={routing.stepId}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Step Details */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            [{routing.stepId}]
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {team?.name || routing.teamName}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {team?.assignedPosition || 'Vị trí: Quản đốc phụ trách'} ({team?.headcount} thợ · Phân quyền: <span className="font-mono text-amber-600 font-bold">{team?.assignedUserCode}</span>)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 pl-8">
                          {routing.stepName}
                        </p>
                      </div>

                      {/* Timeline Day & Status Badge */}
                      <div className="flex items-center gap-4 pl-8 md:pl-0 shrink-0">
                        <div className="text-right text-xs font-mono">
                          <span className="text-slate-400 block text-[10px]">
                            Lịch Chuẩn
                          </span>
                          <span className="font-semibold text-slate-700">
                            Ngày {routing.dayStart} — {routing.dayEnd}
                          </span>
                        </div>

                        {/* Status chip */}
                        <div className="w-28 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3" />
                              <span>Hoàn tất</span>
                            </span>
                          ) : isWorkingNow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              <Play className="w-3 h-3 fill-amber-800" />
                              <span>Đang chạy</span>
                            </span>
                          ) : (
                            <span className="inline-block text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Chờ chuyển
                            </span>
                          )}
                        </div>

                        {/* Quick action button for Foreman */}
                        <button
                          onClick={() => {
                            if (!selectedOrder) return;
                            handleUpdateStepProgress(
                              Math.min(100, Math.round((routing.dayEnd / 14) * 100)),
                              routing.dayEnd
                            );
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded whitespace-nowrap"
                        >
                          Chốt bước
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: REPORT QUALITY DEFECT / REWORK */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Báo Cáo Lỗi KCS & Yêu Cầu Rework</span>
              </h3>
              <button
                onClick={() => setShowDefectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDefect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đơn Hàng Ghi Nhận Lỗi
                </label>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-900">
                  {selectedOrder.id} - {selectedOrder.customerName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tổ Nghiệp Vụ Phát Sinh Lỗi KCS
                </label>
                <select
                  value={defectTeamId}
                  onChange={(e) => setDefectTeamId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.assignedPosition} · {t.assignedUserCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức Độ Nghiêm Trọng
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value="LOW"
                      checked={defectSeverity === 'LOW'}
                      onChange={() => setDefectSeverity('LOW')}
                    />
                    <span>Thấp (Sửa tại chỗ ≤ 1h)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value="HIGH"
                      checked={defectSeverity === 'HIGH'}
                      onChange={() => setDefectSeverity('HIGH')}
                    />
                    <span className="font-bold text-rose-600">
                      Nghiêm trọng (Rework toàn phần)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả Chi Tiết Lỗi KCS & Biện Pháp Khắc Phục *
                </label>
                <textarea
                  required
                  rows={3}
                  value={defectIssue}
                  onChange={(e) => setDefectIssue(e.target.value)}
                  placeholder="VD: Rách da ghế chủ tịch do vướng cữ hàn; chập vi mạch CAN-bus massage; mộc taplo cong vênh..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDefectModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-sm"
                >
                  Gửi Cảnh Báo Rework Xuống Xưởng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DYNAMIC RESCHEDULING CRITICAL PATH */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Cơ Chế Tái Lập Lịch Động (Dynamic Rescheduling)</span>
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Khi có sự cố (lỗi KCS phải Rework, thiếu hụt vật tư đột xuất, hoặc biến động nhân sự/máy móc làm giảm năng suất),
                hệ thống tự động <strong>tính toán lại đường găng (Critical Path)</strong> và dịch chuyển lịch các công đoạn phía sau.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đơn Hàng Điều Chỉnh
                </label>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-900">
                  {selectedOrder.id} - Hạn giao hiện tại: {selectedOrder.dueDate}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Ngày Cần Dịch Chuyển Đường Găng (+Ngày)
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={delayDays}
                  onChange={(e) => setDelayDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nguyên Nhân Điều Chỉnh Đường Găng
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm"
                >
                  Chạy Tái Lập Lịch Động (+{delayDays} Ngày)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
