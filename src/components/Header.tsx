import React from 'react';
import {
  Role,
  AppUser,
  AppModuleId,
} from '../types/mes';
import {
  ShieldAlert,
  Smartphone,
  Monitor,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  currentUser?: AppUser;
  onRoleChange: (role: Role) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadAlertCount: number;
  isMobileMode: boolean;
  onToggleMobileMode: () => void;
  onOpenSheetSync?: () => void;
}

interface NavGroup {
  groupName: string;
  items: {
    id: AppModuleId;
    label: string;
    badge?: number;
    subtext?: string;
  }[];
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  onRoleChange,
  activeTab,
  onTabChange,
  unreadAlertCount,
  isMobileMode,
  onToggleMobileMode,
  onOpenSheetSync,
}) => {
  const roleLabels: Record<Role, { name: string; dept: string }> = {
    Order_Admin: { name: 'Quản Lý Đơn Hàng', dept: 'Phòng Kinh Doanh & Tiếp Nhận Đơn' },
    Planner: { name: 'Kế Hoạch Sản Xuất', dept: 'Phòng Kế Hoạch & Cung Ứng Vật Tư' },
    Production_Manager: { name: 'Trưởng Phòng SX (TPSX)', dept: 'Ban Quản Lý Sản Xuất' },
    Foreman: { name: 'Quản Lý Sản Xuất Cụm', dept: 'Xưởng Chế Tác 17 Tổ' },
    Executive: { name: 'Ban Giám Đốc (BGD)', dept: 'Văn Phòng Điều Hành' },
  };

  const navGroups: NavGroup[] = [
    {
      groupName: 'ĐIỀU HÀNH & KẾ HOẠCH',
      items: [
        { id: 'dashboard', label: 'Báo Cáo Quản Trị', subtext: 'OTD · OEE · Lead Time · Pareto' },
        { id: 'scheduling', label: 'Lịch Cụm & 17 Tổ', subtext: 'Dispatch ca · Cần làm hôm nay' },
        { id: 'orders', label: 'Đơn Hàng & Hợp Đồng', subtext: 'Tracking 17 bước · Lô xe' },
      ],
    },
    {
      groupName: 'ĐỒNG BỘ & NĂNG LỰC',
      items: [
        { id: 'btp', label: 'Đồng Bộ BTP Theo Đơn', subtext: 'Kit-to-Order · Chờ gì' },
        { id: 'matrix', label: 'Ma Trận 17 Tổ', subtext: 'Chuyền 14 ngày · Nghẽn' },
      ],
    },
    {
      groupName: 'GIÁM SÁT & QUẢN TRỊ',
      items: [
        { id: 'alerts', label: 'Cảnh Báo Real-time', badge: unreadAlertCount, subtext: 'Tiến độ · Rework' },
        { id: 'roles', label: 'Phân Quyền User', subtext: 'Vị trí trạm · RBAC' },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTabChange('dashboard')}
              className="text-left group flex items-center gap-2.5 focus-visible:outline-none"
            >
              <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-amber-400 font-black text-sm tracking-wider shadow-sm group-hover:bg-slate-800 transition-colors">
                DC
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 whitespace-nowrap">
                  DCAR LIMOUSINE
                </span>
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase -mt-0.5">
                  MES MANUFACTURING SYSTEM
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Groups (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6">
            {navGroups.map((group, gIdx) => (
              <div key={group.groupName} className="flex items-center gap-1.5">
                {gIdx > 0 && <div className="h-6 w-px bg-slate-200 mx-1.5" aria-hidden="true" />}
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase px-2 mb-0.5">
                    {group.groupName}
                  </span>
                  <div className="flex items-center gap-1">
                    {group.items.map((link) => {
                      const perm = currentUser?.permissions?.[link.id as AppModuleId];
                      const isLocked = perm === 'NONE';
                      const isReadOnly = perm === 'VIEW_ONLY';
                      const isActive = activeTab === link.id;

                      return (
                        <button
                          key={link.id}
                          onClick={() => onTabChange(link.id)}
                          className={`relative px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-slate-900 text-white font-bold shadow-2xs'
                              : isLocked
                              ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                          title={
                            isLocked
                              ? 'Phân hệ này bị KHÓA với tài khoản của bạn'
                              : isReadOnly
                              ? 'Chế độ CHỈ XEM'
                              : 'Được phép thao tác'
                          }
                        >
                          <span>{link.label}</span>

                          {isLocked && (
                            <span className="text-[10px] text-rose-500 font-mono" title="Không có quyền xem">
                              🔒
                            </span>
                          )}
                          {isReadOnly && !isLocked && !isActive && (
                            <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded font-mono">
                              Xem
                            </span>
                          )}

                          {link.badge !== undefined && link.badge > 0 && (
                            <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-rose-500 text-white rounded-full">
                              {link.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          {/* Zone 3: Actions & Role Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Google Sheet Two-Way Sync Button */}
            {onOpenSheetSync && (
              <button
                onClick={onOpenSheetSync}
                title="Đồng bộ dữ liệu 2 đầu với Google Sheet"
                className="px-2.5 py-1.5 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline font-mono text-[11px]">Google Sheet</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            {/* Switch Workshop / Mobile simulation view */}
            <button
              onClick={onToggleMobileMode}
              title={isMobileMode ? 'Xem giao diện Desktop' : 'Xem chế độ Quản đốc tại xưởng (Mobile)'}
              className={`p-2 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                isMobileMode
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isMobileMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Desktop</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Mobile Xưởng</span>
                </>
              )}
            </button>

            {/* Role selector dropdown */}
            <div className="relative flex items-center gap-2 pl-2 border-l border-slate-200">
              <UserCheck className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as Role)}
                aria-label="Chọn vai trò người dùng"
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium text-xs rounded border-0 py-1.5 pl-2 pr-7 focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Order_Admin">Role: Quản Lý Đơn Hàng (Kinh Doanh)</option>
                <option value="Planner">Role: Kế Hoạch Sản Xuất (MRP/CRP)</option>
                <option value="Production_Manager">Role: TPSX (Trưởng Phòng SX)</option>
                <option value="Foreman">Role: Quản Lý Sản Xuất Cụm</option>
                <option value="Executive">Role: Ban Giám Đốc (BGD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Tab Bar */}
        <div className="lg:hidden flex items-center overflow-x-auto border-t border-slate-100 py-2 gap-2 text-xs font-medium scrollbar-none">
          {navGroups.flatMap((g) => g.items).map((link) => (
            <button
              key={link.id}
              onClick={() => onTabChange(link.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === link.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{link.label}</span>
              {link.badge !== undefined && link.badge > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-500 text-white rounded-full">
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
