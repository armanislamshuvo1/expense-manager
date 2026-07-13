import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  TrendingUp, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  PieChart as PieIcon, 
  Wallet, 
  Layers2,
  Sun,
  Moon,
  Gift
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  
  // Interactive tool states
  const [budget, setBudget] = useState(5000);
  const [expense, setExpense] = useState(2400);
  const [savingsGoal, setSavingsGoal] = useState(1500);

  const totalSavings = budget - expense;
  const savingsPercentage = Math.min(100, Math.max(0, (totalSavings / budget) * 100));
  const goalProgress = Math.min(100, Math.max(0, (totalSavings / savingsGoal) * 100));

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#0b0c10] text-[#c5c6c7] selection:bg-[#66fcf1] selection:text-[#0b0c10]' : 'bg-[#f8fafc] text-[#334155] selection:bg-indigo-500 selection:text-white'
    }`}>
      
      {/* Promotional Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-teal-700 text-white font-semibold py-2.5 px-4 text-center text-xs sm:text-sm flex items-center justify-center gap-2 relative z-50 shadow-md">
        <Gift className="w-4 h-4 shrink-0 animate-bounce text-[#66fcf1]" />
        <span>Special Launch Offer: Premium features are 100% FREE for the first 100 users! (Only 14 slots left)</span>
        <button 
          onClick={() => navigate('/register')}
          className="ml-2 px-3 py-1 bg-white text-[#0b0c10] rounded-full text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Claim Now
        </button>
      </div>

      {/* Background Animated Glows - Softened in Light Mode */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] animate-pulse ${
          isDark ? 'bg-[#1f2833]' : 'bg-indigo-200/50'
        }`}></div>
        <div className={`absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-5 blur-[150px] animate-pulse [animation-duration:8s] ${
          isDark ? 'bg-[#66fcf1]' : 'bg-teal-200/30'
        }`}></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
        isDark ? 'border-[#1f2833]/40 bg-[#0b0c10]/70' : 'border-gray-200 bg-white/80 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center shadow-lg shadow-[#66fcf1]/20 group-hover:rotate-12 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-[#0b0c10]" />
            </div>
            <span className={`text-xl font-bold tracking-wider transition-colors ${
              isDark ? 'text-white hover:text-[#66fcf1]' : 'text-[#0f172a] hover:text-indigo-600'
            }`}>
              NexusWealth
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <Link to="/" className={`transition-colors ${isDark ? 'text-[#66fcf1] hover:text-[#66fcf1]/80' : 'text-indigo-600 hover:text-indigo-700'}`}>Home</Link>
            <Link to="/about" className={`transition-colors ${isDark ? 'hover:text-[#66fcf1]' : 'text-slate-600 hover:text-indigo-600'}`}>About Us</Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isDark ? 'border-[#1f2833] hover:bg-[#1f2833]/50 text-yellow-400' : 'border-gray-300 hover:bg-gray-100 text-indigo-600'
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => navigate('/login')} 
              className={`px-5 py-2 text-sm font-semibold border rounded-full transition-all duration-300 cursor-pointer ${
                isDark ? 'text-[#66fcf1] border-[#66fcf1]/30 hover:border-[#66fcf1] hover:bg-[#66fcf1]/5' : 'text-indigo-600 border-indigo-600/30 hover:border-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className={`hidden sm:inline-flex px-5 py-2 text-sm font-semibold rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
                isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] shadow-[#66fcf1]/20' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
              }`}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row gap-12 items-center">
        <div className="flex-1 text-center lg:text-left">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 animate-bounce [animation-duration:3s] ${
            isDark ? 'bg-[#1f2833]/60 border border-[#66fcf1]/20 text-[#66fcf1]' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
          }`}>
            <Sparkles className="w-4 h-4" /> Smart Finance Platform
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
            NexusWealth simplifies expense tracking, visualizes budgeting, and guides you toward optimal saving goals with an elegant, responsive design.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <button 
              onClick={() => navigate('/register')}
              className={`px-8 py-4 font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer ${
                isDark ? 'bg-gradient-to-r from-[#66fcf1] to-[#45a29e] text-[#0b0c10] shadow-[#66fcf1]/10 hover:shadow-[#66fcf1]/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link 
              to="/about"
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
                <span className={`text-xs font-semibold tracking-wider ${isDark ? 'text-[#c5c6c7]/40' : 'text-slate-400'}`}>PREVIEW INSTRUMENT</span>
              </div>

              {/* Title & Interactive Sliders */}
              <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
                <Wallet className={`w-5 h-5 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} /> Interactive Budget Simulator
              </h3>
              
              <div className="space-y-5 mb-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className={isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}>Monthly Income Budget:</span>
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
                    <span className="text-red-600 font-bold">${expense.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min="500" 
                    max={budget} 
                    step="100" 
                    value={expense} 
                    onChange={(e) => setExpense(Number(e.target.value))} 
                    className="w-full accent-red-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className={isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}>Savings Goal:</span>
                    <span className="text-emerald-600 font-bold">${savingsGoal.toLocaleString()}</span>
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
                  isDark ? 'bg-[#1f2833]/40 border-[#1f2833] hover:border-[#66fcf1]/20' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/20'
                }`}>
                  <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'}`}>Monthly Savings</span>
                  <span className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>${totalSavings.toLocaleString()}</span>
                  <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isDark ? 'bg-[#1f2833]' : 'bg-slate-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${isDark ? 'bg-[#66fcf1]' : 'bg-indigo-600'}`}
                      style={{ width: `${savingsPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className={`border rounded-xl p-4 transition-all ${
                  isDark ? 'bg-[#1f2833]/40 border-[#1f2833] hover:border-[#66fcf1]/20' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/20'
                }`}>
                  <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'}`}>Goal Progress</span>
                  <span className={`text-xl font-extrabold ${goalProgress >= 100 ? 'text-emerald-600' : (isDark ? 'text-white' : 'text-[#0f172a]')}`}>
                    {Math.round(goalProgress)}%
                  </span>
                  <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isDark ? 'bg-[#1f2833]' : 'bg-slate-200'}`}>
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${goalProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className={`py-20 relative z-10 border-y ${
        isDark ? 'bg-[#1f2833]/20 border-[#1f2833]/40' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Engineered For Financial Freedom</h2>
            <p className={`${isDark ? 'text-[#c5c6c7]/75' : 'text-slate-600'}`}>
              Everything you need to optimize your savings, track expenses, and view trends in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className={`border rounded-2xl p-8 transition-all duration-300 group ${
              isDark ? 'bg-[#0b0c10]/60 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PieIcon className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Beautiful Analytics</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                See exactly where your money goes with color-coded categories, percentage breakdowns, and comprehensive trend logs.
              </p>
            </div>

            <div className={`border rounded-2xl p-8 transition-all duration-300 group ${
              isDark ? 'bg-[#0b0c10]/60 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Secure & Private</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Your data is safe with us. We use enterprise-grade encryption to protect your records and financial plans.
              </p>
            </div>

            <div className={`border rounded-2xl p-8 transition-all duration-300 group ${
              isDark ? 'bg-[#0b0c10]/60 border-[#1f2833] hover:border-[#66fcf1]/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-white shadow-sm'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers2 className={`w-6 h-6 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>PWA Enabled</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                Install as a standalone application on mobile or desktop. Run offline, load instantly, and check dashboard data instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
        <div className={`p-12 rounded-3xl border ${
          isDark ? 'bg-gradient-to-tr from-[#1f2833] via-[#0b0c10] to-[#66fcf1]/10 border-[#66fcf1]/20' : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <h2 className={`text-3xl sm:text-4xl font-extrabold mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Take Control of Your Wealth Today
          </h2>
          <p className={`max-w-xl mx-auto mb-8 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
            Join thousands of users who track, visualize, and optimize their budgets with NexusWealth. Completely free to start.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className={`px-8 py-4 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] shadow-[#66fcf1]/20' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
            }`}
          >
            Create Your Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t bg-[#0b0c10] py-12 relative z-10 ${isDark ? 'border-[#1f2833]/40' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#0b0c10]" />
            </div>
            <span className="font-bold text-white text-sm">NexusWealth</span>
          </div>

          <div className="flex gap-8 text-sm text-[#c5c6c7]/80">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>

          <p className="text-xs text-[#c5c6c7]/40">
            &copy; {new Date().getFullYear()} NexusWealth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
