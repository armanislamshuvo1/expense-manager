import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] font-sans overflow-x-hidden selection:bg-[#66fcf1] selection:text-[#0b0c10]">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#1f2833] opacity-20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#66fcf1] opacity-5 blur-[150px] animate-pulse [animation-duration:9s]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-[#1f2833]/40 bg-[#0b0c10]/70 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center shadow-lg shadow-[#66fcf1]/20 group-hover:rotate-12 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-[#0b0c10]" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white bg-clip-text bg-gradient-to-r from-white via-[#c5c6c7] to-[#66fcf1] group-hover:text-[#66fcf1] transition-colors">
              NexusWealth
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <Link to="/" className="hover:text-[#66fcf1] transition-colors">Home</Link>
            <Link to="/about" className="text-[#66fcf1] hover:text-[#66fcf1]/80 transition-colors">About Us</Link>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="px-5 py-2 text-sm font-semibold text-[#66fcf1] border border-[#66fcf1]/30 hover:border-[#66fcf1] rounded-full hover:bg-[#66fcf1]/5 transition-all duration-300 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="hidden sm:inline-flex px-5 py-2 text-sm font-semibold text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] rounded-full shadow-lg shadow-[#66fcf1]/20 hover:shadow-[#45a29e]/30 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* About Main Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1f2833]/60 border border-[#66fcf1]/20 text-[#66fcf1] text-xs font-semibold mb-6">
          <BookOpen className="w-4 h-4" /> Our Story
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
          Empowering Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#66fcf1] to-[#45a29e]">Financial Journey</span>
        </h1>
        <p className="text-lg text-[#c5c6c7]/80 leading-relaxed mb-12">
          NexusWealth was built on a simple premise: managing personal finances shouldn't be complicated, intimidating, or dull. We combine elegant user experience design with robust tracking tools to help you build stable saving habits and achieve long-term wealth.
        </p>

        {/* Pillars / Values */}
        <div className="grid sm:grid-cols-3 gap-6 text-left mb-16">
          <div className="bg-[#1f2833]/30 border border-[#1f2833]/60 rounded-2xl p-6 hover:border-[#66fcf1]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#66fcf1]/10 flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-[#66fcf1]" />
            </div>
            <h3 className="text-white font-bold mb-2">Our Mission</h3>
            <p className="text-xs text-[#c5c6c7]/70 leading-relaxed">
              To provide clarity and insights into everyday cashflows, turning raw transactional data into meaningful budget strategies.
            </p>
          </div>

          <div className="bg-[#1f2833]/30 border border-[#1f2833]/60 rounded-2xl p-6 hover:border-[#66fcf1]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#66fcf1]/10 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-[#66fcf1]" />
            </div>
            <h3 className="text-white font-bold mb-2">User First</h3>
            <p className="text-xs text-[#c5c6c7]/70 leading-relaxed">
              Designed with a responsive layouts, absolute privacy, and interactive flows tailored for both casual spenders and savvy budgeters.
            </p>
          </div>

          <div className="bg-[#1f2833]/30 border border-[#1f2833]/60 rounded-2xl p-6 hover:border-[#66fcf1]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#66fcf1]/10 flex items-center justify-center mb-4">
              <Award className="w-5 h-5 text-[#66fcf1]" />
            </div>
            <h3 className="text-white font-bold mb-2">Excellence</h3>
            <p className="text-xs text-[#c5c6c7]/70 leading-relaxed">
              Providing lightweight Progressive Web Application access so your wealth dashboard stays accessible anywhere, anytime.
            </p>
          </div>
        </div>

        {/* Feature Checkmarks list */}
        <div className="bg-[#1f2833]/10 border border-[#1f2833]/40 rounded-3xl p-8 max-w-2xl mx-auto text-left">
          <h3 className="text-lg font-bold text-white mb-6 text-center sm:text-left">Key Highlights of NexusWealth</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#66fcf1] shrink-0" />
              <span className="text-sm">Real-time Income/Expense logging</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#66fcf1] shrink-0" />
              <span className="text-sm">Dynamic dashboard projections</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#66fcf1] shrink-0" />
              <span className="text-sm">Fully responsive mobile layouts</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#66fcf1] shrink-0" />
              <span className="text-sm">Categorized transaction reports</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#66fcf1] shrink-0" />
              <span className="text-sm">Offline capability via local PWA</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#66fcf1] shrink-0" />
              <span className="text-sm">Multiple accounts support</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center relative z-10">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-[#1f2833]/60 via-[#0b0c10] to-[#66fcf1]/5 border border-[#66fcf1]/10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            Ready to Begin?
          </h2>
          <p className="text-[#c5c6c7]/80 text-sm max-w-md mx-auto mb-8">
            Create an account or login to explore your own customized wealth simulator and tracking metrics.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-3 font-semibold text-[#0b0c10] bg-[#66fcf1] hover:bg-[#45a29e] rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Sign Up Now
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-3 font-semibold text-white border border-[#1f2833] hover:border-[#66fcf1]/30 rounded-xl hover:bg-[#1f2833]/30 transition-all cursor-pointer"
            >
              Access Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f2833]/40 bg-[#0b0c10] py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#66fcf1] to-[#45a29e] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#0b0c10]" />
            </div>
            <span className="font-bold text-white text-xs">NexusWealth</span>
          </div>
          <p className="text-[10px] text-[#c5c6c7]/40">
            &copy; {new Date().getFullYear()} NexusWealth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
