
import React, { useRef, useState, Suspense, lazy } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Book, TableProperties, X, FileText, Loader2 } from 'lucide-react';
import { FileMappingConfig } from '../types';

// Lazy load modals to improve initial render time
const InstructionManual = lazy(() => import('./InstructionManual'));
const FileMapper = lazy(() => import('./FileMapper'));

interface Props {
  onProcess: (
      erpFile: File, 
      wechatFile: File | null, 
      alipayFile: File | null, 
      cash: number,
      erpConfig: FileMappingConfig | null,
      wechatConfig: FileMappingConfig | null,
      alipayConfig: FileMappingConfig | null
  ) => void;
  isLoading: boolean;
}

const ModalLoader = () => (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-20 z-50 flex items-center justify-center">
        <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
            <span className="text-slate-700 font-medium">加载中...</span>
        </div>
    </div>
);

const FileUpload: React.FC<Props> = ({ onProcess, isLoading }) => {
  const [erpFile, setErpFile] = useState<File | null>(null);
  const [wechatFile, setWechatFile] = useState<File | null>(null);
  const [alipayFile, setAlipayFile] = useState<File | null>(null);
  const [cash, setCash] = useState<string>('0');

  // Manual Config State
  const [erpConfig, setErpConfig] = useState<FileMappingConfig | null>(null);
  const [wechatConfig, setWechatConfig] = useState<FileMappingConfig | null>(null);
  const [alipayConfig, setAlipayConfig] = useState<FileMappingConfig | null>(null);

  // UI State
  const [showManual, setShowManual] = useState(false);
  const [mapperState, setMapperState] = useState<{ open: boolean, file: File | null, type: 'ERP' | 'WeChat' | 'Alipay' | null }>({
      open: false, file: null, type: null
  });

  const erpRef = useRef<HTMLInputElement>(null);
  const wechatRef = useRef<HTMLInputElement>(null);
  const alipayRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>, configSetter: React.Dispatch<React.SetStateAction<FileMappingConfig | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
      configSetter(null); // Reset config on new file
    }
  };

  const removeFile = (e: React.MouseEvent, setter: any, configSetter: any, ref: any) => {
    e.stopPropagation();
    setter(null);
    configSetter(null);
    if (ref.current) ref.current.value = "";
  };

  const openMapper = (e: React.MouseEvent, file: File, type: 'ERP' | 'WeChat' | 'Alipay') => {
      e.stopPropagation();
      setMapperState({ open: true, file, type });
  };

  const handleMapperSave = (config: FileMappingConfig) => {
      if (mapperState.type === 'ERP') setErpConfig(config);
      if (mapperState.type === 'WeChat') setWechatConfig(config);
      if (mapperState.type === 'Alipay') setAlipayConfig(config);
  };

  const canRun = erpFile && (wechatFile || alipayFile);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto mt-10 relative">
      {/* Help Icon */}
      <button 
        onClick={() => setShowManual(true)}
        className="absolute top-8 right-8 text-slate-400 hover:text-indigo-600 transition-colors"
        title="打开说明书"
      >
        <Book size={24} />
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Stockwise 财务对账核心</h2>
        <p className="text-slate-500 mt-2">上传 ERP 导出表与微信/支付宝账单，自动完成模糊匹配对账。</p>
      </div>

      <div className="space-y-6">
        {/* ERP Upload */}
        <div className="relative group">
            <div 
            onClick={() => erpRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center cursor-pointer transition-colors ${erpFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'}`}
            >
            <input type="file" ref={erpRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, setErpFile, setErpConfig)} />
            <div className="flex flex-col items-center">
                {erpFile ? <CheckCircle className="text-green-600 mb-2" size={32}/> : <FileSpreadsheet className="text-slate-400 mb-2" size={32} />}
                <span className={`font-medium ${erpFile ? 'text-green-700' : 'text-slate-600'}`}>
                    {erpFile ? erpFile.name : '上传 ERP 导出文件 (Excel)'}
                </span>
                {!erpFile && <span className="text-xs text-slate-400 mt-1">关键列: 支付日期, 实收额 (忽略押金), 支付序号</span>}
            </div>
            </div>
            {erpFile && (
                <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                        onClick={(e) => openMapper(e, erpFile, 'ERP')}
                        className={`p-2 rounded-full shadow-sm border ${erpConfig ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600'}`}
                        title="手动匹配列 (Manual Mapping)"
                    >
                        <TableProperties size={18} />
                    </button>
                    <button 
                        onClick={(e) => removeFile(e, setErpFile, setErpConfig, erpRef)}
                        className="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-red-500"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>

        {/* WeChat Upload */}
        <div className="relative group">
            <div 
            onClick={() => wechatRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center cursor-pointer transition-colors ${wechatFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'}`}
            >
            <input type="file" ref={wechatRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, setWechatFile, setWechatConfig)} />
            <div className="flex flex-col items-center">
                {wechatFile ? <CheckCircle className="text-green-600 mb-2" size={32}/> : <Upload className="text-slate-400 mb-2" size={32} />}
                <span className={`font-medium ${wechatFile ? 'text-green-700' : 'text-slate-600'}`}>
                    {wechatFile ? wechatFile.name : '上传 微信支付 账单 (Excel/CSV)'}
                </span>
                {!wechatFile && <span className="text-xs text-slate-400 mt-1">关键列: 交易时间, 收支类型, 金额</span>}
            </div>
            </div>
            {wechatFile && (
                <div className="absolute top-2 right-2 flex gap-2">
                     <button 
                        onClick={(e) => openMapper(e, wechatFile, 'WeChat')}
                        className={`p-2 rounded-full shadow-sm border ${wechatConfig ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600'}`}
                        title="手动匹配列"
                    >
                        <TableProperties size={18} />
                    </button>
                    <button 
                        onClick={(e) => removeFile(e, setWechatFile, setWechatConfig, wechatRef)}
                        className="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-red-500"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>

        {/* Alipay Upload */}
        <div className="relative group">
            <div 
            onClick={() => alipayRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center cursor-pointer transition-colors ${alipayFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'}`}
            >
            <input type="file" ref={alipayRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, setAlipayFile, setAlipayConfig)} />
            <div className="flex flex-col items-center">
                {alipayFile ? <CheckCircle className="text-green-600 mb-2" size={32}/> : <Upload className="text-slate-400 mb-2" size={32} />}
                <span className={`font-medium ${alipayFile ? 'text-green-700' : 'text-slate-600'}`}>
                    {alipayFile ? alipayFile.name : '上传 支付宝 账单 (Excel/CSV)'}
                </span>
                {!alipayFile && <span className="text-xs text-slate-400 mt-1">关键列: 交易时间, 资金流向, 金额</span>}
            </div>
            </div>
            {alipayFile && (
                <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                        onClick={(e) => openMapper(e, alipayFile, 'Alipay')}
                        className={`p-2 rounded-full shadow-sm border ${alipayConfig ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600'}`}
                        title="手动匹配列"
                    >
                        <TableProperties size={18} />
                    </button>
                    <button 
                        onClick={(e) => removeFile(e, setAlipayFile, setAlipayConfig, alipayRef)}
                        className="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-red-500"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>

        {/* Manual Cash */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">手动输入实收现金 (¥)</label>
            <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">¥</span>
                <input 
                    type="number" 
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0.00"
                />
            </div>
        </div>

        <button
            disabled={!canRun || isLoading}
            onClick={() => erpFile && onProcess(erpFile, wechatFile, alipayFile, parseFloat(cash) || 0, erpConfig, wechatConfig, alipayConfig)}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${canRun ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-slate-300 cursor-not-allowed'}`}
        >
            {isLoading ? '正在处理中...' : '开始对账 (Run Analysis)'}
        </button>
      </div>

      {showManual && (
          <Suspense fallback={<ModalLoader />}>
            <InstructionManual onClose={() => setShowManual(false)} />
          </Suspense>
      )}
      
      {mapperState.open && mapperState.file && mapperState.type && (
          <Suspense fallback={<ModalLoader />}>
            <FileMapper 
                file={mapperState.file}
                type={mapperState.type}
                existingConfig={
                    mapperState.type === 'ERP' ? erpConfig : 
                    mapperState.type === 'WeChat' ? wechatConfig : alipayConfig
                }
                onSave={handleMapperSave}
                onClose={() => setMapperState({ ...mapperState, open: false })}
            />
          </Suspense>
      )}
    </div>
  );
};

export default FileUpload;
