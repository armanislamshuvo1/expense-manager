import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  TrendingUp, 
  Target, 
  Users, 
  ArrowRight, 
  BookOpen, 
  CheckCircle,
  Award
} from 'lucide-react';

export default function About() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] animate-pulse ${
          isDark ? 'bg-[#1f2833]' : 'bg-indigo-200/50'
        }`}></div>
        <div className={`absolute bottom-[10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-5 blur-[150px] animate-pulse [animation-duration:9s] ${
          isDark ? 'bg-[#66fcf1]' : 'bg-teal-200/30'
        }`}></div>
      </div>

      {/* About Main Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6 ${
          isDark ? 'bg-[#1f2833]/60 border-[#66fcf1]/20 text-[#66fcf1]' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <BookOpen className="w-4 h-4" /> Our Story
        </div>
        <h1 className={`text-4xl sm:text-5xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
          Empowering Your <span className={`text-transparent bg-clip-text bg-gradient-to-r ${
            isDark ? 'from-[#66fcf1] to-[#45a29e]' : 'from-indigo-600 to-teal-600'
          }`}>Financial Journey</span>
        </h1>
        <p className={`text-lg leading-relaxed mb-12 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
          NexusWealth was built on a simple premise: managing personal finances shouldn't be complicated, intimidating, or dull. We combine elegant user experience design with robust tracking tools to help you build stable saving habits and achieve long-term wealth.
        </p>

        {/* Pillars / Values */}
        <div className="grid sm:grid-cols-3 gap-6 text-left mb-16">
          <div className={`border rounded-2xl p-6 transition-colors ${
            isDark ? 'bg-[#1f2833]/30 border-[#1f2833]/60 hover:border-[#66fcf1]/30' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-[#66fcf1]/10' : 'bg-indigo-50'}`}>
              <Target className={`w-5 h-5 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
            </div>
            <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Our Mission</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-500'}`}>
              To provide clarity and insights into everyday cashflows, turning raw transactional data into meaningful budget strategies.
            </p>
          </div>

          <div className={`border rounded-2xl p-6 transition-colors ${
            isDark ? 'bg-[#1f2833]/30 border-[#1f2833]/60 hover:border-[#66fcf1]/30' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-[#66fcf1]/10' : 'bg-indigo-50'}`}>
              <Users className={`w-5 h-5 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
            </div>
            <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>User First</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-500'}`}>
              Designed with a responsive layouts, absolute privacy, and interactive flows tailored for both casual spenders and savvy budgeters.
            </p>
          </div>

          <div className={`border rounded-2xl p-6 transition-colors ${
            isDark ? 'bg-[#1f2833]/30 border-[#1f2833]/60 hover:border-[#66fcf1]/30' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-[#66fcf1]/10' : 'bg-indigo-50'}`}>
              <Award className={`w-5 h-5 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-600'}`} />
            </div>
            <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Excellence</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#c5c6c7]/70' : 'text-slate-500'}`}>
              Providing lightweight Progressive Web Application access so your wealth dashboard stays accessible anywhere, anytime.
            </p>
          </div>
        </div>

        {/* Feature Checkmarks list */}
        <div className={`border rounded-3xl p-8 max-w-2xl mx-auto text-left ${
          isDark ? 'bg-[#1f2833]/10 border-[#1f2833]/40' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <h3 className={`text-lg font-bold mb-6 text-center sm:text-left ${isDark ? 'text-white' : 'text-slate-800'}`}>Key Highlights of NexusWealth</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Real-time Income/Expense logging</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Dynamic dashboard projections</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>WealthBuddy AI financial advice</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Secure shared dashboard tokens</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Fully responsive mobile layouts</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Categorized transaction reports</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Offline capability via local PWA</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 shrink-0 ${isDark ? 'text-[#66fcf1]' : 'text-indigo-500'}`} />
              <span className={`text-sm ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>Multiple accounts support</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center relative z-10">
        <div className={`p-8 sm:p-12 rounded-3xl border ${
          isDark 
            ? 'bg-gradient-to-tr from-[#1f2833]/60 via-[#0b0c10] to-[#66fcf1]/5 border-[#66fcf1]/10' 
            : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <h2 className={`text-2xl sm:text-3xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Ready to Begin?
          </h2>
          <p className={`text-sm max-w-md mx-auto mb-8 ${isDark ? 'text-[#c5c6c7]/80' : 'text-slate-600'}`}>
            Create an account or login to explore your own customized wealth simulator and tracking metrics.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/register')}
              className={`px-6 py-3 font-semibold rounded-xl shadow-lg transition-all cursor-pointer ${
                isDark ? 'text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e]' : 'text-white bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              Sign Up Now
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
