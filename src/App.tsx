import React, { useState, useEffect } from 'react';
import {
  Role,
  OrderItem,
  MRPItem,
  CRPWorkcenter,
  ProductionTeam,
  BTPInventoryItem,
  SystemAlert,
  AppUser,
  AppModuleId,
  AccessLevel,
  NavigationTarget,
  BTPWaitingBufferItem,
  TeamCapacityStaffing,
  StageCycleNorm,
} from './types/mes';
import {
  Lock,
  Eye,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  INITIAL_ORDERS,
  INITIAL_MRP_MATERIALS,
  INITIAL_CRP_WORKCENTERS,
  INITIAL_TEAMS,
  INITIAL_BTP_ITEMS,
  INITIAL_ALERTS,
  INITIAL_APP_USERS,
  INITIAL_DAILY_SCHEDULES,
  INITIAL_BTP_WAITING_BUFFERS,
  INITIAL_TEAM_CAPACITY_STAFFING,
  INITIAL_STAGE_CYCLE_NORMS,
} from './data/mockData';
import {
  runMRPBalancing,
  runCRPBalancing,
  executeDynamicRescheduling,
  BatchGroupSuggestion,
} from './services/mesEngine';
import {
  fetchSheetData,
  pushOrderToSheet,
  updateOrderInSheet,
  pushDefectToSheet,
  isAutoSyncEnabled,
} from './services/googleSheetService';
import { Header } from './components/Header';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { OrderManagement } from './components/OrderManagement';
import { SmartScheduling } from './components/SmartScheduling';
import { ProductionGanttChart } from './components/ProductionGanttChart';
import { ProductionMatrix } from './components/ProductionMatrix';
import { BTPManagement } from './components/BTPManagement';
import { AlertCenter } from './components/AlertCenter';
import { MobileWorkshopView } from './components/MobileWorkshopView';
import { UserRoleManagement } from './components/UserRoleManagement';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';

export default function App() {
  // Users & Role State
  const [users, setUsers] = useState<AppUser[]>(INITIAL_APP_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_APP_USERS[2]); // Default: TPSX
  const [currentRole, setCurrentRole] = useState<Role>('Production_Manager');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);

  // Google Sheet Two-Way Sync Modal State
  const [isSheetSyncOpen, setIsSheetSyncOpen] = useState<boolean>(false);

  // Cross-report Deep-Link Navigation State
  const [navTarget, setNavTarget] = useState<NavigationTarget | null>(null);

  const handleNavigate = (target: NavigationTarget) => {
    setNavTarget(target);
    setActiveTab(target.tab);
  };

  const handleClearNavTarget = () => {
    setNavTarget(null);
  };

  // Sync role change with user account
  const handleRoleChange = (newRole: Role) => {
    setCurrentRole(newRole);
    const matchedUser = users.find((u) => u.role === newRole) || users[0];
    setCurrentUser(matchedUser);
  };

  const handleSwitchUser = (user: AppUser) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
  };

  // Domain Entity State
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [materials, setMaterials] = useState<MRPItem[]>(INITIAL_MRP_MATERIALS);
  const [workcenters, setWorkcenters] = useState<CRPWorkcenter[]>(INITIAL_CRP_WORKCENTERS);
  const [teams, setTeams] = useState<ProductionTeam[]>(INITIAL_TEAMS);
  const [btpItems, setBtpItems] = useState<BTPInventoryItem[]>(INITIAL_BTP_ITEMS);
  const [btpWaitingBuffers, setBtpWaitingBuffers] = useState<BTPWaitingBufferItem[]>(INITIAL_BTP_WAITING_BUFFERS);
  const [alerts, setAlerts] = useState<SystemAlert[]>(INITIAL_ALERTS);
  const [teamCapacity, setTeamCapacity] = useState<TeamCapacityStaffing[]>(INITIAL_TEAM_CAPACITY_STAFFING);
  const [cycleNorms, setCycleNorms] = useState<StageCycleNorm[]>(INITIAL_STAGE_CYCLE_NORMS);

  // HANDLER: Update workstation assignment (Phân quyền vị trí trạm)
  const handleUpdateStationAssignment = (
    teamId: string,
    newUserCode: string,
    newPositionTitle: string
  ) => {
    setTeams(
      teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              assignedUserCode: newUserCode,
              assignedPosition: newPositionTitle,
            }
          : t
      )
    );
  };

  // HANDLER: Update granular user module permission (NONE | VIEW_ONLY | FULL_ACCESS)
  const handleUpdateUserPermission = (
    userId: string,
    moduleId: AppModuleId,
    level: AccessLevel
  ) => {
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            permissions: {
              ...u.permissions,
              [moduleId]: level,
            },
          };
          if (currentUser.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
  };

  // Modal State for viewing full LSX document
  const [selectedOrderModal, setSelectedOrderModal] = useState<OrderItem | null>(null);

  // Unread Alerts Count
  const unreadAlertCount = alerts.filter((a) => !a.acknowledged).length;

  // Gentle initial fetch from Google Sheet on app load
  useEffect(() => {
    let isMounted = true;
    fetchSheetData()
      .then((res) => {
        if (isMounted && res.success) {
          if (res.orders && res.orders.length > 0) {
            setOrders(res.orders);
          }
          if (res.teamCapacity && res.teamCapacity.length > 0) {
            setTeamCapacity(res.teamCapacity);
          }
          if (res.cycleNorms && res.cycleNorms.length > 0) {
            setCycleNorms(res.cycleNorms);
          }
        }
      })
      .catch(() => {
        // Safe fallback to initial sample data
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // HANDLER: Load data from Google Sheet
  const handleDataLoadedFromSheet = (
    sheetOrders: OrderItem[],
    sheetCapacity?: TeamCapacityStaffing[],
    sheetNorms?: StageCycleNorm[]
  ) => {
    if (sheetOrders && sheetOrders.length > 0) {
      setOrders(sheetOrders);
      const { updatedMaterials } = runMRPBalancing(sheetOrders, materials);
      setMaterials(updatedMaterials);
      const updatedCRP = runCRPBalancing(sheetOrders, workcenters);
      setWorkcenters(updatedCRP);
    }
    if (sheetCapacity && sheetCapacity.length > 0) {
      setTeamCapacity(sheetCapacity);
    }
    if (sheetNorms && sheetNorms.length > 0) {
      setCycleNorms(sheetNorms);
    }
  };

  // HANDLER: Add new order from Order Intake Form
  const handleAddOrder = (newOrder: OrderItem) => {
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);

    // Re-run MRP & CRP balancing
    const { updatedMaterials } = runMRPBalancing(updatedOrders, materials);
    setMaterials(updatedMaterials);
    const updatedCRP = runCRPBalancing(updatedOrders, workcenters);
    setWorkcenters(updatedCRP);

    // Auto-sync 2-way push to Google Sheet
    if (isAutoSyncEnabled()) {
      pushOrderToSheet(newOrder).catch((e) => console.warn('[SheetSync] Push error:', e));
    }

    // Auto-create alert
    const newAlert: SystemAlert = {
      id: `ALT-NEW-${Date.now()}`,
      type: 'DUE_DATE_RISK',
      title: `Tiếp nhận mới Lệnh sản xuất ${newOrder.id}`,
      description: `Đơn hàng ${newOrder.customerName} (${newOrder.conversionVersion}) đã vào hệ thống, chờ cân đối MRP/CRP tuần.`,
      severity: 'INFO',
      timestamp: new Date().toLocaleString('vi-VN'),
      targetRefId: newOrder.id,
      acknowledged: false,
    };
    setAlerts([newAlert, ...alerts]);
  };

  // HANDLER: Update an existing order
  const handleUpdateOrder = (updatedOrder: OrderItem) => {
    setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    if (selectedOrderModal?.id === updatedOrder.id) {
      setSelectedOrderModal(updatedOrder);
    }

    // Auto-sync 2-way update to Google Sheet
    if (isAutoSyncEnabled()) {
      updateOrderInSheet(updatedOrder).catch((e) => console.warn('[SheetSync] Update error:', e));
    }
  };

  // HANDLER: Accept incoming BTP buffer item into workshop production
  const handleAcceptWaitingBTP = (bufferId: string) => {
    setBtpWaitingBuffers((prev) =>
      prev.map((b) => (b.id === bufferId ? { ...b, status: 'ACCEPTED_IN_PRODUCTION' as const } : b))
    );
  };

  // HANDLER: Mark workshop step complete & transition BTP to Waiting buffer
  const handleCompleteStationStep = (orderId: string, teamId: string) => {
    handleMobileProgressStep(orderId, 10);
    const matchedOrder = orders.find((o) => o.id === orderId);
    const matchedTeam = teams.find((t) => t.id === teamId);
    const teamNum = parseInt(teamId.replace('T', ''), 10);
    const nextTeamId = teamNum < 17 ? `T${String(teamNum + 1).padStart(2, '0')}` : 'T17';
    const nextTeam = teams.find((t) => t.id === nextTeamId);

    const newBufferItem: BTPWaitingBufferItem = {
      id: `WAIT-BTP-${Date.now()}`,
      orderId,
      orderCode: orderId,
      customerName: matchedOrder?.customerName || 'Khách hàng DCAR',
      conversionVersion: matchedOrder?.conversionVersion || 'Ford Thương Gia 11c',
      btpCode: matchedTeam?.code ? `BTP-${matchedTeam.code}` : `BTP-${teamId}`,
      btpName: matchedTeam?.btpName || `Bán thành phẩm ${matchedTeam?.name || teamId}`,
      completedByTeamId: teamId,
      completedByTeamName: matchedTeam?.name || teamId,
      downstreamTeamId: nextTeamId,
      downstreamTeamName: nextTeam?.name || 'Tổ tiếp theo',
      quantity: 1,
      completedTimestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      waitingHours: 0.1,
      status: 'WAITING_TRANSFER',
      notes: `${matchedTeam?.name} vừa đánh dấu hoàn thành, BTP đang chờ chuyển giao sang ${nextTeam?.name}.`,
    };

    setBtpWaitingBuffers((prev) => [newBufferItem, ...prev]);
  };

  // HANDLER: TPSX approves draft weekly schedule -> Sets planned start & completion dates, transitions to QUEUED_FOR_PRODUCTION
  const handleApproveWeeklyPlan = (
    approvedOrderIds: string[],
    scheduleDateOverrides?: Record<string, { plannedStartDate: string; plannedEndDate: string }>
  ) => {
    const updatedOrders = orders.map((o) => {
      if (approvedOrderIds.includes(o.id)) {
        const overrides = scheduleDateOverrides?.[o.id];
        const deploymentDate = overrides?.plannedStartDate || o.scheduledStartDate || '2026-11-09';
        const completionDate = overrides?.plannedEndDate || o.scheduledEndDate || '2026-11-23';
        return {
          ...o,
          status: 'QUEUED_FOR_PRODUCTION' as const,
          scheduledStartDate: deploymentDate,
          scheduledEndDate: completionDate,
          mrpReady: true,
          crpFeasible: true,
          notes: `${o.notes} [TPSX ĐÃ DUYỆT]: Kế hoạch tuần chính thức phê duyệt (Kế hoạch: ${deploymentDate} -> ${completionDate}). Chuyển trạng thái Chờ sản xuất.`,
        };
      }
      return o;
    });

    setOrders(updatedOrders);

    // Sync with sheet if enabled
    if (isAutoSyncEnabled()) {
      updatedOrders
        .filter((o) => approvedOrderIds.includes(o.id))
        .forEach((o) => updateOrderInSheet(o).catch((e) => console.warn('[SheetSync] Update error:', e)));
    }

    const approveAlert: SystemAlert = {
      id: `ALT-APP-${Date.now()}`,
      type: 'BOTTLENECK_LOAD',
      title: 'Trưởng Phòng SX đã phê duyệt Kế hoạch tuần',
      description: `Đã duyệt ${approvedOrderIds.length} đơn hàng sang trạng thái Chờ Sản Xuất với ngày bắt đầu & hoàn thành được thiết lập, ban hành Lệnh sản xuất CM-PR01-F01.`,
      severity: 'INFO',
      timestamp: new Date().toLocaleString('vi-VN'),
      targetRefId: approvedOrderIds[0] || 'WEEKLY_PLAN',
      acknowledged: false,
    };
    setAlerts([approveAlert, ...alerts]);
  };

  // HANDLER: Apply Batch Groups from Smart Scheduling Algorithm
  const handleApplyBatchGroups = (batches: BatchGroupSuggestion[]) => {
    const updatedOrders = orders.map((o) => {
      const matchedBatch = batches.find((b) => b.orderIds.includes(o.id));
      if (matchedBatch) {
        return {
          ...o,
          batchGroupId: matchedBatch.batchId,
        };
      }
      return o;
    });
    setOrders(updatedOrders);
  };

  // HANDLER: Trigger Dynamic Rescheduling on Critical Path
  const handleTriggerDynamicReschedule = (orderId: string, delayDays: number, reason: string) => {
    const { updatedOrders, generatedAlert } = executeDynamicRescheduling(
      orders,
      orderId,
      delayDays,
      reason
    );
    setOrders(updatedOrders);
    setAlerts([generatedAlert, ...alerts]);
  };

  // HANDLER: Report Quality Defect & Trigger Rework
  const handleReportDefect = (
    orderId: string,
    teamId: string,
    issue: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  ) => {
    const team = teams.find((t) => t.id === teamId);
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'REWORK_ALERT' as const,
          defectLog: {
            teamId,
            teamName: team?.name || teamId,
            issueDescription: issue,
            timestamp: new Date().toLocaleString('vi-VN'),
            severity,
            resolved: false,
          },
        };
      }
      return o;
    });

    setOrders(updatedOrders);

    // Increase team defect rate slightly
    setTeams(
      teams.map((t) =>
        t.id === teamId ? { ...t, defectRate: parseFloat((t.defectRate + 0.3).toFixed(1)) } : t
      )
    );

    const defectAlert: SystemAlert = {
      id: `ALT-DEF-${Date.now()}`,
      type: 'QUALITY_REWORK',
      title: `Lỗi KCS phát sinh tại ${team?.name || teamId} (${orderId})`,
      description: issue,
      severity: severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
      timestamp: new Date().toLocaleString('vi-VN'),
      targetRefId: orderId,
      acknowledged: false,
    };
    setAlerts([defectAlert, ...alerts]);

    // Auto-sync 2-way push defect to Google Sheet
    if (isAutoSyncEnabled()) {
      pushDefectToSheet({
        orderId,
        teamId,
        teamName: team?.name || teamId,
        issueDescription: issue,
        severity,
        reworkHours: 2.0,
        timestamp: new Date().toLocaleString('vi-VN'),
        resolved: false,
      }).catch((e) => console.warn('[SheetSync] Defect push error:', e));
    }
  };

  // HANDLER: Acknowledge Alert
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(
      alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  // HANDLER: Update BTP quantity
  const handleUpdateBTPQuantity = (btpId: string, newQty: number) => {
    setBtpItems(
      btpItems.map((b) => (b.id === btpId ? { ...b, quantity: newQty } : b))
    );
  };

  // HANDLER: Kitting material issue
  const handleKittingOrder = (materialCode: string, qty: number) => {
    setMaterials(
      materials.map((m) => {
        if (m.materialCode === materialCode) {
          const newStock = Math.max(0, m.stockHHCITY0B - qty);
          return {
            ...m,
            stockHHCITY0B: newStock,
            totalStock: newStock + m.stockHHCITY00,
            shortfall: newStock + m.stockHHCITY00 - m.totalAllocated,
          };
        }
        return m;
      })
    );
  };

  // HANDLER: Reallocate workers between teams
  const handleReallocateWorkers = (fromTeamId: string, toTeamId: string, count: number) => {
    setTeams(
      teams.map((t) => {
        if (t.id === fromTeamId) return { ...t, headcount: Math.max(1, t.headcount - count) };
        if (t.id === toTeamId) return { ...t, headcount: t.headcount + count };
        return t;
      })
    );
  };

  // HANDLER: Mobile progress step (+10%)
  const handleMobileProgressStep = (orderId: string, deltaPercent: number) => {
    setOrders(
      orders.map((o) => {
        if (o.id === orderId) {
          const nextProg = Math.min(100, o.progress + deltaPercent);
          const nextDay = Math.min(14, Math.ceil((nextProg / 100) * 14));
          return {
            ...o,
            progress: nextProg,
            currentDay: nextDay,
            status: nextProg >= 100 ? 'COMPLETED' : o.status,
          };
        }
        return o;
      })
    );
  };

  // If Mobile Mode is active, render the dedicated mobile workshop view
  if (isMobileMode) {
    return (
      <MobileWorkshopView
        orders={orders}
        teams={teams}
        currentRole={currentRole}
        onUpdateOrderProgress={handleMobileProgressStep}
        onReportDefect={handleReportDefect}
        onCloseMobileMode={() => setIsMobileMode(false)}
        waitingBuffers={btpWaitingBuffers}
        onAcceptWaitingBTP={handleAcceptWaitingBTP}
        onCompleteStationStep={handleCompleteStationStep}
      />
    );
  }

  // RBAC Access Evaluation for currently active tab
  const currentTabPermission: AccessLevel =
    currentUser?.permissions?.[activeTab as AppModuleId] ?? 'FULL_ACCESS';
  const isTabLocked = currentTabPermission === 'NONE';
  const isReadOnly = currentTabPermission === 'VIEW_ONLY';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Contract with Role Switcher & Mode Toggle */}
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadAlertCount={unreadAlertCount}
        isMobileMode={isMobileMode}
        onToggleMobileMode={() => setIsMobileMode(!isMobileMode)}
        onOpenSheetSync={() => setIsSheetSyncOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* CASE 1: ACCESS DENIED (LOCKED BY RBAC) */}
        {isTabLocked ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-xl mx-auto my-12 text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-xs font-bold text-rose-700 uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded inline-block">
                Truy Cập Bị Từ Chối · Phân Quyền RBAC
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Bạn Không Có Quyền Xem Phân Hệ Này
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Tài khoản <strong className="text-slate-800">{currentUser.accountCode}</strong> (<em>{currentUser.positionTitle}</em>) hiện được cấu hình ở mức <span className="font-mono font-bold text-rose-600">KHÓA (NONE)</span> đối với module này.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 text-left space-y-1.5 max-w-md mx-auto">
              <div className="flex justify-between">
                <span>Vị trí hiện tại:</span>
                <strong className="text-slate-900">{currentUser.positionTitle}</strong>
              </div>
              <div className="flex justify-between">
                <span>Đơn vị công tác:</span>
                <span className="text-slate-700">{currentUser.department}</span>
              </div>
              <div className="flex justify-between">
                <span>Mức quyền hiện tại:</span>
                <span className="font-mono font-bold text-rose-700">NONE (Không được xem)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Về Báo Cáo Tổng Quan
              </button>
              {currentUser.role !== 'Production_Manager' && (
                <button
                  onClick={() => {
                    const tpsxUser = users.find((u) => u.role === 'Production_Manager') || users[2];
                    handleSwitchUser(tpsxUser);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Chuyển Sang Tài Khoản TPSX (Toàn Quyền)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* CASE 2: ACCESS GRANTED (VIEW_ONLY OR FULL_ACCESS) */
          <>
            {isReadOnly && (
              <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Chế độ Chỉ Xem (VIEW ONLY):</strong> Tài khoản <em>{currentUser.positionTitle}</em> được cấp quyền tra cứu dữ liệu nhưng không được phép tạo mới, chỉnh sửa hoặc phê duyệt tại phân hệ này.
                  </span>
                </div>
                <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold shrink-0">
                  READ-ONLY
                </span>
              </div>
            )}

            {/* BREADCRUMB DRILL-DOWN BANNER */}
            {navTarget && (
              <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[11px] shadow-2xs">
                    ↗
                  </span>
                  <span>
                    <strong>Điều Chuyển Liên Kết:</strong> {navTarget.sourceDesc || 'Chi tiết tra cứu chuyên sâu'}
                  </span>
                  {navTarget.orderId && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold text-slate-900">
                      Đơn: {navTarget.orderId}
                    </span>
                  )}
                  {navTarget.contractId && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold text-slate-900">
                      HĐ: {navTarget.contractId}
                    </span>
                  )}
                  {navTarget.teamId && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold text-slate-900">
                      Tổ: {navTarget.teamId}
                    </span>
                  )}
                  {navTarget.clusterId && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold text-slate-900">
                      Cụm {navTarget.clusterId}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleClearNavTarget}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-800 bg-white hover:bg-slate-100 border border-amber-300 rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Xóa Bộ Lọc / Xem Toàn Bộ</span>
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <ExecutiveDashboard
                orders={orders}
                workcenters={workcenters}
                teams={teams}
                alerts={alerts}
                onNavigateTab={setActiveTab}
                onSelectOrder={setSelectedOrderModal}
                onNavigate={handleNavigate}
                initialSubView={navTarget?.subView}
              />
            )}

            {activeTab === 'orders' && (
              <OrderManagement
                orders={orders}
                currentRole={currentRole}
                onAddOrder={handleAddOrder}
                onUpdateOrder={handleUpdateOrder}
                onSelectOrder={setSelectedOrderModal}
                selectedOrderModal={selectedOrderModal}
                onCloseOrderModal={() => setSelectedOrderModal(null)}
                onNavigate={handleNavigate}
                initialMode={navTarget?.subView as any}
                initialOrderId={navTarget?.orderId}
                initialContractId={navTarget?.contractId}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'scheduling' && (
              <SmartScheduling
                orders={orders}
                materials={materials}
                workcenters={workcenters}
                currentRole={currentRole}
                onApproveWeeklyPlan={handleApproveWeeklyPlan}
                onApplyBatchGroups={handleApplyBatchGroups}
                onKittingOrder={handleKittingOrder}
                onNavigate={handleNavigate}
                initialClusterFilter={navTarget?.clusterId}
                initialTeamFilter={navTarget?.teamId}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'gantt' && (
              <ProductionGanttChart
                orders={orders}
                onSelectOrder={setSelectedOrderModal}
                onNavigate={handleNavigate}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'matrix' && (
              <ProductionMatrix
                orders={orders}
                teams={teams}
                currentRole={currentRole}
                onUpdateOrder={handleUpdateOrder}
                onTriggerDynamicReschedule={handleTriggerDynamicReschedule}
                onReportDefect={handleReportDefect}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'btp' && (
              <BTPManagement
                btpItems={btpItems}
                teams={teams}
                currentRole={currentRole}
                onUpdateBTPQuantity={handleUpdateBTPQuantity}
                onReallocateWorkers={handleReallocateWorkers}
                onNavigate={handleNavigate}
                initialOrderId={navTarget?.orderId}
                isReadOnly={isReadOnly}
                waitingBuffers={btpWaitingBuffers}
                onAcceptWaitingBTP={handleAcceptWaitingBTP}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertCenter
                alerts={alerts}
                orders={orders}
                teams={teams}
                currentRole={currentRole}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onNavigateTab={setActiveTab}
                onSelectOrder={setSelectedOrderModal}
                onNavigate={handleNavigate}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'roles' && (
              <UserRoleManagement
                users={users}
                teams={teams}
                currentRole={currentRole}
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                onUpdateStationAssignment={handleUpdateStationAssignment}
                onUpdateUserPermission={handleUpdateUserPermission}
                isReadOnly={isReadOnly}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">DCAR Coachbuilder Vietnam</span>
            <span aria-hidden="true">·</span>
            <span>Hệ Thống Quản Lý Sản Xuất Chế Tác Xe Limousine (MES)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Phiên bản v2.6.1</span>
            <span aria-hidden="true">·</span>
            <span>Dữ liệu: KHVT &amp; ĐỊNH BIÊN 2026</span>
          </div>
        </div>
      </footer>

      {/* Google Sheet 2-Way Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isSheetSyncOpen}
        onClose={() => setIsSheetSyncOpen(false)}
        orders={orders}
        dailySchedules={INITIAL_DAILY_SCHEDULES}
        teamCapacity={teamCapacity}
        cycleNorms={cycleNorms}
        onDataLoadedFromSheet={handleDataLoadedFromSheet}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
