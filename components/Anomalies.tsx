
import React, { useState } from 'react';
import { ReconciliationResult } from '../types';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
}

const Anomalies: React.FC<Props> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'typeA' | 'typeB'>('typeA');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const formatDate = (date: Date) => 
    new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            异常记录 (Anomalies)
        </h3>
        <div className="flex space-x-2">
            <button 
                onClick={() => setActiveTab('typeA')}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${activeTab === 'typeA' ? 'bg-red-100 text-red-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                Type A: 丢钱 ({data.missingMoney.length})
            </button>
            <button 
                onClick={() => setActiveTab('typeB')}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${activeTab === 'typeB' ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                Type B: 漏单 ({data.missingEntry.length})
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3 font-medium">ID / 来源</th>
                    <th className="px-6 py-3 font-medium">时间</th>
                    <th className="px-6 py-3 font-medium">客户 / 类型</th>
                    <th className="px-6 py-3 font-medium">金额</th>
                    <th className="px-6 py-3 font-medium">备注 / 详情</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {activeTab === 'typeA' ? (
                    data.missingMoney.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-900 font-mono">{row.id}</td>
                            <td className="px-6 py-3 text-slate-600">{formatDate(row.date)}</td>
                            <td className="px-6 py-3 text-slate-900 font-medium">{row.client}</td>
                            <td className="px-6 py-3 text-red-600 font-bold">{formatCurrency(row.amount)}</td>
                            <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{row.remark}</td>
                        </tr>
                    ))
                ) : (
                    data.missingEntry.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-900 font-mono">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${row.source === 'WeChat' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {row.source}
                                </span>
                                {row.id.split('_').pop()}
                            </td>
                            <td className="px-6 py-3 text-slate-600">{formatDate(row.date)}</td>
                            <td className="px-6 py-3 text-slate-900 font-medium">{row.type}</td>
                            <td className="px-6 py-3 text-amber-600 font-bold">{formatCurrency(row.amount)}</td>
                            <td className="px-6 py-3 text-slate-500">
                                {row.direction === 'income' ? '收入' : '支出'} - {row.originalRow[5] || '未知单号'}
                            </td>
                        </tr>
                    ))
                )}
                {(activeTab === 'typeA' && data.missingMoney.length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">无异常记录</td></tr>
                )}
                {(activeTab === 'typeB' && data.missingEntry.length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">无异常记录</td></tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Anomalies;
