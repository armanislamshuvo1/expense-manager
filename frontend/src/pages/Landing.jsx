import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  Wallet, 
  Camera,
  Share2, 
  Coins,
  Download,
  Globe,
  Smartphone,
  CheckCircle2,
  CreditCard,
  HelpCircle
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const isDark = theme === 'dark';
  
  // Interactive tool states (Simulator)
  const [budget, setBudget] = useState(5000);
  const [expense, setExpense] = useState(2400);
  const [savingsGoal, setSavingsGoal] = useState(1500);

  // Interactive Demo Tabber state
  const [demoTab, setDemoTab] = useState('scanner');

  const totalSavings = budget - expense;
  const savingsPercentage = Math.min(100, Math.max(0, (totalSavings / budget) * 100));
  const goalProgress = Math.min(100, Math.max(0, (totalSavings / savingsGoal) * 100));

  return (
    <>
      {/* Background Animated Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] animate-pulse ${
          isDark ? 'bg-[#1f2833]' : 'bg-indigo-200/50'
        }`}></div>
        <div className={`absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-5 blur-[150px] animate-pulse [animation-duration:8s] ${
          isDark ? 'bg-[#66fcf1]' : 'bg-teal-200/30'
        }`}></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row gap-12 items-center">
        <div className="flex-1 text-center lg:text-left">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 animate-bounce [animation-duration:3s] ${
            isDark ? 'bg-[#1f2833]/60 border border-[#66fcf1]/30 text-[#66fcf1]' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
          }`}>
            <Sparkles className="w-4 h-4" /> Next-Gen AI Financial Suite
          </div>
          <h1 className={`text-4xl sm:text-6xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Master Your Money, <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
              isDark ? 'from-[#66fcf1] to-[#45a29e]' : 'from-indigo-600 to-teal-600'
            }`}>
              Grow Your Wealth
            </span>
          </h1>
          <p className={`text-lg max-w-xl mb-8 leading-relaxed mx-auto lg:mx-0 ${isDark ? 'text-[#c5c6c7]/80' : 'text-[#475569]'}`}>
            NexusWealth combines AI receipt scanning, WealthBuddy financial advice, shared dashboards, multi-currency logging, and full offline MMBAK data portability into one unified platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <button 
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className={`px-8 py-4 font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                isDark ? 'bg-gradient-to-r from-[#66fcf1] to-[#45a29e] text-[#0b0c10] shadow-[#66fcf1]/10 hover:shadow-[#66fcf1]/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link 
              to="/how-it-works"
              className={`px-8 py-4 font-bold border rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isDark ? 'text-white border-[#1f2833] hover:border-[#66fcf1]/40 hover:bg-[#1f2833]/40' : 'text-[#0f172a] border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              How It Works
            </Link>
          </div>
        </div>

        {/* Hero Interactive App Showcase */}
        <div className="flex-1 w-full max-w-xl">
          <div className={`relative p-1 rounded-3xl shadow-2xl bg-gradient-to-tr ${
            isDark ? 'from-[#1f2833] via-[#66fcf1]/30 to-[#1f2833]' : 'from-gray-200 via-indigo-500/20 to-gray-200'
          }`}>
            <div className={`rounded-[22px] p-6 text-left relative overflow-hidden ${isDark ? 'bg-[#0b0c10]' : 'bg-white'}`}>
              <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-[#1f2833]/80' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className={`text-xs font-semibold tracking-wider ${isDark ? 'text-[#c5c6c7]/40' : 'text-slate-400'}`}>LIVE SIMULATOR</span>
              </div>

              {/* Title & Interactive Sliders */}
              <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
                <Wallet className={`w-5 h-5 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Interactive Budget & Savings Tool
              </h3>
              
              <div className="space-y-5 mb-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className={isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}>Monthly Budget:</span>
                    <span className={`font-bold ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`}>${budget.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="15000" 
                    step="500" 
                    value={budget} 
                    onChange={(e) => setBudget(Number(e.target.value))} 
                    className={`w-full cursor-pointer ${isDark ? 'accent-[#66fcf1]' : 'accent-indigo-600'}`}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className={isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}>Monthly Expenses:</span>
                    <span className="text-rose-500 font-bold">${expense.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max={budget} 
                    step="100" 
                    value={expense} 
                    onChange={(e) => setExpense(Number(e.target.value))} 
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className={isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}>Savings Goal:</span>
                    <span className="text-emerald-500 font-bold">${savingsGoal.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="5000" 
                    step="100" 
                    value={savingsGoal} 
                    onChange={(e) => setSavingsGoal(Number(e.target.value))} 
                    className={`w-full cursor-pointer ${isDark ? 'accent-emerald-400' : 'accent-emerald-600'}`}
                  />
                </div>
              </div>

              {/* Calculated Outputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`border rounded-xl p-4 transition-all ${
                  isDark ? 'bg-[#1f2833]/40 border-[#1f2833]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'}`}>Monthly Surplus</span>
                  <span className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>${totalSavings.toLocaleString()}</span>
                  <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isDark ? 'bg-[#1f2833]' : 'bg-slate-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${isDark ? 'bg-[#66fcf1]' : 'bg-indigo-600'}`}
                      style={{ width: `${savingsPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className={`border rounded-xl p-4 transition-all ${
                  isDark ? 'bg-[#1f2833]/40 border-[#1f2833]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'}`}>Goal Progress</span>
                  <span className={`text-xl font-extrabold ${goalProgress >= 100 ? 'text-emerald-500' : (isDark ? 'text-white' : 'text-[#0f172a]')}`}>
                    {Math.round(goalProgress)}%
                  </span>
                  <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isDark ? 'bg-[#1f2833]' : 'bg-slate-200'}`}>
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${goalProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Banner */}
      <section className={`py-8 border-y z-10 relative ${
        isDark ? 'bg-[#1f2833]/40 border-[#1f2833]/60 text-[#c5c6c7]' : 'bg-indigo-50/50 border-indigo-100 text-slate-700'
      }`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`}>99.8%</div>
            <div className="text-xs font-semibold mt-1 opacity-80">AI Receipt OCR Accuracy</div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`}>100%</div>
            <div className="text-xs font-semibold mt-1 opacity-80">Private MMBAK Data Ownership</div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`}>Multi-Currency</div>
            <div className="text-xs font-semibold mt-1 opacity-80">Keypad & Live Conversion</div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`}>Offline PWA</div>
            <div className="text-xs font-semibold mt-1 opacity-80">Instant Local Sync</div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid (8 Unique Features) */}
      <section className={`py-20 relative z-10 border-b ${
        isDark ? 'bg-[#0b0c10] border-[#1f2833]/40' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`text-3xl sm:text-4xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
              Engineered For Complete Financial Freedom
            </h2>
            <p className={`${isDark ? 'text-[#c5c6c7]/75' : 'text-slate-600'}`}>
              Discover the complete suite of tools built to track every dollar, scan receipts, model budgets, and automate your wealth building.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: AI Receipt Scanner */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Camera className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>AI Receipt Scanner</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Snap paper receipts using your phone camera or upload images. OCR automatically populates merchant, date, amount, and category.
              </p>
            </div>

            {/* Feature 2: WealthBuddy AI */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Sparkles className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>WealthBuddy AI Advisor</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Consult your personal AI assistant to review spending habits, identify top expenses, and receive tailored budget recommendations.
              </p>
            </div>

            {/* Feature 3: Shared Dashboards */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Share2 className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Shared Dashboards</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Create secure tokenized links to share live read-only net worth summaries with family or financial planners. Revoke tokens anytime.
              </p>
            </div>

            {/* Feature 4: MMBAK Data Backup & Clean Export */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Download className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>MMBAK Backup & Clean Export</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Full offline database backup/restore using `.mmbak` files. Export clean CSV or JSON files with an option to remove emojis for clean logs.
              </p>
            </div>

            {/* Feature 5: Multi-Currency Keypad */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Globe className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Multi-Currency & Keypad</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Log spending across global currencies using our dynamic numeric keypad. Auto-converts to your primary base currency in real-time.
              </p>
            </div>

            {/* Feature 6: Rollover Budgets & Custom Cycle */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Coins className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Rollover Budgets</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Automatically roll over monthly surplus or debt into upcoming months. Customize your salary start date (e.g. 25th of each month).
              </p>
            </div>

            {/* Feature 7: Accounts & Category Settings */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CreditCard className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Accounts & Categories</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Manage cash, credit cards, bank accounts, and investments in one place. Customize income & expense category icons, colors, and limits.
              </p>
            </div>

            {/* Feature 8: Offline PWA Application */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 group ${
              isDark ? 'bg-[#1f2833]/20 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Smartphone className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>PWA & Offline First</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Install as a standalone app on iOS, Android, or Desktop. Log transactions completely offline and sync smoothly when reconnected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Demo Tabs Section */}
      <section className={`py-20 relative z-10 ${
        isDark ? 'bg-[#1f2833]/10' : 'bg-slate-50'
      }`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className={`text-3xl font-extrabold mb-3 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
              Experience NexusWealth Innovation
            </h2>
            <p className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
              Click below to explore interactive previews of our breakthrough financial utilities.
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button
              onClick={() => setDemoTab('scanner')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                demoTab === 'scanner'
                  ? isDark ? 'bg-[#66fcf1] text-[#0b0c10] shadow-md shadow-[#66fcf1]/20' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-[#1f2833]/60 text-white hover:bg-[#1f2833]' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-4 h-4" /> AI Receipt Scanner
            </button>
            <button
              onClick={() => setDemoTab('ai')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                demoTab === 'ai'
                  ? isDark ? 'bg-[#66fcf1] text-[#0b0c10] shadow-md shadow-[#66fcf1]/20' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-[#1f2833]/60 text-white hover:bg-[#1f2833]' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" /> WealthBuddy AI
            </button>
            <button
              onClick={() => setDemoTab('sharing')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                demoTab === 'sharing'
                  ? isDark ? 'bg-[#66fcf1] text-[#0b0c10] shadow-md shadow-[#66fcf1]/20' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-[#1f2833]/60 text-white hover:bg-[#1f2833]' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Share2 className="w-4 h-4" /> Shared Link Tokens
            </button>
            <button
              onClick={() => setDemoTab('backup')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                demoTab === 'backup'
                  ? isDark ? 'bg-[#66fcf1] text-[#0b0c10] shadow-md shadow-[#66fcf1]/20' : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-[#1f2833]/60 text-white hover:bg-[#1f2833]' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Download className="w-4 h-4" /> MMBAK & Clean Export
            </button>
          </div>

          {/* Tab Content Box */}
          <div className={`p-8 rounded-3xl border transition-all duration-300 ${
            isDark ? 'bg-[#0b0c10] border-[#1f2833]' : 'bg-white border-slate-200 shadow-xl'
          }`}>
            {demoTab === 'scanner' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500 mb-3">
                    <Camera className="w-3.5 h-3.5" /> High Precision OCR
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>Instant Receipt Extraction</h3>
                  <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
                    Eliminate tedious manual entry. Simply point your smartphone camera or upload any physical paper receipt. Our integrated AI OCR automatically detects merchant details, totals, taxes, and automatically maps to your expense categories.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Camera capture or drag-and-drop receipt image
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Auto-detects amount, date, and merchant name
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Single-click verification and entry approval
                    </li>
                  </ul>
                </div>
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/40 border-[#1f2833]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-500/20">
                    <span className="text-xs font-bold uppercase opacity-70">Parsed Receipt Preview</span>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">99.8% Match</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-70">Merchant:</span>
                      <span className="font-bold">Starbucks Coffee #408</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Date & Time:</span>
                      <span className="font-bold">July 23, 2026 - 09:14 AM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Category:</span>
                      <span className="font-bold text-indigo-400">Food & Dining ☕</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-sm">
                      <span>Total Amount:</span>
                      <span className="text-emerald-500">$14.50</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {demoTab === 'ai' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-500 mb-3">
                    <Sparkles className="w-3.5 h-3.5" /> Virtual Advisor
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>WealthBuddy AI Chat</h3>
                  <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
                    WealthBuddy securely reads your spending summaries to provide actionable advice. Ask questions like "Where did I spend the most this month?" or "How can I reach my savings goal faster?" and receive instant answers.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Contextual insights tailored to your budget logs
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> One-tap suggestion chips for instant questions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Privacy-first prompt contextualization
                    </li>
                  </ul>
                </div>
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/40 border-[#1f2833]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="space-y-3 text-xs">
                    <div className="bg-indigo-600 text-white p-3 rounded-xl rounded-tr-none ml-auto max-w-[85%]">
                      Where did I spend the most money this week?
                    </div>
                    <div className={`p-3 rounded-xl rounded-tl-none max-w-[90%] border ${
                      isDark ? 'bg-[#0b0c10] border-[#1f2833] text-[#c5c6c7]' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      <p className="font-semibold text-xs mb-1 text-teal-400">WealthBuddy AI:</p>
                      Your highest spending category this week was <strong>Dining Out ($185.00)</strong>, followed by <strong>Groceries ($120.00)</strong>. Cutting dining expenses by 15% would save you $111/month!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {demoTab === 'sharing' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-500 mb-3">
                    <Share2 className="w-3.5 h-3.5" /> Read-Only Link Tokens
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>Shared Live Dashboards</h3>
                  <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
                    Easily share read-only financial metrics with your spouse, partner, or accountant without handing over control. Recipients view live net worth, cash flow pace, and asset balances securely.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Zero write permissions – strictly view-only
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> One-click token revocation or refresh
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Perfect for joint budgeting & partner visibility
                    </li>
                  </ul>
                </div>
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/40 border-[#1f2833]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold">Share Token: active_token_#8492</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">READ ONLY</span>
                  </div>
                  <div className={`p-3 rounded-lg border text-xs font-mono mb-4 truncate ${
                    isDark ? 'bg-[#0b0c10] border-[#1f2833] text-[#66fcf1]' : 'bg-white border-slate-200 text-indigo-600'
                  }`}>
                    https://nexuswealthmanager.xyz/shared/token_8492ax
                  </div>
                  <button className="w-full py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-bold hover:bg-rose-500/20 transition-colors">
                    Revoke Shared Access Token
                  </button>
                </div>
              </div>
            )}

            {demoTab === 'backup' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 mb-3">
                    <Download className="w-3.5 h-3.5" /> Full Data Portability
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>MMBAK Backup & Emoji-Free Export</h3>
                  <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
                    You own your data completely. Download your complete financial snapshot into an encrypted `.mmbak` file for backup or cross-device migration. Export transaction logs to CSV or JSON with a single toggle to remove all emojis for clean spreadsheet parsing.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Full database import & export via `.mmbak` format
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Optional emoji remover for clean CSV spreadsheet logs
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> No platform lock-in – total freedom
                    </li>
                  </ul>
                </div>
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/40 border-[#1f2833]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="space-y-3 text-xs">
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-[#0b0c10] border-[#1f2833]' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <span className="font-bold block">nexus_wealth_backup.mmbak</span>
                        <span className="text-[10px] opacity-60">Complete Local Backup • 1.2 MB</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">Ready</span>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-[#0b0c10] border-[#1f2833]' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <span className="font-bold block">transactions_export.csv</span>
                        <span className="text-[10px] opacity-60">Clean Export (Emojis Stripped)</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">CSV Export</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border ${
            isDark ? 'bg-[#1f2833]/60 border-[#66fcf1]/20 text-[#66fcf1]' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            <HelpCircle className="w-4 h-4" /> Got Questions?
          </div>
          <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              How does the AI Receipt Scanner process paper receipts?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              You can capture receipts using your mobile camera or upload an image file directly. Our OCR scanner extracts merchant names, dates, amounts, and auto-assigns matching categories. You review and approve the details with one click.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-[#66fcf1]' : 'text-slate-800'}`}>
              What is `.mmbak` and how does data backup work?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              `.mmbak` is our dedicated data backup format. It stores your accounts, transactions, and category structures safely offline. You can restore your data onto any new device in seconds or export clean CSV files without emojis.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Are Shared Dashboard links secure for joint accounts?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              Yes! Shared links grant strict read-only access to live summaries and cashflow charts. Shared viewers cannot edit, add, or delete transactions. You can revoke or refresh access tokens anytime with a single click.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Does NexusWealth work offline and as a mobile app?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              Absolutely. NexusWealth is a Progressive Web Application (PWA). You can install it directly onto your iOS, Android, or desktop home screen. Transactions logged offline are cached locally and synchronized automatically once back online.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center relative z-10">
        <div className={`p-12 rounded-3xl border ${
          isDark ? 'bg-gradient-to-tr from-[#1f2833] via-[#0b0c10] to-[#66fcf1]/10 border-[#66fcf1]/20' : 'bg-white border-slate-200 shadow-xl'
        }`}>
          <h2 className={`text-3xl sm:text-4xl font-extrabold mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Take Control of Your Wealth Today
          </h2>
          <p className={`max-w-xl mx-auto mb-8 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
            Join users who track, visualize, and optimize their personal finances with NexusWealth. Completely free to start.
          </p>
          <button 
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
            className={`px-8 py-4 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] shadow-[#66fcf1]/20' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
            }`}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Create Your Free Account'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 relative z-10 ${isDark ? 'border-[#1f2833]/40 bg-[#0b0c10]' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#0b0c10]" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>NexusWealth</span>
          </div>

          <div className={`flex gap-8 text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
            <Link to="/" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Home</Link>
            <Link to="/about" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>About Us</Link>
            <Link to="/how-it-works" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>How It Works</Link>
            <Link to={isAuthenticated ? "/dashboard" : "/login"} className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>
              {isAuthenticated ? "Dashboard" : "Sign In"}
            </Link>
          </div>

          <p className={`text-xs ${isDark ? 'text-[#c5c6c7]/40' : 'text-slate-400'}`}>
            &copy; {new Date().getFullYear()} NexusWealth. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
