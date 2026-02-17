
import React, { useState, useEffect } from 'react';
import { FileMappingConfig, ColumnMapping } from '../types';
import { X, Save, Eye } from 'lucide-react';
import { getColIndex } from '../services/engine';

interface Props {
  file: File;
  type: 'ERP' | 'WeChat' | 'Alipay';
  existingConfig: FileMappingConfig | null;
  onSave: (config: FileMappingConfig) => void;
  onClose: () => void;
}

const ERP_FIELDS = [
  { key: 'date', label: '支付日期 (Date)', required: true },
  { key: 'amount', label: '实收额 (Amount)', required: true },
  { key: 'deposit', label: '押金 (Deposit)', required: false },
  { key: 'cash', label: '现金 (Cash)', required: false },
  { key: 'type', label: '交易类型 (Type)', required: false },
  { key: 'client', label: '客户名 (Client)', required: false },
  { key: 'remark', label: '备注 (Remark)', required: false },
  { key: 'phone', label: '电话 (Phone)', required: false },
  { key: 'id', label: '支付序号 (ID)', required: false },
];

const PAYMENT_FIELDS = [
  { key: 'date', label: '交易时间 (Date)', required: true },
  { key: 'amount', label: '金额 (Amount)', required: true },
  { key: 'type', label: '交易类型 (Type)', required: false },
  { key: 'direction', label: '收支方向 (Direction)', required: false },
  { key: 'status', label: '状态 (Status)', required: false },
  { key: 'counterParty', label: '交易对方 (Counterparty)', required: false },
  { key: 'id', label: '交易单号 (ID)', required: false },
];

const FileMapper: React.FC<Props> = ({ file, type, existingConfig, onSave, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[][]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(existingConfig?.headerRowIndex ?? 0);
  const [mapping, setMapping] = useState<ColumnMapping>(existingConfig?.mapping ?? {});

  const fields = type === 'ERP' ? ERP_FIELDS : PAYMENT_FIELDS;

  useEffect(() => {
    const readFile = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const u8 = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = window.XLSX.read(u8, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          // Only read first 50 rows for preview
          const jsonData = window.XLSX.utils.sheet_to_json(sheet, { header: 1, limit: 50 });
          setData(jsonData.slice(0, 50));
          
          // If no existing config, try to auto-detect initial mapping for the default header row
          if (!existingConfig && jsonData.length > 0) {
             // Heuristic: try to find a row with many strings
             let potentialHeaderIdx = 0;
             // Use simple logic or reuse engine logic if we could import it. 
             // Here we just default to 0, but user can change it.
          }
          setLoading(false);
        } catch (err) {
          console.error(err);
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    readFile();
  }, [file, existingConfig]);

  // When header row changes, try to auto-map based on names
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // If user manually changed header, re-run simple name matching
    // But if we have an existing config, we trust it (handled in initial state)
    // This effect runs when user clicks a new row in UI
    const headers = data[headerRowIdx] as string[];
    if (!headers) return;

    const newMapping: ColumnMapping = {};
    fields.forEach(f => {
       // Simple fuzzy match helper or just find exact
       // We can reuse getColIndex logic conceptually or just do simple include
       // Let's rely on user manual selection mostly, but try to help
       const idx = headers.findIndex(h => String(h).includes(f.label.split('(')[0].trim()));
       if (idx > -1 && !existingConfig) {
          // Only auto-set if not editing existing config
          newMapping[f.key] = idx;
       }
       if (existingConfig && existingConfig.headerRowIndex === headerRowIdx) {
          // Restore config if going back to original row
          if (existingConfig.mapping[f.key] !== undefined) {
             newMapping[f.key] = existingConfig.mapping[f.key];
          }
       }
    });
    setMapping(prev => ({...prev, ...newMapping}));
  }, [headerRowIdx, data]);

  const handleMapChange = (fieldKey: string, colIdx: number) => {
    setMapping(prev => ({ ...prev, [fieldKey]: colIdx }));
  };

  const handleSave = () => {
    // Validation
    const missing = fields.filter(f => f.required && (mapping[f.key] === undefined || mapping[f.key] === -1));
    if (missing.length > 0) {
      alert(`请为必填字段设置映射: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    onSave({ headerRowIndex: headerRowIdx, mapping });
    onClose();
  };

  if (loading) return <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">Loading Preview...</div>;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">手动映射配置 ({type})</h2>
            <p className="text-sm text-slate-500">点击表格行以设置表头，然后确认下方字段映射。</p>
          </div>
          <button onClick={onClose}><X className="text-slate-500 hover:text-slate-700" /></button>
        </div>

        {/* Split View */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left: Table Preview */}
            <div className="flex-1 overflow-auto p-4 border-r border-slate-200">
               <table className="w-full text-xs text-left border-collapse">
                 <thead>
                   <tr>
                     <th className="p-2 border bg-slate-100 text-slate-500 w-10 sticky left-0 z-10">#</th>
                     {data[0]?.map((_, i) => (
                        <th key={i} className="p-2 border bg-slate-100 text-slate-500 font-mono min-w-[100px]">Col {i}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                    {data.map((row, rIdx) => {
                        const isHeader = rIdx === headerRowIdx;
                        return (
                            <tr 
                              key={rIdx} 
                              onClick={() => setHeaderRowIdx(rIdx)}
                              className={`cursor-pointer hover:bg-indigo-50 transition-colors ${isHeader ? 'bg-indigo-100 border-indigo-300' : ''}`}
                            >
                                <td className={`p-2 border text-center font-bold sticky left-0 ${isHeader ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-50'}`}>
                                    {rIdx + 1}
                                </td>
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className={`p-2 border truncate max-w-[200px] ${isHeader ? 'font-bold text-indigo-900' : 'text-slate-600'}`}>
                                        {String(cell || '')}
                                    </td>
                                ))}
                            </tr>
                        )
                    })}
                 </tbody>
               </table>
            </div>

            {/* Right: Mapping Form */}
            <div className="w-full lg:w-96 p-6 bg-slate-50 overflow-y-auto">
               <h3 className="font-bold text-slate-800 mb-4">字段映射 (Field Mapping)</h3>
               <div className="space-y-4">
                 {fields.map(field => (
                   <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <select 
                        value={mapping[field.key] ?? -1}
                        onChange={(e) => handleMapChange(field.key, parseInt(e.target.value))}
                        className={`w-full p-2 border rounded-md text-sm ${field.required && (mapping[field.key] === undefined || mapping[field.key] === -1) ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                      >
                         <option value={-1}>未映射 (Ignore)</option>
                         {data[headerRowIdx]?.map((colName, cIdx) => (
                             <option key={cIdx} value={cIdx}>
                                [{cIdx}] {String(colName).substring(0, 20)}
                             </option>
                         ))}
                      </select>
                   </div>
                 ))}
               </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
             <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">取消</button>
             <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium">
                <Save size={18} />
                确认配置
             </button>
        </div>
      </div>
    </div>
  );
};

export default FileMapper;
