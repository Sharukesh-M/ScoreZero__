import { Sparkles, LogIn, LogOut, User as UserIcon, LayoutDashboard, UserPlus } from 'lucide-react';
import { useLenis } from 'lenis/react';
import type { User } from '../api/client';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenSignup?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  onOpenDashboard?: () => void;
  currentView?: 'landing' | 'dashboard';
  onSwitchView?: (view: 'landing' | 'dashboard') => void;
}

export function Navbar({
  onOpenLogin,
  onOpenSignup,
  currentUser,
  onLogout,
  onOpenDashboard,
  currentView: _currentView = 'landing',
  onSwitchView,
}: NavbarProps) {
  const lenis = useLenis();

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (lenis && target) {
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    } else if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08101C]/80 backdrop-blur-md border-b border-slate-800/40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => onSwitchView && onSwitchView('landing')}
          className="flex items-center gap-2 sm:gap-3 group text-left"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00D2FF] to-slate-900 p-[1px]">
            <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-slate-800 transition-colors">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#00D2FF]" />
            </div>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Score<span className="text-[#00D2FF]">Zero</span>
          </span>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a
            href="#work"
            onClick={scrollTo('work')}
            className="hover:text-[#00D2FF] transition-colors cursor-pointer"
          >
            How it Works
          </a>
          <a
            href="#philosophy"
            onClick={scrollTo('philosophy')}
            className="hover:text-[#00D2FF] transition-colors cursor-pointer"
          >
            Scoring Engine
          </a>
          <a
            href="#contact"
            onClick={scrollTo('contact')}
            className="hover:text-[#00D2FF] transition-colors cursor-pointer"
          >
            Contact
          </a>
        </nav>

        {/* Auth Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#081421] bg-[#00D2FF] hover:bg-[#4BE7FF] transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#102235]/90 border border-[#27D9FF]/30 text-xs text-white font-medium shadow-sm">
                <UserIcon className="w-3.5 h-3.5 text-[#27D9FF]" />
                <span className="truncate max-w-[140px] font-semibold">{currentUser.name || currentUser.email}</span>
              </div>

              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-full bg-[#102235]/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Login Button */}
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold text-slate-200 hover:text-[#00D2FF] border border-slate-800 hover:border-[#00D2FF] transition-all flex items-center gap-1 sm:gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>

              {/* Sign Up Button */}
              {onOpenSignup && (
                <button
                  onClick={onOpenSignup}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold text-[#081421] bg-[#00D2FF] hover:bg-[#4BE7FF] transition-all flex items-center gap-1 sm:gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
