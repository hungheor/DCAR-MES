import React, { useState } from 'react';
import {
  AppUser,
  ProductionTeam,
  Role,
  AppModuleId,
  AccessLevel,
} from '../types/mes';
import {
  ShieldCheck,
  UserCheck,
  Users,
  Layers,
  CheckCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sliders,
  Settings,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface UserRoleManagementProps {
  users: AppUser[];
  teams: ProductionTeam[];
  currentRole: Role;
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
  onUpdateStationAssignment: (teamId: string, newUserCode: string, newPositionTitle: string) => void;
  onUpdateUserPermission: (userId: string, moduleId: AppModuleId, level: AccessLevel) => void;
  isReadOnly?: boolean;
}

interface ModuleMeta {
  id: AppModuleId;
  name: string;
  code: string;
  description: string;
  criticalRole: string;
}

const SYSTEM_MODULES: ModuleMeta[] = [
  {
    id: 'dashboard',
    name: 'Báo Cáo Quản Trị & Pareto 80/20',
    code: 'MOD-DASH',
    description: 'Biểu đồ Pareto lỗi chất lượng, phân tích giờ sửa hàng (rework) và tải xưởng CRP',
    criticalRole: 'Executive, TPSX',
  },
  {
    id: 'orders',
    name: 'Quản Lý Đơn Hàng & Tiếp Nhận LSX',
    code: 'MOD-ORD',
    description: 'Tiếp nhận thông số từ Kinh Doanh, cấu hình BOM xe Limousine và sinh mã LSX tự động',
    criticalRole: 'Order_Admin, TPSX',
  },
  {
    id: 'scheduling',
    name: 'Lập Lịch Tuần & Cân Đối MRP / CRP',
    code: 'MOD-SCHED',
    description: 'Chọn đơn triển khai tuần, tính cộng dồn giờ công, vật tư kho HHCITY0B và cân đối tải xưởng',
    criticalRole: 'Planner, TPSX',
  },
  {
    id: 'matrix',
    name: 'Ma Trận Tiến Độ 17 Tổ Chuyền',
    code: 'MOD-MAT',
    description: 'Theo dõi 14 ngày chuyền, quét QR chốt bước hoàn thành và báo cáo lỗi KCS tại trạm',
    criticalRole: 'Foreman (17 Tổ), TPSX',
  },
  {
    id: 'btp',
    name: 'Cân Bằng BTP & Điều Phối Thợ',
    code: 'MOD-BTP',
    description: 'Kiểm soát tồn kho đệm bán thành phẩm (mút, gáo ghế, da) và điều chuyển thợ cứu nghẽn',
    criticalRole: 'Foreman, Planner, TPSX',
  },
  {
    id: 'alerts',
    name: 'Trung Tâm Cảnh Báo Điều Hành',
    code: 'MOD-ALT',
    description: 'Cảnh báo rủi ro trễ hẹn, phát sinh rework, thiếu hụt BOM và nghẽn chuyền',
    criticalRole: 'Tất cả vị trí điều hành',
  },
  {
    id: 'roles',
    name: 'Phân Quyền User & Bố Trí Vị Trí',
    code: 'MOD-RBAC',
    description: 'Cấu hình quyền 3 mức (Khóa/Xem/Thao tác) và bố trí chức danh trạm — Không dùng tên cá nhân',
    criticalRole: 'TPSX, Ban Giám Đốc',
  },
];

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  users,
  teams,
  currentRole,
  currentUser,
  onSwitchUser,
  onUpdateStationAssignment,
  onUpdateUserPermission,
  isReadOnly = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'PERMISSIONS' | 'STATIONS'>('PERMISSIONS');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const roleBadgeStyles: Record<Role, { bg: string; text: string; label: string }> = {
    Order_Admin: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', label: 'Quản Lý Đơn Hàng' },
    Planner: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', label: 'Kế Hoạch Sản Xuất' },
    Production_Manager: { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-900', label: 'Trưởng Phòng SX (TPSX)' },
    Foreman: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Quản Lý Sản Xuất Cụm' },
    Executive: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', label: 'Ban Giám Đốc (BGD)' },
  };

  const handleApplyPreset = (level: AccessLevel) => {
    if (isReadOnly) return;
    SYSTEM_MODULES.forEach((mod) => {
      onUpdateUserPermission(selectedUser.id, mod.id, level);
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Phân Quyền User &amp; Bố Trí Vị Trí Thao Tác (Granular RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tùy chọn phân quyền 3 mức: <strong>Không được xem (NONE)</strong>, <strong>Được xem (VIEW_ONLY)</strong>, hoặc <strong>Được thao tác (FULL_ACCESS)</strong> cho từng module
          </p>
        </div>

        {/* Current Active Account Indicator */}
        <div className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
            {currentUser.accountCode.slice(0, 2)}
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">{currentUser.positionTitle}</span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <span className="text-amber-700 font-semibold">{currentUser.accountCode}</span>
              <span aria-hidden="true">·</span>
              <span>Role: {currentUser.role}</span>
            </div>
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Chế độ Chỉ Xem (VIEW ONLY):</strong> Tài khoản của bạn được cấp quyền xem cấu hình phân quyền nhưng không được thay đổi thiết lập hệ thống.
          </span>
        </div>
      )}

      {/* Segmented SubTabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('PERMISSIONS')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'PERMISSIONS'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Tùy Chỉnh Phân Quyền Theo User &amp; Module (RBAC 3 Mức)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('STATIONS')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'STATIONS'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Bố Trí Vị Trí 17 Tổ Chuyền &amp; Cấp Phê Duyệt</span>
        </button>
      </div>

      {/* SUBTAB 1: GRANULAR PERMISSION CONFIGURATION */}
      {activeSubTab === 'PERMISSIONS' && (
        <div className="space-y-6">
          {/* User selector cards */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Chọn Tài Khoản Cần Phân Quyền ({users.length} tài khoản)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nhấp vào một tài khoản để tùy chỉnh quyền Không được xem / Xem / Thao tác cho từng phân hệ
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Active ID: {selectedUser.accountCode}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5 pt-1">
              {users.map((user) => {
                const isSelected = user.id === selectedUser.id;
                const isCurrent = user.id === currentUser.id;
                const badge = roleBadgeStyles[user.role];

                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-2.5 text-left rounded-lg border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-2xs ring-1 ring-amber-500/30'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                          {user.accountCode}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-500 text-slate-950 font-bold rounded">
                            BẠN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 line-clamp-1">
                        {user.positionTitle}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded font-semibold border ${badge.bg} ${badge.text}`}>
                        {user.role}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {Object.values(user.permissions).filter((p) => p === 'FULL_ACCESS').length}/7 quyền
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Permission Matrix Panel for Selected User */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            {/* Header with Switch User action */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                  {selectedUser.accountCode.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      Cấu Hình Quyền Cho: {selectedUser.positionTitle}
                    </h3>
                    <span className="font-mono text-xs text-amber-700 font-bold bg-amber-100 px-2 py-0.2 rounded">
                      {selectedUser.accountCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đơn vị: {selectedUser.department} · Vị trí thao tác trạm: {selectedUser.assignedWorkstations.join(', ')}
                  </p>
                </div>
              </div>

              {/* Action buttons & Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {currentUser.id !== selectedUser.id ? (
                  <button
                    onClick={() => onSwitchUser(selectedUser)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Đăng Nhập Tài Khoản Này Để Kiểm Thử</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Tài Khoản Đang Đăng Nhập</span>
                  </span>
                )}

                {/* Preset shortcuts */}
                {!isReadOnly && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <button
                      onClick={() => handleApplyPreset('FULL_ACCESS')}
                      className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                      title="Cấp toàn bộ quyền thao tác cho tài khoản này"
                    >
                      Tất Cả Thao Tác
                    </button>
                    <button
                      onClick={() => handleApplyPreset('VIEW_ONLY')}
                      className="px-2 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                      title="Chuyển toàn bộ phân hệ sang chỉ xem"
                    >
                      Chỉ Xem Tất Cả
                    </button>
                    <button
                      onClick={() => handleApplyPreset('NONE')}
                      className="px-2 py-1 text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                      title="Khóa toàn bộ phân hệ"
                    >
                      Khóa Tất Cả
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Permission rows */}
            <div className="divide-y divide-slate-100">
              {SYSTEM_MODULES.map((mod) => {
                const currentLevel: AccessLevel = selectedUser.permissions[mod.id] || 'NONE';

                return (
                  <div
                    key={mod.id}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {mod.name}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {mod.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {mod.description}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Chức danh khuyến nghị: <span className="font-medium text-slate-600">{mod.criticalRole}</span>
                      </div>
                    </div>

                    {/* 3-Level Segmented Radio Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg shrink-0 self-start lg:self-center">
                      {/* Option 1: NONE */}
                      <button
                        disabled={isReadOnly}
                        onClick={() => onUpdateUserPermission(selectedUser.id, mod.id, 'NONE')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentLevel === 'NONE'
                            ? 'bg-white text-rose-700 shadow-2xs font-bold border border-rose-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <EyeOff className={`w-3.5 h-3.5 ${currentLevel === 'NONE' ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span>Không Được Xem</span>
                      </button>

                      {/* Option 2: VIEW_ONLY */}
                      <button
                        disabled={isReadOnly}
                        onClick={() => onUpdateUserPermission(selectedUser.id, mod.id, 'VIEW_ONLY')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentLevel === 'VIEW_ONLY'
                            ? 'bg-white text-blue-700 shadow-2xs font-bold border border-blue-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <Eye className={`w-3.5 h-3.5 ${currentLevel === 'VIEW_ONLY' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>Được Xem (View Only)</span>
                      </button>

                      {/* Option 3: FULL_ACCESS */}
                      <button
                        disabled={isReadOnly}
                        onClick={() => onUpdateUserPermission(selectedUser.id, mod.id, 'FULL_ACCESS')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentLevel === 'FULL_ACCESS'
                            ? 'bg-white text-emerald-800 shadow-2xs font-bold border border-emerald-300'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${currentLevel === 'FULL_ACCESS' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Được Thao Tác</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global Cross-Matrix Overview Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs space-y-2">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Ma Trận Tổng Thể 8 Tài Khoản × 7 Phân Hệ MES
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nhấp trực tiếp vào ô bất kỳ để xoay vòng quyền (Không xem → Chỉ xem → Thao tác)
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Khóa (NONE)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Chỉ xem (VIEW)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Thao tác (FULL)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Tài Khoản / Vị Trí</th>
                    <th className="py-2.5 px-2 text-center">Dashboard</th>
                    <th className="py-2.5 px-2 text-center">Đơn Hàng</th>
                    <th className="py-2.5 px-2 text-center">Lập Lịch</th>
                    <th className="py-2.5 px-2 text-center">17 Tổ</th>
                    <th className="py-2.5 px-2 text-center">BTP WIP</th>
                    <th className="py-2.5 px-2 text-center">Cảnh Báo</th>
                    <th className="py-2.5 px-2 text-center">Phân Quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelected = u.id === selectedUser.id;
                    const isCurrent = u.id === currentUser.id;

                    const renderCell = (modId: AppModuleId) => {
                      const level = u.permissions[modId];
                      const nextLevel: AccessLevel =
                        level === 'NONE'
                          ? 'VIEW_ONLY'
                          : level === 'VIEW_ONLY'
                          ? 'FULL_ACCESS'
                          : 'NONE';

                      const badgeStyles =
                        level === 'FULL_ACCESS'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : level === 'VIEW_ONLY'
                          ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';

                      const label =
                        level === 'FULL_ACCESS' ? 'Thao Tác' : level === 'VIEW_ONLY' ? 'Chỉ Xem' : 'Khóa';

                      return (
                        <td key={modId} className="py-2 px-2 text-center">
                          <button
                            disabled={isReadOnly}
                            onClick={() => onUpdateUserPermission(u.id, modId, nextLevel)}
                            className={`w-full py-1 text-[10px] font-mono font-bold rounded border transition-colors ${badgeStyles} ${
                              isReadOnly ? 'cursor-default' : 'cursor-pointer'
                            }`}
                            title={`Nhấp để đổi sang: ${
                              nextLevel === 'NONE' ? 'Khóa' : nextLevel === 'VIEW_ONLY' ? 'Chỉ xem' : 'Thao tác'
                            }`}
                          >
                            {label}
                          </button>
                        </td>
                      );
                    };

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedUserId(u.id)}
                              className="text-left group"
                            >
                              <span className="font-mono font-bold text-slate-900 group-hover:text-amber-600 block">
                                {u.accountCode}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                                {u.positionTitle}
                              </span>
                            </button>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1 py-0.2 bg-amber-400 text-slate-950 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {renderCell('dashboard')}
                        {renderCell('orders')}
                        {renderCell('scheduling')}
                        {renderCell('matrix')}
                        {renderCell('btp')}
                        {renderCell('alerts')}
                        {renderCell('roles')}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: WORKSTATION & MANAGEMENT POSITION ASSIGNMENT */}
      {activeSubTab === 'STATIONS' && (
        <div className="space-y-6">
          {/* Key Management Positions (Intake, MRP, TPSX) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Các Vị Trí Quản Lý &amp; Phê Duyệt Cấp Cao Trong Quy Trình LSX</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy định vị trí nghiệp vụ và quyền hạn thực thi trên app — Không phụ thuộc tên cá nhân
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Position 1: Order Intake */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">01. Quản Lý Đơn Hàng</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                    Role: Order_Admin
                  </span>
                </div>
                <p className="text-slate-600">
                  Phụ trách tiếp nhận yêu cầu từ Kinh Doanh, nhập form thông số và kích hoạt thuật toán sinh mã LSX.
                </p>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Quyền thao tác:</span>
                  <strong className="text-emerald-700">Tạo &amp; Chỉnh Sửa Đơn</strong>
                </div>
              </div>

              {/* Position 2: Planner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">02. Kỹ Sư Kế Hoạch &amp; MRP</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold">
                    Role: Planner
                  </span>
                </div>
                <p className="text-slate-600">
                  Chạy cân đối định mức vật tư kho HHCITY0B, đề xuất gom lô theo dòng xe và điều phối tồn kho BTP.
                </p>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Quyền thao tác:</span>
                  <strong className="text-indigo-700">Lập Lịch &amp; Kitting Kho</strong>
                </div>
              </div>

              {/* Position 3: TPSX */}
              <div className="p-4 bg-amber-50/60 border border-amber-300 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">03. Trưởng Phòng Sản Xuất (TPSX)</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded font-bold">
                    Role: Production_Manager
                  </span>
                </div>
                <p className="text-slate-700">
                  Thẩm quyền cao nhất trong phê duyệt kế hoạch tuần, ban hành LSX xuống xưởng và kích hoạt tái lập lịch động.
                </p>
                <div className="pt-2 border-t border-amber-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Quyền thao tác:</span>
                  <strong className="text-amber-900 font-bold">Phê Duyệt &amp; Điều Hành Tối Cao</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 17 Workstation Assignment Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs space-y-2">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bố Trí Vị Trí Thao Tác 17 Tổ Chuyền (Workstation Assignment)
                </h3>
                <p className="text-xs text-slate-500">
                  Quản đốc hoặc tổ trưởng tại mỗi trạm sử dụng tài khoản được cấp quyền để quét mã QR chốt bước và báo cáo KCS
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                17 / 17 tổ sản xuất
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3">Mã Tổ</th>
                    <th className="py-3 px-3">Tên Tổ Chuyên Trách</th>
                    <th className="py-3 px-3">Cụm Phân Xưởng</th>
                    <th className="py-3 px-2 text-center">Định Biên</th>
                    <th className="py-3 px-3">Chức Danh Phụ Trách Trạm</th>
                    <th className="py-3 px-3">Mã User Thao Tác</th>
                    <th className="py-3 px-3 text-center">Thẩm Quyền Trạm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {team.id}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {team.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {team.clusterName}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-700">
                        {team.headcount} thợ
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={team.assignedPosition}
                          onChange={(e) =>
                            onUpdateStationAssignment(team.id, team.assignedUserCode, e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 disabled:opacity-75"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          disabled={isReadOnly}
                          value={team.assignedUserCode}
                          onChange={(e) =>
                            onUpdateStationAssignment(team.id, e.target.value, team.assignedPosition)
                          }
                          className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded font-mono font-bold text-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-75"
                        >
                          {users
                            .filter((u) => u.role === 'Foreman' || u.role === 'Production_Manager')
                            .map((u) => (
                              <option key={u.id} value={u.accountCode}>
                                {u.accountCode} ({u.positionTitle})
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Chốt bước &amp; Rework</span>
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
    </div>
  );
};
