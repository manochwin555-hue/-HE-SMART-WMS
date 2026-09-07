import React, { useState } from 'react';
import { InventoryItem, ProtectionMethod, WrappingCondition, AuditLog } from '../types';
import { X, Save, AlertTriangle, ShieldCheck, Box } from 'lucide-react';
import { getBangkokDateString } from '../utils/vinylWrappingRule';

interface Props {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (updatedItem: InventoryItem, log: AuditLog) => void;
}

export const VinylWrappingActionModal: React.FC<Props> = ({ isOpen, item, onClose, onSave }) => {
  if (!isOpen || !item) return null;

  const [condition, setCondition] = useState<WrappingCondition>(item.wrappingCondition || 'OK');
  const [remark, setRemark] = useState<string>(item.remark || '');
  const [isReWrapping, setIsReWrapping] = useState(false);

  const handleSave = () => {
    const updated = { ...item };
    updated.wrappingCondition = condition;
    updated.remark = remark;

    if (condition === 'NG') {
      updated.holdStatus = true;
      updated.holdReason = 'Condition NG';
      updated.agingStatus = 'CONDITION_NG';
    }

    if (isReWrapping) {
      updated.wrappingDate = getBangkokDateString(new Date());
      updated.protectionMethod = 'VINYL_WRAPPING';
      updated.wrappingCondition = 'OK';
      updated.holdStatus = false;
      updated.holdReason = undefined;
    }

    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: isReWrapping ? 'RE_WRAPPING' : 'CONDITION_UPDATE',
      itemId: item.id,
      modelHE: item.modelHE,
      locatorCode: item.locatorCode,
      oldValue: `Condition: ${item.wrappingCondition}, Hold: ${item.holdStatus}`,
      newValue: `Condition: ${updated.wrappingCondition}, Hold: ${updated.holdStatus}`,
      reason: remark,
      user: 'Admin'
    };

    onSave(updated, log);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-4 text-white">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h3 className="font-bold text-sm">จัดการสถานะ Vinyl Wrapping</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded"><X className="w-4 h-4" /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Part Name</label>
            <div className="text-sm font-bold text-blue-300">{item.modelHE}</div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">สถานะฟิล์ม (Condition)</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as WrappingCondition)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-amber-500 outline-none"
            >
              <option value="NOT_INSPECTED">Not Inspected</option>
              <option value="OK">OK</option>
              <option value="NG">NG (ฉีกขาด/เสียหาย)</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <input type="checkbox" id="rewrap" checked={isReWrapping} onChange={e => setIsReWrapping(e.target.checked)} className="w-4 h-4 accent-amber-500" />
            <label htmlFor="rewrap" className="text-xs text-slate-300 cursor-pointer">ดำเนินการ Re-Wrapping (ต่ออายุฟิล์มใหม่)</label>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">หมายเหตุ (Reason)</label>
            <input type="text" value={remark} onChange={e => setRemark(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white" />
          </div>

          <button onClick={handleSave} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg mt-4">บันทึกข้อมูล (Save & Audit)</button>
        </div>
      </div>
    </div>
  );
};
