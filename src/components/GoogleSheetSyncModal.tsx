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
} from '../services/googleSheetService';
import { OrderItem, DailyScheduleItem } from '../types/mes';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  dailySchedules?: DailyScheduleItem[];
  onDataLoadedFromSheet: (sheetOrders: OrderItem[]) => void;
  isReadOnly?: boolean;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  orders,
  dailySchedules,
  onDataLoadedFromSheet,
  isReadOnly = false,
}) => {
  const [apiUrl, setApiUrl] = useState<string>(getStoredSheetApiUrl());
  const [activeTab, setActiveTab] = useState<'STATUS' | 'CODE' | 'SCHEMA'>('STATUS');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(isAutoSyncEnabled());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

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
      setStatusMessage(err.message || 'Lỗi kết nối.');
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

  // Đọc dữ liệu từ Google Sheet (Pull)
  const handlePullFromSheet = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang đọc dữ liệu từ Google Sheet...');
    try {
      const res = await fetchSheetData();
      if (res.success && res.orders && res.orders.length > 0) {
        onDataLoadedFromSheet(res.orders);
        setIsConnected(true);
        setStatusMessage(
          `Đã tải thành công ${res.orders.length} đơn hàng từ Google Sheet về hệ thống MES!`
        );
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setStatusMessage(
          res.error ||
            'Chưa có dữ liệu đơn hàng trên Google Sheet hoặc Apps Script cần triển khai doGet.'
        );
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi khi đọc: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Ghi toàn bộ dữ liệu lên Google Sheet (Push)
  const handlePushAllToSheet = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang đẩy toàn bộ đơn hàng và lịch lên Google Sheet...');
    try {
      const success = await pushAllDataToSheet({
        orders,
        dailySchedules,
      });
      if (success) {
        setIsConnected(true);
        setStatusMessage(
          `Đã ghi thành công toàn bộ ${orders.length} đơn hàng và lịch làm việc lên Google Sheet!`
        );
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      } else {
        setStatusMessage('Ghi thất bại. Vui lòng kiểm tra lại quyền Web App (Anyone).');
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi khi ghi: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Gửi lệnh tự động khởi tạo cấu trúc 4 bảng
  const handleInitSheets = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang tạo và định dạng 4 bảng dữ liệu trên Google Sheet...');
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

  const APPS_SCRIPT_CODE = `/**
 * DCAR LIMOUSINE MES - GOOGLE APPS SCRIPT WEB APP BACKEND (Code.gs)
 * Triển khai: Deploy as Web App -> Execute as Me -> Anyone
 */
var SHEET_NAMES = {
  ORDERS: 'DonHang_LSX',
  SCHEDULE: 'LichNgay_17To',
  BTP: 'BTP_DongBo',
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
      return jsonResponse({ success: true, message: 'Đã khởi tạo 4 bảng chuẩn MES!' });
    }
    
    var orders = readSheetAsObjects(ss, SHEET_NAMES.ORDERS);
    var schedule = readSheetAsObjects(ss, SHEET_NAMES.SCHEDULE);
    var btp = readSheetAsObjects(ss, SHEET_NAMES.BTP);
    var defects = readSheetAsObjects(ss, SHEET_NAMES.DEFECTS);
    
    return jsonResponse({
      success: true,
      data: { orders: orders, dailySchedules: schedule, btpItems: btp, defects: defects },
      counts: { orders: orders.length, dailySchedules: schedule.length, btpItems: btp.length, defects: defects.length }
    });
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
    var action = postData.action || 'syncAll';

    if (action === 'ping') {
      return jsonResponse({ success: true, status: 'CONNECTED', spreadsheetName: ss.getName() });
    }
    if (action === 'init') {
      seedInitialMESData(ss);
      return jsonResponse({ success: true, message: 'Đã nạp dữ liệu mẫu DCAR MES thành công!' });
    }
    if (action === 'createOrder' && postData.order) {
      var o = postData.order;
      var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
      s.appendRow([
        o.id, o.orderType || 'G', o.customerName, o.contractRef, o.baseModel,
        o.conversionVersion, o.exteriorColor, o.interiorColor, o.receivedDate, o.dueDate,
        o.status, o.progress || 0, o.currentDay || 1, o.currentCluster || 1,
        o.currentStepId, o.currentTeamId, o.currentStepName, o.priorityLevel || 'P3_NORMAL',
        o.scheduleHealth || 'ON_TRACK', o.delayDays || 0, o.mrpReady ? 'YES' : 'NO',
        o.notes, new Date().toLocaleString('vi-VN')
      ]);
      return jsonResponse({ success: true, message: 'Đã lưu đơn ' + o.id, orderId: o.id });
    }
    if (action === 'updateOrder' && postData.order) {
      var ord = postData.order;
      var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
      var data = s.getDataRange().getValues();
      var r = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(ord.id)) { r = i + 1; break; }
      }
      if (r > 0) {
        s.getRange(r, 11).setValue(ord.status || 'IN_PRODUCTION');
        s.getRange(r, 12).setValue(ord.progress || 0);
        s.getRange(r, 13).setValue(ord.currentDay || 1);
        s.getRange(r, 19).setValue(ord.scheduleHealth || 'ON_TRACK');
        s.getRange(r, 20).setValue(ord.delayDays || 0);
        s.getRange(r, 23).setValue(new Date().toLocaleString('vi-VN'));
        return jsonResponse({ success: true, message: 'Đã cập nhật ' + ord.id });
      }
    }
    if (action === 'reportDefect' && postData.defect) {
      var d = postData.defect;
      var ds = ss.getSheetByName(SHEET_NAMES.DEFECTS);
      ds.appendRow([
        d.id || ('DEF-' + Date.now()), d.orderId, d.teamId, d.teamName,
        d.issueDescription, d.severity || 'MEDIUM', d.reworkHours || 2,
        d.estimatedCostVND || 400000, d.timestamp || new Date().toLocaleString('vi-VN'), 'OPEN'
      ]);
      return jsonResponse({ success: true, message: 'Đã ghi nhận lỗi KCS' });
    }
    if (action === 'syncAll' && postData.payload) {
      overwriteSheetWithOrders(ss, postData.payload.orders || []);
      return jsonResponse({ success: true, message: 'Đã đồng bộ toàn bộ lên Google Sheet!' });
    }

    return jsonResponse({ success: true, message: 'OK' });
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkAndInitSheets(ss) {
  var names = ss.getSheets().map(function(s){ return s.getName(); });
  if (names.indexOf(SHEET_NAMES.ORDERS) === -1) {
    var s1 = ss.insertSheet(SHEET_NAMES.ORDERS);
    s1.appendRow(['Mã LSX','Loại Đơn','Tên Khách Hàng','Số Hợp Đồng','Dòng Xe Cơ Sở','Phiên Bản Độ','Màu Ngoại Thất','Màu Nội Thất','Ngày Nhận Xe','Hạn Giao Xe','Trạng Thái','Tiến Độ %','Ngày Chuyền','Cụm Hiện Tại','Bước Hiện Tại','Tổ Hiện Tại','Tên Bước','Ưu Tiên','Sức Khỏe','Số Ngày Trễ','MRP Sẵn Sàng','Ghi Chú','Cập Nhật Cuối']);
    formatHeader(s1);
  }
  if (names.indexOf(SHEET_NAMES.SCHEDULE) === -1) {
    var s2 = ss.insertSheet(SHEET_NAMES.SCHEDULE);
    s2.appendRow(['Mã Lịch','Ngày','Thứ','Mã LSX','Tên Khách Hàng','Phiên Bản','Mã Tổ','Tên Tổ','Cụm','Công Đoạn','Giờ ĐM','Giờ TT','Mức Ưu Tiên','Sức Khỏe','Tiến Độ %','Thợ Chính','Dưỡng Gá Jig','Trạng Thái BTP','Trạng Thái Trạm','Trạm Thượng Nguồn','Giờ Đến']);
    formatHeader(s2);
  }
  if (names.indexOf(SHEET_NAMES.BTP) === -1) {
    var s3 = ss.insertSheet(SHEET_NAMES.BTP);
    s3.appendRow(['Mã BTP','Tên Cụm BTP','Mã Đơn Hàng','Khách Hàng','Phiên Bản','Tổ Phụ Trách','Cụm','SL Yêu Cầu','SL Đã Có','Trạng Thái','Nguyên Nhân Chờ','Dự Kiến Xong']);
    formatHeader(s3);
  }
  if (names.indexOf(SHEET_NAMES.DEFECTS) === -1) {
    var s4 = ss.insertSheet(SHEET_NAMES.DEFECTS);
    s4.appendRow(['Mã Lỗi','Mã LSX','Mã Tổ','Tên Tổ','Mô Tả Lỗi KCS','Mức Độ','Giờ Sửa Hàng','Chi Phí','Ngày Phát Sinh','Trạng Thái']);
    formatHeader(s4);
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

function seedInitialMESData(ss) {
  var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (s.getLastRow() <= 1) {
    s.appendRow(['G2610021','G','CTY CP VẬN TẢI HOA MAI VŨNG TÀU','HĐ-HM26/10-09','Ford Transit 18c Premium','Ford Thương Gia 11c (10 ghế VIP)','Đen Ánh Kim','Da Bò Ý Nâu Cognac','2026-10-20','2026-11-03','IN_PRODUCTION',90,13,4,'S14','T14','Hạ sàn gỗ Teak & ốp nẹp nhôm','P2_HIGH','ON_TRACK',0,'YES','Tiến độ tốt',new Date().toLocaleString('vi-VN')]);
    s.appendRow(['B2610002','B','MR. HOÀNG VĂN THÁI (VIP BẢO HÀNH)','HĐ-BH26/10-18','Hyundai Solati 16c','Solati Thượng Đỉnh 10c','Trắng Ngọc Trai','Da Bò Nappa Đỏ Rượu Vang','2026-10-21','2026-11-04','REWORK_ALERT',45,8,4,'S16','T16','Sửa mạch CAN-bus ghế VIP','P1_CRITICAL','REWORK',2,'YES','Chậm 2 ngày do lỗi CAN-bus',new Date().toLocaleString('vi-VN')]);
    s.appendRow(['G2610023','G','RESORT FUSION CAM RANH','HĐ-FC26/10-15','Ford Transit 18c Premium','Ford VIP Lounge 2026','Xanh Cavansite','Da Maybach Phối Kem','2026-10-26','2026-11-09','IN_PRODUCTION',65,8,3,'S13','T13','Lắp ampli JBL DSP & Subwoofer gầm','P2_HIGH','AT_RISK',1,'YES','Chờ kiểm định ampli',new Date().toLocaleString('vi-VN')]);
  }
}

function overwriteSheetWithOrders(ss, orders) {
  var s = ss.getSheetByName(SHEET_NAMES.ORDERS);
  var lr = s.getLastRow();
  if (lr > 1) s.getRange(2, 1, lr - 1, s.getLastColumn()).clearContent();
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    s.appendRow([o.id, o.orderType || 'G', o.customerName, o.contractRef, o.baseModel, o.conversionVersion, o.exteriorColor, o.interiorColor, o.receivedDate, o.dueDate, o.status, o.progress || 0, o.currentDay || 1, o.currentCluster || 1, o.currentStepId, o.currentTeamId, o.currentStepName, o.priorityLevel || 'P3_NORMAL', o.scheduleHealth || 'ON_TRACK', o.delayDays || 0, o.mrpReady ? 'YES' : 'NO', o.notes, new Date().toLocaleString('vi-VN')]);
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
                  Đồng Bộ Dữ Liệu Google Sheet 2 Đầu (Two-Way Sync)
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
                Đọc dữ liệu nguồn từ Google Sheet và Ghi cập nhật hai chiều (Đơn hàng, Lịch 17 tổ, BTP, Lỗi KCS)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('STATUS')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'STATUS'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>01. Trạng Thái &amp; Thao Tác 2 Đầu</span>
          </button>

          <button
            onClick={() => setActiveTab('CODE')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'CODE'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>02. Mã Nguồn Apps Script (Code.gs)</span>
          </button>

          <button
            onClick={() => setActiveTab('SCHEMA')}
            className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'SCHEMA'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>03. Cấu Trúc 4 Bảng Trên Google Sheet</span>
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
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Khôi phục link mặc định của bạn
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
                    className="px-3 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  >
                    Lưu URL
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isPinging}
                    className="px-3 py-2 bg-white border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0"
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
                          💡 <em>Lưu ý:</em> Nếu bạn vừa tạo script mới, hãy bấm sang <strong>Tab 2 (Mã Nguồn Code.gs)</strong>, sao chép code và chọn <strong>Triển khai (Deploy as Web App)</strong> với quyền <strong>Anyone</strong> để Google Sheet chấp nhận request.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: PULL, PUSH, AUTO-INIT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Action 1: Đọc từ Sheet (Pull) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Download className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900">Đọc Dữ Liệu (Pull)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lấy danh sách đơn hàng, cập nhật mới nhất từ Google Sheet và nạp vào hệ thống MES.
                  </p>
                  <button
                    onClick={handlePullFromSheet}
                    disabled={isSyncing}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isSyncing ? 'Đang đọc...' : 'Đọc Từ Google Sheet'}</span>
                  </button>
                </div>

                {/* Action 2: Ghi lên Sheet (Push) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Upload className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900">Ghi Lên Sheet (Push)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Đẩy toàn bộ {orders.length} Lệnh sản xuất và tiến độ hiện tại lên Google Sheet để lưu trữ.
                  </p>
                  <button
                    onClick={handlePushAllToSheet}
                    disabled={isSyncing || isReadOnly}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isSyncing ? 'Đang ghi...' : 'Ghi Lên Google Sheet'}</span>
                  </button>
                </div>

                {/* Action 3: Tự động khởi tạo 4 bảng */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h4 className="font-bold text-sm text-slate-900">Khởi Tạo Cấu Trúc</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tự động tạo 4 tab (`DonHang_LSX`, `LichNgay_17To`, `BTP_DongBo`, `ChatLuong_LoiKCS`) trên Google Sheet.
                  </p>
                  <button
                    onClick={handleInitSheets}
                    disabled={isSyncing || isReadOnly}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tự Động Tạo 4 Bảng</span>
                  </button>
                </div>
              </div>

              {/* Live Statistics & Setting Strip */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-slate-500 block">Số đơn hiện tại trong App:</span>
                    <strong className="font-mono text-base text-slate-900">{orders.length} Đơn</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-slate-500 block">Lần đồng bộ gần nhất:</span>
                    <strong className="font-mono text-xs text-slate-700">
                      {lastSyncTime || 'Chưa đồng bộ phiên này'}
                    </strong>
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
                    <span>Tự động đẩy lên Google Sheet khi tạo/sửa đơn &amp; báo lỗi KCS</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPS SCRIPT CODE (Code.gs) */}
          {activeTab === 'CODE' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-amber-950">
                <h4 className="font-bold flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span>Hướng Dẫn Cài Đặt 3 Bước Trên Google Sheet Của Bạn:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    Mở file Google Sheet của bạn &gt; Menu <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Xóa toàn bộ mã trong file <code>Code.gs</code>, bấm nút <strong>Sao Chép Mã Apps Script</strong> bên dưới và dán vào. Bấm Lưu (Ctrl + S).
                  </li>
                  <li>
                    Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong> &gt; Chọn <strong>Ứng dụng web (Web app)</strong>:
                    <ul className="list-disc list-inside pl-4 text-slate-700 font-mono mt-0.5">
                      <li>Execute as (Thực thi dưới dạng): <strong>Tôi (Me)</strong></li>
                      <li>Who has access (Ai có quyền): <strong>Bất kỳ ai (Anyone)</strong> (để ứng dụng MES kết nối đọc/ghi được).</li>
                    </ul>
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-700">
                  Mã Nguồn Apps Script (Code.gs) · Hỗ Trợ Đọc &amp; Ghi 2 Đầu:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-slate-900 text-amber-400 font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
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

          {/* TAB 3: SHEET SCHEMA & STRUCTURE */}
          {activeTab === 'SCHEMA' && (
            <div className="space-y-5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
                Hệ thống MES tự động đọc và phân loại dữ liệu theo 4 tab trên Google Sheet:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sheet 1 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      1. Tab: DonHang_LSX
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      23 Cột
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Lưu trữ toàn bộ thông tin Lệnh sản xuất, tiến độ %, hợp đồng, dòng xe, màu sắc và sức khỏe giao xe.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã LSX, Loại Đơn, Tên Khách Hàng, Số Hợp Đồng, Dòng Xe Cơ Sở, Phiên Bản Độ, Màu Ngoại Thất, Màu Nội Thất, Ngày Nhận Xe, Hạn Giao Xe, Trạng Thái, Tiến Độ %, Ngày Chuyền, Cụm Hiện Tại, Bước Hiện Tại, Tổ Hiện Tại, Tên Bước, Ưu Tiên, Sức Khỏe, Số Ngày Trễ, MRP Sẵn Sàng, Ghi Chú, Cập Nhật Cuối
                  </div>
                </div>

                {/* Sheet 2 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      2. Tab: LichNgay_17To
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      21 Cột
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Phân bổ kế hoạch ca ngày cho 17 tổ, phân công thợ chính, dưỡng gá Jig và đón đầu phôi từ trạm thượng nguồn.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã Lịch, Ngày, Thứ, Mã LSX, Tên Khách Hàng, Phiên Bản, Mã Tổ, Tên Tổ, Cụm, Công Đoạn, Giờ ĐM, Giờ TT, Mức Ưu Tiên, Sức Khỏe, Tiến Độ %, Thợ Chính, Dưỡng Gá Jig, Trạng Thái BTP, Trạng Thái Trạm, Trạm Thượng Nguồn, Giờ Đến Dự Kiến
                  </div>
                </div>

                {/* Sheet 3 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      3. Tab: BTP_DongBo
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      12 Cột
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Quản trị Kit-to-Order: Bán thành phẩm mộc, may, điện sẵn sàng tại chân xe trước khi vào Cụm 4 Lắp ráp.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã BTP, Tên Cụm BTP, Mã Đơn Hàng, Khách Hàng, Phiên Bản, Tổ Phụ Trách, Cụm, SL Yêu Cầu, SL Đã Có, Trạng Thái Đồng Bộ, Nguyên Nhân Chờ, Dự Kiến Sẵn Sàng
                  </div>
                </div>

                {/* Sheet 4 */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      4. Tab: ChatLuong_LoiKCS
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-mono font-bold px-1.5 py-0.5 rounded">
                      10 Cột
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nhật ký phát sinh lỗi KCS, số giờ sửa hàng (rework), chi phí hao phí phục vụ Biểu đồ Pareto 80/20.
                  </p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto">
                    Mã Lỗi, Mã LSX, Mã Tổ, Tên Tổ, Mô Tả Lỗi KCS, Mức Độ, Giờ Sửa Hàng, Chi Phí Hao Phí, Thời Gian Phát Sinh, Trạng Thái Xử Lý
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
            <span>Đồng bộ 2 đầu: Tự động ghi khi cập nhật và đọc theo chu kỳ</span>
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
