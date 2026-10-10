import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAxiosSecure } from '../hooks/useApi';
import { useTheme } from '../context/ThemeContext';
import { BottomNav } from '../components/BottomNav';
import { ArrowLeft, Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';

export default function WealthBuddy() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: "Hello! I'm WealthBuddy, your personal AI financial advisor. Ask me anything about your spending habits, account balances, or financial optimizations!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const suggestionChips = [
    "How is my spending this month?",
    "Summarize my purchases by merchants & notes",
    "Show my biggest expense categories",
    "Give me a weekly spending summary"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput('');

    // Append user message
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Map history structure to what advisorChat expects
      const formattedHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await axiosSecure.post('/api/ai/chat', {
        message: text,
        history: formattedHistory
      });

      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'model', text: res.data.data.text }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: "Sorry, I ran into an error retrieving details. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors duration-300 ${
      isDark ? 'bg-[#070b13] text-[#e0e6f2]' : 'bg-[#f1f5f9] text-[#475569]'
    }`}>
      {/* Title Bar */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 py-4 flex items-center gap-3 transition-colors ${
        isDark ? 'bg-[#070b13]/80 border-white/5' : 'bg-[#f1f5f9]/80 border-slate-200/80'
      }`}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-circle btn-ghost">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-error to-error/60 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm uppercase tracking-wider">WealthBuddy AI</h1>
            <p className="text-[9px] opacity-40 uppercase tracking-widest font-semibold">Virtual Advisor</p>
          </div>
        </div>
      </header>

      {/* Main Conversation Container */}
      <main className="max-w-2xl mx-auto p-4 flex flex-col h-[calc(100vh-140px)] justify-between">
        
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
              <div className="chat-image avatar">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  m.role === 'user' 
                    ? 'bg-base-200 border-base-content/10' 
                    : 'bg-error/10 border-error/20 text-error'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
              </div>
              <div className={`chat-bubble text-xs leading-relaxed max-w-[85%] rounded-2xl p-3 ${
                m.role === 'user' 
                  ? 'bg-error text-white font-semibold' 
                  : isDark ? 'bg-[#0f172a]/60 border border-white/5 text-white/90' : 'bg-white border border-slate-200 shadow-sm text-slate-800'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat chat-start">
              <div className="chat-image avatar">
                <div className="w-8 h-8 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div className={`chat-bubble text-xs rounded-2xl p-3 flex items-center gap-2 ${
                isDark ? 'bg-[#0f172a]/60 border border-white/5' : 'bg-white border border-slate-200'
              }`}>
                <Loader2 className="w-4 h-4 animate-spin text-error" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Footer inputs area */}
        <div className="space-y-4">
          {/* Suggestions */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 justify-center py-2 border-t border-base-content/10">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    isDark 
                      ? 'bg-[#0f172a]/55 border-white/5 hover:bg-[#0f172a] text-white/70' 
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Text input console */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className={`flex items-center gap-2 p-2 border rounded-2xl transition-all shadow-md ${
              isDark ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200'
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask WealthBuddy anything..."
              className="flex-1 input input-ghost bg-transparent focus:bg-transparent text-xs outline-none focus:outline-none border-none py-2 px-3 h-10 w-full"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-circle btn-error h-10 w-10 min-h-10 text-white shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
