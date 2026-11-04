import React from 'react';
import { OrderItem } from '../types/mes';
import { Printer, X, Download, ShieldCheck, CheckSquare, Square } from 'lucide-react';

interface ProductionOrderPrintModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductionOrderPrintModal: React.FC<ProductionOrderPrintModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const isSale = order.orderType === 'G';
  const isDisplay = order.orderType === 'T';
  const isWarranty = order.orderType === 'B';

  const defaultVin = order.vinNumber || '65541';
  const contractNumber = order.contractRef || '496/GMG-DTHS/10.2026';
  const contactName = order.contactPerson || 'Lê Hoàng Long';
  const contactPhone = order.contactPhone || '0946825688';
  const deliveryPlace = order.deliveryLocation || 'Hà Nội / Chi Nhánh Cát Hải';
  const receiptDate = order.receivedDate || '2026-10-28';
  const handoverDate = order.dueDate || '2026-11-13';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Container */}
      <div className="bg-slate-100 rounded-xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:w-full print:max-h-none print:shadow-none print:bg-white print:rounded-none">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold tracking-tight">
              Biểu Mẫu Lệnh Sản Xuất Chuẩn ISO (CM-PR01-F01) · DCAR LIMOUSINE
            </h3>
            <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold ml-2">
              LSX: {order.id}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Lệnh Sản Xuất (Print / Lưu PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center print:p-0 print:overflow-visible">
          <div className="bg-white text-slate-950 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-md print:shadow-none border border-slate-300 print:border-none space-y-6 text-[12px] font-sans leading-normal">
            
            {/* ================= PAGE 1 ================= */}
            <div className="print-page space-y-4">
              
              {/* HEADER BOX */}
              <div className="border border-black flex justify-between items-stretch">
                {/* Left: Logo & Title */}
                <div className="p-3 flex items-center gap-4 flex-1 border-r border-black">
                  {/* DCAR Lion Crest Badge */}
                  <div className="w-16 h-16 border-2 border-black rounded-full flex flex-col items-center justify-center p-1 shrink-0 bg-slate-50">
                    <span className="font-black text-[9px] tracking-widest text-black">DCAR</span>
                    <span className="text-xl">🦁</span>
                    <span className="text-[7px] font-bold uppercase text-slate-600">VIP COACH</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-black leading-tight">
                      ĐƠN ĐẶT HÀNG
                    </h1>
                    <p className="font-mono text-sm font-bold text-black mt-0.5">
                      Số: GMG/2026/<span className="underline">{order.id}</span>
                    </p>
                  </div>
                </div>

                {/* Right: ISO Document Control Block */}
                <div className="w-56 text-[10px] font-sans divide-y divide-black font-medium">
                  <div className="px-2 py-1 flex justify-between">
                    <span>Số hiệu:</span>
                    <strong className="font-mono">CM-PR01-F01</strong>
                  </div>
                  <div className="px-2 py-1 flex justify-between">
                    <span>Lần ban hành:</span>
                    <span className="font-mono">03</span>
                  </div>
                  <div className="px-2 py-1 flex justify-between">
                    <span>Ngày ban hành:</span>
                    <span className="font-mono">01/03/2026</span>
                  </div>
                  <div className="px-2 py-1 flex justify-between">
                    <span>Lần sửa đổi:</span>
                    <span className="font-mono">01</span>
                  </div>
                  <div className="px-2 py-1 flex justify-between">
                    <span>Ngày hiệu lực:</span>
                    <span className="font-mono">01/03/2026</span>
                  </div>
                </div>
              </div>

              {/* TABLE 1: THÔNG TIN KHÁCH HÀNG */}
              <div className="border border-black">
                <div className="bg-slate-200 border-b border-black text-center font-bold uppercase py-1 text-[11px] tracking-wider">
                  THÔNG TIN KHÁCH HÀNG
                </div>
                <div className="grid grid-cols-12 divide-x divide-black text-[11px]">
                  {/* Left Column (8 cols) */}
                  <div className="col-span-8 divide-y divide-black">
                    <div className="p-1.5 flex gap-2">
                      <span className="font-semibold w-28 shrink-0">Khách hàng:</span>
                      <strong className="uppercase">{order.customerName}</strong>
                    </div>
                    <div className="p-1.5 flex gap-2">
                      <span className="font-semibold w-28 shrink-0">Số phiếu:</span>
                      <strong className="font-mono">{order.id}</strong>
                    </div>
                    <div className="p-1.5 flex gap-2">
                      <span className="font-semibold w-28 shrink-0">Số hợp đồng:</span>
                      <span className="font-mono">{contractNumber}</span>
                    </div>
                    <div className="p-1.5 flex gap-2">
                      <span className="font-semibold w-28 shrink-0">Người liên lạc:</span>
                      <strong>{contactName}</strong>
                    </div>
                  </div>

                  {/* Right Column (4 cols) */}
                  <div className="col-span-4 divide-y divide-black">
                    <div className="p-1.5 flex justify-between">
                      <span className="font-semibold">Thời gian nghiệm thu:</span>
                      <strong className="font-mono">{receiptDate}</strong>
                    </div>
                    <div className="p-1.5 flex justify-between">
                      <span className="font-semibold">Thời gian giao xe:</span>
                      <strong className="font-mono">{handoverDate}</strong>
                    </div>
                    <div className="p-1.5 flex justify-between">
                      <span className="font-semibold">Địa điểm giao xe:</span>
                      <span>{deliveryPlace}</span>
                    </div>
                    <div className="p-1.5 flex justify-between">
                      <span className="font-semibold">Điện thoại:</span>
                      <strong className="font-mono">{contactPhone}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLE 2: THÔNG TIN ĐƠN HÀNG */}
              <div className="border border-black">
                <div className="bg-slate-200 border-b border-black text-center font-bold uppercase py-1 text-[11px] tracking-wider">
                  THÔNG TIN ĐƠN HÀNG
                </div>
                <div className="grid grid-cols-12 divide-x divide-black text-[11px]">
                  <div className="col-span-4 p-2 space-y-1.5">
                    <span className="font-semibold block text-slate-700">Loại xe:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>☒</span>
                      <span>{order.baseModel}</span>
                    </div>
                  </div>

                  <div className="col-span-2 p-2 space-y-1.5">
                    <span className="font-semibold block text-slate-700">Màu xe:</span>
                    <span className="font-bold">{order.exteriorColor.split('(')[0]}</span>
                  </div>

                  <div className="col-span-3 p-2 space-y-1.5">
                    <span className="font-semibold block text-slate-700">Mục đích:</span>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span>{isSale ? '☒' : '☐'}</span>
                        <span>Hàng bán</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{isDisplay ? '☒' : '☐'}</span>
                        <span>Hàng mẫu (Trưng bày)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{isWarranty ? '☒' : '☐'}</span>
                        <span>Hàng tồn / Bảo hành</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 p-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-semibold">Phiên bản:</span>
                      <span className="font-bold">{order.seatCapacity} chỗ</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-900 leading-tight">
                      {order.conversionVersion}
                    </p>
                    <div className="pt-1 border-t border-slate-300 flex justify-between font-mono text-[10px]">
                      <span>Số khung: <strong>{defaultVin}</strong></span>
                      <span>SL: <strong>01</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLE 3: HẠNG MỤC SẢN XUẤT & QUY CÁCH KỸ THUẬT */}
              <div className="border border-black">
                <table className="w-full text-left text-[10.5px] border-collapse">
                  <thead>
                    <tr className="bg-slate-200 border-b border-black text-center font-bold">
                      <th className="py-1 px-2 border-r border-black w-10">STT</th>
                      <th className="py-1 px-3 border-r border-black w-48">HẠNG MỤC</th>
                      <th className="py-1 px-3">MÃ &amp; QUY CÁCH KỸ THUẬT CHẾ TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black font-sans">
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">1</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Bộ ghế da màu (Combo mặc định)</td>
                      <td className="py-1 px-3 font-semibold">
                        ☒ {order.interiorColor} · Da Nappa chuẩn Dcar cao cấp
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">2</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Ốp gỗ nội thất</td>
                      <td className="py-1 px-3">☒ A209 Đen bóng gương (Gỗ tự nhiên phủ 6 lớp sơn PU)</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">3</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Sạc không dây</td>
                      <td className="py-1 px-3">☒ Có &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Số lượng: 06 vị trí tại các bệ tỳ tay ghế VIP</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">4</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Massage</td>
                      <td className="py-1 px-3">☒ Có &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Số lượng: {order.seatCapacity >= 10 ? 10 : 'Toàn bộ'} ghế (Bộ massage hơi QZ 8 chế độ)</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">5</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Nâng chân</td>
                      <td className="py-1 px-3">☒ Có &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Số lượng: {Math.max(1, order.seatCapacity - 2)} bệ đỡ chân nâng hạ điện độc lập</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">6</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Đèn nhẫn Night Light</td>
                      <td className="py-1 px-3">☐ Không trang bị (Bỏ theo yêu cầu thiết kế không gian VIP)</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">7</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Hệ thống rèm</td>
                      <td className="py-1 px-3">☒ Mặc định: Rèm cửa nhập khẩu kéo tay chống tia cực tím UV 99%</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">8</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Trần xe</td>
                      <td className="py-1 px-3">☒ Mặc định: Cụm trần đèn LED 127 Blue vô cực &amp; Bầu trời sao sợi quang</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">9</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Vách</td>
                      <td className="py-1 px-3">☒ Mặc định: Ốp vách da Alcantara phối chỉ quả trám, hộc để ly composite</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">10</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Sàn</td>
                      <td className="py-1 px-3">☒ Mặc định: Sàn gỗ Teak du thuyền chống nước, dán 3 lớp cách âm Forch</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">11</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Thảm trải sàn</td>
                      <td className="py-1 px-3">☒ Mặc định: Thảm lót chân cao cấp may cữ chống trượt</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">12</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Tem</td>
                      <td className="py-1 px-3">☒ Theo thiết kế khách hàng: Tem mạ crôm &quot;Cung Điện Di Động&quot;</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">13</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Decal tấn số</td>
                      <td className="py-1 px-3">
                        <strong>{order.customerName}</strong><br />
                        <span className="text-[9.5px] text-slate-700">Địa chỉ: {deliveryPlace}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-center border-r border-black font-mono">14</td>
                      <td className="py-1 px-3 border-r border-black font-medium">Phim kính</td>
                      <td className="py-1 px-3">☒ Mặc định: Phim dán cách nhiệt Nano Ceramic cao cấp</td>
                    </tr>
                  </tbody>
                </table>

                {/* YÊU CẦU ĐẶC BIỆT */}
                <div className="border-t border-black p-2 bg-slate-50 space-y-1">
                  <span className="font-bold uppercase text-[10px] tracking-wider block text-slate-800">
                    YÊU CẦU ĐẶC BIỆT TỪ KHÁCH HÀNG &amp; THẨM ĐỊNH KỸ THUẬT:
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                    <div>1. Bỏ đèn nhẫn nội thất, thay màn hình Sony 4K 43&quot;</div>
                    <div>2. 2 Ghế phụ gộp thành 1 ghế VIP bệ sạc điện thoại</div>
                    <div>3. Nâng cốp xe lên 52cm tăng dung tích chứa đồ</div>
                    <div>4. Đăng ký phù hiệu Biển Vàng kinh doanh VIP</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PAGE BREAK INDICATOR (Print CSS handles actual page-break) */}
            <div className="hidden print:block page-break-after" />

            {/* ================= PAGE 2 ================= */}
            <div className="print-page pt-4 border-t-2 border-dashed border-slate-300 print:border-none print:pt-0 space-y-6">
              
              {/* Header Page 2 */}
              <div className="border border-black flex justify-between items-center px-4 py-2 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase">ĐƠN ĐẶT HÀNG - LỆNH SẢN XUẤT</span>
                  <span className="font-mono text-xs">({order.id})</span>
                </div>
                <div className="font-mono text-[10px]">
                  Số hiệu: <strong>CM-PR01-F01 (Trang 2/2)</strong>
                </div>
              </div>

              {/* Special Note Box */}
              <div className="border border-black p-3 space-y-1 text-[11px]">
                <strong className="block font-bold">HƯỚNG DẪN KIỂM SOÁT TỔ CHUYỀN (17 TỔ PHÂN XƯỞNG):</strong>
                <p className="text-[10.5px] text-slate-700 leading-relaxed">
                  Lệnh sản xuất này là căn cứ kỹ thuật pháp lý duy nhất để xuất kho vật tư HHCITY0B và triển khai chế tác qua 4 Cụm nghiệp vụ. Khi hoàn thành từng công đoạn, tổ trưởng phải ký xác nhận BTP và chuyển giao sang tổ kế tiếp qua hệ thống MES. Nghiêm cấm mọi hành vi tự ý sửa đổi quy cách khi chưa có phiếu đề nghị điều chỉnh kỹ thuật (ECO).
                </p>
              </div>

              {/* SIGNATURE GRID (5 VỊ TRÍ KÝ DUYỆT CHUẨN ISO) */}
              <div className="border border-black mt-8">
                <div className="bg-slate-200 border-b border-black text-center font-bold uppercase py-1 text-[11px] tracking-wider">
                  BẢNG KÝ DUYỆT BAN HÀNH LỆNH SẢN XUẤT (5 BÊN)
                </div>
                
                <div className="grid grid-cols-5 divide-x divide-black min-h-[140px] text-[10px]">
                  
                  {/* Column 1: Người đặt hàng */}
                  <div className="p-2 flex flex-col justify-between text-center">
                    <div>
                      <span className="font-bold block">Người đặt hàng</span>
                      <span className="text-[9px] text-slate-600 block">(Ký &amp; họ tên)</span>
                    </div>
                    <div className="mt-auto pt-8">
                      <span className="font-bold text-slate-800">{contactName}</span>
                      <span className="block text-[8.5px] text-slate-500 font-mono">Ngày: {receiptDate}</span>
                    </div>
                  </div>

                  {/* Column 2: Người nhận đơn hàng (KD/Admin) */}
                  <div className="p-2 flex flex-col justify-between text-center">
                    <div>
                      <span className="font-bold block">Người nhận đơn hàng</span>
                      <span className="text-[9px] text-slate-600 block">(Ký &amp; họ tên)</span>
                    </div>
                    {/* Electronic signature representation */}
                    <div className="my-auto py-1">
                      <span className="font-serif italic text-blue-700 font-black text-sm block">Thảo</span>
                    </div>
                    <div className="mt-auto">
                      <span className="font-bold text-slate-900 block">Huỳnh Thị Thu Thảo</span>
                      <span className="text-[8.5px] text-slate-500 font-mono">Ngày: {receiptDate}</span>
                    </div>
                  </div>

                  {/* Column 3: Trưởng P.SX / Nhân viên KHSX */}
                  <div className="p-2 flex flex-col justify-between text-center">
                    <div>
                      <span className="font-bold block">Trưởng P.SX / KHSX</span>
                      <span className="text-[9px] text-slate-600 block">(Ký &amp; họ tên)</span>
                    </div>
                    <div className="my-auto py-1">
                      <span className="font-serif italic text-blue-700 font-black text-sm block">Ng. T. Anh</span>
                    </div>
                    <div className="mt-auto">
                      <span className="font-bold text-slate-900 block">Nguyễn Tuấn Anh</span>
                      <span className="text-[8.5px] text-slate-500 font-mono">Ngày: 29.10.2026</span>
                    </div>
                  </div>

                  {/* Column 4: Kế toán trưởng */}
                  <div className="p-2 flex flex-col justify-between text-center">
                    <div>
                      <span className="font-bold block">Kế toán trưởng</span>
                      <span className="text-[9px] text-slate-600 block">(Ký &amp; họ tên)</span>
                    </div>
                    <div className="my-auto py-1">
                      <span className="font-serif italic text-blue-700 font-black text-sm block">V. T. Mai</span>
                    </div>
                    <div className="mt-auto">
                      <span className="font-bold text-slate-900 block">Vũ Thị Mai</span>
                      <span className="text-[8.5px] text-slate-500 font-mono">Ngày: 29.10.2026</span>
                    </div>
                  </div>

                  {/* Column 5: Giám đốc sản xuất */}
                  <div className="p-2 flex flex-col justify-between text-center bg-slate-50">
                    <div>
                      <span className="font-bold block">Giám đốc sản xuất</span>
                      <span className="text-[9px] text-slate-600 block">(Ký &amp; họ tên)</span>
                    </div>
                    {/* Official Stamp badge */}
                    <div className="my-auto py-1">
                      <div className="w-12 h-12 mx-auto rounded-full border-2 border-rose-600 text-rose-600 flex flex-col items-center justify-center rotate-[-12deg] p-0.5 opacity-90">
                        <span className="text-[6px] font-black uppercase tracking-tighter">DCAR AUTO</span>
                        <span className="text-[6.5px] font-bold">ĐÃ DUYỆT</span>
                        <span className="text-[5px]">KH-2026</span>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <span className="font-bold text-slate-900 block">Trần Đình Khang</span>
                      <span className="text-[8.5px] text-slate-500 font-mono">Ngày: 30.10.2026</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode and Footer Verification */}
              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xác thực hệ thống MES DCAR Coachbuilder · Mã kiểm soát: SHA256-DCAR-{order.id}</span>
                </div>
                <span>Trang 2 / 2</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="bg-slate-200 border-t border-slate-300 px-5 py-3 flex items-center justify-between shrink-0 print:hidden">
          <p className="text-xs text-slate-600 font-mono">
            Biểu mẫu CM-PR01-F01 tự động điền đầy đủ dữ liệu theo hồ sơ đơn hàng <strong>{order.id}</strong>.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>In Lệnh Sản Xuất Ngay</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
