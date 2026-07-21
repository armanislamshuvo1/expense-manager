import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  TrendingUp, 
  Sun, 
  Moon, 
  ArrowRight,
  HelpCircle,
  Keyboard,
  Sliders,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Sparkles,
  Share2
} from 'lucide-react';

export default function HowItWorks() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "1. Quick Logging & Currency Preferences",
      description: "Log your daily transactions instantly. Configure your main base currency and set preferred currencies for quick entry.",
      icon: Keyboard,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Use the dynamic custom keypad for ultra-fast value input.",
        "Set multiple Keypad Currencies for instant conversions when writing expenses.",
        "Change your Base Currency anytime to update all dashboard stats automatically."
      ]
    },
    {
      title: "2. Personalize Categories & Rollover Budgets",
      description: "Match tracking to your actual lifestyle. Configure limits, salary dates, and month-to-month rollovers.",
      icon: Sliders,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Create custom categories and subcategories under Settings for granular tracking.",
        "Enable 'Carry-over' settings to carry remaining positive budget or debt to the next month.",
        "Customize your Monthly Start Date (e.g., matching salary day on the 25th instead of 1st)."
      ]
    },
    {
      title: "3. Chat with WealthBuddy AI Advisor",
      description: "Consult your virtual financial advisor to parse your spending logs, identify trends, and receive instant recommendations.",
      icon: Sparkles,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Ask WealthBuddy details about weekly summaries, highest expenses, or optimization tips.",
        "Securely powered by the Gemini API, contextualizing your logs safely.",
        "Quick selection suggestion chips help you get financial guidance instantly."
      ]
    },
    {
      title: "4. Share Secure Read-Only Dashboards",
      description: "Generate tokenized shareable links to show live read-only financial summaries to spouses, partners, or advisors.",
      icon: Share2,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Create high-performance read-only links from your wealth dashboard settings.",
        "Shared users can view assets, net worth charts, and cash flow pacing without write access.",
        "Easily revoke or refresh sharing link tokens at any time for total privacy control."
      ]
    },
    {
      title: "5. PWA Installation & Offline Support",
      description: "Install NexusWealth as a standalone application on your mobile device or computer for instant offline logging.",
      icon: Smartphone,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Simply add the page to your device's home screen using your browser's install prompt.",
        "Open it anytime directly from your home screen—no browser address bar.",
        "Full offline caching ensures your transactional data is stored safely locally even when disconnected."
      ]
    }
  ];

  return (
    <>
      
      {/* Background Animated Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] animate-pulse ${
          isDark ? 'bg-[#1f2833]' : 'bg-indigo-200/40'
        }`}></div>
        <div className={`absolute bottom-[10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-5 blur-[150px] animate-pulse [animation-duration:9s] ${
          isDark ? 'bg-[#66fcf1]' : 'bg-teal-200/20'
        }`}></div>
      </div>

      {/* Main Feature Intro Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border ${
          isDark ? 'bg-[#1f2833]/60 border-[#66fcf1]/20 text-[#66fcf1]' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
        }`}>
          <HelpCircle className="w-4 h-4" /> Quick User Guide
        </div>
        <h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
          Understanding <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#66fcf1] via-indigo-400 to-[#45a29e]">NexusWealth</span> Features
        </h1>
        <p className={`text-lg max-w-3xl mx-auto leading-relaxed ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
          Take control of your cashflow without friction. Explore our simple interactive workflow below to see how our settings help align your saving habits.
        </p>
      </section>

      {/* Interactive Feature Steps Tabber */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Tab Selectors */}
          <div className="lg:col-span-5 space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? isDark 
                        ? 'bg-[#1f2833]/60 border-[#66fcf1]/50 shadow-md shadow-[#66fcf1]/5' 
                        : 'bg-white border-indigo-500 shadow-md shadow-indigo-100'
                      : isDark
                        ? 'bg-[#1f2833]/20 border-[#1f2833] hover:bg-[#1f2833]/40'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex gap-4 items-center">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${step.color} flex items-center justify-center text-white shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm sm:text-base ${
                        isActive 
                          ? isDark ? 'text-[#66fcf1]' : 'text-indigo-600'
                          : isDark ? 'text-white' : 'text-slate-800'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-xs mt-1 line-clamp-1 ${isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Detailed Card */}
          <div className="lg:col-span-7">
            <div className={`p-8 rounded-3xl border transition-all duration-300 min-h-[380px] flex flex-col justify-between ${
              isDark ? 'bg-gradient-to-tr from-[#1f2833]/40 to-[#0b0c10] border-[#1f2833]' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${steps[activeStep].color} flex items-center justify-center text-white`}>
                    {React.createElement(steps[activeStep].icon, { className: "w-6 h-6" })}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Step Detail</span>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {steps[activeStep].title}
                    </h2>
                  </div>
                </div>

                <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
                  {steps[activeStep].description}
                </p>

                <div className="space-y-3.5">
                  {steps[activeStep].details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
                      <span className={`text-xs sm:text-sm ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
                        {detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#1f2833]/40 flex justify-between items-center">
                <span className="text-xs opacity-50">
                  Step {activeStep + 1} of {steps.length}
                </span>
                <button
                  onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                  className={`text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer ${
                    isDark ? 'text-[#66fcf1]' : 'text-indigo-600'
                  }`}
                >
                  Next Guide Step <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <h2 className={`text-2xl sm:text-3xl font-extrabold text-center mb-10 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Can I track multiple accounts like Credit Cards and Cash?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              Yes! Navigate to the 'Accounts' screen or open 'Accounts Setting' inside configuration. You can add cash wallets, banks, and credit card accounts and filter dashboard transactions by them.
            </p>
          </div>
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              How does WealthBuddy AI handle my private financial logs?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              WealthBuddy parses your balances and category totals contextually to provide optimization advice. Your full transaction details remain encrypted, and we never share or train AI models on your personal financial history.
            </p>
          </div>
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              How secure are the Shared Dashboard link tokens?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              Shared links are completely read-only tokenized URLs. Shared users can view your asset trends and cash flow charts but have no write permissions. You can revoke, expire, or refresh these tokens instantly from your dashboard settings.
            </p>
          </div>
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Is my transaction data stored securely?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              Absolutely. We enforce absolute database encryption, user settings constraints, and secure session management. When running as a standalone app, all sensitive information is isolated.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 pb-20 text-center relative z-10">
        <div className={`p-12 rounded-3xl border ${
          isDark ? 'bg-gradient-to-tr from-[#1f2833] via-[#0b0c10] to-[#66fcf1]/10 border-[#66fcf1]/20' : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <h2 className={`text-3xl sm:text-4xl font-extrabold mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Ready to track your wealth?
          </h2>
          <p className={`max-w-xl mx-auto mb-8 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
            Now that you know how the systems work, create your account and start your financial journey.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/register')}
              className={`px-8 py-4 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] shadow-[#66fcf1]/20' : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
              }`}
            >
              Get Started Now
            </button>
            <button 
              onClick={() => navigate('/login')}
              className={`px-8 py-4 font-bold rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                isDark ? 'text-white border-[#1f2833] hover:border-[#66fcf1]/30 hover:bg-[#1f2833]/30' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 relative z-10 ${
        isDark ? 'border-[#1f2833]/40 bg-[#0b0c10]' : 'border-slate-200 bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#0b0c10]" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>NexusWealth</span>
          </div>

          <div className={`flex gap-8 text-sm ${
            isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'
          }`}>
            <Link to="/" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Home</Link>
            <Link to="/about" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>About Us</Link>
            <Link to="/how-it-works" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>How It Works</Link>
            <Link to="/login" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Sign In</Link>
          </div>

          <p className={`text-xs ${isDark ? 'text-[#c5c6c7]/40' : 'text-slate-400'}`}>
            &copy; {new Date().getFullYear()} NexusWealth. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
