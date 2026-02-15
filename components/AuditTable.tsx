
import React, { useMemo } from 'react';
import { ReconciliationResult, ERPRecord } from '../types';
import { Download } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
}

interface AuditRow {
  erpId: string;
  client: string;
  erpDate: Date;
  channel: string;
  payDate: Date | null;
  amount: number;
  timeDiff: number | null;
  commission: number;
  type: 'match' | 'cash' | 'deposit';
}

const AuditTable: React.FC<Props> = ({ data }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const formatDate = (date: Date | null) => 
    date ? new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  // Combine all types of records into one list
  const allRows: AuditRow[] = useMemo(() => {
    const rows: AuditRow[] = [];

    // 1. Matches (Digital)
    data.matches.forEach(m => {
      rows.push({
        erpId: m.erp.id,
        client: m.erp.client,
        erpDate: m.erp.date,
        channel: m.payment.source,
        payDate: m.payment.date,
        amount: m.erp.amount,
        timeDiff: m.timeDiffMinutes,
        commission: m.erp.commission,
        type: 'match'
      });
    });

    // 2. Cash
    data.cashRecords.forEach(r => {
      rows.push({
        erpId: r.id,
        client: r.client,
        erpDate: r.date,
        channel: '现金 (Cash)',
        payDate: r.date, // Assume same time for cash
        amount: r.amount,
        timeDiff: 0,
        commission: r.commission,
        type: 'cash'
      });
    });

    // 3. Deposit
    data.depositRecords.forEach(r => {
      rows.push({
        erpId: r.id,
        client: r.client,
        erpDate: r.date,
        channel: '储值/押金 (Deposit)',
        payDate: r.date, // Assume same time
        amount: r.deposit, // Show deposit amount consumed
        timeDiff: 0,
        commission: r.commission,
        type: 'deposit'
      });
    });

    // Sort by Date Descending
    return rows.sort((a, b) => b.erpDate.getTime() - a.erpDate.getTime());
  }, [data]);

  const exportExcel = () => {
    const wb = window.XLSX.utils.book_new();

    // --- Sheet 1: Executive Summary ---
    const summaryData = [
      ['指标 (Metric)', '数值 (Value)'],
      ['ERP总应收 (Total Revenue ERP)', data.summary.totalRevenueERP],
      ['实际总营收 (Total Revenue Actual)', data.summary.totalRevenueActual],
      ['微信收入 (WeChat Revenue)', data.summary.totalWechat],
      ['支付宝收入 (Alipay Revenue)', data.summary.totalAlipay],
      ['差异 (Variance)', data.summary.variance],
      ['现金结余 (Cash Balance)', data.summary.cashBalance],
      ['提成总额 (Total Commission)', data.summary.totalCommission],
      ['客流量 (Footfall)', data.summary.footfall],
      ['匹配率 (Match Rate)', (data.summary.matchRate / 100)],
      ['处理时间', data.processedAt]
    ];
    const wsSummary = window.XLSX.utils.aoa_to_sheet(summaryData);
    window.XLSX.utils.book_append_sheet(wb, wsSummary, "概览 (Summary)");

    // --- Sheet 2: Anomalies ---
    const anomalyHeader = ['类型', '渠道', 'ID/来源', '时间', '客户/交易类型', '金额', '备注/详情'];
    
    const typeARows = data.missingMoney.map(r => [
      'Type A (丢钱)',
      'ERP',
      r.id, 
      r.date.toLocaleString(), 
      r.client, 
      r.amount, 
      r.remark
    ]);
    
    const typeBRows = data.missingEntry.map((r, i) => [
      'Type B (漏单)', 
      r.source,
      `BILL_${i}`, 
      r.date.toLocaleString(), 
      r.type, 
      r.amount, 
      `${r.direction === 'income' ? '收入' : '支出'}`
    ]);

    const wsAnomalies = window.XLSX.utils.aoa_to_sheet([anomalyHeader, ...typeARows, ...typeBRows]);
    window.XLSX.utils.book_append_sheet(wb, wsAnomalies, "异常记录 (Anomalies)");

    // --- Sheet 3: Full Audit Log ---
    const mappingHeader = ['ERP ID', '客户名', 'ERP时间', '渠道', '支付时间', '金额/储值消耗', '差额/时差', '提成'];
    const mappingRows = allRows.map(r => [
      r.erpId,
      r.client,
      r.erpDate.toLocaleString(),
      r.channel,
      r.payDate ? r.payDate.toLocaleString() : '-',
      r.amount,
      r.timeDiff !== null ? r.timeDiff.toFixed(2) : '-',
      r.commission
    ]);

    const wsMapping = window.XLSX.utils.aoa_to_sheet([mappingHeader, ...mappingRows]);
    window.XLSX.utils.book_append_sheet(wb, wsMapping, "全量明细 (Full Audit)");

    // Write File
    window.XLSX.writeFile(wb, `Audit_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">全量匹配明细 (含现金/押金)</h3>
        <button 
          onClick={exportExcel}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Download size={16} />
          导出 Excel 报表
        </button>
      </div>
      <div className="overflow-auto flex-1 max-h-[600px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 font-medium">ERP ID</th>
              <th className="px-6 py-3 font-medium">客户名</th>
              <th className="px-6 py-3 font-medium">ERP 时间</th>
              <th className="px-6 py-3 font-medium">渠道</th>
              <th className="px-6 py-3 font-medium">支付时间</th>
              <th className="px-6 py-3 font-medium text-right">金额 / 储值</th>
              <th className="px-6 py-3 font-medium text-right">时差 (分)</th>
              <th className="px-6 py-3 font-medium text-right">提成</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-2 font-mono text-xs text-slate-500 truncate max-w-[100px]" title={r.erpId}>{r.erpId}</td>
                <td className="px-6 py-2 text-slate-900">{r.client}</td>
                <td className="px-6 py-2 text-slate-600">{formatDate(r.erpDate)}</td>
                <td className="px-6 py-2 text-slate-600">
                   <span className={`inline-block px-2 py-0.5 rounded text-xs 
                        ${r.channel.includes('WeChat') ? 'bg-green-100 text-green-700' : 
                          r.channel.includes('Alipay') ? 'bg-blue-100 text-blue-700' : 
                          r.channel.includes('现金') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                    {r.channel}
                   </span>
                </td>
                <td className="px-6 py-2 text-slate-600">{formatDate(r.payDate)}</td>
                <td className="px-6 py-2 text-slate-900 font-medium text-right">{formatCurrency(r.amount)}</td>
                <td className={`px-6 py-2 font-medium text-right ${r.timeDiff !== null && r.timeDiff > 30 ? 'text-amber-500' : 'text-slate-500'}`}>
                  {r.timeDiff !== null ? r.timeDiff.toFixed(1) : '-'}
                </td>
                <td className="px-6 py-2 text-slate-600 text-right font-medium">
                    {r.commission > 0 ? (
                        <span className="text-purple-600">{formatCurrency(r.commission)}</span>
                    ) : '-'}
                </td>
              </tr>
            ))}
            {allRows.length === 0 && (
                 <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTable;
