

import { ERPRecord, PaymentRecord, ReconciliationResult, MatchedPair, AppConfig, FileMappingConfig } from '../types';
import { BLACKLIST_TYPES, BLACKLIST_STATUS, BLACKLIST_COUNTERPARTY } from '../constants';

// --- Helper Functions ---

const parseDate = (val: any): Date | null => {
  if (val instanceof Date) return val;
  if (!val) return null;
  // Handle Excel serial dates if necessary, though XLSX usually handles this.
  // Handle string dates like "2026/2/14 18:43:39"
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const cleanAmount = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = String(val).trim();
  
  // Remove currency symbols, commas, and other non-numeric chars except dot and minus
  // Note: We strip '¥' explicitly and then generally clean up
  str = str.replace(/[¥,]/g, '');

  // Handle dirty space-separated values e.g. "15 15.00" -> Take the first valid number
  if (str.includes(' ')) {
    const parts = str.split(/\s+/);
    // Find first part that looks like a number
    for (const part of parts) {
      if (!isNaN(parseFloat(part))) {
        str = part;
        break;
      }
    }
  }

  // Handle trailing minus sign common in some accounting exports (e.g. "100-")
  if (str.endsWith('-')) {
    str = '-' + str.slice(0, -1);
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// --- Ingestion (Smart Parsing) ---

// Smart Header Sniffer: Scans first 100 rows for key anchors to find the true header
export const detectHeaderRow = (data: any[][]): number => {
  const limit = Math.min(data.length, 100); 
  // Extended anchors based on screenshots
  const anchors = [
    '支付日期', '实收额', '支付序号', '电话 1', // ERP specific
    '交易时间', '收支类型', '交易类型', '金额', '明细名称', // Payment specific
    '资金流向', '业务描述', '押金', // Alipay specific often + ERP Deposit
    '收/支', '商品说明', '交易分类', '交易状态', '交易订单号' // New Alipay Format Specifics
  ];
  
  let bestScore = 0;
  let bestIndex = -1;

  for (let i = 0; i < limit; i++) {
    const row = data[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Convert row to string for keyword search (containment)
    const rowStr = row.map(cell => String(cell || '').trim()).join(' ');
    let score = 0;
    
    anchors.forEach(k => {
      if (rowStr.includes(k)) score++;
    });

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  
  // Require at least 2 matches to be confident
  return bestScore >= 2 ? bestIndex : -1;
};

// Helper to find column index with fuzzy matching but prioritized exact match
export const getColIndex = (headers: any[], possibleNames: string[], excludeNames: string[] = []): number => {
  if (!headers) return -1;

  // 1. Priority: Exact Match (Trimmed)
  const exactIdx = headers.findIndex(h => {
    if (!h) return false;
    const str = String(h).trim();
    if (excludeNames.some(ex => str.includes(ex))) return false;
    return possibleNames.includes(str);
  });
  if (exactIdx !== -1) return exactIdx;

  // 2. Fallback: Partial Match (Containment)
  return headers.findIndex(h => {
    if (!h) return false;
    const str = String(h).trim();
    if (excludeNames.some(ex => str.includes(ex))) return false;
    return possibleNames.some(name => str.includes(name));
  });
};

export const processERPData = (rawData: any[][], config: AppConfig, manualConfig?: FileMappingConfig | null): ERPRecord[] => {
  let headerIdx = -1;
  let colMap: any = {};

  if (manualConfig) {
      // Manual Mode
      headerIdx = manualConfig.headerRowIndex;
      colMap = manualConfig.mapping;
  } else {
      // Auto Mode
      headerIdx = detectHeaderRow(rawData);
      if (headerIdx === -1) {
        throw new Error("ERP解析错误: 无法找到表头。请尝试使用'手动匹配'功能。");
      }
      const headers = rawData[headerIdx] as string[];
      // Dynamic Column Mapping (Fuzzy)
      colMap = {
        date: getColIndex(headers, ['支付日期', 'Date', 'Time', '时间', '日期']),
        amount: getColIndex(headers, ['实收额', 'Amount', 'Price', '金额', '实收'], ['押金']),
        deposit: getColIndex(headers, ['押金', 'Deposit', '储值']),
        cash: getColIndex(headers, ['现金', 'Cash']),
        type: getColIndex(headers, ['交易类型', 'Type', '类型']),
        client: getColIndex(headers, ['客户名', 'Client', 'Name', '客户']),
        remark: getColIndex(headers, ['备注', 'Remark', 'Note', '说明']),
        phone: getColIndex(headers, ['电话 1', '电话', 'Phone', 'Mobile']),
        id: getColIndex(headers, ['支付序号', 'ID', 'Order', '单号'])
      };
  }

  const headers = rawData[headerIdx] as string[];
  const rows = rawData.slice(headerIdx + 1);
  const totalRawRows = rows.length;

  // Validation: Missing Required Columns
  if (colMap.date === -1 || colMap.amount === -1 || colMap.date === undefined || colMap.amount === undefined) {
     throw new Error(`缺少关键列 (支付日期/实收额)。${manualConfig ? '请检查手动映射配置。' : '自动识别失败。'}`);
  }

  const records: ERPRecord[] = [];
  const droppedRows: any[] = [];

  rows.forEach((row, idx) => {
    if (!row || row.length === 0) return;

    const amountVal = colMap.amount > -1 ? row[colMap.amount] : 0;
    const dateVal = colMap.date > -1 ? row[colMap.date] : null;

    let rawAmount = cleanAmount(amountVal);
    const date = parseDate(dateVal);
    
    // Handle Deposit Deduction (ignore amount paid via deposit)
    const depositVal = colMap.deposit > -1 ? row[colMap.deposit] : 0;
    const deposit = cleanAmount(depositVal);
    
    // Net Amount (Actual cash/digital flow)
    const amount = parseFloat((rawAmount - deposit).toFixed(2));

    // Handle Cash Column Detection
    const cashVal = colMap.cash > -1 ? row[colMap.cash] : 0;
    const cashAmount = cleanAmount(cashVal);

    const type = colMap.type > -1 ? (row[colMap.type] || 'Unknown').toString() : 'Unknown';
    const isCash = type.includes('现金') || (cashAmount > 0); 

    // Filter Logic:
    if (!date || (Math.abs(amount) < 0.01 && Math.abs(deposit) < 0.01 && !isCash)) {
      droppedRows.push({ row: idx + headerIdx + 1, reason: "Invalid Date or Zero Value", data: row });
      return; 
    }

    const client = colMap.client > -1 ? (row[colMap.client] || 'Unknown').toString() : 'Unknown';
    const remark = colMap.remark > -1 ? (row[colMap.remark] || '').toString() : '';
    const phone = colMap.phone > -1 ? (row[colMap.phone] || '').toString() : '';
    const id = colMap.id > -1 ? (row[colMap.id] || '').toString() : `ERP_GEN_${idx}`;
    
    // Commission Logic (Dynamic)
    let commission = 0;
    const isRecharge = type.includes('押金充值') || type.includes('充值');

    if (config && config.commissionRules && !isRecharge) {
        const matchedRule = config.commissionRules.find(rule => 
            remark.includes(rule.keyword)
        );
        if (matchedRule) {
            commission = rawAmount * matchedRule.rate;
        }
    }

    const salesAmount = isRecharge ? 0 : (amount + deposit);

    records.push({
      id,
      date,
      amount, // Net Amount (for matching)
      deposit, // Track deposit usage
      salesAmount, // New field for accurate spending calc
      type,
      client,
      remark,
      phone,
      isCash,
      commission
    });
  });

  console.group("ERP Data Processing Report");
  console.log(`Total Raw Rows: ${totalRawRows}`);
  console.log(`Final Clean Rows: ${records.length}`);
  console.groupEnd();

  return records;
};

export const processPaymentData = (rawData: any[][], source: 'WeChat' | 'Alipay', manualConfig?: FileMappingConfig | null): PaymentRecord[] => {
  let headerIdx = -1;
  let colMap: any = {};

  if (manualConfig) {
    headerIdx = manualConfig.headerRowIndex;
    colMap = manualConfig.mapping;
  } else {
    headerIdx = detectHeaderRow(rawData);
    if (headerIdx === -1) {
         console.warn(`[${source}] 无法找到表头，跳过此文件。`);
         return [];
    }
    const headers = rawData[headerIdx] as string[];
    colMap = {
      date: getColIndex(headers, ['交易时间', '时间', 'Time', 'Date', '日期']),
      amount: getColIndex(headers, ['金额', 'Amount', 'Price', '实收']),
      type: getColIndex(headers, ['商品说明', '交易类型', '类型', 'Type', '商品', '名称', '业务描述', '交易分类'], ['收支']),
      direction: getColIndex(headers, ['收/支', '收支类型', '收/支', '收支', 'Direction', 'Status', '资金流向']),
      status: getColIndex(headers, ['交易状态', '状态', 'Status', '交易状态', '当前状态']),
      counterParty: getColIndex(headers, ['交易对方', '对方', 'Counterparty', '明细名称', '商品名称', 'Name', '交易对方']),
      id: getColIndex(headers, ['交易订单号', '商家订单号', '交易单号', '单号', 'Order ID', 'Transaction ID'])
    };
  }
  
  const headers = rawData[headerIdx] as string[];
  const rows = rawData.slice(headerIdx + 1);
  const totalRawRows = rows.length;

  // Validation
  if (colMap.date === -1 || colMap.amount === -1 || colMap.date === undefined || colMap.amount === undefined) {
     throw new Error(`[${source}] 缺失关键列 (交易时间/金额)。${manualConfig ? '请检查手动映射。' : '自动识别失败。'}`);
  }

  const records: PaymentRecord[] = [];
  const droppedRows: any[] = [];

  rows.forEach((row, idx) => {
    if (!row || row.length === 0) return;

    // 1. Valid Row Check
    const dateVal = colMap.date > -1 ? row[colMap.date] : null;
    const date = parseDate(dateVal);
    
    const amountVal = colMap.amount > -1 ? row[colMap.amount] : 0;
    const amountRaw = cleanAmount(amountVal);

    if (!date) {
        droppedRows.push({ row: idx + headerIdx + 1, reason: "Invalid Date", data: row });
        return;
    }

    const type = colMap.type > -1 ? (row[colMap.type] || '').toString() : '';
    const rawDirection = colMap.direction > -1 ? (row[colMap.direction] || '').toString() : '';
    const status = colMap.status > -1 ? (row[colMap.status] || '').toString() : '';
    const counterParty = colMap.counterParty > -1 ? (row[colMap.counterParty] || '').toString() : '';
    const originalId = colMap.id > -1 ? (row[colMap.id] || '').toString() : undefined;
    
    // 2. The Purge (Strict Blacklist)

    // User Requirement: WeChat - Only allow '经营收款'.
    if (source === 'WeChat' && !type.includes('经营收款')) {
        droppedRows.push({ row: idx + headerIdx + 1, reason: `WeChat Filter: Only 经营收款 allowed, got ${type}`, data: row });
        return;
    }

    // Type Blacklist
    if (BLACKLIST_TYPES.some(bt => type.includes(bt))) {
        droppedRows.push({ row: idx + headerIdx + 1, reason: `Blacklist Type: ${type}`, data: row });
        return;
    }

    // Status Check
    if (BLACKLIST_STATUS.some(bs => status.includes(bs))) {
        droppedRows.push({ row: idx + headerIdx + 1, reason: `Blacklist Status: ${status}`, data: row });
        return;
    }

    // Counter-Party Filter
    if (BLACKLIST_COUNTERPARTY.some(cp => counterParty.includes(cp))) {
        droppedRows.push({ row: idx + headerIdx + 1, reason: `Blacklist CounterParty: ${counterParty}`, data: row });
        return;
    }

    // Logic: 
    // If Direction is "支出" (Expenditure), DROP IT unless it is a Refund ("退款").
    const isExpenditure = rawDirection.includes('支出');
    const isIncome = rawDirection.includes('收入');
    const isRefundType = type.includes('退款');

    let finalAmount = amountRaw;
    let finalDirection: 'income' | 'expenditure' = 'income';

    if (isExpenditure) {
      if (!isRefundType) {
         // It's a real expense (buying stuff), not a refund. Filter out.
         droppedRows.push({ row: idx + headerIdx + 1, reason: "Expenditure (Non-Refund)", data: row });
         return;
      } else {
         // It is a Refund. Keep it. Ensure amount is negative.
         finalDirection = 'expenditure';
         finalAmount = -Math.abs(amountRaw);
      }
    } else if (isIncome) {
       finalDirection = 'income';
       finalAmount = Math.abs(amountRaw);
    } else {
       if (amountRaw < 0) {
          finalDirection = 'expenditure';
       }
    }

    records.push({
      id: `${source}_GEN_${idx}`,
      date,
      amount: finalAmount,
      type,
      direction: finalDirection,
      counterParty,
      source, // Added source
      originalRow: row,
      originalId // Added optional ID
    });
  });

  console.group(`${source} Data Processing Report`);
  console.log(`Total Raw Rows: ${totalRawRows}`);
  console.log(`Final Clean Rows: ${records.length}`);
  console.groupEnd();

  return records;
};

// --- Aggregation ---

// New logic: Same Client, Close Time (<= window) -> Sum
const aggregateERPData = (records: ERPRecord[], windowMinutes: number): ERPRecord[] => {
  const groups: Record<string, ERPRecord[]> = {};
  const unaggregateable: ERPRecord[] = [];

  records.forEach(r => {
    // Treat empty/unknown clients as distinct (do not aggregate)
    if (!r.client || r.client === 'Unknown' || r.client.trim() === '') {
      unaggregateable.push(r);
    } else {
      if (!groups[r.client]) groups[r.client] = [];
      groups[r.client].push(r);
    }
  });

  const result: ERPRecord[] = [...unaggregateable];

  Object.values(groups).forEach(group => {
    // Sort by time ascending
    group.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (group.length === 0) return;

    let current = { ...group[0] };

    for (let i = 1; i < group.length; i++) {
      const next = group[i];
      const diffMinutes = (next.date.getTime() - current.date.getTime()) / 1000 / 60;

      if (diffMinutes <= windowMinutes) {
        // Merge Logic
        current.amount += next.amount;
        current.deposit += next.deposit;
        current.commission += next.commission;
        current.salesAmount += next.salesAmount; // Accumulate sales value separately
        current.id += `, ${next.id}`;
        
        // Preserve types and remarks to handle mixed transactions (e.g. Sales + Recharge)
        if (!current.type.includes(next.type)) {
            current.type += ` & ${next.type}`;
        }
        if (next.remark && !current.remark.includes(next.remark)) {
            current.remark += ` | ${next.remark}`;
        }
        
        // Keep current.date (the earliest timestamp of the batch)
      } else {
        // Push current, start new batch
        result.push(current);
        current = { ...next };
      }
    }
    result.push(current);
  });

  return result;
};

// New logic: Same CounterParty, Close Time (<= window) -> Sum
const aggregatePaymentData = (records: PaymentRecord[], windowMinutes: number): PaymentRecord[] => {
  const groups: Record<string, PaymentRecord[]> = {};
  const unaggregateable: PaymentRecord[] = [];

  records.forEach(r => {
    // Treat empty/unknown counterParties as distinct
    if (!r.counterParty || r.counterParty.trim() === '') {
      unaggregateable.push(r);
    } else {
      if (!groups[r.counterParty]) groups[r.counterParty] = [];
      groups[r.counterParty].push(r);
    }
  });

  const result: PaymentRecord[] = [...unaggregateable];

  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (group.length === 0) return;

    let current = { ...group[0] };

    for (let i = 1; i < group.length; i++) {
      const next = group[i];
      const diffMinutes = (next.date.getTime() - current.date.getTime()) / 1000 / 60;

      if (diffMinutes <= windowMinutes) {
        // Merge
        current.amount += next.amount;
        current.id += `, ${next.id}`;
        // Keep earliest date
      } else {
        result.push(current);
        current = { ...next };
      }
    }
    result.push(current);
  });

  return result;
};

// --- Core Matching Algorithm (The Funnel) ---

export const runReconciliation = (
  erpData: ERPRecord[], 
  payData: PaymentRecord[], 
  cashActual: number,
  config: AppConfig
): ReconciliationResult => {
  
  // 1. Classification
  const cashERP = erpData.filter(r => r.isCash);
  
  // Deposit Only: Non-cash, Net Amount 0, but has Deposit
  const depositERP = erpData.filter(r => !r.isCash && Math.abs(r.amount) < 0.01 && r.deposit > 0);
  
  // Digital (Matchable): Non-cash, Net Amount > 0 (or Negative for refunds)
  // This includes "Mixed" payments (Partial Deposit, Partial Digital) - the Net Amount is what we match.
  const digitalERP = erpData.filter(r => !r.isCash && Math.abs(r.amount) >= 0.01);

  const totalCashRecorded = cashERP.reduce((sum, r) => sum + r.amount, 0);

  // 1.5 Calculate Source Totals (Before Aggregation for accuracy)
  const totalWechat = payData.filter(r => r.source === 'WeChat').reduce((sum, r) => sum + r.amount, 0);
  const totalAlipay = payData.filter(r => r.source === 'Alipay').reduce((sum, r) => sum + r.amount, 0);

  // 2. Aggregate Records (Same Person, Same Time <= config window)
  const aggregatedERP = aggregateERPData(digitalERP, config.aggregationTimeWindow);
  const aggregatedPay = aggregatePaymentData(payData, config.aggregationTimeWindow);
  
  // Also aggregate Cash and Deposit for cleaner display in Audit Table
  const aggregatedCashERP = aggregateERPData(cashERP, config.aggregationTimeWindow);
  const aggregatedDepositERP = aggregateERPData(depositERP, config.aggregationTimeWindow);

  // 3. Sort for Time Window Logic (Sliding Window Matching)
  aggregatedERP.sort((a, b) => a.date.getTime() - b.date.getTime());
  aggregatedPay.sort((a, b) => a.date.getTime() - b.date.getTime());

  const matches: MatchedPair[] = [];
  const matchedPayIndices = new Set<number>();
  const unmatchedERP: ERPRecord[] = [];

  // 4. Sliding Window & Greedy Match
  aggregatedERP.forEach(erp => {
    let bestMatchIndex = -1;
    let minTimeDiff = Infinity;

    // Search window in PayData
    for (let i = 0; i < aggregatedPay.length; i++) {
      if (matchedPayIndices.has(i)) continue;

      const pay = aggregatedPay[i];
      const timeDiff = Math.abs(erp.date.getTime() - pay.date.getTime()) / 1000 / 60; // minutes

      // Optimization boundaries (Data is sorted)
      if (pay.date.getTime() > erp.date.getTime() + (config.matchTimeWindow * 60 * 1000)) break;
      if (pay.date.getTime() < erp.date.getTime() - (config.matchTimeWindow * 60 * 1000)) continue;

      // Matching Logic: Time within window AND Amount is extremely close
      if (timeDiff <= config.matchTimeWindow && Math.abs(erp.amount - pay.amount) < 0.01) {
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          bestMatchIndex = i;
        }
      }
    }

    if (bestMatchIndex !== -1) {
      matches.push({
        erp,
        payment: aggregatedPay[bestMatchIndex],
        timeDiffMinutes: minTimeDiff
      });
      matchedPayIndices.add(bestMatchIndex);
    } else {
      unmatchedERP.push(erp);
    }
  });

  // 5. Identify Missing Entry (Unmatched Payments)
  const missingEntry = aggregatedPay.filter((_, idx) => !matchedPayIndices.has(idx));

  // 6. Calculate KPIs
  // Total Revenue ERP: Should likely represent the "Matched" target.
  // We sum the Net Amount of all ERP records that *should* have been matched + Cash.
  // Note: This excludes purely deposit funded transactions from "Revenue" in the context of "Money In".
  const totalRevenueERP = erpData.reduce((sum, r) => sum + r.amount, 0);
  
  // Actual Revenue = Matched Digital + Unmatched Digital + Manual Cash
  const totalDigitalActual = aggregatedPay.reduce((sum, r) => sum + r.amount, 0);
  const totalRevenueActual = totalDigitalActual + cashActual;

  // New: Valid Revenue (Effective Sales)
  // Sum of all ERP salesAmount (Calculated as Amount + Deposit for Sales, 0 for Recharges)
  const totalValidRevenue = erpData.reduce((sum, r) => sum + r.salesAmount, 0);
  
  const totalCommission = erpData.reduce((sum, r) => sum + r.commission, 0);
  const footfall = new Set(erpData.map(r => r.phone).filter(p => p)).size;
  const matchRate = (matches.length / aggregatedERP.length) * 100 || 0;

  // NEW: Date Range and Inferred Period
  const allDates: number[] = [];
  erpData.forEach(r => allDates.push(r.date.getTime()));
  payData.forEach(r => allDates.push(r.date.getTime()));

  let minDate = new Date();
  let maxDate = new Date();
  let inferredPeriod = "无数据期间";

  if (allDates.length > 0) {
      minDate = new Date(Math.min(...allDates));
      maxDate = new Date(Math.max(...allDates));
      
      const isSameDay = minDate.toDateString() === maxDate.toDateString();
      const isSameMonth = minDate.getFullYear() === maxDate.getFullYear() && minDate.getMonth() === maxDate.getMonth();
      
      if (isSameDay) {
          inferredPeriod = `${minDate.getFullYear()}年${minDate.getMonth()+1}月${minDate.getDate()}日_当日对账`;
      } else if (isSameMonth) {
          inferredPeriod = `${minDate.getFullYear()}年${minDate.getMonth()+1}月_月度对账`;
      } else {
          inferredPeriod = `${minDate.getMonth()+1}月${minDate.getDate()}日 - ${maxDate.getMonth()+1}月${maxDate.getDate()}日_阶段对账`;
      }
  }

  return {
    summary: {
      totalRevenueERP,
      totalRevenueActual,
      totalValidRevenue,
      totalWechat,
      totalAlipay,
      variance: totalRevenueActual - totalRevenueERP,
      cashBalance: cashActual - totalCashRecorded, // Surplus/Deficit of cash
      totalCommission,
      footfall,
      matchRate
    },
    matches,
    missingMoney: unmatchedERP,
    missingEntry,
    cashRecords: aggregatedCashERP,
    depositRecords: aggregatedDepositERP,
    processedAt: new Date().toISOString(),
    dateRange: { start: minDate, end: maxDate },
    inferredPeriod
  };
};