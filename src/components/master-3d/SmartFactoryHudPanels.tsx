import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Grid,
  Layers,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { AgingThresholdConfig } from '../../types';
import {
  AGING_TIER_META,
  AgingTier,
  BuildingKey,
  FactoryAlertItem,
  SmartFactoryTelemetry,
  resolveEffectiveAgingThresholds,
} from './smartFactoryTelemetry';

export interface BuildingMetaInfo {
  key: BuildingKey;
  name: string;
  shortName: string;
  targetNavigation: 'A2_RAIL' | 'A4_FLOOR' | 'A4_RACK' | 'CY3_TENT' | 'A5_TENT';
  description: string;
  accentHex: string;
}

interface BottomHudPanelProps {
  open: boolean;
  onToggleOpen: () => void;
  telemetry: SmartFactoryTelemetry;
  agingConfig?: AgingThresholdConfig;
  activeAgingFilter: AgingTier | null;
  onToggleAgingFilter: (tier: AgingTier) => void;
  selectedBuilding: BuildingKey | null;
  hoveredBuilding: BuildingKey | null;
  buildingsMeta: Record<BuildingKey, BuildingMetaInfo>;
  onSelectBuilding: (bKey: BuildingKey) => void;
  onFocusAlert: (alert: FactoryAlertItem) => void;
  onNavigateBuilding: (bKey: BuildingKey) => void;
  onResetView: () => void;
}

export const BottomFactoryHudPanel: React.FC<BottomHudPanelProps> = ({
  open,
  onToggleOpen,
  telemetry,
  agingConfig,
  activeAgingFilter,
  onToggleAgingFilter,
  selectedBuilding,
  hoveredBuilding,
  buildingsMeta,
  onSelectBuilding,
  onFocusAlert,
  onNavigateBuilding,
  onResetView,
}) => {
  const thresholds = resolveEffectiveAgingThresholds(agingConfig);
  const focusKey: BuildingKey | null = selectedBuilding || hoveredBuilding;
  const focusBuilding = focusKey ? telemetry.buildings[focusKey] : null;
  const focusMeta = focusKey ? buildingsMeta[focusKey] : null;

  const inOutTotal = focusBuilding
    ? Math.max(1, focusBuilding.inCount + focusBuilding.outCount)
    : Math.max(1, telemetry.todayInScans + telemetry.todayOutScans);
  const displayIn = focusBuilding ? focusBuilding.inCount : telemetry.todayInScans;
  const displayOut = focusBuilding ? focusBuilding.outCount : telemetry.todayOutScans;
  const inPct = Math.round((displayIn / inOutTotal) * 100);
  const outPct = Math.round((displayOut / inOutTotal) * 100);

  return (
    <section
      aria-label="แถบควบคุมและสรุป KPI ผังรวม 3 มิติ"
      className="w-full bg-[#09111E] border-t border-slate-800 shrink-0 z-20 flex flex-col"
    >
      {/* Top Strip of Bottom Dock: Quick-Zone Switcher + Collapse/Expand Controls */}
      <div className="px-3 py-1.5 bg-[#0D1729] border-b border-slate-800/90 flex items-center justify-between gap-2 flex-wrap lg:flex-nowrap">
        {/* Left: Quick-Zone Switcher positioned right above the 4-column HUD */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar min-w-0 py-0.5">
          <button
            type="button"
            onClick={onResetView}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border ${
              !selectedBuilding
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-[#09111E] text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 shrink-0" />
            <span>ทั้งหมด ({telemetry.totalCapacity.toLocaleString()} P)</span>
          </button>

          {(Object.keys(buildingsMeta) as BuildingKey[]).map(bKey => {
            const spec = buildingsMeta[bKey];
            const m = telemetry.buildings[bKey];
            const isSel = selectedBuilding === bKey;

            return (
              <button
                key={bKey}
                type="button"
                onClick={() => onSelectBuilding(bKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer border font-mono tabular-nums whitespace-nowrap shrink-0 ${
                  isSel
                    ? 'bg-[#12233E] text-white border-cyan-400'
                    : 'bg-[#09111E] text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: spec.accentHex }} />
                <span className="font-sans">{spec.shortName}</span>
                <span className="text-[10px] text-cyan-300">{m.percent}%</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick KPI summary badge (when collapsed) + Collapse/Expand Button */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {!open && (
            <div className="hidden md:flex items-center gap-3 px-2.5 py-1 rounded-lg bg-[#09111E] border border-slate-800 text-[11px] font-mono tabular-nums text-slate-300 whitespace-nowrap">
              <span>
                <strong className="text-cyan-300">{telemetry.occupiedPallets}</strong>/{telemetry.totalCapacity.toLocaleString()} P
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400">+{telemetry.todayInScans} IN</span>
              <span className="text-orange-400">-{telemetry.todayOutScans} OUT</span>
              {telemetry.alertCount > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-orange-300 font-bold">แจ้งเตือน {telemetry.alertCount}</span>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleOpen}
            className="px-2.5 py-1 rounded-lg bg-[#09111E] hover:bg-[#12233E] border border-slate-700 hover:border-cyan-500/50 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title={open ? 'พับแถบ HUD ด้านล่างเพื่อดู 3D เต็มจอ' : 'ขยายแถบ HUD KPI ด้านล่าง'}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{open ? 'พับ HUD' : 'แสดง KPI HUD'}</span>
            {telemetry.alertCount > 0 && !open && (
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px]">
                {telemetry.alertCount}
              </span>
            )}
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable 4-Column Horizontal Telemetry Body */}
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 xl:divide-x divide-slate-800/90 bg-[#09111E] xl:h-[228px]">
          {/* Column 1: Campus Live Summary Metrics */}
          <div className="p-2.5 flex flex-col justify-between gap-2 min-h-0">
            <div className="flex items-center justify-between px-0.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>สรุปสถานะคลังรวม</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                {telemetry.occupiedPallets} / {telemetry.totalCapacity.toLocaleString()} P
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1">
              <div className="bg-[#0E1726] border border-slate-800/90 rounded-lg p-2 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>จำนวนชิ้นรวม</span>
                  <Package className="w-3 h-3 text-cyan-400 shrink-0" />
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-white leading-tight mt-1">
                  {telemetry.totalUnits.toLocaleString()}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-cyan-400">
                  {telemetry.occupiedPallets} พาเลทใช้งาน
                </div>
              </div>

              <div className="bg-[#0E1726] border border-slate-800/90 rounded-lg p-2 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>ความจุใช้งาน</span>
                  <Layers className="w-3 h-3 text-sky-400 shrink-0" />
                </div>
                <div className="text-base font-bold font-mono tabular-nums text-sky-300 leading-tight mt-1">
                  {telemetry.occupancyPct}%
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${telemetry.occupancyPct}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#0E1726] border border-slate-800/90 rounded-lg p-2 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>สแกนรับ-เบิก</span>
                  <ArrowDownRight className="w-3 h-3 text-emerald-400 shrink-0" />
                </div>
                <div className="flex items-baseline gap-1.5 font-mono tabular-nums text-xs mt-1">
                  <span className="text-emerald-400 font-bold">+{telemetry.todayInScans} IN</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-orange-400 font-bold">-{telemetry.todayOutScans} OUT</span>
                </div>
                <div className="text-[10px] text-slate-500">บันทึกเคลื่อนย้ายจริง</div>
              </div>

              <div className="bg-[#0E1726] border border-slate-800/90 rounded-lg p-2 flex flex-col justify-between">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>แจ้งเตือน Aging/Safety</span>
                  <AlertTriangle
                    className={`w-3 h-3 shrink-0 ${telemetry.alertCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}
                  />
                </div>
                <div
                  className={`text-base font-bold font-mono tabular-nums leading-tight mt-1 ${
                    telemetry.alertCount > 0 ? 'text-orange-400' : 'text-emerald-400'
                  }`}
                >
                  {telemetry.alertCount}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-400 truncate">
                  Overdue {telemetry.agingCounts.OVERDUE} · Low {telemetry.lowSafetyCount}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Zone Operational Status & Realtime Stacked Load Chart (5 Areas) */}
          <div className="p-2.5 flex flex-col gap-1.5 min-h-0">
            <div className="flex items-center justify-between px-0.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>รายโซน &amp; โหลด 5 พื้นที่</span>
              </span>
              {selectedBuilding ? (
                <button
                  type="button"
                  onClick={onResetView}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer whitespace-nowrap"
                >
                  ดูทั้งหมด
                </button>
              ) : (
                <span className="text-[9px] font-mono text-slate-400">REALTIME</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar min-h-0">
              {telemetry.subZones.map(z => {
                const isSelected = selectedBuilding === z.buildingKey;
                const isHovered = hoveredBuilding === z.buildingKey;
                const cap = Math.max(1, z.capacity);
                const pNormal = (z.agingCounts.NORMAL / cap) * 100;
                const pWarn = ((z.agingCounts.WARNING + z.agingCounts.URGENT) / cap) * 100;
                const pOver = (z.agingCounts.OVERDUE / cap) * 100;

                const statusColor =
                  z.status === 'ALERT'
                    ? 'text-orange-300'
                    : z.status === 'ACTIVE'
                    ? 'text-cyan-300'
                    : 'text-slate-400';

                return (
                  <button
                    key={z.zoneKey}
                    type="button"
                    onClick={() => onSelectBuilding(z.buildingKey)}
                    className={`w-full text-left px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#12233E] border-cyan-400/70'
                        : isHovered
                        ? 'bg-[#101C32] border-slate-600'
                        : 'bg-[#0E1726] border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {z.status === 'ALERT' ? (
                          <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                        ) : z.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                        <span className="font-bold text-slate-100 truncate">{z.shortLabel}</span>
                        <span className={`text-[9px] font-mono ${statusColor} shrink-0`}>{z.code}</span>
                      </div>
                      <span className="font-mono tabular-nums text-[10px] text-slate-300 shrink-0">
                        {z.occupied}/{z.capacity}P <strong className="text-cyan-300">{z.occupancyPct}%</strong>
                      </span>
                    </div>

                    {/* Stacked Aging Load Bar */}
                    <div className="mt-1 w-full h-1.5 bg-slate-900 border border-slate-800 rounded-xs overflow-hidden flex">
                      {pNormal > 0 && (
                        <div
                          className="h-full bg-sky-500"
                          style={{ width: `${Math.max(2, pNormal)}%` }}
                          title={`Normal: ${z.agingCounts.NORMAL} P`}
                        />
                      )}
                      {pWarn > 0 && (
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${Math.max(2, pWarn)}%` }}
                          title={`Warning/Urgent: ${z.agingCounts.WARNING + z.agingCounts.URGENT} P`}
                        />
                      )}
                      {pOver > 0 && (
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${Math.max(2, pOver)}%` }}
                          title={`Overdue: ${z.agingCounts.OVERDUE} P`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 font-mono shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-sky-500 rounded-xs inline-block" /> ปกติ
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-xs inline-block" /> เตือน/ด่วน
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-xs inline-block" /> เกินกำหนด
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-slate-800 border border-slate-700 rounded-xs inline-block" /> ว่าง
              </span>
            </div>
          </div>

          {/* Column 3: Aging Filter Legend + Zone Inspector & IN/OUT */}
          <div className="p-2.5 flex flex-col justify-between gap-2 min-h-0">
            {/* Aging Filter Strip */}
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-bold text-slate-200">สีสถานะ Aging (คลิกกรอง 3D)</span>
                {activeAgingFilter && (
                  <button
                    type="button"
                    onClick={() => onToggleAgingFilter(activeAgingFilter)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer whitespace-nowrap"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { tier: 'NORMAL' as AgingTier, range: `0-${thresholds.safeDaysMax}ว.` },
                    { tier: 'WARNING' as AgingTier, range: `${thresholds.safeDaysMax + 1}-${thresholds.warningDaysMax}ว.` },
                    { tier: 'URGENT' as AgingTier, range: `${thresholds.warningDaysMax + 1}-${thresholds.criticalDays - 1}ว.` },
                    { tier: 'OVERDUE' as AgingTier, range: `>=${thresholds.criticalDays}ว.` },
                  ] as const
                ).map(({ tier, range }) => {
                  const meta = AGING_TIER_META[tier];
                  const count = telemetry.agingCounts[tier];
                  const isActive = activeAgingFilter === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => onToggleAgingFilter(tier)}
                      className={`px-1.5 py-1 rounded-lg border text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#14233C] border-cyan-400'
                          : 'bg-[#0E1726] border-slate-800 hover:border-slate-700'
                      }`}
                      title={`คลิกเพื่อไฮไลต์พาเลทกลุ่ม ${meta.label} ในโมเดล 3D`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-200">
                        <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: meta.hex }} />
                        <span className="truncate">{meta.shortLabel}</span>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-1 font-mono tabular-nums">
                        <span className="text-xs font-bold text-white">{count}P</span>
                        <span className="text-[8px] text-slate-400 truncate">{range}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone Inspector & IN/OUT Throughput */}
            <div className="bg-[#0E1726] border border-slate-800 rounded-lg p-2 flex-1 flex flex-col justify-between gap-1.5 min-h-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] font-mono text-cyan-400 uppercase leading-none">
                    {focusKey ? 'Zone Inspector' : 'Campus Throughput'}
                  </div>
                  <div className="text-xs font-bold text-white truncate mt-0.5">
                    {focusMeta ? focusMeta.name : 'ภาพรวมทุกโซน (A2 / A4 / A5 / CY3)'}
                  </div>
                </div>

                {focusKey ? (
                  <button
                    type="button"
                    onClick={() => onNavigateBuilding(focusKey)}
                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>เข้าหน้าโซน {focusKey}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </button>
                ) : null}
              </div>

              {focusBuilding && (
                <div className="grid grid-cols-3 gap-1 text-center font-mono tabular-nums text-[10px]">
                  <div className="bg-[#09111E] border border-slate-800 rounded px-1.5 py-0.5">
                    <span className="text-[9px] text-slate-400 font-sans mr-1">พาเลท</span>
                    <strong className="text-cyan-300">
                      {focusBuilding.occupied}/{focusBuilding.total}
                    </strong>
                  </div>
                  <div className="bg-[#09111E] border border-slate-800 rounded px-1.5 py-0.5">
                    <span className="text-[9px] text-slate-400 font-sans mr-1">ชิ้น</span>
                    <strong className="text-white">{focusBuilding.totalUnits.toLocaleString()}</strong>
                  </div>
                  <div className="bg-[#09111E] border border-slate-800 rounded px-1.5 py-0.5">
                    <span className="text-[9px] text-slate-400 font-sans mr-1">ค้าง</span>
                    <strong className={focusBuilding.overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {focusBuilding.overdueCount}P
                    </strong>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <ArrowDownRight className="w-3 h-3" /> IN {displayIn}
                  </span>
                  <span className="text-slate-400 font-sans text-[9px]">รับเข้า / เบิกออก</span>
                  <span className="text-orange-400 flex items-center gap-0.5">
                    OUT {displayOut} <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                  <div className="h-full bg-emerald-500" style={{ width: `${inPct}%` }} />
                  <div className="h-full bg-orange-500" style={{ width: `${outPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Real-time Alerts Feed */}
          <div className="p-2.5 flex flex-col gap-1.5 min-h-0">
            <div className="flex items-center justify-between px-0.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>แจ้งเตือนเรียลไทม์ ({telemetry.alerts.length})</span>
              </span>
              <span className="text-[10px] font-mono text-orange-400 whitespace-nowrap">คลิกเพื่อซูมโซน</span>
            </div>

            {telemetry.alerts.length === 0 ? (
              <div className="flex-1 bg-[#0E1726] border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center text-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div className="text-xs font-bold text-emerald-300">ทุกโซนอยู่ในเกณฑ์ปลอดภัย</div>
                <div className="text-[10px] text-slate-400">
                  ไม่พบพาเลทค้าง Aging หรือ Safety Stock ต่ำกว่าเกณฑ์
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar min-h-0">
                {telemetry.alerts.slice(0, 18).map(al => {
                  const meta = AGING_TIER_META[al.tier];
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => onFocusAlert(al)}
                      className="w-full text-left px-2 py-1.5 rounded-lg bg-[#0E1726] hover:bg-[#132038] border border-slate-800 hover:border-orange-500/50 transition-colors cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-cyan-300 truncate">
                          {al.locatorCode}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${meta.pillClass}`}
                        >
                          {al.buildingKey} · {meta.badgeText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-200 font-medium truncate pr-2">
                          {al.modelHE} <span className="text-orange-300">({al.reason})</span>
                        </span>
                        <span className="font-mono tabular-nums text-slate-300 shrink-0 flex items-center gap-1">
                          {al.quantity} ชิ้น
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
