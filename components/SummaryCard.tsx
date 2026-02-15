import React from 'react';
import { ArrowRight } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  color?: string;
  onClick?: () => void;
}

const SummaryCard: React.FC<Props> = ({ title, value, subValue, icon, trend, color = "blue", onClick }) => {
  const getTrendColor = () => {
    if (trend === 'positive') return 'text-green-600';
    if (trend === 'negative') return 'text-red-600';
    return 'text-slate-500';
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start space-x-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 active:bg-slate-50' : ''}`}
    >
      <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
            </div>
            {onClick && <ArrowRight size={16} className="text-slate-300" />}
        </div>
        {subValue && (
          <p className={`text-sm mt-1 ${getTrendColor()}`}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;