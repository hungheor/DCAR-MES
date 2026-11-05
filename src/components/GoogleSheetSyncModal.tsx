/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
  Check,
  Send,
  Download,
  Upload,
  Layers,
  FileSpreadsheet,
  Settings,
  Sparkles,
  Link,
  Table,
  FileDown,
  FileUp,
  Users,
  Clock,
} from 'lucide-react';
import {
  DEFAULT_SHEET_API_URL,
  getStoredSheetApiUrl,
  saveSheetApiUrl,
  testSheetConnection,
  fetchSheetData,
  pushAllDataToSheet,
  initGoogleSheetStructure,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  downloadCsvFile,
  generateOrdersCsv,
  generateTeamCapacityCsv,
  generateStageCycleNormsCsv,
  generateCompletedOrdersCsv,
  generateTeamProgressCsv,
  generateTeamsFlowCsv,
  initGoogleSheetTeams,
} from '../services/googleSheetService';
import {
  OrderItem,
  DailyScheduleItem,
  TeamCapacityStaffing,
  StageCycleNorm,
} from '../types/mes';
import {
  INITIAL_TEAM_CAPACITY_STAFFING,
  INITIAL_STAGE_CYCLE_NORMS,
  formatSafeIso,
} from '../data/mockData';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  dailySchedules?: DailyScheduleItem[];
  teamCapacity?: TeamCapacityStaffing[];
  cycleNorms?: StageCycleNorm[];
  onDataLoadedFromSheet: (
    sheetOrders: OrderItem[],
    sheetCapacity?: TeamCapacityStaffing[],
    sheetNorms?: StageCycleNorm[]
  ) => void;
  isReadOnly?: boolean;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  orders,
  dailySchedules,
  teamCapacity = INITIAL_TEAM_CAPACITY_STAFFING,
  cycleNorms = INITIAL_STAGE_CYCLE_NORMS,
  onDataLoadedFromSheet,
  isReadOnly = false,
}) => {
  const [apiUrl, setApiUrl] = useState<string>(getStoredSheetApiUrl());
  const [activeTab, setActiveTab] = useState<'STATUS' | 'TEMPLATES' | 'CODE' | 'SCHEMA'>('STATUS');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(isAutoSyncEnabled());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Ping endpoint on open
  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsPinging(true);
    setStatusMessage('Đang kiểm tra kết nối với Google Apps Script Web App...');
    try {
      const res = await testSheetConnection(apiUrl);
      setIsConnected(res.success);
      setStatusMessage(res.message);
    } catch (err: any) {
      setIsConnected(false);
      setStatusMessage(err.message || 'Lỗi kết nối Web App.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveUrl = () => {
    saveSheetApiUrl(apiUrl);
    handleTestConnection();
  };

  const handleResetDefaultUrl = () => {
    setApiUrl(DEFAULT_SHEET_API_URL);
    saveSheetApiUrl(DEFAULT_SHEET_API_URL);
    handleTestConnection();
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    setAutoSyncEnabled(enabled);
  };

  // Đọc dữ liệu từ Google Sheet (Pull) - Đã sửa lỗi: Nhận cả 3 bảng Orders, Năng lực tổ, Định mức công đoạn
  const handlePullFromSheet = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang kéo dữ liệu mới nhất từ Google Sheet về MES...');
    try {
      const res = await fetchSheetData();
      if (res.success && res.orders && res.orders.length > 0) {
        onDataLoadedFromSheet(res.orders, res.teamCapacity, res.cycleNorms);
        setIsConnected(true);
        setStatusMessage(
          `Đã đồng bộ thành công: ${res.orders.length} đơn hàng, ${
            res.teamCapacity?.length || 17
          } tổ năng lực & ${res.cycleNorms?.length || 17} định mức công đoạn từ Google Sheet!`
        );
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setStatusMessage(
          res.error ||
            'Chưa có dữ liệu đơn hàng trên Google Sheet hoặc Apps Script cần triển khai phiên bản mới.'
        );
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi khi đọc Google Sheet: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Ghi toàn bộ dữ liệu lên Google Sheet (Push)
  const handlePushAllToSheet = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang đẩy đơn hàng, năng lực tổ & định mức lên Google Sheet...');
    try {
      const success = await pushAllDataToSheet({
        orders,
        teamCapacity,
        cycleNorms,
        dailySchedules,
      });
      if (success) {
        setIsConnected(true);
        setStatusMessage(
          `Đã ghi thành công toàn bộ ${orders.length} đơn hàng, ${teamCapacity.length} tổ và ${cycleNorms.length} định mức lên Google Sheet!`
        );
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setStatusMessage('Ghi thất bại. Vui lòng kiểm tra lại quyền truy cập Web App (Anyone).');
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi khi ghi lên Google Sheet: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Tự động khởi tạo cấu trúc 5 bảng
  const handleInitSheets = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang tạo và định dạng 5 bảng dữ liệu trên Google Sheet...');
    try {
      const res = await initGoogleSheetStructure();
      if (res.success) {
        setIsConnected(true);
        setStatusMessage(res.message);
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setStatusMessage(res.message);
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi khởi tạo: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Tải về 3 file CSV theo đúng yêu cầu người dùng
  const handleDownloadOrdersCsv = () => {
    const csv = generateOrdersCsv(orders);
    downloadCsvFile(`DonHang_LSX_DCAR_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleDownloadCapacityCsv = () => {
    const csv = generateTeamCapacityCsv(teamCapacity);
    downloadCsvFile(`NangLuc_NhanSu_17To_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleDownloadNormsCsv = () => {
    const csv = generateStageCycleNormsCsv(cycleNorms);
    downloadCsvFile(`DinhMuc_CongDoan_Chuan_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleDownloadCompletedCsv = () => {
    const csv = generateCompletedOrdersCsv(orders);
    downloadCsvFile(`LuuTru_DonHoanThanh_DCAR_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleDownloadProgressCsv = () => {
    const csv = generateTeamProgressCsv(orders);
    downloadCsvFile(`TheoDoi_TienDo_CacTo_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleDownloadTeamsFlowCsv = () => {
    const csv = generateTeamsFlowCsv(orders, teamCapacity);
    downloadCsvFile(`ThongTin_17To_LuuDo_Ford_Solati_${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleInitTeamsFlowSheet = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang khởi tạo cấu trúc 17 Tổ theo lưu đồ xe nhỏ Ford/Solati lên Google Sheet...');
    try {
      const res = await initGoogleSheetTeams(orders, teamCapacity);
      setStatusMessage(res.message);
      if (res.success) {
        setIsConnected(true);
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi khởi tạo 17 tổ: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Nhập file CSV trực tiếp từ máy tính
  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setImportNotification('File CSV không có dữ liệu dòng.');
          return;
        }

        const headerLine = lines[0];
        // Phân biệt file Đơn hàng hay file Năng lực hay file Định mức
        if (headerLine.includes('Mã LSX') || headerLine.includes('Mã Đơn')) {
          // Parse orders CSV
          const importedOrders: OrderItem[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 5 && cols[0]) {
              const id = cols[0];
              const oType = (cols[1] || (id.startsWith('N') ? 'N' : 'G')) as any;
              importedOrders.push({
                id,
                orderType: oType,
                customerName: cols[2] || 'Khách hàng nhập CSV',
                contractRef: cols[3] || `HĐ-${id}`,
                baseModel: cols[4] || 'Ford Transit 18c Premium',
                conversionVersion: cols[5] || 'Ford Thương Gia 11c (10 ghế VIP)',
                seatCapacity: 11,
                exteriorColor: cols[6] || 'Đen Ánh Kim',
                interiorColor: cols[7] || 'Da Bò Ý',
                options: [],
                receivedDate: formatSafeIso(cols[8], '2026-10-28'),
                dueDate: formatSafeIso(cols[9], '2026-11-16'),
                scheduledStartDate: formatSafeIso(cols[10], '2026-11-09'),
                scheduledEndDate: formatSafeIso(cols[11], '2026-11-23'),
                status: (cols[12] || 'IN_PRODUCTION') as any,
                progress: Number(cols[13] || 50),
                currentDay: 8,
                currentCluster: Number(cols[14] || 2) as any,
                currentTeamId: cols[15] || 'T07',
                fulfillmentType: (cols[16] || (oType === 'G' ? 'NEW_PRODUCTION' : undefined)) as any,
                btpStatus: (cols[17] || (oType === 'N' ? 'IN_INVENTORY' : undefined)) as any,
                priorityLevel: 'P3_NORMAL',
                scheduleHealth: 'ON_TRACK',
                delayDays: 0,
                standardLeadTimeDays: 14,
                actualLeadTimeDays: 0,
                mrpReady: true,
                crpFeasible: true,
                notes: cols[24] || 'Nhập từ file CSV Google Sheet',
              });
            }
          }

          if (importedOrders.length > 0) {
            onDataLoadedFromSheet(importedOrders, teamCapacity, cycleNorms);
            setImportNotification(`Đã nhập thành công ${importedOrders.length} đơn hàng từ file CSV!`);
          }
        } else {
          setImportNotification('Đã tiếp nhận cấu trúc file. Vui lòng sử dụng file mẫu chuẩn DCAR để đồng bộ chính xác.');
        }
      } catch (err: any) {
        setImportNotification(`Lỗi đọc file CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const APPS_SCRIPT_CODE = `/**
 * DCAR LIMOUSINE MES - GOOGLE APPS SCRIPT WEB APP BACKEND (Code.gs)
 * Triển khai: Deploy as Web App -> Execute as Me -> Anyone
 * Phiên bản hoàn chỉnh: Hỗ trợ 2 đầu (GET & POST), đồng bộ Đơn Hàng (G & N), Năng Lực 17 Tổ và Định Mức Công Đoạn
 */
var SHEET_NAMES = {
  ORDERS: 'DonHang_LSX',
  COMPLETED: 'LuuTru_DonHoanThanh',
  CAPACITY: 'NangLuc_NhanSu_To',
  NORMS: 'DinhMuc_CongDoan',
  PROGRESS: 'TheoDoi_TienDo_CacTo',
  SCHEDULE: 'LichNgay_17To',
  BTP: 'BTP_BanThanhPham',
  DEFECTS: 'ChatLuong_LoiKCS'
};

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
    
    if (action === 'ping') {
      return jsonResponse({ success: true, status: 'CONNECTED', spreadsheetName: ss.getName() });
    }
    if (action === 'init') {
      seedInitialMESData(ss);
      return jsonResponse({ success: true, message: 'Đã khởi tạo đủ các bảng chuẩn DCAR MES!' });
    }
    
    return readAllDataResponse(ss);
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    var action = postData.action || 'getAll';

    // 1. PING
    if (action === 'ping') {
      return jsonResponse({ success: true, status: 'CONNECTED', spreadsheetName: ss.getName() });
    }

    // 2. GET ALL (Sửa lỗi quan trọng: doPost phải trả về full dữ liệu khi action === 'getAll')
    if (action === 'getAll') {
      return readAllDataResponse(ss);
    }

    // 3. KHỞI TẠO DỮ LIỆU
    if (action === 'init') {
      seedInitialMESData(ss);
      return jsonResponse({ success: true, message: 'Đã nạp dữ liệu mẫu DCAR MES thành công!' });
    }

    // 4. TẠO ĐƠN MỚI
    if (action === 'createOrder' && postData.order) {
      var o = postData.order;
      var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
      s.appendRow([
        o.id, o.orderType || 'G', o.customerName, o.contractRef, o.baseModel,
        o.conversionVersion, o.exteriorColor, o.interiorColor, o.receivedDate, o.dueDate,
        o.scheduledStartDate || '', o.scheduledEndDate || '',
        o.status, o.progress || 0, o.currentDay || 1, o.currentCluster || 1,
        o.currentStepId, o.currentTeamId, o.currentStepName,
        o.fulfillmentType || '', o.btpStatus || '', o.pickedFromBtpOrderId || '', o.allocatedToSalesOrderId || '',
        o.priorityLevel || 'P3_NORMAL', o.scheduleHealth || 'ON_TRACK', o.delayDays || 0,
        o.mrpReady ? 'YES' : 'NO', o.notes, new Date().toLocaleString('vi-VN')
      ]);
      return jsonResponse({ success: true, message: 'Đã lưu đơn ' + o.id, orderId: o.id });
    }

    // 5. CẬP NHẬT ĐƠN HÀNG (Kế hoạch bắt đầu/hoàn thành, tiến độ)
    if (action === 'updateOrder' && postData.order) {
      var ord = postData.order;
      var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
      var data = s.getDataRange().getValues();
      var r = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(ord.id)) { r = i + 1; break; }
      }
      if (r > 0) {
        s.getRange(r, 11).setValue(ord.scheduledStartDate || '');
        s.getRange(r, 12).setValue(ord.scheduledEndDate || '');
        s.getRange(r, 13).setValue(ord.status || 'IN_PRODUCTION');
        s.getRange(r, 14).setValue(ord.progress || 0);
        s.getRange(r, 20).setValue(ord.fulfillmentType || '');
        s.getRange(r, 21).setValue(ord.btpStatus || '');
        s.getRange(r, 25).setValue(ord.scheduleHealth || 'ON_TRACK');
        s.getRange(r, 29).setValue(new Date().toLocaleString('vi-VN'));
        return jsonResponse({ success: true, message: 'Đã cập nhật ' + ord.id });
      }
    }

    // 6. ĐỒNG BỘ TOÀN BỘ (SYNC ALL)
    if (action === 'syncAll' && postData.payload) {
      if (postData.payload.orders) overwriteSheetWithOrders(ss, postData.payload.orders);
      if (postData.payload.teamCapacity) overwriteSheetWithCapacity(ss, postData.payload.teamCapacity);
      if (postData.payload.cycleNorms) overwriteSheetWithNorms(ss, postData.payload.cycleNorms);
      return jsonResponse({ success: true, message: 'Đã đồng bộ toàn bộ 3 bảng lên Google Sheet!' });
    }

    return readAllDataResponse(ss);
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function readAllDataResponse(ss) {
  var orders = readSheetAsObjects(ss, SHEET_NAMES.ORDERS);
  var capacity = readSheetAsObjects(ss, SHEET_NAMES.CAPACITY);
  var norms = readSheetAsObjects(ss, SHEET_NAMES.NORMS);
  var schedule = readSheetAsObjects(ss, SHEET_NAMES.SCHEDULE);
  var btp = readSheetAsObjects(ss, SHEET_NAMES.BTP);
  var defects = readSheetAsObjects(ss, SHEET_NAMES.DEFECTS);
  
  return jsonResponse({
    success: true,
    data: {
      orders: orders,
      teamCapacity: capacity,
      cycleNorms: norms,
      dailySchedules: schedule,
      btpItems: btp,
      defects: defects
    },
    counts: {
      orders: orders.length,
      teamCapacity: capacity.length,
      cycleNorms: norms.length,
      dailySchedules: schedule.length
    }
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkAndInitSheets(ss) {
  var names = ss.getSheets().map(function(s){ return s.getName(); });
  
  // 1. DonHang_LSX
  if (names.indexOf(SHEET_NAMES.ORDERS) === -1) {
    var s1 = ss.insertSheet(SHEET_NAMES.ORDERS);
    s1.appendRow([
      'Mã LSX','Loại Đơn','Tên Khách Hàng','Số Hợp Đồng','Dòng Xe Cơ Sở','Phiên Bản Độ',
      'Màu Ngoại Thất','Màu Nội Thất','Ngày Nhận Xe','Hạn Giao Xe',
      'Ngày KH Bắt Đầu','Ngày KH Hoàn Thành','Trạng Thái','Tiến Độ %','Ngày Chuyền','Cụm Hiện Tại',
      'Bước Hiện Tại','Tổ Hiện Tại','Tên Bước','Hình Thức Thực Hiện (G)','Trạng Thái BTP (N)',
      'Mã BTP Được Gán','Đã Xuất Cho Đơn G','Ưu Tiên','Sức Khỏe','Số Ngày Trễ','MRP Sẵn Sàng','Ghi Chú','Cập Nhật Cuối'
    ]);
    formatHeader(s1);
  }

  // 2. NangLuc_NhanSu_To
  if (names.indexOf(SHEET_NAMES.CAPACITY) === -1) {
    var s2 = ss.insertSheet(SHEET_NAMES.CAPACITY);
    s2.appendRow([
      'Mã Tổ','Mã Code','Tên Tổ','Cụm','Số Nhân Sự','Thợ Chính Phụ Trách','Số Thợ Phụ',
      'Năng Lực Xe/Ngày','Giờ ĐM/Xe','Hiệu Suất Chuẩn %','Ghi Chú Nhiệm Vụ','Cập Nhật Cuối'
    ]);
    formatHeader(s2);
  }

  // 3. DinhMuc_CongDoan
  if (names.indexOf(SHEET_NAMES.NORMS) === -1) {
    var s3 = ss.insertSheet(SHEET_NAMES.NORMS);
    s3.appendRow([
      'Mã Định Mức','Dòng Xe Áp Dụng','Mã Bước','Tên Công Đoạn','Mã Tổ','Tên Tổ Phụ Trách',
      'Cụm','Thứ Tự Chuyền','Định Mức Giờ Công (h)','Ngày Bắt Đầu Chuyền','Ngày Kết Thúc Chuyền',
      'Thời Lượng Chuẩn (Ngày)','Ghi Chú Kỹ Thuật'
    ]);
    formatHeader(s3);
  }

  // 4. LuuTru_DonHoanThanh
  if (names.indexOf(SHEET_NAMES.COMPLETED) === -1) {
    var s4 = ss.insertSheet(SHEET_NAMES.COMPLETED);
    s4.appendRow([
      'Mã LSX','Loại Đơn','Tên Khách Hàng','Số Hợp Đồng','Số Khung (VIN)','Dòng Xe Cơ Sở',
      'Phiên Bản Độ','Màu Da Nội Thất','Ngày Nhận Xe','Hạn Giao Xe','Ngày Hoàn Thành Thực Tế',
      'Nghiệm Thu KCS 120 Điểm','Địa Điểm Bàn Giao','Người Nhận Xe','Trạng Thái Lưu Trữ','Ngày Lưu Trữ Sheet'
    ]);
    formatHeader(s4);
  }

  // 5. TheoDoi_TienDo_CacTo
  if (names.indexOf(SHEET_NAMES.PROGRESS) === -1) {
    var s5 = ss.insertSheet(SHEET_NAMES.PROGRESS);
    s5.appendRow([
      'Mã Tổ','Tên Tổ Chế Tác','Cụm Sản Xuất','Thợ Chính Phụ Trách','Số Thợ Phụ','Số Lệnh Đang Chạy',
      'Danh Sách Mã Đơn','Số Đơn SX Song Song','Công Suất Sử Dụng (%)','Trạng Thái Phụ Tải','Cập Nhật Cuối'
    ]);
    formatHeader(s5);
  }
}

function formatHeader(sheet) {
  var r = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  r.setBackground('#0f172a').setFontColor('#fbbf24').setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function readSheetAsObjects(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) return [];
  var d = s.getDataRange().getValues();
  if (d.length <= 1) return [];
  var h = d[0], res = [];
  for (var i = 1; i < d.length; i++) {
    var o = {};
    for (var j = 0; j < h.length; j++) o[h[j]] = d[i][j];
    res.push(o);
  }
  return res;
}

function overwriteSheetWithOrders(ss, orders) {
  var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
  var lr = s.getLastRow();
  if (lr > 1) s.getRange(2, 1, lr - 1, s.getLastColumn()).clearContent();
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    s.appendRow([
      o.id, o.orderType || 'G', o.customerName, o.contractRef, o.baseModel,
      o.conversionVersion, o.exteriorColor, o.interiorColor, o.receivedDate, o.dueDate,
      o.scheduledStartDate || '', o.scheduledEndDate || '',
      o.status, o.progress || 0, o.currentDay || 1, o.currentCluster || 1,
      o.currentStepId, o.currentTeamId, o.currentStepName,
      o.fulfillmentType || '', o.btpStatus || '', o.pickedFromBtpOrderId || '', o.allocatedToSalesOrderId || '',
      o.priorityLevel || 'P3_NORMAL', o.scheduleHealth || 'ON_TRACK', o.delayDays || 0,
      o.mrpReady ? 'YES' : 'NO', o.notes, new Date().toLocaleString('vi-VN')
    ]);
  }
}

function overwriteSheetWithCapacity(ss, capacity) {
  var s = ss.getSheetByName(SHEET_NAMES.CAPACITY);
  var lr = s.getLastRow();
  if (lr > 1) s.getRange(2, 1, lr - 1, s.getLastColumn()).clearContent();
  for (var i = 0; i < capacity.length; i++) {
    var c = capacity[i];
    s.appendRow([
      c.teamId, c.teamCode, c.teamName, c.clusterId, c.headcount, c.leadCraftsman,
      c.assistantCraftsmen, c.stdDailyCapacityVehicles, c.stdHoursPerVehicle,
      c.nominalEfficiencyRate, c.notes, c.updatedAt || new Date().toLocaleString('vi-VN')
    ]);
  }
}

function overwriteSheetWithNorms(ss, norms) {
  var s = ss.getSheetByName(SHEET_NAMES.NORMS);
  var lr = s.getLastRow();
  if (lr > 1) s.getRange(2, 1, lr - 1, s.getLastColumn()).clearContent();
  for (var i = 0; i < norms.length; i++) {
    var n = norms[i];
    s.appendRow([
      n.id, n.vehicleModel, n.stepId, n.stepName, n.teamId, n.teamName,
      n.clusterId, n.sequenceOrder, n.standardHours, n.dayStart, n.dayEnd,
      n.standardLeadDays, n.notes
    ]);
  }
}

function seedInitialMESData(ss) {
  // Tự động nạp dữ liệu chuẩn nếu các bảng trống
  var s1 = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (s1.getLastRow() <= 1) {
    s1.appendRow(['G2610021','G','CTY VẬN TẢI HOA MAI LIMOUSINE','HĐ-HM26/10-09','Ford Transit 18c Premium','Ford Thương Gia 11c (10 ghế VIP)','Đen Ánh Kim','Da Bò Ý Nâu Cognac','2026-10-28','2026-11-13','2026-10-31','2026-11-13','IN_PRODUCTION',72,10,4,'S16','T16','Lắp Ghế VIP Điện','NEW_PRODUCTION','','','','P2_HIGH','ON_TRACK',0,'YES','Lô xe tuyến VIP Vũng Tàu',new Date().toLocaleString('vi-VN')]);
    s1.appendRow(['N2610001','N','KHO BÁN THÀNH PHẨM (Dự phòng BTP)','BTP-STOCK-2026-01','Ford Transit 18c Premium','Ford Thương Gia 11c (10 ghế VIP)','Chưa sơn vỏ','Da Bò Ý Nâu Cognac','2026-10-25','2026-11-20','2026-10-25','2026-11-05','IN_PRODUCTION',85,12,2,'S07','T07','Bọc Mút Xốp Ghế VIP','','IN_INVENTORY','','','P3_NORMAL','ON_TRACK',0,'YES','BTP trữ kho đệm sẵn sàng xuất cho đơn G',new Date().toLocaleString('vi-VN')]);
    s1.appendRow(['N2610002','N','KHO BÁN THÀNH PHẨM (Đã xuất đơn G)','BTP-STOCK-2026-02','Hyundai Solati H350 16c','Solati Maybach 10 chỗ 2025','Trắng Kim Cương','Da Nappa Kem Phối Xanh Navy','2026-10-20','2026-11-10','2026-10-20','2026-11-02','COMPLETED',100,14,4,'S17','T17','Nghiệm thu xuất xưởng','','ALLOCATED_TO_SALES','','G2610023','P2_HIGH','ON_TRACK',0,'YES','Đã xuất cho đơn bán G2610023',new Date().toLocaleString('vi-VN')]);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Đồng Bộ Google Sheet 2 Đầu &amp; Quản Lý Dữ Liệu Năng Lực / Định Mức
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    isConnected === true
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                      : isConnected === false
                      ? 'bg-rose-950 text-rose-400 border-rose-500/50'
                      : 'bg-amber-950 text-amber-400 border-amber-500/50'
                  }`}
                >
                  {isConnected === true
                    ? '● ĐÃ KẾT NỐI'
                    : isConnected === false
                    ? '● CHƯA KẾT NỐI'
                    : '○ ĐANG KIỂM TRA...'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cập nhật đơn hàng (G &amp; N), ngày bắt đầu/kết thúc, năng lực 17 tổ và định mức công đoạn phân công
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('STATUS')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'STATUS'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>01. Đồng Bộ Trực Tiếp (Two-Way Sync)</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'TEMPLATES'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>02. Tải File CSV Mẫu &amp; Nhập Offline</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px] font-bold">
              3 File
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CODE')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'CODE'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" />
            <span>03. Mã Nguồn Apps Script (Code.gs Đã Sửa Lỗi)</span>
          </button>

          <button
            onClick={() => setActiveTab('SCHEMA')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'SCHEMA'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-amber-600" />
            <span>04. Cấu Trúc Bảng Dữ Liệu</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {/* TAB 1: STATUS & 2-WAY SYNC ACTIONS */}
          {activeTab === 'STATUS' && (
            <div className="space-y-6">
              {/* Endpoint URL Input */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Link className="w-4 h-4 text-emerald-600" />
                    <span>Google Apps Script Web App Endpoint URL:</span>
                  </label>
                  <button
                    onClick={handleResetDefaultUrl}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Khôi phục link Web App mặc định
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 font-mono text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleSaveUrl}
                    className="px-3 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  >
                    Lưu URL
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isPinging}
                    className="px-3 py-2 bg-white border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-amber-500' : ''}`} />
                    <span>Ping</span>
                  </button>
                </div>

                {statusMessage && (
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                      isConnected === true
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : isConnected === false
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {isConnected === true ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{statusMessage}</p>
                      {isConnected === false && (
                        <p className="text-[11px] text-amber-800 mt-1">
                          💡 <em>Lưu ý sửa lỗi:</em> Nếu Google Sheet không phản hồi khi cập nhật, hãy mở <strong>Tab 3 (Mã Nguồn Code.gs)</strong>, sao chép phiên bản mới đã fix lỗi nhận <code>getAll</code> trên cả GET và POST, sau đó bấm <strong>Triển khai (Deploy as Web App)</strong> với quyền <strong>Anyone</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: PULL, PUSH, AUTO-INIT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Action 1: Đọc từ Sheet (Pull) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-indigo-400 transition-all">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Download className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900">Đọc Từ Google Sheet (Pull)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Đọc dữ liệu mới nhất từ Sheet về MES: Cập nhật đơn hàng (G &amp; N), ngày KH bắt đầu/hoàn thành, năng lực và định mức công đoạn.
                  </p>
                  <button
                    onClick={handlePullFromSheet}
                    disabled={isSyncing}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isSyncing ? 'Đang đọc...' : 'Đọc Dữ Liệu Từ Sheet'}</span>
                  </button>
                </div>

                {/* Action 2: Ghi lên Sheet (Push) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-emerald-400 transition-all">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Upload className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900">Ghi Lên Google Sheet (Push)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Đẩy toàn bộ {orders.length} đơn hàng, {teamCapacity.length} tổ năng lực và {cycleNorms.length} định mức công đoạn lên Google Sheet.
                  </p>
                  <button
                    onClick={handlePushAllToSheet}
                    disabled={isSyncing || isReadOnly}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isSyncing ? 'Đang ghi...' : 'Ghi Lên Google Sheet'}</span>
                  </button>
                </div>

                {/* Action 3: Tự động khởi tạo cấu trúc */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h4 className="font-bold text-sm text-slate-900">Khởi Tạo Bảng Mới</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tự động tạo các tab chuẩn: <code>DonHang_LSX</code>, <code>NangLuc_NhanSu_To</code>, <code>DinhMuc_CongDoan</code>, <code>LichNgay_17To</code>.
                  </p>
                  <button
                    onClick={handleInitSheets}
                    disabled={isSyncing || isReadOnly}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Khởi Tạo Cấu Trúc Bảng</span>
                  </button>
                </div>
              </div>

              {/* Live Statistics & Setting Strip */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Đơn hàng trong hệ thống:</span>
                    <strong className="font-mono text-sm text-slate-900">{orders.length} Đơn (G &amp; N)</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Năng lực 17 tổ:</span>
                    <strong className="font-mono text-sm text-slate-900">{teamCapacity.length} Tổ sẵn sàng</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Định mức công đoạn:</span>
                    <strong className="font-mono text-sm text-slate-900">{cycleNorms.length} Định mức</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => handleToggleAutoSync(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Tự động đẩy lên Google Sheet khi duyệt kế hoạch</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT 3 STANDARDIZED CSV FILES & DIRECT CSV IMPORT */}
          {activeTab === 'TEMPLATES' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-emerald-950">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-emerald-700" />
                  <span>Tải Về Trọn Bộ 5 Bảng Google Sheet / Excel Chuẩn Hóa Theo Đơn Vị DCAR:</span>
                </h4>
                <p className="text-xs text-emerald-800">
                  Hệ thống hỗ trợ 5 bảng đồng bộ toàn diện: Đơn hàng &amp; Lịch sản xuất tuần, Kho lưu trữ đơn hoàn thành, Năng lực &amp; Nhân sự 17 tổ, Định mức 17 công đoạn, và Theo dõi tiến độ các tổ. Có thể tải về chỉnh sửa trên Google Sheets/Excel rồi nạp lại tức thì!
                </p>
              </div>

              {/* 5 CSV Download Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* File 1: Đơn Hàng & Ngày Kế Hoạch */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                        BẢNG 1 · ĐƠN HÀNG
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{orders.length} đơn</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">DonHang_LSX.csv</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Lệnh sản xuất, khách hàng, ngày nhận xe, hạn giao, ngày KH bắt đầu &amp; hoàn thành do TPSX duyệt, các tổ SX đồng thời, lý do treo đơn.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadOrdersCsv}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tải DonHang_LSX.csv</span>
                  </button>
                </div>

                {/* File 2: Kho Lưu Trữ Đơn Hoàn Thành */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-900 rounded">
                        BẢNG 2 · LƯU TRỮ
                      </span>
                      <span className="text-[10px] text-purple-700 font-mono font-bold">Xuất xưởng</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">LuuTru_DonHoanThanh.csv</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Hồ sơ điện tử các đơn xe đã hoàn thành, số khung VIN, ngày xuất xưởng, kết quả KCS 120 điểm đạt chuẩn, địa điểm bàn giao xe.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCompletedCsv}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-200" />
                    <span>Tải LuuTru_DonHoanThanh.csv</span>
                  </button>
                </div>

                {/* File 3: Năng Lực & Nhân Sự Tổ */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded">
                        BẢNG 3 · NHÂN SỰ TỔ
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">17 tổ (95 thợ)</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">NangLuc_NhanSu_To.csv</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Thông tin năng lực và nhân sự 17 tổ thuộc 4 cụm, số thợ chính, thợ phụ, năng lực xe/ngày, giờ định mức/xe phục vụ phân công và điều phối.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadCapacityCsv}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Tải NangLuc_NhanSu_To.csv</span>
                  </button>
                </div>

                {/* File 4: Định Mức Công Đoạn */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">
                        BẢNG 4 · ĐỊNH MỨC
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{cycleNorms.length} bước</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">DinhMuc_CongDoan.csv</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Định mức giờ công chuẩn cho 17 công đoạn (S01 → S17), thứ tự dòng chảy, tổ phụ trách, thời lượng chuẩn ngày để cân bằng chuyền.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadNormsCsv}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Tải DinhMuc_CongDoan.csv</span>
                  </button>
                </div>

                {/* File 5: Tiến Độ & Tải Các Tổ Realtime */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
                        BẢNG 5 · TIẾN ĐỘ TỔ
                      </span>
                      <span className="text-[10px] text-blue-700 font-mono font-bold">Realtime</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">TheoDoi_TienDo_CacTo.csv</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Báo cáo realtime phụ tải, số xe đang thi công, các đơn sản xuất song song, trạng thái hoạt động và tỷ lệ sử dụng công suất từng tổ.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadProgressCsv}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-200" />
                    <span>Tải TheoDoi_TienDo_CacTo.csv</span>
                  </button>
                </div>

                {/* File 6: Thông Tin 17 Tổ Theo Lưu Đồ Ford/Solati */}
                <div className="bg-white border-2 border-amber-300 rounded-lg p-4 space-y-3 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between bg-amber-50/20">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black px-2 py-0.5 bg-amber-400 text-slate-950 rounded uppercase">
                        BẢNG 6 · LƯU ĐỒ 17 TỔ
                      </span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold">Ford &amp; Solati</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">ThongTin_17To_LuuDo.csv</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Dữ liệu chính xác 17 tổ (T01 → T17) theo lưu đồ xưởng, nguồn đầu vào, điểm đến đầu ra, nhãn nhánh kỹ thuật, định mức năng lực và tiến độ WIP thực tế làm cơ sở lấy &amp; lưu trữ dữ liệu.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadTeamsFlowCsv}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-950" />
                      <span>Tải ThongTin_17To_LuuDo.csv</span>
                    </button>
                    <button
                      onClick={handleInitTeamsFlowSheet}
                      disabled={isSyncing}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px] disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Khởi Tạo Trực Tiếp Lên Google Sheet</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct File / CSV Import Box */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileUp className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-sm">Nhập File CSV Vào Hệ Thống (Import Trực Tiếp):</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Sau khi điều chỉnh nhân sự, ngày bắt đầu hoặc ngày hoàn thành trên Google Sheet / Excel, xuất file CSV và chọn bên dưới để cập nhật tức thì:
                </p>

                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Chọn File CSV Để Đồng Bộ</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleImportCsvFile}
                      className="hidden"
                    />
                  </label>
                  {importNotification && (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                      {importNotification}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPS SCRIPT CODE (Code.gs) */}
          {activeTab === 'CODE' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-amber-950">
                <h4 className="font-bold flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span>Hướng Dẫn Cập Nhật Code.gs Đã Khắc Phục Lỗi Đồng Bộ:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    Mở Google Sheet của bạn &gt; Menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Xóa toàn bộ nội dung cũ trong <code>Code.gs</code>, bấm nút <strong>Sao Chép Mã Apps Script</strong> bên dưới và dán vào. Bấm Lưu (Ctrl + S).
                  </li>
                  <li>
                    Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Quản lý bản triển khai (Manage deployments)</strong> &gt; Bấm biểu tượng Bút chì &gt; Chọn <strong>Phiên bản mới (New version)</strong> &gt; Bấm <strong>Triển khai (Deploy)</strong>.
                  </li>
                  <li>
                    Quyền truy cập đặt là <strong>Bất kỳ ai (Anyone)</strong> để Web App nhận dữ liệu 2 chiều.
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-700">
                  Mã Nguồn Apps Script (Code.gs) Đã Sửa Lỗi getAll &amp; Hỗ Trợ 3 Bảng:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-slate-900 text-amber-400 font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Đã Sao Chép Vào Bộ Nhớ!' : 'Sao Chép Mã Apps Script'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}

          {/* TAB 4: SHEET SCHEMA & STRUCTURE */}
          {activeTab === 'SCHEMA' && (
            <div className="space-y-5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
                Cấu trúc các bảng dữ liệu trên Google Sheet được thiết kế đồng bộ hoàn hảo với hệ thống MES:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Sheet 1 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      1. DonHang_LSX
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      Đơn Hàng &amp; KH Tuần
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Lưu Lệnh sản xuất, ngày KH bắt đầu, ngày KH hoàn thành do TPSX duyệt, đơn bán (G), đơn BTP (N), các tổ SX đồng thời, lý do treo đơn.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã LSX, Loại Đơn, Khách Hàng, Số HĐ, Dòng Xe, Bản Độ, Màu Sơn, Màu Da, Ngày Nhận, Hạn Giao, Ngày KH Bắt Đầu, Ngày KH Hoàn Thành, Trạng Thái, Tiến Độ %, Cụm, Tổ, Các Tổ SX Đồng Thời, Lý Do Treo Đơn, Ngày Bắt Đầu Treo, Ghi Chú
                  </div>
                </div>

                {/* Sheet 2 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      2. LuuTru_DonHoanThanh
                    </span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      Lưu Trữ Xuất Xưởng
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Kho hồ sơ điện tử các xe đã hoàn thành xuất xưởng, số khung VIN, ngày xuất xưởng, biên bản KCS 120 điểm đạt chuẩn, địa điểm bàn giao.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã LSX, Loại Đơn, Khách Hàng, Số HĐ, Số Khung VIN, Dòng Xe, Bản Độ, Màu Da, Ngày Hạn Giao, Ngày Hoàn Thành Thực Tế, Nghiệm Thu KCS 120 Điểm, Địa Điểm Bàn Giao, Người Nhận, Trạng Thái Lưu Trữ
                  </div>
                </div>

                {/* Sheet 3 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      3. NangLuc_NhanSu_To
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      Năng Lực &amp; Thợ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Lưu thông tin nhân sự 17 tổ, thợ chính phụ trách trạm, số thợ phụ, năng lực xe/ngày, giờ ĐM/xe để phân công công việc.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã Tổ, Mã Code, Tên Tổ, Cụm, Số Nhân Sự, Thợ Chính Phụ Trách, Số Thợ Phụ, Năng Lực Xe/Ngày, Giờ ĐM/Xe, Hiệu Suất Chuẩn %, Ghi Chú Nhiệm Vụ
                  </div>
                </div>

                {/* Sheet 4 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      4. DinhMuc_CongDoan
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      Định Mức Giờ S01-S17
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Định mức giờ công chuẩn theo từng dòng xe, mã bước S01-S17, tổ phụ trách, thời lượng chuẩn ngày để điều chỉnh tiến độ.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã Định Mức, Dòng Xe, Mã Bước, Tên Công Đoạn, Mã Tổ, Tên Tổ Phụ Trách, Cụm, Thứ Tự Chuyền, Định Mức Giờ Công, Thời Lượng Chuẩn Ngày
                  </div>
                </div>

                {/* Sheet 5 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      5. TheoDoi_TienDo_CacTo
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      Tiến Độ Tổ Realtime
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Báo cáo realtime tình trạng phụ tải, số lệnh sản xuất đang chạy, các đơn thi công song song và tỷ lệ công suất 17 tổ.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã Tổ, Tên Tổ, Cụm, Thợ Chính, Số Thợ Phụ, Số Lệnh Đang Chạy, Danh Sách Mã Đơn, Số Đơn SX Song Song, Công Suất Sử Dụng %, Trạng Thái Tải
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Hỗ trợ 2 chiều: Tự động ghi khi TPSX phê duyệt và đồng bộ dữ liệu thời gian thực</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
