/**
 * ============================================================================
 * DCAR LIMOUSINE MES - GOOGLE APPS SCRIPT WEB APP BACKEND (Code.gs)
 * ============================================================================
 * Hướng dẫn cài đặt trên Google Sheet:
 * 1. Mở file Google Sheet của bạn.
 * 2. Vào menu: Tiện ích mở rộng (Extensions) > Apps Script.
 * 3. Xóa code cũ, dán toàn bộ nội dung file này vào file Code.gs.
 * 4. Bấm "Lưu" (Ctrl + S hoặc biểu tượng đĩa mềm).
 * 5. Bấm nút "Triển khai" (Deploy) > "Triển khai mới" (New deployment).
 *    - Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: "DCAR MES API v2.6".
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 6. Bấm "Triển khai" (Deploy) và cấp quyền (Authorize Access).
 * 7. Copy link Web app URL dán vào ứng dụng MES.
 * ============================================================================
 */

var SHEET_NAMES = {
  ORDERS: 'DonHang_LSX',
  SCHEDULE: 'LichNgay_17To',
  BTP: 'BTP_DongBo',
  DEFECTS: 'ChatLuong_LoiKCS',
};

// ---------------------------------------------------------------------------
// GET REQUEST: Đọc dữ liệu từ Google Sheet về MES App
// ---------------------------------------------------------------------------
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';

    if (action === 'init') {
      seedInitialMESData(ss);
      return jsonResponse({
        success: true,
        message: 'Đã khởi tạo thành công 4 bảng dữ liệu chuẩn DCAR MES trên Google Sheet!',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        status: 'CONNECTED',
        spreadsheetName: ss.getName(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); }),
        timestamp: new Date().toISOString()
      });
    }

    // Default: Đọc toàn bộ 4 bảng
    var orders = readSheetAsObjects(ss, SHEET_NAMES.ORDERS);
    var schedule = readSheetAsObjects(ss, SHEET_NAMES.SCHEDULE);
    var btp = readSheetAsObjects(ss, SHEET_NAMES.BTP);
    var defects = readSheetAsObjects(ss, SHEET_NAMES.DEFECTS);

    return jsonResponse({
      success: true,
      data: {
        orders: orders,
        dailySchedules: schedule,
        btpItems: btp,
        defects: defects,
      },
      counts: {
        orders: orders.length,
        dailySchedules: schedule.length,
        btpItems: btp.length,
        defects: defects.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString(),
      timestamp: new Date().toISOString()
    });
  }
}

// ---------------------------------------------------------------------------
// POST REQUEST: Ghi dữ liệu 2 đầu từ MES App lên Google Sheet
// ---------------------------------------------------------------------------
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    checkAndInitSheets(ss);

    var postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    var action = postData.action || 'syncAll';

    // 1. Khởi tạo dữ liệu mẫu nếu được yêu cầu
    if (action === 'init' || action === 'initSheet') {
      seedInitialMESData(ss);
      return jsonResponse({
        success: true,
        message: 'Đã tạo bảng và nạp dữ liệu mẫu DCAR MES thành công!',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Thêm đơn hàng mới (Create Order)
    if (action === 'createOrder' && postData.order) {
      var newOrder = postData.order;
      var sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
      var row = [
        newOrder.id || '',
        newOrder.orderType || 'G',
        newOrder.customerName || '',
        newOrder.contractRef || '',
        newOrder.baseModel || '',
        newOrder.conversionVersion || '',
        newOrder.exteriorColor || '',
        newOrder.interiorColor || '',
        newOrder.receivedDate || '',
        newOrder.dueDate || '',
        newOrder.status || 'INTAKE',
        newOrder.progress || 0,
        newOrder.currentDay || 1,
        newOrder.currentCluster || 1,
        newOrder.currentStepId || 'S01',
        newOrder.currentTeamId || 'T01',
        newOrder.currentStepName || '',
        newOrder.priorityLevel || 'P3_NORMAL',
        newOrder.scheduleHealth || 'ON_TRACK',
        newOrder.delayDays || 0,
        newOrder.mrpReady ? 'YES' : 'NO',
        newOrder.notes || '',
        new Date().toLocaleString('vi-VN')
      ];
      sheet.appendRow(row);
      return jsonResponse({
        success: true,
        message: 'Đã lưu đơn hàng ' + newOrder.id + ' vào Google Sheet',
        orderId: newOrder.id
      });
    }

    // 3. Cập nhật đơn hàng (Update Order by ID)
    if (action === 'updateOrder' && postData.order) {
      var ord = postData.order;
      var ordSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
      var ordData = ordSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var r = 1; r < ordData.length; r++) {
        if (String(ordData[r][0]) === String(ord.id)) {
          foundRow = r + 1;
          break;
        }
      }
      if (foundRow > 0) {
        ordSheet.getRange(foundRow, 11).setValue(ord.status || 'IN_PRODUCTION');
        ordSheet.getRange(foundRow, 12).setValue(ord.progress || 0);
        ordSheet.getRange(foundRow, 13).setValue(ord.currentDay || 1);
        ordSheet.getRange(foundRow, 14).setValue(ord.currentCluster || 1);
        ordSheet.getRange(foundRow, 15).setValue(ord.currentStepId || '');
        ordSheet.getRange(foundRow, 16).setValue(ord.currentTeamId || '');
        ordSheet.getRange(foundRow, 17).setValue(ord.currentStepName || '');
        ordSheet.getRange(foundRow, 19).setValue(ord.scheduleHealth || 'ON_TRACK');
        ordSheet.getRange(foundRow, 20).setValue(ord.delayDays || 0);
        ordSheet.getRange(foundRow, 22).setValue(ord.notes || '');
        ordSheet.getRange(foundRow, 23).setValue(new Date().toLocaleString('vi-VN'));
        return jsonResponse({
          success: true,
          message: 'Đã cập nhật đơn ' + ord.id + ' trên Google Sheet',
          orderId: ord.id
        });
      } else {
        // Nếu chưa có thì thêm mới
        return doPost({ postData: { contents: JSON.stringify({ action: 'createOrder', order: ord }) } });
      }
    }

    // 4. Báo cáo lỗi KCS / Sửa hàng (Report Defect)
    if (action === 'reportDefect' && postData.defect) {
      var def = postData.defect;
      var defSheet = ss.getSheetByName(SHEET_NAMES.DEFECTS);
      defSheet.appendRow([
        def.id || ('DEF-' + Date.now()),
        def.orderId || '',
        def.teamId || '',
        def.teamName || '',
        def.issueDescription || '',
        def.severity || 'MEDIUM',
        def.reworkHours || 2.0,
        def.estimatedCostVND || 400000,
        def.timestamp || new Date().toLocaleString('vi-VN'),
        def.resolved ? 'RESOLVED' : 'OPEN'
      ]);
      return jsonResponse({
        success: true,
        message: 'Đã ghi nhận lỗi KCS lên Google Sheet',
        defectId: def.id
      });
    }

    // 5. Cập nhật tiến độ ca / trạm trong ngày (Update Daily Schedule)
    if (action === 'updateSchedule' && postData.scheduleItem) {
      var sch = postData.scheduleItem;
      var schSheet = ss.getSheetByName(SHEET_NAMES.SCHEDULE);
      var schData = schSheet.getDataRange().getValues();
      var sRow = -1;
      for (var i = 1; i < schData.length; i++) {
        if (String(schData[i][0]) === String(sch.id)) {
          sRow = i + 1;
          break;
        }
      }
      if (sRow > 0) {
        schSheet.getRange(sRow, 12).setValue(sch.actualHours || schData[sRow-1][11]);
        schSheet.getRange(sRow, 15).setValue(sch.progressPercent || schData[sRow-1][14]);
        schSheet.getRange(sRow, 19).setValue(sch.workstationTaskStatus || 'IN_PROGRESS');
      } else {
        schSheet.appendRow([
          sch.id || ('DS-' + Date.now()),
          sch.dateStr || '2026-11-02',
          sch.dayOfWeek || 'Thứ 2',
          sch.orderId || '',
          sch.customerName || '',
          sch.conversionVersion || '',
          sch.teamId || '',
          sch.teamName || '',
          sch.clusterId || 1,
          sch.stepName || '',
          sch.plannedHours || 8,
          sch.actualHours || 0,
          sch.priorityLevel || 'P3_NORMAL',
          sch.scheduleHealth || 'ON_TRACK',
          sch.progressPercent || 0,
          sch.assignedCraftsman || '',
          sch.jigToolPreparation || '',
          sch.btpReadinessNote || '',
          sch.workstationTaskStatus || 'IN_PROGRESS',
          sch.upstreamTeamId || '',
          sch.estimatedArrivalHour || ''
        ]);
      }
      return jsonResponse({
        success: true,
        message: 'Đã cập nhật lịch làm việc trạm trên Google Sheet',
        scheduleId: sch.id
      });
    }

    // 6. Đồng bộ toàn bộ dữ liệu mẫu / trạng thái tổng thể (Sync All)
    if (action === 'syncAll' && postData.payload) {
      var p = postData.payload;
      if (p.orders && p.orders.length > 0) {
        overwriteSheetWithOrders(ss, p.orders);
      }
      if (p.dailySchedules && p.dailySchedules.length > 0) {
        overwriteSheetWithSchedules(ss, p.dailySchedules);
      }
      return jsonResponse({
        success: true,
        message: 'Đã đồng bộ toàn diện dữ liệu MES lên Google Sheet!',
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({
      success: true,
      message: 'Yêu cầu POST đã được tiếp nhận thành công',
      action: action
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString(),
      timestamp: new Date().toISOString()
    });
  }
}

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkAndInitSheets(ss) {
  var existingNames = ss.getSheets().map(function(s) { return s.getName(); });

  if (existingNames.indexOf(SHEET_NAMES.ORDERS) === -1) {
    var s1 = ss.insertSheet(SHEET_NAMES.ORDERS);
    s1.appendRow([
      'Mã LSX', 'Loại Đơn', 'Tên Khách Hàng', 'Số Hợp Đồng', 'Dòng Xe Cơ Sở', 'Phiên Bản Độ',
      'Màu Ngoại Thất', 'Màu Nội Thất', 'Ngày Nhận Xe', 'Hạn Giao Xe', 'Trạng Thái', 'Tiến Độ %',
      'Ngày Chuyền', 'Cụm Hiện Tại', 'Bước Hiện Tại', 'Tổ Hiện Tại', 'Tên Bước', 'Ưu Tiên',
      'Sức Khỏe', 'Số Ngày Trễ', 'MRP Sẵn Sàng', 'Ghi Chú', 'Cập Nhật Cuối'
    ]);
    formatHeaderRow(s1);
  }

  if (existingNames.indexOf(SHEET_NAMES.SCHEDULE) === -1) {
    var s2 = ss.insertSheet(SHEET_NAMES.SCHEDULE);
    s2.appendRow([
      'Mã Lịch', 'Ngày', 'Thứ', 'Mã LSX', 'Tên Khách Hàng', 'Phiên Bản', 'Mã Tổ', 'Tên Tổ',
      'Cụm', 'Công Đoạn', 'Giờ ĐM', 'Giờ TT', 'Mức Ưu Tiên', 'Sức Khỏe', 'Tiến Độ %',
      'Thợ Chính', 'Dưỡng Gá Jig', 'Trạng Thái BTP', 'Trạng Thái Trạm', 'Trạm Thượng Nguồn', 'Giờ Đến Dự Kiến'
    ]);
    formatHeaderRow(s2);
  }

  if (existingNames.indexOf(SHEET_NAMES.BTP) === -1) {
    var s3 = ss.insertSheet(SHEET_NAMES.BTP);
    s3.appendRow([
      'Mã BTP', 'Tên Cụm BTP', 'Mã Đơn Hàng', 'Khách Hàng', 'Phiên Bản', 'Tổ Phụ Trách',
      'Cụm', 'SL Yêu Cầu', 'SL Đã Có', 'Trạng Thái Đồng Bộ', 'Nguyên Nhân Chờ', 'Dự Kiến Sẵn Sàng'
    ]);
    formatHeaderRow(s3);
  }

  if (existingNames.indexOf(SHEET_NAMES.DEFECTS) === -1) {
    var s4 = ss.insertSheet(SHEET_NAMES.DEFECTS);
    s4.appendRow([
      'Mã Lỗi', 'Mã LSX', 'Mã Tổ', 'Tên Tổ', 'Mô Tả Lỗi KCS', 'Mức Độ', 'Giờ Sửa Hàng',
      'Chi Phí Hao Phí', 'Thời Gian Phát Sinh', 'Trạng Thái'
    ]);
    formatHeaderRow(s4);
  }
}

function formatHeaderRow(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#0f172a'); // slate-900
  headerRange.setFontColor('#fbbf24'); // amber-400
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function readSheetAsObjects(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = String(headers[c]).trim();
      obj[key] = data[r][c];
    }
    rows.push(obj);
  }
  return rows;
}

function seedInitialMESData(ss) {
  // Nạp sẵn dữ liệu ban đầu cho các bảng nếu rỗng
  var ordSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (ordSheet.getLastRow() <= 1) {
    ordSheet.appendRow([
      'G2610021', 'G', 'CTY CP VẬN TẢI HOA MAI VŨNG TÀU', 'HĐ-HM26/10-09',
      'Ford Transit 18c Premium', 'Ford Thương Gia 11c (10 ghế VIP)', 'Đen Ánh Kim', 'Da Bò Ý Nâu Cognac',
      '2026-10-20', '2026-11-03', 'IN_PRODUCTION', 90, 13, 4, 'S14', 'T14',
      'Hạ sàn gỗ Teak & ốp nẹp nhôm', 'P2_HIGH', 'ON_TRACK', 0, 'YES',
      'Tiến độ rất tốt, đã nghiệm thu ghế VIP', new Date().toLocaleString('vi-VN')
    ]);
    ordSheet.appendRow([
      'B2610002', 'B', 'MR. HOÀNG VĂN THÁI (VIP BẢO HÀNH)', 'HĐ-BH26/10-18',
      'Hyundai Solati 16c', 'Solati Thượng Đỉnh 10c', 'Trắng Ngọc Trai', 'Da Bò Nappa Đỏ Rượu Vang',
      '2026-10-21', '2026-11-04', 'REWORK_ALERT', 45, 8, 4, 'S16', 'T16',
      'Sửa mạch CAN-bus ghế VIP', 'P1_CRITICAL', 'REWORK', 2, 'YES',
      'Chậm 2 ngày do chập cụm điều khiển ghế massage', new Date().toLocaleString('vi-VN')
    ]);
    ordSheet.appendRow([
      'G2610023', 'G', 'RESORT FUSION CAM RANH', 'HĐ-FC26/10-15',
      'Ford Transit 18c Premium', 'Ford VIP Lounge 2026', 'Xanh Cavansite', 'Da Maybach Phối Kem',
      '2026-10-26', '2026-11-09', 'IN_PRODUCTION', 65, 8, 3, 'S13', 'T13',
      'Lắp ampli JBL DSP & Subwoofer gầm', 'P2_HIGH', 'AT_RISK', 1, 'YES',
      'Đang chờ kiểm định bộ loa DSP Ampli JBL', new Date().toLocaleString('vi-VN')
    ]);
    ordSheet.appendRow([
      'T2610005', 'T', 'DCAR SHOWROOM HÀ NỘI', 'HĐ-SR26/10-02',
      'Ford Transit 18c Premium', 'Ford VIP Lounge 2026', 'Đen Tuyệt Đối', 'Nappa Trắng Tuyết',
      '2026-10-18', '2026-11-02', 'KCS_TEST', 95, 14, 4, 'S17', 'T17',
      'KCS Kiểm định 120 điểm & thử mưa', 'P3_NORMAL', 'ON_TRACK', 0, 'YES',
      'Xe hoàn thiện xuất sắc, chuẩn bị xuất kho showroom', new Date().toLocaleString('vi-VN')
    ]);
  }
}

function overwriteSheetWithOrders(ss, orders) {
  var sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    sheet.appendRow([
      o.id || '',
      o.orderType || 'G',
      o.customerName || '',
      o.contractRef || '',
      o.baseModel || '',
      o.conversionVersion || '',
      o.exteriorColor || '',
      o.interiorColor || '',
      o.receivedDate || '',
      o.dueDate || '',
      o.status || 'IN_PRODUCTION',
      o.progress || 0,
      o.currentDay || 1,
      o.currentCluster || 1,
      o.currentStepId || '',
      o.currentTeamId || '',
      o.currentStepName || '',
      o.priorityLevel || 'P3_NORMAL',
      o.scheduleHealth || 'ON_TRACK',
      o.delayDays || 0,
      o.mrpReady ? 'YES' : 'NO',
      o.notes || '',
      new Date().toLocaleString('vi-VN')
    ]);
  }
}

function overwriteSheetWithSchedules(ss, schedules) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SCHEDULE);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  for (var i = 0; i < schedules.length; i++) {
    var s = schedules[i];
    sheet.appendRow([
      s.id || '',
      s.dateStr || '',
      s.dayOfWeek || '',
      s.orderId || '',
      s.customerName || '',
      s.conversionVersion || '',
      s.teamId || '',
      s.teamName || '',
      s.clusterId || 1,
      s.stepName || '',
      s.plannedHours || 0,
      s.actualHours || 0,
      s.priorityLevel || 'P3_NORMAL',
      s.scheduleHealth || 'ON_TRACK',
      s.progressPercent || 0,
      s.assignedCraftsman || '',
      s.jigToolPreparation || '',
      s.btpReadinessNote || '',
      s.workstationTaskStatus || 'IN_PROGRESS',
      s.upstreamTeamId || '',
      s.estimatedArrivalHour || ''
    ]);
  }
}
