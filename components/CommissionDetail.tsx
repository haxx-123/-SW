import React, { useMemo } from 'react';
import { ReconciliationResult, AppConfig, ERPRecord } from '../types';
import { ArrowLeft, BadgeCheck, User } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  config: AppConfig;
  onBack: () => void;
}

interface CommissionGroup {
  total: number;
  count: number;
  records: ERPRecord[];
}

const CommissionDetail: React.FC<Props> = ({ data, config, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  // Combine all ERP records to find commissionable ones
  const allCommissionableRecords = useMemo(() => {
    const list: ERPRecord[] = [
        ...data.matches.map(m => m.erp),
        ...data.missingMoney,
        ...data.cashRecords,
        ...data.depositRecords
    ];
    // Filter only those with commission > 0
    return list.filter(r => r.commission > 0);
  }, [data]);

  // Group by Rule (Employee)
  const groupedData = useMemo<Record<string, CommissionGroup>>(() => {
    const groups: Record<string, CommissionGroup> = {};
    
    // Initialize groups from config to show 0 values if needed
    config.commissionRules.forEach(rule => {
        groups[rule.name] = { total: 0, count: 0, records: [] };
    });
    groups['Unknown'] = { total: 0, count: 0, records: [] };

    allCommissionableRecords.forEach(r => {
        // Re-identify rule
        const matchedRule = config.commissionRules.find(rule => r.remark.includes(rule.keyword));
        const key = matchedRule ? matchedRule.name : 'Unknown';
        
        if (!groups[key]) groups[key] = { total: 0, count: 0, records: [] };
        
        groups[key].total += r.commission;
        groups[key].count += 1;
        groups[key].records.push(r);
    });

    // Remove empty Unknown group if empty
    if (groups['Unknown'].count === 0) delete groups['Unknown'];

    return groups;
  }, [allCommissionableRecords, config]);

  const totalCommission = (Object.values(groupedData) as CommissionGroup[]).reduce((sum, g) => sum + g.total, 0);

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
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <BadgeCheck size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">员工提成详情</h2>
                <p className="text-sm text-slate-500">总计: {formatCurrency(totalCommission)}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {(Object.entries(groupedData) as [string, CommissionGroup][]).map(([name, stats]) => (
                <div key={name} className="border border-slate-200 rounded-xl p-5 hover:border-purple-300 transition-colors bg-slate-50">
                    <div className="flex items-center gap-2 mb-3">
                        <User size={18} className="text-slate-400" />
                        <h3 className="font-bold text-slate-800">{name}</h3>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.total)}</p>
                            <p className="text-xs text-slate-500 mt-1">{stats.count} 笔订单</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4">提成明细记录</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">员工/规则</th>
                        <th className="px-6 py-3 font-medium">日期</th>
                        <th className="px-6 py-3 font-medium">客户</th>
                        <th className="px-6 py-3 font-medium">项目/备注</th>
                        <th className="px-6 py-3 font-medium text-right">交易额</th>
                        <th className="px-6 py-3 font-medium text-right">提成金额</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(Object.entries(groupedData) as [string, CommissionGroup][]).map(([name, stats]) => 
                        stats.records.map((r, i) => (
                            <tr key={`${name}-${i}`} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-medium text-slate-800">{name}</td>
                                <td className="px-6 py-3 text-slate-600">{new Date(r.date).toLocaleString('zh-CN')}</td>
                                <td className="px-6 py-3 text-slate-900">{r.client}</td>
                                <td className="px-6 py-3 text-slate-500">{r.remark}</td>
                                <td className="px-6 py-3 text-slate-600 text-right">{formatCurrency(r.amount + r.deposit)}</td>
                                <td className="px-6 py-3 text-purple-600 font-bold text-right">{formatCurrency(r.commission)}</td>
                            </tr>
                        ))
                    )}
                    {allCommissionableRecords.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">无提成记录</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default CommissionDetail;