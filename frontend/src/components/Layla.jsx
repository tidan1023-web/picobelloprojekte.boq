import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minimize2 } from 'lucide-react';

const LAYLA_RESPONSES = [
  {
    keywords: ['estimate', 'estimat', 'cost', 'price', 'quote'],
    reply: "To create an estimate, go to Project Estimator in the sidebar. Select your project type, condition, size, and finish tier — Layla will price every element from your rate libraries automatically.",
  },
  {
    keywords: ['boq', 'bill of quantities', 'quantities'],
    reply: "The BOQ Builder lets you build a full Bill of Quantities item by item. Once done, you can send it to your client for digital approval directly from their portal.",
  },
  {
    keywords: ['invoice', 'payment', 'pay', 'paystack'],
    reply: "Go to Invoices in the sidebar to create and manage invoices. You can share a Paystack payment link so clients pay online instantly. You can also track outstanding balances there.",
  },
  {
    keywords: ['programme', 'gantt', 'schedule', 'phases'],
    reply: "The Programme of Works module gives you an 8-phase Gantt chart. Set a start date and all activity dates shift automatically. You can also file weekly progress reports with planned vs actual tracking.",
  },
  {
    keywords: ['team', 'invite', 'member', 'role', 'staff'],
    reply: "Go to Team Management under the Admin section. You can invite QS, Project Managers, and Clients by email. Each role sees only what's relevant to them.",
  },
  {
    keywords: ['client', 'portal', 'approval', 'approve'],
    reply: "Clients get their own portal — they can view project progress, approve BOQ items, see their invoices, and leave comments. Invite them via Team Management.",
  },
  {
    keywords: ['report', 'site', 'daily', 'weekly'],
    reply: "Use Site Reports in the Execution section to file daily or weekly reports — photos, weather, manpower, and progress notes. Your whole team can view and comment on them.",
  },
  {
    keywords: ['expense', 'cost tracker', 'budget'],
    reply: "The Expense Tracker lets you log every project cost and compare against budget. Find it under the Execution section in the sidebar.",
  },
  {
    keywords: ['analytics', 'revenue', 'profit', 'performance'],
    reply: "The Analytics page gives you company-wide charts — revenue trends, project profitability, outstanding balances, and cost breakdowns by trade.",
  },
  {
    keywords: ['module', 'feature', 'toggle', 'enable', 'disable'],
    reply: "You can turn individual modules on or off in Company Settings. Go to Settings → Modules to control exactly what your team sees in the sidebar.",
  },
  {
    keywords: ['rate', 'library', 'qs price', 'artisan', 'material'],
    reply: "Your rate libraries live under Pricing Libraries in the sidebar. You can maintain QS unit rates, artisan day-rates, and material prices. Every estimate references these live rates.",
  },
  {
    keywords: ['change order', 'variation', 'scope'],
    reply: "Change Orders let you manage scope changes formally. Team members submit requests, you review, price, and approve. Every change is logged with a full paper trail.",
  },
  {
    keywords: ['document', 'file', 'upload', 'contract', 'drawing'],
    reply: "The Document Library gives you centralised storage for contracts, permits, site plans, and drawings — organised by folder or project.",
  },
  {
    keywords: ['password', 'login', 'forgot', 'reset', 'account'],
    reply: "If you've forgotten your password, click 'Forgot password?' on the login page. For account issues, contact your admin or email hello@squaremetre.app.",
  },
  {
    keywords: ['plan', 'upgrade', 'basic', 'premium', 'trial'],
    reply: "SquareMetre has three plans — Free (7-day trial), Basic, and Premium. Basic unlocks rate libraries and estimate history. Premium unlocks analytics, change orders, site reports, and more.",
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'start'],
    reply: "Hi! I'm Layla, your SquareMetre assistant. I can help you with estimates, BOQs, invoices, team management, site reports, and more. What do you need help with?",
  },
];

const FALLBACK = "I'm not sure about that one. Try asking about estimates, BOQs, invoices, team management, site reports, or the programme of works. Or email us at hello@squaremetre.app.";

function getReply(input) {
  const lower = input.toLowerCase();
  for (const { keywords, reply } of LAYLA_RESPONSES) {
    if (keywords.some((k) => lower.includes(k))) return reply;
  }
  return FALLBACK;
}

export default function Layla() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'layla', text: "Hi, I'm Layla! How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const next = [...messages, { from: 'user', text }];
    setMessages(next);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'layla', text: getReply(text) }]);
    }, 600);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="bg-primary-900 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">L</div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Layla</p>
                <p className="text-blue-300 text-xs">SquareMetre Assistant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-300 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'layla' && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mr-2 mt-0.5">L</div>
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-primary-900 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white shrink-0 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Layla anything…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30"
            />
            <button onClick={send} disabled={!input.trim()}
              className="bg-primary-900 text-white rounded-xl px-3 py-2 hover:bg-primary-800 transition-colors disabled:opacity-40">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 bg-primary-900 text-white rounded-full shadow-lg hover:bg-primary-800 transition-colors flex items-center justify-center"
        title="Chat with Layla"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  );
}
