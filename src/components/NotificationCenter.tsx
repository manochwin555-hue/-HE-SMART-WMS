import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Bell, X, AlertTriangle, Flame } from 'lucide-react';
import { useTranslation } from '../i18n/i18nContext';

export const NotificationCenter: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Deriving the list of items that require attention
  const activeAlerts = items.filter(item => 
    ['WARNING', 'URGENT', 'DUE_TODAY', 'EXPIRED', 'CONDITION_NG', 'DATA_INCOMPLETE'].includes(item.agingStatus) ||
    item.holdStatus
  );

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="relative w-12 h-12 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <Bell className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
            {activeAlerts.length > 99 ? '99+' : activeAlerts.length}
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-80 max-w-[calc(100vw-2rem)] bg-slate-900 border border-amber-500/50 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-100">{t('notifications.title')}</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2 space-y-2 no-scrollbar">
            {activeAlerts.slice(0, 50).map((alert, i) => (
              <div key={alert.id || i} className="bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 flex items-start gap-2.5">
                <div className={`p-1.5 rounded-md shrink-0 ${alert.agingStatus === 'EXPIRED' || alert.agingStatus === 'CONDITION_NG' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{alert.modelHE}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {t('common.location')}: {alert.locatorCode}<br/>
                    {t('common.status')}: <span className="font-bold text-amber-400">{alert.agingStatus}</span>
                    {alert.holdReason && <span className="text-rose-400"> (Hold: {alert.holdReason})</span>}
                  </p>
                </div>
              </div>
            ))}
            {activeAlerts.length > 50 && (
              <div className="text-center text-[10px] text-slate-500 py-2 font-bold">
                {t('common.total')}: {activeAlerts.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
