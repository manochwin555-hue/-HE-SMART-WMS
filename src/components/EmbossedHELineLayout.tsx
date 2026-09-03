import React, { useState } from 'react';
import { 
  Flame, 
  Wind, 
  Cpu, 
  Zap, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  Activity,
  Maximize2,
  Info
} from 'lucide-react';

export interface StationData {
  id: string;
  name: string;
  shortName: string;
  category: 'PRESS' | 'EXPANDER' | 'OVEN' | 'BRAZING' | 'VACUUM' | 'ROBOT' | 'FEED' | 'MISC';
  status: 'ACTIVE' | 'IDLE' | 'WARNING';
  temp?: string;
  speed?: string;
  pressure?: string;
  cycleTime?: string;
}

export interface HELineEmbossedConfig {
  id: string;
  name: string;
  model: string;
  speedPerHour: number;
  efficiency: number;
  feedZone: string;
  stations: StationData[];
}

export const A2_HE_EMBOSSED_LINES: HELineEmbossedConfig[] = [
  {
    id: 'HE1',
    name: 'HE-1 Line',
    model: 'ADL74920904',
    speedPerHour: 116,
    efficiency: 96.6,
    feedZone: 'DA2D-1 (R1-R7)',
    stations: [
      { id: 'FP1', name: 'FIN Press E-1', shortName: 'FIN', category: 'PRESS', status: 'ACTIVE', speed: '180 SPM' },
      { id: 'EXP1', name: 'Expander 1', shortName: 'EXP', category: 'EXPANDER', status: 'ACTIVE', pressure: '4.2 Bar' },
      { id: 'FL1', name: '1st Flare', shortName: 'FL1', category: 'MISC', status: 'ACTIVE' },
      { id: 'OV1', name: 'Dry Oven 1', shortName: 'OVN', category: 'OVEN', status: 'ACTIVE', temp: '165°C' },
      { id: 'AB1', name: 'Air Blow', shortName: 'AIR', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB1', name: 'R/Bend', shortName: 'R/B', category: 'MISC', status: 'ACTIVE' },
      { id: 'N2A', name: 'N2 Charge', shortName: 'N2', category: 'MISC', status: 'ACTIVE', pressure: '1.5 Bar' },
      { id: 'CV1', name: 'Conveyor Unit', shortName: 'C/V', category: 'FEED', status: 'ACTIVE' },
      { id: 'BZ1', name: 'Auto Brazing 1', shortName: 'BRZ', category: 'BRAZING', status: 'ACTIVE', temp: '720°C' },
      { id: 'N2B', name: 'N2 Purge', shortName: 'N2P', category: 'MISC', status: 'ACTIVE' },
      { id: 'VAC1', name: 'Vacuum Test 1', shortName: 'VAC', category: 'VACUUM', status: 'ACTIVE', pressure: '-0.98 Bar' },
      { id: 'FL2', name: '2nd Flare', shortName: 'FL2', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB_ARM1', name: 'Robot 6-Axis', shortName: 'BOT', category: 'ROBOT', status: 'ACTIVE', cycleTime: '24s' },
      { id: 'HP1', name: 'Hairpin Feed', shortName: 'PIN', category: 'FEED', status: 'ACTIVE' }
    ]
  },
  {
    id: 'HE2',
    name: 'HE-2 Line',
    model: 'ACG76284709',
    speedPerHour: 108,
    efficiency: 98.1,
    feedZone: 'DA2D-1 (R8-R14)',
    stations: [
      { id: 'FP2', name: 'FIN Press E-2', shortName: 'FIN', category: 'PRESS', status: 'ACTIVE', speed: '175 SPM' },
      { id: 'EXP2', name: 'Expander 2', shortName: 'EXP', category: 'EXPANDER', status: 'ACTIVE', pressure: '4.5 Bar' },
      { id: 'FL2_1', name: '1st Flare', shortName: 'FL1', category: 'MISC', status: 'ACTIVE' },
      { id: 'OV2', name: 'Dry Oven 2', shortName: 'OVN', category: 'OVEN', status: 'ACTIVE', temp: '168°C' },
      { id: 'AB2', name: 'Air Blow', shortName: 'AIR', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB2', name: 'R/Bend', shortName: 'R/B', category: 'MISC', status: 'ACTIVE' },
      { id: 'N2A2', name: 'N2 Charge', shortName: 'N2', category: 'MISC', status: 'ACTIVE' },
      { id: 'CV2', name: 'Conveyor Unit', shortName: 'C/V', category: 'FEED', status: 'ACTIVE' },
      { id: 'BZ2', name: 'Auto Brazing 2', shortName: 'BRZ', category: 'BRAZING', status: 'ACTIVE', temp: '725°C' },
      { id: 'N2B2', name: 'N2 Purge', shortName: 'N2P', category: 'MISC', status: 'ACTIVE' },
      { id: 'VAC2', name: 'Vacuum Test 2', shortName: 'VAC', category: 'VACUUM', status: 'ACTIVE', pressure: '-0.99 Bar' },
      { id: 'FL2_2', name: '2nd Flare', shortName: 'FL2', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB_ARM2', name: 'Robot 6-Axis', shortName: 'BOT', category: 'ROBOT', status: 'ACTIVE', cycleTime: '22s' },
      { id: 'HP2', name: 'Hairpin Feed', shortName: 'PIN', category: 'FEED', status: 'ACTIVE' }
    ]
  },
  {
    id: 'HE3',
    name: 'HE-3 Line',
    model: 'AEB73820101',
    speedPerHour: 95,
    efficiency: 95.0,
    feedZone: 'DA2D-1 (R15-R20)',
    stations: [
      { id: 'FP3', name: 'FIN Press E-3', shortName: 'FIN', category: 'PRESS', status: 'ACTIVE', speed: '160 SPM' },
      { id: 'EXP3', name: 'Expander 3', shortName: 'EXP', category: 'EXPANDER', status: 'ACTIVE', pressure: '4.1 Bar' },
      { id: 'FL3_1', name: '1st Flare', shortName: 'FL1', category: 'MISC', status: 'ACTIVE' },
      { id: 'OV3', name: 'Dry Oven 3', shortName: 'OVN', category: 'OVEN', status: 'ACTIVE', temp: '162°C' },
      { id: 'AB3', name: 'Air Blow', shortName: 'AIR', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB3', name: 'R/Bend', shortName: 'R/B', category: 'MISC', status: 'ACTIVE' },
      { id: 'N2A3', name: 'N2 Charge', shortName: 'N2', category: 'MISC', status: 'ACTIVE' },
      { id: 'CV3', name: 'Conveyor Unit', shortName: 'C/V', category: 'FEED', status: 'ACTIVE' },
      { id: 'BZ3', name: 'Auto Brazing 3', shortName: 'BRZ', category: 'BRAZING', status: 'ACTIVE', temp: '715°C' },
      { id: 'N2B3', name: 'N2 Purge', shortName: 'N2P', category: 'MISC', status: 'ACTIVE' },
      { id: 'VAC3', name: 'Vacuum Test 3', shortName: 'VAC', category: 'VACUUM', status: 'ACTIVE', pressure: '-0.97 Bar' },
      { id: 'FL3_2', name: '2nd Flare', shortName: 'FL2', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB_ARM3', name: 'Robot 6-Axis', shortName: 'BOT', category: 'ROBOT', status: 'ACTIVE', cycleTime: '28s' },
      { id: 'HP3', name: 'Hairpin Feed', shortName: 'PIN', category: 'FEED', status: 'ACTIVE' }
    ]
  }
];

export const A4_HE_EMBOSSED_LINES: HELineEmbossedConfig[] = [
  {
    id: 'HE4',
    name: 'HE-4 Line',
    model: 'MEG61839001',
    speedPerHour: 128,
    efficiency: 98.4,
    feedZone: 'DA4D-1 Floor',
    stations: [
      { id: 'FP4', name: 'FIN Press E-4', shortName: 'FIN', category: 'PRESS', status: 'ACTIVE', speed: '190 SPM' },
      { id: 'EXP4', name: 'Expander 4', shortName: 'EXP', category: 'EXPANDER', status: 'ACTIVE', pressure: '4.6 Bar' },
      { id: 'FL4_1', name: '1st Flare', shortName: 'FL1', category: 'MISC', status: 'ACTIVE' },
      { id: 'OV4', name: 'Dry Oven 4', shortName: 'OVN', category: 'OVEN', status: 'ACTIVE', temp: '170°C' },
      { id: 'AB4', name: 'Air Blow', shortName: 'AIR', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB4', name: 'R/Bend', shortName: 'R/B', category: 'MISC', status: 'ACTIVE' },
      { id: 'N2_4', name: 'N2 System', shortName: 'N2', category: 'MISC', status: 'ACTIVE' },
      { id: 'CV4', name: 'Conveyor Track', shortName: 'C/V', category: 'FEED', status: 'ACTIVE' },
      { id: 'BZ4', name: 'Auto Brazing 4', shortName: 'BRZ', category: 'BRAZING', status: 'ACTIVE', temp: '730°C' },
      { id: 'N2P4', name: 'N2 Purge', shortName: 'N2P', category: 'MISC', status: 'ACTIVE' },
      { id: 'VAC4', name: 'Vacuum Test Pro', shortName: 'VAC', category: 'VACUUM', status: 'ACTIVE', pressure: '-1.0 Bar' },
      { id: 'FL4_2', name: '2nd Flare', shortName: 'FL2', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB_ARM4', name: 'Robot 6-Axis', shortName: 'BOT', category: 'ROBOT', status: 'ACTIVE', cycleTime: '20s' },
      { id: 'HP4', name: 'Hairpin Feed 4', shortName: 'PIN', category: 'FEED', status: 'ACTIVE' }
    ]
  },
  {
    id: 'HE5',
    name: 'HE-5 Line',
    model: 'MEG61839002',
    speedPerHour: 122,
    efficiency: 97.6,
    feedZone: 'DA4D-1 Floor',
    stations: [
      { id: 'FP5', name: 'FIN Press E-5', shortName: 'FIN', category: 'PRESS', status: 'ACTIVE', speed: '185 SPM' },
      { id: 'EXP5', name: 'Expander 5', shortName: 'EXP', category: 'EXPANDER', status: 'ACTIVE', pressure: '4.4 Bar' },
      { id: 'FL5_1', name: '1st Flare', shortName: 'FL1', category: 'MISC', status: 'ACTIVE' },
      { id: 'OV5', name: 'Dry Oven 5', shortName: 'OVN', category: 'OVEN', status: 'ACTIVE', temp: '168°C' },
      { id: 'AB5', name: 'Air Blow', shortName: 'AIR', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB5', name: 'R/Bend', shortName: 'R/B', category: 'MISC', status: 'ACTIVE' },
      { id: 'N2_5', name: 'N2 System', shortName: 'N2', category: 'MISC', status: 'ACTIVE' },
      { id: 'CV5', name: 'Conveyor Track', shortName: 'C/V', category: 'FEED', status: 'ACTIVE' },
      { id: 'BZ5', name: 'Auto Brazing 5', shortName: 'BRZ', category: 'BRAZING', status: 'ACTIVE', temp: '725°C' },
      { id: 'N2P5', name: 'N2 Purge', shortName: 'N2P', category: 'MISC', status: 'ACTIVE' },
      { id: 'VAC5', name: 'Vacuum Test Pro', shortName: 'VAC', category: 'VACUUM', status: 'ACTIVE', pressure: '-0.99 Bar' },
      { id: 'FL5_2', name: '2nd Flare', shortName: 'FL2', category: 'MISC', status: 'ACTIVE' },
      { id: 'RB_ARM5', name: 'Robot 6-Axis', shortName: 'BOT', category: 'ROBOT', status: 'ACTIVE', cycleTime: '21s' },
      { id: 'HP5', name: 'Hairpin Feed 5', shortName: 'PIN', category: 'FEED', status: 'ACTIVE' }
    ]
  }
];

// Helper to get 3D embossed color styling per station category
const getStation3DStyle = (category: StationData['category']) => {
  switch (category) {
    case 'PRESS':
      return {
        bg: 'bg-emerald-600 hover:bg-emerald-500',
        border: 'border-t-emerald-300 border-l-emerald-300 border-b-emerald-900 border-r-emerald-800',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#064e3b]'
      };
    case 'EXPANDER':
      return {
        bg: 'bg-teal-600 hover:bg-teal-500',
        border: 'border-t-teal-300 border-l-teal-300 border-b-teal-900 border-r-teal-800',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#134e4a]'
      };
    case 'OVEN':
      return {
        bg: 'bg-amber-600 hover:bg-amber-500',
        border: 'border-t-amber-300 border-l-amber-300 border-b-amber-900 border-r-amber-800',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#7c2d12]'
      };
    case 'BRAZING':
      return {
        bg: 'bg-rose-600 hover:bg-rose-500',
        border: 'border-t-rose-300 border-l-rose-300 border-b-rose-900 border-r-rose-800',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#4c0519]'
      };
    case 'VACUUM':
      return {
        bg: 'bg-indigo-600 hover:bg-indigo-500',
        border: 'border-t-indigo-300 border-l-indigo-300 border-b-indigo-900 border-r-indigo-800',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#1e1b4b]'
      };
    case 'ROBOT':
      return {
        bg: 'bg-amber-400 hover:bg-amber-300',
        border: 'border-t-yellow-100 border-l-yellow-200 border-b-amber-700 border-r-amber-600',
        text: 'text-slate-950 font-black',
        shadow: 'shadow-[0_1px_0_#78350f]'
      };
    case 'FEED':
      return {
        bg: 'bg-sky-600 hover:bg-sky-500',
        border: 'border-t-sky-300 border-l-sky-300 border-b-sky-900 border-r-sky-800',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#0c4a6e]'
      };
    default:
      return {
        bg: 'bg-slate-500 hover:bg-slate-400',
        border: 'border-t-slate-300 border-l-slate-300 border-b-slate-800 border-r-slate-700',
        text: 'text-white',
        shadow: 'shadow-[0_1px_0_#1e293b]'
      };
  }
};

/**
 * Compact Single Station 3D Embossed Box Component (Horizontal Fitting)
 */
export const EmbossedStationBox: React.FC<{
  station: StationData;
}> = ({ station }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = getStation3DStyle(station.category);

  return (
    <div 
      className="relative flex-1 min-w-0 h-6.5 sm:h-7 mx-0.2"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 3D Embossed Machine Container */}
      <div 
        className={`
          w-full h-full flex flex-col items-center justify-center 
          rounded-2xs border-t border-l border-b-[2px] border-r
          ${style.bg} ${style.border} ${style.shadow} ${style.text}
          transition-all cursor-pointer select-none px-0.5
        `}
      >
        <span className="text-[7.5px] sm:text-[8px] font-black tracking-tight leading-none truncate max-w-full">
          {station.shortName}
        </span>
      </div>

      {/* Hover Info Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 bg-slate-900 text-white rounded-md p-1.5 shadow-xl border border-slate-700 text-[9px] pointer-events-none animate-fadeIn">
          <div className="font-bold text-amber-300 truncate">{station.name}</div>
          <div className="text-slate-300 text-[8px] mt-0.5">ประเภท: {station.category}</div>
          {station.temp && <div className="text-rose-300 text-[8px]">อุณหภูมิ: {station.temp}</div>}
          {station.pressure && <div className="text-sky-300 text-[8px]">แรงดัน: {station.pressure}</div>}
          {station.speed && <div className="text-emerald-300 text-[8px]">ความเร็ว: {station.speed}</div>}
          {station.cycleTime && <div className="text-yellow-300 text-[8px]">Cycle Time: {station.cycleTime}</div>}
          <div className="text-emerald-400 text-[7.5px] font-bold mt-0.5 flex items-center space-x-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>สถานะ: ทำงานปกติ (Active)</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Vertical Single Station 3D Embossed Box Component (Vertical Stacking Top to Bottom)
 */
export const EmbossedVerticalStationBox: React.FC<{
  station: StationData;
}> = ({ station }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = getStation3DStyle(station.category);

  return (
    <div 
      className="relative w-full h-[18px] sm:h-[19px] shrink-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 3D Embossed Machine Container - Vertical node */}
      <div 
        className={`
          w-full h-full flex items-center justify-between
          rounded-2xs border-t border-l border-b-[2px] border-r
          ${style.bg} ${style.border} ${style.shadow} ${style.text}
          transition-all cursor-pointer select-none px-1
        `}
      >
        <span className="text-[7.5px] sm:text-[8px] font-black tracking-tight leading-none truncate">
          {station.shortName}
        </span>
        <span className="text-[6px] opacity-80 font-mono font-bold">
          {station.category === 'PRESS' ? 'PRS' : station.category === 'BRAZING' ? 'BRZ' : station.category === 'OVEN' ? 'OVN' : station.category === 'ROBOT' ? 'BOT' : ''}
        </span>
      </div>

      {/* Hover Info Tooltip (Opens to right or left) */}
      {showTooltip && (
        <div className="absolute z-50 top-1/2 -translate-y-1/2 left-full ml-1.5 w-36 bg-slate-950 text-white rounded-md p-1.5 shadow-2xl border border-slate-700 text-[8.5px] pointer-events-none animate-fadeIn">
          <div className="font-bold text-amber-300 truncate">{station.name}</div>
          <div className="text-slate-300 text-[7.5px] mt-0.5">ประเภท: {station.category}</div>
          {station.temp && <div className="text-rose-300 text-[7.5px]">อุณหภูมิ: {station.temp}</div>}
          {station.pressure && <div className="text-sky-300 text-[7.5px]">แรงดัน: {station.pressure}</div>}
          {station.speed && <div className="text-emerald-300 text-[7.5px]">ความเร็ว: {station.speed}</div>}
          {station.cycleTime && <div className="text-yellow-300 text-[7.5px]">Cycle Time: {station.cycleTime}</div>}
          <div className="text-emerald-400 text-[7px] font-bold mt-0.5 flex items-center space-x-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Active (กำลังทำงาน)</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Vertical Complete HE Line (Conveyor Track running vertically Top to Bottom, matching Blueprint 100%)
 */
export const EmbossedHELineVerticalColumn: React.FC<{
  line: HELineEmbossedConfig;
  badgeColor?: string;
}> = ({ line, badgeColor = 'bg-amber-300 text-slate-950' }) => {
  return (
    <div className="flex-1 min-w-0 bg-slate-50/95 border border-slate-300 rounded-md p-1 sm:p-1.5 shadow-2xs flex flex-col justify-between h-full">
      
      {/* Top Header info */}
      <div className="text-center pb-1 border-b border-slate-200">
        <div className={`px-1 py-0.5 rounded font-black text-[9px] border border-amber-400 shadow-2xs ${badgeColor}`}>
          {line.name}
        </div>
        <div className="text-[7.5px] font-mono text-slate-600 truncate mt-0.5 font-semibold">
          {line.model}
        </div>
        <div className="flex items-center justify-center space-x-1 text-[7px] font-mono text-slate-700 mt-0.5">
          <span className="font-bold">{line.speedPerHour} P/H</span>
          <span className="text-emerald-700 font-bold bg-emerald-100 px-0.5 rounded">
            {line.efficiency}%
          </span>
        </div>
      </div>

      {/* Vertical Conveyor Track & 3D Embossed Machinery Nodes */}
      <div className="relative bg-slate-200/90 border border-slate-300 rounded-xs p-1 my-1 shadow-inner flex-1 flex flex-col items-center justify-between overflow-hidden">
        {/* Center Vertical Track Rail Line */}
        <div className="absolute top-1 bottom-1 left-1/2 -translate-x-1/2 w-1.5 bg-slate-400/40 rounded pointer-events-none" />

        {/* Vertical Nodes Stacking */}
        <div className="relative z-10 w-full flex flex-col items-center gap-[2px]">
          {line.stations.map((st) => (
            <EmbossedVerticalStationBox key={st.id} station={st} />
          ))}
        </div>
      </div>

      {/* Micro sub-info bottom */}
      <div className="text-[7px] text-slate-500 font-mono text-center pt-0.5 border-t border-slate-200 truncate font-semibold">
        {line.feedZone.replace(' (R1-R7)', '').replace(' (R8-R14)', '').replace(' (R15-R20)', '')}
      </div>

    </div>
  );
};

/**
 * A2 Building 3 Vertical Parallel Lines (HE-1, HE-2, HE-3) Matching Blueprint 100%
 */
export const A2EmbossedLinesVerticalSection: React.FC = () => {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2 shadow-xs flex flex-col justify-between h-[340px] w-full">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-blue-600" />
          <span className="text-[10px] font-black text-slate-900">
            A2 HE Lines (HE-1, HE-2, HE-3)
          </span>
        </div>
        <span className="text-[7.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
          ● 3 LINES ACTIVE
        </span>
      </div>

      {/* 3 Parallel Vertical Columns Side-by-Side */}
      <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
        {A2_HE_EMBOSSED_LINES.map((line) => (
          <EmbossedHELineVerticalColumn 
            key={line.id} 
            line={line} 
            badgeColor="bg-amber-300 text-slate-950" 
          />
        ))}
      </div>

      <div className="text-[7.5px] text-slate-500 text-center font-medium bg-slate-100 rounded py-0.5 border border-slate-200 mt-1">
        สายการผลิตแนวตั้ง A2 เชื่อมรางเลื่อน DA2D-1
      </div>

    </div>
  );
};

/**
 * A4 Building 2 Vertical Parallel Lines (HE-4, HE-5) Matching Blueprint 100%
 */
export const A4EmbossedLinesVerticalSection: React.FC = () => {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2 shadow-xs flex flex-col justify-between h-[340px] w-full">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-blue-600" />
          <span className="text-[10px] font-black text-slate-900">
            A4 Production Lines (HE-4, HE-5)
          </span>
        </div>
        <span className="text-[7.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
          ● 2 LINES RUNNING
        </span>
      </div>

      {/* 2 Parallel Vertical Columns Side-by-Side */}
      <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
        {A4_HE_EMBOSSED_LINES.map((line) => (
          <EmbossedHELineVerticalColumn 
            key={line.id} 
            line={line} 
            badgeColor="bg-amber-300 text-slate-950" 
          />
        ))}
      </div>

      <div className="text-[7.5px] text-slate-500 text-center font-medium bg-slate-100 rounded py-0.5 border border-slate-200 mt-1">
        สายการผลิตแนวตั้ง A4 เชื่อมลานวางพื้น DA4D-1
      </div>

    </div>
  );
};

/**
 * Complete Single HE Line with 100% Fitted Conveyor Track & Embossed 3D Machinery (NO SCROLLBAR)
 */
export const EmbossedHELineRow: React.FC<{
  line: HELineEmbossedConfig;
  badgeColor?: string;
}> = ({ line, badgeColor = 'bg-amber-300 text-slate-950' }) => {
  return (
    <div className="bg-slate-50/95 border border-slate-300 rounded-md p-1.5 shadow-2xs space-y-1">
      
      {/* Compact Line Header */}
      <div className="flex items-center justify-between text-[10px] font-bold">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className={`px-1.5 py-0.2 rounded font-black text-[9.5px] border border-amber-400 shadow-2xs shrink-0 ${badgeColor}`}>
            {line.name}
          </span>
          <span className="text-slate-600 text-[9px] font-mono truncate">
            Model: <strong className="text-slate-900">{line.model}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[8.5px] font-mono text-slate-600 shrink-0">
          <span className="text-slate-700 font-bold">{line.speedPerHour} P/Hr</span>
          <span className="text-emerald-700 font-bold bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
            {line.efficiency}%
          </span>
        </div>
      </div>

      {/* 3D Fitted Conveyor Track with Embossed Machinery Nodes - NO HORIZONTAL SCROLL */}
      <div className="relative bg-slate-200/90 border border-slate-300 rounded-xs p-1 shadow-inner">
        {/* Conveyor Track Line Background (Striped Metal Track) */}
        <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-1.5 bg-slate-400/40 rounded pointer-events-none" />

        {/* 100% Width Flex Container: All stations fit perfectly */}
        <div className="relative z-10 flex items-center w-full gap-0.5 overflow-hidden">
          {line.stations.map((st) => (
            <EmbossedStationBox key={st.id} station={st} />
          ))}
        </div>
      </div>

      {/* Micro sub-info bar */}
      <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono px-0.5">
        <span className="truncate">Feed: <strong className="text-blue-700">{line.feedZone}</strong></span>
        <span className="text-slate-400 shrink-0">{line.stations.length} Stations Active</span>
      </div>

    </div>
  );
};

/**
 * A4 Building Compact Stacked Line Layout (HE-4 & HE-5) for Fitting Beside Floor Staging
 */
export const A4EmbossedLinesColumn: React.FC = () => {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2 shadow-xs space-y-1.5">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-blue-600" />
          <span className="text-[11px] font-black text-slate-900">A4 Production Lines (HE-4, HE-5)</span>
        </div>
        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
          ● 2 LINES RUNNING
        </span>
      </div>

      {/* HE-4 and HE-5 Lines */}
      <div className="space-y-1.5">
        {A4_HE_EMBOSSED_LINES.map((line) => (
          <EmbossedHELineRow 
            key={line.id} 
            line={line} 
            badgeColor="bg-amber-300 text-slate-950" 
          />
        ))}
      </div>

      <div className="text-[8px] text-slate-500 text-center font-medium bg-slate-100 rounded py-0.5 border border-slate-200">
        สายการผลิตประกอบอัตโนมัติเชื่อมตรงลานวางพื้น DA4D-1
      </div>

    </div>
  );
};

/**
 * A2 Building 3-Line Stacked Layout (HE-1, HE-2, HE-3)
 */
export const A2EmbossedLinesSection: React.FC = () => {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-2 shadow-xs space-y-1.5">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-blue-600" />
          <span className="text-[11px] font-black text-slate-900">
            A2 HE Production Lines (HE-1, HE-2, HE-3)
          </span>
        </div>
        <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
          ● 3 LINES ACTIVE
        </span>
      </div>

      {/* HE-1, HE-2, HE-3 Lines */}
      <div className="space-y-1.5">
        {A2_HE_EMBOSSED_LINES.map((line) => (
          <EmbossedHELineRow 
            key={line.id} 
            line={line} 
            badgeColor="bg-amber-300 text-slate-950" 
          />
        ))}
      </div>

      <div className="text-[8px] text-slate-500 text-center font-medium bg-slate-100 rounded py-0.5 border border-slate-200">
        สายการผลิตชิ้นส่วนประกอบคอยล์และแผงทำความร้อน A2 เชื่อมรางเลื่อน DA2D-1
      </div>

    </div>
  );
};
