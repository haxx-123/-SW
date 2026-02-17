

export interface RawERPRecord {
  [key: string]: any;
}

export interface RawPaymentRecord {
  [key: string]: any;
}

export interface ERPRecord {
  id: string;
  date: Date;
  amount: number; // Net amount (after deposit deduction)
  deposit: number; // Deposit amount consumed
  salesAmount: number; // NEW: Actual Service Value (Sales = Net + Deposit, Recharge = 0)
  type: string;
  client: string;
  remark: string;
  phone: string;
  isCash: boolean;
  commission: number;
}

export interface PaymentRecord {
  id: string; // generated
  date: Date;
  amount: number;
  type: string;
  direction: 'income' | 'expenditure';
  counterParty: string;
  source: 'WeChat' | 'Alipay';
  originalRow: any;
  originalId?: string; // Copied from source file if available (e.g. Transaction ID)
}

export interface MatchedPair {
  erp: ERPRecord;
  payment: PaymentRecord;
  timeDiffMinutes: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReconciliationResult {
  summary: {
    totalRevenueERP: number;
    totalRevenueActual: number;
    totalValidRevenue: number; // NEW: Effective Revenue (Sales Amount)
    totalWechat: number;
    totalAlipay: number;
    variance: number;
    cashBalance: number; // Manual input
    totalCommission: number;
    footfall: number;
    matchRate: number;
  };
  matches: MatchedPair[];
  missingMoney: ERPRecord[]; // Type A
  missingEntry: PaymentRecord[]; // Type B
  cashRecords: ERPRecord[]; // Added for Audit
  depositRecords: ERPRecord[]; // Added for Audit
  processedAt: string;
  dateRange: DateRange; // NEW
  inferredPeriod: string; // NEW
}

export interface CommissionRule {
  id: string;
  name: string;
  keyword: string;
  rate: number;
}

export interface AppConfig {
  matchTimeWindow: number;
  aggregationTimeWindow: number;
  commissionRules: CommissionRule[];
}

export interface AnalysisState {
  cashActual: number;
  results: ReconciliationResult | null;
  loading: boolean;
  fileNameERP: string;
  fileNameWechat: string;
  fileNameAlipay: string;
  config: AppConfig;
  rawData?: {
    erp: any[][];
    payment: any[][];
  };
}

// NEW: Manual Mapping Configurations
export interface ColumnMapping {
  [key: string]: number; // Field Key -> Column Index
}

export interface FileMappingConfig {
  headerRowIndex: number;
  mapping: ColumnMapping;
}

// Declare XLSX global for the CDN script
declare global {
  interface Window {
    XLSX: any;
  }
}