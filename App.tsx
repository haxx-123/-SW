
import React, { useState, useEffect, Suspense, lazy } from 'react';
import FileUpload from './components/FileUpload';
import { AnalysisState, AppConfig, FileMappingConfig } from './types';
import { processERPData, processPaymentData, runReconciliation } from './services/engine';
import { LayoutDashboard, FileText, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { TIME_WINDOW_MINUTES } from './constants';

// --- Code Splitting: Lazy Load Heavy Components ---
const Dashboard = lazy(() => import('./components/Dashboard'));
const Anomalies = lazy(() => import('./components/Anomalies'));
const AuditTable = lazy(() => import('./components/AuditTable'));
const CashDetail = lazy(() => import('./components/CashDetail'));
const CommissionDetail = lazy(() => import('./components/CommissionDetail'));
const FootfallDetail = lazy(() => import('./components/FootfallDetail'));
const RevenueDetail = lazy(() => import('./components/RevenueDetail'));
const ChannelDetail = lazy(() => import('./components/ChannelDetail'));
const VarianceDetail = lazy(() => import('./components/VarianceDetail'));
const ValidRevenueDetail = lazy(() => import('./components/ValidRevenueDetail'));

const CACHE_KEY = 'stockwise_cache_v4';

const DEFAULT_CONFIG: AppConfig = {
    matchTimeWindow: TIME_WINDOW_MINUTES,
    aggregationTimeWindow: 5,
    commissionRules: [
        { id: '1', name: '洗+谢 (Full)', keyword: '洗', rate: 0.10 },
        { id: '2', name: '谢 (Referral)', keyword: '谢', rate: 0.15 }
    ]
};

// Expanded navigation types
type ActiveView = 'dashboard' | 'anomalies' | 'audit' | 'cash' | 'commission' | 'footfall' | 'revenue' | 'wechat' | 'alipay' | 'variance' | 'validRevenue';

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
    <Loader2 size={40} className="animate-spin mb-4 text-indigo-500" />
    <p>Loading Component...</p>
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<AnalysisState>({
    cashActual: 0,
    results: null,
    loading: false,
    fileNameERP: '',
    fileNameWechat: '',
    fileNameAlipay: '',
    config: DEFAULT_CONFIG
  });

  const [activeTab, setActiveTab] = useState<ActiveView>('dashboard');

  // Load from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.results) {
            const reviveDates = (obj: any) => {
                if (!obj) return;
                ['matches', 'missingMoney', 'missingEntry', 'cashRecords', 'depositRecords'].forEach(key => {
                    if (Array.isArray(obj[key])) {
                        obj[key].forEach((item: any) => {
                             if(item.date) item.date = new Date(item.date);
                             if(item.erp && item.erp.date) item.erp.date = new Date(item.erp.date);
                             if(item.payment && item.payment.date) item.payment.date = new Date(item.payment.date);
                        });
                    }
                });
            };
            reviveDates(parsed.results);
        }
        if (!parsed.config) parsed.config = DEFAULT_CONFIG;
        setState(parsed);
      } catch (e) {
        console.error("Failed to load cache", e);
      }
    }
  }, []);

  // Save to cache on update
  useEffect(() => {
    if (state.results) {
      const { rawData, ...stateToCache } = state; 
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
    }
  }, [state]);

  const readExcel = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleProcess = async (
      erpFile: File, 
      wechatFile: File | null, 
      alipayFile: File | null, 
      cash: number,
      erpConfig: FileMappingConfig | null,
      wechatConfig: FileMappingConfig | null,
      alipayConfig: FileMappingConfig | null
  ) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const erpRaw = await readExcel(erpFile);
      // Pass manual config if available
      const erpData = processERPData(erpRaw, state.config, erpConfig);

      if (erpData.length === 0) {
          throw new Error("ERP数据解析为空。");
      }

      let allPayData: any[] = [];
      let rawPaymentSheets: any[][] = [];
      
      if (wechatFile) {
          const wechatRaw = await readExcel(wechatFile);
          rawPaymentSheets.push(wechatRaw);
          const wechatData = processPaymentData(wechatRaw, 'WeChat', wechatConfig);
          allPayData = [...allPayData, ...wechatData];
      }

      if (alipayFile) {
          const alipayRaw = await readExcel(alipayFile);
          rawPaymentSheets.push(alipayRaw);
          const alipayData = processPaymentData(alipayRaw, 'Alipay', alipayConfig);
          allPayData = [...allPayData, ...alipayData];
      }

      if (allPayData.length === 0) {
        throw new Error("未检测到有效账单数据，请至少上传一个正确的微信或支付宝账单。");
      }

      const result = runReconciliation(erpData, allPayData, cash, state.config);

      setState(prev => ({
        ...prev,
        cashActual: cash,
        results: result,
        loading: false,
        fileNameERP: erpFile.name,
        fileNameWechat: wechatFile?.name || '',
        fileNameAlipay: alipayFile?.name || '',
        rawData: {
            erp: erpRaw,
            payment: rawPaymentSheets
        }
      }));
      setActiveTab('dashboard');

    } catch (error: any) {
      console.error(error);
      alert(error.message || "处理文件时出错，请检查控制台详情。");
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUpdateConfig = (newConfig: AppConfig) => {
    if (!state.rawData) {
        alert("原始数据已过期，请重新上传文件以应用新配置。");
        return;
    }

    setState(prev => ({ ...prev, loading: true }));
    
    setTimeout(() => {
        try {
            const { erp, payment } = state.rawData!;
            // Fallback to auto-detect for config updates
            const erpData = processERPData(erp, newConfig);

            let allPayData: any[] = [];
            payment.forEach(sheet => {
                const headerIdx = sheet.findIndex((row: any[]) => row && row.some((c:any) => String(c).includes('微信') || String(c).includes('资金流向')));
                const isAlipay = headerIdx > -1 && sheet[headerIdx].some((c:any) => String(c).includes('资金流向') || String(c).includes('业务描述'));
                
                const source = isAlipay ? 'Alipay' : 'WeChat';
                allPayData = [...allPayData, ...processPaymentData(sheet, source)];
            });

            const result = runReconciliation(erpData, allPayData, state.cashActual, newConfig);

            setState(prev => ({
                ...prev,
                config: newConfig,
                results: result,
                loading: false
            }));

        } catch (e: any) {
            console.error(e);
            alert("重新计算失败 (提示: 调整参数时暂不支持手动映射的列保持，请重新上传文件): " + e.message);
            setState(prev => ({ ...prev, loading: false }));
        }
    }, 100);
  };

  const reset = () => {
    localStorage.removeItem(CACHE_KEY);
    setState({
      cashActual: 0,
      results: null,
      loading: false,
      fileNameERP: '',
      fileNameWechat: '',
      fileNameAlipay: '',
      config: DEFAULT_CONFIG
    });
  };

  if (!state.results) {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
             <FileUpload onProcess={handleProcess} isLoading={state.loading} />
        </div>
    );
  }

  // Helper to determine main navigation selection even if inside a sub-view
  const getNavHighlight = () => {
    if (['dashboard', 'cash', 'commission', 'footfall', 'revenue', 'wechat', 'alipay', 'variance', 'validRevenue'].includes(activeTab)) return 'dashboard';
    return activeTab;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-indigo-600 tracking-tight">Stockwise Core</span>
              <span className="ml-4 px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500 hidden md:inline-block">
                ERP: {state.fileNameERP}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
               <nav className="flex space-x-1">
                 <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${getNavHighlight() === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <LayoutDashboard size={18} className="mr-1.5" /> 仪表盘
                 </button>
                 <button 
                    onClick={() => setActiveTab('anomalies')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'anomalies' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <AlertTriangle size={18} className="mr-1.5" /> 异常记录
                 </button>
                 <button 
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <FileText size={18} className="mr-1.5" /> 全量明细
                 </button>
               </nav>
               <button onClick={reset} className="p-2 text-slate-400 hover:text-slate-600" title="重新开始">
                 <RefreshCw size={20} />
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && (
                <Dashboard 
                    data={state.results} 
                    config={state.config} 
                    onUpdateConfig={handleUpdateConfig}
                    onViewDetails={(view) => setActiveTab(view)}
                />
            )}
            {activeTab === 'cash' && (
                <CashDetail 
                    data={state.results} 
                    cashActual={state.cashActual} 
                    onBack={() => setActiveTab('dashboard')} 
                />
            )}
            {activeTab === 'commission' && (
                <CommissionDetail 
                    data={state.results} 
                    config={state.config}
                    onBack={() => setActiveTab('dashboard')} 
                />
            )}
            {activeTab === 'footfall' && (
                <FootfallDetail 
                    data={state.results} 
                    onBack={() => setActiveTab('dashboard')} 
                />
            )}
            {activeTab === 'revenue' && (
                <RevenueDetail
                    data={state.results}
                    cashActual={state.cashActual}
                    onBack={() => setActiveTab('dashboard')}
                />
            )}
            {activeTab === 'validRevenue' && (
                <ValidRevenueDetail
                    data={state.results}
                    onBack={() => setActiveTab('dashboard')}
                />
            )}
            {(activeTab === 'wechat' || activeTab === 'alipay') && (
                <ChannelDetail
                    data={state.results}
                    source={activeTab === 'wechat' ? 'WeChat' : 'Alipay'}
                    onBack={() => setActiveTab('dashboard')}
                />
            )}
            {activeTab === 'variance' && (
                <VarianceDetail
                    data={state.results}
                    cashActual={state.cashActual}
                    onBack={() => setActiveTab('dashboard')}
                />
            )}
            {activeTab === 'anomalies' && <Anomalies data={state.results} />}
            {activeTab === 'audit' && <AuditTable data={state.results} />}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
