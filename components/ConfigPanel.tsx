

import React, { useState } from 'react';
import { AppConfig, CommissionRule } from '../types';
import { Settings, Plus, Trash2, Save } from 'lucide-react';

interface Props {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
  simpleMode?: boolean; // NEW: Controls if we render the margin/container logic
}

const ConfigPanel: React.FC<Props> = ({ config, onSave, simpleMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  const handleRuleChange = (index: number, field: keyof CommissionRule, value: string | number) => {
    const newRules = [...localConfig.commissionRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setLocalConfig({ ...localConfig, commissionRules: newRules });
  };

  const addRule = () => {
    setLocalConfig({
      ...localConfig,
      commissionRules: [
        ...localConfig.commissionRules,
        { id: Date.now().toString(), name: '', keyword: '', rate: 0.0 }
      ]
    });
  };

  const removeRule = (index: number) => {
    const newRules = localConfig.commissionRules.filter((_, i) => i !== index);
    setLocalConfig({ ...localConfig, commissionRules: newRules });
  };

  const handleSave = () => {
    onSave(localConfig);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm ${!simpleMode ? 'mb-6' : ''}`}
      >
        <Settings size={16} />
        调整对账参数 (Settings)
      </button>
    );
  }

  // Modal Overlay style for simpleMode, or inline expansion for default
  const containerClass = simpleMode 
     ? "fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center p-4" 
     : "bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6";

  const innerClass = simpleMode
     ? "bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
     : "";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings size={20} />
            对账核心参数设置
            </h3>
            <div className="flex gap-2">
            <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg"
            >
                取消
            </button>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
                <Save size={16} />
                保存并重新计算
            </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Time Windows */}
            <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">时间窗口设置</h4>
            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    宽窗口匹配时间 (分钟)
                </label>
                <div className="text-xs text-slate-500 mb-2">允许 ERP 与支付记录的最大时间误差。</div>
                <input
                    type="number"
                    value={localConfig.matchTimeWindow}
                    onChange={(e) => setLocalConfig({...localConfig, matchTimeWindow: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    聚合时间窗口 (分钟)
                </label>
                <div className="text-xs text-slate-500 mb-2">同一客户/来源的连续交易合并计算的时间阈值。</div>
                <input
                    type="number"
                    value={localConfig.aggregationTimeWindow}
                    onChange={(e) => setLocalConfig({...localConfig, aggregationTimeWindow: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                </div>
            </div>
            </div>

            {/* Commission Rules */}
            <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">员工提成规则</h4>
                <button onClick={addRule} className="text-xs flex items-center text-indigo-600 font-medium hover:text-indigo-800">
                <Plus size={14} className="mr-1" /> 添加规则
                </button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg space-y-3 max-h-64 overflow-y-auto">
                {localConfig.commissionRules.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">暂无自定义提成规则</p>
                )}
                {localConfig.commissionRules.map((rule, idx) => (
                <div key={rule.id || idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="员工/规则名称"
                            value={rule.name}
                            onChange={(e) => handleRuleChange(idx, 'name', e.target.value)}
                            className="w-full text-sm px-2 py-1 border border-slate-300 rounded mb-1"
                        />
                        <input
                            type="text"
                            placeholder="匹配关键词 (备注中包含)"
                            value={rule.keyword}
                            onChange={(e) => handleRuleChange(idx, 'keyword', e.target.value)}
                            className="w-full text-sm px-2 py-1 border border-slate-300 rounded"
                        />
                    </div>
                    <div className="w-24">
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.10"
                                value={rule.rate}
                                onChange={(e) => handleRuleChange(idx, 'rate', parseFloat(e.target.value))}
                                className="w-full text-sm px-2 py-1 border border-slate-300 rounded"
                            />
                            <span className="absolute right-1 top-1 text-xs text-slate-400">%</span>
                        </div>
                    </div>
                    <button onClick={() => removeRule(idx)} className="p-1 text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                    </button>
                </div>
                ))}
            </div>
            <div className="text-xs text-slate-500">
                系统将扫描ERP备注列。如果包含关键词，将应用对应提成比例计算。
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;