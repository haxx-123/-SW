import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface Props {
  onProcess: (erpFile: File, wechatFile: File | null, alipayFile: File | null, cash: number) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<Props> = ({ onProcess, isLoading }) => {
  const [erpFile, setErpFile] = useState<File | null>(null);
  const [wechatFile, setWechatFile] = useState<File | null>(null);
  const [alipayFile, setAlipayFile] = useState<File | null>(null);
  const [cash, setCash] = useState<string>('0');

  const erpRef = useRef<HTMLInputElement>(null);
  const wechatRef = useRef<HTMLInputElement>(null);
  const alipayRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const canRun = erpFile && (wechatFile || alipayFile);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto mt-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Stockwise 财务对账核心</h2>
        <p className="text-slate-500 mt-2">上传 ERP 导出表与微信/支付宝账单，自动完成模糊匹配对账。</p>
      </div>

      <div className="space-y-6">
        {/* ERP Upload */}
        <div 
          onClick={() => erpRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center cursor-pointer transition-colors ${erpFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'}`}
        >
          <input type="file" ref={erpRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, setErpFile)} />
          <div className="flex flex-col items-center">
             {erpFile ? <CheckCircle className="text-green-600 mb-2" size={32}/> : <FileSpreadsheet className="text-slate-400 mb-2" size={32} />}
             <span className={`font-medium ${erpFile ? 'text-green-700' : 'text-slate-600'}`}>
                {erpFile ? erpFile.name : '上传 ERP 导出文件 (Excel)'}
             </span>
             {!erpFile && <span className="text-xs text-slate-400 mt-1">关键列: 支付日期, 实收额 (忽略押金), 支付序号</span>}
          </div>
        </div>

        {/* WeChat Upload */}
        <div 
          onClick={() => wechatRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center cursor-pointer transition-colors ${wechatFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'}`}
        >
          <input type="file" ref={wechatRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, setWechatFile)} />
           <div className="flex flex-col items-center">
             {wechatFile ? <CheckCircle className="text-green-600 mb-2" size={32}/> : <Upload className="text-slate-400 mb-2" size={32} />}
             <span className={`font-medium ${wechatFile ? 'text-green-700' : 'text-slate-600'}`}>
                {wechatFile ? wechatFile.name : '上传 微信支付 账单 (Excel/CSV)'}
             </span>
             {!wechatFile && <span className="text-xs text-slate-400 mt-1">关键列: 交易时间, 收支类型, 金额</span>}
          </div>
        </div>

        {/* Alipay Upload */}
        <div 
          onClick={() => alipayRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex items-center justify-center cursor-pointer transition-colors ${alipayFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'}`}
        >
          <input type="file" ref={alipayRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, setAlipayFile)} />
           <div className="flex flex-col items-center">
             {alipayFile ? <CheckCircle className="text-green-600 mb-2" size={32}/> : <Upload className="text-slate-400 mb-2" size={32} />}
             <span className={`font-medium ${alipayFile ? 'text-green-700' : 'text-slate-600'}`}>
                {alipayFile ? alipayFile.name : '上传 支付宝 账单 (Excel/CSV)'}
             </span>
             {!alipayFile && <span className="text-xs text-slate-400 mt-1">关键列: 交易时间, 资金流向, 金额</span>}
          </div>
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
            onClick={() => erpFile && onProcess(erpFile, wechatFile, alipayFile, parseFloat(cash) || 0)}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${canRun ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-slate-300 cursor-not-allowed'}`}
        >
            {isLoading ? '正在处理中...' : '开始对账 (Run Analysis)'}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;