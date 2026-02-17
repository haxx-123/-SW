

import React, { useMemo, useState } from 'react';
import { ReconciliationResult, AppConfig } from '../types';
import SummaryCard from './SummaryCard';
import ConfigPanel from './ConfigPanel';
import ReportTemplate from './ReportTemplate';
import { BadgeCheck, Banknote, Users, AlertTriangle, Wallet, TrendingUp, Smartphone, QrCode, Sparkles, Calendar, FileDown, Printer, Image as ImageIcon, FileSpreadsheet, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';

interface Props {
  data: ReconciliationResult;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onViewDetails: (view: 'cash' | 'commission' | 'footfall' | 'revenue' | 'wechat' | 'alipay' | 'variance' | 'validRevenue') => void;
}

const Dashboard: React.FC<Props> = ({ data, config, onUpdateConfig, onViewDetails }) => {
  const { summary, inferredPeriod, dateRange } = data;
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const formatDate = (date: Date) => 
    new Date(date).toLocaleDateString('zh-CN');

  const pieData = [
    { name: '匹配成功 (Matches)', value: data.matches.length },
    { name: '丢钱 (Type A)', value: data.missingMoney.length },
    { name: '漏单 (Type B)', value: data.missingEntry.length },
  ];
  const COLORS = ['#16a34a', '#dc2626', '#ca8a04'];

  const topSpenders = useMemo(() => {
    const spendingMap = new Map<string, { name: string, phone: string, total: number }>();
    const allRecords = [
        ...data.matches.map(m => m.erp),
        ...data.missingMoney,
        ...data.cashRecords,
        ...data.depositRecords
    ];

    allRecords.forEach(r => {
        if (!r.client || r.client === 'Unknown') return;
        const key = `${r.client}_${r.phone || 'NoPhone'}`;
        if (!spendingMap.has(key)) {
            spendingMap.set(key, { name: r.client, phone: r.phone, total: 0 });
        }
        spendingMap.get(key)!.total += r.salesAmount;
    });

    return Array.from(spendingMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-slate-900">{label}</p>
          <p className="text-slate-500 mb-1">{payload[0].payload.phone || '无电话'}</p>
          <p className="text-indigo-600 font-bold">有效消费: {formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // --- Export Logic ---

  const handleExportImage = async (mode: 'download' | 'print') => {
    setIsGenerating(true);
    // Wait for render
    setTimeout(async () => {
        const element = document.getElementById('health-report-node');
        if (!element) return;
        
        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            if (mode === 'download') {
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `Stockwise_Report_${inferredPeriod}.png`;
                link.click();
            } else {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`<html><head><title>Print Report</title></head><body style="margin:0; display:flex; justify-content:center;"><img src="${imgData}" style="max-width:100%;" /></body></html>`);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => printWindow.print(), 500);
                }
            }
        } catch (e) {
            console.error(e);
            alert("生成图片失败");
        } finally {
            setIsGenerating(false);
            setShowExportModal(false);
        }
    }, 100);
  };

  const handleExportExcel = () => {
      const wb = window.XLSX.utils.book_new();
      const timestamp = new Date().toLocaleString();

      // --- SHEET 1: DASHBOARD (对账概览) ---
      // Layout Strategy: Grid-based visual
      const wsDashboardData = [
          [`${inferredPeriod} 对账日报 (Generated: ${timestamp})`], // A1:F1 Title
          [], // Spacer
          ["核心指标 (KPIs)", "实际总营收 (Actual)", "营收差异 (Variance)", "有效营收 (Valid Sales)", "ERP应收 (Target)"], // Header Row 3
          ["", data.summary.totalRevenueActual, data.summary.variance, data.summary.totalValidRevenue, data.summary.totalRevenueERP], // Value Row 4
          [], // Spacer
          ["渠道构成 (Channels)", "微信收入", "支付宝收入", "现金盘点", "匹配率"], // Header Row 6
          ["", data.summary.totalWechat, data.summary.totalAlipay, data.summary.cashBalance, `${data.summary.matchRate.toFixed(2)}%`], // Value Row 7
          [], // Spacer
          ["异常概况 (Exceptions)", "异常总数", "丢钱 (Type A)", "漏单 (Type B)", "客流量"], // Header Row 9
          ["", data.missingMoney.length + data.missingEntry.length, data.missingMoney.length, data.missingEntry.length, data.summary.footfall] // Value Row 10
      ];

      const wsDashboard = window.XLSX.utils.aoa_to_sheet(wsDashboardData);
      
      // Styling & Formatting
      // Merge Title
      wsDashboard['!merges'] = [{ s: {r:0, c:0}, e: {r:0, c:4} }];
      // Column Widths
      wsDashboard['!cols'] = [
          {wch: 20}, // A: Label Category
          {wch: 25}, // B
          {wch: 25}, // C
          {wch: 25}, // D
          {wch: 25}, // E
      ];
      window.XLSX.utils.book_append_sheet(wb, wsDashboard, "对账概览 (Dashboard)");

      // --- SHEET 2: EXCEPTIONS (异常记录) ---
      const wsExceptionHeader = ["异常类型", "来源/渠道", "时间", "单号/ID", "金额", "详情/备注"];
      const wsExceptionRows: any[][] = [];

      // Type A: Missing Money (ERP has it, Payment missing)
      data.missingMoney.forEach(r => {
          wsExceptionRows.push([
              "Type A (丢钱)", 
              "ERP", 
              r.date, 
              r.id, 
              r.amount, 
              r.remark
          ]);
      });

      // Type B: Missing Entry (Payment has it, ERP missing)
      data.missingEntry.forEach(r => {
          wsExceptionRows.push([
              "Type B (漏单)", 
              r.source, 
              r.date, 
              r.originalId || r.id, 
              r.amount, 
              `${r.type} (${r.direction === 'income' ? '收入' : '支出'})`
          ]);
      });

      // Sort by Time Descending
      wsExceptionRows.sort((a, b) => new Date(b[2]).getTime() - new Date(a[2]).getTime());

      const wsExceptions = window.XLSX.utils.aoa_to_sheet([wsExceptionHeader, ...wsExceptionRows]);
      wsExceptions['!cols'] = [{wch: 15}, {wch: 12}, {wch: 20}, {wch: 25}, {wch: 12}, {wch: 40}];
      window.XLSX.utils.book_append_sheet(wb, wsExceptions, "异常记录 (Exceptions)");

      // --- SHEET 3: FULL FLOW (全量流水) ---
      // We need to construct a unified view of every transaction
      const fullHeader = ["状态 (Status)", "ERP ID", "支付来源 (Source)", "时间 (Time)", "客户/对方 (Counterparty)", "交易类型 (Type)", "金额 (Amount)", "差额 (Diff)", "备注/详情"];
      const fullRows: any[][] = [];

      // 1. Matches
      data.matches.forEach(m => {
          fullRows.push([
              "Match (匹配成功)",
              m.erp.id,
              m.payment.source,
              m.erp.date, // Use ERP date as primary
              m.erp.client,
              m.erp.type,
              m.erp.amount,
              (m.payment.amount - m.erp.amount).toFixed(2), // Diff should be near 0
              m.erp.remark
          ]);
      });

      // 2. Cash
      data.cashRecords.forEach(c => {
          fullRows.push([
              "Cash (现金)",
              c.id,
              "Cash",
              c.date,
              c.client,
              c.type,
              c.amount,
              0,
              c.remark
          ]);
      });

      // 3. Deposit Usage (Non-cash, but amount is 0 in net, so we show Deposit amount or 0 net? Let's show deposit value in Amount col for visibility, or keep it distinct?)
      // User wants "Full Flow". Usually Deposit usage is "Consumption".
      data.depositRecords.forEach(d => {
           fullRows.push([
              "Deposit (储值消耗)",
              d.id,
              "Deposit",
              d.date,
              d.client,
              d.type,
              d.deposit, // Show the deposit amount consumed
              0,
              d.remark
          ]);
      });

      // 4. Missing Money (Type A) - Already in exceptions, but good for Full Flow too? Usually Full Flow implies EVERYTHING.
      data.missingMoney.forEach(m => {
          fullRows.push([
              "Type A (丢钱)",
              m.id,
              "ERP Only",
              m.date,
              m.client,
              m.type,
              m.amount,
              -m.amount, // Deficit
              m.remark
          ]);
      });

      // 5. Missing Entry (Type B)
      data.missingEntry.forEach(m => {
           fullRows.push([
              "Type B (漏单)",
              "-",
              m.source,
              m.date,
              m.counterParty,
              m.type,
              m.amount,
              m.amount, // Surplus
              m.direction
          ]);
      });

      // Sort by Date Descending
      fullRows.sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime());

      const wsFull = window.XLSX.utils.aoa_to_sheet([fullHeader, ...fullRows]);
      wsFull['!cols'] = [{wch: 18}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 12}, {wch: 10}, {wch: 30}];
      window.XLSX.utils.book_append_sheet(wb, wsFull, "全量流水 (Full Data)");
      
      window.XLSX.writeFile(wb, `Stockwise_Report_${inferredPeriod}.xlsx`);
      setShowExportModal(false);
  };

  return (
    <div className="space-y-6 relative">
      {/* Hidden Report Template for Capture */}
      <div className="fixed top-0 left-[-9999px] z-[-1]">
          <ReportTemplate data={data} />
      </div>

      {/* Header Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <div className="flex items-center gap-4">
             {/* Config Button Wrapper */}
             <div className="shrink-0">
                 <ConfigPanel config={config} onSave={onUpdateConfig} simpleMode={true} />
             </div>
             
             {/* Time Range Display */}
             <div className="flex flex-col border-l border-slate-200 pl-4">
                 <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <Calendar size={12} />
                    时间范围显示
                 </div>
                 <div className="group cursor-pointer">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                        {inferredPeriod}
                    </h2>
                    <p className="text-xs text-slate-400 group-hover:text-indigo-400">
                        {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                    </p>
                 </div>
             </div>
         </div>

         {/* Export Button */}
         <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
         >
             <FileDown size={18} />
             导出报表 (Export)
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="实际总营收 (Money In)"
          value={formatCurrency(summary.totalRevenueActual)}
          subValue={`ERP应收: ${formatCurrency(summary.totalRevenueERP)}`}
          icon={<Wallet size={24} />}
          color="indigo"
          onClick={() => onViewDetails('revenue')}
        />
        <SummaryCard
          title="有效营收 (Effective Sales)"
          value={formatCurrency(summary.totalValidRevenue)}
          subValue="扣除充值，包含储值消耗"
          icon={<Sparkles size={24} />}
          color="cyan"
          onClick={() => onViewDetails('validRevenue')}
        />
        <SummaryCard
          title="微信收入"
          value={formatCurrency(summary.totalWechat)}
          icon={<Smartphone size={24} />}
          color="green"
          onClick={() => onViewDetails('wechat')}
        />
        <SummaryCard
          title="支付宝收入"
          value={formatCurrency(summary.totalAlipay)}
          icon={<QrCode size={24} />}
          color="blue"
          onClick={() => onViewDetails('alipay')}
        />
      </div>

      {/* ... Rest of Dashboard (Variance, Cash, Charts) ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="营收差异 (Variance)"
          value={formatCurrency(summary.variance)}
          subValue={summary.variance === 0 ? "完美匹配" : summary.variance > 0 ? "实际盈余" : "实际亏损"}
          trend={summary.variance >= 0 ? 'positive' : 'negative'}
          icon={<TrendingUp size={24} />}
          color={summary.variance >= 0 ? "green" : "red"}
          onClick={() => onViewDetails('variance')}
        />
        <SummaryCard
          title="现金结余"
          value={formatCurrency(summary.cashBalance)}
          subValue="点击查看详情"
          icon={<Banknote size={24} />}
          color="amber"
          onClick={() => onViewDetails('cash')}
        />
        <SummaryCard
          title="员工提成总额"
          value={formatCurrency(summary.totalCommission)}
          subValue="点击查看员工明细"
          icon={<BadgeCheck size={24} />}
          color="purple"
          onClick={() => onViewDetails('commission')}
        />
        <SummaryCard
          title="客流量"
          value={summary.footfall}
          subValue="点击查看客户列表"
          icon={<Users size={24} />}
          color="slate"
          onClick={() => onViewDetails('footfall')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">对账构成分析</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">系统状态报告</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">处理时间</span>
                    <span className="font-mono text-slate-900">{new Date(data.processedAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Missing Money (ERP有记录，无入账)</span>
                    <span className="font-bold text-red-600">{data.missingMoney.length} 笔</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Missing Entry (有入账，ERP无记录)</span>
                    <span className="font-bold text-amber-600">{data.missingEntry.length} 笔</span>
                </div>
                 <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">对账匹配率</span>
                    <span className={`font-bold ${summary.matchRate > 95 ? 'text-green-600' : 'text-orange-500'}`}>{summary.matchRate.toFixed(1)}%</span>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800">高价值客户 TOP 10 (有效消费)</h3>
                <p className="text-sm text-slate-500">基于 实际服务消耗 (扣除押金充值) 计算 (同一姓名+手机号合并)</p>
            </div>
         </div>
         <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSpenders} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `¥${val}`} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={40} activeBar={{ fill: '#0891b2' }} />
                </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">选择导出方式</h3>
                      <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                      <button 
                        disabled={isGenerating}
                        onClick={() => handleExportImage('download')}
                        className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                      >
                          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-white group-hover:shadow-sm">
                              <ImageIcon size={24} />
                          </div>
                          <div>
                              <p className="font-bold text-slate-800">精美图片报告 (Image)</p>
                              <p className="text-sm text-slate-500">生成一张包含关键指标和评分的“体检报告”长图。</p>
                          </div>
                      </button>

                      <button 
                        disabled={isGenerating}
                        onClick={() => handleExportImage('print')}
                        className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                      >
                          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-white group-hover:shadow-sm">
                              <Printer size={24} />
                          </div>
                          <div>
                              <p className="font-bold text-slate-800">图片打印模式 (Print)</p>
                              <p className="text-sm text-slate-500">打开适合A4纸打印的报告预览页面。</p>
                          </div>
                      </button>

                      <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                      >
                          <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-white group-hover:shadow-sm">
                              <FileSpreadsheet size={24} />
                          </div>
                          <div>
                              <p className="font-bold text-slate-800">导出 Excel 报表</p>
                              <p className="text-sm text-slate-500">包含多个Sheet页的详细数据文件 (非CSV)。</p>
                          </div>
                      </button>
                  </div>
                  
                  {isGenerating && (
                      <div className="mt-4 text-center text-sm text-indigo-600 animate-pulse">
                          正在生成报告，请稍候...
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
