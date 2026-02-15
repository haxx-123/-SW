
import React, { useMemo } from 'react';
import { ReconciliationResult, AppConfig } from '../types';
import SummaryCard from './SummaryCard';
import ConfigPanel from './ConfigPanel';
import { BadgeCheck, Banknote, Users, AlertTriangle, Wallet, TrendingUp, Smartphone, QrCode } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Props {
  data: ReconciliationResult;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onViewDetails: (view: 'cash' | 'commission' | 'footfall' | 'revenue' | 'wechat' | 'alipay' | 'variance') => void;
}

const Dashboard: React.FC<Props> = ({ data, config, onUpdateConfig, onViewDetails }) => {
  const { summary } = data;
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const pieData = [
    { name: '匹配成功 (Matches)', value: data.matches.length },
    { name: '丢钱 (Type A)', value: data.missingMoney.length },
    { name: '漏单 (Type B)', value: data.missingEntry.length },
  ];
  const COLORS = ['#16a34a', '#dc2626', '#ca8a04'];

  // Logic for Top 10 Spenders
  const topSpenders = useMemo(() => {
    const spendingMap = new Map<string, { name: string, phone: string, total: number }>();

    // Collect all relevant ERP records that represent value (Matches, MissingMoney, Cash, Deposit Consumption)
    const allRecords = [
        ...data.matches.map(m => m.erp),
        ...data.missingMoney,
        ...data.cashRecords,
        ...data.depositRecords
    ];

    allRecords.forEach(r => {
        // Validation: skip invalid names
        if (!r.client || r.client === 'Unknown') return;

        // Key: Name + Phone
        const key = `${r.client}_${r.phone || 'NoPhone'}`;

        if (!spendingMap.has(key)) {
            spendingMap.set(key, { 
                name: r.client, 
                phone: r.phone, 
                total: 0 
            });
        }

        // Total Spending = Net Payment Amount + Deposit Used
        const current = spendingMap.get(key)!;
        current.total += (r.amount + r.deposit);
    });

    // Sort descending and take top 10
    return Array.from(spendingMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-slate-900">{label}</p>
          <p className="text-slate-500 mb-1">
             {payload[0].payload.phone || '无电话'}
          </p>
          <p className="text-indigo-600 font-bold">
            总消费: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <ConfigPanel config={config} onSave={onUpdateConfig} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="实际总营收"
          value={formatCurrency(summary.totalRevenueActual)}
          subValue={`ERP应收: ${formatCurrency(summary.totalRevenueERP)}`}
          icon={<Wallet size={24} />}
          color="indigo"
          onClick={() => onViewDetails('revenue')}
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
        <SummaryCard
          title="营收差异 (Variance)"
          value={formatCurrency(summary.variance)}
          subValue={summary.variance === 0 ? "完美匹配" : summary.variance > 0 ? "实际盈余" : "实际亏损"}
          trend={summary.variance >= 0 ? 'positive' : 'negative'}
          icon={<TrendingUp size={24} />}
          color={summary.variance >= 0 ? "green" : "red"}
          onClick={() => onViewDetails('variance')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <SummaryCard
          title="对账匹配率"
          value={`${summary.matchRate.toFixed(1)}%`}
          icon={<AlertTriangle size={24} />}
          color={summary.matchRate > 95 ? "green" : "orange"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">对账构成分析</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
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

        {/* Quick Actions / Status */}
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
                    <span className="text-slate-600">移动支付总额 (WeChat+Alipay)</span>
                    <span className="font-bold text-indigo-600">{formatCurrency(summary.totalWechat + summary.totalAlipay)}</span>
                </div>
            </div>
        </div>
      </div>

      {/* NEW: Top 10 Spenders Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800">高价值客户 TOP 10</h3>
                <p className="text-sm text-slate-500">基于 ERP 实收额 + 储值消耗计算 (同一姓名+手机号合并)</p>
            </div>
         </div>
         <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={topSpenders}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickFormatter={(val) => `¥${val}`} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar 
                        dataKey="total" 
                        fill="#4f46e5" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                        activeBar={{ fill: '#4338ca' }}
                    />
                </BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
