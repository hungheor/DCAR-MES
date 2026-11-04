/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OrderItem,
  DailyScheduleItem,
  BTPInventoryItem,
  SystemAlert,
  TeamCapacityStaffing,
  StageCycleNorm,
} from '../types/mes';
import {
  INITIAL_TEAM_CAPACITY_STAFFING,
  INITIAL_STAGE_CYCLE_NORMS,
} from '../data/mockData';

export const DEFAULT_SHEET_API_URL =
  'https://script.google.com/macros/s/AKfycbxSxVgH_b0Lerx4p0fzOdAW8svAjnbevAe3TliSqFVSjgED3OvFC1PPbjd1Z97d14w7/exec';

const STORAGE_KEY_API_URL = 'dcar_mes_sheet_api_url';
const STORAGE_KEY_AUTO_SYNC = 'dcar_mes_sheet_auto_sync';
const STORAGE_KEY_LAST_SYNC = 'dcar_mes_sheet_last_sync';

export interface SheetSyncStatus {
  connected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastMessage: string;
  error: string | null;
  spreadsheetName?: string;
  counts?: {
    orders: number;
    teamCapacity: number;
    cycleNorms: number;
    dailySchedules: number;
    btpItems: number;
    defects: number;
  };
}

export function getStoredSheetApiUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_API_URL) || DEFAULT_SHEET_API_URL;
  } catch {
    return DEFAULT_SHEET_API_URL;
  }
}

export function saveSheetApiUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim());
  } catch {}
}

export function isAutoSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
    return val !== 'false'; // default true
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, String(enabled));
  } catch {}
}

/**
 * Gọi Google Apps Script với cơ chế fallback thông minh:
 * Thử qua GET (với url query) trước để tránh hoàn toàn CORS preflight trong trình duyệt,
 * nếu là lệnh có payload (POST) thì dùng fetch POST text/plain.
 */
async function callSheetApi(payload: any, customUrl?: string): Promise<any> {
  const baseUrl = customUrl || getStoredSheetApiUrl();

  // Với action đọc dữ liệu (getAll, ping), thử gọi GET trước
  if (payload.action === 'getAll' || payload.action === 'ping') {
    try {
      const getUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=${encodeURIComponent(
        payload.action
      )}&_t=${Date.now()}`;
      const getRes = await fetch(getUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (getRes.ok) {
        const text = await getRes.text();
        try {
          const json = JSON.parse(text);
          if (json && (json.success || json.data)) {
            return json;
          }
        } catch {}
      }
    } catch {
      // Fallback xuống POST bên dưới nếu GET gặp lỗi mạng
    }
  }

  // Phương thức POST với Content-Type text/plain để không sinh CORS preflight OPTIONS
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      if (text.includes('Script function not found') || text.includes('Google Apps Script')) {
        throw new Error(
          'Google Apps Script Web App cần cập nhật mã nguồn Code.gs (Đã tối ưu hỗ trợ doGet & doPost). Vui lòng copy code mẫu trong modal và Triển khai lại (New Deployment).'
        );
      }
      throw new Error(`Phản hồi từ Google Sheet: ${text.slice(0, 150)}...`);
    }
  } catch (err: any) {
    throw err;
  }
}

/**
 * Kiểm tra kết nối tới Google Apps Script
 */
export async function testSheetConnection(customUrl?: string): Promise<{
  success: boolean;
  message: string;
  spreadsheetName?: string;
}> {
  const url = customUrl || getStoredSheetApiUrl();
  try {
    const res = await callSheetApi({ action: 'ping' }, url);
    if (res && res.success) {
      return {
        success: true,
        message: 'Kết nối Google Sheet thành công! Sẵn sàng đồng bộ 2 chiều.',
        spreadsheetName: res.spreadsheetName || 'DCAR Limousine MES Sheet',
      };
    }
    return {
      success: false,
      message: res?.error || res?.message || 'Chưa nhận diện được cấu trúc Apps Script',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Không thể kết nối đến Web App URL.',
    };
  }
}

/**
 * Đọc toàn bộ dữ liệu từ Google Sheet về MES
 * Đã sửa lỗi: xử lý cả response từ doGet lẫn doPost, map chuẩn cột Tiếng Việt và Tiếng Anh
 */
export async function fetchSheetData(): Promise<{
  success: boolean;
  orders?: OrderItem[];
  teamCapacity?: TeamCapacityStaffing[];
  cycleNorms?: StageCycleNorm[];
  counts?: { orders: number; teamCapacity: number; cycleNorms: number; dailySchedules: number };
  raw?: any;
  error?: string;
}> {
  try {
    const res = await callSheetApi({ action: 'getAll' });
    if (!res) {
      return { success: false, error: 'Không nhận được dữ liệu từ Google Sheet' };
    }

    if (res.error) {
      return { success: false, error: res.error };
    }

    // 1. Phân giải đơn hàng
    const rawOrders = (res.data && res.data.orders) || (res.orders) || [];
    const mappedOrders: OrderItem[] = rawOrders.map((r: any) => {
      const orderId = String(r['Mã LSX'] || r.id || 'G2610099');
      const orderType = (r['Loại Đơn'] || r.orderType || (orderId.startsWith('N') ? 'N' : 'G')) as any;
      const btpStatus = (r['Trạng Thái BTP'] || r['Trạng Thái (N)'] || r.btpStatus || (orderType === 'N' ? 'IN_INVENTORY' : undefined)) as any;
      const fulfillmentType = (r['Hình Thức Thực Hiện'] || r.fulfillmentType || (orderType === 'G' ? 'NEW_PRODUCTION' : undefined)) as any;

      return {
        id: orderId,
        orderType,
        customerName: r['Tên Khách Hàng'] || r.customerName || 'Khách hàng DCAR VIP',
        contractRef: r['Số Hợp Đồng'] || r.contractRef || `HĐ-${orderId}`,
        contractId: r['Số Hợp Đồng'] || r.contractRef || `HĐ-${orderId}`,
        baseModel: r['Dòng Xe Cơ Sở'] || r.baseModel || 'Ford Transit 18c Premium',
        conversionVersion: r['Phiên Bản Độ'] || r.conversionVersion || 'Ford Thương Gia 11c (10 ghế VIP)',
        seatCapacity: Number(r['Số Ghế'] || r.seatCapacity || 11),
        exteriorColor: r['Màu Ngoại Thất'] || r.exteriorColor || 'Đen Ánh Kim',
        interiorColor: r['Màu Nội Thất'] || r.interiorColor || 'Da Bò Ý',
        options: r.options || [],
        receivedDate: r['Ngày Tiếp Nhận'] || r['Ngày Nhận Xe'] || r.receivedDate || '2026-10-28',
        dueDate: r['Hạn Giao Xe'] || r.dueDate || '2026-11-16',
        // Kế hoạch bắt đầu và kết thúc do TPSX thiết lập
        scheduledStartDate: r['Ngày KH Bắt Đầu'] || r['Kế Hoạch Bắt Đầu'] || r.scheduledStartDate || '2026-11-09',
        scheduledEndDate: r['Ngày KH Hoàn Thành'] || r['Kế Hoạch Hoàn Thành'] || r.scheduledEndDate || r['Hạn Giao Xe'] || '2026-11-23',
        status: (r['Trạng Thái'] || r.status || 'IN_PRODUCTION') as any,
        progress: Number(r['Tiến Độ %'] || r['Tiến Độ'] || r.progress || 0),
        currentDay: Number(r['Ngày Chuyền'] || r.currentDay || 1),
        currentCluster: (Number(r['Cụm Hiện Tại'] || r.currentCluster || 1)) as any,
        currentStepId: r['Bước Hiện Tại'] || r.currentStepId || 'S01',
        currentTeamId: r['Tổ Hiện Tại'] || r.currentTeamId || 'T01',
        currentStepName: r['Tên Bước'] || r.currentStepName || 'Cắt Laser & Phôi',
        priorityLevel: (r['Ưu Tiên'] || r.priorityLevel || 'P3_NORMAL') as any,
        scheduleHealth: (r['Sức Khỏe'] || r.scheduleHealth || 'ON_TRACK') as any,
        delayDays: Number(r['Số Ngày Trễ'] || r.delayDays || 0),
        standardLeadTimeDays: 14,
        actualLeadTimeDays: 0,
        mrpReady: String(r['MRP Sẵn Sàng']).toUpperCase() === 'YES' || r.mrpReady === true,
        crpFeasible: true,
        // BTP & Sales pairing
        fulfillmentType,
        pickedFromBtpOrderId: r['Mã BTP Được Gán'] || r.pickedFromBtpOrderId,
        pickedFromBtpOrderCode: r['Mã BTP Được Gán'] || r.pickedFromBtpOrderCode,
        btpStatus,
        allocatedToSalesOrderId: r['Đã Xuất Cho Đơn G'] || r.allocatedToSalesOrderId,
        allocatedToSalesOrderCode: r['Đã Xuất Cho Đơn G'] || r.allocatedToSalesOrderCode,
        allocatedDate: r['Ngày Xuất G'] || r.allocatedDate,
        notes: r['Ghi Chú'] || r.notes || '',
      };
    });

    // 2. Phân giải Bảng Năng Lực & Nhân Sự Tổ (NangLuc_NhanSu_To)
    const rawCapacity = (res.data && res.data.teamCapacity) || (res.teamCapacity) || [];
    const mappedCapacity: TeamCapacityStaffing[] = rawCapacity.length > 0
      ? rawCapacity.map((c: any) => ({
          teamId: c['Mã Tổ'] || c.teamId || 'T01',
          teamCode: c['Mã Code'] || c.teamCode || 'PHOI-CNC',
          teamName: c['Tên Tổ'] || c.teamName || '',
          clusterId: Number(c['Cụm'] || c.clusterId || 1) as any,
          headcount: Number(c['Số Nhân Sự'] || c.headcount || 4),
          leadCraftsman: c['Thợ Chính'] || c.leadCraftsman || '',
          assistantCraftsmen: Number(c['Thợ Phụ'] || c.assistantCraftsmen || 3),
          stdDailyCapacityVehicles: Number(c['Năng Lực Xe/Ngày'] || c.stdDailyCapacityVehicles || 2.5),
          stdHoursPerVehicle: Number(c['Giờ ĐM/Xe'] || c.stdHoursPerVehicle || 10),
          nominalEfficiencyRate: Number(c['Hiệu Suất Chuẩn %'] || c.nominalEfficiencyRate || 95),
          updatedAt: c['Cập Nhật Cuối'] || c.updatedAt || new Date().toLocaleString('vi-VN'),
          notes: c['Ghi Chú'] || c.notes || '',
        }))
      : INITIAL_TEAM_CAPACITY_STAFFING;

    // 3. Phân giải Bảng Định Mức Công Đoạn (DinhMuc_CongDoan)
    const rawNorms = (res.data && res.data.cycleNorms) || (res.cycleNorms) || [];
    const mappedNorms: StageCycleNorm[] = rawNorms.length > 0
      ? rawNorms.map((n: any, idx: number) => ({
          id: n['Mã Định Mức'] || n.id || `NORM-${String(idx + 1).padStart(2, '0')}`,
          vehicleModel: n['Dòng Xe'] || n.vehicleModel || 'Ford Thương Gia 11c (10 ghế VIP)',
          stepId: n['Mã Bước'] || n.stepId || `S${String(idx + 1).padStart(2, '0')}`,
          stepName: n['Tên Công Đoạn'] || n.stepName || '',
          teamId: n['Tổ Phụ Trách'] || n.teamId || 'T01',
          teamName: n['Tên Tổ'] || n.teamName || '',
          clusterId: Number(n['Cụm'] || n.clusterId || 1) as any,
          sequenceOrder: Number(n['Thứ Tự'] || n.sequenceOrder || idx + 1),
          standardHours: Number(n['Định Mức Giờ Công'] || n.standardHours || 16),
          dayStart: Number(n['Ngày Bắt Đầu Chuyền'] || n.dayStart || 1),
          dayEnd: Number(n['Ngày Kết Thúc Chuyền'] || n.dayEnd || 2),
          standardLeadDays: Number(n['Thời Lượng Chuẩn Ngày'] || n.standardLeadDays || 1.5),
          notes: n['Ghi Chú Kỹ Thuật'] || n.notes || '',
        }))
      : INITIAL_STAGE_CYCLE_NORMS;

    return {
      success: true,
      orders: mappedOrders,
      teamCapacity: mappedCapacity,
      cycleNorms: mappedNorms,
      counts: {
        orders: mappedOrders.length,
        teamCapacity: mappedCapacity.length,
        cycleNorms: mappedNorms.length,
        dailySchedules: (res.counts && res.counts.dailySchedules) || 0,
      },
      raw: res.data,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Ghi cập nhật đơn hàng lên Google Sheet
 */
export async function updateOrderInSheet(order: OrderItem): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'updateOrder', order });
    return !!res?.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Update order failed:', err);
    return false;
  }
}

/**
 * Ghi đơn hàng mới lên Google Sheet
 */
export async function pushOrderToSheet(order: OrderItem): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'createOrder', order });
    return !!res?.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Push order failed:', err);
    return false;
  }
}

/**
 * Ghi nhận lỗi KCS lên Google Sheet
 */
export async function pushDefectToSheet(defect: {
  id?: string;
  orderId: string;
  teamId: string;
  teamName: string;
  issueDescription: string;
  severity: string;
  reworkHours?: number;
  estimatedCostVND?: number;
  timestamp?: string;
  resolved?: boolean;
}): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'reportDefect', defect });
    return !!res?.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Push defect failed:', err);
    return false;
  }
}

/**
 * Gửi lệnh khởi tạo cấu trúc 5 bảng dữ liệu hoàn chỉnh lên Google Sheet
 */
export async function initGoogleSheetStructure(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callSheetApi({
      action: 'init',
      payload: {
        teamCapacity: INITIAL_TEAM_CAPACITY_STAFFING,
        cycleNorms: INITIAL_STAGE_CYCLE_NORMS,
      },
    });
    if (res && res.success) {
      return { success: true, message: res.message || 'Đã khởi tạo thành công 5 bảng dữ liệu trên Google Sheet!' };
    }
    return { success: false, message: res?.error || 'Không thể khởi tạo bảng trên Google Sheet.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Gửi toàn bộ dữ liệu mẫu lên Google Sheet (Cả 3 bảng Orders, Năng Lực Tổ, Định Mức)
 */
export async function pushAllDataToSheet(payload: {
  orders: OrderItem[];
  teamCapacity?: TeamCapacityStaffing[];
  cycleNorms?: StageCycleNorm[];
  dailySchedules?: DailyScheduleItem[];
}): Promise<boolean> {
  try {
    const res = await callSheetApi({
      action: 'syncAll',
      payload: {
        orders: payload.orders,
        teamCapacity: payload.teamCapacity || INITIAL_TEAM_CAPACITY_STAFFING,
        cycleNorms: payload.cycleNorms || INITIAL_STAGE_CYCLE_NORMS,
        dailySchedules: payload.dailySchedules,
      },
    });
    return !!res?.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Sync all failed:', err);
    return false;
  }
}

// ============================================================================
// HỖ TRỢ EXPORT / IMPORT CSV & EXCEL TRỰC TIẾP (OFFLINE & BACKUP)
// ============================================================================

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateOrdersCsv(orders: OrderItem[]): string {
  const headers = [
    'Mã LSX',
    'Loại Đơn (G/N/T/B)',
    'Tên Khách Hàng',
    'Số Hợp Đồng',
    'Dòng Xe Cơ Sở',
    'Phiên Bản Độ',
    'Màu Ngoại Thất',
    'Màu Nội Thất',
    'Ngày Tiếp Nhận',
    'Hạn Giao Xe',
    'Ngày KH Bắt Đầu',
    'Ngày KH Hoàn Thành',
    'Trạng Thái',
    'Tiến Độ %',
    'Cụm Hiện Tại',
    'Tổ Hiện Tại',
    'Hình Thức Thực Hiện (G)',
    'Trạng Thái BTP (N)',
    'Mã BTP Được Gán',
    'Đã Xuất Cho Đơn G',
    'Ưu Tiên',
    'Sức Khỏe',
    'Số Ngày Trễ',
    'MRP Sẵn Sàng',
    'Ghi Chú',
  ];

  const rows = orders.map((o) => [
    `"${o.id}"`,
    `"${o.orderType}"`,
    `"${(o.customerName || '').replace(/"/g, '""')}"`,
    `"${o.contractRef || ''}"`,
    `"${o.baseModel || ''}"`,
    `"${o.conversionVersion || ''}"`,
    `"${o.exteriorColor || ''}"`,
    `"${o.interiorColor || ''}"`,
    `"${o.receivedDate || ''}"`,
    `"${o.dueDate || ''}"`,
    `"${o.scheduledStartDate || ''}"`,
    `"${o.scheduledEndDate || ''}"`,
    `"${o.status || ''}"`,
    `"${o.progress || 0}"`,
    `"${o.currentCluster || 1}"`,
    `"${o.currentTeamId || 'T01'}"`,
    `"${o.fulfillmentType || ''}"`,
    `"${o.btpStatus || ''}"`,
    `"${o.pickedFromBtpOrderId || ''}"`,
    `"${o.allocatedToSalesOrderId || ''}"`,
    `"${o.priorityLevel || 'P3_NORMAL'}"`,
    `"${o.scheduleHealth || 'ON_TRACK'}"`,
    `"${o.delayDays || 0}"`,
    `"${o.mrpReady ? 'YES' : 'NO'}"`,
    `"${(o.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function generateTeamCapacityCsv(teams: TeamCapacityStaffing[]): string {
  const headers = [
    'Mã Tổ',
    'Mã Code',
    'Tên Tổ',
    'Cụm',
    'Số Nhân Sự',
    'Thợ Chính Phụ Trách',
    'Số Thợ Phụ',
    'Năng Lực Xe/Ngày',
    'Giờ ĐM/Xe',
    'Hiệu Suất Chuẩn %',
    'Ghi Chú Nhiệm Vụ',
    'Cập Nhật Cuối',
  ];

  const rows = teams.map((t) => [
    `"${t.teamId}"`,
    `"${t.teamCode}"`,
    `"${(t.teamName || '').replace(/"/g, '""')}"`,
    `"${t.clusterId}"`,
    `"${t.headcount}"`,
    `"${(t.leadCraftsman || '').replace(/"/g, '""')}"`,
    `"${t.assistantCraftsmen}"`,
    `"${t.stdDailyCapacityVehicles}"`,
    `"${t.stdHoursPerVehicle}"`,
    `"${t.nominalEfficiencyRate}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    `"${t.updatedAt || new Date().toLocaleString('vi-VN')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function generateStageCycleNormsCsv(norms: StageCycleNorm[]): string {
  const headers = [
    'Mã Định Mức',
    'Dòng Xe Áp Dụng',
    'Mã Bước',
    'Tên Công Đoạn',
    'Mã Tổ',
    'Tên Tổ Phụ Trách',
    'Cụm',
    'Thứ Tự Chuyền',
    'Định Mức Giờ Công (h)',
    'Ngày Bắt Đầu Chuyền',
    'Ngày Kết Thúc Chuyền',
    'Thời Lượng Chuẩn (Ngày)',
    'Ghi Chú Kỹ Thuật',
  ];

  const rows = norms.map((n) => [
    `"${n.id}"`,
    `"${(n.vehicleModel || '').replace(/"/g, '""')}"`,
    `"${n.stepId}"`,
    `"${(n.stepName || '').replace(/"/g, '""')}"`,
    `"${n.teamId}"`,
    `"${(n.teamName || '').replace(/"/g, '""')}"`,
    `"${n.clusterId}"`,
    `"${n.sequenceOrder}"`,
    `"${n.standardHours}"`,
    `"${n.dayStart}"`,
    `"${n.dayEnd}"`,
    `"${n.standardLeadDays}"`,
    `"${(n.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
