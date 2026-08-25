import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Cpu, 
  Activity, 
  Flame, 
  Zap, 
  RotateCw, 
  Maximize2, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Play,
  Pause,
  Box,
  Sliders,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export interface MachineStation {
  id: string;
  name: string;
  code: string;
  type: 'PRESS' | 'EXPANDER' | 'FLARE' | 'OVEN' | 'BLOW' | 'BEND' | 'BRAZING' | 'VACUUM' | 'CUT' | 'DIP' | 'ROBOT' | 'HPIN' | 'CV';
  status: 'RUNNING' | 'STANDBY' | 'MAINTENANCE';
  temperature?: number;
  pressure?: number;
  speed?: number; // pcs/min
  cycleTimeSec?: number;
  description: string;
}

export interface HELineConfig {
  id: string;
  name: string;
  building: 'A2' | 'A4';
  modelInProduction: string;
  targetPerHour: number;
  actualPerHour: number;
  efficiency: number;
  status: 'ACTIVE' | 'WARNING' | 'IDLE';
  feedZone: string;
  stations: MachineStation[];
}

export const A2_HE_LINES: HELineConfig[] = [
  {
    id: 'HE-1',
    name: 'HE-1 Line',
    building: 'A2',
    modelInProduction: 'ADL74920904',
    targetPerHour: 120,
    actualPerHour: 116,
    efficiency: 96.6,
    status: 'ACTIVE',
    feedZone: 'DA2D-1 (R1-R7)',
    stations: [
      { id: 'FP-E1', name: 'FIN Press E-1', code: 'FP-1', type: 'PRESS', status: 'RUNNING', pressure: 45, speed: 120, cycleTimeSec: 28, description: 'เครื่องปั๊มครีบระบายความร้อน Fin Press อัตโนมัติ' },
      { id: 'EXP-1', name: 'Expender', code: 'EXP-1', type: 'EXPANDER', status: 'RUNNING', pressure: 60, speed: 120, cycleTimeSec: 30, description: 'เครื่องขยายท่อทองแดงเพื่อความแน่นสนิทกับ Fin' },
      { id: 'FL-1', name: '1st Flare', code: 'FLA-1', type: 'FLARE', status: 'RUNNING', speed: 120, cycleTimeSec: 15, description: 'เครื่องบานปากท่อทองแดงรอบแรก (1st Flare Stage)' },
      { id: 'OVEN-1', name: 'Dry Oven', code: 'OVN-1', type: 'OVEN', status: 'RUNNING', temperature: 180, cycleTimeSec: 120, description: 'เตาอบไล่ความชื้นและทำความสะอาดผิวท่อ' },
      { id: 'BLOW-1', name: 'Air blow', code: 'AB-1', type: 'BLOW', status: 'RUNNING', pressure: 6.5, cycleTimeSec: 10, description: 'เป่าลมแรงดันสูงไล่สิ่งตกค้าง' },
      { id: 'BEND-1', name: 'R/Bend', code: 'RB-1', type: 'BEND', status: 'RUNNING', cycleTimeSec: 22, description: 'ประกอบ U-Bend เชื่อมท่อวงจร' },
      { id: 'N2-1', name: 'N2 Charge', code: 'N2-1', type: 'CV', status: 'RUNNING', pressure: 3.2, cycleTimeSec: 12, description: 'อัดก๊าซไนโตรเจนป้องกันออกซิเดชัน' },
      { id: 'CV-1', name: 'C/V Link', code: 'CV-1', type: 'CV', status: 'RUNNING', speed: 120, cycleTimeSec: 8, description: 'สายพานลำเลียงอัตโนมัติความเร็วสม่ำเสมอ' },
      { id: 'BRAZ-1', name: 'Auto Brazing', code: 'BRZ-1', type: 'BRAZING', status: 'RUNNING', temperature: 680, cycleTimeSec: 45, description: 'เตาเชื่อมอัตโนมัติอุณหภูมิสูง 680°C' },
      { id: 'N2-2', name: 'N2 Purge', code: 'N2-2', type: 'CV', status: 'RUNNING', pressure: 3.5, cycleTimeSec: 12, description: 'ไนโตรเจนเป่าไล่ควันเชื่อม' },
      { id: 'VAC-1', name: 'Vacuum Leak Test', code: 'VAC-1', type: 'VACUUM', status: 'RUNNING', pressure: -0.098, cycleTimeSec: 35, description: 'ทดสอบการรั่วซึมด้วยระบบสุญญากาศแรงดันสูง' },
      { id: 'FL-2', name: '2nd Flare', code: 'FLA-2', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 18, description: 'เครื่องบานท่อรอบสองสำหรับต่อท่อทางออก' },
      { id: 'CUT-1', name: 'Eva Cutting', code: 'CUT-1', type: 'CUT', status: 'RUNNING', cycleTimeSec: 16, description: 'เครื่องตัดแต่งขอบคอยล์ให้ได้ขนาดตามสเปก' },
      { id: 'DIP-1', name: 'Dipping Tank', code: 'DIP-1', type: 'DIP', status: 'RUNNING', temperature: 45, cycleTimeSec: 25, description: 'ถังชุบสารเคลือบป้องกันการกัดกร่อน' },
      { id: 'ROBOT-1', name: 'Robot Unloader', code: 'RBT-1', type: 'ROBOT', status: 'RUNNING', speed: 120, cycleTimeSec: 15, description: 'แขนกลยกชิ้นส่วนขึ้นพาเลทอัตโนมัติ' },
      { id: 'HPIN-1', name: 'H/Pin-1 In-Feed', code: 'HP-1', type: 'HPIN', status: 'RUNNING', speed: 120, cycleTimeSec: 10, description: 'ป้อนท่อ Hairpin เข้าสู่ต้นสายการผลิต' }
    ]
  },
  {
    id: 'HE-2',
    name: 'HE-2 Line',
    building: 'A2',
    modelInProduction: 'ACG76284709',
    targetPerHour: 110,
    actualPerHour: 108,
    efficiency: 98.1,
    status: 'ACTIVE',
    feedZone: 'DA2D-1 (R8-R14)',
    stations: [
      { id: 'FP-E2', name: 'FIN Press E-2', code: 'FP-2', type: 'PRESS', status: 'RUNNING', pressure: 48, speed: 110, cycleTimeSec: 30, description: 'เครื่องปั๊มครีบ Fin Press HE-2' },
      { id: 'EXP-2', name: 'Expender', code: 'EXP-2', type: 'EXPANDER', status: 'RUNNING', pressure: 62, speed: 110, cycleTimeSec: 32, description: 'ขยายท่อทองแดงแม่นยำสูง' },
      { id: 'FL-1-2', name: '1st Flare', code: 'FLA-1', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 16, description: 'บานปากท่อรอบแรก' },
      { id: 'OVEN-2', name: 'Dry Oven', code: 'OVN-2', type: 'OVEN', status: 'RUNNING', temperature: 185, cycleTimeSec: 120, description: 'เตาอบแห้งคอยล์เย็น' },
      { id: 'BLOW-2', name: 'Air blow', code: 'AB-2', type: 'BLOW', status: 'RUNNING', pressure: 6.5, cycleTimeSec: 10, description: 'เป่าลมทำความสะอาด' },
      { id: 'BEND-2', name: 'R/Bend', code: 'RB-2', type: 'BEND', status: 'RUNNING', cycleTimeSec: 24, description: 'ประกอบ Return Bend' },
      { id: 'N2-2-1', name: 'N2 Charge', code: 'N2-1', type: 'CV', status: 'RUNNING', pressure: 3.3, cycleTimeSec: 12, description: 'อัดก๊าซไนโตรเจน' },
      { id: 'CV-2', name: 'C/V Link', code: 'CV-2', type: 'CV', status: 'RUNNING', speed: 110, cycleTimeSec: 8, description: 'สายพานลำเลียงชิ้นงาน' },
      { id: 'BRAZ-2', name: 'Auto Brazing', code: 'BRZ-2', type: 'BRAZING', status: 'RUNNING', temperature: 690, cycleTimeSec: 46, description: 'เชื่อมอัตโนมัติอุณหภูมิ 690°C' },
      { id: 'N2-2-2', name: 'N2 Purge', code: 'N2-2', type: 'CV', status: 'RUNNING', pressure: 3.5, cycleTimeSec: 12, description: 'เป่าระบายก๊าซไนโตรเจน' },
      { id: 'VAC-2', name: 'Vacuum Leak Test', code: 'VAC-2', type: 'VACUUM', status: 'RUNNING', pressure: -0.099, cycleTimeSec: 36, description: 'ทดสอบรั่วซึมสุญญากาศ' },
      { id: 'FL-2-2', name: '2nd Flare', code: 'FLA-2', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 18, description: 'บานปากท่อรอบสุดท้าย' },
      { id: 'CUT-2', name: 'Eva Cutting', code: 'CUT-2', type: 'CUT', status: 'RUNNING', cycleTimeSec: 16, description: 'ตัดแต่งรูปทรงคอยล์' },
      { id: 'DIP-2', name: 'Dipping Tank', code: 'DIP-2', type: 'DIP', status: 'RUNNING', temperature: 46, cycleTimeSec: 25, description: 'ชุบกันสนิม' },
      { id: 'ROBOT-2', name: 'Robot Unloader', code: 'RBT-2', type: 'ROBOT', status: 'RUNNING', speed: 110, cycleTimeSec: 15, description: 'หุ่นยนต์จัดเรียงพาเลท' },
      { id: 'HPIN-3', name: 'H/Pin-3 In-Feed', code: 'HP-3', type: 'HPIN', status: 'RUNNING', speed: 110, cycleTimeSec: 10, description: 'ป้อน Hairpin คอยล์ HE-2' }
    ]
  },
  {
    id: 'HE-3',
    name: 'HE-3 Line',
    building: 'A2',
    modelInProduction: 'AEB73820101',
    targetPerHour: 100,
    actualPerHour: 95,
    efficiency: 95.0,
    status: 'ACTIVE',
    feedZone: 'DA2D-1 (R15-R20)',
    stations: [
      { id: 'FP-E3', name: 'FIN Press E-3', code: 'FP-3', type: 'PRESS', status: 'RUNNING', pressure: 50, speed: 100, cycleTimeSec: 32, description: 'เครื่องปั๊มครีบ Fin Press HE-3' },
      { id: 'EXP-3', name: 'Expender', code: 'EXP-3', type: 'EXPANDER', status: 'RUNNING', pressure: 60, speed: 100, cycleTimeSec: 34, description: 'เครื่องขยายท่อทองแดง' },
      { id: 'FL-1-3', name: '1st Flare', code: 'FLA-1', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 16, description: 'บานท่อขั้นที่หนึ่ง' },
      { id: 'OVEN-3', name: 'Dry Oven', code: 'OVN-3', type: 'OVEN', status: 'RUNNING', temperature: 180, cycleTimeSec: 120, description: 'เตาอบแห้งคอยล์' },
      { id: 'BLOW-3', name: 'Air blow', code: 'AB-3', type: 'BLOW', status: 'RUNNING', pressure: 6.5, cycleTimeSec: 10, description: 'เป่าลมแรงดันสูง' },
      { id: 'BEND-3', name: 'R/Bend', code: 'RB-3', type: 'BEND', status: 'RUNNING', cycleTimeSec: 24, description: 'ประกอบท่อ Return Bend' },
      { id: 'N2-3-1', name: 'N2 Charge', code: 'N2-1', type: 'CV', status: 'RUNNING', pressure: 3.2, cycleTimeSec: 12, description: 'ชาร์จไนโตรเจน' },
      { id: 'CV-3', name: 'C/V Link', code: 'CV-3', type: 'CV', status: 'RUNNING', speed: 100, cycleTimeSec: 8, description: 'สายพานลำเลียงเชื่อมสถานี' },
      { id: 'BRAZ-3', name: 'Auto Brazing', code: 'BRZ-3', type: 'BRAZING', status: 'RUNNING', temperature: 685, cycleTimeSec: 48, description: 'เตาเชื่อมเชื่อมอัตโนมัติ' },
      { id: 'N2-3-2', name: 'N2 Purge', code: 'N2-2', type: 'CV', status: 'RUNNING', pressure: 3.5, cycleTimeSec: 12, description: 'ไล่ก๊าซไนโตรเจน' },
      { id: 'VAC-3', name: 'Vacuum Leak Test', code: 'VAC-3', type: 'VACUUM', status: 'RUNNING', pressure: -0.098, cycleTimeSec: 36, description: 'ทดสอบสุญญากาศ' },
      { id: 'FL-2-3', name: '2nd Flare', code: 'FLA-2', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 18, description: 'บานท่อขั้นที่สอง' },
      { id: 'CUT-3', name: 'Eva Cutting', code: 'CUT-3', type: 'CUT', status: 'RUNNING', cycleTimeSec: 16, description: 'ตัดแต่งขอบคอยล์' },
      { id: 'ROBOT-3', name: 'Robot Unloader', code: 'RBT-3', type: 'ROBOT', status: 'RUNNING', speed: 100, cycleTimeSec: 16, description: 'แขนกลยกลงพาเลท' },
      { id: 'HPIN-2', name: 'H/Pin-2 In-Feed', code: 'HP-2', type: 'HPIN', status: 'RUNNING', speed: 100, cycleTimeSec: 10, description: 'ป้อนท่อ Hairpin 2' }
    ]
  }
];

export const A4_HE_LINES: HELineConfig[] = [
  {
    id: 'HE-4',
    name: 'HE-4 Line',
    building: 'A4',
    modelInProduction: 'MDL-HE4-PREM',
    targetPerHour: 130,
    actualPerHour: 128,
    efficiency: 98.4,
    status: 'ACTIVE',
    feedZone: 'DA4D-1 (X1-X4) & DA4D-2',
    stations: [
      { id: 'HPIN-6', name: 'H/Pin-6 Dual Feed', code: 'HP-6', type: 'HPIN', status: 'RUNNING', speed: 130, cycleTimeSec: 10, description: 'ป้อนท่อ Hairpin สเตชั่น 6' },
      { id: 'HPIN-5', name: 'H/Pin-5 Dual Feed', code: 'HP-5', type: 'HPIN', status: 'RUNNING', speed: 130, cycleTimeSec: 10, description: 'ป้อนท่อ Hairpin สเตชั่น 5' },
      { id: 'FP-E4', name: 'FIN Press E-4', code: 'FP-4', type: 'PRESS', status: 'RUNNING', pressure: 52, speed: 130, cycleTimeSec: 26, description: 'เครื่องปั๊ม Fin Press ความเร็วสูง' },
      { id: 'EXP-4', name: 'Expender', code: 'EXP-4', type: 'EXPANDER', status: 'RUNNING', pressure: 65, speed: 130, cycleTimeSec: 28, description: 'เครื่องขยายท่อความแม่นยำสูง' },
      { id: 'FL-1-4', name: '1st Flare', code: 'FLA-1', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 14, description: 'บานท่อรอบแรก' },
      { id: 'OVEN-4', name: 'Dry Oven High Temp', code: 'OVN-4', type: 'OVEN', status: 'RUNNING', temperature: 190, cycleTimeSec: 110, description: 'เตาอบแห้งประสิทธิภาพสูง' },
      { id: 'BLOW-4', name: 'Air blow High Flow', code: 'AB-4', type: 'BLOW', status: 'RUNNING', pressure: 7.0, cycleTimeSec: 8, description: 'เป่าลมแรงดันสูงพิเศษ' },
      { id: 'BEND-4', name: 'R/Bend', code: 'RB-4', type: 'BEND', status: 'RUNNING', cycleTimeSec: 20, description: 'ประกอบ Return Bend' },
      { id: 'N2-4-1', name: 'N2 Charge', code: 'N2-1', type: 'CV', status: 'RUNNING', pressure: 3.4, cycleTimeSec: 10, description: 'อัดไนโตรเจนป้องกันออกไซด์' },
      { id: 'CV-4', name: 'C/V Link Conveyor', code: 'CV-4', type: 'CV', status: 'RUNNING', speed: 130, cycleTimeSec: 7, description: 'สายพานลำเลียงอัจฉริยะ' },
      { id: 'BRAZ-4', name: 'Auto Brazing Machine', code: 'BRZ-4', type: 'BRAZING', status: 'RUNNING', temperature: 700, cycleTimeSec: 42, description: 'ระบบเชื่อมอัตโนมัติ 700°C' },
      { id: 'N2-4-2', name: 'N2 Purge', code: 'N2-2', type: 'CV', status: 'RUNNING', pressure: 3.6, cycleTimeSec: 10, description: 'ไล่ก๊าซไนโตรเจน' },
      { id: 'VAC-4', name: 'Vacuum Test Pro', code: 'VAC-4', type: 'VACUUM', status: 'RUNNING', pressure: -0.100, cycleTimeSec: 32, description: 'ทดสอบสุญญากาศดิจิทัล' },
      { id: 'FL-2-4', name: '2nd Flare', code: 'FLA-2', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 16, description: 'บานท่อรอบสุดท้าย' },
      { id: 'ROBOT-4', name: 'Robot Unloader Pro', code: 'RBT-4', type: 'ROBOT', status: 'RUNNING', speed: 130, cycleTimeSec: 14, description: 'แขนกล 6 แกนยกลงพาเลท' }
    ]
  },
  {
    id: 'HE-5',
    name: 'HE-5 Line',
    building: 'A4',
    modelInProduction: 'MDL-HE5-PRO',
    targetPerHour: 125,
    actualPerHour: 122,
    efficiency: 97.6,
    status: 'ACTIVE',
    feedZone: 'DA4D-1 (X5-X8) & DA4D-3',
    stations: [
      { id: 'HPIN-4', name: 'H/Pin-4 Feeder', code: 'HP-4', type: 'HPIN', status: 'RUNNING', speed: 125, cycleTimeSec: 10, description: 'ป้อนท่อ Hairpin สเตชั่น 4' },
      { id: 'FP-E5', name: 'FIN Press E-5', code: 'FP-5', type: 'PRESS', status: 'RUNNING', pressure: 50, speed: 125, cycleTimeSec: 28, description: 'เครื่องปั๊ม Fin Press HE-5' },
      { id: 'EXP-5', name: 'Expender Pro', code: 'EXP-5', type: 'EXPANDER', status: 'RUNNING', pressure: 64, speed: 125, cycleTimeSec: 30, description: 'เครื่องขยายท่อทองแดง' },
      { id: 'FL-1-5', name: '1st Flare', code: 'FLA-1', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 15, description: 'บานท่อรอบแรก' },
      { id: 'OVEN-5', name: 'Dry Oven Pro', code: 'OVN-5', type: 'OVEN', status: 'RUNNING', temperature: 185, cycleTimeSec: 115, description: 'เตาอบแห้งคอยล์ร้อน' },
      { id: 'BLOW-5', name: 'Air blow', code: 'AB-5', type: 'BLOW', status: 'RUNNING', pressure: 6.8, cycleTimeSec: 9, description: 'เป่าลมแรงดันสูง' },
      { id: 'BEND-5', name: 'R/Bend', code: 'RB-5', type: 'BEND', status: 'RUNNING', cycleTimeSec: 22, description: 'ประกอบ Return Bend' },
      { id: 'N2-5-1', name: 'N2 Charge', code: 'N2-1', type: 'CV', status: 'RUNNING', pressure: 3.3, cycleTimeSec: 11, description: 'อัดก๊าซไนโตรเจน' },
      { id: 'CV-5', name: 'C/V Link Conveyor', code: 'CV-5', type: 'CV', status: 'RUNNING', speed: 125, cycleTimeSec: 8, description: 'สายพานลำเลียงอัจฉริยะ' },
      { id: 'BRAZ-5', name: 'Auto Brazing Unit', code: 'BRZ-5', type: 'BRAZING', status: 'RUNNING', temperature: 695, cycleTimeSec: 44, description: 'เชื่อมเชื่อมอัตโนมัติ 695°C' },
      { id: 'N2-5-2', name: 'N2 Purge', code: 'N2-2', type: 'CV', status: 'RUNNING', pressure: 3.5, cycleTimeSec: 11, description: 'ระบายไนโตรเจน' },
      { id: 'VAC-5', name: 'Vacuum Leak Test', code: 'VAC-5', type: 'VACUUM', status: 'RUNNING', pressure: -0.099, cycleTimeSec: 34, description: 'ทดสอบสุญญากาศ' },
      { id: 'FL-2-5', name: '2nd Flare', code: 'FLA-2', type: 'FLARE', status: 'RUNNING', cycleTimeSec: 17, description: 'บานท่อรอบสุดท้าย' },
      { id: 'ROBOT-5', name: 'Robot Unloader Pro', code: 'RBT-5', type: 'ROBOT', status: 'RUNNING', speed: 125, cycleTimeSec: 15, description: 'แขนกลยกลงพาเลท' }
    ]
  }
];

// Helper: Color mapping for station machine types
export const getStationColor = (type: MachineStation['type']) => {
  switch (type) {
    case 'PRESS':
      return { bg: 'bg-emerald-600', border: 'border-emerald-400', glow: '#10b981', label: 'FIN Press' };
    case 'EXPANDER':
      return { bg: 'bg-teal-600', border: 'border-teal-400', glow: '#14b8a6', label: 'Expander' };
    case 'FLARE':
      return { bg: 'bg-cyan-600', border: 'border-cyan-400', glow: '#06b6d4', label: 'Flare' };
    case 'OVEN':
      return { bg: 'bg-amber-600', border: 'border-amber-400', glow: '#f59e0b', label: 'Dry Oven' };
    case 'BLOW':
      return { bg: 'bg-sky-600', border: 'border-sky-400', glow: '#38bdf8', label: 'Air Blow' };
    case 'BEND':
      return { bg: 'bg-purple-600', border: 'border-purple-400', glow: '#a855f7', label: 'R/Bend' };
    case 'BRAZING':
      return { bg: 'bg-rose-600', border: 'border-rose-400', glow: '#f43f5e', label: 'Auto Brazing' };
    case 'VACUUM':
      return { bg: 'bg-indigo-600', border: 'border-indigo-400', glow: '#6366f1', label: 'Vacuum Test' };
    case 'CUT':
      return { bg: 'bg-pink-600', border: 'border-pink-400', glow: '#ec4899', label: 'Eva Cut' };
    case 'DIP':
      return { bg: 'bg-blue-600', border: 'border-blue-400', glow: '#3b82f6', label: 'Dipping Tank' };
    case 'ROBOT':
      return { bg: 'bg-yellow-500', border: 'border-yellow-300', glow: '#eab308', label: 'Robot 6-Axis' };
    case 'HPIN':
      return { bg: 'bg-orange-500', border: 'border-orange-300', glow: '#f97316', label: 'Hairpin Feeder' };
    default:
      return { bg: 'bg-slate-600', border: 'border-slate-400', glow: '#64748b', label: 'C/V Link' };
  }
};

interface HEProductionLine3DModalProps {
  lineConfig: HELineConfig;
  onClose: () => void;
}

export const HEProductionLine3DModal: React.FC<HEProductionLine3DModalProps> = ({ lineConfig, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedStation, setSelectedStation] = useState<MachineStation | null>(lineConfig.stations[0] || null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'3D' | 'SCHEMATIC'>('3D');

  useEffect(() => {
    if (!mountRef.current || activeTab !== '3D') return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 420;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 32);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 10;
    controls.maxDistance = 70;
    controls.target.set(0, 2, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const bluePoint = new THREE.PointLight(0x38bdf8, 2, 50);
    bluePoint.position.set(-15, 10, 5);
    scene.add(bluePoint);

    const orangePoint = new THREE.PointLight(0xf97316, 2, 50);
    orangePoint.position.set(15, 10, -5);
    scene.add(orangePoint);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(80, 40, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Factory Floor Plane with metallic shine
    const floorGeo = new THREE.PlaneGeometry(80, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Build the 3D Conveyor Track & Machine Models along the line
    const stationsCount = lineConfig.stations.length;
    const startX = -((stationsCount - 1) * 2.8) / 2;

    // Conveyor Rail
    const railLength = stationsCount * 2.8 + 4;
    const railGeo = new THREE.BoxGeometry(railLength, 0.4, 1.6);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const conveyorRail = new THREE.Mesh(railGeo, railMat);
    conveyorRail.position.set(0, 0.6, 0);
    conveyorRail.castShadow = true;
    conveyorRail.receiveShadow = true;
    scene.add(conveyorRail);

    // Rollers on conveyor
    for (let r = -railLength / 2 + 0.5; r <= railLength / 2 - 0.5; r += 0.8) {
      const rollerGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 12);
      const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
      const roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(r, 0.82, 0);
      scene.add(roller);
    }

    // Moving Coil Parts on Conveyor
    const coils: THREE.Mesh[] = [];
    for (let c = 0; c < 8; c++) {
      const coilGeo = new THREE.BoxGeometry(0.8, 0.6, 0.9);
      const coilMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.9,
        roughness: 0.3,
      });
      const coil = new THREE.Mesh(coilGeo, coilMat);
      coil.position.set(startX + (c * (railLength / 8)), 1.15, 0);
      coil.castShadow = true;
      scene.add(coil);
      coils.push(coil);
    }

    // Stations 3D Meshes
    lineConfig.stations.forEach((st, idx) => {
      const posX = startX + idx * 2.8;
      const group = new THREE.Group();
      group.position.set(posX, 0, 0);

      // Station Base Pedestal
      const baseGeo = new THREE.BoxGeometry(2.2, 0.4, 2.4);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.2;
      base.castShadow = true;
      group.add(base);

      // Machine Body depending on type
      if (st.type === 'PRESS') {
        // Fin Press Large Heavy Arch Frame
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.7, roughness: 0.3 });
        const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.6), pillarMat);
        leftPillar.position.set(-0.8, 2.3, 0);
        const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.6), pillarMat);
        rightPillar.position.set(0.8, 2.3, 0);
        const topHeader = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.2), pillarMat);
        topHeader.position.set(0, 4.2, 0);
        const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9 }));
        piston.position.set(0, 3.0, 0);
        group.add(leftPillar, rightPillar, topHeader, piston);
      } else if (st.type === 'OVEN' || st.type === 'BRAZING') {
        // High temp chamber tunnel
        const ovenMat = new THREE.MeshStandardMaterial({
          color: st.type === 'BRAZING' ? 0x991b1b : 0xd97706,
          metalness: 0.6,
          roughness: 0.4,
        });
        const chamber = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.0), ovenMat);
        chamber.position.set(0, 2.0, 0);
        chamber.castShadow = true;

        // Glowing internal heat aperture
        const heatGeo = new THREE.BoxGeometry(2.45, 0.8, 1.0);
        const heatMat = new THREE.MeshBasicMaterial({ color: st.type === 'BRAZING' ? 0xff4500 : 0xfbbf24 });
        const heatGlow = new THREE.Mesh(heatGeo, heatMat);
        heatGlow.position.set(0, 1.5, 0);

        // Exhaust chimney on top
        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        chimney.position.set(0, 3.8, 0);

        group.add(chamber, heatGlow, chimney);
      } else if (st.type === 'ROBOT') {
        // 6-Axis Articulated Robot Arm
        const robotBaseMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8 });
        const rBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 16), robotBaseMat);
        rBase.position.set(0, 0.7, -1.0);
        const rArm1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.25), robotBaseMat);
        rArm1.position.set(0, 1.8, -0.7);
        rArm1.rotation.x = Math.PI / 6;
        const rArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x334155 }));
        rArm2.position.set(0, 2.8, -0.1);
        rArm2.rotation.x = -Math.PI / 4;
        const gripper = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
        gripper.position.set(0, 2.2, 0.5);
        group.add(rBase, rArm1, rArm2, gripper);
      } else if (st.type === 'VACUUM') {
        // Cylindrical bell chamber
        const vacMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 });
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 24), vacMat);
        bell.position.set(0, 2.0, 0);
        const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        gauge.rotation.x = Math.PI / 2;
        gauge.position.set(0, 3.0, 0.85);
        group.add(bell, gauge);
      } else if (st.type === 'HPIN') {
        // Multi-tube hairpin feeder rack
        const hpMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.7 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 1.4), hpMat);
        frame.position.set(0, 2.0, 0);
        // Tubes array
        for (let t = -0.6; t <= 0.6; t += 0.3) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
          tube.position.set(t, 2.0, 0.75);
          group.add(tube);
        }
        group.add(frame);
      } else {
        // Standard Industrial Station Module
        const stdMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 1.6), stdMat);
        box.position.set(0, 1.8, 0);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        panel.position.set(0, 2.2, 0.85);
        group.add(box, panel);
      }

      // Indicator Status Beacon Light on Top (Green for Running)
      const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 4.4, 0);
      group.add(beacon);

      scene.add(group);
    });

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate coils moving along conveyor
      if (isSimulating) {
        coils.forEach((coil) => {
          coil.position.x += 0.04;
          if (coil.position.x > railLength / 2) {
            coil.position.x = -railLength / 2;
          }
        });
      }

      // Slow Scene Rotation if active
      if (isRotating) {
        scene.rotation.y += 0.0015;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [lineConfig, isRotating, isSimulating, activeTab]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  {lineConfig.name} &bull; จำลองโมเดลเครื่องจักร 3D สมจริง
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  ● OPERATIONAL ({lineConfig.efficiency}%)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                โรงงาน {lineConfig.building} &bull; กำลังผลิต Model: <strong className="text-amber-300 font-mono">{lineConfig.modelInProduction}</strong> &bull; ป้อนวัตถุดิบจากโซน: <strong className="text-sky-300">{lineConfig.feedZone}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('3D')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${activeTab === '3D' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                3D Interactive
              </button>
              <button
                onClick={() => setActiveTab('SCHEMATIC')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${activeTab === 'SCHEMATIC' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                ผังกระบวนการ (Schematic)
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* Main 3D Viewport / Canvas */}
          {activeTab === '3D' && (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-[380px] sm:h-[440px]">
              <div ref={mountRef} className="w-full h-full" />

              {/* 3D Floating Control HUD */}
              <div className="absolute top-3 left-3 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white">
                <button
                  onClick={() => setIsRotating(!isRotating)}
                  className={`px-2 py-1 rounded font-bold flex items-center space-x-1 ${isRotating ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isRotating ? 'หมุน 3D อัตโนมัติ' : 'หยุดหมุน'}</span>
                </button>
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`px-2 py-1 rounded font-bold flex items-center space-x-1 ${isSimulating ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSimulating ? 'ชิ้นงานเคลื่อนที่' : 'หยุดจำลอง'}</span>
                </button>
              </div>

              <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300">
                💡 คลิกซ้ายค้างเพื่อหมุนมุมมอง 3D &bull; Scroll เพื่อซูมเข้า-ออก
              </div>
            </div>
          )}

          {/* Schematic Overview of all 15-16 Stations */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2 px-1">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>สถานีเครื่องจักรต่อเนื่อง ({lineConfig.stations.length} สเตชั่น):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">คลิกสเตชั่นเพื่อดูค่า Telemetry เซนเซอร์</span>
            </div>

            {/* Horizontal Flow Chain of Machines */}
            <div className="flex items-center overflow-x-auto pb-2 gap-2 custom-scrollbar">
              {lineConfig.stations.map((st, idx) => {
                const colors = getStationColor(st.type);
                const isSelected = selectedStation?.id === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStation(st)}
                    className={`shrink-0 cursor-pointer p-2.5 rounded-xl border transition-all text-center min-w-[110px] ${
                      isSelected 
                        ? 'bg-blue-900/60 border-blue-400 ring-2 ring-blue-500/40 shadow-lg scale-105' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[9px] font-mono text-slate-400">
                      <span>#{idx + 1}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
                    </div>
                    <div className={`w-8 h-8 mx-auto rounded-lg ${colors.bg} flex items-center justify-center text-white mb-1.5 shadow-md`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] font-bold text-white truncate">{st.name}</div>
                    <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">{st.cycleTimeSec}s / pcs</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Station Telemetry Card */}
          {selectedStation && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    {selectedStation.code}
                  </span>
                  <h4 className="text-sm font-bold text-white">{selectedStation.name}</h4>
                </div>
                <p className="text-xs text-slate-400">{selectedStation.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-400">Cycle Time</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">{selectedStation.cycleTimeSec} วินาที</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-400">ความเร็วสถานี</div>
                  <div className="text-sm font-mono font-bold text-sky-400">{selectedStation.speed || 120} ชิ้น/ชม.</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-400">อุณหภูมิ / แรงดัน</div>
                  <div className="text-sm font-mono font-bold text-amber-400">
                    {selectedStation.temperature ? `${selectedStation.temperature}°C` : selectedStation.pressure ? `${selectedStation.pressure} Bar` : 'ปกติ'}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-400">สถานะเซนเซอร์</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center justify-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>NORMAL</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            เป้าหมายกะปัจจุบัน: <strong className="text-white font-mono">{lineConfig.actualPerHour} / {lineConfig.targetPerHour} Pcs/Hr</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-sm transition-all"
          >
            ปิดหน้าต่าง 3D
          </button>
        </div>

      </div>
    </div>
  );
};
