import React, { useState, useRef, useEffect } from 'react';
import { Settings, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileMenuProps {
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
  onSignOut?: () => void;
  onBackToLanding?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onOpenSettings, onOpenPrivacy, onSignOut, onBackToLanding }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || 'User';
  const userEmail = user?.email || 'user@scorezero.ai';
  const avatarUrl = (user as any)?.avatar_url || (user as any)?.picture || null;
  const userInitials = userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'SZ';

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User account menu"
        style={{
          background: 'var(--bg-primary, #F0F4F8)',
          border: 'none',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-raised, -4px -4px 10px rgba(255,255,255,0.85), 4px 4px 10px rgba(163,177,198,0.4))',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {userInitials}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <div
        role="menu"
        style={{
          position: 'absolute',
          top: '50px',
          right: 0,
          minWidth: '250px',
          background: 'var(--bg-primary, #F0F4F8)',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: 'var(--shadow-card, -8px -8px 24px rgba(255,255,255,0.85), 8px 8px 24px rgba(163,177,198,0.45))',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* User Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle, rgba(163,177,198,0.3))' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #4A90E2, #357ABD)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {userInitials}
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {userName}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary, #7A8FA3)', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {userEmail}
            </p>
          </div>
        </div>

        {/* Menu Actions */}
        <button
          onClick={() => { setIsOpen(false); onOpenSettings?.(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '12px', border: 'none',
            background: 'transparent', color: 'var(--text-primary, #2C3E50)',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary, rgba(74,144,226,0.1))')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Settings size={15} color="#4A90E2" /> Account Settings
        </button>

        <button
          onClick={() => { setIsOpen(false); onOpenPrivacy?.(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '12px', border: 'none',
            background: 'transparent', color: 'var(--text-primary, #2C3E50)',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary, rgba(74,144,226,0.1))')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Shield size={15} color="#4A90E2" /> Privacy & Data
        </button>

        <button
          onClick={() => {
            setIsOpen(false);
            logout();
            onOpenSettings && onOpenSettings(); // safety check
            if (onSignOut) onSignOut();
            if (onBackToLanding) onBackToLanding();
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '12px', border: 'none',
            background: 'transparent', color: '#ef4444',
            fontSize: '13.3px', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} color="#ef4444" /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfileMenu;
