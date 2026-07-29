import React from 'react';
import { LayoutDashboard, ShieldCheck, BarChart2, Clock, MessageSquarePlus, Sparkles, Upload } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';

export type NavTab = 'dashboard' | 'loan-readiness' | 'analytics' | 'history' | 'chat-new';

interface TopNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
  onBackToLanding?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenPrivacy,
  onBackToLanding,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'loan-readiness', label: 'Loan Guidance', icon: <ShieldCheck size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
    { id: 'history', label: 'History', icon: <Clock size={15} /> },
    { id: 'chat-new', label: 'AI Advisory', icon: <MessageSquarePlus size={15} /> },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 32px',
        background: 'var(--bg-primary, #F0F4F8)',
        boxShadow: '0 4px 20px rgba(163,177,198,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Brand Logo & New Upload button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            }}
          >
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #2C3E50)', letterSpacing: '-0.3px' }}>
            ScoreZero
          </span>
        </button>

        <button
          onClick={() => onTabChange('dashboard')}
          title="Upload new statement PDF"
          style={{
            display: 'flex',
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
          }}
        >
          <Upload size={14} color="#FFFFFF" />
          <span>New Upload</span>
        </button>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
                  ? 'inset -2px -2px 6px rgba(255,255,255,0.8), inset 2px 2px 6px rgba(163,177,198,0.45)'
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

      {/* Right Tools (Theme + Profile) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <ThemeToggle />
        <ProfileMenu onOpenSettings={onOpenSettings} onOpenPrivacy={onOpenPrivacy} onBackToLanding={onBackToLanding} />
      </div>
    </nav>
  );
};

export default TopNavBar;
