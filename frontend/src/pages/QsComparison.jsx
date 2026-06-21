import React, { useState } from 'react';
import { Plus, Trash2, Trophy, TrendingDown, BarChart3, Printer } from 'lucide-react';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent bg-white';

const EMPTY_ITEM = { description: '', unit: '', qty: '' };
const newQuote = (n) => ({
  id: Date.now() + n,
  name: `Quote ${n}`,
  contractor: '',
  currency: 'NGN',
  overhead: '0',
  profit: '0',
  items: [{ ...EMPTY_ITEM, rate: '' }],
});

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcTotal(quote) {
  const base = quote.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
  return base * (1 + Number(quote.overhead || 0) / 100) * (1 + Number(quote.profit || 0) / 100);
}

export default function QsComparison() {
  const [quotes, setQuotes] = useState([newQuote(1), newQuote(2)]);
  const [projectName, setProjectName] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const updateQuote = (id, key, val) =>
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, [key]: val } : q)));

  const updateItem = (qid, idx, key, val) =>
    setQuotes((qs) => qs.map((q) =>
      q.id === qid ? { ...q, items: q.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) } : q
    ));

  const addItem = (qid) =>
    setQuotes((qs) => qs.map((q) =>
      q.id === qid ? { ...q, items: [...q.items, { ...EMPTY_ITEM, rate: '' }] } : q
    ));

  const removeItem = (qid, idx) =>
    setQuotes((qs) => qs.map((q) =>
      q.id === qid ? { ...q, items: q.items.filter((_, i) => i !== idx) } : q
    ));

  const removeQuote = (id) => setQuotes((qs) => qs.filter((q) => q.id !== id));
  const addQuote = () => setQuotes((qs) => [...qs, newQuote(qs.length + 1)]);

  const totals = quotes.map((q) => ({ id: q.id, name: q.name, total: calcTotal(q), currency: q.currency }));
  const minTotal = Math.min(...totals.map((t) => t.total));
  const winner = totals.find((t) => t.total === minTotal);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1">
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project / Description (optional)"
            className="text-lg font-semibold text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:border-primary-900 focus:outline-none w-full max-w-sm" />
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={addQuote}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Plus size={15} /> Add Quote
          </button>
          <button onClick={() => setShowSummary((v) => !v)}
            className="flex items-center gap-2 bg-primary-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-800">
            <BarChart3 size={15} /> {showSummary ? 'Hide' : 'Compare'}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Comparison summary */}
      {showSummary && totals.some((t) => t.total > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 print:border print:shadow-none">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" /> Quote Comparison Summary
          </h3>
          <div className="space-y-3">
            {[...totals].sort((a, b) => a.total - b.total).map((t, i) => {
              const pct = minTotal > 0 ? ((t.total - minTotal) / minTotal) * 100 : 0;
              const isWinner = t.total === minTotal;
              return (
                <div key={t.id} className={`flex items-center gap-4 p-3 rounded-xl border ${isWinner ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isWinner ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{t.name}</p>
                    {!isWinner && <p className="text-xs text-red-500">+{fmt(pct)}% above lowest</p>}
                    {isWinner && <p className="text-xs text-green-600 flex items-center gap-1"><TrendingDown size={11} /> Lowest quote</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-base ${isWinner ? 'text-green-700' : 'text-gray-800'}`}>{t.currency} {fmt(t.total)}</p>
                    {!isWinner && <p className="text-xs text-gray-400">+{t.currency} {fmt(t.total - minTotal)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {winner && (
            <p className="mt-4 text-sm text-gray-500 flex items-center gap-1.5">
              <Trophy size={14} className="text-yellow-500" />
              Recommended: <strong className="text-gray-800">{winner.name}</strong> at <strong>{winner.currency} {fmt(winner.total)}</strong>
            </p>
          )}
        </div>
      )}

      {/* Quote cards */}
      <div className={`grid gap-5 ${quotes.length === 1 ? 'grid-cols-1' : quotes.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
        {quotes.map((q) => {
          const total = calcTotal(q);
          const base = q.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
          const isWinner = total === minTotal && total > 0 && quotes.length > 1;
          return (
            <div key={q.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isWinner ? 'border-green-300 ring-2 ring-green-200' : 'border-gray-100'}`}>
              {/* Quote header */}
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${isWinner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                {isWinner && <Trophy size={14} className="text-yellow-500 shrink-0" />}
                <input value={q.name} onChange={(e) => updateQuote(q.id, 'name', e.target.value)}
                  className="font-semibold text-gray-800 bg-transparent focus:outline-none flex-1 text-sm" />
                {quotes.length > 1 && (
                  <button onClick={() => removeQuote(q.id)} className="text-gray-400 hover:text-red-500 print:hidden shrink-0"><Trash2 size={14} /></button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Contractor</label>
                    <input value={q.contractor} onChange={(e) => updateQuote(q.id, 'contractor', e.target.value)}
                      className={inputCls} placeholder="Contractor name" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Currency</label>
                    <select value={q.currency} onChange={(e) => updateQuote(q.id, 'currency', e.target.value)} className={inputCls}>
                      {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Overhead %</label>
                    <input type="number" min="0" max="100" value={q.overhead} onChange={(e) => updateQuote(q.id, 'overhead', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Profit %</label>
                    <input type="number" min="0" max="100" value={q.profit} onChange={(e) => updateQuote(q.id, 'profit', e.target.value)} className={inputCls} />
                  </div>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[340px]">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-100">
                        <th className="text-left py-1.5 font-medium">Description</th>
                        <th className="text-left py-1.5 font-medium w-12">Unit</th>
                        <th className="text-left py-1.5 font-medium w-12">Qty</th>
                        <th className="text-left py-1.5 font-medium w-20">Rate</th>
                        <th className="text-right py-1.5 font-medium w-20">Amount</th>
                        <th className="w-6 print:hidden" />
                      </tr>
                    </thead>
                    <tbody>
                      {q.items.map((it, idx) => {
                        const amt = Number(it.qty || 0) * Number(it.rate || 0);
                        return (
                          <tr key={idx} className="border-b border-gray-50">
                            <td className="py-1 pr-1">
                              <input value={it.description} onChange={(e) => updateItem(q.id, idx, 'description', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:bg-gray-50 px-1 rounded text-gray-800" placeholder="Item…" />
                            </td>
                            <td className="py-1 pr-1">
                              <input value={it.unit} onChange={(e) => updateItem(q.id, idx, 'unit', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:bg-gray-50 px-1 rounded text-gray-600" placeholder="m²" />
                            </td>
                            <td className="py-1 pr-1">
                              <input type="number" min="0" value={it.qty} onChange={(e) => updateItem(q.id, idx, 'qty', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:bg-gray-50 px-1 rounded text-gray-600" placeholder="0" />
                            </td>
                            <td className="py-1 pr-1">
                              <input type="number" min="0" value={it.rate} onChange={(e) => updateItem(q.id, idx, 'rate', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:bg-gray-50 px-1 rounded text-gray-600" placeholder="0.00" />
                            </td>
                            <td className="py-1 text-right font-medium text-gray-700">{fmt(amt)}</td>
                            <td className="py-1 print:hidden">
                              {q.items.length > 1 && (
                                <button onClick={() => removeItem(q.id, idx)} className="text-gray-300 hover:text-red-400 ml-1"><Trash2 size={11} /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button onClick={() => addItem(q.id)}
                  className="flex items-center gap-1.5 text-xs text-primary-900 hover:underline print:hidden">
                  <Plus size={12} /> Add line item
                </button>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Base</span><span>{q.currency} {fmt(base)}</span>
                  </div>
                  {Number(q.overhead) > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Overhead ({q.overhead}%)</span>
                      <span>{q.currency} {fmt(base * Number(q.overhead) / 100)}</span>
                    </div>
                  )}
                  {Number(q.profit) > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Profit ({q.profit}%)</span>
                      <span>{q.currency} {fmt(base * (1 + Number(q.overhead) / 100) * Number(q.profit) / 100)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold text-base pt-1 border-t border-gray-100 ${isWinner ? 'text-green-700' : 'text-gray-800'}`}>
                    <span>Total</span><span>{q.currency} {fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@media print { .print\\:hidden { display:none!important; } }`}</style>
    </div>
  );
}
