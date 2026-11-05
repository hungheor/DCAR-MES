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

    // Helper chuẩn hóa ngày từ Google Sheets (hỗ trợ DD/MM/YYYY, ISO, tiếng Việt)
    const normalizeDateStr = (raw: any, fallback: string): string => {
      if (!raw) return fallback;
      const str = String(raw).trim();
      if (!str) return fallback;
      const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (m) {
        const d = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10);
        const y = parseInt(m[3], 10);
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        try {
          return parsed.toISOString().split('T')[0];
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

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
        receivedDate: normalizeDateStr(r['Ngày Tiếp Nhận'] || r['Ngày Nhận Xe'] || r.receivedDate, '2026-10-28'),
        dueDate: normalizeDateStr(r['Hạn Giao Xe'] || r.dueDate, '2026-11-16'),
        // Kế hoạch bắt đầu và kết thúc do TPSX thiết lập
        scheduledStartDate: normalizeDateStr(r['Ngày KH Bắt Đầu'] || r['Kế Hoạch Bắt Đầu'] || r.scheduledStartDate, '2026-11-09'),
        scheduledEndDate: normalizeDateStr(r['Ngày KH Hoàn Thành'] || r['Kế Hoạch Hoàn Thành'] || r.scheduledEndDate || r['Hạn Giao Xe'], '2026-11-23'),
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
        // Sản xuất song song tại các tổ
        activeTeamIds: r['Các Tổ Đang SX Đồng Thời']
          ? String(r['Các Tổ Đang SX Đồng Thời']).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
          : (r.activeTeamIds || [r['Tổ Hiện Tại'] || r.currentTeamId || 'T01']),
        // Trạng thái treo đơn
        holdReason: r['Lý Do Treo Đơn'] || r.holdReason,
        holdDate: r['Ngày Bắt Đầu Treo'] || r.holdDate,
        // Kho lưu trữ đơn hoàn thành
        archivedToExcel: r['Đã Lưu Trữ Excel'] === 'YES' || r.archivedToExcel === true,
        archivedDate: r['Ngày Lưu Trữ'] || r.archivedDate,
        completedDate: r['Ngày Nghiệm Thu Hoàn Thành'] || r.completedDate,
        vinNumber: r['Số Khung (VIN)'] || r.vinNumber,
        contactPerson: r['Người Liên Hệ'] || r.contactPerson,
        contactPhone: r['Số Điện Thoại'] || r.contactPhone,
        deliveryLocation: r['Địa Điểm Giao Xe'] || r.deliveryLocation,
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
    'Các Tổ Đang SX Đồng Thời',
    'Lý Do Treo Đơn',
    'Ngày Bắt Đầu Treo',
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
    `"${(o.activeTeamIds && o.activeTeamIds.length > 0 ? o.activeTeamIds : [o.currentTeamId || 'T01']).join('; ')}"`,
    `"${(o.holdReason || '').replace(/"/g, '""')}"`,
    `"${o.holdDate || ''}"`,
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

/**
 * Xuất bảng dữ liệu Kho Lưu Trữ Đơn Hoàn Thành (LuuTru_DonHoanThanh)
 */
export function generateCompletedOrdersCsv(orders: OrderItem[]): string {
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED' || o.archivedToExcel);
  const headers = [
    'Mã LSX',
    'Số Khung (VIN)',
    'Tên Khách Hàng',
    'Số Hợp Đồng',
    'Dòng Xe Cơ Sở',
    'Phiên Bản Độ',
    'Màu Ngoại Thất / Nội Thất',
    'Ngày Tiếp Nhận',
    'Ngày Nghiệm Thu Hoàn Thành',
    'KCS 120 Điểm',
    'Địa Điểm Bàn Giao Xe',
    'Người Nhận Xe',
    'Số Điện Thoại',
    'Ghi Chú Bàn Giao',
  ];

  const rows = (completedOrders.length > 0 ? completedOrders : orders.slice(0, 3)).map((o) => [
    `"${o.id}"`,
    `"${o.vinNumber || 'VN-DCAR2026-X' + o.id.slice(-4)}"`,
    `"${(o.customerName || '').replace(/"/g, '""')}"`,
    `"${o.contractRef || ''}"`,
    `"${o.baseModel || ''}"`,
    `"${o.conversionVersion || ''}"`,
    `"${o.exteriorColor || ''} / ${o.interiorColor || ''}"`,
    `"${o.receivedDate || ''}"`,
    `"${o.completedDate || o.dueDate || '2026-11-02'}"`,
    `"${o.inspection120Pass !== false ? 'ĐẠT 120/120 ĐIỂM (PASS)' : 'CHỜ KCS'}"`,
    `"${(o.deliveryLocation || 'Showroom DCAR TP.HCM').replace(/"/g, '""')}"`,
    `"${(o.contactPerson || o.customerName || '').replace(/"/g, '""')}"`,
    `"${o.contactPhone || '0908.123.456'}"`,
    `"${(o.notes || 'Nghiệm thu hoàn tất xuất xưởng theo tiêu chuẩn ISO').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Xuất bảng dữ liệu Tiến Độ 17 Tổ & Cụm Realtime (TheoDoi_TienDo_CacTo)
 */
export function generateTeamProgressCsv(
  orders: OrderItem[],
  teams: TeamCapacityStaffing[] = INITIAL_TEAM_CAPACITY_STAFFING
): string {
  const headers = [
    'Mã Tổ',
    'Tên Tổ Chế Tác',
    'Cụm',
    'Thợ Chính Phụ Trách',
    'Số Thợ',
    'Năng Lực Xe/Ngày',
    'Các Đơn Đang Làm Tại Tổ (Song Song)',
    'Số Xe Tại Trạm',
    'Trạng Thái Trạm',
    'Cập Nhật Lúc',
  ];

  const rows = teams.map((t) => {
    // Find active orders where activeTeamIds includes t.teamId or currentTeamId === t.teamId
    const currentOrders = orders.filter(
      (o) =>
        o.status !== 'COMPLETED' &&
        ((o.activeTeamIds && o.activeTeamIds.includes(t.teamId)) || o.currentTeamId === t.teamId)
    );
    const orderCodes = currentOrders.map((o) => o.id).join('; ') || 'Không có xe';
    const isOverload = currentOrders.length > t.stdDailyCapacityVehicles * 1.5;
    const statusText = isOverload ? 'QUÁ TẢI (NGHẼN)' : currentOrders.length === 0 ? 'CHỜ VIỆC' : 'HOẠT ĐỘNG TỐT';

    return [
      `"${t.teamId}"`,
      `"${(t.teamName || '').replace(/"/g, '""')}"`,
      `"${t.clusterId}"`,
      `"${(t.leadCraftsman || '').replace(/"/g, '""')}"`,
      `"${t.headcount}"`,
      `"${t.stdDailyCapacityVehicles}"`,
      `"${orderCodes}"`,
      `"${currentOrders.length}"`,
      `"${statusText}"`,
      `"${new Date().toLocaleString('vi-VN')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Lưu trữ đơn hàng hoàn thành vào bảng LuuTru_DonHoanThanh trên Google Sheet
 */
export async function archiveCompletedOrderToSheet(order: OrderItem): Promise<boolean> {
  try {
    const res = await callSheetApi({
      action: 'archiveOrder',
      order: {
        ...order,
        status: 'COMPLETED',
        archivedToExcel: true,
        completedDate: order.completedDate || new Date().toISOString().slice(0, 10),
      },
    });
    return !!res?.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Archive order failed:', err);
    return false;
  }
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

/**
 * Sơ đồ luồng kết nối 17 Tổ theo Lưu Đồ Xe Nhỏ Ford Transit & Solati
 */
export const FLOW_CONNECTIONS: Record<string, { inputs: string; outputs: string; role: string; targets: string[] }> = {
  T01: {
    role: 'Đầu Vào (Đỏ)',
    inputs: 'Xe cơ sở Transit / Solati mới nhận',
    outputs: 'T02 (Cơ Khí), T11 (Dán Phim), T15 (Lắp Ráp Hoàn Thiện)',
    targets: ['T02', 'T11', 'T15'],
  },
  T02: {
    role: 'Đầu Vào (Đỏ)',
    inputs: 'T01 (Tháo Đồ)',
    outputs: 'T08 (Mousse - Dựa Ngồi), T13 & T14 (Khung chân ghế), T14 & T15 (Khung trần)',
    targets: ['T08', 'T13', 'T14', 'T15'],
  },
  T03: {
    role: 'Đầu Vào (Đỏ)',
    inputs: 'Gỗ tự nhiên & ván ép công nghiệp',
    outputs: 'T05 (Nhựa), T06 (CPS), T10 (Bọc dán)',
    targets: ['T05', 'T06', 'T10'],
  },
  T04: {
    role: 'Đầu Vào (Đỏ)',
    inputs: 'Cuộn da bò Ý, da công nghiệp VKC05',
    outputs: 'T07 (May), T10 (Bọc dán - Nhánh Nội Thất)',
    targets: ['T07', 'T10'],
  },
  T05: {
    role: 'Bán Thành Phẩm',
    inputs: 'T03 (Mộc)',
    outputs: 'T09 (Sơn ốp gỗ), T10 (Bọc dán), T15 (Lắp Hoàn Thiện)',
    targets: ['T09', 'T10', 'T15'],
  },
  T06: {
    role: 'Bán Thành Phẩm',
    inputs: 'T03 (Mộc)',
    outputs: 'T09 (Sơn ốp gỗ), T10 (Bọc dán)',
    targets: ['T09', 'T10'],
  },
  T07: {
    role: 'Bán Thành Phẩm',
    inputs: 'T04 (Cắt)',
    outputs: 'T13 (Lắp Ráp Ghế)',
    targets: ['T13'],
  },
  T08: {
    role: 'Bán Thành Phẩm',
    inputs: 'T02 (Cơ Khí - Nhánh Dựa Ngồi)',
    outputs: 'T13 (Lắp Ráp Ghế)',
    targets: ['T13'],
  },
  T09: {
    role: 'Bán Thành Phẩm',
    inputs: 'T05 (Nhựa), T06 (CPS)',
    outputs: 'T10 (Bọc dán), T13 (Lắp Ghế), T14 (Lắp Kỹ Thuật)',
    targets: ['T10', 'T13', 'T14'],
  },
  T10: {
    role: 'Bán Thành Phẩm',
    inputs: 'T04 (Nội thất), T05, T06, T09',
    outputs: 'T13 (Lắp Ghế), T14 (Lắp Kỹ Thuật), T15 (Lắp Hoàn Thiện)',
    targets: ['T13', 'T14', 'T15'],
  },
  T11: {
    role: 'Điện Phụ Trợ',
    inputs: 'T01 (Tháo Đồ)',
    outputs: 'T15 (Lắp Hoàn Thiện - Nhánh Dán Kính)',
    targets: ['T15'],
  },
  T12: {
    role: 'Điện Phụ Trợ',
    inputs: 'Dây điện chuyên dụng & tấm tản quang laser',
    outputs: 'T14 (Lắp Kỹ Thuật), T15 (Lắp Hoàn Thiện)',
    targets: ['T14', 'T15'],
  },
  T13: {
    role: 'Lắp Ráp Tổng Thành',
    inputs: 'T02 (Chân ghế), T07 (Áo may), T08 (Mút), T09 (Ốp gỗ), T10 (Bọc da)',
    outputs: 'T14 (Lắp Kỹ Thuật), T15 (Lắp Ráp Hoàn Thiện, Audio2)',
    targets: ['T14', 'T15'],
  },
  T14: {
    role: 'Lắp Ráp Tổng Thành',
    inputs: 'T02 (Khung trần & Chân ghế), T09, T10, T12, T13',
    outputs: 'T15 (Lắp Ráp Hoàn Thiện, Audio2)',
    targets: ['T15'],
  },
  T15: {
    role: 'Hội Tụ Trung Tâm',
    inputs: 'T01, T02 (Khung trần), T05, T10, T11 (Dán kính), T12, T13, T14',
    outputs: 'T16 (Vệ sinh)',
    targets: ['T16'],
  },
  T16: {
    role: 'Hoàn Thiện',
    inputs: 'T15 (Lắp Ráp Hoàn Thiện, Audio2)',
    outputs: 'T17 (Dán Tem)',
    targets: ['T17'],
  },
  T17: {
    role: 'Nghiệm Thu KCS',
    inputs: 'T16 (Vệ sinh)',
    outputs: 'Xuất xưởng bàn giao kinh doanh & Lưu trữ',
    targets: ['COMPLETED'],
  },
};

/**
 * Xuất dữ liệu bảng Thông Tin 17 Tổ theo Lưu Đồ Xe Nhỏ Ford Transit & Solati
 * Dùng làm cơ sở nạp vào Google Sheet để lấy dữ liệu và lưu trữ tiến độ sản xuất
 */
export function generateTeamsFlowCsv(
  orders: OrderItem[],
  teams: TeamCapacityStaffing[] = INITIAL_TEAM_CAPACITY_STAFFING
): string {

  const headers = [
    'Mã Tổ',
    'Tên Tổ (Lưu Đồ Ford/Solati)',
    'Vai Trò Trên Lưu Đồ',
    'Cụm Phân Nhóm',
    'Nguồn Đầu Vào (Inputs)',
    'Điểm Đến Đầu Ra (Outputs)',
    'Tổ Trưởng Phụ Trách',
    'Số Thợ',
    'Định Mức (Xe/Ngày)',
    'Giờ ĐM/Xe',
    'Số Xe Đang Gia Công (Active WIP)',
    'Danh Sách Đơn Tại Trạm',
    'Tình Trạng Tải',
    'Ghi Chú Kỹ Thuật Lưu Đồ',
  ];

  const rows = teams.map((t) => {
    const conn = FLOW_CONNECTIONS[t.teamId] || {
      role: 'Công đoạn sản xuất',
      inputs: 'Khởi tạo quy trình',
      outputs: 'Trạm tiếp theo',
    };

    const currentOrders = orders.filter(
      (o) =>
        o.status !== 'COMPLETED' &&
        ((o.activeTeamIds && o.activeTeamIds.includes(t.teamId)) || o.currentTeamId === t.teamId)
    );
    const orderCodes = currentOrders.map((o) => o.id).join('; ') || 'Không có xe';
    const isOverload = currentOrders.length > t.stdDailyCapacityVehicles * 1.5;
    const isBottleneck = ['T07', 'T10', 'T13', 'T15'].includes(t.teamId);
    const statusText = isOverload
      ? 'QUÁ TẢI (NGHẼN)'
      : isBottleneck
      ? 'TRẠM TRỌNG YẾU (TIÊU CHUẨN)'
      : currentOrders.length === 0
      ? 'CHỜ XE'
      : 'BÌNH THƯỜNG';

    return [
      `"${t.teamId}"`,
      `"${(t.teamName || '').replace(/"/g, '""')}"`,
      `"${conn.role}"`,
      `"Cụm ${t.clusterId}"`,
      `"${conn.inputs}"`,
      `"${conn.outputs}"`,
      `"${(t.leadCraftsman || '').replace(/"/g, '""')}"`,
      `"${t.headcount}"`,
      `"${t.stdDailyCapacityVehicles}"`,
      `"${t.stdHoursPerVehicle}"`,
      `"${currentOrders.length}"`,
      `"${orderCodes}"`,
      `"${statusText}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Khởi tạo bảng Thông Tin 17 Tổ Lưu Đồ Ford/Solati lên Google Sheet Web App
 */
export async function initGoogleSheetTeams(
  orders: OrderItem[],
  teams: TeamCapacityStaffing[] = INITIAL_TEAM_CAPACITY_STAFFING
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callSheetApi({
      action: 'initTeams17Flow',
      teams,
      orders: orders.filter((o) => o.status !== 'COMPLETED'),
      timestamp: new Date().toISOString(),
    });
    if (res && res.success) {
      return {
        success: true,
        message: 'Đã khởi tạo thành công cấu trúc 17 Tổ trên Google Sheet!',
      };
    }
    return {
      success: false,
      message: res?.message || 'Chưa ghi nhận được phản hồi từ Google Sheet.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi kết nối khi khởi tạo Google Sheet 17 Tổ.',
    };
  }
}
