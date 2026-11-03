/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrderItem, DailyScheduleItem, BTPInventoryItem, SystemAlert } from '../types/mes';

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
 * Gọi Google Apps Script qua POST text/plain để tránh CORS preflight
 */
async function callSheetApi(payload: any, customUrl?: string): Promise<any> {
  const url = customUrl || getStoredSheetApiUrl();
  try {
    const response = await fetch(url, {
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
      // Nếu Google Apps Script trả về HTML error (ví dụ doGet/doPost chưa có)
      if (text.includes('Script function not found') || text.includes('Google Apps Script')) {
        throw new Error(
          'Google Apps Script chưa triển khai hàm doGet/doPost. Hãy copy file Code.gs vào Apps Script và Triển Khai lại (Deploy as Web App).'
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
    // Thử gọi qua POST ping trước
    const res = await callSheetApi({ action: 'ping' }, url);
    if (res && res.success) {
      return {
        success: true,
        message: 'Kết nối Google Sheet thành công! Sẵn sàng đồng bộ 2 đầu.',
        spreadsheetName: res.spreadsheetName || 'DCAR Limousine MES Sheet',
      };
    }
    return {
      success: false,
      message: res.error || res.message || 'Chưa nhận diện được cấu trúc Apps Script',
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
 */
export async function fetchSheetData(): Promise<{
  success: boolean;
  orders?: OrderItem[];
  counts?: { orders: number; dailySchedules: number; btpItems: number; defects: number };
  raw?: any;
  error?: string;
}> {
  try {
    const res = await callSheetApi({ action: 'getAll' });
    if (!res.success) {
      return { success: false, error: res.error || 'Lỗi khi đọc Google Sheet' };
    }

    const rawOrders = (res.data && res.data.orders) || [];
    const mappedOrders: OrderItem[] = rawOrders.map((r: any) => ({
      id: r['Mã LSX'] || r.id,
      orderType: r['Loại Đơn'] || r.orderType || 'G',
      customerName: r['Tên Khách Hàng'] || r.customerName || '',
      contractRef: r['Số Hợp Đồng'] || r.contractRef || '',
      baseModel: r['Dòng Xe Cơ Sở'] || r.baseModel || 'Ford Transit 18c Premium',
      conversionVersion: r['Phiên Bản Độ'] || r.conversionVersion || '',
      seatCapacity: 11,
      exteriorColor: r['Màu Ngoại Thất'] || r.exteriorColor || 'Đen Ánh Kim',
      interiorColor: r['Màu Nội Thất'] || r.interiorColor || 'Da Bò Ý',
      options: [],
      receivedDate: r['Ngày Nhận Xe'] || r.receivedDate || '2026-11-02',
      dueDate: r['Hạn Giao Xe'] || r.dueDate || '2026-11-16',
      scheduledStartDate: r['Ngày Nhận Xe'] || '2026-11-02',
      scheduledEndDate: r['Hạn Giao Xe'] || '2026-11-16',
      status: r['Trạng Thái'] || r.status || 'IN_PRODUCTION',
      progress: Number(r['Tiến Độ %'] || r.progress || 0),
      currentDay: Number(r['Ngày Chuyền'] || r.currentDay || 1),
      currentCluster: Number(r['Cụm Hiện Tại'] || r.currentCluster || 1) as any,
      currentStepId: r['Bước Hiện Tại'] || r.currentStepId || 'S01',
      currentTeamId: r['Tổ Hiện Tại'] || r.currentTeamId || 'T01',
      currentStepName: r['Tên Bước'] || r.currentStepName || '',
      priorityLevel: r['Ưu Tiên'] || r.priorityLevel || 'P3_NORMAL',
      scheduleHealth: r['Sức Khỏe'] || r.scheduleHealth || 'ON_TRACK',
      delayDays: Number(r['Số Ngày Trễ'] || r.delayDays || 0),
      standardLeadTimeDays: 14,
      actualLeadTimeDays: 0,
      mrpReady: String(r['MRP Sẵn Sàng']).toUpperCase() === 'YES',
      crpFeasible: true,
      notes: r['Ghi Chú'] || r.notes || '',
    }));

    return {
      success: true,
      orders: mappedOrders,
      counts: res.counts,
      raw: res.data,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Ghi đơn hàng mới lên Google Sheet
 */
export async function pushOrderToSheet(order: OrderItem): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'createOrder', order });
    return !!res.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Push order failed:', err);
    return false;
  }
}

/**
 * Cập nhật đơn hàng trên Google Sheet
 */
export async function updateOrderInSheet(order: OrderItem): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'updateOrder', order });
    return !!res.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Update order failed:', err);
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
    return !!res.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Push defect failed:', err);
    return false;
  }
}

/**
 * Cập nhật lịch làm việc trạm lên Google Sheet
 */
export async function pushScheduleToSheet(scheduleItem: DailyScheduleItem): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'updateSchedule', scheduleItem });
    return !!res.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Push schedule failed:', err);
    return false;
  }
}

/**
 * Gửi lệnh khởi tạo cấu trúc 4 bảng dữ liệu lên Google Sheet
 */
export async function initGoogleSheetStructure(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callSheetApi({ action: 'init' });
    if (res.success) {
      return { success: true, message: res.message || 'Đã khởi tạo thành công trên Google Sheet!' };
    }
    return { success: false, message: res.error || 'Không thể khởi tạo bảng.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Gửi toàn bộ dữ liệu mẫu lên Google Sheet
 */
export async function pushAllDataToSheet(payload: {
  orders: OrderItem[];
  dailySchedules?: DailyScheduleItem[];
}): Promise<boolean> {
  try {
    const res = await callSheetApi({ action: 'syncAll', payload });
    return !!res.success;
  } catch (err) {
    console.warn('[GoogleSheetSync] Sync all failed:', err);
    return false;
  }
}
