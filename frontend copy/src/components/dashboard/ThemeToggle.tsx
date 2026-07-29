import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('scorezero_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('scorezero_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        background: 'var(--bg-primary, #F0F4F8)',
        border: 'none',
        borderRadius: '999px',
        padding: '4px',
        width: '56px',
        height: '30px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        boxShadow: theme === 'dark'
          ? 'inset -3px -3px 6px rgba(255,255,255,0.05), inset 3px 3px 6px rgba(0,0,0,0.6)'
          : 'inset -3px -3px 6px rgba(255,255,255,0.85), inset 3px 3px 6px rgba(163,177,198,0.4)',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      <span
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: theme === 'dark' ? 'linear-gradient(135deg, #6FA8F5, #4A90E2)' : '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: theme === 'dark' ? 'translateX(26px)' : 'translateX(2px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s',
          boxShadow: theme === 'dark'
            ? '0 2px 6px rgba(0,0,0,0.4)'
            : '-2px -2px 5px rgba(255,255,255,0.9), 2px 2px 5px rgba(163,177,198,0.4)',
        }}
      >
        {theme === 'dark' ? (
          <Moon size={12} color="#FFFFFF" />
        ) : (
          <Sun size={12} color="#f59e0b" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
