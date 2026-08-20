import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  TrendingUp, 
  HelpCircle,
  Sliders,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Share2,
  Camera,
  Download,
  Globe
} from 'lucide-react';

export default function HowItWorks() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "1. Multi-Currency Logging & Keypad",
      description: "Log daily expenses instantly. Configure your main base currency and set preferred keypad currencies for dynamic conversion.",
      icon: Globe,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Use the dynamic custom keypad for ultra-fast, single-tap value entry.",
        "Quickly switch between Keypad Currencies to record international or multi-currency expenses.",
        "Change your Base Currency anytime—all dashboard metrics and balances update automatically."
      ]
    },
    {
      title: "2. AI Smart Receipt Scanner & Camera Capture",
      description: "Scan paper receipts with your device camera or upload image files to extract transaction details automatically.",
      icon: Camera,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Point your smartphone camera directly at paper receipts or upload saved receipt images.",
        "High-precision OCR extracts the merchant name, date, total amount, and matching category.",
        "Review parsed details in the review modal and approve transactions in a single tap."
      ]
    },
    {
      title: "3. Categories, Rollover Budgets & Salary Cycles",
      description: "Match tracking to your actual lifestyle. Configure limits, custom salary start dates, and month-to-month budget rollovers.",
      icon: Sliders,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Create custom categories and subcategories with custom icons and budget caps.",
        "Enable 'Carry-Over' settings to roll remaining budget surplus or debt to the next month.",
        "Customize your Monthly Start Date (e.g., matching salary day on the 25th instead of 1st)."
      ]
    },
    {
      title: "4. Chat with WealthBuddy AI Advisor",
      description: "Consult your virtual financial companion to parse your spending logs, identify trends, and receive instant recommendations.",
      icon: Sparkles,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Ask WealthBuddy for weekly summaries, highest expense breakdowns, or budget optimization tips.",
        "Powered by Google Gemini API with privacy-first log contextualization.",
        "One-tap prompt suggestion chips help you get financial guidance instantly."
      ]
    },
    {
      title: "5. Shared Read-Only Dashboards",
      description: "Generate tokenized shareable links to show live read-only financial summaries to spouses, partners, or advisors.",
      icon: Share2,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Create high-performance read-only links from your dashboard settings.",
        "Shared users view net worth, assets, and cash flows without write or edit permissions.",
        "Easily revoke or refresh sharing link tokens at any time for total privacy control."
      ]
    },
    {
      title: "6. Device Data Backup (.mmbak) & Clean Export",
      description: "Full offline data portability with `.mmbak` backup files and emoji-free CSV/JSON spreadsheet exports.",
      icon: Download,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Download complete offline database snapshots in `.mmbak` format for backup or migration.",
        "Export transaction records to CSV or JSON with a toggle to strip all emojis for clean spreadsheet processing.",
        "Restore backups onto new devices anytime with zero data loss."
      ]
    },
    {
      title: "7. PWA Installation & Offline Support",
      description: "Install NexusWealth as a standalone app on your mobile device or computer for instant offline logging.",
      icon: Smartphone,
      color: "from-indigo-500 to-teal-500",
      details: [
        "Add the app to your home screen or desktop directly using your browser's install prompt.",
        "Open it anytime directly from your app drawer—no browser address bar.",
        "Full offline caching ensures your data is saved locally and synced automatically when connected."
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

      {/* Intro Header Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border ${
          isDark ? 'bg-[#1f2833]/60 border-[#66fcf1]/20 text-[#66fcf1]' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
        }`}>
          <HelpCircle className="w-4 h-4" /> Feature & Workflow Guide
        </div>
        <h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
          Understanding <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#66fcf1] via-indigo-400 to-[#45a29e]">NexusWealth</span> Features
        </h1>
        <p className={`text-lg max-w-3xl mx-auto leading-relaxed ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
          Take control of your cashflow without friction. Explore our simple 7-step guide below to see how our tools simplify expense tracking and wealth building.
        </p>
      </section>

      {/* Interactive Feature Steps Tabber */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Tab Selectors */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? isDark 
                        ? 'bg-[#1f2833]/60 border-[#66fcf1]/50 shadow-md shadow-[#66fcf1]/5' 
                        : 'bg-white border-indigo-500 shadow-md shadow-indigo-100'
                      : isDark
                        ? 'bg-[#1f2833]/20 border-[#1f2833] hover:bg-[#1f2833]/40'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex gap-3.5 items-center">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${step.color} flex items-center justify-center text-white shrink-0 font-bold text-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className={`font-bold text-xs sm:text-sm truncate ${
                        isActive 
                          ? isDark ? 'text-[#66fcf1]' : 'text-indigo-600'
                          : isDark ? 'text-white' : 'text-slate-800'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'}`}>
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
            <div className={`p-8 rounded-3xl border transition-all duration-300 min-h-[420px] flex flex-col justify-between ${
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
                <button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                  className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-opacity ${
                    activeStep === 0 ? 'opacity-30 cursor-not-allowed' : (isDark ? 'text-white hover:text-[#66fcf1]' : 'text-slate-700 hover:text-indigo-600')
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <span className="text-xs font-semibold opacity-60">
                  Step {activeStep + 1} of {steps.length}
                </span>

                <button
                  onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                  className={`text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer ${
                    isDark ? 'text-[#66fcf1]' : 'text-indigo-600'
                  }`}
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Comprehensive Workflow FAQs */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <h2 className={`text-2xl sm:text-3xl font-extrabold text-center mb-10 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
          Workflow & Security FAQ
        </h2>
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Does the Receipt Scanner require app camera permissions?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              You can grant live camera permissions to scan paper receipts instantly from your phone browser, or simply choose to upload saved image files from your device gallery.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Can I track multiple financial accounts like Credit Cards and Cash?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              Yes! Navigate to 'Accounts Setting' inside configuration. You can add cash wallets, bank accounts, and credit cards, and filter all dashboard reports by specific accounts.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              How does WealthBuddy AI handle my private financial logs?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              WealthBuddy parses spending totals contextually to provide optimization advice. Your full transaction details remain encrypted, and your financial data is never sold or used to train third-party AI models.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#1f2833]/20 border-[#1f2833]' : 'bg-white border-slate-200'}`}>
            <h4 className={`font-bold text-sm sm:text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              How do I export data cleanly for Excel or Google Sheets?
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-600'}`}>
              In settings, open Data Export, and toggle "Strip Emojis". This removes all icons and emojis from category names and notes, giving you a clean CSV or JSON file ready for pivot tables and formulas.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center relative z-10">
        <div className={`p-10 rounded-3xl border ${
          isDark 
            ? 'bg-gradient-to-tr from-[#1f2833]/60 via-[#0b0c10] to-[#66fcf1]/5 border-[#66fcf1]/10' 
            : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <h2 className={`text-2xl sm:text-3xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Ready to Try These Features?
          </h2>
          <p className={`text-sm max-w-md mx-auto mb-8 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
            Set up your budget in less than 2 minutes and experience effortless expense management.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/register')}
              className={`px-6 py-3 font-semibold rounded-xl shadow-lg transition-all cursor-pointer ${
                isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e]' : 'text-white bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              Sign Up Free
            </button>
            <button 
              onClick={() => navigate('/login')}
              className={`px-6 py-3 font-semibold rounded-xl transition-all cursor-pointer border ${
                isDark 
                  ? 'text-white border-[#1f2833] hover:border-[#66fcf1]/30 hover:bg-[#1f2833]/30' 
                  : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              Access Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-8 relative z-10 ${
        isDark ? 'border-[#1f2833]/40 bg-[#0b0c10]' : 'border-slate-200 bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#0b0c10]" />
            </div>
            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>NexusWealth</span>
          </div>
          <div className={`flex gap-6 text-xs ${
            isDark ? 'text-[#c5c6c7]/60' : 'text-slate-500'
          }`}>
            <Link to="/" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Home</Link>
            <Link to="/about" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>About Us</Link>
            <Link to="/how-it-works" className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-indigo-600'}`}>How It Works</Link>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-[#c5c6c7]/40' : 'text-slate-400'}`}>
            &copy; {new Date().getFullYear()} NexusWealth. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
