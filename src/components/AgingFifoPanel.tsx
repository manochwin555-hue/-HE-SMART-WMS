import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, 
  Sliders, 
  Save, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Info,
  Layers,
  CheckCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Check
} from 'lucide-react';
import { AgingThresholdConfig, InventoryItem } from '../types';
import { evaluateVinylWrappingRule, getBangkokDate } from '../utils/vinylWrappingRule';

interface AgingFifoPanelProps {
  agingConfig: AgingThresholdConfig;
  setAgingConfig?: (config: AgingThresholdConfig) => void;
  items: InventoryItem[];
}

export const AgingFifoPanel: React.FC<AgingFifoPanelProps> = ({
  agingConfig,
  setAgingConfig,
  items
}) => {
  // Local temporary state for editing configuration freely
  const [tempAgingConfig, setTempAgingConfig] = useState<AgingThresholdConfig>(() => ({
    safeDaysMin: agingConfig.safeDaysMin ?? 0,
    safeDaysMax: agingConfig.safeDaysMax ?? 21,
    warningDaysMin: agingConfig.warningDaysMin ?? 22,
    warningDaysMax: agingConfig.warningDaysMax ?? 24,
    urgentDaysMin: agingConfig.urgentDaysMin ?? 25,
    urgentDaysMax: agingConfig.urgentDaysMax ?? 27,
    dueDay: agingConfig.dueDay ?? 28,
    criticalDays: agingConfig.criticalDays ?? 28,
    indoorRubberCapDays: agingConfig.indoorRubberCapDays ?? 28,
    autoAlertEnabled: agingConfig.autoAlertEnabled ?? true,
    notifyOnFifoViolation: agingConfig.notifyOnFifoViolation ?? true,
    customRuleName: agingConfig.customRuleName || 'มาตรฐาน Vinyl Wrapping 5 ระดับ (รอบ 28 วัน)'
  }));

  // Sync with incoming agingConfig prop if changed externally
  useEffect(() => {
    setTempAgingConfig(prev => ({
      safeDaysMin: agingConfig.safeDaysMin ?? prev.safeDaysMin ?? 0,
      safeDaysMax: agingConfig.safeDaysMax ?? prev.safeDaysMax ?? 21,
      warningDaysMin: agingConfig.warningDaysMin ?? prev.warningDaysMin ?? 22,
      warningDaysMax: agingConfig.warningDaysMax ?? prev.warningDaysMax ?? 24,
      urgentDaysMin: agingConfig.urgentDaysMin ?? prev.urgentDaysMin ?? 25,
      urgentDaysMax: agingConfig.urgentDaysMax ?? prev.urgentDaysMax ?? 27,
      dueDay: agingConfig.dueDay ?? prev.dueDay ?? 28,
      criticalDays: agingConfig.criticalDays ?? prev.criticalDays ?? 28,
      indoorRubberCapDays: agingConfig.indoorRubberCapDays ?? prev.indoorRubberCapDays ?? 28,
      autoAlertEnabled: agingConfig.autoAlertEnabled ?? prev.autoAlertEnabled ?? true,
      notifyOnFifoViolation: agingConfig.notifyOnFifoViolation ?? prev.notifyOnFifoViolation ?? true,
      customRuleName: agingConfig.customRuleName || prev.customRuleName || 'มาตรฐาน Vinyl Wrapping 5 ระดับ (รอบ 28 วัน)'
    }));
  }, [agingConfig]);

  const [agingSaveSuccessMsg, setAgingSaveSuccessMsg] = useState<string | null>(null);

  // Active / Editable parameters with guaranteed fallback
  const safeDaysMin = tempAgingConfig.safeDaysMin ?? 0;
  const safeDaysMax = tempAgingConfig.safeDaysMax ?? 21;
  const warningDaysMin = tempAgingConfig.warningDaysMin ?? 22;
  const warningDaysMax = tempAgingConfig.warningDaysMax ?? 24;
  const urgentDaysMin = tempAgingConfig.urgentDaysMin ?? 25;
  const urgentDaysMax = tempAgingConfig.urgentDaysMax ?? 27;
  const dueDay = tempAgingConfig.dueDay ?? 28;
  const criticalDays = tempAgingConfig.criticalDays ?? 28;
  const indoorRubberCapDays = tempAgingConfig.indoorRubberCapDays ?? 28;

  // Reset to the official 28-day standard
  const handleResetToStandard = () => {
    const standardConfig: AgingThresholdConfig = {
      safeDaysMin: 0,
      safeDaysMax: 21,
      warningDaysMin: 22,
      warningDaysMax: 24,
      urgentDaysMin: 25,
      urgentDaysMax: 27,
      dueDay: 28,
      criticalDays: 28,
      indoorRubberCapDays: 28,
      autoAlertEnabled: true,
      notifyOnFifoViolation: true,
      customRuleName: 'มาตรฐาน Vinyl Wrapping 5 ระดับ (รอบ 28 วัน)'
    };
    setTempAgingConfig(standardConfig);
    setAgingSaveSuccessMsg('🔄 รีเซ็ตเป็นเกณฑ์มาตรฐาน 28 วัน (21 / 24 / 27 / 28 วัน) เรียบร้อยแล้ว');
    setTimeout(() => setAgingSaveSuccessMsg(null), 4000);
  };

  // Helper to auto-chain consecutive thresholds based on user inputs
  const handleAutoChainDays = () => {
    const sMax = tempAgingConfig.safeDaysMax || 21;
    const wMin = sMax + 1;
    const wMax = Math.max(wMin, tempAgingConfig.warningDaysMax || (wMin + 2));
    const uMin = wMax + 1;
    const uMax = Math.max(uMin, tempAgingConfig.urgentDaysMax || (uMin + 2));
    const dDay = uMax + 1;
    const cDay = dDay;

    setTempAgingConfig(prev => ({
      ...prev,
      safeDaysMin: 0,
      safeDaysMax: sMax,
      warningDaysMin: wMin,
      warningDaysMax: wMax,
      urgentDaysMin: uMin,
      urgentDaysMax: uMax,
      dueDay: dDay,
      criticalDays: cDay,
      indoorRubberCapDays: cDay
    }));
    setAgingSaveSuccessMsg('⚡ จัดเรียงช่วงวันต่อเนื่องอัตโนมัติเรียบร้อยแล้ว');
    setTimeout(() => setAgingSaveSuccessMsg(null), 3000);
  };

  // Save handler: applies to parent state & localStorage
  const handleSave = () => {
    if (setAgingConfig) {
      setAgingConfig(tempAgingConfig);
    }
    // Also persist to localStorage
    try {
      localStorage.setItem('lge_wms_aging_config', JSON.stringify(tempAgingConfig));
    } catch {
      // ignore
    }
    setAgingSaveSuccessMsg(
      `✅ บันทึกเกณฑ์ Aging สำเร็จ! Normal: 0-${safeDaysMax} วัน | Warning: ${warningDaysMin}-${warningDaysMax} วัน | Urgent: ${urgentDaysMin}-${urgentDaysMax} วัน | Due Today: ${dueDay} วัน | Expired: >${criticalDays} วัน`
    );
    setTimeout(() => setAgingSaveSuccessMsg(null), 6000);
  };

  // Real-time calculation across inventory items using currently edited thresholds
  const stats = useMemo(() => {
    let normalCount = 0;
    let warningCount = 0;
    let urgentCount = 0;
    let dueTodayCount = 0;
    let expiredCount = 0;
    let rubberCapCount = 0;
    let rubberCapGroup1Count = 0; // CY3, A5 (Outdoor: Day 0+)
    let rubberCapGroup2Count = 0; // A2, A4 (Indoor: > indoorRubberCapDays)

    items.forEach(it => {
      const days = it.agingDays ?? 0;
      const loc = `${it.facilityId || ''} ${it.zone || ''} ${it.locatorCode || ''}`.toUpperCase();
      const status = it.agingStatus;

      // 5-Level Aging status evaluation
      if (days > criticalDays || status === 'EXPIRED' || status === 'OVERDUE' || status === 'CONDITION_NG') {
        expiredCount++;
      } else if (days === dueDay || status === 'DUE_TODAY') {
        dueTodayCount++;
      } else if ((days >= urgentDaysMin && days <= urgentDaysMax) || status === 'URGENT') {
        urgentCount++;
      } else if ((days >= warningDaysMin && days <= warningDaysMax) || status === 'WARNING') {
        warningCount++;
      } else {
        normalCount++;
      }

      // Location & Rubber cap evaluation
      // กลุ่มที่ 1 (CY3 & A5 นอกอาคาร): บังคับใส่จุกยาง (Rubber Cap) ทันทีตั้งแต่วันแรก (Day 0+)
      // กลุ่มที่ 2 (A2 & A4 ในอาคาร): อนุโลมในอาคาร (Delayed) โดยจะต้องตรวจสอบ Wrapping หรือใส่ Rubber Cap เมื่ออายุเกิน 4 สัปดาห์ (> 28 วันขึ้นไป)
      const isGroup1 = loc.includes('CY3') || loc.includes('A5') || loc.includes('OUTDOOR') || loc.includes('CANOPY');
      const isGroup2 = loc.includes('A2') || loc.includes('A4') || loc.includes('INDOOR');

      if (isGroup1) {
        rubberCapCount++;
        rubberCapGroup1Count++;
      } else if (isGroup2) {
        if (days > indoorRubberCapDays) {
          rubberCapCount++;
          rubberCapGroup2Count++;
        }
      } else {
        if (days > indoorRubberCapDays) {
          rubberCapCount++;
          rubberCapGroup2Count++;
        }
      }
    });

    const total = items.length || 1;

    return {
      total: items.length,
      normalCount,
      warningCount,
      urgentCount,
      dueTodayCount,
      expiredCount,
      rubberCapCount,
      rubberCapGroup1Count,
      rubberCapGroup2Count,
      normalPct: Math.round((normalCount / total) * 100),
      warningPct: Math.round((warningCount / total) * 100),
      urgentPct: Math.round((urgentCount / total) * 100),
      dueTodayPct: Math.round((dueTodayCount / total) * 100),
      expiredPct: Math.round((expiredCount / total) * 100),
      rubberCapPct: Math.round((rubberCapCount / total) * 100)
    };
  }, [items, safeDaysMax, warningDaysMin, warningDaysMax, urgentDaysMin, urgentDaysMax, dueDay, criticalDays, indoorRubberCapDays]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Info Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-sm">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>กำหนดเกณฑ์อายุสินค้า (Custom Aging & FIFO Thresholds)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                Vinyl Wrapping 28 วัน
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              จัดการเกณฑ์จำแนกอายุสินค้า 5 ระดับ พร้อมเงื่อนไขการใส่จุกยาง (Rubber Cap) ตามพื้นที่จัดเก็บ ระบบซิงก์ผลลัพธ์คำนวณในหน้าผังรวม, หน้าสต็อก & Safety Stock และหน้าพิมพ์ฉลาก QR Code ทันที
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetToStandard}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="รีเซ็ตค่าเป็นเกณฑ์มาตรฐาน 28 วัน (21 / 24 / 27 / 28 วัน)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>คืนค่ามาตรฐาน 28 วัน</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-600 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Asia/Bangkok (UTC+7)</span>
          </div>
        </div>
      </div>

      {/* Config Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 5 Levels Thresholds + Location Rules (col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>เกณฑ์อายุสินค้า 5 ระดับ (5-Level Aging Parameters)</span>
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Rule: {tempAgingConfig.customRuleName || 'มาตรฐาน Vinyl Wrapping (28 วัน)'}
              </span>
            </div>
          </div>

          {/* Rule Name Input + Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">ชื่อเกณฑ์ / ชื่อนโยบาย (Rule Name):</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutoChainDays}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title="ช่วยต่อช่วงวันแต่ละระดับให้อัตโนมัติ (Chain)"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>ต่อช่วงวันอัตโนมัติ</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              value={tempAgingConfig.customRuleName || ''}
              onChange={(e) => setTempAgingConfig({ ...tempAgingConfig, customRuleName: e.target.value })}
              placeholder="เช่น มาตรฐาน Vinyl Wrapping 5 ระดับ (รอบ 28 วัน)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 5 Levels Configuration List - ALL FREELY EDITABLE */}
          <div className="space-y-2.5">
            {/* Level 1: NORMAL */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 hover:bg-emerald-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <div>
                  <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <span>1. NORMAL (กลุ่มปลอดภัย)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono font-bold">Safe</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">สินค้าใหม่ หมุนเวียนตามแผนปกติ (0 ถึง {safeDaysMax} วัน)</div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-slate-500 font-sans">0 ถึง</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.safeDaysMax ?? 21}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      safeDaysMax: val
                    });
                  }}
                  className="w-16 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-emerald-900 text-center text-xs font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs font-bold text-emerald-800 font-sans">วัน</span>
              </div>
            </div>

            {/* Level 2: WARNING */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 hover:bg-amber-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                <div>
                  <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <span>2. WARNING (กลุ่มเฝ้าระวัง)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono font-bold">Watch</span>
                  </div>
                  <div className="text-[11px] text-amber-700 mt-0.5">เริ่มมีอายุ เตรียมแผนเบิกจ่ายล่วงหน้า ({warningDaysMin} ถึง {warningDaysMax} วัน)</div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.warningDaysMin ?? 22}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      warningDaysMin: val
                    });
                  }}
                  className="w-16 bg-white border border-amber-300 rounded-lg px-2 py-1 text-amber-900 text-center text-xs font-black focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs text-slate-500 font-sans">ถึง</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.warningDaysMax ?? 24}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      warningDaysMax: val
                    });
                  }}
                  className="w-16 bg-white border border-amber-300 rounded-lg px-2 py-1 text-amber-900 text-center text-xs font-black focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs font-bold text-amber-800 font-sans">วัน</span>
              </div>
            </div>

            {/* Level 3: URGENT */}
            <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl flex flex-wrap items-center justify-between gap-3 hover:bg-orange-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                <div>
                  <div className="text-xs font-black text-orange-900 flex items-center gap-1.5">
                    <span>3. URGENT (กลุ่มเร่งด่วน)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-orange-100 text-orange-800 rounded font-mono font-bold">Urgent</span>
                  </div>
                  <div className="text-[11px] text-orange-700 mt-0.5">ใกล้หมดอายุ ต้องเร่งเคลียร์สต็อกเข้าไลน์ผลิต ({urgentDaysMin} ถึง {urgentDaysMax} วัน)</div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.urgentDaysMin ?? 25}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      urgentDaysMin: val
                    });
                  }}
                  className="w-16 bg-white border border-orange-300 rounded-lg px-2 py-1 text-orange-900 text-center text-xs font-black focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs text-slate-500 font-sans">ถึง</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.urgentDaysMax ?? 27}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      urgentDaysMax: val
                    });
                  }}
                  className="w-16 bg-white border border-orange-300 rounded-lg px-2 py-1 text-orange-900 text-center text-xs font-black focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs font-bold text-orange-800 font-sans">วัน</span>
              </div>
            </div>

            {/* Level 4: DUE TODAY */}
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-3 hover:bg-rose-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"></div>
                <div>
                  <div className="text-xs font-black text-red-900 flex items-center gap-1.5">
                    <span>4. DUE TODAY (ครบกำหนดวันนี้)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-red-100 text-red-800 rounded font-mono font-bold">Day {dueDay}</span>
                  </div>
                  <div className="text-[11px] text-red-700 mt-0.5">ครบกำหนด {dueDay} วันพอดี ถือเป็นวันสุดท้ายของรอบการจัดเก็บ</div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-slate-500 font-sans">ครบกำหนดที่</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.dueDay ?? 28}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      dueDay: val
                    });
                  }}
                  className="w-16 bg-white border border-red-300 rounded-lg px-2 py-1 text-red-900 text-center text-xs font-black focus:ring-2 focus:ring-red-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs font-bold text-red-800 font-sans">วัน</span>
              </div>
            </div>

            {/* Level 5: EXPIRED */}
            <div className="p-3 bg-red-100/70 border border-red-300 rounded-xl flex flex-wrap items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
              <div className="flex items-center gap-3 pl-2">
                <div className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.7)] animate-pulse"></div>
                <div>
                  <div className="text-xs font-black text-red-900 flex items-center gap-1.5">
                    <span>5. EXPIRED (ค้างเกินเกณฑ์วิกฤต)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-red-200 text-red-900 rounded font-mono font-bold">Action Needed</span>
                  </div>
                  <div className="text-[11px] text-red-700 mt-0.5">หมดอายุ ต้องตรวจสอบสภาพพลาสติก / Re-wrapping / บังคับใส่จุกยาง (&gt; {criticalDays} วัน)</div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-red-700 font-sans">มากกว่า &gt;</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={tempAgingConfig.criticalDays ?? 28}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setTempAgingConfig({
                      ...tempAgingConfig,
                      criticalDays: val
                    });
                  }}
                  className="w-16 bg-white border border-red-400 rounded-lg px-2 py-1 text-red-900 text-center text-xs font-black focus:ring-2 focus:ring-red-500 focus:outline-none shadow-2xs"
                />
                <span className="text-xs font-bold text-red-800 font-sans">วัน</span>
              </div>
            </div>
          </div>

          {/* Location-based Rules for Rubber Cap */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>กฎการใส่จุกยางตามพื้นที่จัดเก็บ (Location-based Rubber Cap Rules)</span>
            </h4>
            <p className="text-xs text-slate-500">
              การบังคับใส่จุกยางเพื่อป้องกันชิ้นส่วนเสียหาย โดยแบ่งเงื่อนไขตามพื้นที่จัดเก็บภายนอก vs ภายในอาคาร สามารถปรับช่วงวันได้อย่างอิสระ
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Group 1: Outside / Tent */}
              <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>กลุ่มที่ 1: บังคับใส่จุกยาง (ทันที)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-mono">
                    Day 0+ (บังคับทันที)
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  พื้นที่นอกอาคารหรือเต็นท์ มีความชื้นและสภาพแวดล้อมเสี่ยง <strong>ต้องใส่จุกยางป้องกันตั้งแต่วันแรกที่รับเข้าจัดเก็บ (Day 0+)</strong>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-md text-[11px] font-bold text-amber-900 shadow-2xs">
                    📍 CY3 (ลานนอก)
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-md text-[11px] font-bold text-amber-900 shadow-2xs">
                    ⛺ A5 Tent 1 - 4
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-md text-[11px] font-bold text-amber-900 shadow-2xs">
                    🌧️ OUTDOOR / CANOPY
                  </span>
                </div>
              </div>

              {/* Group 2: Indoor Building */}
              <div className="bg-blue-50/70 border border-blue-300/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-900 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>กลุ่มที่ 2: อนุโลมในอาคาร (Delayed)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-200 text-blue-900 rounded-full font-mono">
                    &gt; {indoorRubberCapDays} วัน
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  พื้นที่ในอาคารปิดมิดชิด <strong>ยังไม่ต้องใส่จุกยาง</strong> ยกเว้นกรณีสินค้ามีอายุเกิน 4 สัปดาห์ (&gt; {indoorRubberCapDays} วันขึ้นไป) จึงต้องตรวจสอบ Wrapping หรือใส่ Rubber Cap ทันที
                </p>
                
                {/* Editable Threshold for Indoor Rubber Cap */}
                <div className="flex items-center gap-2 font-mono bg-white/80 p-2 rounded-lg border border-blue-200">
                  <span className="text-xs text-blue-900 font-sans font-bold">บังคับใส่เมื่ออายุเกิน &gt;</span>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={tempAgingConfig.indoorRubberCapDays ?? 28}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setTempAgingConfig({
                        ...tempAgingConfig,
                        indoorRubberCapDays: val
                      });
                    }}
                    className="w-16 bg-white border border-blue-400 rounded-lg px-2 py-1 text-blue-900 text-center text-xs font-black focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                  />
                  <span className="text-xs font-bold text-blue-900 font-sans">วัน (รอบ 4 สัปดาห์)</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2.5 py-1 bg-white border border-blue-300 rounded-md text-[11px] font-bold text-blue-900 shadow-2xs">
                    🏢 A2 (อาคารผลิต)
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-blue-300 rounded-md text-[11px] font-bold text-blue-900 shadow-2xs">
                    🏢 A4 (คลังหลัก Selective Rack)
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-blue-300 rounded-md text-[11px] font-bold text-blue-900 shadow-2xs">
                    📦 INDOOR STORAGE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center space-x-2.5 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={tempAgingConfig.autoAlertEnabled}
                onChange={(e) => setTempAgingConfig({ ...tempAgingConfig, autoAlertEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>เปิดระบบแจ้งเตือนสีแดงกะพริบในหน้าผังเมื่อพบสต็อกค้างเกินเกณฑ์ (Blinking Alert)</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={tempAgingConfig.notifyOnFifoViolation}
                onChange={(e) => setTempAgingConfig({ ...tempAgingConfig, notifyOnFifoViolation: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>แจ้งเตือนเมื่อเจ้าหน้าที่สแกนเบิกสินค้าใหม่ก่อนสินค้าเก่า (FIFO Violation Prevention)</span>
            </label>
          </div>

          {/* Save Button & Message */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {agingSaveSuccessMsg ? (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center space-x-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{agingSaveSuccessMsg}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                * ค่าที่แก้ไขจะถูกนำไปใช้ประเมินทันทีเมื่อกดบันทึก
              </span>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={handleResetToStandard}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                คืนค่ามาตรฐาน
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกและปรับใช้เกณฑ์ทันที (Save & Apply)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Impact Analyzer across Inventory (col-span-5) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-800">
                การวิเคราะห์ผลกระทบ Real-Time (Live Impact)
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-2 mb-4">
              จากสต็อกทั้งหมด <strong>{stats.total} รายการ</strong> ในคลังสินค้า การจัดกลุ่มตามเกณฑ์ 5 ระดับปัจจุบัน:
            </p>

            {/* Impact Breakdown Cards - 5 Levels */}
            <div className="space-y-2.5">
              {/* 1. NORMAL */}
              <div className="p-2.5 bg-white border border-emerald-200 rounded-xl shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>🟢 1. NORMAL (0 - {safeDaysMax} วัน)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-3.5">หมุนเวียนตามแผนปกติ</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-black text-emerald-600">{stats.normalCount} รายการ</div>
                  <div className="text-[10px] text-slate-400 font-bold">{stats.normalPct}%</div>
                </div>
              </div>

              {/* 2. WARNING */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-xl shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-800 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>🟡 2. WARNING ({warningDaysMin} - {warningDaysMax} วัน)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-3.5">เริ่มมีอายุ เตรียมแผนเบิก</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-black text-amber-600">{stats.warningCount} รายการ</div>
                  <div className="text-[10px] text-slate-400 font-bold">{stats.warningPct}%</div>
                </div>
              </div>

              {/* 3. URGENT */}
              <div className="p-2.5 bg-white border border-orange-200 rounded-xl shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-orange-800 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>🟠 3. URGENT ({urgentDaysMin} - {urgentDaysMax} วัน)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-3.5">ใกล้หมดอายุ ต้องเร่งเบิก</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-black text-orange-600">{stats.urgentCount} รายการ</div>
                  <div className="text-[10px] text-slate-400 font-bold">{stats.urgentPct}%</div>
                </div>
              </div>

              {/* 4. DUE TODAY */}
              <div className="p-2.5 bg-white border border-red-200 rounded-xl shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-red-800 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span>🔴 4. DUE TODAY ({dueDay} วัน)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-3.5">วันสุดท้ายของรอบการจัดเก็บ</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-black text-red-600">{stats.dueTodayCount} รายการ</div>
                  <div className="text-[10px] text-slate-400 font-bold">{stats.dueTodayPct}%</div>
                </div>
              </div>

              {/* 5. EXPIRED */}
              <div className="p-2.5 bg-white border border-red-300 rounded-xl shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-red-900 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    <span>🚨 5. EXPIRED (&gt; {criticalDays} วัน)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-3.5">หมดอายุ ตรวจสอบ/Re-wrap</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-black text-red-700">{stats.expiredCount} รายการ</div>
                  <div className="text-[10px] text-slate-400 font-bold">{stats.expiredPct}%</div>
                </div>
              </div>
            </div>

            {/* Rubber Cap Requirement Card */}
            <div className="mt-4 p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-black text-amber-900">
                  <span>🧢 ชิ้นส่วนที่ต้องใส่ Rubber Cap:</span>
                </div>
                <span className="text-sm font-mono font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg">
                  {stats.rubberCapCount} รายการ ({stats.rubberCapPct}%)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-600 pt-1 border-t border-amber-200/60">
                <div className="bg-white/70 p-1.5 rounded border border-amber-200/60">
                  <span className="font-bold text-amber-800">CY3 & A5 นอกอาคาร:</span>
                  <div className="font-mono font-bold text-slate-800">{stats.rubberCapGroup1Count} รายการ (บังคับทันที Day 0+)</div>
                </div>
                <div className="bg-white/70 p-1.5 rounded border border-amber-200/60">
                  <span className="font-bold text-blue-800">A2 & A4 ในอาคาร:</span>
                  <div className="font-mono font-bold text-slate-800">{stats.rubberCapGroup2Count} รายการ (&gt; {indoorRubberCapDays} วัน)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1 mt-4">
            <div className="font-bold flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>นโยบาย Vinyl Wrapping 28 วัน:</span>
            </div>
            <p className="text-blue-800/80 leading-relaxed">
              การ Re-wrapping ชิ้นส่วนจะไม่รีเซ็ตวันที่เริ่มจัดเก็บเดิม (Start Date Protection) และสินค้าที่เสียหาย (Condition NG) จะถูกคัดแยกทันที
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
