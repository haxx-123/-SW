import React, { useMemo } from 'react';
import { ReconciliationResult, PaymentRecord } from '../types';
import { ArrowLeft, Wallet, Smartphone, QrCode, Banknote } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  cashActual: number;
  onBack: () => void;
}

const RevenueDetail: React.FC<Props> = ({ data, cashActual, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const formatDateTime = (date: Date) => 
    new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Consolidate all revenue records (Digital)
  const allDigitalRecords = useMemo(() => {
    const matched = data.matches.map(m => m.payment);
    const unmatched = data.missingEntry; // These are also payments that contribute to revenue
    return [...matched, ...unmatched].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  const totalDigital = allDigitalRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalRevenue = totalDigital + cashActual;

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-indigo-600 font-medium transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        返回仪表盘
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                <Wallet size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">实际总营收详情</h2>
                <p className="text-sm text-slate-500">Total Actual Revenue</p>
            </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                <div>
                    <p className="text-green-800 text-sm font-medium">微信支付 (WeChat)</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(data.summary.totalWechat)}</p>
                </div>
                <Smartphone className="text-green-300" size={32} />
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                    <p className="text-blue-800 text-sm font-medium">支付宝 (Alipay)</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.summary.totalAlipay)}</p>
                </div>
                <QrCode className="text-blue-300" size={32} />
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                    <p className="text-amber-800 text-sm font-medium">实收现金 (Cash)</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCurrency(cashActual)}</p>
                </div>
                <Banknote className="text-amber-300" size={32} />
            </div>
        </div>

        <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-slate-800">收入明细 (Income Breakdown)</h3>
             <span className="text-slate-500 text-sm">共 {allDigitalRecords.length + 1} 笔记录</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">渠道 (Channel)</th>
                        <th className="px-6 py-3 font-medium">时间 (Time)</th>
                        <th className="px-6 py-3 font-medium">类型 (Type)</th>
                        <th className="px-6 py-3 font-medium">交易对方 (Counterparty)</th>
                        <th className="px-6 py-3 font-medium text-right">金额 (Amount)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {/* Manual Cash Row */}
                    <tr className="bg-amber-50 hover:bg-amber-100 transition-colors">
                        <td className="px-6 py-3 font-medium text-amber-700 flex items-center gap-2">
                             <Banknote size={16} /> 现金 (手动)
                        </td>
                        <td className="px-6 py-3 text-slate-500">--</td>
                        <td className="px-6 py-3 text-slate-500">手动盘点录入</td>
                        <td className="px-6 py-3 text-slate-500">N/A</td>
                        <td className="px-6 py-3 font-bold text-amber-700 text-right">{formatCurrency(cashActual)}</td>
                    </tr>
                    
                    {/* Digital Records */}
                    {allDigitalRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${r.source === 'WeChat' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {r.source === 'WeChat' ? <Smartphone size={12}/> : <QrCode size={12}/>}
                                    {r.source}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-slate-600 font-mono text-xs">{formatDateTime(r.date)}</td>
                            <td className="px-6 py-3 text-slate-900 truncate max-w-[150px]">{r.type}</td>
                            <td className="px-6 py-3 text-slate-500 truncate max-w-[150px]">{r.counterParty}</td>
                            <td className="px-6 py-3 font-medium text-slate-900 text-right">{formatCurrency(r.amount)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                        <td colSpan={4} className="px-6 py-3 text-right text-slate-700">总计 (Total):</td>
                        <td className="px-6 py-3 text-right text-indigo-700">{formatCurrency(totalRevenue)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueDetail;