import React, { useState } from 'react';
import {
  OrderItem,
  ProductionTeam,
  Role,
  BTPWaitingBufferItem,
} from '../types/mes';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  Wrench,
  Camera,
  Check,
  Clock,
  ArrowLeft,
  ArrowRight,
  Boxes,
  ShieldCheck,
  Timer,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface MobileWorkshopViewProps {
  orders: OrderItem[];
  teams: ProductionTeam[];
  currentRole: Role;
  onUpdateOrderProgress: (orderId: string, deltaPercent: number) => void;
  onReportDefect: (orderId: string, teamId: string, issue: string, severity: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onCloseMobileMode: () => void;
  waitingBuffers?: BTPWaitingBufferItem[];
  onAcceptWaitingBTP?: (bufferId: string) => void;
  onCompleteStationStep?: (orderId: string, teamId: string) => void;
}

export const MobileWorkshopView: React.FC<MobileWorkshopViewProps> = ({
  orders,
  teams,
  currentRole,
  onUpdateOrderProgress,
  onReportDefect,
  onCloseMobileMode,
  waitingBuffers = [],
  onAcceptWaitingBTP,
  onCompleteStationStep,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('T07'); // May áo ghế
  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'WAITING_BUFFER' | 'DEFECT_MODAL'>('ACTIONS');

  // Workshop task state per order for this team: NOT_STARTED | IN_PROGRESS | COMPLETED
  const [taskExecutionState, setTaskExecutionState] = useState<Record<string, {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    startTime?: string;
    completedTime?: string;
  }>>({
    'G2610021': { status: 'IN_PROGRESS', startTime: '07:45' },
    'G2610022': { status: 'NOT_STARTED' },
    'G2610023': { status: 'NOT_STARTED' },
    'G2610024': { status: 'IN_PROGRESS', startTime: '08:15' },
    'B2610002': { status: 'NOT_STARTED' },
  });

  // Action toast / feedback message
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'START' | 'COMPLETE' | 'DEFECT';
    message: string;
    subtext: string;
  } | null>(null);

  // Defect report state in mobile
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [defectText, setDefectText] = useState('');
  const [defectType, setDefectType] = useState('Đường chỉ may lệch / nhăn da');
  const [defectSeverity, setDefectSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [photoAttached, setPhotoAttached] = useState(false);

  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED');

  // Trigger Action 1: Bắt đầu sản xuất
  const handleStartProduction = (orderId: string) => {
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setTaskExecutionState((prev) => ({
      ...prev,
      [orderId]: { status: 'IN_PROGRESS', startTime: nowTime },
    }));

    setFeedbackToast({
      type: 'START',
      message: `[BẮT ĐẦU SẢN XUẤT] Lệnh SX ${orderId}`,
      subtext: `Tổ ${currentTeam.name} đã ghi nhận khởi động lúc ${nowTime}. Đồng hồ gia công bắt đầu tính.`,
    });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Trigger Action 2: Hoàn thành (Chuyển BTP sang trạng thái Chờ - Waiting Time)
  const handleCompleteProduction = (orderId: string) => {
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setTaskExecutionState((prev) => ({
      ...prev,
      [orderId]: { status: 'COMPLETED', completedTime: nowTime },
    }));

    if (onCompleteStationStep) {
      onCompleteStationStep(orderId, selectedTeamId);
    } else {
      onUpdateOrderProgress(orderId, 10);
    }

    setFeedbackToast({
      type: 'COMPLETE',
      message: `[HOÀN THÀNH CÔNG ĐOẠN] Lệnh SX ${orderId}`,
      subtext: `BTP đã bàn giao và chuyển sang trạng thái CHỜ (Waiting Time) cho công đoạn tiếp theo.`,
    });
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  // Trigger Action 3: Báo lỗi KCS / Rework
  const handleOpenDefectModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveTab('DEFECT_MODAL');
  };

  const handleSubmitDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    const fullDesc = `[${defectType}] ${defectText.trim() || 'Lỗi phát hiện tại công đoạn'}${
      photoAttached ? ' (Đã đính kèm ảnh kiểm tra KCS)' : ''
    }`;

    onReportDefect(selectedOrderId, selectedTeamId, fullDesc, defectSeverity);

    setFeedbackToast({
      type: 'DEFECT',
      message: `[ĐÃ BÁO LỖI] Lệnh SX ${selectedOrderId}`,
      subtext: `Đã phát cảnh báo REWORK tới KCS và Quản đốc. Hệ thống tạm dừng tính tiến độ chờ xử lý.`,
    });
    setDefectText('');
    setPhotoAttached(false);
    setActiveTab('ACTIONS');
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  // Filter incoming waiting buffer items for this team
  const incomingWaitingItems = waitingBuffers.filter(
    (b) => b.downstreamTeamId === selectedTeamId && b.status === 'WAITING_TRANSFER'
  );

  // Filter outgoing waiting buffer items produced by this team
  const outgoingWaitingItems = waitingBuffers.filter(
    (b) => b.completedByTeamId === selectedTeamId && b.status === 'WAITING_TRANSFER'
  );

  return (
    <div className="max-w-md mx-auto bg-slate-950 min-h-screen text-slate-100 pb-20 font-sans shadow-2xl">
      {/* Mobile Shopfloor Top Bar */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCloseMobileMode}
            className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800/80 cursor-pointer"
            title="Quay lại giao diện Desktop"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
              Giao Diện Tác Nghiệp Quản Đốc / Tổ Trưởng
            </span>
            <h2 className="text-sm font-bold text-white truncate max-w-[200px]">
              {currentTeam.name}
            </h2>
          </div>
        </div>

        <button
          onClick={onCloseMobileMode}
          className="text-xs font-semibold px-2.5 py-1 bg-amber-400 text-slate-950 rounded hover:bg-amber-300 font-mono font-bold cursor-pointer transition-colors"
        >
          Desktop
        </button>
      </div>

      {/* Team Selection Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-mono text-slate-400">
            Tổ Nghiệp Vụ Tại Chuyền:
          </label>
          <span className="text-[10px] font-mono bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold">
            {currentTeam.assignedPosition}
          </span>
        </div>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs py-2 px-3 text-white font-semibold focus:ring-2 focus:ring-amber-500 cursor-pointer"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.headcount} thợ · ĐM: {t.standardCapacityDesc})
            </option>
          ))}
        </select>

        {/* Quick status badge strip */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono pt-1">
          <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Định Biên</span>
            <strong className="text-white text-xs">{currentTeam.headcount} thợ</strong>
          </div>
          <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Định Mức Giờ</span>
            <strong className="text-amber-400 text-xs">{currentTeam.standardHoursPerVehicle}h/xe</strong>
          </div>
          <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block">Chờ Tiếp Nhận</span>
            <strong className="text-emerald-400 text-xs">{incomingWaitingItems.length} BTP</strong>
          </div>
        </div>
      </div>

      {/* 3 Mobile Function Tabs */}
      <div className="p-3 bg-slate-950 sticky top-14 z-30 border-b border-slate-800/80">
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl text-xs font-semibold border border-slate-800">
          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'ACTIONS'
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            3 Chức Năng Chính
          </button>

          <button
            onClick={() => setActiveTab('WAITING_BUFFER')}
            className={`py-2 rounded-lg transition-all text-center relative cursor-pointer ${
              activeTab === 'WAITING_BUFFER'
                ? 'bg-indigo-600 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Hàng Chờ (Waiting)</span>
            {incomingWaitingItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-mono rounded-full flex items-center justify-center font-bold">
                {incomingWaitingItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('DEFECT_MODAL')}
            className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'DEFECT_MODAL'
                ? 'bg-rose-600 text-white font-black shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Báo Lỗi KCS
          </button>
        </div>
      </div>

      {/* Action Toast Banner */}
      {feedbackToast && (
        <div className="mx-3 my-2 p-3 rounded-lg border text-xs shadow-lg animate-fade-in flex items-start gap-2.5 transition-all bg-slate-900 border-amber-400/80 text-white">
          {feedbackToast.type === 'START' && (
            <div className="p-1 rounded bg-blue-500/20 text-blue-400 shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
          )}
          {feedbackToast.type === 'COMPLETE' && (
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {feedbackToast.type === 'DEFECT' && (
            <div className="p-1 rounded bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1">
            <strong className="block text-amber-300 font-bold">{feedbackToast.message}</strong>
            <span className="text-[11px] text-slate-300 leading-tight block mt-0.5">
              {feedbackToast.subtext}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: 3 CHỨC NĂNG TÁC NGHIỆP TRÊN TỪNG ĐƠN HÀNG    */}
      {/* ======================================================== */}
      {activeTab === 'ACTIONS' && (
        <div className="p-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">Xe thi công tại trạm hôm nay:</span>
            <span className="font-mono text-amber-400">{activeOrders.length} xe</span>
          </div>

          {activeOrders.map((ord) => {
            const task = taskExecutionState[ord.id] || { status: 'NOT_STARTED' };
            const isRework = ord.status === 'REWORK_ALERT';
            const isCompleted = task.status === 'COMPLETED';
            const isInProgress = task.status === 'IN_PROGRESS';

            return (
              <div
                key={ord.id}
                className={`border rounded-xl p-3.5 space-y-3 transition-all ${
                  isRework
                    ? 'bg-rose-950/30 border-rose-800'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-800/80'
                    : isInProgress
                    ? 'bg-slate-900 border-amber-500/60 shadow-md'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                {/* Header card */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-black text-white">
                        {ord.id}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {ord.orderType === 'G' ? 'Bán' : ord.orderType === 'T' ? 'Mẫu' : 'Bảo hành'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[210px] mt-0.5">
                      {ord.customerName}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isRework
                        ? 'bg-rose-500 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isInProgress
                        ? 'bg-amber-400 text-slate-950 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isRework
                      ? 'Lỗi Rework'
                      : isCompleted
                      ? '✓ Đã Bàn Giao'
                      : isInProgress
                      ? '▶ Đang Chế Tác'
                      : 'Chờ Bắt Đầu'}
                  </span>
                </div>

                {/* Vehicle details */}
                <div className="text-[11px] text-slate-300 space-y-0.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 font-mono">
                  <p className="truncate text-slate-300 font-sans">
                    <strong className="text-slate-400">Phiên bản:</strong> {ord.conversionVersion}
                  </p>
                  <div className="flex justify-between text-slate-400 pt-0.5">
                    <span>Hẹn giao: <strong className="text-slate-200">{ord.dueDate}</strong></span>
                    <span>Tiến độ: <strong className="text-amber-400">{ord.progress}%</strong></span>
                  </div>
                  {task.startTime && (
                    <p className="text-[10px] text-blue-300 pt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span>Khởi động lúc: <strong>{task.startTime}</strong></span>
                      {task.completedTime && (
                        <span> · Xong lúc: <strong>{task.completedTime}</strong></span>
                      )}
                    </p>
                  )}
                </div>

                {/* Status notice if waiting for downstream */}
                {isCompleted && (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-[11px] text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      <span>BTP đang ở buffer chờ công đoạn sau tiếp nhận</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">0.2h</span>
                  </div>
                )}

                {/* THE 3 CORE MOBILE ACTION FUNCTIONS */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">
                    3 Chức Năng Thao Tác Trạm:
                  </span>

                  <div className="grid grid-cols-3 gap-1.5">
                    {/* CHỨC NĂNG 1: BẮT ĐẦU SẢN XUẤT */}
                    <button
                      onClick={() => handleStartProduction(ord.id)}
                      disabled={isCompleted}
                      className={`py-2 px-1 rounded-lg text-[10px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isInProgress
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                          : isCompleted
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-900/60 hover:bg-blue-800 text-blue-100 border border-blue-700'
                      }`}
                      title="Ghi nhận giờ bắt đầu thi công tại trạm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Bắt Đầu SX</span>
                    </button>

                    {/* CHỨC NĂNG 2: HOÀN THÀNH (BTP CHUYỂN SANG TRẠNG THÁI CHỜ) */}
                    <button
                      onClick={() => handleCompleteProduction(ord.id)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      }`}
                      title="Đánh dấu hoàn thành, chuyển BTP sang trạng thái Chờ (Waiting time)"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Hoàn Thành</span>
                    </button>

                    {/* CHỨC NĂNG 3: BÁO LỖI */}
                    <button
                      onClick={() => handleOpenDefectModal(ord.id)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isRework
                          ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                          : 'bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800'
                      }`}
                      title="Mở form báo cáo sự cố hoặc lỗi KCS"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Báo Lỗi</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: HÀNG CHỜ TIẾP NHẬN (BTP WAITING TIME BUFFER)  */}
      {/* ======================================================== */}
      {activeTab === 'WAITING_BUFFER' && (
        <div className="p-3 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Boxes className="w-4 h-4" />
              <span>Logic Tồn BTP &amp; Thời Gian Chờ (Waiting Time)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Theo quy chuẩn MES, ngay khi tổ trước đánh dấu <strong>Hoàn thành</strong>, chi tiết sẽ tự động chuyển sang trạng thái <strong>Chờ (Waiting Time)</strong>. Tổ trưởng tổ sau vào tiếp nhận và bấm <strong>Bắt đầu sản xuất</strong> để triệt tiêu thời gian lãng phí trung gian.
            </p>
          </div>

          {/* Incoming items waiting for this team */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                BTP Đến Chờ Tổ Tiếp Nhận Vào SX:
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {incomingWaitingItems.length} chi tiết
              </span>
            </div>

            {incomingWaitingItems.length === 0 ? (
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                Hiện không có BTP nào đang nằm chờ tiếp nhận cho {currentTeam.name}.
              </div>
            ) : (
              incomingWaitingItems.map((buf) => {
                const isOverdue = buf.waitingHours > 4.0;
                return (
                  <div
                    key={buf.id}
                    className="bg-slate-900 border border-indigo-900/60 rounded-xl p-3.5 space-y-2.5 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          {buf.orderCode} · {buf.btpCode}
                        </span>
                        <strong className="text-xs text-white block mt-0.5">
                          {buf.btpName}
                        </strong>
                      </div>
                      <div className="text-right font-mono">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isOverdue
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-amber-400 text-slate-950 font-black'
                          }`}
                        >
                          Chờ {buf.waitingHours}h
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Tổ bàn giao trước:</span>
                        <strong className="text-slate-200">{buf.completedByTeamName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Thời điểm bàn giao:</span>
                        <strong className="text-slate-200 font-mono">{buf.completedTimestamp}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Số lượng:</span>
                        <strong className="text-amber-400 font-mono">{buf.quantity} bộ/xe</strong>
                      </div>
                      {buf.notes && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                          {buf.notes}
                        </p>
                      )}
                    </div>

                    {/* Quick 1-tap accept button */}
                    <button
                      onClick={() => {
                        if (onAcceptWaitingBTP) onAcceptWaitingBTP(buf.id);
                        handleStartProduction(buf.orderId);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tiếp Nhận &amp; Bắt Đầu Sản Xuất Ngay</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Outgoing waiting buffer items produced by this team */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                BTP Tổ Đã Hoàn Thành (Chờ Tổ Sau Tiếp Nhận):
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {outgoingWaitingItems.length} chi tiết
              </span>
            </div>

            {outgoingWaitingItems.length === 0 ? (
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                Toàn bộ sản phẩm hoàn thành của tổ đã được công đoạn sau tiếp nhận sạch.
              </div>
            ) : (
              outgoingWaitingItems.map((out) => (
                <div
                  key={out.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-[220px]">
                    <strong className="text-white block font-mono">{out.orderCode}</strong>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {out.btpName} → {out.downstreamTeamName}
                    </span>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded font-bold">
                      Chờ {out.waitingHours}h
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: FORM BÁO LỖI KCS / REWORK TỨC THÌ            */}
      {/* ======================================================== */}
      {activeTab === 'DEFECT_MODAL' && (
        <div className="p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Chức Năng Báo Lỗi Tại Chuyền</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phát cảnh báo Rework ngay lập tức đến Tổ KCS &amp; Quản đốc
                </p>
              </div>
              <button
                onClick={() => setActiveTab('ACTIONS')}
                className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded hover:text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSubmitDefect} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Chọn Lệnh Sản Xuất Bị Lỗi:
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono cursor-pointer"
                >
                  {activeOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.customerName} ({o.conversionVersion})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Phân Loại Lỗi Kỹ Thuật:
                </label>
                <select
                  value={defectType}
                  onChange={(e) => setDefectType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-semibold cursor-pointer"
                >
                  <option value="Đường chỉ may lệch / nhăn da">Đường chỉ may lệch / nhăn da</option>
                  <option value="Mộc gáo ghế lệch cữ dập JIG">Mộc gáo ghế lệch cữ dập JIG</option>
                  <option value="Chập giắc điện / đấu sai giắc CAN">Chập giắc điện / đấu sai giắc CAN</option>
                  <option value="Trầy xước sơn vách composite">Trầy xước sơn vách composite</option>
                  <option value="Mô tơ ngả ghế / massage không phản hồi">Mô tơ ngả ghế / massage không phản hồi</option>
                  <option value="Rò rỉ nước gioăng cửa / kính">Rò rỉ nước gioăng cửa / kính</option>
                  <option value="Thiếu vật tư ráp hoàn thiện">Thiếu vật tư ráp hoàn thiện</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mức Độ Nghiêm Trọng:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setDefectSeverity(sev)}
                      className={`py-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                        defectSeverity === sev
                          ? sev === 'HIGH'
                            ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                            : sev === 'MEDIUM'
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                            : 'bg-blue-600 text-white'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {sev === 'HIGH' ? 'Nghiêm Trọng' : sev === 'MEDIUM' ? 'Vừa Phải' : 'Nhẹ'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mô Tả Hiện Trường &amp; Gợi Ý Sửa Chữa:
                </label>
                <textarea
                  rows={3}
                  value={defectText}
                  onChange={(e) => setDefectText(e.target.value)}
                  placeholder="Mô tả cụ thể vị trí ghế nào, cữ mộc lệch bao nhiêu mm, giắc điện nào bị chạm..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Photo upload toggle button */}
              <button
                type="button"
                onClick={() => setPhotoAttached(!photoAttached)}
                className={`w-full p-2.5 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  photoAttached
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>
                  {photoAttached
                    ? '✓ Đã chụp và đính kèm ảnh hiện trường'
                    : 'Chụp ảnh đính kèm biên bản kiểm định'}
                </span>
              </button>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Xác Nhận &amp; Gửi Báo Lỗi Xuống Xưởng</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
