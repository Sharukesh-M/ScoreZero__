import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import './FlowingMenu.css';

interface SkillItem {
  name: string;
  url?: string;
}

interface MenuItemData {
  link: string;
  text: string;
  items: SkillItem[];
}

const FlowingMenu: React.FC<{ items: MenuItemData[], speed?: number, marqueeBgColor?: string }> = ({
  items, speed = 10, marqueeBgColor = "#000"
}) => {
  return (
    <nav className="menu">
      {items.map((item, idx) => (
        <MenuItem key={idx} {...item} speed={speed} marqueeBgColor={marqueeBgColor} isFirst={idx === 0} />
      ))}
    </nav>
  );
};

const MenuItem: React.FC<MenuItemData & { speed: number; marqueeBgColor: string; isFirst: boolean }> = ({
  link, text, items, speed, marqueeBgColor, isFirst
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const [repetitions, setRepetitions] = useState(2);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const calculate = () => {
      if (!marqueeInnerRef.current) return;
      const part = marqueeInnerRef.current.querySelector('.marquee__part') as HTMLElement;
      if (part) {
        setRepetitions(Math.ceil(window.innerWidth / part.offsetWidth) + 2);
      }
    };
    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, [items]);

  useEffect(() => {
    if (!marqueeInnerRef.current) return;
    const part = marqueeInnerRef.current.querySelector('.marquee__part') as HTMLElement;
    if (!part) return;

    const ctx = gsap.context(() => {
      gsap.to(marqueeInnerRef.current, {
        x: -(part.offsetWidth),
        duration: (part.offsetWidth / 200) * speed,
        ease: 'none',
        repeat: -1
      });
    }, marqueeInnerRef);

    return () => ctx.revert();
  }, [items, repetitions, speed]);

  const handleTextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const handleMarqueeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
  };

  return (
    <div
      className={`menu__item ${isOpen ? 'is-open' : ''}`}
      ref={itemRef}
      style={{ borderTop: isFirst ? 'none' : '1px solid black' }}
    >
      <a
        className="menu__item-link"
        href={link}
        onClick={handleTextClick}
      >
        <span className="menu__item-text">{text}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="menu__item-arrow"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </a>

      <div
        className="marquee"
        style={{ backgroundColor: marqueeBgColor }}
        onClick={handleMarqueeClick}
      >
        <div className="marquee__inner" ref={marqueeInnerRef}>
          {[...Array(repetitions)].map((_, i) => (
            <div className="marquee__part" key={i}>
              {items.map((skill, idx) => (
                <div key={idx} className="marquee__icon-box">
                  {skill.url ? (
                    <img src={skill.url} alt={skill.name} className="marquee__icon" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] animate-pulse flex-shrink-0" />
                  )}
                  <span className="marquee__text font-mono text-[#00D2FF] font-extrabold">{skill.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlowingMenu;
