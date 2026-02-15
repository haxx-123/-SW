import React from 'react';
import { ReconciliationResult } from '../types';
import { ArrowLeft, TrendingUp, Minus, Plus, Equal } from 'lucide-react';

interface Props {
  data: ReconciliationResult;
  cashActual: number;
  onBack: () => void;
}

const VarianceDetail: React.FC<Props> = ({ data, cashActual, onBack }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);

  const { variance, totalRevenueActual, totalRevenueERP } = data.summary;
  
  // Breakdown factors
  // Variance = Actual - ERP
  // Actual = (Matched Payment + Missing Payment) + Cash Actual
  // ERP = (Matched ERP + Missing ERP) + Cash ERP
  // Ideally Matched Payment ~= Matched ERP
  // So Variance ~= Missing Payment (Type B) - Missing ERP (Type A) + (Cash Actual - Cash ERP)

  const missingEntrySum = data.missingEntry.reduce((sum, r) => sum + r.amount, 0);
  const missingMoneySum = data.missingMoney.reduce((sum, r) => sum + r.amount, 0); // These are usually positive amounts in ERP
  const cashERP = data.cashRecords.reduce((sum, r) => sum + r.amount, 0);
  const cashDiff = cashActual - cashERP;

  // Matching discrepancy (small cents usually)
  const matchingDiff = data.matches.reduce((sum, m) => sum + (m.payment.amount - m.erp.amount), 0);

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
            <div className={`p-3 rounded-lg ${variance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <TrendingUp size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">营收差异分析 (Variance Analysis)</h2>
                <p className={`text-lg font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                </p>
            </div>
        </div>

        {/* The Equation */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">计算公式</h3>
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm w-40">
                    <p className="text-xs text-slate-400 mb-1">实际总营收</p>
                    <p className="text-xl font-bold text-indigo-600">{formatCurrency(totalRevenueActual)}</p>
                </div>
                <Minus className="text-slate-400" />
                <div className="bg-white p-4 rounded-lg shadow-sm w-40">
                    <p className="text-xs text-slate-400 mb-1">ERP 总应收</p>
                    <p className="text-xl font-bold text-slate-600">{formatCurrency(totalRevenueERP)}</p>
                </div>
                <Equal className="text-slate-400" />
                <div className={`bg-white p-4 rounded-lg shadow-sm w-40 border-b-4 ${variance >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                    <p className="text-xs text-slate-400 mb-1">差异 (Variance)</p>
                    <p className={`text-xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(variance)}
                    </p>
                </div>
            </div>
        </div>

        {/* Contributing Factors Waterfall */}
        <h3 className="text-lg font-semibold text-slate-800 mb-4">差异构成因子 (Drivers)</h3>
        <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Plus size={16} />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">漏单金额 (Missing Entry / Type B)</p>
                        <p className="text-xs text-slate-500">支付账单有记录，但 ERP 无记录 (增加实际收入)</p>
                    </div>
                </div>
                <span className="font-bold text-green-600">+{formatCurrency(missingEntrySum)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                        <Minus size={16} />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">丢钱金额 (Missing Money / Type A)</p>
                        <p className="text-xs text-slate-500">ERP 有记录，但未找到支付账单 (减少实际收入)</p>
                    </div>
                </div>
                <span className="font-bold text-red-600">-{formatCurrency(missingMoneySum)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cashDiff >= 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                        {cashDiff >= 0 ? <Plus size={16} /> : <Minus size={16} />}
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">现金盘点差异</p>
                        <p className="text-xs text-slate-500">实际现金 ({formatCurrency(cashActual)}) - ERP记录现金 ({formatCurrency(cashERP)})</p>
                    </div>
                </div>
                <span className={`font-bold ${cashDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cashDiff > 0 ? '+' : ''}{formatCurrency(cashDiff)}
                </span>
            </div>

            {Math.abs(matchingDiff) > 0.1 && (
                <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                            <Equal size={16} />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">匹配误差 (Rounding/Fuzzy Match)</p>
                            <p className="text-xs text-slate-500">已匹配订单的微小金额差异累计</p>
                        </div>
                    </div>
                    <span className="font-bold text-slate-600">{matchingDiff > 0 ? '+' : ''}{formatCurrency(matchingDiff)}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default VarianceDetail;