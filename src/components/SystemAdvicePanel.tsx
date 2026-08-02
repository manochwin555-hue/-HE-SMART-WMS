import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  AlertTriangle, 
  QrCode, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Smartphone,
  Zap
} from 'lucide-react';

export const SystemAdvicePanel: React.FC = () => {
  const comparison = [
    {
      topic: '1. การแสดงผลพื้นที่คลัง (Warehouse Layout)',
      odooIssue: 'แสดงผลแบบ 2D กล่องแบนๆ มองไม่เห็นชั้นวางแนวตั้ง (Vertical Levels)',
      solution: '3D Rack Inspector พร้อมแยกระดับความสูง 4 ชั้น (ชั้น 1-4) สามารถหมุนดู 360° และคลิกส่องสินค้าทีละชั้นได้',
      status: 'SOLVED'
    },
    {
      topic: '2. เสถียรภาพข้อมูล & สูตรคำนวณ (Data Reliability)',
      odooIssue: 'พบข้อผิดพลาด #BAD_EXPR ในตาราง Spreadsheet ทำให้คำนวณยอดคงเหลือผิดพลาด',
      solution: 'ระบบจัดการ State และ TypeScript Data Validation คำนวณ ยอดรับ/ยอดจ่าย/Gap อัตโนมัติ ปราศจากข้อผิดพลาด',
      status: 'SOLVED'
    },
    {
      topic: '3. ระบบควบคุมการหมดอายุ & FIFO',
      odooIssue: 'ต้องกดดูวันค้างคลังเอง ไม่มีระบบแจ้งเตือนการเลือกเบิกของเก่าก่อน',
      solution: 'อัลกอริทึม FIFO Priority List แจ้งเตือนสินค้าค้างคลังเกิน 30 วัน พร้อมปุ่มเลือกเบิกก่อนทันที',
      status: 'SOLVED'
    },
    {
      topic: '4. ความเร็วในการยิงสแกนบาร์โค้ด QR (Scanning Workflow)',
      odooIssue: 'ต้องเปิดเข้าหน้า Form Odoo กรอกช่องข้อมูลหลายช่อง เสียเวลาสแกนหน้าร้าน',
      solution: 'Quick Scan Drawer รองรับยิง QR ครั้งเดียวแยก Model, Date, Qty, Line อัตโนมัติ (Full QR Scan One Save)',
      status: 'SOLVED'
    },
    {
      topic: '5. การตรวจนับจำนวนจริง vs ป้าย (Discrepancy Audit)',
      odooIssue: 'เมื่อจำนวนนับจริงไม่ตรงกับป้าย (Qty Gap) ไม่มีระบบ Flag เตือนการตรวจสอบ',
      solution: 'ระบบคัดแยก Qty Gap และแจ้งเตือนหัวหน้าคลังสินค้าเพื่ออนุมัติส่วนต่างก่อนปรับยอด',
      status: 'SOLVED'
    }
  ];

  const recommendations = [
    {
      icon: Smartphone,
      title: '1. รองรับเครื่องสแกนมือถือ Handheld PDA (Zebra/Honeywell)',
      desc: 'ออกแบบ UI แบบ Mobile-First และ PWA เพื่อให้เจ้าหน้าที่จัดเก็บใช้เครื่องสแกนพกพายิงบาร์โค้ด QR บนชั้นวาง Rack ได้สะดวกโดยไม่ต้องถือโน้ตบุ๊ก'
    },
    {
      icon: Database,
      title: '2. เชื่อมต่อ API Sync ข้อมูลสองทางกับ Odoo ERP (Bi-directional API)',
      desc: 'ทำ Webhook และ REST API เชื่อมต่อกับ Odoo เพื่อให้เมื่อสแกนรับ-จ่ายใน WMS ใหม่นี้ ระบบจะไปอัปเดต Stock Move ใน Odoo อัตโนมัติ'
    },
    {
      icon: ShieldCheck,
      title: '3. ระบบพิมพ์ป้าย Barcode / Location Label อัตโนมัติ',
      desc: 'ต่อตรงกับพริ้นเตอร์ป้ายสติ๊กเกอร์ (Zebra/TSC) สำหรับพิมพ์ QR Code ประจำช่อง Rack เช่น DA4D-1.05-E6-L4 (ชั้น 4)'
    },
    {
      icon: Cpu,
      title: '4. AI Smart Location Assignment (แนะนำชั้นวางอัจฉริยะ)',
      desc: 'เมื่อสแกนรับวัตถุดิบเข้าคลัง ระบบ AI จะแนะนำช่อง Rack และชั้นความสูงที่ว่างเหมาะสมที่สุด โดยคำนึงถึงน้ำหนัก (สินค้าหนักวางชั้น 1-2, สินค้าเบาวางชั้น 3-4)'
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <div className="p-3 rounded-xl bg-blue-600 text-white shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            รายงานการวิเคราะห์และข้อเสนอแนะปรับปรุงระบบ WMS (Odoo Improvement)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            สรุปการแก้ไขจุดบกพร่องจากระบบ Odoo เดิม และแนวทางการยกระดับคลังสินค้าสู่ Smart Warehouse
          </p>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-blue-600" />
          <span>เปรียบเทียบระบบเดิม (Odoo Custom) vs ระบบปรับปรุงใหม่ (HE Smart WMS)</span>
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {comparison.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-sm text-slate-900">{item.topic}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Odoo Issue */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-start space-x-2">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-800 block mb-0.5">ข้อจำกัดของ Odoo เดิม:</span>
                    <span>{item.odooIssue}</span>
                  </div>
                </div>

                {/* Solution */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-800 block mb-0.5">การปรับปรุงแก้ไขใหม่:</span>
                    <span>{item.solution}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Future Roadmap & Features */}
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>คำแนะนำฟังก์ชันที่ควรเพิ่มในอนาคต (Roadmap Recommendations)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => {
            const Icon = rec.icon;
            return (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 shadow-sm transition-all space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{rec.title}</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-11">
                  {rec.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
