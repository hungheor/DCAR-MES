import React from 'react';
import {
  SystemAlert,
  OrderItem,
  ProductionTeam,
  Role,
  NavigationTarget,
} from '../types/mes';
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckCircle,
  ShieldAlert,
  Wrench,
  CheckCheck,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

interface AlertCenterProps {
  alerts: SystemAlert[];
  orders: OrderItem[];
  teams: ProductionTeam[];
  currentRole: Role;
  onAcknowledgeAlert: (alertId: string) => void;
  onNavigateTab: (tab: string) => void;
  onSelectOrder: (order: OrderItem) => void;
  onNavigate?: (target: NavigationTarget) => void;
  isReadOnly?: boolean;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  orders,
  teams,
  currentRole,
  onAcknowledgeAlert,
  onNavigateTab,
  onSelectOrder,
  onNavigate,
  isReadOnly = false,
}) => {
  // Urgent near-deadline orders that have not completed Cluster 4
  const today = new Date('2026-11-02');
  const nearDeadlineOrders = orders.filter((o) => {
    if (o.status === 'COMPLETED') return false;
    const due = new Date(o.dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 4 && o.currentCluster < 4;
  });

  // Quality defect rankings across teams
  const sortedTeamsByDefects = [...teams].sort((a, b) => b.defectRate - a.defectRate);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Trung Tâm Cảnh Báo Điều Hành Sản Xuất Real-Time
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cảnh báo tiến độ giao xe đỏ, tỷ lệ lỗi KCS theo 17 tổ và thiếu hụt linh kiện trọng yếu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded">
            {alerts.filter((a) => !a.acknowledged).length} Cảnh Báo Chưa Xử Lý
          </span>
        </div>
      </div>

      {/* SECTION 1: RED ALERT FOR NEAR-DEADLINE ORDERS NOT COMPLETED CLUSTER 4 */}
      <div className="bg-white border border-rose-200 rounded-lg p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2 text-rose-900">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">
                Cảnh Báo Đỏ: Đơn Hàng Sắp Đến Hạn Giao Nhưng Chưa Hoàn Thành Cụm 4
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Các đơn hàng có ngày cam kết giao xe trong vòng ≤ 4 ngày nhưng chưa vào bước Lắp Ráp Tổng Thể & KCS
              </p>
            </div>
          </div>

          <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
            {nearDeadlineOrders.length} Đơn Nguy Cơ
          </span>
        </div>

        {nearDeadlineOrders.length === 0 ? (
          <div className="py-4 text-center text-xs text-emerald-700 font-medium">
            ✓ Không có đơn hàng nào bị trễ cụm lắp ráp tổng thể trước hạn giao xe.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {nearDeadlineOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-3.5 bg-rose-50/50 border border-rose-200 rounded text-xs space-y-2 hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {ord.id}
                  </span>
                  <span className="font-mono text-rose-700 font-extrabold bg-rose-100 px-2 py-0.5 rounded">
                    Hạn: {ord.dueDate}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 truncate">
                  {ord.customerName} · <span className="font-normal text-slate-500">{ord.conversionVersion}</span>
                </p>
                <div className="flex items-center justify-between text-slate-600 pt-1.5 border-t border-rose-100">
                  <span>
                    Hiện ở: <strong>Cụm {ord.currentCluster} (Ngày {ord.currentDay}/14)</strong>
                  </span>
                  <button
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate({
                          tab: 'orders',
                          subView: 'JOURNEY_TRACKING',
                          orderId: ord.id,
                          sourceDesc: `Cảnh Báo Hạn Giao: ${ord.id} (${ord.customerName})`,
                        });
                      } else {
                        onSelectOrder(ord);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-rose-800 bg-white hover:bg-rose-100 border border-rose-300 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem 17 Công Đoạn</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: QUALITY DEFECT RATE PER TEAM (MỘC, MAY, ĐIỆN, SẮT...) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Thống Kê Tỷ Lệ Lỗi KCS Phát Sinh Theo Tổ (Defect Rate %)
            </h3>
            <p className="text-xs text-slate-500">
              Kiểm soát chất lượng tại nguồn ở từng công đoạn (Mộc, May, Điện, Sắt hàn, Đúc composite)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Ngưỡng cho phép: &lt; 2.0%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sortedTeamsByDefects.slice(0, 8).map((t) => {
            const isHighDefect = t.defectRate >= 2.0;

            return (
              <div
                key={t.id}
                className={`p-3 rounded border text-xs space-y-2 transition-all ${
                  isHighDefect
                    ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200/50'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-500">
                    {t.id}
                  </span>
                  <span
                    className={`font-mono font-extrabold text-xs px-1.5 py-0.2 rounded ${
                      isHighDefect
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {t.defectRate}% Lỗi
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 truncate">
                    {t.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {t.assignedPosition} · <span className="font-mono text-amber-600 font-semibold">{t.assignedUserCode}</span>
                  </p>
                </div>

                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isHighDefect ? 'bg-rose-500' : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.min(100, t.defectRate * 25)}%` }}
                  />
                </div>

                {onNavigate && (
                  <button
                    onClick={() =>
                      onNavigate({
                        tab: 'scheduling',
                        subView: 'DAILY_DISPATCH',
                        teamId: t.id,
                        clusterId: t.clusterId,
                        sourceDesc: `Tỷ lệ lỗi ${t.name} (${t.defectRate}%)`,
                      })
                    }
                    className="w-full mt-1 pt-1.5 border-t border-slate-200/60 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Xem Lịch Điều Phối Tổ</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: SYSTEM NOTIFICATIONS & AUDIT LOG */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Nhật Ký Cảnh Báo & Sự Cố Chuyền (Audit Log)
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Tự động kích hoạt khi có biến động
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                alert.acknowledged ? 'bg-slate-50/50 opacity-70' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <span
                  className={`p-1.5 rounded shrink-0 mt-0.5 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {alert.title}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {alert.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {alert.description}
                  </p>
                  {alert.targetRefId && (
                    <div className="pt-0.5">
                      <button
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate({
                              tab: 'orders',
                              subView: 'JOURNEY_TRACKING',
                              orderId: alert.targetRefId,
                              sourceDesc: `Cảnh báo sự cố: ${alert.title}`,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer transition-colors"
                      >
                        <span>Tra Cứu Lệnh {alert.targetRefId}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pl-9 sm:pl-0 shrink-0">
                {!alert.acknowledged ? (
                  <button
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Xác Nhận Xử Lý</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Đã ghi nhận</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
