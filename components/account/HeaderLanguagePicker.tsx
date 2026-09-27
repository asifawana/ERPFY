'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Language = {
  code: string;
  name: string;
  native: string;
  flag: string; // Country flag emoji / SVG
};

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
];

/**
 * Circular SVG Flag renderer guaranteeing 100% crisp cross-platform flag display
 */
export function FlagIcon({ code, className = 'size-5' }: { code: string; className?: string }) {
  switch (code) {
    case 'ur': // Pakistan Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <rect width="36" height="36" rx="18" fill="#00401A" />
          <rect width="9" height="36" fill="#FFFFFF" />
          <path
            d="M 24 10 A 8 8 0 1 0 28 24 A 6.5 6.5 0 1 1 24 10 Z"
            fill="#FFFFFF"
          />
          <polygon
            points="23.5,13.5 24.5,16 27,16 25,17.5 25.8,20 23.5,18.5 21.2,20 22,17.5 20,16 22.5,16"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'ar': // Saudi Arabia Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <rect width="36" height="36" rx="18" fill="#006C35" />
          <path d="M10 23 L26 23" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 20 L25 20" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
          <circle cx="18" cy="15" r="3" fill="#FFFFFF" />
        </svg>
      );
    case 'fr': // France Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <mask id="fr-mask">
            <rect width="36" height="36" rx="18" fill="#fff" />
          </mask>
          <g mask="url(#fr-mask)">
            <rect x="0" width="12" height="36" fill="#002395" />
            <rect x="12" width="12" height="36" fill="#FFFFFF" />
            <rect x="24" width="12" height="36" fill="#ED2939" />
          </g>
        </svg>
      );
    case 'de': // Germany Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <mask id="de-mask">
            <rect width="36" height="36" rx="18" fill="#fff" />
          </mask>
          <g mask="url(#de-mask)">
            <rect y="0" width="36" height="12" fill="#000000" />
            <rect y="12" width="36" height="12" fill="#DD0000" />
            <rect y="24" width="36" height="12" fill="#FFCC00" />
          </g>
        </svg>
      );
    case 'es': // Spain Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <mask id="es-mask">
            <rect width="36" height="36" rx="18" fill="#fff" />
          </mask>
          <g mask="url(#es-mask)">
            <rect y="0" width="36" height="9" fill="#AA151B" />
            <rect y="9" width="36" height="18" fill="#F1BF00" />
            <rect y="27" width="36" height="9" fill="#AA151B" />
          </g>
        </svg>
      );
    case 'tr': // Turkey Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <rect width="36" height="36" rx="18" fill="#E30A17" />
          <path
            d="M 21 11 A 7 7 0 1 0 24 23 A 5.5 5.5 0 1 1 21 11 Z"
            fill="#FFFFFF"
          />
          <polygon
            points="23,16 23.8,17.5 25.5,17.5 24.2,18.5 24.8,20.2 23,19.2 21.2,20.2 21.8,18.5 20.5,17.5 22.2,17.5"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'th': // Thailand Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <mask id="th-mask">
            <rect width="36" height="36" rx="18" fill="#fff" />
          </mask>
          <g mask="url(#th-mask)">
            <rect y="0" width="36" height="6" fill="#A51931" />
            <rect y="6" width="36" height="6" fill="#F4F5F8" />
            <rect y="12" width="36" height="12" fill="#2D2A4A" />
            <rect y="24" width="36" height="6" fill="#F4F5F8" />
            <rect y="30" width="36" height="6" fill="#A51931" />
          </g>
        </svg>
      );
    case 'hi': // India Flag
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <mask id="in-mask">
            <rect width="36" height="36" rx="18" fill="#fff" />
          </mask>
          <g mask="url(#in-mask)">
            <rect y="0" width="36" height="12" fill="#FF9933" />
            <rect y="12" width="36" height="12" fill="#FFFFFF" />
            <rect y="24" width="36" height="12" fill="#138808" />
            <circle cx="18" cy="18" r="4" stroke="#000080" strokeWidth="1" fill="none" />
            <circle cx="18" cy="18" r="1.5" fill="#000080" />
          </g>
        </svg>
      );
    case 'en': // UK Flag
    default:
      return (
        <svg viewBox="0 0 36 36" className={className}>
          <mask id="uk-mask">
            <rect width="36" height="36" rx="18" fill="#fff" />
          </mask>
          <g mask="url(#uk-mask)">
            <rect width="36" height="36" fill="#012169" />
            {/* White Diagonals */}
            <line x1="0" y1="0" x2="36" y2="36" stroke="#FFFFFF" strokeWidth="6" />
            <line x1="0" y1="36" x2="36" y2="0" stroke="#FFFFFF" strokeWidth="6" />
            {/* Red Diagonals */}
            <line x1="0" y1="0" x2="36" y2="36" stroke="#C8102E" strokeWidth="2" />
            <line x1="0" y1="36" x2="36" y2="0" stroke="#C8102E" strokeWidth="2" />
            {/* White Cross */}
            <rect x="14" width="8" height="36" fill="#FFFFFF" />
            <rect y="14" width="36" height="8" fill="#FFFFFF" />
            {/* Red Cross */}
            <rect x="15.5" width="5" height="36" fill="#C8102E" />
            <rect y="15.5" width="36" height="5" fill="#C8102E" />
          </g>
        </svg>
      );
  }
}

export function HeaderLanguagePicker({ defaultLang = 'en' }: { defaultLang?: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('erpfy_language');
      if (saved && LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    }
    return defaultLang;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = selected;
      if (selected === 'ur' || selected === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
      }
    }
  }, [selected]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const activeLanguage = LANGUAGES.find((l) => l.code === selected) || LANGUAGES[0]!;

  const handleSelect = (code: string) => {
    setSelected(code);
    setOpen(false);
    try {
      localStorage.setItem('erpfy_language', code);
    } catch {}
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Circle Style Button showing active language Flag */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`Language: ${activeLanguage.name}`}
        title={`Current Language: ${activeLanguage.name} (${activeLanguage.native})`}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 p-1 shadow-xs transition-all hover:bg-black/35 hover:scale-105 active:scale-95 focus:outline-hidden',
          open && 'ring-2 ring-white/40',
        )}
      >
        <FlagIcon code={activeLanguage.code} className="size-5 rounded-full" />
      </button>

      {/* Floating Popover Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border border-[#E5E7EB] bg-white p-1.5 text-left text-[#111827] shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 border-b border-[#F3F4F6] mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Select Language
            </p>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {LANGUAGES.map((lang) => {
              const isCurrent = lang.code === selected;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isCurrent
                      ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)] font-semibold'
                      : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FlagIcon code={lang.code} className="size-4.5 shrink-0 rounded-full" />
                    <span className="truncate">{lang.name}</span>
                    <span className="text-[11px] text-[#6B7280]">({lang.native})</span>
                  </div>
                  {isCurrent && (
                    <Check className="size-3.5 shrink-0 text-[var(--erpfy-brand)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
