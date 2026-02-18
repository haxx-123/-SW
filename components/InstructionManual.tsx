
import React from 'react';
import { Book, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const InstructionManual: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Book size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">核心逻辑说明书 (System Manual)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 text-slate-700 leading-relaxed">
          <p className="text-lg text-slate-600 border-l-4 border-indigo-500 pl-4">
            prism旗下的stockwise系统采用了<b>两级识别机制</b>：首先定位表头行（Header Sniffing），然后对每一列进行模糊关键词匹配（Fuzzy Column Mapping）。
          </p>

          {/* Section 1 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm mr-2">1</span>
              表头行定位机制 (Header Detection)
            </h3>
            <p className="mb-2">系统不会默认第一行就是表头，而是扫描文件的前 100 行。它会计算每一行包含以下“锚点关键词”的数量：</p>
            <ul className="list-disc pl-6 space-y-1 mb-2 bg-slate-50 p-4 rounded-lg text-sm">
                <li><b>关键词库：</b>'支付日期', '实收额', '支付序号', '电话 1', '交易时间', '收支类型', '交易类型', '金额', '明细名称', '资金流向', '业务描述', '押金', '收/支', '商品说明', '交易分类', '交易状态', '交易订单号'</li>
                <li><b>规则：</b>某一行包含上述关键词最多的（且至少包含2个），被认定为<b>表头行</b>。数据提取从该行的下一行开始。</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm mr-2">2</span>
              ERP 数据识别逻辑
            </h3>
            <p className="mb-4">找到表头后，系统会在表头中搜索以下关键词来锁定列。搜索逻辑是：先找完全匹配，找不到再找包含关键词的（例如“支付日期”可以匹配“日期”）。</p>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-medium">
                        <tr>
                            <th className="px-4 py-2 border-r">字段 (Field)</th>
                            <th className="px-4 py-2 border-r">识别关键词 (按优先级)</th>
                            <th className="px-4 py-2 border-r">排除关键词</th>
                            <th className="px-4 py-2">特殊处理逻辑</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr>
                            <td className="px-4 py-2 font-medium">日期 (Date)</td>
                            <td className="px-4 py-2">支付日期, Date, Time, 时间, 日期</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">必须存在，否则报错</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">金额 (Amount)</td>
                            <td className="px-4 py-2">实收额, Amount, Price, 金额, 实收</td>
                            <td className="px-4 py-2 text-red-500">押金</td>
                            <td className="px-4 py-2">必须存在。<br/><b>计算公式：</b> 最终金额 = 读取的实收额 - 读取的押金</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">押金 (Deposit)</td>
                            <td className="px-4 py-2">押金, Deposit, 储值</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">用于从实收额中扣除，计算净收入</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">现金 (Cash)</td>
                            <td className="px-4 py-2">现金, Cash</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">如果此列数值 &gt; 0，则标记为现金支付</td>
                        </tr>
                         <tr>
                            <td className="px-4 py-2 font-medium">类型 (Type)</td>
                            <td className="px-4 py-2">交易类型, Type, 类型</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">辅助判断是否为充值</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm mr-2">3</span>
              微信/支付宝 数据识别逻辑
            </h3>
            <p className="mb-4">这两者共用一套提取逻辑（在 <code>processPaymentData</code> 函数中），通过模糊匹配兼容两种格式。</p>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-medium">
                        <tr>
                            <th className="px-4 py-2 border-r">字段 (Field)</th>
                            <th className="px-4 py-2 border-r">识别关键词</th>
                            <th className="px-4 py-2 border-r">排除关键词</th>
                            <th className="px-4 py-2">特殊处理逻辑</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr>
                            <td className="px-4 py-2 font-medium">日期 (Date)</td>
                            <td className="px-4 py-2">交易时间, 时间, Time, Date</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">必须存在</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">金额 (Amount)</td>
                            <td className="px-4 py-2">金额, Amount, Price, 实收</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">必须存在</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">交易类型/商品</td>
                            <td className="px-4 py-2">商品说明, 交易类型, 类型, 业务描述</td>
                            <td className="px-4 py-2 text-red-500">收支</td>
                            <td className="px-4 py-2">如果是微信，必须包含“经营收款”；如果是“红包”、“转账”等会被拉黑</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">收支方向</td>
                            <td className="px-4 py-2">收/支, 收支类型, 资金流向</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">判断进出。如果是“支出”且非“退款”，会被过滤</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 font-medium">状态 (Status)</td>
                            <td className="px-4 py-2">交易状态, 状态, Status</td>
                            <td className="px-4 py-2 text-slate-400">-</td>
                            <td className="px-4 py-2">包含“关闭”、“失败”的记录会被丢弃</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </section>

          {/* Summary */}
          <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
             <h3 className="text-lg font-bold text-indigo-900 mb-3">逻辑总结</h3>
             <ul className="list-decimal pl-5 space-y-2 text-indigo-800 text-sm">
                <li><b>灵活度高：</b>系统不强求表头文字一模一样，只要表头包含“金额”二字（且不含“押金”），就能被识别为金额列。</li>
                <li><b>ERP 净额计算：</b>ERP 的金额不仅看“实收额”，还会自动减去“押金/储值”列的数值，确保对账的是实际资金流（Net Amount）。</li>
                <li><b>黑名单过滤：</b>支付流水会自动剔除 提现、红包、转账、充值、理财、服务费 以及失败/关闭的订单。</li>
             </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default InstructionManual;
