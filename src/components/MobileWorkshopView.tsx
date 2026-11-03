import React, { useState } from 'react';
import {
  OrderItem,
  ProductionTeam,
  Role,
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
} from 'lucide-react';

interface MobileWorkshopViewProps {
  orders: OrderItem[];
  teams: ProductionTeam[];
  currentRole: Role;
  onUpdateOrderProgress: (orderId: string, deltaPercent: number) => void;
  onReportDefect: (orderId: string, teamId: string, issue: string, severity: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onCloseMobileMode: () => void;
}

export const MobileWorkshopView: React.FC<MobileWorkshopViewProps> = ({
  orders,
  teams,
  currentRole,
  onUpdateOrderProgress,
  onReportDefect,
  onCloseMobileMode,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('T07'); // May áo ghế
  const [activeQuickTab, setActiveQuickTab] = useState<'QUEUE' | 'REPORT_DEFECT' | 'BTP'>('QUEUE');

  // Defect report state in mobile
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [defectText, setDefectText] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED');

  const handleQuickComplete = (orderId: string) => {
    onUpdateOrderProgress(orderId, 10);
  };

  const handleSubmitDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectText.trim() || !selectedOrderId) return;

    onReportDefect(selectedOrderId, selectedTeamId, defectText.trim(), 'HIGH');
    setSubmittedMessage(true);
    setDefectText('');
    setTimeout(() => {
      setSubmittedMessage(false);
      setActiveQuickTab('QUEUE');
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 min-h-screen text-slate-100 pb-16 font-sans">
      {/* Mobile Shopfloor Top Bar */}
      <div className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCloseMobileMode}
            className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800"
            title="Quay lại giao diện Desktop"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
              Giao Diện Quản Đốc Tại Xưởng
            </span>
            <h2 className="text-sm font-bold text-white">
              {currentTeam.name}
            </h2>
          </div>
        </div>

        <button
          onClick={onCloseMobileMode}
          className="text-xs font-semibold px-2.5 py-1 bg-amber-500 text-slate-950 rounded hover:bg-amber-400 font-mono"
        >
          Desktop
        </button>
      </div>

      {/* Team Selection Carousel */}
      <div className="p-3 bg-slate-900 border-b border-slate-800">
        <label className="block text-[11px] font-mono text-slate-400 mb-1">
          Chọn Tổ Nghiệp Vụ Tại Chuyền:
        </label>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-2 px-3 text-white font-semibold focus:ring-2 focus:ring-amber-500"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.assignedPosition} · {t.headcount} thợ)
            </option>
          ))}
        </select>

        {/* Quick status badge strip */}
        <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-slate-800/80 text-slate-400">
          <span>Định biên: <strong className="text-white">{currentTeam.headcount} thợ</strong></span>
          <span>ĐM: <strong className="text-amber-400">{currentTeam.standardCapacityDesc}</strong></span>
          <span>BTP tồn: <strong className="text-white">{currentTeam.btpStockUnits} đơn vị</strong></span>
        </div>
      </div>

      {/* Segmented controls for mobile navigation */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveQuickTab('QUEUE')}
            className={`py-1.5 rounded transition-colors ${
              activeQuickTab === 'QUEUE'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Hàng Chờ (WIP)
          </button>
          <button
            onClick={() => setActiveQuickTab('REPORT_DEFECT')}
            className={`py-1.5 rounded transition-colors ${
              activeQuickTab === 'REPORT_DEFECT'
                ? 'bg-rose-500 text-white font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Báo Lỗi KCS
          </button>
          <button
            onClick={() => setActiveQuickTab('BTP')}
            className={`py-1.5 rounded transition-colors ${
              activeQuickTab === 'BTP'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Tồn Kho BTP
          </button>
        </div>
      </div>

      {/* TAB 1: VEHICLE QUEUE AT STATION */}
      {activeQuickTab === 'QUEUE' && (
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Danh sách xe đang chờ / gia công:</span>
            <span className="font-mono">{activeOrders.length} xe</span>
          </div>

          {activeOrders.map((ord) => {
            const isRework = ord.status === 'REWORK_ALERT';

            return (
              <div
                key={ord.id}
                className="bg-slate-800/90 border border-slate-700 rounded-lg p-3.5 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-sm font-bold text-white block">
                      {ord.id}
                    </span>
                    <span className="text-xs font-semibold text-amber-400 block truncate max-w-[220px]">
                      {ord.customerName}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isRework
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isRework ? 'Lỗi Rework' : `N${ord.currentDay}/14`}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <p className="truncate"><strong>Dòng xe:</strong> {ord.conversionVersion}</p>
                  <p className="font-mono text-slate-400"><strong>Hạn giao:</strong> {ord.dueDate}</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Tiến độ xe</span>
                    <span className="text-white font-bold">{ord.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isRework ? 'bg-rose-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${ord.progress}%` }}
                    />
                  </div>
                </div>

                {/* 1-Tap Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/80">
                  <button
                    onClick={() => {
                      setSelectedOrderId(ord.id);
                      setActiveQuickTab('REPORT_DEFECT');
                    }}
                    className="py-2 text-[11px] font-semibold text-rose-300 bg-rose-950/40 border border-rose-800 rounded hover:bg-rose-900/60 flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Báo Lỗi KCS</span>
                  </button>

                  <button
                    onClick={() => handleQuickComplete(ord.id)}
                    className="py-2 text-[11px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Xong Bước (+10%)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: QUICK DEFECT REPORTING FORM */}
      {activeQuickTab === 'REPORT_DEFECT' && (
        <div className="p-3">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Báo Cáo Sự Cố Tại Chuyền</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gửi cảnh báo tức thì đến Quản đốc và Trưởng phòng SX
              </p>
            </div>

            {submittedMessage ? (
              <div className="p-4 bg-emerald-900/40 border border-emerald-600 rounded text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <span className="text-xs font-bold text-emerald-200 block">
                  Đã Gửi Cảnh Báo Rework Xuống Hệ Thống!
                </span>
                <span className="text-[11px] text-emerald-300 font-mono">
                  Đang chuyển về danh sách hàng chờ...
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmitDefect} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Chọn Mã Xe Bị Sự Cố:
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"
                  >
                    {activeOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} - {o.customerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tổ Nghiệp Vụ Phát Hiện:
                  </label>
                  <input
                    disabled
                    type="text"
                    value={currentTeam.name}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded p-2 text-slate-400 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Chi Tiết Lỗi / Hư Hỏng *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={defectText}
                    onChange={(e) => setDefectText(e.target.value)}
                    placeholder="Mô tả cụ thể: lỗi đường chỉ may, chập giắc điện, mộc lệch cữ, thiếu vật tư..."
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2 p-2 bg-slate-900 rounded border border-slate-700/60 text-slate-400">
                  <Camera className="w-4 h-4 text-slate-300" />
                  <span className="text-[11px]">Chụp ảnh hiện trường đính kèm biên bản KCS</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded shadow-md flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Xác Nhận & Gửi Cảnh Báo Rework</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BTP INVENTORY COUNTER */}
      {activeQuickTab === 'BTP' && (
        <div className="p-3 space-y-3">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Tồn Kho BTP Tại {currentTeam.name}
            </h3>

            <div className="p-3 bg-slate-900 rounded border border-slate-700 space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Bán thành phẩm:</span>
              <span className="text-sm font-bold text-white block">
                {currentTeam.btpName}
              </span>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-3xl font-extrabold font-mono text-amber-400">
                  {currentTeam.btpStockUnits}
                </span>
                <span className="text-xs text-slate-400">bộ đang nằm chờ</span>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1 pt-1">
              <p>⏱️ <strong>Giờ công ước tính giải tỏa:</strong> {(currentTeam.btpStockUnits * 2.5).toFixed(1)}h</p>
              <p>👥 <strong>Nhân sự hiện tại:</strong> {currentTeam.headcount} thợ lành nghề</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
