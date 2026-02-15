
import React, { useMemo } from 'react';
import { ReconciliationResult } from '../types';
import { ArrowLeft, Sparkles, Filter } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  onBack: () => void;
}

const ValidRevenueDetail: React.FC<Props> = ({ data, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  // Consolidate all ERP records that contribute to Valid Revenue (Sales > 0)
  const records = useMemo(() => {
    const all = [
        ...data.matches.map(m => m.erp),
        ...data.missingMoney,
        ...data.cashRecords,
        ...data.depositRecords
    ];
    // Filter only sales
    return all
        .filter(r => r.salesAmount > 0.01)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  const total = records.reduce((sum, r) => sum + r.salesAmount, 0);

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
            <div className="p-3 bg-cyan-100 text-cyan-600 rounded-lg">
                <Sparkles size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">有效营收明细 (Effective Sales)</h2>
                <p className="text-sm text-slate-500">总计: {formatCurrency(total)} (已扣除充值，包含储值消耗)</p>
            </div>
        </div>

        <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2 text-sm text-slate-500">
                <Filter size={16} />
                <span>仅显示实际服务/消费记录</span>
             </div>
             <span className="text-slate-500 text-sm">共 {records.length} 笔记录</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">序号</th>
                        <th className="px-6 py-3 font-medium">时间</th>
                        <th className="px-6 py-3 font-medium">交易类型</th>
                        <th className="px-6 py-3 font-medium">客户名</th>
                        <th className="px-6 py-3 font-medium">备注</th>
                        <th className="px-6 py-3 font-medium text-right">有效消费金额</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {records.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                            <td className="px-6 py-3 text-slate-600">{new Date(r.date).toLocaleString('zh-CN')}</td>
                            <td className="px-6 py-3 text-slate-900 font-medium">{r.type}</td>
                            <td className="px-6 py-3 text-slate-900">{r.client}</td>
                            <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{r.remark}</td>
                            <td className="px-6 py-3 font-bold text-cyan-600 text-right">
                                {formatCurrency(r.salesAmount)}
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

export default ValidRevenueDetail;
