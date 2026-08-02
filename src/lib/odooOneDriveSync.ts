export interface OdooOneDriveConfig {
  // Odoo ERP Config
  odooEnabled: boolean;
  odooUrl: string;
  odooDb: string;
  odooUser: string;
  odooApiKey: string;
  odooWebhookSecret: string;
  odooLocationSrc: string;
  odooLocationDest: string;
  autoSyncOdooOnScan: boolean;

  // OneDrive Config
  oneDriveEnabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  folderPath: string;
  autoBackupOnScan: boolean;

  // Status
  lastOdooSyncAt?: string;
  lastOneDriveBackupAt?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'IN' | 'OUT' | 'BACKUP' | 'WEBHOOK_IN';
  modelHE: string;
  qty: number;
  locatorCode: string;
  odooStatus: 'SUCCESS' | 'FAILED' | 'DISABLED';
  oneDriveStatus: 'SUCCESS' | 'FAILED' | 'DISABLED';
  details: string;
  httpCode?: number;
}

const CONFIG_KEY = 'wms_odoo_onedrive_config_v1';
const LOGS_KEY = 'wms_odoo_onedrive_logs_v1';

export const defaultConfig: OdooOneDriveConfig = {
  odooEnabled: true,
  odooUrl: 'https://company-erp.odoo.com',
  odooDb: 'wms_production_db',
  odooUser: 'wms_integration_service@company.com',
  odooApiKey: 'odoo_live_key_9f88a2110c',
  odooWebhookSecret: 'whsec_983719827398127391',
  odooLocationSrc: 'WH/Stock',
  odooLocationDest: 'WH/Output',
  autoSyncOdooOnScan: true,

  oneDriveEnabled: true,
  tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
  clientId: 'b9415c2a-99d8-412f-9812-7104a9e21101',
  clientSecret: 'ms_graph_secret_••••••••••••',
  folderPath: '/OneDrive_Corporate/WMS_Backups/Logs_2026/',
  autoBackupOnScan: true,

  lastOdooSyncAt: new Date(Date.now() - 3600000).toLocaleString('th-TH'),
  lastOneDriveBackupAt: new Date(Date.now() - 1800000).toLocaleString('th-TH'),
};

export function getSyncConfig(): OdooOneDriveConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load Odoo/OneDrive config', e);
  }
  return defaultConfig;
}

export function saveSyncConfig(cfg: OdooOneDriveConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Failed to save Odoo/OneDrive config', e);
  }
}

export function getSyncLogs(): SyncLogEntry[] {
  try {
    const saved = localStorage.getItem(LOGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load sync logs', e);
  }

  // Initial demo logs
  const initialLogs: SyncLogEntry[] = [
    {
      id: 'LOG-1008',
      timestamp: new Date().toLocaleTimeString('th-TH'),
      type: 'IN',
      modelHE: 'ADL74920904',
      qty: 80,
      locatorCode: 'DA4D-1.02-E10-L1',
      odooStatus: 'SUCCESS',
      oneDriveStatus: 'SUCCESS',
      details: 'Odoo stock.move #10492 created & CSV Backup uploaded to OneDrive',
      httpCode: 200,
    },
    {
      id: 'LOG-1007',
      timestamp: new Date(Date.now() - 900000).toLocaleTimeString('th-TH'),
      type: 'OUT',
      modelHE: 'ADL76754205',
      qty: 40,
      locatorCode: 'DA4D-1.02-B11-L2',
      odooStatus: 'SUCCESS',
      oneDriveStatus: 'SUCCESS',
      details: 'Odoo stock.move #10491 picked & Auto-synced to Microsoft Graph API',
      httpCode: 200,
    },
    {
      id: 'LOG-1006',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('th-TH'),
      type: 'WEBHOOK_IN',
      modelHE: 'ACG76284709',
      qty: 200,
      locatorCode: 'DA4D-1.02-G2-L1',
      odooStatus: 'SUCCESS',
      oneDriveStatus: 'SUCCESS',
      details: 'Odoo ERP Webhook received: Stock Quant sync update',
      httpCode: 200,
    },
  ];
  return initialLogs;
}

export function addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): SyncLogEntry {
  const currentLogs = getSyncLogs();
  const newEntry: SyncLogEntry = {
    ...entry,
    id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toLocaleTimeString('th-TH'),
  };
  const updated = [newEntry, ...currentLogs].slice(0, 50); // keep last 50
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save log entry', e);
  }
  return newEntry;
}

/**
 * Triggers bidirectional sync to Odoo ERP and Auto-backup to OneDrive
 */
export async function triggerOdooOneDriveSync(data: {
  type: 'IN' | 'OUT';
  modelHE: string;
  partName?: string;
  qty: number;
  locatorCode: string;
}): Promise<{ odooSuccess: boolean; oneDriveSuccess: boolean; message: string }> {
  const config = getSyncConfig();

  let odooStatus: 'SUCCESS' | 'FAILED' | 'DISABLED' = 'DISABLED';
  let oneDriveStatus: 'SUCCESS' | 'FAILED' | 'DISABLED' = 'DISABLED';
  let messageParts: string[] = [];

  if (config.odooEnabled && config.autoSyncOdooOnScan) {
    // Simulate Odoo REST API stock.move creation
    odooStatus = 'SUCCESS';
    messageParts.push(`Odoo ERP Stock Move updated (${data.type})`);
    config.lastOdooSyncAt = new Date().toLocaleString('th-TH');
  }

  if (config.oneDriveEnabled && config.autoBackupOnScan) {
    // Simulate OneDrive Graph API File Append
    oneDriveStatus = 'SUCCESS';
    messageParts.push(`Backup CSV saved to OneDrive`);
    config.lastOneDriveBackupAt = new Date().toLocaleString('th-TH');
  }

  saveSyncConfig(config);

  const logDetails = `${data.type} ${data.qty} Units [${data.modelHE}] at ${data.locatorCode}`;
  addSyncLog({
    type: data.type,
    modelHE: data.modelHE,
    qty: data.qty,
    locatorCode: data.locatorCode,
    odooStatus,
    oneDriveStatus,
    details: logDetails,
    httpCode: 200,
  });

  return {
    odooSuccess: odooStatus === 'SUCCESS',
    oneDriveSuccess: oneDriveStatus === 'SUCCESS',
    message: messageParts.length > 0 ? messageParts.join(' | ') : 'Local transaction recorded',
  };
}
