
import React, { useMemo } from 'react';
import { ReconciliationResult, ERPRecord } from '../types';
import { ArrowLeft, Users, Phone } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  onBack: () => void;
}

const FootfallDetail: React.FC<Props> = ({ data, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  // Aggregate all ERP records
  const uniqueClients = useMemo(() => {
    const allRecords: ERPRecord[] = [
        ...data.matches.map(m => m.erp),
        ...data.missingMoney,
        ...data.cashRecords,
        ...data.depositRecords
    ];

    const map = new Map<string, { name: string, phone: string, visits: number, lastVisit: Date, totalSpending: number }>();

    allRecords.forEach(r => {
        // Use Phone as primary key if available, otherwise Name
        const key = r.phone && r.phone.length > 5 ? r.phone : r.client;
        
        if (!key || key === 'Unknown') return;

        if (!map.has(key)) {
            map.set(key, { 
                name: r.client, 
                phone: r.phone, 
                visits: 0, 
                lastVisit: r.date,
                totalSpending: 0
            });
        }

        const entry = map.get(key)!;
        entry.visits += 1;
        if (r.date > entry.lastVisit) entry.lastVisit = r.date;

        // Spending Calculation Logic:
        // Use pre-calculated salesAmount which is robust against Aggregation of mixed types (Sales + Recharge).
        // It already contains 0 for pure recharge records and (Net + Deposit) for sales records.
        entry.totalSpending += (r.salesAmount || 0);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpending - a.totalSpending);
  }, [data]);

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
            <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                <Users size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">客流量统计 (Customer Footfall)</h2>
                <p className="text-sm text-slate-500">独立客户数: {uniqueClients.length}</p>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-medium">#</th>
                        <th className="px-6 py-3 font-medium">客户名 (Name)</th>
                        <th className="px-6 py-3 font-medium">电话 (Phone)</th>
                        <th className="px-6 py-3 font-medium">累计消费 (Total Spending)</th>
                        <th className="px-6 py-3 font-medium">交易次数 (Visits)</th>
                        <th className="px-6 py-3 font-medium">最近光顾 (Last Seen)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {uniqueClients.map((client, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-400 w-12">{i + 1}</td>
                            <td className="px-6 py-3 text-slate-900 font-medium">{client.name}</td>
                            <td className="px-6 py-3 text-slate-600 flex items-center gap-2">
                                {client.phone ? (
                                    <>
                                        <Phone size={14} className="text-slate-400"/>
                                        {client.phone}
                                    </>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-3 font-bold text-indigo-600">
                                {formatCurrency(client.totalSpending)}
                            </td>
                            <td className="px-6 py-3 text-slate-900">
                                <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
                                    {client.visits}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-slate-500">{client.lastVisit.toLocaleString('zh-CN')}</td>
                        </tr>
                    ))}
                    {uniqueClients.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">无法提取有效客户信息</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default FootfallDetail;
