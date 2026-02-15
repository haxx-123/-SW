import React, { useMemo } from 'react';
import { ReconciliationResult } from '../types';
import { ArrowLeft, Smartphone, QrCode } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  source: 'WeChat' | 'Alipay';
  onBack: () => void;
}

const ChannelDetail: React.FC<Props> = ({ data, source, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const formatDateTime = (date: Date) => 
    new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Filter records
  const records = useMemo(() => {
    const matched = data.matches.map(m => m.payment);
    const unmatched = data.missingEntry;
    const all = [...matched, ...unmatched];
    return all
        .filter(r => r.source === source)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data, source]);

  const total = records.reduce((sum, r) => sum + r.amount, 0);
  const colorClass = source === 'WeChat' ? 'green' : 'blue';
  const Icon = source === 'WeChat' ? Smartphone : QrCode;

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
            <div className={`p-3 bg-${colorClass}-100 text-${colorClass}-600 rounded-lg`}>
                <Icon size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">{source === 'WeChat' ? '微信支付明细' : '支付宝明细'}</h2>
                <p className="text-sm text-slate-500">总收入: {formatCurrency(total)}</p>
            </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">序号</th>
                        <th className="px-6 py-3 font-medium">时间</th>
                        <th className="px-6 py-3 font-medium">类型</th>
                        <th className="px-6 py-3 font-medium">交易对方</th>
                        <th className="px-6 py-3 font-medium">收支方向</th>
                        <th className="px-6 py-3 font-medium text-right">金额</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {records.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                            <td className="px-6 py-3 text-slate-600 font-mono text-xs">{formatDateTime(r.date)}</td>
                            <td className="px-6 py-3 text-slate-900">{r.type}</td>
                            <td className="px-6 py-3 text-slate-500">{r.counterParty}</td>
                            <td className="px-6 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${r.direction === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {r.direction === 'income' ? '收入' : '支出/退款'}
                                </span>
                            </td>
                            <td className={`px-6 py-3 font-medium text-right ${r.amount >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                {formatCurrency(r.amount)}
                            </td>
                        </tr>
                    ))}
                    {records.length === 0 && (
                         <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">无相关记录</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ChannelDetail;