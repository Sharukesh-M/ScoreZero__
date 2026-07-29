import { useState, useEffect, useRef } from 'react';
import { ReactLenis } from 'lenis/react';

import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ScrollHero } from './components/ScrollHero';
import { ScoreEngineContainerScroll } from './components/ScoreEngineContainerScroll';
import ScoreZeroDashboard from './components/dashboard/ScoreZeroDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

// ScoreZero AI Engine Site Components
import OverlayMenu from './components/OverlayMenu';
import ScoreZeroModules from './components/ScoreZeroModules';
import EngineArchitecture from './components/EngineArchitecture';
import ContactSection from './components/ContactSection';
import AboutFooter from './components/AboutFooter';

import { motion, useScroll, useTransform } from 'framer-motion';

function AppContent() {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [inPortfolio, setInPortfolio] = useState(false);
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>(() => {
    return localStorage.getItem('scorezero_token') ? 'dashboard' : 'landing';
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Automatically navigate to dashboard when user logs in or is authenticated
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
    }
  }, [user]);

  const handleOpenLogin = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const handleOpenSignup = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const handleOpenDashboard = () => {
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    setCurrentView('landing');
  };

  useEffect(() => {
    if (currentView === 'dashboard') return;

    const handleScroll = () => {
      const threshold = window.innerHeight * 2.2;
      setInPortfolio(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  const footerContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: footerScrollProgress } = useScroll({
    target: footerContainerRef,
    offset: ['start end', 'end end'],
  });
  const footerY = useTransform(footerScrollProgress, [0, 1], ['-50%', '0%']);

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        smoothWheel: true,
        duration: 1.4,
        wheelMultiplier: 0.8,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        syncTouch: true,
        syncTouchLerp: 0.12,
        touchMultiplier: 1.0,
        touchInertiaExponent: 1.55,
      }}
    >
      <div className="min-h-screen bg-[#08101C] text-white transition-colors duration-500 selection:bg-[#00D2FF] selection:text-slate-900">
        {/* ── ScoreZero Navbar (Landing Page Only) ── */}
        {currentView === 'landing' && (
          <div
            className="transition-opacity duration-500"
            style={{
              opacity: inPortfolio ? 0 : 1,
              pointerEvents: inPortfolio ? 'none' : 'auto',
            }}
          >
            <Navbar
              onOpenLogin={handleOpenLogin}
              onOpenSignup={handleOpenSignup}
              currentUser={user}
              onLogout={handleLogout}
              onOpenDashboard={handleOpenDashboard}
              currentView={currentView}
              onSwitchView={(v: 'landing' | 'dashboard') => setCurrentView(v)}
            />
          </div>
        )}

        {/* ── ScoreZero Overlay Navigation ── */}
        <div
          className="transition-opacity duration-500"
          style={{
            opacity: inPortfolio && currentView === 'landing' ? 1 : 0,
            pointerEvents: inPortfolio && currentView === 'landing' ? 'auto' : 'none',
          }}
        >
          <OverlayMenu />
        </div>

        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' ? (
          <>
            {/* TOP HERO */}
            <ScrollHero onOpenSignup={handleOpenSignup} onOpenLogin={handleOpenLogin} />

            {/* 3D PERSPECTIVE CONTAINER SCROLL */}
            <ScoreEngineContainerScroll onOpenSignup={handleOpenSignup} onOpenLogin={handleOpenLogin} />

            {/* SECTION 2: SCOREZERO PLATFORM OVERVIEW & MODULES */}
            <div id="platform-overview" className="relative bg-black selection:bg-white selection:text-black">
              <div className="w-full h-[4px] bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent shadow-[0_0_25px_#00D2FF]" />

              <div className="relative z-20 w-full">
                <div id="work" className="bg-black text-white relative z-20">
                  <ScoreZeroModules />
                </div>

                <div id="philosophy" className="bg-white text-black relative z-20">
                  <EngineArchitecture />
                </div>

                <div id="contact" className="relative z-20 bg-white text-black">
                  <ContactSection />
                </div>
              </div>

              <div ref={footerContainerRef} className="relative z-0 h-screen w-full overflow-hidden bg-black text-white">
                <motion.div style={{ y: footerY }} className="h-full w-full">
                  <AboutFooter />
                </motion.div>
              </div>
            </div>
          </>
        ) : (
          /* VIEW 2: SCOREZERO NEUMORPHISM DASHBOARD — Node.js backend port 4000 */
          <div>
            <ScoreZeroDashboard onBackToLanding={() => setCurrentView('landing')} />
          </div>
        )}

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authMode}
          onLoginSuccess={() => {
            handleOpenDashboard();
          }}
        />
      </div>
    </ReactLenis>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
