import React from 'react';
import { ReconciliationResult } from '../types';
import { ArrowLeft, Banknote, AlertCircle } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  cashActual: number;
  onBack: () => void;
}

const CashDetail: React.FC<Props> = ({ data, cashActual, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const totalRecordedCash = data.cashRecords.reduce((sum, r) => sum + r.amount, 0);
  const variance = cashActual - totalRecordedCash;

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
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                <Banknote size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">现金结余详情 (Cash Breakdown)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">实际清点现金 (Manual Input)</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(cashActual)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 mb-1">ERP 记录现金 (Recorded)</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRecordedCash)}</p>
                <p className="text-xs text-slate-400 mt-1">共 {data.cashRecords.length} 笔交易</p>
            </div>
            <div className={`p-4 rounded-lg border ${variance >= 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <p className="text-sm opacity-80 mb-1">结余差异 (Balance)</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                    {variance !== 0 && <AlertCircle size={20} />}
                </p>
                <p className="text-xs opacity-70 mt-1">{variance === 0 ? '账实相符' : variance > 0 ? '现金盈余 (多钱)' : '现金短缺 (少钱)'}</p>
            </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4">ERP 现金交易明细</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">日期</th>
                        <th className="px-6 py-3 font-medium">客户名</th>
                        <th className="px-6 py-3 font-medium">备注</th>
                        <th className="px-6 py-3 font-medium text-right">金额</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.cashRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-600">{new Date(r.date).toLocaleString('zh-CN')}</td>
                            <td className="px-6 py-3 text-slate-900 font-medium">{r.client}</td>
                            <td className="px-6 py-3 text-slate-500">{r.remark || '-'}</td>
                            <td className="px-6 py-3 text-slate-900 font-mono text-right">{formatCurrency(r.amount)}</td>
                        </tr>
                    ))}
                    {data.cashRecords.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">ERP中无现金记录</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default CashDetail;