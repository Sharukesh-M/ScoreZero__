import React, { useState } from 'react';
import { LayoutDashboard, ShieldCheck, BarChart2, Clock, MessageSquarePlus, Sparkles, Upload, Menu, X, ChevronRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';

export type NavTab = 'dashboard' | 'loan-readiness' | 'analytics' | 'history' | 'chat-new';

interface TopNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onTriggerUpload?: () => void;
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
  onBackToLanding?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  onTabChange,
  onTriggerUpload,
  onOpenSettings,
  onOpenPrivacy,
  onBackToLanding,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} />, desc: 'Main credit score & analysis' },
    { id: 'loan-readiness', label: 'Loan Guidance', icon: <ShieldCheck size={17} />, desc: 'Lender readiness & rules' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={17} />, desc: 'Cashflow & spend breakdown' },
    { id: 'history', label: 'History', icon: <Clock size={17} />, desc: 'Past statement reports' },
    { id: 'chat-new', label: 'AI Advisory', icon: <MessageSquarePlus size={17} />, desc: 'Interactive statement Q&A' },
  ];

  const handleUploadClick = () => {
    if (onTriggerUpload) {
      onTriggerUpload();
    } else {
      onTabChange('dashboard');
    }
    setMobileDrawerOpen(false);
  };

  const handleNavSelect = (tab: NavTab) => {
    onTabChange(tab);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* ── Main Sticky Top Navigation Bar ────────────────────────────── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg-primary, #F0F4F8)',
          boxShadow: '0 4px 20px rgba(163,177,198,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Left: Hamburger (Mobile) + Brand Logo + Upload Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="mobile-only-flex"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
              style={{
                background: 'var(--bg-primary, #F0F4F8)',
                border: 'none',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-primary, #2C3E50)',
                boxShadow: '-2px -2px 6px rgba(255,255,255,0.8), 2px 2px 6px rgba(163,177,198,0.4)',
              }}
            >
              <Menu size={22} />
            </button>

            {/* Brand Logo */}
            <button
              onClick={() => onTabChange('dashboard')}
              title="ScoreZero Dashboard"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '-3px -3px 8px rgba(255,255,255,0.8), 3px 3px 8px rgba(163,177,198,0.5)',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={20} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #2C3E50)', letterSpacing: '-0.4px' }}>
                ScoreZero
              </span>
            </button>

            {/* New Upload Button (Desktop Header) */}
            <button
              onClick={handleUploadClick}
              className="desktop-only-flex"
              title="Upload new statement PDF"
              style={{
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(74, 144, 226, 0.35)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Upload size={14} color="#FFFFFF" />
              <span>New Upload</span>
            </button>
          </div>

          {/* Center: Desktop Navigation Bar (In-Center) */}
          <div
            className="desktop-nav-center"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              flex: 1,
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#4A90E2' : 'var(--text-secondary, #7A8FA3)',
                    background: 'var(--bg-primary, #F0F4F8)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive
                      ? 'inset -2px -2px 6px rgba(255,255,255,0.85), inset 2px 2px 6px rgba(163,177,198,0.45)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.boxShadow = '-3px -3px 8px rgba(255,255,255,0.7), 3px 3px 8px rgba(163,177,198,0.3)';
                      e.currentTarget.style.color = '#4A90E2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.color = 'var(--text-secondary, #7A8FA3)';
                    }
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Tools (Theme + Profile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <ThemeToggle />
            <ProfileMenu onOpenSettings={onOpenSettings} onOpenPrivacy={onOpenPrivacy} onBackToLanding={onBackToLanding} />
          </div>
        </div>
      </nav>

      {/* ── Mobile Side Navigation Drawer Overlay ───────────────────────── */}
      {mobileDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
          }}
        >
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          />

          {/* Slide-out Sidebar Content Container */}
          <div
            style={{
              position: 'relative',
              width: '300px',
              maxWidth: '85vw',
              height: '100%',
              background: 'var(--bg-primary, #F0F4F8)',
              boxShadow: '10px 0 40px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10000,
              padding: '24px 20px',
              animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Drawer Top Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(163,177,198,0.25)',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(74,144,226,0.3)',
                  }}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>
                    ScoreZero
                  </h3>
                  <span style={{ fontSize: '11px', color: '#4A90E2', fontWeight: 600 }}>
                    Mobile Navigation
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMobileDrawerOpen(false)}
                title="Close Side Navigation"
                aria-label="Close Side Navigation"
                style={{
                  background: 'none',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #7A8FA3)',
                  boxShadow: 'inset -2px -2px 5px rgba(255,255,255,0.8), inset 2px 2px 5px rgba(163,177,198,0.3)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Upload Action CTA in Mobile Drawer */}
            <button
              onClick={handleUploadClick}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(74, 144, 226, 0.4)',
                marginBottom: '24px',
              }}
            >
              <Upload size={18} color="#FFFFFF" />
              <span>New Upload</span>
            </button>

            {/* Navigation Drawer Menu Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary, #7A8FA3)', margin: '0 0 4px 6px' }}>
                Main Navigation
              </p>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavSelect(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: isActive ? 'linear-gradient(135deg, rgba(74,144,226,0.12), rgba(53,122,189,0.06))' : 'var(--bg-primary, #F0F4F8)',
                      border: isActive ? '1px solid rgba(74,144,226,0.3)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      boxShadow: isActive
                        ? 'inset -2px -2px 6px rgba(255,255,255,0.8), inset 2px 2px 6px rgba(163,177,198,0.4)'
                        : '-2px -2px 6px rgba(255,255,255,0.6), 2px 2px 6px rgba(163,177,198,0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          background: isActive ? '#4A90E2' : 'rgba(163,177,198,0.2)',
                          color: isActive ? '#FFFFFF' : 'var(--text-secondary, #7A8FA3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: isActive ? 700 : 600, color: isActive ? '#4A90E2' : 'var(--text-primary, #2C3E50)' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #7A8FA3)' }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronRight size={16} color={isActive ? '#4A90E2' : '#94A3B8'} />
                  </button>
                );
              })}
            </div>

            {/* Side Drawer Bottom Footer */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: '1px solid rgba(163,177,198,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #7A8FA3)', fontWeight: 600 }}>
                ScoreZero AI v2.4 • Smart Statement Analysis
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavBar;
