

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
}

export interface MatchedPair {
  erp: ERPRecord;
  payment: PaymentRecord;
  timeDiffMinutes: number;
}

export interface ReconciliationResult {
  summary: {
    totalRevenueERP: number;
    totalRevenueActual: number;
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

// Declare XLSX global for the CDN script
declare global {
  interface Window {
    XLSX: any;
  }
}