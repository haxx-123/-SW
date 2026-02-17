
import React from 'react';
import { ReconciliationResult } from '../types';
import { TrendingUp, AlertCircle, Wallet, Sparkles, Users, Banknote, BadgeCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Legend } from 'recharts';

interface Props {
  data: ReconciliationResult;
}

const ReportTemplate: React.FC<Props> = ({ data }) => {
  const { summary, inferredPeriod, processedAt, matches, missingMoney, missingEntry } = data;
  const formatCurrency = (val: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
  const formatDate = (date: Date) => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Chart Data
  const pieData = [
    { name: '匹配成功', value: matches.length, color: '#16a34a' },
    { name: '异常: 丢钱', value: missingMoney.length, color: '#dc2626' },
    { name: '异常: 漏单', value: missingEntry.length, color: '#ca8a04' },
  ].filter(d => d.value > 0);

  // Combine anomalies for the table
  const anomalies = [
      ...missingMoney.map(r => ({
          type: 'Type A (丢钱)',
          time: r.date,
          id: r.id,
          amount: r.amount,
          reason: 'ERP有记录，无入账',
          operator: r.client || r.type,
          isNegative: true
      })),
      ...missingEntry.map(r => ({
          type: 'Type B (漏单)',
          time: r.date,
          id: r.id, // Or source ID
          amount: r.amount,
          reason: '有入账，ERP无记录',
          operator: r.source, // For payments, we usually don't have client name unless parsed from remark
          isNegative: false
      }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime());

  return (
    <div id="health-report-node" className="w-[800px] min-h-[1123px] bg-white p-12 mx-auto relative text-slate-900 font-sans">
       {/* 1. Header */}
       <div className="flex justify-between items-start mb-6">
           <div>
               <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">S</div>
                   <div>
                       <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Stockwise</h1>
                       <p className="text-sm font-semibold text-slate-500">Financial Core</p>
                   </div>
               </div>
           </div>
           <div className="text-right">
               <div className="inline-block bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">对账周期 (Period)</p>
                    <p className="font-mono font-bold text-indigo-700 text-lg leading-none">{inferredPeriod}</p>
               </div>
               <p className="text-xs text-slate-300 mt-2">生成时间: {new Date(processedAt).toLocaleString('zh-CN')}</p>
           </div>
       </div>

       {/* Divider */}
       <div className="h-1 w-full bg-indigo-600 mb-10 opacity-20"></div>

       {/* 2. Executive Summary */}
       <div className="mb-10">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center uppercase tracking-wider">
                <span className="w-1.5 h-6 bg-indigo-600 mr-3 rounded-sm"></span>
                核心概览 (Executive Summary)
           </h2>

           {/* Big Numbers */}
           <div className="grid grid-cols-2 gap-8 mb-8">
               <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                   <p className="text-slate-500 font-medium mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                       <Wallet size={16} /> 实际总营收 (Money In)
                   </p>
                   <p className="text-4xl font-extrabold text-slate-900">{formatCurrency(summary.totalRevenueActual)}</p>
                   <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                       <Banknote size={12} /> 包含微信、支付宝及实收现金
                   </p>
               </div>
               <div className={`p-6 rounded-2xl border shadow-sm ${summary.variance !== 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                   <p className={`font-medium mb-2 flex items-center gap-2 text-sm uppercase tracking-wide ${summary.variance !== 0 ? 'text-red-700' : 'text-green-700'}`}>
                       <TrendingUp size={16} /> 营收差异 (Variance)
                   </p>
                   <p className={`text-4xl font-extrabold ${summary.variance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                       {summary.variance > 0 ? '+' : ''}{formatCurrency(summary.variance)}
                   </p>
                    <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${summary.variance !== 0 ? 'text-red-500' : 'text-green-600'}`}>
                       {summary.variance !== 0 && <AlertCircle size={12} />}
                       {summary.variance === 0 ? '账实完美匹配' : summary.variance > 0 ? '实际金额多于ERP' : '实际金额少于ERP (亏损)'}
                   </p>
               </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-3 gap-5">
               <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-2 text-slate-500 mb-3">
                       <div className="p-1.5 bg-cyan-100 text-cyan-600 rounded-md"><Sparkles size={14} /></div>
                       <span className="text-xs font-bold uppercase">有效营收 (Sales)</span>
                   </div>
                   <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.totalValidRevenue)}</p>
               </div>
               <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-2 text-slate-500 mb-3">
                       <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md"><Banknote size={14} /></div>
                       <span className="text-xs font-bold uppercase">现金结余 (Cash)</span>
                   </div>
                   <p className="text-xl font-bold text-slate-800">{formatCurrency(summary.cashBalance)}</p>
               </div>
               <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-2 text-slate-500 mb-3">
                       <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md"><Users size={14} /></div>
                       <span className="text-xs font-bold uppercase">客流量 (Footfall)</span>
                   </div>
                   <p className="text-xl font-bold text-slate-800">{summary.footfall} <span className="text-xs font-normal text-slate-400">人次</span></p>
               </div>
           </div>
       </div>

       {/* 3. Anomalies */}
       <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center uppercase tracking-wider">
                <span className="w-1.5 h-6 bg-red-500 mr-3 rounded-sm"></span>
                异常分析 (Anomaly Report)
           </h2>
           
           {anomalies.length > 0 ? (
               <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                   <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-600">
                           <tr>
                               <th className="px-4 py-3 font-semibold border-b border-slate-200 w-32">时间</th>
                               <th className="px-4 py-3 font-semibold border-b border-slate-200 w-32">订单号 / ID</th>
                               <th className="px-4 py-3 font-semibold border-b border-slate-200">金额</th>
                               <th className="px-4 py-3 font-semibold border-b border-slate-200">异常原因</th>
                               <th className="px-4 py-3 font-semibold border-b border-slate-200">操作员/来源</th>
                           </tr>
                       </thead>
                       <tbody className="bg-white text-slate-700 divide-y divide-slate-100">
                           {anomalies.map((row, idx) => (
                               <tr key={idx}>
                                   <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(row.time)}</td>
                                   <td className="px-4 py-3 font-mono text-xs max-w-[140px] truncate" title={row.id}>
                                       {row.id}
                                   </td>
                                   <td className={`px-4 py-3 font-bold ${row.isNegative ? 'text-red-600' : 'text-amber-600'}`}>
                                       {formatCurrency(row.amount)}
                                   </td>
                                   <td className="px-4 py-3 text-xs">
                                       <span className={`inline-block px-2 py-1 rounded ${row.isNegative ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {row.reason}
                                       </span>
                                   </td>
                                   <td className="px-4 py-3 text-xs font-medium">{row.operator}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           ) : (
               <div className="p-8 bg-green-50 rounded-xl border border-green-100 text-center text-green-700 flex flex-col items-center justify-center">
                   <BadgeCheck size={40} className="mb-2 opacity-80" />
                   <p className="font-bold text-lg">无异常记录 (No Anomalies)</p>
                   <p className="text-sm opacity-80 mt-1">本周期内所有ERP记录与支付流水均匹配成功。</p>
               </div>
           )}
       </div>

       {/* 4. Composition Chart */}
       <div className="flex gap-8 items-stretch h-48">
           <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-4 bg-indigo-400 rounded-sm"></span>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">对账构成分析</h3>
                </div>
                <div className="mt-2">
                    <div className="text-4xl font-extrabold text-indigo-600">{summary.matchRate.toFixed(1)}%</div>
                    <div className="text-sm text-slate-400 font-medium mt-1">自动匹配成功率 (Match Rate)</div>
                </div>
           </div>

           <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center relative">
               <PieChart width={180} height={180}>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={false}
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ fontSize: '10px', right: -20 }}
                        iconSize={8}
                    />
                </PieChart>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-12">
                     <div className="text-center">
                         <span className="text-xs text-slate-400 block">Total</span>
                         <span className="text-lg font-bold text-slate-700">{matches.length + missingMoney.length + missingEntry.length}</span>
                     </div>
                </div>
           </div>
       </div>

        {/* Footer */}
       <div className="absolute bottom-12 left-12 right-12 border-t border-slate-100 pt-6 flex justify-between items-center text-[10px] text-slate-300 uppercase tracking-widest">
           <div className="flex items-center gap-2">
               <span>Stockwise Financial Core</span>
           </div>
           <p>Confidential • Internal Use Only</p>
       </div>
    </div>
  );
};

export default ReportTemplate;
