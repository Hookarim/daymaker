import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStorage, signOut } from './useStorage';
import {
  Home, Wallet, CheckSquare, Users, BarChart3, Plus, X, Check, Trash2,
  Calendar, MapPin, Phone, Mail, ChevronRight, ChevronLeft, Settings,
  Download, Upload, Edit3, Clock, TrendingUp, TrendingDown, Target,
  Briefcase, Coffee, Sparkles, ArrowUpRight, ArrowDownRight, MoreVertical,
  Search, Filter, Save, RefreshCw, AlertCircle, Star, Flag, ExternalLink,
  CalendarPlus, FolderOpen, Heart, MessageCircle, User, Repeat, Send,
  MessageSquare, Bot, Lightbulb, Loader, Mic, Volume2, VolumeX, Activity,
  Award
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// Storage hook is imported from useStorage.js (Supabase-backed)
// Same signature as the artifact's window.storage version

// ─────────────────────────────────────────────────────────────
// HELPERS

// ─────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const fmt = (n, currency = 'CHF') => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v);
};

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

const sameDay = (iso, ref = new Date()) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() &&
         d.getMonth() === ref.getMonth() &&
         d.getDate() === ref.getDate();
};

const sameMonth = (iso, ref = new Date()) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};

const daysAgo = (iso) => {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

const greetingDE = (name) => {
  const h = new Date().getHours();
  const n = name ? `, ${name}` : '';
  if (h < 5) return `Gute Nacht${n}`;
  if (h < 11) return `Guten Morgen${n}`;
  if (h < 17) return `Hallo${n}`;
  if (h < 22) return `Guten Abend${n}`;
  return `Gute Nacht${n}`;
};

const dateLongDE = (d = new Date()) =>
  d.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });

const monthDE = (d = new Date()) =>
  d.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });

// Build Google Calendar add-event URL
const gcalUrl = ({ title, details = '', location = '', startISO, endISO }) => {
  const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const start = startISO ? fmt(startISO) : fmt(new Date().toISOString());
  const end = endISO ? fmt(endISO) : fmt(new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || '',
    dates: `${start}/${end}`,
    details: details || '',
    location: location || ''
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
};

// Generate .ics calendar file content
const buildICS = (events) => {
  const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daymaker//DE',
    'CALSCALE:GREGORIAN'
  ];
  events.forEach(ev => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@daymaker`);
    lines.push(`DTSTAMP:${fmt(now())}`);
    lines.push(`DTSTART:${fmt(ev.start)}`);
    lines.push(`DTEND:${fmt(ev.end || new Date(new Date(ev.start).getTime() + 3600000).toISOString())}`);
    lines.push(`SUMMARY:${(ev.title || '').replace(/\n/g, ' ')}`);
    if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
    if (ev.location) lines.push(`LOCATION:${ev.location}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

// Safer download: properly attach to DOM, catch errors, never crash the app.
// Returns true on apparent success, false on failure (so caller can show fallback).
const downloadFile = (filename, content, type = 'text/plain') => {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch {}
      try { URL.revokeObjectURL(url); } catch {}
    }, 1000);
    return true;
  } catch (e) {
    console.error('Download failed:', e);
    return false;
  }
};

// Copy text to clipboard with multiple fallback strategies
const copyToClipboard = async (text) => {
  // Strategy 1: modern clipboard API
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through */ }
  // Strategy 2: legacy execCommand via hidden textarea
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — warm dark "almanac" aesthetic
// ─────────────────────────────────────────────────────────────
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .dm {
      --bg: #0A0F0B;
      --bg-1: #101713;
      --bg-2: #16201A;
      --bg-3: #1D2A22;
      --line: #25342B;
      --line-soft: #1B271F;
      --ink: #E5EDE5;
      --ink-2: #B8C4B8;
      --ink-3: #7E8C82;
      --ink-4: #545E58;
      --accent: #7DA888;
      --accent-soft: #7DA88826;
      --accent-line: #7DA88866;
      --green: #5FA875;
      --green-soft: #5FA87526;
      --red: #C66454;
      --red-soft: #C6645426;
      --blue: #6FA0BC;
      --violet: #9F86C0;
      --gold: #B8A85C;

      font-family: 'Geist', sans-serif;
      color: var(--ink);
      background: var(--bg);
      font-feature-settings: 'ss01', 'cv11';
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: antialiased;
      letter-spacing: -0.005em;
    }
    .dm .display { font-family: 'Fraunces', serif; font-optical-sizing: auto; letter-spacing: -0.02em; }
    .dm .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .dm .num { font-variant-numeric: tabular-nums; }

    .dm * { box-sizing: border-box; }
    .dm button { font-family: inherit; color: inherit; }

    /* Hide all SVG icons globally per design spec */
    .dm svg { display: none !important; }
    /* Re-enable SVG only inside chart containers */
    .dm .recharts-wrapper svg { display: block !important; }
    .dm .dm-allow-svg svg { display: inline !important; }

    /* Subtle paper grain */
    .dm-grain {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      opacity: 0.035; mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    /* Bottom nav active indicator */
    @keyframes dm-pop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .dm-pop { animation: dm-pop 0.18s ease-out; }

    @keyframes dm-slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .dm-slide-up { animation: dm-slide-up 0.25s ease-out; }

    @keyframes dm-fade { from { opacity: 0; } to { opacity: 1; } }
    .dm-fade { animation: dm-fade 0.2s ease-out; }

    /* Sheet (modal) */
    @keyframes dm-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .dm-sheet { animation: dm-sheet 0.28s cubic-bezier(0.32, 0.72, 0, 1); }

    /* Native-feeling scroll */
    .dm-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
    .dm-scroll::-webkit-scrollbar { display: none; }

    /* Card */
    .dm-card {
      background: var(--bg-1);
      border: 1px solid var(--line);
      border-radius: 16px;
    }
    .dm-card-hl {
      background: linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%);
      border: 1px solid var(--line);
      border-radius: 18px;
    }

    /* Inputs */
    .dm-input {
      background: var(--bg-2);
      border: 1px solid var(--line);
      color: var(--ink);
      border-radius: 12px;
      padding: 14px 14px;
      width: 100%;
      font-family: inherit;
      font-size: 16px; /* prevents iOS zoom */
      outline: none;
      transition: border-color 0.15s;
    }
    .dm-input:focus { border-color: var(--accent-line); }
    .dm-input::placeholder { color: var(--ink-4); }

    select.dm-input { appearance: none; -webkit-appearance: none; background-repeat: no-repeat; background-position: right 14px center;
      background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238C8475' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
      padding-right: 40px;
    }

    .dm-btn-primary {
      background: var(--accent);
      color: #1A1209;
      border-radius: 12px;
      padding: 14px 18px;
      font-weight: 600;
      width: 100%;
      transition: transform 0.06s;
    }
    .dm-btn-primary:active { transform: scale(0.98); }

    .dm-btn-ghost {
      background: var(--bg-2);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 16px;
      font-weight: 500;
      transition: background 0.12s;
    }
    .dm-btn-ghost:active { background: var(--bg-3); }

    /* Chip */
    .dm-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 999px;
      font-size: 12px; font-weight: 500;
      background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-2);
      transition: all 0.12s;
    }
    .dm-chip-active { background: var(--accent); border-color: var(--accent); color: #1A1209; }

    /* Safe areas */
    .dm-safe-top { padding-top: max(env(safe-area-inset-top), 12px); }
    .dm-safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 12px); }

    /* Hide number input arrows */
    .dm input[type=number]::-webkit-inner-spin-button,
    .dm input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .dm input[type=number] { -moz-appearance: textfield; }
  `}</style>
);

// ─────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────
const Sheet = ({ open, onClose, title, children, height = '85vh' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 dm-fade" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div
        className="dm-sheet absolute bottom-0 left-0 right-0 dm-safe-bottom"
        style={{ background: 'var(--bg-1)', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: height, display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line)' }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3" style={{ borderBottom: '1px solid var(--line-soft)' }}>
          <h3 className="display text-xl" style={{ fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2"><X size={22} style={{ color: 'var(--ink-3)' }} /></button>
        </div>
        <div className="dm-scroll overflow-y-auto px-5 py-4" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, accent, icon: Icon }) => (
  <div className="dm-card-hl p-4" style={{ minHeight: 96 }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{label}</span>
      {Icon && <Icon size={14} style={{ color: 'var(--ink-4)' }} />}
    </div>
    <div className="display num text-2xl" style={{ color: accent || 'var(--ink)', fontWeight: 600 }}>{value}</div>
    {sub && <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>{sub}</div>}
  </div>
);

const EmptyState = ({ icon: Icon, title, hint, action }) => (
  <div className="text-center py-12 px-6 dm-fade">
    <div className="inline-flex items-center justify-center mb-4"
      style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
      <Icon size={22} style={{ color: 'var(--ink-3)' }} />
    </div>
    <div className="display text-lg mb-1" style={{ fontWeight: 500 }}>{title}</div>
    {hint && <div className="text-sm" style={{ color: 'var(--ink-3)' }}>{hint}</div>}
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────
// TODAY VIEW
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// DAILY ROUTINE — hardcoded time blocks, checkable, GCal sync
// ─────────────────────────────────────────────────────────────
const ROUTINE_BLOCKS = [
  { id: 'r1', start: '09:00', end: '11:00', label: 'AI Private Coach', tag: 'work' },
  { id: 'r2', start: '11:00', end: '12:00', label: 'Karma walk', tag: 'karma' },
  { id: 'r3', start: '12:00', end: '14:30', label: 'AI Private Coach', tag: 'work' },
  { id: 'r4', start: '14:30', end: '17:00', label: 'Roki.kids', tag: 'work' },
  { id: 'r5', start: '17:00', end: '17:30', label: 'Karma walk', tag: 'karma' },
  { id: 'r6', start: '18:00', end: '19:30', label: 'Gym', tag: 'fit' },
  { id: 'r7', start: '20:00', end: '21:30', label: 'HookALand Music', tag: 'work' }
];

const DailyRoutine = ({ tasks, setTasks, settings, setSettings }) => {
  const todayKey = today();
  const completedToday = (settings.routineDone && settings.routineDone[todayKey]) || {};

  const toggle = (id) => {
    const next = { ...completedToday, [id]: !completedToday[id] };
    setSettings(s => ({
      ...s,
      routineDone: { ...(s.routineDone || {}), [todayKey]: next }
    }));
  };

  // Build .ics for whole day routine (recurring weekly Mon-Sun)
  const buildRoutineICS = () => {
    const events = ROUTINE_BLOCKS.map(b => {
      const [sH, sM] = b.start.split(':').map(Number);
      const [eH, eM] = b.end.split(':').map(Number);
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sH, sM);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eH, eM);
      return { id: b.id, title: b.label, start: start.toISOString(), end: end.toISOString() };
    });
    // Use existing buildICS but add RRULE
    const fmtDt = (iso) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Daymaker//Routine', 'CALSCALE:GREGORIAN'];
    events.forEach(ev => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}-routine@daymaker`);
      lines.push(`DTSTAMP:${fmtDt(now())}`);
      lines.push(`DTSTART:${fmtDt(ev.start)}`);
      lines.push(`DTEND:${fmtDt(ev.end)}`);
      lines.push(`SUMMARY:${ev.title}`);
      lines.push('RRULE:FREQ=DAILY');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  const exportRoutineToCal = () => {
    downloadFile(`daymaker-routine-${todayKey}.ics`, buildRoutineICS(), 'text/calendar');
  };

  const addAllToGCal = () => {
    // Open each in a new tab — practical workaround for multi-event GCal
    const yes = confirm('Öffnet 7 Tabs in Google Kalender (täglich wiederkehrend). Fortfahren?');
    if (!yes) return;
    ROUTINE_BLOCKS.forEach((b, i) => {
      setTimeout(() => {
        const [sH, sM] = b.start.split(':').map(Number);
        const [eH, eM] = b.end.split(':').map(Number);
        const t = new Date();
        const start = new Date(t.getFullYear(), t.getMonth(), t.getDate(), sH, sM);
        const end = new Date(t.getFullYear(), t.getMonth(), t.getDate(), eH, eM);
        window.open(gcalRecurringUrl({
          title: b.label,
          startDateISO: start.toISOString()
        }) + `&dates=${end.toISOString().replace(/[-:]|\.\d{3}/g, '')}`, '_blank');
      }, i * 300);
    });
  };

  const doneCount = Object.values(completedToday).filter(Boolean).length;
  const pct = (doneCount / ROUTINE_BLOCKS.length) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="display text-xl" style={{ fontWeight: 500 }}>Tagesablauf</h2>
        <div className="flex gap-2">
          <button onClick={exportRoutineToCal}
            className="dm-chip" style={{ padding: '4px 10px', fontSize: 11 }}>
            .ics Export
          </button>
          <button onClick={addAllToGCal}
            className="dm-chip" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--accent)' }}>
            zu GCal
          </button>
        </div>
      </div>
      <div className="dm-card overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line-soft)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-3)' }}>
            <span>{doneCount}/{ROUTINE_BLOCKS.length} erledigt heute</span>
            <span className="num">{Math.round(pct)}%</span>
          </div>
          <div className="mt-2" style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
          </div>
        </div>
        {ROUTINE_BLOCKS.map((b, i) => {
          const done = !!completedToday[b.id];
          const tagColor = b.tag === 'karma' ? '#B8A85C' : b.tag === 'fit' ? '#5FA875' : '#7DA888';
          return (
            <button key={b.id} onClick={() => toggle(b.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i > 0 ? 'border-t' : ''}`}
              style={{
                ...(i > 0 ? { borderColor: 'var(--line-soft)' } : {}),
                opacity: done ? 0.5 : 1
              }}>
              <span className="num text-xs" style={{ width: 78, color: 'var(--ink-3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {b.start}–{b.end}
              </span>
              <span style={{ width: 3, height: 24, background: tagColor, borderRadius: 1.5, flexShrink: 0 }} />
              <span className="flex-1 text-sm" style={{ fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>
                {b.label}
              </span>
              <span className="text-xs" style={{
                width: 22, height: 22, borderRadius: 6,
                border: `1.5px solid ${done ? tagColor : 'var(--ink-4)'}`,
                background: done ? tagColor : 'transparent',
                color: '#0A0F0B', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {done ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TodayView = ({ name, tasks, setTasks, transactions, contacts, projects, fixed = [], currency, openAdd, toggleTask, settings, setSettings }) => {
  const todaysTasks = tasks.filter(t => !t.completed && t.dueDate && (sameDay(t.dueDate) || new Date(t.dueDate) < new Date()));
  const todaysIncome = transactions.filter(t => t.type === 'income' && sameDay(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const todaysExpense = transactions.filter(t => t.type === 'expense' && sameDay(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const monthVarIncome = transactions.filter(t => t.type === 'income' && sameMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const monthVarExpense = transactions.filter(t => t.type === 'expense' && sameMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const fixedIncome = fixed.filter(f => f.type === 'income' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
  const fixedExpense = fixed.filter(f => f.type === 'expense' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
  const monthIncome = monthVarIncome + fixedIncome;
  const monthExpense = monthVarExpense + fixedExpense;
  const monthNet = monthIncome - monthExpense;
  const followUps = contacts.filter(c => c.followUpDate && (sameDay(c.followUpDate) || new Date(c.followUpDate) < new Date()) && c.status !== 'closed');
  const activeProjects = projects.filter(p => p.status === 'active').length;

  return (
    <div className="px-5 pt-2 pb-32 dm-scroll">
      {/* Greeting */}
      <div className="mb-6 mt-2 dm-fade">
        <div className="text-sm" style={{ color: 'var(--ink-3)' }}>{dateLongDE()}</div>
        <h1 className="display text-3xl mt-1" style={{ fontWeight: 500 }}>{greetingDE(name)}.</h1>
      </div>

      {/* Hero net */}
      <div className="dm-card-hl p-5 mb-4 dm-slide-up" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)' }} />
        <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.1em' }}>Diesen Monat</div>
        <div className="display num text-4xl mb-1" style={{ fontWeight: 600, color: monthNet >= 0 ? 'var(--ink)' : 'var(--red)' }}>
          {fmt(monthNet, currency)}
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight size={14} style={{ color: 'var(--green)' }} />
            <span className="num" style={{ color: 'var(--ink-2)' }}>{fmt(monthIncome, currency)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight size={14} style={{ color: 'var(--red)' }} />
            <span className="num" style={{ color: 'var(--ink-2)' }}>{fmt(monthExpense, currency)}</span>
          </div>
        </div>
        {(fixedIncome > 0 || fixedExpense > 0) && (
          <div className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
            <Repeat size={10} /> inkl. Fixkosten {fmt(fixedIncome - fixedExpense, currency)}
          </div>
        )}
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Heute Netto" value={fmt(todaysIncome - todaysExpense, currency)}
          sub={`${fmt(todaysIncome, currency)} / -${fmt(todaysExpense, currency)}`}
          accent={(todaysIncome - todaysExpense) >= 0 ? 'var(--green)' : 'var(--red)'} icon={Wallet} />
        <StatCard label="Offene Aufgaben" value={tasks.filter(t => !t.completed).length}
          sub={`${todaysTasks.length} fällig`} icon={CheckSquare} />
        <StatCard label="Projekte" value={activeProjects} sub="aktiv" icon={Briefcase} />
        <StatCard label="Kontakte" value={contacts.length}
          sub={`${followUps.length} Follow-up`} icon={Users} />
      </div>

      {/* Projects (main grid on Today) */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <h2 className="display text-xl" style={{ fontWeight: 500 }}>Projekte</h2>
        <button onClick={() => openAdd('project')} className="text-xs" style={{ color: 'var(--accent)' }}>
          + Projekt
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {projects.filter(p => p.status === 'active').slice(0, 6).map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id);
          const open = pTasks.filter(t => !t.completed).length;
          const done = pTasks.filter(t => t.completed).length;
          const pct = pTasks.length > 0 ? (done / pTasks.length) * 100 : 0;
          return (
            <button key={p.id} onClick={() => openAdd('task')}
              className="dm-card p-3 text-left" style={{ borderLeft: `3px solid ${p.color}` }}>
              <div className="text-sm truncate" style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
                <span className="num">{open}</span> offen · <span className="num">{done}</span> erledigt
              </div>
              <div className="mt-2" style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: p.color }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Routine */}
      <DailyRoutine tasks={tasks} setTasks={setTasks} settings={settings} setSettings={setSettings} />

      {/* Today's tasks */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <h2 className="display text-xl" style={{ fontWeight: 500 }}>Heute fällig</h2>
        <button onClick={() => openAdd('task')} className="text-xs" style={{ color: 'var(--accent)' }}>
          + Aufgabe
        </button>
      </div>
      {todaysTasks.length === 0 ? (
        <div className="dm-card p-5 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          Alle fälligen Aufgaben erledigt
        </div>
      ) : (
        <div className="space-y-2">
          {todaysTasks.slice(0, 5).map(t => {
            const proj = projects.find(p => p.id === t.projectId);
            const overdue = new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
            return (
              <div key={t.id} className="dm-card p-4 flex items-center gap-3">
                <button onClick={() => toggleTask(t.id)}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${overdue ? 'var(--red)' : 'var(--ink-4)'}` }}>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ fontWeight: 500 }}>{t.title}</div>
                  <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: overdue ? 'var(--red)' : 'var(--ink-3)' }}>
                    {overdue ? 'Überfällig' : 'Heute'}
                    {proj && <><span>·</span><span style={{ color: proj.color }}>● {proj.name}</span></>}
                  </div>
                </div>
                {t.priority === 'high' && <Flag size={14} style={{ color: 'var(--accent)' }} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-ups today */}
      {followUps.length > 0 && (
        <>
          <h2 className="display text-xl mt-6 mb-3" style={{ fontWeight: 500 }}>Follow-ups</h2>
          <div className="space-y-2">
            {followUps.slice(0, 3).map(c => (
              <div key={c.id} className="dm-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ fontWeight: 500 }}>{c.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {c.location || 'Hitchtracker'} · {daysAgo(c.metAt)}d her
                    </div>
                  </div>
                  <a href={gcalUrl({ title: `Follow-up: ${c.name}`, details: c.notes || '', startISO: c.followUpDate })}
                    target="_blank" rel="noreferrer"
                    className="dm-chip" style={{ color: 'var(--accent)' }}>
                    <CalendarPlus size={12} /> Kalender
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MONEY VIEW (Finanzen)
// ─────────────────────────────────────────────────────────────
const CATEGORIES = {
  income: ['Gehalt', 'Freelance', 'Geschenk', 'Verkauf', 'Investment', 'Sonstiges'],
  expense: ['Lebensmittel', 'Wohnen', 'Transport', 'Restaurant', 'Freizeit', 'Gesundheit', 'Abonnement', 'Steuern', 'Bildung', 'Sonstiges']
};

const CAT_COLORS = {
  'Gehalt': '#5FA875', 'Freelance': '#6FA0BC', 'Geschenk': '#9F86C0', 'Verkauf': '#B8A85C', 'Investment': '#7DA888',
  'Lebensmittel': '#5FA875', 'Wohnen': '#C66454', 'Transport': '#6FA0BC', 'Restaurant': '#7DA888',
  'Freizeit': '#9F86C0', 'Gesundheit': '#B8A85C', 'Abonnement': '#9B8FB1', 'Steuern': '#9B5C5C', 'Bildung': '#5BAEA0', 'Sonstiges': '#8C8475'
};

// Next billing date for a monthly recurring item
const nextBilling = (dayOfMonth) => {
  if (!dayOfMonth) return null;
  const t = new Date();
  const next = new Date(t.getFullYear(), t.getMonth(), dayOfMonth);
  if (next < new Date(t.getFullYear(), t.getMonth(), t.getDate())) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
};

const daysUntilDate = (date) => {
  if (!date) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

const dateShortDE = (d) => d ? new Date(d).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' }) : '';

// Recurring monthly Google Calendar reminder
const gcalRecurringUrl = ({ title, details = '', dayOfMonth, startDateISO }) => {
  let base;
  if (startDateISO) {
    base = new Date(startDateISO);
  } else if (dayOfMonth) {
    base = nextBilling(dayOfMonth);
  } else {
    base = new Date();
  }
  if (!base) return null;
  base.setHours(9, 0, 0, 0);
  const end = new Date(base);
  end.setHours(9, 30, 0, 0);
  const fmtDt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || '',
    dates: `${fmtDt(base)}/${fmtDt(end)}`,
    details: details || '',
    recur: 'RRULE:FREQ=MONTHLY'
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
};

// Default seed values for fixed costs (one-time on first run)
const SEED_FIXED = [
  // Einnahmen
  { type: 'income', name: 'Grundeinnahmen', amount: 4500, category: 'Gehalt', dayOfMonth: 25, active: true, group: 'Einnahmen' },
  { type: 'income', name: 'Studio', amount: 300, category: 'Freelance', dayOfMonth: 1, active: true, group: 'Einnahmen' },
  { type: 'income', name: 'AIPC (AI Private Coach)', amount: 1500, category: 'Freelance', dayOfMonth: 1, active: true, group: 'Einnahmen' },
  // Privat
  { type: 'expense', name: 'Miete', amount: 1800, category: 'Wohnen', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Studio', amount: 300, category: 'Wohnen', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Strom', amount: 100, category: 'Wohnen', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Krankenkasse', amount: 450, category: 'Gesundheit', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Auto', amount: 100, category: 'Transport', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Karma', amount: 150, category: 'Sonstiges', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Haushalt', amount: 50, category: 'Lebensmittel', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Essen', amount: 450, category: 'Lebensmittel', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Ausgang', amount: 400, category: 'Freizeit', dayOfMonth: 1, active: true, group: 'Privat' },
  { type: 'expense', name: 'Sonstiges', amount: 350, category: 'Sonstiges', dayOfMonth: 1, active: true, group: 'Privat' },
  // Extern
  { type: 'expense', name: 'SC', amount: 535, category: 'Sonstiges', dayOfMonth: 1, active: true, group: 'Extern' },
  { type: 'expense', name: 'B', amount: 300, category: 'Sonstiges', dayOfMonth: 1, active: true, group: 'Extern' },
  // Steuern
  { type: 'expense', name: 'Steuern', amount: 750, category: 'Steuern', dayOfMonth: 1, active: true, group: 'Steuern' },
  // AI Tools - Abonnements
  { type: 'expense', name: 'Claude', amount: 100, category: 'Abonnement', dayOfMonth: 23, active: true, startDate: '2026-04-23', group: 'AI Tools' },
  { type: 'expense', name: 'Grok', amount: 25, category: 'Abonnement', dayOfMonth: 20, active: true, startDate: '2026-03-20', group: 'AI Tools' },
  { type: 'expense', name: 'Netlify', amount: 9, category: 'Abonnement', dayOfMonth: 21, active: true, startDate: '2026-04-21', group: 'AI Tools' },
  { type: 'expense', name: 'Higgsfield', amount: 13, category: 'Abonnement', dayOfMonth: 4, active: true, startDate: '2026-05-04', group: 'AI Tools' },
];

const MoneyView = ({ transactions, setTransactions, fixed = [], setFixed, currency, openAdd }) => {
  const [moneyTab, setMoneyTab] = useState('transactions'); // transactions | fixed
  const [filter, setFilter] = useState('all'); // all, income, expense
  const [period, setPeriod] = useState('month'); // month, all
  const [editingFixed, setEditingFixed] = useState(null);

  const editFixed = (f) => setEditingFixed(f);
  const saveEditedFixed = (updated) => {
    setFixed(prev => prev.map(f => f.id === updated.id ? updated : f));
    setEditingFixed(null);
  };

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (period === 'month') list = list.filter(t => sameMonth(t.date));
    if (filter !== 'all') list = list.filter(t => t.type === filter);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filter, period]);

  const varIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const varExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

  // Fixed monthly amounts (only count when in month view)
  const fixedIncome = fixed.filter(f => f.type === 'income' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
  const fixedExpense = fixed.filter(f => f.type === 'expense' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);

  // Combined for monthly display
  const income = period === 'month' ? varIncome + fixedIncome : varIncome;
  const expense = period === 'month' ? varExpense + fixedExpense : varExpense;

  // category breakdown for current view
  const byCategory = useMemo(() => {
    const expenses = filtered.filter(t => t.type === 'expense');
    const grouped = {};
    expenses.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + Number(t.amount || 0);
    });
    if (period === 'month') {
      fixed.filter(f => f.type === 'expense' && f.active !== false).forEach(f => {
        const cat = f.category || 'Abonnement';
        grouped[cat] = (grouped[cat] || 0) + Number(f.amount || 0);
      });
    }
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#8C8475' }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, fixed, period]);

  const removeTx = (id) => setTransactions(prev => prev.filter(t => t.id !== id));
  const removeFixed = (id) => setFixed(prev => prev.filter(f => f.id !== id));
  const toggleFixed = (id) => setFixed(prev => prev.map(f => f.id === id ? { ...f, active: f.active === false ? true : false } : f));

  // group by date
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(t => {
      const key = t.date.slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups);
  }, [filtered]);

  // Group fixed: by user-defined group, then sort
  const groupedFixed = useMemo(() => {
    const order = ['Einnahmen', 'Privat', 'Extern', 'Steuern', 'AI Tools'];
    const groups = {};
    fixed.forEach(f => {
      const g = f.group || (f.type === 'income' ? 'Einnahmen' : (f.category === 'Abonnement' ? 'AI Tools' : 'Sonstiges'));
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)));
    const known = order.filter(k => groups[k]);
    const others = Object.keys(groups).filter(k => !order.includes(k));
    return [...known, ...others].map(k => [k, groups[k]]);
  }, [fixed]);

  // Subscription summary (Abonnement category)
  const subsActive = useMemo(() => fixed.filter(f => f.category === 'Abonnement' && f.active !== false), [fixed]);
  const subsMonthly = subsActive.reduce((s, f) => s + Number(f.amount || 0), 0);
  const subsYearly = subsMonthly * 12;

  return (
    <div className="px-5 pt-2 pb-32 dm-scroll">
      <div className="mb-4 mt-2 flex items-end justify-between">
        <div>
          <div className="text-sm capitalize" style={{ color: 'var(--ink-3)' }}>
            {moneyTab === 'fixed' ? 'Monatlich wiederkehrend' : (period === 'month' ? monthDE() : 'Alle Buchungen')}
          </div>
          <h1 className="display text-3xl mt-0.5" style={{ fontWeight: 500 }}>Finanzen</h1>
        </div>
        {moneyTab === 'transactions' && (
          <button onClick={() => setPeriod(period === 'month' ? 'all' : 'month')}
            className="dm-chip">
            <RefreshCw size={12} /> {period === 'month' ? 'Monat' : 'Alle'}
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMoneyTab('transactions')}
          className={`dm-chip ${moneyTab === 'transactions' ? 'dm-chip-active' : ''}`}>
          <Wallet size={12} /> Buchungen
        </button>
        <button onClick={() => setMoneyTab('fixed')}
          className={`dm-chip ${moneyTab === 'fixed' ? 'dm-chip-active' : ''}`}>
          <Repeat size={12} /> Fixkosten ({fixed.length})
        </button>
      </div>

      {moneyTab === 'transactions' && (
        <>
          {/* Net + breakdown */}
          <div className="dm-card-hl p-5 mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.1em' }}>Netto</div>
              {period === 'month' && (fixedIncome > 0 || fixedExpense > 0) && (
                <div className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                  <Repeat size={10} /> inkl. Fixkosten
                </div>
              )}
            </div>
            <div className="display num text-4xl mb-3" style={{ fontWeight: 600, color: (income - expense) >= 0 ? 'var(--ink)' : 'var(--red)' }}>
              {fmt(income - expense, currency)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpRight size={14} style={{ color: 'var(--green)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Einnahmen</span>
                </div>
                <div className="num text-lg" style={{ fontWeight: 600 }}>{fmt(income, currency)}</div>
                {period === 'month' && fixedIncome > 0 && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                    {fmt(varIncome, currency)} + {fmt(fixedIncome, currency)} fix
                  </div>
                )}
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownRight size={14} style={{ color: 'var(--red)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Ausgaben</span>
                </div>
                <div className="num text-lg" style={{ fontWeight: 600 }}>{fmt(expense, currency)}</div>
                {period === 'month' && fixedExpense > 0 && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                    {fmt(varExpense, currency)} + {fmt(fixedExpense, currency)} fix
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mb-4">
            {[['all', 'Alle'], ['income', 'Einnahmen'], ['expense', 'Ausgaben']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`dm-chip ${filter === k ? 'dm-chip-active' : ''}`}>{l}</button>
            ))}
          </div>

          {/* Category breakdown */}
          {byCategory.length > 0 && filter !== 'income' && (
            <div className="dm-card p-4 mb-4">
              <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                Ausgaben nach Kategorie
              </div>
              <div className="space-y-2">
                {byCategory.slice(0, 6).map((c, i) => {
                  const pct = (c.value / expense) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{c.name}</span>
                        <span className="num" style={{ color: 'var(--ink-2)' }}>{fmt(c.value, currency)} <span style={{ color: 'var(--ink-3)' }}>· {pct.toFixed(0)}%</span></span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transactions list */}
          <div className="flex items-center justify-between mb-3 mt-4">
            <h2 className="display text-xl" style={{ fontWeight: 500 }}>Buchungen</h2>
            <button onClick={() => openAdd('transaction')} className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Buchen
            </button>
          </div>

          {grouped.length === 0 ? (
            <EmptyState icon={Wallet} title="Noch keine Buchungen"
              hint={period === 'month' ? 'In diesem Monat noch nichts gebucht' : 'Tippe auf + um zu beginnen'} />
          ) : (
            <div className="space-y-4">
              {grouped.map(([date, items]) => {
                const dayNet = items.reduce((s, t) => s + (t.type === 'income' ? 1 : -1) * Number(t.amount || 0), 0);
                return (
                  <div key={date}>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                        {new Date(date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="num text-xs" style={{ color: dayNet >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {dayNet >= 0 ? '+' : ''}{fmt(dayNet, currency)}
                      </span>
                    </div>
                    <div className="dm-card overflow-hidden">
                      {items.map((t, i) => (
                        <div key={t.id} className={`flex items-center gap-3 p-3.5 ${i > 0 ? 'border-t' : ''}`}
                          style={i > 0 ? { borderColor: 'var(--line-soft)' } : {}}>
                          <div className="flex-shrink-0 flex items-center justify-center"
                            style={{ width: 36, height: 36, borderRadius: 10,
                              background: t.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)' }}>
                            {t.type === 'income'
                              ? <ArrowUpRight size={16} style={{ color: 'var(--green)' }} />
                              : <ArrowDownRight size={16} style={{ color: 'var(--red)' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate" style={{ fontWeight: 500 }}>{t.description || t.category}</div>
                            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{t.category}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="num text-sm" style={{ fontWeight: 600,
                              color: t.type === 'income' ? 'var(--green)' : 'var(--ink)' }}>
                              {t.type === 'income' ? '+' : '−'}{fmt(t.amount, currency)}
                            </div>
                          </div>
                          <button onClick={() => removeTx(t.id)} className="p-1 -mr-1">
                            <Trash2 size={14} style={{ color: 'var(--ink-4)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {moneyTab === 'fixed' && (
        <>
          {/* Fixed monthly summary */}
          <div className="dm-card-hl p-5 mb-4">
            <div className="text-xs uppercase mb-1" style={{ color: 'var(--ink-3)', letterSpacing: '0.1em' }}>Monatlich Netto</div>
            <div className="display num text-4xl mb-3" style={{ fontWeight: 600, color: (fixedIncome - fixedExpense) >= 0 ? 'var(--ink)' : 'var(--red)' }}>
              {fmt(fixedIncome - fixedExpense, currency)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpRight size={14} style={{ color: 'var(--green)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Fixe Einnahmen</span>
                </div>
                <div className="num text-lg" style={{ fontWeight: 600 }}>{fmt(fixedIncome, currency)}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownRight size={14} style={{ color: 'var(--red)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Fixe Ausgaben</span>
                </div>
                <div className="num text-lg" style={{ fontWeight: 600 }}>{fmt(fixedExpense, currency)}</div>
              </div>
            </div>
            <div className="text-xs mt-3" style={{ color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Wiederkehrende monatliche Beträge wie Miete, Gehalt, Abos. Werden automatisch im monatlichen Netto auf Heute & Geld angezeigt.
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="display text-xl" style={{ fontWeight: 500 }}>Wiederkehrend</h2>
            <button onClick={() => openAdd('fixed')} className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Neu
            </button>
          </div>

          {/* Subscriptions overview */}
          {subsActive.length > 0 && (
            <div className="dm-card p-4 mb-4" style={{ borderColor: 'var(--accent-line)', background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Bot size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ fontWeight: 600, color: 'var(--accent)' }}>Abos im Überblick</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{subsActive.length} aktiv</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Pro Monat</div>
                  <div className="num text-lg" style={{ fontWeight: 600 }}>{fmt(subsMonthly, currency)}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Pro Jahr</div>
                  <div className="num text-lg" style={{ fontWeight: 600 }}>{fmt(subsYearly, currency)}</div>
                </div>
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--ink-3)', lineHeight: 1.4 }}>
                Tipp: Auf das Glocken-Symbol bei einem Abo tippen, um einen monatlichen Reminder im Google Kalender zu erstellen.
              </div>
            </div>
          )}

          {groupedFixed.length === 0 ? (
            <EmptyState icon={Repeat} title="Keine Fixkosten"
              hint="Füge wiederkehrende monatliche Einnahmen (Gehalt) oder Ausgaben (Miete, Abos) hinzu" />
          ) : (
            <div className="space-y-4">
              {groupedFixed.map(([groupName, items]) => {
                const groupTotal = items.reduce((s, f) =>
                  s + (f.active === false ? 0 : (f.type === 'income' ? 1 : -1) * Number(f.amount || 0)), 0);
                return (
                  <div key={groupName}>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em', fontWeight: 600 }}>
                        {groupName}
                      </span>
                      <span className="num text-xs" style={{ color: groupTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {groupTotal >= 0 ? '+' : ''}{fmt(groupTotal, currency)}
                      </span>
                    </div>
                    <div className="dm-card overflow-hidden">
                      {items.map((f, i) => {
                        const inactive = f.active === false;
                        const isSub = f.category === 'Abonnement';
                        const next = nextBilling(f.dayOfMonth);
                        const dUntil = daysUntilDate(next);
                        const upcoming = !inactive && dUntil !== null && dUntil >= 0 && dUntil <= 7;
                        const reminderUrl = isSub ? gcalRecurringUrl({
                          title: `${f.name} — ${fmt(f.amount, currency)}`,
                          details: `Monatliches Abo${f.startDate ? ` (seit ${dateShortDE(f.startDate)})` : ''}`,
                          dayOfMonth: f.dayOfMonth,
                          startDateISO: f.startDate
                        }) : null;
                        return (
                          <div key={f.id} className={`p-3.5 ${i > 0 ? 'border-t' : ''}`}
                            style={{ ...(i > 0 ? { borderColor: 'var(--line-soft)' } : {}), opacity: inactive ? 0.4 : 1 }}>
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 flex items-center justify-center"
                                style={{ width: 36, height: 36, borderRadius: 10,
                                  background: f.type === 'income' ? 'var(--green-soft)' : 'var(--red-soft)' }}>
                                {f.type === 'income'
                                  ? <ArrowUpRight size={16} style={{ color: 'var(--green)' }} />
                                  : <ArrowDownRight size={16} style={{ color: 'var(--red)' }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm truncate" style={{ fontWeight: 500 }}>{f.name}</span>
                                  {upcoming && (
                                    <span className="dm-chip" style={{ padding: '1px 6px', fontSize: 10, color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
                                      in {dUntil}d
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs flex items-center gap-1 flex-wrap mt-0.5" style={{ color: 'var(--ink-3)' }}>
                                  <span>{f.category}</span>
                                  {f.dayOfMonth && <><span>·</span><span>am {f.dayOfMonth}.</span></>}
                                  {f.startDate && <><span>·</span><span>seit {dateShortDE(f.startDate)}</span></>}
                                  {inactive && <><span>·</span><span style={{ color: 'var(--red)' }}>Pausiert</span></>}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="num text-sm" style={{ fontWeight: 600,
                                  color: f.type === 'income' ? 'var(--green)' : 'var(--ink)' }}>
                                  {f.type === 'income' ? '+' : '−'}{fmt(f.amount, currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
                              <button onClick={() => editFixed(f)} className="dm-chip" style={{ padding: '4px 8px', fontSize: 11 }}>
                                <Edit3 size={11} /> Bearbeiten
                              </button>
                              {reminderUrl && (
                                <a href={reminderUrl} target="_blank" rel="noreferrer"
                                  className="dm-chip" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--accent)' }}>
                                  <CalendarPlus size={11} /> Reminder
                                </a>
                              )}
                              <div style={{ flex: 1 }} />
                              <button onClick={() => toggleFixed(f.id)} className="p-1.5" title={inactive ? 'Aktivieren' : 'Pausieren'}>
                                {inactive
                                  ? <RefreshCw size={13} style={{ color: 'var(--ink-3)' }} />
                                  : <Clock size={13} style={{ color: 'var(--ink-4)' }} />}
                              </button>
                              <button onClick={() => removeFixed(f.id)} className="p-1.5">
                                <Trash2 size={13} style={{ color: 'var(--ink-4)' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editingFixed && (
        <EditFixedSheet item={editingFixed} currency={currency}
          onClose={() => setEditingFixed(null)}
          onSave={saveEditedFixed} />
      )}
    </div>
  );
};

// Edit sheet for a single fixed cost
const EditFixedSheet = ({ item, currency, onClose, onSave }) => {
  const [draft, setDraft] = useState({ ...item });
  const valid = draft.name && Number(draft.amount) > 0;
  return (
    <Sheet open={true} onClose={onClose} title={`Bearbeiten: ${item.name}`}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setDraft({ ...draft, type: 'expense' })}
            className={`dm-chip flex-1 justify-center ${draft.type === 'expense' ? 'dm-chip-active' : ''}`} style={{ padding: '10px' }}>
            <ArrowDownRight size={14} /> Ausgabe
          </button>
          <button onClick={() => setDraft({ ...draft, type: 'income' })}
            className={`dm-chip flex-1 justify-center ${draft.type === 'income' ? 'dm-chip-active' : ''}`} style={{ padding: '10px' }}>
            <ArrowUpRight size={14} /> Einnahme
          </button>
        </div>
        <Field label="Name *">
          <input value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} className="dm-input" />
        </Field>
        <Field label="Monatlicher Betrag *">
          <div className="relative">
            <input type="number" inputMode="decimal" step="0.01" value={draft.amount}
              onChange={e => setDraft({ ...draft, amount: e.target.value })}
              className="dm-input num"
              style={{ fontSize: 24, fontWeight: 600, padding: '16px 14px' }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--ink-3)' }}>{currency}</span>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategorie">
            <select value={draft.category || 'Sonstiges'} onChange={e => setDraft({ ...draft, category: e.target.value })} className="dm-input">
              {CATEGORIES[draft.type || 'expense'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Tag im Monat">
            <input type="number" min="1" max="31" value={draft.dayOfMonth || ''}
              onChange={e => setDraft({ ...draft, dayOfMonth: Number(e.target.value) || null })}
              className="dm-input num" />
          </Field>
        </div>
        <Field label="Gruppe">
          <select value={draft.group || ''} onChange={e => setDraft({ ...draft, group: e.target.value || null })} className="dm-input">
            <option value="">(Automatisch)</option>
            <option>Einnahmen</option>
            <option>Privat</option>
            <option>Extern</option>
            <option>Steuern</option>
            <option>AI Tools</option>
            <option>Sonstiges</option>
          </select>
        </Field>
        {draft.category === 'Abonnement' && (
          <Field label="Abo seit (Startdatum)">
            <input type="date" value={(draft.startDate || '').slice(0, 10)}
              onChange={e => setDraft({ ...draft, startDate: e.target.value || null })}
              className="dm-input" />
          </Field>
        )}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="dm-btn-ghost flex-1">Abbrechen</button>
          <button onClick={() => valid && onSave(draft)} disabled={!valid}
            className="dm-btn-primary flex-1" style={{ opacity: valid ? 1 : 0.5 }}>Speichern</button>
        </div>
      </div>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────
// TASKS VIEW (Aufgaben + Projekte)
// ─────────────────────────────────────────────────────────────
const TasksView = ({ tasks, setTasks, projects, setProjects, openAdd, toggleTask, openAddInProject }) => {
  const [view, setView] = useState('tasks'); // tasks | projects
  const [filterProject, setFilterProject] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filterProject) list = list.filter(t => t.projectId === filterProject);
    if (!showCompleted) list = list.filter(t => !t.completed);
    return list.sort((a, b) => {
      // Completed last
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // Then by priority
      const pri = { high: 0, normal: 1, low: 2 };
      const pa = pri[a.priority || 'normal'], pb = pri[b.priority || 'normal'];
      if (pa !== pb) return pa - pb;
      // Then by due date
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [tasks, filterProject, showCompleted]);

  const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
  const removeProject = (id) => {
    if (!confirm('Projekt löschen? Aufgaben bleiben erhalten.')) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: null } : t));
  };
  const toggleProjectStatus = (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'done' : 'active' } : p));
  };

  return (
    <div className="px-5 pt-2 pb-32 dm-scroll">
      <div className="mb-4 mt-2">
        <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Organisation</div>
        <h1 className="display text-3xl mt-0.5" style={{ fontWeight: 500 }}>Aufgaben</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('tasks')}
          className={`dm-chip ${view === 'tasks' ? 'dm-chip-active' : ''}`}>
          <CheckSquare size={12} /> Aufgaben ({tasks.filter(t => !t.completed).length})
        </button>
        <button onClick={() => setView('projects')}
          className={`dm-chip ${view === 'projects' ? 'dm-chip-active' : ''}`}>
          <Briefcase size={12} /> Projekte ({projects.filter(p => p.status === 'active').length})
        </button>
      </div>

      {view === 'tasks' ? (
        <>
          {/* Project filter pills */}
          {projects.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 dm-scroll" style={{ flexWrap: 'nowrap' }}>
              <button onClick={() => setFilterProject(null)}
                className={`dm-chip ${filterProject === null ? 'dm-chip-active' : ''}`} style={{ flexShrink: 0 }}>
                Alle
              </button>
              {projects.filter(p => p.status === 'active').map(p => (
                <button key={p.id} onClick={() => setFilterProject(p.id)}
                  className={`dm-chip ${filterProject === p.id ? 'dm-chip-active' : ''}`} style={{ flexShrink: 0 }}>
                  <span style={{ color: filterProject === p.id ? '#0A0F0B' : p.color }}>●</span> {p.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs flex items-center gap-1.5" style={{ color: 'var(--ink-3)' }}>
              <Check size={12} /> {showCompleted ? 'Erledigte ausblenden' : 'Erledigte zeigen'}
            </button>
            <button onClick={() => openAdd('task')} className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Neu
            </button>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Keine Aufgaben"
              hint="Tippe auf + um zu beginnen" />
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(t => {
                const proj = projects.find(p => p.id === t.projectId);
                const overdue = !t.completed && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div key={t.id} className="dm-card p-4 flex items-start gap-3"
                    style={t.completed ? { opacity: 0.55 } : {}}>
                    <button onClick={() => toggleTask(t.id)}
                      className="flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ width: 22, height: 22, borderRadius: 6,
                        border: `1.5px solid ${t.completed ? 'var(--green)' : (overdue ? 'var(--red)' : 'var(--ink-4)')}`,
                        background: t.completed ? 'var(--green)' : 'transparent' }}>
                      {t.completed && <Check size={13} style={{ color: 'var(--bg)' }} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ fontWeight: 500,
                        textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                      {t.notes && <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>{t.notes}</div>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {t.dueDate && (
                          <span className="text-xs flex items-center gap-1"
                            style={{ color: overdue ? 'var(--red)' : 'var(--ink-3)' }}>
                            <Calendar size={11} />
                            {new Date(t.dueDate).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {proj && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                          <span style={{ color: proj.color }}>●</span> {proj.name}
                        </span>}
                        {t.priority === 'high' && <Flag size={11} style={{ color: 'var(--accent)' }} />}
                        {t.dueDate && !t.completed && (
                          <a href={gcalUrl({ title: t.title, details: t.notes || '', startISO: t.dueDate })}
                            target="_blank" rel="noreferrer"
                            className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            <CalendarPlus size={11} /> GCal
                          </a>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeTask(t.id)} className="p-1 -mr-1 -mt-1">
                      <Trash2 size={14} style={{ color: 'var(--ink-4)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-end mb-3">
            <button onClick={() => openAdd('project')} className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Neu
            </button>
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={Briefcase} title="Keine Projekte"
              hint="Erstelle Projekte um Aufgaben zu gruppieren" />
          ) : (
            <div className="space-y-3">
              {projects.map(p => {
                const projectTasks = tasks.filter(t => t.projectId === p.id);
                const completed = projectTasks.filter(t => t.completed).length;
                const total = projectTasks.length;
                const pct = total > 0 ? (completed / total) * 100 : 0;
                const openTasks = total - completed;
                return (
                  <div key={p.id} className="dm-card p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <button onClick={() => setSelectedProject(p)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                        <span className="display text-base truncate" style={{ fontWeight: 500,
                          textDecoration: p.status === 'done' ? 'line-through' : 'none',
                          opacity: p.status === 'done' ? 0.5 : 1 }}>{p.name}</span>
                        <ChevronRight size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleProjectStatus(p.id)}
                          className="p-1.5" style={{ borderRadius: 6 }}>
                          <Check size={14} style={{ color: p.status === 'done' ? 'var(--green)' : 'var(--ink-4)' }} />
                        </button>
                        <button onClick={() => removeProject(p.id)} className="p-1.5">
                          <Trash2 size={14} style={{ color: 'var(--ink-4)' }} />
                        </button>
                      </div>
                    </div>
                    {p.notes && <div className="text-xs mb-2" style={{ color: 'var(--ink-3)' }}>{p.notes}</div>}
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--ink-3)' }}>{completed}/{total} erledigt · {openTasks} offen</span>
                      {p.deadline && (
                        <span style={{ color: 'var(--ink-3)' }}>
                          <Calendar size={10} className="inline mr-1" />
                          {new Date(p.deadline).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: p.color, transition: 'width 0.3s' }} />
                    </div>
                    <button onClick={() => openAddInProject(p.id)}
                      className="mt-3 dm-chip w-full justify-center" style={{ padding: '8px', fontSize: 12 }}>
                      <Plus size={12} /> Aufgabe zu {p.name}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedProject && (
        <ProjectDetailSheet project={selectedProject}
          tasks={tasks.filter(t => t.projectId === selectedProject.id)}
          onClose={() => setSelectedProject(null)}
          toggleTask={toggleTask}
          removeTask={removeTask}
          openAddInProject={openAddInProject} />
      )}
    </div>
  );
};

const ProjectDetailSheet = ({ project, tasks, onClose, toggleTask, removeTask, openAddInProject }) => {
  const open = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);
  return (
    <Sheet open={true} onClose={onClose} title={project.name} height="92vh">
      <div className="space-y-4">
        <div className="dm-card-hl p-4" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%',
            background: `radial-gradient(circle, ${project.color}26 0%, transparent 70%)` }} />
          <div className="flex items-center gap-2 mb-2">
            <div style={{ width: 12, height: 12, borderRadius: 4, background: project.color }} />
            <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Projekt</span>
          </div>
          <div className="display text-2xl mb-1" style={{ fontWeight: 600 }}>{project.name}</div>
          {project.notes && <div className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>{project.notes}</div>}
          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>
            <span>{done.length}/{tasks.length} erledigt</span>
            {project.deadline && <span>· Deadline: {new Date(project.deadline).toLocaleDateString('de-CH')}</span>}
          </div>
        </div>

        <button onClick={() => { onClose(); openAddInProject(project.id); }} className="dm-btn-primary flex items-center justify-center gap-2">
          <Plus size={16} /> Neue Aufgabe in {project.name}
        </button>

        <div>
          <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Offen ({open.length})
          </div>
          {open.length === 0 ? (
            <div className="dm-card p-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
              Keine offenen Aufgaben
            </div>
          ) : (
            <div className="space-y-2">
              {open.map(t => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div key={t.id} className="dm-card p-3 flex items-start gap-3">
                    <button onClick={() => toggleTask(t.id)} className="flex-shrink-0 mt-0.5"
                      style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${overdue ? 'var(--red)' : 'var(--ink-4)'}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ fontWeight: 500 }}>{t.title}</div>
                      {t.notes && <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{t.notes}</div>}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {t.dueDate && (
                          <span className="text-xs flex items-center gap-1"
                            style={{ color: overdue ? 'var(--red)' : 'var(--ink-3)' }}>
                            <Calendar size={10} /> {new Date(t.dueDate).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {t.priority === 'high' && <Flag size={11} style={{ color: 'var(--accent)' }} />}
                      </div>
                    </div>
                    <button onClick={() => removeTask(t.id)} className="p-1">
                      <Trash2 size={13} style={{ color: 'var(--ink-4)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {done.length > 0 && (
          <div>
            <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              Erledigt ({done.length})
            </div>
            <div className="space-y-2">
              {done.slice(0, 10).map(t => (
                <div key={t.id} className="dm-card p-3 flex items-center gap-3" style={{ opacity: 0.55 }}>
                  <div className="flex-shrink-0 flex items-center justify-center"
                    style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--green)' }}>
                    <Check size={12} style={{ color: 'var(--bg)' }} strokeWidth={3} />
                  </div>
                  <div className="flex-1 text-sm" style={{ textDecoration: 'line-through' }}>{t.title}</div>
                  <button onClick={() => toggleTask(t.id)} className="p-1">
                    <RefreshCw size={12} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────
// HITCHTRACKER VIEW
// ─────────────────────────────────────────────────────────────
const HITCH_STATUS = {
  new: { label: 'Neu', color: 'var(--blue)' },
  warm: { label: 'Warm', color: 'var(--gold)' },
  hot: { label: 'Hot', color: 'var(--accent)' },
  meeting: { label: 'Treffen', color: 'var(--violet)' },
  closed: { label: 'Closed', color: 'var(--green)' },
  cold: { label: 'Cold', color: 'var(--ink-4)' }
};

const HitchView = ({ contacts, setContacts, attempts, setAttempts, openAdd, currency, coachChat, setCoachChat, userName }) => {
  const [hitchTab, setHitchTab] = useState('contacts'); // contacts | coach
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [statusPickerFor, setStatusPickerFor] = useState(null); // contact id

  const filtered = useMemo(() => {
    let list = [...contacts];
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const aDue = a.followUpDate && new Date(a.followUpDate) <= new Date();
      const bDue = b.followUpDate && new Date(b.followUpDate) <= new Date();
      if (aDue !== bDue) return aDue ? -1 : 1;
      return new Date(b.metAt || 0) - new Date(a.metAt || 0);
    });
  }, [contacts, statusFilter, search]);

  // Stats
  const totalAttempts = attempts.length;
  const successAttempts = attempts.filter(a => a.outcome === 'success').length;
  const successRate = totalAttempts > 0 ? Math.round((successAttempts / totalAttempts) * 100) : 0;
  const thisWeekContacts = contacts.filter(c => daysAgo(c.metAt) <= 7).length;
  const ratedContacts = contacts.filter(c => c.rating >= 5);
  const avgRating = ratedContacts.length > 0
    ? (ratedContacts.reduce((s, c) => s + Number(c.rating), 0) / ratedContacts.length).toFixed(1)
    : null;

  const removeContact = (id) => {
    if (!confirm('Kontakt wirklich löschen?')) return;
    setContacts(prev => prev.filter(c => c.id !== id));
    setAttempts(prev => prev.filter(a => a.contactId !== id));
    setSelectedContact(null);
  };

  const updateContact = (id, updates) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (selectedContact?.id === id) setSelectedContact(prev => ({ ...prev, ...updates }));
  };

  const setContactStatus = (id, newStatus) => {
    updateContact(id, { status: newStatus });
    setStatusPickerFor(null);
  };

  const addAttempt = (contactId, outcome, notes) => {
    setAttempts(prev => [...prev, { id: uid(), contactId, date: now(), outcome, notes }]);
  };

  return (
    <div className="px-5 pt-2 pb-32 dm-scroll">
      <div className="mb-4 mt-2 flex items-end justify-between">
        <div>
          <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Cold Approach</div>
          <h1 className="display text-3xl mt-0.5" style={{ fontWeight: 500 }}>Hitchtracker</h1>
        </div>
        <div className="text-right">
          <div className="display num text-2xl" style={{ fontWeight: 600, color: 'var(--accent)' }}>{successRate}%</div>
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Erfolg</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setHitchTab('contacts')}
          className={`dm-chip ${hitchTab === 'contacts' ? 'dm-chip-active' : ''}`}>
          <Users size={12} /> Kontakte ({contacts.length})
        </button>
        <button onClick={() => setHitchTab('coach')}
          className={`dm-chip ${hitchTab === 'coach' ? 'dm-chip-active' : ''}`}>
          <Bot size={12} /> Coach
        </button>
      </div>

      {hitchTab === 'contacts' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="dm-card p-3 text-center">
              <div className="num text-base" style={{ fontWeight: 600 }}>{contacts.length}</div>
              <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Total</div>
            </div>
            <div className="dm-card p-3 text-center">
              <div className="num text-base" style={{ fontWeight: 600, color: 'var(--accent)' }}>{thisWeekContacts}</div>
              <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Woche</div>
            </div>
            <div className="dm-card p-3 text-center">
              <div className="num text-base" style={{ fontWeight: 600 }}>{totalAttempts}</div>
              <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Versuche</div>
            </div>
            <div className="dm-card p-3 text-center">
              <div className="num text-base flex items-center justify-center gap-0.5" style={{ fontWeight: 600, color: avgRating ? 'var(--accent)' : 'var(--ink-3)' }}>
                {avgRating ? <><Star size={11} fill="currentColor" />{avgRating}</> : '—'}
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Ø Rating</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-4)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..." className="dm-input" style={{ paddingLeft: 38 }} />
          </div>

          {/* Status filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 dm-scroll" style={{ flexWrap: 'nowrap' }}>
            <button onClick={() => setStatusFilter('all')}
              className={`dm-chip ${statusFilter === 'all' ? 'dm-chip-active' : ''}`} style={{ flexShrink: 0 }}>
              Alle
            </button>
            {Object.entries(HITCH_STATUS).map(([k, v]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`dm-chip ${statusFilter === k ? 'dm-chip-active' : ''}`} style={{ flexShrink: 0 }}>
                <span style={{ color: statusFilter === k ? '#0A0F0B' : v.color }}>●</span> {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{filtered.length} Kontakte</span>
            <button onClick={() => openAdd('contact')} className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Hinzufügen
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="Keine Kontakte"
              hint={search ? 'Keine Treffer' : 'Tippe auf + um zu beginnen'} />
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const due = c.followUpDate && new Date(c.followUpDate) <= new Date() && c.status !== 'closed';
                const status = HITCH_STATUS[c.status || 'new'];
                return (
                  <div key={c.id} className="dm-card p-4"
                    style={due ? { borderColor: 'var(--accent-line)', background: 'linear-gradient(180deg, var(--accent-soft), transparent)' } : {}}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0" onClick={() => setSelectedContact(c)} style={{ cursor: 'pointer' }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm truncate" style={{ fontWeight: 500 }}>{c.name}</span>
                          {c.age && <span className="text-xs" style={{ color: 'var(--ink-3)' }}>· {c.age}</span>}
                          {c.rating >= 5 && (
                            <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              <Star size={10} fill="currentColor" />{c.rating}
                            </span>
                          )}
                        </div>
                        <div className="text-xs flex items-center gap-2 mt-0.5 flex-wrap" style={{ color: 'var(--ink-3)' }}>
                          {c.where && <span>{c.where}</span>}
                          {c.location && <><span>·</span><MapPin size={10} /> {c.location}</>}
                          {c.metAt && <span>· {daysAgo(c.metAt)}d</span>}
                        </div>
                        {c.notes && <div className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--ink-3)' }}>{c.notes}</div>}
                        {due && (
                          <div className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            <Clock size={10} /> Follow-up fällig
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setStatusPickerFor(statusPickerFor === c.id ? null : c.id); }}
                          className="dm-chip" style={{ padding: '4px 10px', fontSize: 11, color: status.color, borderColor: status.color + '66', cursor: 'pointer' }}>
                          ● {status.label}
                        </button>
                        <button onClick={() => setSelectedContact(c)} className="p-1">
                          <ChevronRight size={14} style={{ color: 'var(--ink-4)' }} />
                        </button>
                      </div>
                    </div>
                    {/* Status picker */}
                    {statusPickerFor === c.id && (
                      <div className="mt-3 pt-3 dm-fade" style={{ borderTop: '1px solid var(--line-soft)' }}>
                        <div className="text-xs mb-2" style={{ color: 'var(--ink-3)' }}>Status ändern:</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(HITCH_STATUS).map(([k, v]) => (
                            <button key={k} onClick={(e) => { e.stopPropagation(); setContactStatus(c.id, k); }}
                              className="dm-chip" style={{ padding: '6px 10px', fontSize: 11,
                                color: c.status === k ? '#0A0F0B' : v.color,
                                background: c.status === k ? v.color : 'var(--bg-2)',
                                borderColor: v.color + '66' }}>
                              ● {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Contact detail sheet */}
          {selectedContact && (
            <ContactDetail contact={selectedContact} onClose={() => setSelectedContact(null)}
              onUpdate={(u) => updateContact(selectedContact.id, u)}
              onRemove={() => removeContact(selectedContact.id)}
              attempts={attempts.filter(a => a.contactId === selectedContact.id)}
              onAddAttempt={(o, n) => addAttempt(selectedContact.id, o, n)} />
          )}
        </>
      )}

      {hitchTab === 'coach' && (
        <AIAssistant mode="hitch" data={{ contacts, attempts }} userName={userName}
          chat={coachChat} setChat={setCoachChat} />
      )}
    </div>
  );
};

const ContactDetail = ({ contact, onClose, onUpdate, onRemove, attempts, onAddAttempt }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact);
  const [newAttempt, setNewAttempt] = useState({ outcome: 'response', notes: '' });
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState(null);
  const [copied, setCopied] = useState(false);

  const save = () => {
    onUpdate(draft);
    setEditing(false);
  };

  const status = HITCH_STATUS[contact.status || 'new'];

  const generateNextMove = async () => {
    setMoveLoading(true);
    setMoveError(null);
    try {
      const lastAttempt = [...attempts].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const ctx = `KONTAKT:
Name: ${contact.name}${contact.age ? ', '+contact.age+' Jahre' : ''}
Status: ${HITCH_STATUS[contact.status || 'new'].label}
Rating: ${contact.rating ? contact.rating + '/10' : 'unbekannt'}
Beziehungsstatus: ${contact.relationship || 'unbekannt'}
Wo getroffen: ${contact.where || 'unbekannt'}
Quelle: ${contact.source || 'unbekannt'}
Sprache: ${contact.language || 'Deutsch'}
Beruf: ${contact.occupation || '—'}
Interessen: ${contact.interests || '—'}
Aufgefallen: ${contact.appearance || '—'}
Getroffen: ${contact.metAt ? 'vor ' + daysAgo(contact.metAt) + ' Tagen' : 'unbekannt'}
${contact.followUpDate ? 'Geplantes Follow-up: ' + new Date(contact.followUpDate).toLocaleDateString('de-CH') : ''}

NOTIZEN: ${contact.notes || '—'}

VERLAUF (${attempts.length} Versuche):
${attempts.slice(-5).reverse().map(a => `- ${new Date(a.date).toLocaleDateString('de-CH')} (vor ${daysAgo(a.date)}d): ${a.outcome}${a.notes ? ' — '+a.notes : ''}`).join('\n') || '— noch keine Versuche —'}

Letzte Interaktion: ${lastAttempt ? 'vor '+daysAgo(lastAttempt.date)+' Tagen ('+lastAttempt.outcome+')' : 'noch keine Nachricht/Treffen'}`;

      const response = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: `Du bist der weltbeste Dating- und Kommunikationscoach mit dem kombinierten Wissen von:
- Modernen Kommunikationstrainern: Matthew Hussey, Adam LoDolce, Tripp Advice
- Tiefenpsychologen: Esther Perel (Beziehungsdynamiken), Dr. Sue Johnson (Bindung), John Gottman (Beziehungserfolg)
- Praktikern: David Wygant (Authentizität), Marni Battista (Frauen-Psychologie)
- Klassischen Texten: "Models" von Mark Manson (early), "Attached" von Levine

PRINZIPIEN:
- Authentizität schlägt Tricks immer
- Mann investiert sichtbar — bedürftige Energie ist Gift
- Geduld bei warmen Leads, weniger Druck wenn cold/ghosted
- Texte: kurz, persönlich, Charakter und Spannung — kein Vortrag
- Beim Date: präsent, neugierig, ehrlich, leicht
- Eskalation natürlich mit Calibration auf ihre Signale
- Nie drängen — immer einladen
- Frauen wollen sich besonders fühlen, nicht eine von vielen
- Timing ist alles: 2-3 Tage Pause sind oft besser als sofort

Gib EINE konkrete Empfehlung für den nächsten Move basierend auf den Daten.

Antworte AUSSCHLIESSLICH mit JSON (kein Markdown):
{
  "action": "Was tun (max 8 Wörter, prägnant)",
  "details": "Konkrete 2-3-Satz Anleitung mit Begründung",
  "messagePreview": "Falls Text/Nachricht empfohlen: konkreter Vorschlag auf Deutsch (du-Form), 1-3 Sätze. Sonst null",
  "timing": "Wann (z.B. 'jetzt', 'in 2 Tagen', 'am Wochenende', 'noch warten')",
  "reasoning": "Warum dieser Move (1-2 Sätze, Coach-Insight)"
}`,
          messages: [{ role: "user", content: ctx }]
        })
      });
      if (!response.ok) throw new Error('API ' + response.status);
      const data = await response.json();
      const text = data.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      onUpdate({ nextMove: { ...parsed, generatedAt: now() } });
    } catch (e) {
      setMoveError(e.message?.includes('JSON') ? 'Antwort unverständlich, nochmal versuchen' : 'Fehler: ' + (e.message || ''));
    } finally {
      setMoveLoading(false);
    }
  };

  const copyMessage = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <Sheet open={true} onClose={onClose} title={editing ? 'Bearbeiten' : contact.name} height="90vh">
      {!editing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="dm-chip" style={{ color: status.color, borderColor: status.color + '66' }}>
              ● {status.label}
            </span>
            {contact.rating >= 5 && (
              <span className="dm-chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)', fontWeight: 600 }}>
                ★ {contact.rating}/10
              </span>
            )}
            {contact.age && (
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>{contact.age} J.</span>
            )}
            {contact.metAt && (
              <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
                · {new Date(contact.metAt).toLocaleDateString('de-CH')}
              </span>
            )}
          </div>

          {/* AI Next Move */}
          <div className="dm-card-hl p-4" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%',
              background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)' }} />
            <div className="flex items-center justify-between mb-3" style={{ position: 'relative' }}>
              <span className="text-xs uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.08em', fontWeight: 600 }}>
                Coach: Nächster Move
              </span>
              {contact.nextMove && (
                <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                  {daysAgo(contact.nextMove.generatedAt) === 0 ? 'heute' : daysAgo(contact.nextMove.generatedAt) + 'd alt'}
                </span>
              )}
            </div>

            {contact.nextMove ? (
              <div style={{ position: 'relative' }}>
                <div className="display text-base mb-1" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {contact.nextMove.action}
                </div>
                <div className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>
                  Timing: <span style={{ color: 'var(--accent)' }}>{contact.nextMove.timing}</span>
                </div>
                <div className="text-sm mb-3" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {contact.nextMove.details}
                </div>

                {contact.nextMove.messagePreview && (
                  <div className="dm-card p-3 mb-3" style={{ background: 'var(--bg-2)', borderColor: 'var(--accent-line)' }}>
                    <div className="text-xs uppercase mb-1.5" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>
                      Vorschlag Text
                    </div>
                    <div className="text-sm mb-2" style={{ fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.5 }}>
                      {contact.nextMove.messagePreview}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyMessage(contact.nextMove.messagePreview)}
                        className="text-xs" style={{ color: copied ? 'var(--green)' : 'var(--accent)', fontWeight: 600 }}>
                        {copied ? '✓ Kopiert' : 'Text kopieren'}
                      </button>
                      {contact.phone && (
                        <a href={`sms:${contact.phone}&body=${encodeURIComponent(contact.nextMove.messagePreview)}`}
                          className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          · Per SMS senden
                        </a>
                      )}
                      {contact.whatsapp && (
                        <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(contact.nextMove.messagePreview)}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          · WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs italic mb-3" style={{ color: 'var(--ink-4)', lineHeight: 1.4 }}>
                  Coach-Insight: {contact.nextMove.reasoning}
                </div>

                <button onClick={generateNextMove} disabled={moveLoading}
                  className="dm-btn-ghost w-full text-xs"
                  style={{ opacity: moveLoading ? 0.5 : 1 }}>
                  {moveLoading ? 'Coach analysiert...' : 'Neu generieren'}
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div className="text-xs mb-3" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Lass den Coach den optimalen nächsten Schritt empfehlen — basierend auf Status, Verlauf, Timing und Kommunikations-Best-Practices.
                </div>
                <button onClick={generateNextMove} disabled={moveLoading}
                  className="dm-btn-primary w-full"
                  style={{ opacity: moveLoading ? 0.6 : 1 }}>
                  {moveLoading ? 'Coach analysiert...' : 'Nächsten Move empfehlen'}
                </button>
              </div>
            )}

            {moveError && (
              <div className="text-xs mt-2" style={{ color: 'var(--red)' }}>
                {moveError}
              </div>
            )}
          </div>

          {/* Quick contact actions */}
          {(contact.phone || contact.email || contact.instagram) && (
            <div className="grid grid-cols-3 gap-2">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="dm-btn-ghost text-center text-xs flex flex-col items-center gap-1 py-3">
                  Anruf
                </a>
              )}
              {contact.phone && (
                <a href={`sms:${contact.phone}`} className="dm-btn-ghost text-center text-xs flex flex-col items-center gap-1 py-3">
                  <MessageCircle size={16} style={{ color: 'var(--accent)' }} /> SMS
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="dm-btn-ghost text-center text-xs flex flex-col items-center gap-1 py-3">
                  <Mail size={16} style={{ color: 'var(--accent)' }} /> E-Mail
                </a>
              )}
              {contact.instagram && (
                <a href={`https://instagram.com/${contact.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                  className="dm-btn-ghost text-center text-xs flex flex-col items-center gap-1 py-3">
                  <ExternalLink size={16} style={{ color: 'var(--accent)' }} /> Insta
                </a>
              )}
            </div>
          )}

          {/* Details */}
          <div className="dm-card p-4 space-y-3">
            {contact.where && <Detail label="Wo getroffen" value={contact.where} />}
            {contact.location && <Detail label="Stadt" value={<><MapPin size={12} className="inline mr-1" />{contact.location}</>} />}
            {contact.source && <Detail label="Quelle" value={contact.source} />}
            {contact.relationship && <Detail label="Status" value={contact.relationship} />}
            {contact.occupation && <Detail label="Beruf" value={contact.occupation} />}
            {contact.height && <Detail label="Grösse" value={`${contact.height} cm`} />}
            {contact.language && <Detail label="Sprache" value={contact.language} />}
            {contact.interests && <Detail label="Interessen" value={contact.interests} />}
            {contact.appearance && <Detail label="Aufgefallen" value={contact.appearance} />}
            {contact.phone && <Detail label="Telefon" value={<a href={`tel:${contact.phone}`} style={{ color: 'var(--accent)' }}>{contact.phone}</a>} />}
            {contact.email && <Detail label="E-Mail" value={<a href={`mailto:${contact.email}`} style={{ color: 'var(--accent)' }}>{contact.email}</a>} />}
            {contact.instagram && <Detail label="Instagram" value={contact.instagram} />}
            {contact.snapchat && <Detail label="Snapchat" value={contact.snapchat} />}
            {contact.whatsapp && <Detail label="WhatsApp" value={<a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{contact.whatsapp}</a>} />}
            {contact.telegram && <Detail label="Telegram" value={contact.telegram} />}
            {contact.tiktok && <Detail label="TikTok" value={contact.tiktok} />}
            {contact.followUpDate && (
              <Detail label="Follow-up" value={
                <div className="flex items-center gap-2">
                  <span>{new Date(contact.followUpDate).toLocaleDateString('de-CH')}</span>
                  <a href={gcalUrl({ title: `Follow-up: ${contact.name}`, details: contact.notes || '', startISO: contact.followUpDate })}
                    target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    <CalendarPlus size={11} /> GCal
                  </a>
                </div>
              } />
            )}
          </div>

          {contact.notes && (
            <div>
              <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Notizen</div>
              <div className="dm-card p-4 text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{contact.notes}</div>
            </div>
          )}

          {/* Attempts log */}
          <div>
            <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Verlauf ({attempts.length})</div>
            <div className="dm-card p-3 space-y-3">
              <div className="flex gap-2">
                <select value={newAttempt.outcome} onChange={e => setNewAttempt({ ...newAttempt, outcome: e.target.value })}
                  className="dm-input" style={{ padding: '10px 14px', flex: '0 0 auto', width: 130 }}>
                  <option value="response">Antwort</option>
                  <option value="success">Erfolg</option>
                  <option value="ghosted">Geghostet</option>
                  <option value="rejected">Abgelehnt</option>
                </select>
                <input value={newAttempt.notes} onChange={e => setNewAttempt({ ...newAttempt, notes: e.target.value })}
                  placeholder="Notiz..." className="dm-input" style={{ padding: '10px 14px', flex: 1 }} />
                <button onClick={() => { onAddAttempt(newAttempt.outcome, newAttempt.notes); setNewAttempt({ outcome: 'response', notes: '' }); }}
                  className="dm-btn-primary" style={{ width: 'auto', padding: '10px 14px' }}>
                  <Plus size={16} />
                </button>
              </div>
              {attempts.sort((a, b) => new Date(b.date) - new Date(a.date)).map(a => (
                <div key={a.id} className="flex items-start gap-2 pt-2" style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: a.outcome === 'success' ? 'var(--green)' : a.outcome === 'response' ? 'var(--accent)' : 'var(--red)' }} />
                  <div className="flex-1">
                    <div className="text-xs flex items-center gap-2">
                      <span style={{ fontWeight: 500 }}>{a.outcome}</span>
                      <span style={{ color: 'var(--ink-3)' }}>{new Date(a.date).toLocaleDateString('de-CH')}</span>
                    </div>
                    {a.notes && <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{a.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(true)} className="dm-btn-ghost flex-1 flex items-center justify-center gap-1.5">
              <Edit3 size={14} /> Bearbeiten
            </button>
            <button onClick={onRemove} className="dm-btn-ghost"
              style={{ color: 'var(--red)', borderColor: 'var(--red)', flex: '0 0 auto', padding: '12px 16px' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <ContactForm draft={draft} setDraft={setDraft} onSave={save} onCancel={() => { setDraft(contact); setEditing(false); }} />
      )}
    </Sheet>
  );
};

const Detail = ({ label, value }) => (
  <div className="flex justify-between items-start gap-3 text-sm">
    <span style={{ color: 'var(--ink-3)' }}>{label}</span>
    <span className="text-right" style={{ color: 'var(--ink)' }}>{value}</span>
  </div>
);

const ContactForm = ({ draft, setDraft, onSave, onCancel }) => {
  const [showMore, setShowMore] = useState(false);
  const update = (k, v) => setDraft({ ...draft, [k]: v });
  const rating = Number(draft.rating || 0);
  return (
    <div className="space-y-3">
      <Field label="Name *">
        <input value={draft.name || ''} onChange={e => update('name', e.target.value)} className="dm-input" />
      </Field>

      {/* Rating 5-10 */}
      <Field label={`Rating ${rating >= 5 ? rating : '—'}/10`}>
        <div className="flex gap-1.5">
          {[5, 6, 7, 8, 9, 10].map(n => (
            <button key={n} onClick={() => update('rating', rating === n ? 0 : n)}
              className="flex-1 flex items-center justify-center"
              style={{
                height: 40, borderRadius: 10, fontWeight: 600,
                background: rating >= n ? 'var(--accent)' : 'var(--bg-2)',
                color: rating >= n ? '#0A0F0B' : 'var(--ink-3)',
                border: '1px solid ' + (rating >= n ? 'var(--accent)' : 'var(--line)'),
                fontVariantNumeric: 'tabular-nums', fontSize: 14
              }}>
              {n}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select value={draft.status || 'new'} onChange={e => update('status', e.target.value)} className="dm-input">
            {Object.entries(HITCH_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Quelle">
          <select value={draft.source || ''} onChange={e => update('source', e.target.value)} className="dm-input">
            <option value="">—</option>
            <option>Cold Approach</option>
            <option>Café / Bar</option>
            <option>Club / Party</option>
            <option>Event</option>
            <option>Online / Dating App</option>
            <option>Empfehlung</option>
            <option>Sonstiges</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Alter">
          <input type="number" inputMode="numeric" min="16" max="99" value={draft.age || ''}
            onChange={e => update('age', e.target.value ? Number(e.target.value) : null)}
            className="dm-input num" placeholder="—" />
        </Field>
        <Field label="Beziehungsstatus">
          <select value={draft.relationship || ''} onChange={e => update('relationship', e.target.value)} className="dm-input">
            <option value="">—</option>
            <option>Single</option>
            <option>In Beziehung</option>
            <option>Kompliziert</option>
            <option>Unbekannt</option>
          </select>
        </Field>
      </div>

      <Field label="Wo getroffen / Setting">
        <input value={draft.where || ''} onChange={e => update('where', e.target.value)} className="dm-input"
          placeholder="z.B. Café Latte Art, Bahnhofstrasse, Tinder-Match" />
      </Field>

      <Field label="Ort / Stadt">
        <input value={draft.location || ''} onChange={e => update('location', e.target.value)} className="dm-input"
          placeholder="Zürich, Basel..." />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefon">
          <input type="tel" value={draft.phone || ''} onChange={e => update('phone', e.target.value)} className="dm-input" />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={draft.email || ''} onChange={e => update('email', e.target.value)} className="dm-input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Instagram">
          <input value={draft.instagram || ''} onChange={e => update('instagram', e.target.value)} className="dm-input" placeholder="@username" />
        </Field>
        <Field label="Snapchat">
          <input value={draft.snapchat || ''} onChange={e => update('snapchat', e.target.value)} className="dm-input" placeholder="username" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Getroffen am">
          <input type="date" value={(draft.metAt || '').slice(0, 10)} onChange={e => update('metAt', e.target.value || null)} className="dm-input" />
        </Field>
        <Field label="Follow-up">
          <input type="date" value={(draft.followUpDate || '').slice(0, 10)} onChange={e => update('followUpDate', e.target.value || null)} className="dm-input" />
        </Field>
      </div>

      {/* More fields toggle */}
      <button onClick={() => setShowMore(!showMore)}
        className="text-xs flex items-center gap-1.5" style={{ color: 'var(--accent)', fontWeight: 500 }}>
        {showMore ? '− Weniger Details' : '+ Mehr Details'}
      </button>

      {showMore && (
        <div className="space-y-3 dm-fade">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Beruf">
              <input value={draft.occupation || ''} onChange={e => update('occupation', e.target.value)} className="dm-input" />
            </Field>
            <Field label="Grösse (cm)">
              <input type="number" inputMode="numeric" min="140" max="220" value={draft.height || ''}
                onChange={e => update('height', e.target.value ? Number(e.target.value) : null)}
                className="dm-input num" placeholder="—" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="WhatsApp">
              <input type="tel" value={draft.whatsapp || ''} onChange={e => update('whatsapp', e.target.value)} className="dm-input" placeholder="+41..." />
            </Field>
            <Field label="Telegram">
              <input value={draft.telegram || ''} onChange={e => update('telegram', e.target.value)} className="dm-input" placeholder="@username" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TikTok">
              <input value={draft.tiktok || ''} onChange={e => update('tiktok', e.target.value)} className="dm-input" placeholder="@username" />
            </Field>
            <Field label="Sprache">
              <input value={draft.language || ''} onChange={e => update('language', e.target.value)} className="dm-input" placeholder="DE, EN..." />
            </Field>
          </div>
          <Field label="Interessen / Hobbies">
            <input value={draft.interests || ''} onChange={e => update('interests', e.target.value)} className="dm-input"
              placeholder="z.B. Yoga, Art, Reisen, Tech" />
          </Field>
          <Field label="Was ist mir aufgefallen / Beschreibung">
            <textarea value={draft.appearance || ''} onChange={e => update('appearance', e.target.value)}
              className="dm-input" rows={2} style={{ resize: 'none' }}
              placeholder="Optisch, Stil, Vibe — was ist mir besonders in Erinnerung geblieben" />
          </Field>
        </div>
      )}

      <Field label="Notizen / Gespräch">
        <textarea value={draft.notes || ''} onChange={e => update('notes', e.target.value)}
          className="dm-input" rows={4} style={{ resize: 'none' }}
          placeholder="Worüber haben wir geredet, gemeinsame Themen, Plan für nächsten Move..." />
      </Field>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="dm-btn-ghost flex-1">Abbrechen</button>
        <button onClick={onSave} className="dm-btn-primary flex-1" disabled={!draft.name}>Speichern</button>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <div className="text-xs mb-1.5" style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{label}</div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// AI ASSISTANT — global voice + text assistant
// ─────────────────────────────────────────────────────────────

// Voice hook: speech recognition + synthesis
const useVoice = () => {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const supported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const startListening = (onResult, onError) => {
    if (!supported) { onError?.('Sprache nicht unterstützt auf diesem Gerät'); return; }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR();
      r.lang = 'de-DE';
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e) => {
        const t = e.results[0][0].transcript;
        onResult?.(t);
      };
      r.onend = () => setListening(false);
      r.onerror = (e) => { setListening(false); onError?.(e.error || 'Fehler'); };
      recognitionRef.current = r;
      setListening(true);
      r.start();
    } catch (e) {
      setListening(false);
      onError?.(e.message);
    }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  const speak = (text) => {
    if (!speechSupported || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.05;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const stopSpeaking = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
  };

  return { listening, speaking, supported: !!supported, speechSupported,
    startListening, stopListening, speak, stopSpeaking };
};

// Strip markdown for cleaner voice output
const cleanForSpeech = (txt) => (txt || '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/\*(.*?)\*/g, '$1')
  .replace(/`(.*?)`/g, '$1')
  .replace(/^#+\s*/gm, '')
  .replace(/^-\s*/gm, '')
  .slice(0, 600); // don't read essays

const ASSISTANT_MODES = {
  hitch: {
    name: 'Dating Coach',
    short: 'Coach',
    icon: Heart,
    color: '#7DA888',
    intro: 'Spezialist für Cold Approach, Follow-ups und Date-Strategie. Kennt deine Hitchtracker-Daten.',
    prompts: [
      { label: 'Wie folge ich nach?', text: 'Ich habe sie getroffen aber noch nicht nachgefolgt. Wie schreibe ich am besten den ersten Text?' },
      { label: 'Sie hat geghostet', text: 'Sie hat aufgehört zu antworten. Soll ich nochmal schreiben? Was genau?' },
      { label: 'Erstes Date vorschlagen', text: 'Wie schlage ich ein erstes Date vor ohne komisch zu wirken?' },
      { label: 'Approach Opener', text: 'Gib mir 3 natürliche Opener-Ideen, kein Pickup-Stil.' },
      { label: 'Nervös vor Approach', text: 'Ich bin nervös bevor ich jemanden anspreche. Was hilft konkret?' },
      { label: 'Beim Date verhalten', text: 'Wie verhalte ich mich beim ersten Date — was sollte ich vermeiden?' },
      { label: 'Wann nächster Move?', text: 'Wann ist der richtige Zeitpunkt für den nächsten Move (Telegramm, Kuss, etc.)?' },
      { label: 'Stats Review', text: 'Schau dir meine Stats an und sag mir wo ich mich verbessern kann.' }
    ],
    systemRole: `Du bist der beste Dating- und Kommunikationscoach spezialisiert auf das Ansprechen von Frauen und die Kommunikation mit Frauen. Pragmatisch, ehrlich, ohne Pickup-Artist-Bullshit, ohne Manipulation.

DEIN ANSATZ:
- Konkrete, umsetzbare Ratschläge statt allgemeine Floskeln
- Kurze fokussierte Antworten (3-6 Sätze idealerweise, sprachgerecht)
- Nutze Stats und Kontakte für personalisierte Beratung
- Sei ehrlich auch wenn unbequem (z.B. wenn Pattern auf Bedürftigkeit deuten)
- Empfehle Inner Game (Selbstwert) genauso wie Outer Game (Technik)
- Beantworte Fragen zu: Cold Approach, Opener, Follow-up Timing, Texting, Date-Vorschlag, Date-Verhalten, Eskalation, Rejection Handling
- Antworte auf Deutsch, du-Form, locker aber kompetent
- Keine Emoji-Spam, max 1 Emoji pro Antwort wenn überhaupt
- Sei direkt und respektvoll gegenüber Frauen — nie objektifizierend`
  },
  money: {
    name: 'Buchhalter',
    short: 'Geld',
    icon: Wallet,
    color: '#5FA875',
    intro: 'Dein persönlicher Finanzberater. Behält dein Geld im Überblick und gibt Spar-Tipps.',
    prompts: [
      { label: 'Monatsübersicht', text: 'Gib mir eine kurze Zusammenfassung meines aktuellen Monats.' },
      { label: 'Wo kann ich sparen?', text: 'Wo kann ich basierend auf meinen Ausgaben am sinnvollsten sparen?' },
      { label: 'Abos prüfen', text: 'Schau dir meine Abos an. Gibt es welche die ich überdenken sollte?' },
      { label: 'Trend-Analyse', text: 'Wie entwickelt sich mein Cashflow über die letzten Wochen?' },
      { label: 'Budget-Check', text: 'Mache ich finanziell genug Fortschritt? Was sollte ich ändern?' },
      { label: 'Steuer-Reminder', text: 'Was muss ich für die Steuern beachten und vorbereiten?' }
    ],
    systemRole: `Du bist ein erfahrener pragmatischer Finanzberater und Buchhalter. Du kennst die Schweizer Verhältnisse (CHF, Krankenkasse, Steuern, etc.).

DEIN ANSATZ:
- Konkrete Zahlen und Empfehlungen basierend auf den User-Daten
- Identifiziere Sparpotenziale, ungewöhnliche Ausgabenmuster, und Cashflow-Risiken
- Kurze klare Antworten (3-6 Sätze, sprachgerecht)
- Sei ehrlich wenn etwas finanziell ungesund läuft
- Bei Fragen zu Investments / Steuern: gib praktische Hinweise aber erinnere dass du keine Anlage- oder Steuerberatung im rechtlichen Sinn ersetzt
- Antworte auf Deutsch, du-Form, kompetent aber zugänglich
- Verwende Schweizer Franken (CHF), Schweizer Schreibweise, vermeide Emojis`
  },
  tasks: {
    name: 'Task Coach',
    short: 'Tasks',
    icon: CheckSquare,
    color: '#6FA0BC',
    intro: 'Hilft dir Aufgaben zu priorisieren, Deadlines einzuhalten und produktiv zu bleiben.',
    prompts: [
      { label: 'Was ist wichtig heute?', text: 'Was sollte ich heute zuerst angehen?' },
      { label: 'Überfällige Aufgaben', text: 'Welche Aufgaben sind überfällig und wie hole ich sie auf?' },
      { label: 'Projekt-Status', text: 'Wie steht es um meine aktiven Projekte?' },
      { label: 'Wochenplan', text: 'Hilf mir die kommenden 7 Tage zu strukturieren.' },
      { label: 'Reminder setzen', text: 'Welche meiner Aufgaben brauchen einen festen Termin? Schlage Deadlines vor.' },
      { label: 'Fokus heute', text: 'Ich habe wenig Energie heute. Was sind die 1-2 wichtigsten Dinge?' }
    ],
    systemRole: `Du bist ein produktiver Task- und Projekt-Coach. Hilfst dem User, Aufgaben zu priorisieren, Deadlines zu setzen und Fortschritt zu machen.

DEIN ANSATZ:
- Klare Priorisierung (Eisenhower-ähnlich): wichtig vs. dringend
- Konkrete Vorschläge basierend auf den aktuellen Aufgaben und Projekten
- Schlage konkrete Deadlines vor wenn welche fehlen
- Erinnere an überfällige Aufgaben — direkt aber nicht moralisierend
- Kurze fokussierte Antworten (3-6 Sätze, sprachgerecht)
- Antworte auf Deutsch, du-Form, motivierend aber realistisch
- Vermeide Emojis und Floskeln`
  }
};

const AIAssistant = ({ mode, data, chat, setChat, userName, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // auto-speak responses
  const [voiceError, setVoiceError] = useState(null);
  const scrollRef = useRef(null);
  const v = useVoice();
  const cfg = ASSISTANT_MODES[mode] || ASSISTANT_MODES.tasks;
  const Icon = cfg.icon;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, loading]);

  // Stop speaking when closing
  useEffect(() => () => v.stopSpeaking(), []);

  const buildContext = () => {
    if (mode === 'hitch') {
      const { contacts = [], attempts = [] } = data;
      const total = contacts.length;
      const byStatus = {};
      contacts.forEach(c => { byStatus[c.status || 'new'] = (byStatus[c.status || 'new'] || 0) + 1; });
      const successRate = attempts.length > 0
        ? Math.round((attempts.filter(a => a.outcome === 'success').length / attempts.length) * 100) : 0;
      const rated = contacts.filter(c => c.rating >= 5);
      const avgRating = rated.length > 0 ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) : 'n/a';
      const recent = contacts.sort((a, b) => new Date(b.metAt || 0) - new Date(a.metAt || 0)).slice(0, 5)
        .map(c => `${c.name}${c.age ? ' ('+c.age+')' : ''}${c.rating ? ' ⭐'+c.rating : ''} — ${HITCH_STATUS[c.status || 'new'].label}, vor ${daysAgo(c.metAt)}d, ${c.where || c.location || '?'}${c.notes ? ' — ' + c.notes.slice(0, 80) : ''}`);
      const recentAttempts = attempts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
        .map(a => { const c = contacts.find(x => x.id === a.contactId); return `${c?.name || '?'}: ${a.outcome}${a.notes ? ' — ' + a.notes.slice(0, 60) : ''}`; });
      return `User${userName ? ': ' + userName : ''} (Hitchtracker Cold Approach)
STATS: ${total} Kontakte, Status: ${Object.entries(byStatus).map(([k, v]) => HITCH_STATUS[k].label+': '+v).join(', ')}, ${attempts.length} Versuche, ${successRate}% Erfolg, Ø Rating ${avgRating}
LETZTE 5 KONTAKTE:\n${recent.join('\n') || '—'}
LETZTE 5 INTERAKTIONEN:\n${recentAttempts.join('\n') || '—'}`;
    }
    if (mode === 'money') {
      const { transactions = [], fixed = [], currency = 'CHF' } = data;
      const monthVarInc = transactions.filter(t => t.type === 'income' && sameMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
      const monthVarExp = transactions.filter(t => t.type === 'expense' && sameMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
      const fixInc = fixed.filter(f => f.type === 'income' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
      const fixExp = fixed.filter(f => f.type === 'expense' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
      const monthInc = monthVarInc + fixInc, monthExp = monthVarExp + fixExp;
      const subs = fixed.filter(f => f.category === 'Abonnement' && f.active !== false);
      const subsTotal = subs.reduce((s, f) => s + Number(f.amount || 0), 0);
      const fixedList = fixed.filter(f => f.active !== false).map(f => `  ${f.type === 'income' ? '+' : '-'}${f.amount} ${currency} ${f.name} (${f.category}${f.dayOfMonth ? ', am '+f.dayOfMonth+'.' : ''})`);
      const recentTx = transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)
        .map(t => `  ${t.type === 'income' ? '+' : '-'}${t.amount} ${currency} ${t.description || t.category} (${new Date(t.date).toLocaleDateString('de-CH')})`);
      return `User${userName ? ': ' + userName : ''} (Schweiz, ${currency})
AKTUELLER MONAT: Einnahmen ${monthInc.toFixed(0)}, Ausgaben ${monthExp.toFixed(0)}, Netto ${(monthInc - monthExp).toFixed(0)}
FIXKOSTEN (monatlich): Einnahmen ${fixInc.toFixed(0)}, Ausgaben ${fixExp.toFixed(0)}, davon ${subs.length} Abos (${subsTotal.toFixed(0)}/Monat)
ALLE FIXKOSTEN:\n${fixedList.join('\n') || '—'}
LETZTE 8 BUCHUNGEN:\n${recentTx.join('\n') || '—'}`;
    }
    if (mode === 'tasks') {
      const { tasks = [], projects = [] } = data;
      const open = tasks.filter(t => !t.completed);
      const overdue = open.filter(t => t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0)));
      const today = open.filter(t => t.dueDate && sameDay(t.dueDate));
      const noDate = open.filter(t => !t.dueDate);
      const projList = projects.filter(p => p.status === 'active').map(p => {
        const pTasks = tasks.filter(t => t.projectId === p.id);
        return `  ${p.name}: ${pTasks.filter(t => t.completed).length}/${pTasks.length} erledigt${p.deadline ? ', Deadline '+new Date(p.deadline).toLocaleDateString('de-CH') : ''}`;
      });
      const taskSamples = open.slice(0, 10).map(t => {
        const proj = projects.find(p => p.id === t.projectId);
        return `  - ${t.title}${t.dueDate ? ' (fällig '+new Date(t.dueDate).toLocaleDateString('de-CH')+')' : ''}${proj ? ' ['+proj.name+']' : ''}${t.priority === 'high' ? ' !HIGH' : ''}`;
      });
      return `User${userName ? ': ' + userName : ''} (Aufgaben & Projekte)
AKTUELL: ${open.length} offen, ${overdue.length} überfällig, ${today.length} heute fällig, ${noDate.length} ohne Datum
AKTIVE PROJEKTE:\n${projList.join('\n') || '—'}
OFFENE AUFGABEN (max 10):\n${taskSamples.join('\n') || '—'}`;
    }
    return '';
  };

  const send = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setError(null);
    setInput('');
    v.stopSpeaking();
    const newChat = [...chat, { role: 'user', content: userMsg, ts: now() }];
    setChat(newChat);
    setLoading(true);

    try {
      const systemPrompt = `${cfg.systemRole}

KONTEXT DES USERS:
${buildContext()}`;
      const messages = newChat.slice(-12).map(m => ({ role: m.role, content: m.content }));

      const response = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages
        })
      });
      if (!response.ok) throw new Error('API ' + response.status);
      const datum = await response.json();
      const replyText = datum.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
      setChat([...newChat, { role: 'assistant', content: replyText || '...', ts: now() }]);
      if (voiceEnabled) v.speak(cleanForSpeech(replyText));
    } catch (e) {
      setError(e.message || 'Verbindungsfehler');
      setChat(newChat);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (v.listening) { v.stopListening(); return; }
    setVoiceError(null);
    v.startListening(
      (transcript) => { send(transcript); },
      (err) => setVoiceError(err)
    );
  };

  const clearChat = () => {
    if (chat.length > 0 && !confirm('Chat löschen?')) return;
    setChat([]);
    setError(null);
    v.stopSpeaking();
  };

  return (
    <div className="dm-fade" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 280px)' }}>
      {/* Header */}
      <div className="dm-card-hl p-4 mb-3" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%',
          background: `radial-gradient(circle, ${cfg.color}26 0%, transparent 70%)` }} />
        <div className="flex items-start gap-3" style={{ position: 'relative' }}>
          <div className="flex items-center justify-center flex-shrink-0"
            style={{ width: 44, height: 44, borderRadius: '50%', background: `${cfg.color}26`, border: `1px solid ${cfg.color}66` }}>
            <Icon size={22} style={{ color: cfg.color }} />
          </div>
          <div className="flex-1">
            <div className="display text-base flex items-center gap-2" style={{ fontWeight: 600 }}>
              {cfg.name}
              {v.speaking && <Loader size={12} className="animate-spin" style={{ color: cfg.color }} />}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)', lineHeight: 1.4 }}>{cfg.intro}</div>
          </div>
          <div className="flex flex-col gap-1">
            {v.speechSupported && (
              <button onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) v.stopSpeaking(); }}
                className="p-2 -mr-1" title={voiceEnabled ? 'Voice aus' : 'Voice an'}>
                {voiceEnabled
                  ? <Volume2 size={14} style={{ color: cfg.color }} />
                  : <VolumeX size={14} style={{ color: 'var(--ink-4)' }} />}
              </button>
            )}
            {chat.length > 0 && (
              <button onClick={clearChat} className="p-2 -mr-1" title="Chat löschen">
                <Trash2 size={13} style={{ color: 'var(--ink-4)' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="dm-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 240 }}>
        {chat.length === 0 ? (
          <div className="space-y-3">
            <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              Beliebte Fragen
            </div>
            <div className="grid grid-cols-1 gap-2">
              {cfg.prompts.map((p, i) => (
                <button key={i} onClick={() => send(p.text)}
                  className="dm-card p-3 text-left flex items-center gap-3">
                  <Lightbulb size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                  <span className="text-sm">{p.label}</span>
                </button>
              ))}
            </div>
            <div className="dm-card p-3 mt-3 text-xs" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
              <Sparkles size={12} className="inline mr-1" style={{ color: cfg.color }} />
              {v.supported ? 'Tippe auf das Mikrofon-Symbol für Sprachsteuerung. ' : ''}
              Der Assistant kennt deine Daten für personalisierte Antworten.
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-3">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} dm-fade`}>
                <div className={m.role === 'user' ? 'dm-card-hl' : 'dm-card'}
                  style={{
                    padding: '10px 14px', maxWidth: '85%',
                    background: m.role === 'user' ? `${cfg.color}26` : 'var(--bg-1)',
                    borderColor: m.role === 'user' ? `${cfg.color}66` : 'var(--line)',
                    borderRadius: 14
                  }}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon size={12} style={{ color: cfg.color }} />
                      <span className="text-xs" style={{ color: cfg.color, fontWeight: 600 }}>{cfg.short}</span>
                      {v.speechSupported && (
                        <button onClick={() => v.speaking ? v.stopSpeaking() : v.speak(cleanForSpeech(m.content))}
                          className="ml-auto p-0.5">
                          {v.speaking
                            ? <VolumeX size={11} style={{ color: 'var(--ink-4)' }} />
                            : <Volume2 size={11} style={{ color: 'var(--ink-4)' }} />}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start dm-fade">
                <div className="dm-card" style={{ padding: '10px 14px', borderRadius: 14 }}>
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} style={{ color: cfg.color }} />
                    <span className="text-xs" style={{ color: 'var(--ink-3)' }}>denkt nach</span>
                    <Loader size={12} className="animate-spin" style={{ color: cfg.color }} />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="dm-card p-3 text-xs" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
                <AlertCircle size={12} className="inline mr-1" /> {error}
              </div>
            )}
          </div>
        )}
      </div>

      {voiceError && (
        <div className="dm-card p-2 text-xs mt-2" style={{ color: 'var(--ink-3)', textAlign: 'center' }}>
          {voiceError}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 mt-3" style={{ position: 'sticky', bottom: 100 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={v.listening ? 'Höre zu...' : 'Frag mich was...'} className="dm-input"
          style={{ flex: 1 }} disabled={loading || v.listening} />
        {v.supported && (
          <button onClick={handleVoiceInput} disabled={loading}
            className="flex items-center justify-center"
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: v.listening ? cfg.color : 'var(--bg-2)',
              border: `1px solid ${v.listening ? cfg.color : 'var(--line)'}`,
              color: v.listening ? '#0A0F0B' : 'var(--ink-2)',
              transition: 'all 0.15s'
            }}>
            <Mic size={18} />
          </button>
        )}
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="dm-btn-primary flex items-center justify-center"
          style={{ width: 'auto', padding: '0 16px', opacity: (loading || !input.trim()) ? 0.5 : 1,
            background: cfg.color }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

// Mode-switching sheet wrapper for global AI assistant
const AssistantSheet = ({ open, onClose, currentTab, chats, setChats, data, userName }) => {
  const initialMode = currentTab === 'money' ? 'money'
    : currentTab === 'hitch' ? 'hitch'
    : currentTab === 'tasks' ? 'tasks'
    : currentTab === 'today' ? 'tasks'
    : 'tasks';
  const [mode, setMode] = useState(initialMode);

  const setChatForMode = (m) => (next) => {
    setChats(prev => ({ ...prev, [m]: typeof next === 'function' ? next(prev[m] || []) : next }));
  };

  return (
    <Sheet open={open} onClose={onClose} title="AI Assistant" height="92vh">
      {/* Mode switcher */}
      <div className="flex gap-2 mb-3">
        {Object.entries(ASSISTANT_MODES).map(([k, v]) => {
          const Ic = v.icon;
          const active = mode === k;
          return (
            <button key={k} onClick={() => setMode(k)}
              className="dm-chip flex-1 justify-center"
              style={{
                padding: '10px',
                background: active ? v.color : 'var(--bg-2)',
                color: active ? '#0A0F0B' : v.color,
                borderColor: active ? v.color : v.color + '66',
                fontWeight: active ? 600 : 500
              }}>
              <Ic size={13} /> {v.short}
            </button>
          );
        })}
      </div>

      <AIAssistant mode={mode} data={data} userName={userName}
        chat={chats[mode] || []} setChat={setChatForMode(mode)} />
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────
// FITNESS & NUTRITION VIEW
// ─────────────────────────────────────────────────────────────
const DEFAULT_PLAN = {
  id: 'ppl', name: 'Push Pull Legs', type: 'strength',
  days: [
    {
      name: 'Push (Brust, Schulter, Trizeps)',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: '6-8', weight: '' },
        { name: 'Overhead Press', sets: 3, reps: '8-10', weight: '' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10', weight: '' },
        { name: 'Lateral Raises', sets: 3, reps: '12-15', weight: '' },
        { name: 'Triceps Pushdown', sets: 3, reps: '10-12', weight: '' }
      ]
    },
    {
      name: 'Pull (Rücken, Bizeps)',
      exercises: [
        { name: 'Deadlift', sets: 4, reps: '5', weight: '' },
        { name: 'Pull-Ups', sets: 4, reps: '6-10', weight: 'BW' },
        { name: 'Barbell Row', sets: 3, reps: '8-10', weight: '' },
        { name: 'Face Pulls', sets: 3, reps: '12-15', weight: '' },
        { name: 'Bicep Curls', sets: 3, reps: '10-12', weight: '' }
      ]
    },
    {
      name: 'Legs (Quads, Glutes, Hamstrings)',
      exercises: [
        { name: 'Squat', sets: 4, reps: '6-8', weight: '' },
        { name: 'Romanian Deadlift', sets: 3, reps: '8-10', weight: '' },
        { name: 'Leg Press', sets: 3, reps: '10-12', weight: '' },
        { name: 'Leg Curl', sets: 3, reps: '10-12', weight: '' },
        { name: 'Calf Raises', sets: 4, reps: '12-15', weight: '' }
      ]
    }
  ]
};

// Plan templates — user can pick when creating new plan
const PLAN_TEMPLATES = [
  DEFAULT_PLAN,
  {
    id: 'upper_lower', name: 'Upper / Lower', type: 'strength',
    days: [
      { name: 'Upper Body', exercises: [
        { name: 'Bench Press', sets: 4, reps: '6-8', weight: '' },
        { name: 'Barbell Row', sets: 4, reps: '6-8', weight: '' },
        { name: 'Overhead Press', sets: 3, reps: '8-10', weight: '' },
        { name: 'Pull-Ups', sets: 3, reps: '8-10', weight: 'BW' },
        { name: 'Dips', sets: 3, reps: '10-12', weight: 'BW' }
      ]},
      { name: 'Lower Body', exercises: [
        { name: 'Squat', sets: 4, reps: '6-8', weight: '' },
        { name: 'Romanian Deadlift', sets: 3, reps: '8-10', weight: '' },
        { name: 'Bulgarian Split Squat', sets: 3, reps: '10', weight: '' },
        { name: 'Leg Curl', sets: 3, reps: '12', weight: '' },
        { name: 'Calf Raises', sets: 4, reps: '15', weight: '' }
      ]}
    ]
  },
  {
    id: 'full_body', name: 'Full Body 3x/Woche', type: 'strength',
    days: [
      { name: 'Workout A', exercises: [
        { name: 'Squat', sets: 3, reps: '5-8', weight: '' },
        { name: 'Bench Press', sets: 3, reps: '5-8', weight: '' },
        { name: 'Barbell Row', sets: 3, reps: '5-8', weight: '' },
        { name: 'Overhead Press', sets: 3, reps: '8-10', weight: '' }
      ]},
      { name: 'Workout B', exercises: [
        { name: 'Deadlift', sets: 3, reps: '5', weight: '' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', weight: '' },
        { name: 'Pull-Ups', sets: 3, reps: '6-10', weight: 'BW' },
        { name: 'Lunges', sets: 3, reps: '10', weight: '' }
      ]}
    ]
  },
  {
    id: 'kickboxing', name: 'Kickboxen', type: 'martial-arts',
    days: [
      { name: 'Pad Work / Bag Work', exercises: [
        { name: 'Warm-Up Skipping', sets: 1, reps: '5 min', weight: '' },
        { name: 'Shadow Boxing', sets: 3, reps: '3 min Runden', weight: '' },
        { name: 'Jab-Cross-Hook Combos', sets: 5, reps: '3 min Runden', weight: 'Pads' },
        { name: 'Low Kicks (L/R)', sets: 4, reps: '20 pro Bein', weight: 'Bag' },
        { name: 'High Kicks (L/R)', sets: 4, reps: '15 pro Bein', weight: 'Bag' },
        { name: 'Knee Strikes', sets: 4, reps: '20 pro Bein', weight: 'Bag' },
        { name: 'Cool-Down Stretching', sets: 1, reps: '10 min', weight: '' }
      ]},
      { name: 'Sparring & Conditioning', exercises: [
        { name: 'Jump Rope', sets: 3, reps: '3 min', weight: '' },
        { name: 'Light Sparring', sets: 5, reps: '2 min Runden', weight: 'Headgear' },
        { name: 'Defense Drills', sets: 4, reps: '2 min', weight: '' },
        { name: 'Burpees', sets: 4, reps: '15', weight: 'BW' },
        { name: 'Core Circuit', sets: 3, reps: '90 sec', weight: 'BW' }
      ]},
      { name: 'Technik & Flexibility', exercises: [
        { name: 'Mobility Flow', sets: 1, reps: '15 min', weight: '' },
        { name: 'Kick Technique Drills', sets: 6, reps: '10 pro Variation', weight: '' },
        { name: 'Hip Flexor Stretches', sets: 3, reps: '60 sec pro Seite', weight: '' },
        { name: 'Heavy Bag Power', sets: 5, reps: '2 min', weight: 'Bag' }
      ]}
    ]
  },
  {
    id: 'cardio', name: 'Cardio', type: 'cardio',
    days: [
      { name: 'Steady State (Z2)', exercises: [
        { name: 'Laufen lockerer Puls', sets: 1, reps: '40-60 min', weight: 'Z2 (140-150 bpm)' },
        { name: 'Cool-Down Walk', sets: 1, reps: '5 min', weight: '' }
      ]},
      { name: 'HIIT', exercises: [
        { name: 'Warm-Up Jog', sets: 1, reps: '5 min', weight: '' },
        { name: 'Sprint Intervalle', sets: 8, reps: '30 sec sprint / 90 sec walk', weight: '' },
        { name: 'Cool-Down', sets: 1, reps: '5 min', weight: '' }
      ]},
      { name: 'Bike / Spinning', exercises: [
        { name: 'Warm-Up', sets: 1, reps: '5 min easy', weight: '' },
        { name: 'Hill Climbs', sets: 5, reps: '2 min hard', weight: '' },
        { name: 'Active Recovery', sets: 5, reps: '2 min easy', weight: '' },
        { name: 'Cool-Down', sets: 1, reps: '5 min', weight: '' }
      ]}
    ]
  },
  {
    id: 'yoga', name: 'Yoga / Mobility', type: 'flexibility',
    days: [
      { name: 'Morning Flow', exercises: [
        { name: 'Sun Salutation A', sets: 5, reps: 'Rounds', weight: '' },
        { name: 'Sun Salutation B', sets: 5, reps: 'Rounds', weight: '' },
        { name: 'Warrior Series', sets: 1, reps: '5 min', weight: '' },
        { name: 'Pigeon Pose', sets: 1, reps: '90 sec pro Seite', weight: '' },
        { name: 'Savasana', sets: 1, reps: '5 min', weight: '' }
      ]},
      { name: 'Mobility Reset', exercises: [
        { name: 'Cat-Cow', sets: 1, reps: '20 reps', weight: '' },
        { name: 'World\'s Greatest Stretch', sets: 1, reps: '5 pro Seite', weight: '' },
        { name: '90/90 Hip Stretch', sets: 1, reps: '60 sec pro Seite', weight: '' },
        { name: 'Shoulder Dislocates', sets: 3, reps: '10', weight: 'Stick' },
        { name: 'Deep Squat Hold', sets: 3, reps: '60 sec', weight: 'BW' }
      ]}
    ]
  },
  {
    id: 'home', name: 'Home Workout', type: 'strength',
    days: [
      { name: 'Push Tag', exercises: [
        { name: 'Push-Ups', sets: 4, reps: '15-20', weight: 'BW' },
        { name: 'Pike Push-Ups', sets: 3, reps: '10', weight: 'BW' },
        { name: 'Diamond Push-Ups', sets: 3, reps: '10-12', weight: 'BW' },
        { name: 'Tricep Dips Stuhl', sets: 3, reps: '12', weight: 'BW' }
      ]},
      { name: 'Pull Tag', exercises: [
        { name: 'Pull-Ups Türstange', sets: 4, reps: '6-10', weight: 'BW' },
        { name: 'Rows mit Handtuch', sets: 3, reps: '12', weight: 'BW' },
        { name: 'Superman Holds', sets: 3, reps: '30 sec', weight: 'BW' }
      ]},
      { name: 'Legs Tag', exercises: [
        { name: 'Air Squats', sets: 4, reps: '20-25', weight: 'BW' },
        { name: 'Bulgarian Split Squats', sets: 3, reps: '12 pro Bein', weight: 'BW' },
        { name: 'Glute Bridges', sets: 3, reps: '15', weight: 'BW' },
        { name: 'Calf Raises', sets: 4, reps: '20', weight: 'BW' }
      ]}
    ]
  },
  {
    id: 'blank', name: 'Eigener Plan', type: 'custom',
    days: [{ name: 'Tag 1', exercises: [{ name: 'Übung 1', sets: 3, reps: '10', weight: '' }] }]
  }
];

const DEFAULT_NUTRITION_TARGET = { kcal: 2800, protein: 180, carbs: 320, fat: 80, sugar: 50 };

const FitView = ({ workouts, setWorkouts, foods, setFoods, plan, setPlan, settings, setSettings }) => {
  const [fitTab, setFitTab] = useState('workout'); // workout | nutrition | plan
  const todayKey = today();

  // Migrate old single-plan format to new multi-plan format
  useEffect(() => {
    if (plan === null) {
      setPlan({ activeId: 'ppl', plans: [DEFAULT_PLAN] });
    } else if (plan && !plan.activeId && plan.days) {
      // Old format: single plan object → wrap into new structure
      const oldPlan = { ...plan, id: plan.id || 'default', type: plan.type || 'strength' };
      setPlan({ activeId: oldPlan.id, plans: [oldPlan] });
    }
  }, [plan]);

  const target = settings.nutritionTarget || DEFAULT_NUTRITION_TARGET;
  const setTarget = (t) => setSettings(s => ({ ...s, nutritionTarget: t }));

  // Today's workout entries
  const todayWorkouts = workouts.filter(w => w.date && w.date.slice(0, 10) === todayKey);
  const todayFoods = foods.filter(f => f.date && f.date.slice(0, 10) === todayKey);

  // Today's totals
  const totals = todayFoods.reduce((acc, f) => ({
    kcal: acc.kcal + Number(f.kcal || 0),
    protein: acc.protein + Number(f.protein || 0),
    carbs: acc.carbs + Number(f.carbs || 0),
    fat: acc.fat + Number(f.fat || 0),
    sugar: acc.sugar + Number(f.sugar || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 });

  return (
    <div className="px-5 pt-2 pb-32 dm-scroll">
      <div className="mb-4 mt-2">
        <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Fitness & Nutrition</div>
        <h1 className="display text-3xl mt-0.5" style={{ fontWeight: 500 }}>Fit</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFitTab('workout')}
          className={`dm-chip ${fitTab === 'workout' ? 'dm-chip-active' : ''}`}>
          Workout
        </button>
        <button onClick={() => setFitTab('nutrition')}
          className={`dm-chip ${fitTab === 'nutrition' ? 'dm-chip-active' : ''}`}>
          Nutrition
        </button>
        <button onClick={() => setFitTab('plan')}
          className={`dm-chip ${fitTab === 'plan' ? 'dm-chip-active' : ''}`}>
          Plan
        </button>
      </div>

      {fitTab === 'workout' && (
        <WorkoutView library={plan} setLibrary={setPlan} workouts={workouts} setWorkouts={setWorkouts}
          todayWorkouts={todayWorkouts} todayKey={todayKey} />
      )}
      {fitTab === 'nutrition' && (
        <NutritionView foods={foods} setFoods={setFoods} totals={totals}
          target={target} setTarget={setTarget} todayFoods={todayFoods} todayKey={todayKey} />
      )}
      {fitTab === 'plan' && (
        <PlanEditor library={plan} setLibrary={setPlan} />
      )}
    </div>
  );
};

// Helper: get active plan from library
const getActivePlan = (library) => {
  if (!library || !library.plans || library.plans.length === 0) return null;
  return library.plans.find(p => p.id === library.activeId) || library.plans[0];
};

// Workout logging view — now with plan switcher
const WorkoutView = ({ library, setLibrary, workouts, setWorkouts, todayWorkouts, todayKey }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [logSheet, setLogSheet] = useState(null);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);

  if (!library) return <EmptyState icon={() => null} title="Lädt..." hint="" />;
  const plan = getActivePlan(library);
  if (!plan) return <EmptyState icon={() => null} title="Kein Plan aktiv" hint="" />;

  const day = plan.days[activeDay];

  const logSet = (exercise, sets) => {
    setWorkouts(prev => [...prev, {
      id: uid(), date: now(), exercise: exercise.name,
      sets: sets.filter(s => s.weight || s.reps)
    }]);
    setLogSheet(null);
  };

  const last7 = workouts.filter(w => {
    const d = new Date(w.date);
    return (Date.now() - d.getTime()) <= 7 * 86400000;
  }).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="dm-card p-3 text-center">
          <div className="num text-base" style={{ fontWeight: 600 }}>{todayWorkouts.length}</div>
          <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Heute</div>
        </div>
        <div className="dm-card p-3 text-center">
          <div className="num text-base" style={{ fontWeight: 600, color: 'var(--accent)' }}>{last7}</div>
          <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>7 Tage</div>
        </div>
        <div className="dm-card p-3 text-center">
          <div className="num text-base" style={{ fontWeight: 600 }}>{workouts.length}</div>
          <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Total</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          Aktiv: {plan.name}
        </span>
        <button onClick={() => setPlanPickerOpen(true)}
          className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Plan wechseln ▸
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 dm-scroll" style={{ flexWrap: 'nowrap' }}>
        {plan.days.map((d, i) => (
          <button key={i} onClick={() => setActiveDay(i)}
            className={`dm-chip ${activeDay === i ? 'dm-chip-active' : ''}`}
            style={{ flexShrink: 0 }}>
            {d.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="dm-card overflow-hidden mb-4">
        {day.exercises.map((ex, i) => {
          const logs = workouts.filter(w => w.exercise === ex.name);
          const last = logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          return (
            <div key={i} className={`p-4 ${i > 0 ? 'border-t' : ''}`}
              style={i > 0 ? { borderColor: 'var(--line-soft)' } : {}}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm" style={{ fontWeight: 500 }}>{ex.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    <span className="num">{ex.sets}</span> Sets × <span className="num">{ex.reps}</span> Reps
                    {ex.weight && <> · <span className="num">{ex.weight}</span></>}
                  </div>
                  {last && (
                    <div className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
                      Zuletzt: {last.sets.map(s => `${s.reps}×${s.weight}`).join(', ')} · {new Date(last.date).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
                <button onClick={() => setLogSheet(ex)}
                  className="dm-btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>
                  Loggen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {logSheet && (
        <SetLogSheet exercise={logSheet} onClose={() => setLogSheet(null)} onSave={(sets) => logSet(logSheet, sets)} />
      )}

      {planPickerOpen && (
        <PlanPickerSheet library={library} setLibrary={setLibrary}
          onClose={() => setPlanPickerOpen(false)} />
      )}
    </>
  );
};

// Plan picker — list user's plans + templates to switch or create new
const PlanPickerSheet = ({ library, setLibrary, onClose }) => {
  const [mode, setMode] = useState('mine'); // mine | new
  const userPlans = library.plans || [];
  const userPlanIds = new Set(userPlans.map(p => p.id));

  const switchTo = (planId) => {
    setLibrary({ ...library, activeId: planId });
    onClose();
  };

  const addTemplate = (template) => {
    // Generate unique ID if user already has this template
    let newId = template.id;
    let i = 2;
    while (userPlanIds.has(newId)) {
      newId = `${template.id}_${i++}`;
    }
    const newPlan = JSON.parse(JSON.stringify({ ...template, id: newId }));
    setLibrary({
      activeId: newId,
      plans: [...userPlans, newPlan]
    });
    onClose();
  };

  const removePlan = (planId) => {
    if (userPlans.length <= 1) {
      alert('Mindestens ein Plan muss bestehen bleiben.');
      return;
    }
    if (!confirm('Plan wirklich löschen? Trainingsdaten bleiben erhalten.')) return;
    const remaining = userPlans.filter(p => p.id !== planId);
    setLibrary({
      activeId: library.activeId === planId ? remaining[0].id : library.activeId,
      plans: remaining
    });
  };

  const newTemplates = PLAN_TEMPLATES.filter(t => !userPlanIds.has(t.id));

  return (
    <Sheet open={true} onClose={onClose} title="Trainingspläne" height="88vh">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode('mine')}
          className={`dm-chip flex-1 justify-center ${mode === 'mine' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>
          Meine ({userPlans.length})
        </button>
        <button onClick={() => setMode('new')}
          className={`dm-chip flex-1 justify-center ${mode === 'new' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>
          Templates ({newTemplates.length})
        </button>
      </div>

      {mode === 'mine' && (
        <div className="space-y-2">
          {userPlans.map(p => {
            const isActive = library.activeId === p.id;
            return (
              <div key={p.id}
                className="dm-card p-4"
                style={isActive ? { borderColor: 'var(--accent-line)', background: 'linear-gradient(180deg, var(--accent-soft), transparent)' } : {}}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="display text-base" style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {p.type || 'custom'} · {p.days?.length || 0} Tage · {p.days?.reduce((s, d) => s + (d.exercises?.length || 0), 0) || 0} Übungen
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {isActive ? (
                      <span className="dm-chip" style={{ padding: '4px 8px', fontSize: 10, color: 'var(--accent)', borderColor: 'var(--accent-line)', fontWeight: 600 }}>
                        Aktiv
                      </span>
                    ) : (
                      <button onClick={() => switchTo(p.id)}
                        className="dm-chip" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--accent)' }}>
                        Aktivieren
                      </button>
                    )}
                    {userPlans.length > 1 && (
                      <button onClick={() => removePlan(p.id)}
                        className="text-xs" style={{ color: 'var(--ink-4)' }}>
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'new' && (
        <>
          <div className="text-xs mb-3" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Wähle einen Template-Plan zum Hinzufügen. Du kannst danach Übungen anpassen und neue Tage erstellen.
          </div>
          <div className="space-y-2">
            {newTemplates.map(t => (
              <button key={t.id} onClick={() => addTemplate(t)}
                className="dm-card p-4 w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="display text-base" style={{ fontWeight: 600 }}>{t.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {t.type} · {t.days.length} Tage
                      {t.days.length > 0 && (
                        <> · {t.days.map(d => d.name.split(' ')[0]).slice(0, 3).join(', ')}{t.days.length > 3 ? '...' : ''}</>
                      )}
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>+ Hinzufügen</span>
                </div>
              </button>
            ))}
            {newTemplates.length === 0 && (
              <div className="dm-card p-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
                Alle Templates schon hinzugefügt
              </div>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
};

const SetLogSheet = ({ exercise, onClose, onSave }) => {
  const [sets, setSets] = useState(
    Array.from({ length: exercise.sets }, () => ({ reps: '', weight: '' }))
  );
  const update = (i, k, v) => setSets(prev => prev.map((s, j) => j === i ? { ...s, [k]: v } : s));
  return (
    <Sheet open={true} onClose={onClose} title={exercise.name}>
      <div className="space-y-3">
        <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Plan: {exercise.sets} Sets × {exercise.reps} Reps
        </div>
        {sets.map((s, i) => (
          <div key={i} className="dm-card p-3 flex items-center gap-3">
            <span className="num" style={{ color: 'var(--ink-3)', width: 36, fontSize: 13 }}>Set {i + 1}</span>
            <div className="flex-1">
              <div className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Reps</div>
              <input type="number" inputMode="numeric" value={s.reps}
                onChange={e => update(i, 'reps', e.target.value)}
                className="dm-input num" style={{ padding: '8px 10px', fontSize: 14 }} />
            </div>
            <div className="flex-1">
              <div className="text-xs mb-1" style={{ color: 'var(--ink-3)' }}>Gewicht (kg)</div>
              <input type="number" inputMode="decimal" step="0.5" value={s.weight}
                onChange={e => update(i, 'weight', e.target.value)}
                className="dm-input num" style={{ padding: '8px 10px', fontSize: 14 }} />
            </div>
          </div>
        ))}
        <button onClick={() => setSets(prev => [...prev, { reps: '', weight: '' }])}
          className="dm-btn-ghost w-full">+ Weiterer Set</button>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="dm-btn-ghost flex-1">Abbrechen</button>
          <button onClick={() => onSave(sets)} className="dm-btn-primary flex-1">Speichern</button>
        </div>
      </div>
    </Sheet>
  );
};

// Nutrition view: target ring, food log, manual + photo entry
const NutritionView = ({ foods, setFoods, totals, target, setTarget, todayFoods, todayKey }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const removeFood = (id) => setFoods(prev => prev.filter(f => f.id !== id));

  const macroBar = (label, value, t, color) => {
    const pct = t > 0 ? Math.min(100, (value / t) * 100) : 0;
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: 'var(--ink-2)' }}>{label}</span>
          <span className="num" style={{ color: 'var(--ink-3)' }}>
            <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{Math.round(value)}</span> / {t}{label === 'Kalorien' ? '' : 'g'}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
        </div>
      </div>
    );
  };

  const kcalPct = target.kcal > 0 ? Math.min(100, (totals.kcal / target.kcal) * 100) : 0;
  const remaining = target.kcal - totals.kcal;

  return (
    <>
      {/* Calorie ring */}
      <div className="dm-card-hl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Heute
          </span>
          <button onClick={() => setTargetOpen(true)}
            className="text-xs" style={{ color: 'var(--accent)' }}>
            Ziel anpassen
          </button>
        </div>
        <div className="flex items-center justify-center my-2 dm-allow-svg" style={{ position: 'relative' }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="var(--bg-3)" strokeWidth="12" />
            <circle cx="80" cy="80" r="68" fill="none"
              stroke="var(--accent)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${(kcalPct / 100) * 427.3} 427.3`}
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dasharray 0.6s' }} />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div className="display num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--accent)', lineHeight: 1 }}>
              {Math.round(totals.kcal)}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>von {target.kcal} kcal</div>
            <div className="text-xs mt-1 num" style={{ color: remaining >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {remaining >= 0 ? `${remaining} übrig` : `${Math.abs(remaining)} drüber`}
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-3">
          {macroBar('Protein', totals.protein, target.protein, 'var(--accent)')}
          {macroBar('Kohlenhydrate', totals.carbs, target.carbs, 'var(--gold)')}
          {macroBar('Fett', totals.fat, target.fat, 'var(--violet)')}
          {macroBar('Zucker', totals.sugar, target.sugar, 'var(--red)')}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="display text-xl" style={{ fontWeight: 500 }}>Heute gegessen</h2>
        <button onClick={() => setAddOpen(true)}
          className="dm-btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>
          + Essen
        </button>
      </div>

      {todayFoods.length === 0 ? (
        <div className="dm-card p-5 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          Noch nichts gegessen heute
        </div>
      ) : (
        <div className="dm-card overflow-hidden">
          {todayFoods.map((f, i) => (
            <div key={f.id} className={`flex items-center gap-3 p-3.5 ${i > 0 ? 'border-t' : ''}`}
              style={i > 0 ? { borderColor: 'var(--line-soft)' } : {}}>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ fontWeight: 500 }}>{f.name}</div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  <span className="num">{Math.round(f.kcal)}</span> kcal · P{Math.round(f.protein)} · C{Math.round(f.carbs)} · F{Math.round(f.fat)}
                  {f.portion && <> · {f.portion}</>}
                </div>
              </div>
              <button onClick={() => removeFood(f.id)} className="text-xs" style={{ color: 'var(--ink-4)' }}>
                Entf
              </button>
            </div>
          ))}
        </div>
      )}

      {addOpen && <AddFoodSheet onClose={() => setAddOpen(false)}
        recentFoods={foods.slice(-30).reverse()}
        onAdd={(food) => { setFoods(prev => [...prev, { ...food, id: uid(), date: now() }]); setAddOpen(false); }} />}

      {targetOpen && <TargetSheet target={target} onSave={(t) => { setTarget(t); setTargetOpen(false); }}
        onClose={() => setTargetOpen(false)} />}
    </>
  );
};

const TargetSheet = ({ target, onSave, onClose }) => {
  const [t, setT] = useState({ ...target });
  return (
    <Sheet open={true} onClose={onClose} title="Tagesziel">
      <div className="space-y-3">
        <div className="text-xs mb-2" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Setze deine täglichen Nährwert-Ziele basierend auf deinen Fitness-Zielen (Lean Bulk, Cutting, Maintenance).
        </div>
        {[
          ['kcal', 'Kalorien', ''],
          ['protein', 'Protein', 'g'],
          ['carbs', 'Kohlenhydrate', 'g'],
          ['fat', 'Fett', 'g'],
          ['sugar', 'Zucker', 'g']
        ].map(([k, l, u]) => (
          <Field key={k} label={`${l} (${u || 'kcal'})`}>
            <input type="number" inputMode="numeric" value={t[k]}
              onChange={e => setT({ ...t, [k]: Number(e.target.value) || 0 })}
              className="dm-input num" />
          </Field>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="dm-btn-ghost flex-1">Abbrechen</button>
          <button onClick={() => onSave(t)} className="dm-btn-primary flex-1">Speichern</button>
        </div>
      </div>
    </Sheet>
  );
};

// Add food: manual entry OR photo recognition via Claude vision
// Food search via Claude API (acts as nutrition database — works in sandbox)
const FoodSearch = ({ onPick, recentFoods = [] }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef({});

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 600);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  const doSearch = async (q) => {
    const key = q.toLowerCase();
    if (cacheRef.current[key]) {
      setResults(cacheRef.current[key]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: "Du bist eine präzise Nährwert-Datenbank für die Schweiz und Deutschland. Antworte AUSSCHLIESSLICH mit JSON ohne Markdown.",
          messages: [{
            role: "user",
            content: `Gib 5-8 passende Lebensmittel zur Suche zurück. Nutze deutsche Namen. Bei mehrdeutigen Begriffen mehrere Varianten. Bei Marken (Skyr Lidl, Coca Cola Zero, Migros Bio, Coop Naturaplan, Emmi Caffè Latte) die echten Werte. Bei Gerichten Durchschnittswerte. Werte pro 100g.

JSON-Array (nichts anderes):
[{"name":"Name","brand":"Marke oder null","kcal":Zahl,"protein":Zahl,"carbs":Zahl,"fat":Zahl,"sugar":Zahl,"fiber":Zahl,"salt":Zahl,"serving":"Standardportion z.B. 30g oder 1 Stück (50g)"}]

Suche: "${q}"`
          }]
        })
      });
      if (!response.ok) throw new Error('API ' + response.status);
      const data = await response.json();
      const text = data.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const items = JSON.parse(cleaned);
      if (!Array.isArray(items)) throw new Error('Format');
      const sanitized = items.filter(i => i.name && typeof i.kcal === 'number');
      cacheRef.current[key] = sanitized;
      setResults(sanitized);
    } catch (e) {
      setError(e.message?.includes('JSON') || e.message === 'Format'
        ? 'Antwort unklar — versuch es nochmal'
        : 'Suche fehlgeschlagen — ' + (e.message || ''));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const recents = useMemo(() => {
    const seen = new Set();
    return recentFoods.filter(f => {
      const k = f.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 8);
  }, [recentFoods]);

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="z.B. Banane, Hähnchenbrust, Skyr Vanille, Gipfeli..."
        className="dm-input"
        autoFocus />

      {!query && recents.length > 0 && (
        <div>
          <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Zuletzt gegessen
          </div>
          <div className="space-y-2">
            {recents.map((r, i) => (
              <button key={i} onClick={() => onPick({ recent: r })}
                className="dm-card p-3 w-full text-left flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ fontWeight: 500 }}>{r.name}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    <span className="num">{Math.round(r.kcal)}</span> kcal · P{Math.round(r.protein)} · C{Math.round(r.carbs)} · F{Math.round(r.fat)}
                    {r.portion && <> · {r.portion}</>}
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>+ Erneut</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-xs text-center py-3" style={{ color: 'var(--ink-3)' }}>Suche...</div>
      )}
      {error && (
        <div className="dm-card p-3 text-xs" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Treffer ({results.length})
          </div>
          {results.map((p, i) => (
            <button key={i} onClick={() => onPick({ product: p })}
              className="dm-card p-3 w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ fontWeight: 500 }}>{p.name}</div>
                  {p.brand && <div className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{p.brand}</div>}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{p.serving || '100g'}</div>
              </div>
              <div className="text-xs mt-1.5" style={{ color: 'var(--ink-3)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }} className="num">{Math.round(p.kcal)}</span> kcal/100g ·
                P<span className="num">{Math.round(p.protein)}</span> ·
                C<span className="num">{Math.round(p.carbs)}</span> ·
                F<span className="num">{Math.round(p.fat)}</span>
                {p.sugar > 0 && <> · Z<span className="num">{Math.round(p.sugar)}</span></>}
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && !error && (
        <div className="dm-card p-4 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          Keine Treffer für "{query}". Wechsle zu "Foto" oder "Manuell".
        </div>
      )}

      <div className="text-xs pt-2" style={{ color: 'var(--ink-4)', lineHeight: 1.4 }}>
        Nährwerte aus KI-Datenbank. Bei verpackten Produkten auf dem Etikett verifizieren.
      </div>
    </div>
  );
};

// Portion adjustor — pick grams, see live nutrition calculation
const PortionSheet = ({ product, onConfirm, onClose }) => {
  const [grams, setGrams] = useState(100);

  const defaultServing = useMemo(() => {
    if (!product.serving) return null;
    const m = product.serving.match(/(\d+(?:\.\d+)?)\s*g/i);
    return m ? Number(m[1]) : null;
  }, [product.serving]);

  // Auto-set to default serving on mount if available
  useEffect(() => {
    if (defaultServing) setGrams(defaultServing);
  }, [defaultServing]);

  const factor = grams / 100;
  const calc = {
    kcal: Math.round((product.kcal || 0) * factor),
    protein: +((product.protein || 0) * factor).toFixed(1),
    carbs: +((product.carbs || 0) * factor).toFixed(1),
    fat: +((product.fat || 0) * factor).toFixed(1),
    sugar: +((product.sugar || 0) * factor).toFixed(1),
    fiber: +((product.fiber || 0) * factor).toFixed(1),
    salt: +((product.salt || 0) * factor).toFixed(0)
  };

  const confirm = () => {
    onConfirm({
      name: product.name,
      portion: `${grams}g`,
      kcal: calc.kcal,
      protein: calc.protein,
      carbs: calc.carbs,
      fat: calc.fat,
      sugar: calc.sugar,
      brand: product.brand || null
    });
  };

  const quickPortions = [50, 100, 150, 200, 250, 300];

  return (
    <Sheet open={true} onClose={onClose} title={product.name}>
      <div className="space-y-3">
        {product.brand && (
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>{product.brand}</div>
        )}

        <Field label="Menge in Gramm">
          <input type="number" inputMode="numeric" value={grams}
            onChange={e => setGrams(Math.max(0, Number(e.target.value) || 0))}
            className="dm-input num"
            style={{ fontSize: 28, fontWeight: 600, padding: '18px 14px' }} />
        </Field>

        <div className="flex gap-2 flex-wrap">
          {quickPortions.map(g => (
            <button key={g} onClick={() => setGrams(g)}
              className={`dm-chip ${grams === g ? 'dm-chip-active' : ''}`}>
              {g}g
            </button>
          ))}
          {defaultServing && !quickPortions.includes(defaultServing) && (
            <button onClick={() => setGrams(defaultServing)}
              className={`dm-chip ${grams === defaultServing ? 'dm-chip-active' : ''}`}
              style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
              Portion ({defaultServing}g)
            </button>
          )}
        </div>

        <div className="dm-card-hl p-4 mt-2">
          <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Für {grams}g
          </div>
          <div className="display num text-4xl mb-3" style={{ fontWeight: 600, color: 'var(--accent)' }}>
            {calc.kcal} kcal
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Protein</div>
              <div className="num" style={{ fontWeight: 600 }}>{calc.protein}g</div>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Kohlenhydrate</div>
              <div className="num" style={{ fontWeight: 600 }}>{calc.carbs}g</div>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Fett</div>
              <div className="num" style={{ fontWeight: 600 }}>{calc.fat}g</div>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Zucker</div>
              <div className="num" style={{ fontWeight: 600 }}>{calc.sugar}g</div>
            </div>
            {calc.fiber > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Ballaststoffe</div>
                <div className="num" style={{ fontWeight: 600 }}>{calc.fiber}g</div>
              </div>
            )}
            {calc.salt > 0 && (
              <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="text-xs" style={{ color: 'var(--ink-3)' }}>Salz</div>
                <div className="num" style={{ fontWeight: 600 }}>{calc.salt}g</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="dm-btn-ghost flex-1">Zurück</button>
          <button onClick={confirm} className="dm-btn-primary flex-1">Hinzufügen</button>
        </div>
      </div>
    </Sheet>
  );
};

const AddFoodSheet = ({ onClose, onAdd, recentFoods = [] }) => {
  const [mode, setMode] = useState('search'); // search | manual | photo
  const [pickedProduct, setPickedProduct] = useState(null);
  const [draft, setDraft] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '', sugar: '', portion: '' });
  const [photoData, setPhotoData] = useState(null);
  const [photoMime, setPhotoMime] = useState('image/jpeg');
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      setPhotoData({ url: dataUrl, base64 });
    };
    reader.readAsDataURL(file);
  };

  const analysePhoto = async () => {
    if (!photoData) return;
    setAnalysing(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: photoMime, data: photoData.base64 } },
              { type: 'text', text: `Schätze die Nährwerte für das Essen auf diesem Bild für eine typische Portion. Antworte AUSSCHLIESSLICH mit gültigem JSON in genau diesem Format, keine anderen Wörter, kein Markdown:
{"name":"Name auf Deutsch","portion":"Beschreibung der geschätzten Portion","kcal":N,"protein":N,"carbs":N,"fat":N,"sugar":N}
Wenn das Bild kein Essen zeigt, gib zurück: {"error":"kein Essen erkannt"}` }
            ]
          }]
        })
      });
      if (!response.ok) throw new Error('API ' + response.status);
      const data = await response.json();
      const text = data.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.error) throw new Error(parsed.error);
      setDraft({
        name: parsed.name || 'Unbekannt',
        portion: parsed.portion || '',
        kcal: String(parsed.kcal || 0),
        protein: String(parsed.protein || 0),
        carbs: String(parsed.carbs || 0),
        fat: String(parsed.fat || 0),
        sugar: String(parsed.sugar || 0)
      });
      setMode('manual');
    } catch (e) {
      setError(e.message || 'Analyse fehlgeschlagen');
    } finally {
      setAnalysing(false);
    }
  };

  const submit = () => {
    if (!draft.name) return;
    onAdd({
      name: draft.name,
      portion: draft.portion,
      kcal: Number(draft.kcal) || 0,
      protein: Number(draft.protein) || 0,
      carbs: Number(draft.carbs) || 0,
      fat: Number(draft.fat) || 0,
      sugar: Number(draft.sugar) || 0
    });
  };

  return (
    <Sheet open={true} onClose={onClose} title="Essen hinzufügen">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode('search')}
          className={`dm-chip flex-1 justify-center ${mode === 'search' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>Suche</button>
        <button onClick={() => setMode('manual')}
          className={`dm-chip flex-1 justify-center ${mode === 'manual' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>Manuell</button>
        <button onClick={() => setMode('photo')}
          className={`dm-chip flex-1 justify-center ${mode === 'photo' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>Foto</button>
      </div>

      {mode === 'search' && (
        <FoodSearch
          recentFoods={recentFoods}
          onPick={(picked) => {
            if (picked.recent) {
              // re-add a recent food directly
              onAdd({
                name: picked.recent.name,
                portion: picked.recent.portion || '',
                kcal: picked.recent.kcal,
                protein: picked.recent.protein,
                carbs: picked.recent.carbs,
                fat: picked.recent.fat,
                sugar: picked.recent.sugar
              });
            } else if (picked.product) {
              setPickedProduct(picked.product);
            }
          }} />
      )}

      {pickedProduct && (
        <PortionSheet product={pickedProduct}
          onClose={() => setPickedProduct(null)}
          onConfirm={(food) => { onAdd(food); setPickedProduct(null); }} />
      )}

      {mode === 'photo' && (
        <div className="space-y-3 mb-4">
          {!photoData ? (
            <button onClick={() => fileRef.current?.click()}
              className="dm-card w-full p-8 text-center"
              style={{ borderStyle: 'dashed', borderColor: 'var(--accent-line)' }}>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--accent)' }}>Foto aufnehmen oder hochladen</div>
              <div className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>Tippe um Kamera zu öffnen</div>
            </button>
          ) : (
            <div>
              <img src={photoData.url} alt="Essen" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12 }} />
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setPhotoData(null); fileRef.current.value = ''; }}
                  className="dm-btn-ghost flex-1">Anderes Foto</button>
                <button onClick={analysePhoto} disabled={analysing}
                  className="dm-btn-primary flex-1" style={{ opacity: analysing ? 0.5 : 1 }}>
                  {analysing ? 'Analysiere...' : 'Nährwerte schätzen'}
                </button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handleFile} hidden />
          {error && (
            <div className="dm-card p-3 text-xs" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
              {error}
            </div>
          )}
          <div className="text-xs" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Die KI schätzt Nährwerte aus dem Foto. Werte sind Schätzungen, du kannst sie nach der Analyse anpassen.
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-3">
          <Field label="Name *">
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="dm-input" autoFocus
              placeholder="z.B. Hähnchenbrust mit Reis" />
          </Field>
          <Field label="Portion">
            <input value={draft.portion} onChange={e => setDraft({ ...draft, portion: e.target.value })} className="dm-input"
              placeholder="z.B. 200g, 1 Schale" />
          </Field>
          <Field label="Kalorien">
            <input type="number" inputMode="numeric" value={draft.kcal}
              onChange={e => setDraft({ ...draft, kcal: e.target.value })}
              className="dm-input num" placeholder="0" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Protein (g)">
              <input type="number" inputMode="decimal" step="0.1" value={draft.protein}
                onChange={e => setDraft({ ...draft, protein: e.target.value })}
                className="dm-input num" />
            </Field>
            <Field label="Kohlenhydrate (g)">
              <input type="number" inputMode="decimal" step="0.1" value={draft.carbs}
                onChange={e => setDraft({ ...draft, carbs: e.target.value })}
                className="dm-input num" />
            </Field>
            <Field label="Fett (g)">
              <input type="number" inputMode="decimal" step="0.1" value={draft.fat}
                onChange={e => setDraft({ ...draft, fat: e.target.value })}
                className="dm-input num" />
            </Field>
            <Field label="Zucker (g)">
              <input type="number" inputMode="decimal" step="0.1" value={draft.sugar}
                onChange={e => setDraft({ ...draft, sugar: e.target.value })}
                className="dm-input num" />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="dm-btn-ghost flex-1">Abbrechen</button>
            <button onClick={submit} disabled={!draft.name} className="dm-btn-primary flex-1"
              style={{ opacity: draft.name ? 1 : 0.5 }}>Hinzufügen</button>
          </div>
        </div>
      )}
    </Sheet>
  );
};

// Plan editor — view & edit workout plan
const PlanEditor = ({ library, setLibrary }) => {
  if (!library) return null;
  const plan = getActivePlan(library);
  if (!plan) return <EmptyState icon={() => null} title="Kein Plan aktiv" hint="" />;

  // Update active plan in library
  const updatePlan = (updater) => {
    setLibrary(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const idx = next.plans.findIndex(p => p.id === next.activeId);
      if (idx === -1) return prev;
      next.plans[idx] = typeof updater === 'function' ? updater(next.plans[idx]) : updater;
      return next;
    });
  };

  const updateExercise = (dayIdx, exIdx, field, value) => {
    updatePlan(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.days[dayIdx].exercises[exIdx][field] = value;
      return next;
    });
  };

  const addExercise = (dayIdx) => {
    updatePlan(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.days[dayIdx].exercises.push({ name: 'Neue Übung', sets: 3, reps: '10', weight: '' });
      return next;
    });
  };

  const removeExercise = (dayIdx, exIdx) => {
    updatePlan(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.days[dayIdx].exercises.splice(exIdx, 1);
      return next;
    });
  };

  const addDay = () => {
    updatePlan(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.days.push({ name: `Tag ${next.days.length + 1}`, exercises: [] });
      return next;
    });
  };

  const removeDay = (dayIdx) => {
    if (plan.days.length <= 1) {
      alert('Mindestens ein Tag muss bestehen bleiben.');
      return;
    }
    if (!confirm('Tag löschen?')) return;
    updatePlan(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.days.splice(dayIdx, 1);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="dm-card-hl p-4">
        <div className="text-xs uppercase mb-2" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          Bearbeite: aktiver Plan
        </div>
        <Field label="Plan-Name">
          <input value={plan.name} onChange={e => updatePlan({ ...plan, name: e.target.value })} className="dm-input" />
        </Field>
        <div className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>
          Typ: {plan.type} · {plan.days.length} Tage
        </div>
      </div>

      {plan.days.map((day, dIdx) => (
        <div key={dIdx} className="dm-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <input value={day.name}
              onChange={e => updatePlan(prev => {
                const next = JSON.parse(JSON.stringify(prev));
                next.days[dIdx].name = e.target.value;
                return next;
              })}
              className="dm-input"
              style={{ fontWeight: 600, fontSize: 15, flex: 1 }} />
            <button onClick={() => removeDay(dIdx)}
              className="text-xs px-2" style={{ color: 'var(--ink-4)' }}>Tag löschen</button>
          </div>
          <div className="space-y-2">
            {day.exercises.map((ex, eIdx) => (
              <div key={eIdx} className="flex items-center gap-2">
                <input value={ex.name}
                  onChange={e => updateExercise(dIdx, eIdx, 'name', e.target.value)}
                  className="dm-input" style={{ flex: 2, padding: '8px 10px', fontSize: 13 }} />
                <input value={ex.sets} type="number" inputMode="numeric"
                  onChange={e => updateExercise(dIdx, eIdx, 'sets', Number(e.target.value) || 0)}
                  className="dm-input num" style={{ width: 50, padding: '8px 6px', fontSize: 13, textAlign: 'center' }}
                  placeholder="Sets" />
                <input value={ex.reps}
                  onChange={e => updateExercise(dIdx, eIdx, 'reps', e.target.value)}
                  className="dm-input" style={{ width: 70, padding: '8px 6px', fontSize: 13, textAlign: 'center' }}
                  placeholder="Reps" />
                <button onClick={() => removeExercise(dIdx, eIdx)}
                  className="text-xs px-2" style={{ color: 'var(--ink-4)' }}>×</button>
              </div>
            ))}
            <button onClick={() => addExercise(dIdx)}
              className="dm-chip w-full justify-center" style={{ padding: '6px', fontSize: 11 }}>
              + Übung
            </button>
          </div>
        </div>
      ))}

      <button onClick={addDay} className="dm-btn-ghost w-full">
        + Neuer Tag
      </button>

      <div className="dm-card p-3 text-xs" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
        Um andere Pläne zu erstellen oder zu wechseln (Kickboxen, Cardio, Yoga...), gehe zu Workout → "Plan wechseln" und wähle ein Template.
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STATS VIEW
// ─────────────────────────────────────────────────────────────
const StatsView = ({ tasks, transactions, fixed = [], contacts, attempts, projects, currency }) => {
  // Last 30 days money
  const last30 = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTx = transactions.filter(t => t.date.slice(0, 10) === key);
      const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
      days.push({
        date: d.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' }),
        Einnahmen: inc, Ausgaben: exp, Netto: inc - exp
      });
    }
    return days;
  }, [transactions]);

  // Tasks completed per week (last 8 weeks)
  const taskWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7 - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const completed = tasks.filter(t => t.completed && t.completedAt &&
        new Date(t.completedAt) >= start && new Date(t.completedAt) <= end).length;
      weeks.push({
        week: `KW${getISOWeek(end)}`,
        completed
      });
    }
    return weeks;
  }, [tasks]);

  // Hitchtracker funnel
  const funnel = useMemo(() => {
    const counts = { new: 0, warm: 0, hot: 0, meeting: 0, closed: 0, cold: 0 };
    contacts.forEach(c => { counts[c.status || 'new'] = (counts[c.status || 'new'] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: HITCH_STATUS[k].label, value: v, color: HITCH_STATUS[k].color }));
  }, [contacts]);

  // Streak: consecutive days with a tracked event (task done OR transaction OR contact)
  const streak = useMemo(() => {
    const set = new Set();
    transactions.forEach(t => set.add(t.date.slice(0, 10)));
    tasks.filter(t => t.completed && t.completedAt).forEach(t => set.add(t.completedAt.slice(0, 10)));
    contacts.forEach(c => c.metAt && set.add(c.metAt.slice(0, 10)));
    let count = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (!set.has(key)) {
        if (count === 0 && key === today()) { d.setDate(d.getDate() - 1); continue; }
        break;
      }
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [transactions, tasks, contacts]);

  // KPIs
  const monthVarIncome = transactions.filter(t => t.type === 'income' && sameMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const monthVarExpense = transactions.filter(t => t.type === 'expense' && sameMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const fixedIncomeTotal = fixed.filter(f => f.type === 'income' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
  const fixedExpenseTotal = fixed.filter(f => f.type === 'expense' && f.active !== false).reduce((s, f) => s + Number(f.amount || 0), 0);
  const monthIncome = monthVarIncome + fixedIncomeTotal;
  const monthExpense = monthVarExpense + fixedExpenseTotal;
  const taskCompletionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;
  const successAttempts = attempts.filter(a => a.outcome === 'success').length;
  const successRate = attempts.length > 0 ? Math.round((successAttempts / attempts.length) * 100) : 0;

  // Today activity score (0-100)
  const todayMetrics = useMemo(() => {
    const tasksDoneToday = tasks.filter(t => t.completed && t.completedAt && sameDay(t.completedAt)).length;
    const tasksOpenedToday = tasks.filter(t => t.createdAt && sameDay(t.createdAt)).length;
    const txToday = transactions.filter(t => sameDay(t.date));
    const incToday = txToday.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const expToday = txToday.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    const contactsToday = contacts.filter(c => c.metAt && sameDay(c.metAt)).length;
    const attemptsToday = attempts.filter(a => sameDay(a.date)).length;
    const successToday = attempts.filter(a => sameDay(a.date) && a.outcome === 'success').length;

    // Score components (max 100)
    let score = 0;
    score += Math.min(40, tasksDoneToday * 12); // up to 40 for 3+ tasks
    score += Math.min(15, txToday.length * 5); // up to 15 for tracking finance
    score += Math.min(20, (contactsToday + attemptsToday) * 8); // up to 20 for hitch activity
    if (incToday > expToday) score += 10; // positive day
    if (streak > 0) score += 15; // streak bonus
    return {
      score: Math.min(100, score),
      tasksDone: tasksDoneToday, tasksOpen: tasksOpenedToday,
      txCount: txToday.length, incToday, expToday,
      contactsToday, attemptsToday, successToday
    };
  }, [tasks, transactions, contacts, attempts, streak]);

  const barometerLabel = (s) =>
    s >= 80 ? 'Exzellent' : s >= 60 ? 'Stark' : s >= 40 ? 'Solide' : s >= 20 ? 'Okay' : 'Ruhig';
  const barometerColor = (s) =>
    s >= 80 ? '#5FA875' : s >= 60 ? '#B8A85C' : s >= 40 ? '#7DA888' : s >= 20 ? '#9F86C0' : '#6FA0BC';

  // Expense pie chart data (current month including fixed)
  const expensePie = useMemo(() => {
    const grouped = {};
    transactions.filter(t => t.type === 'expense' && sameMonth(t.date)).forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + Number(t.amount || 0);
    });
    fixed.filter(f => f.type === 'expense' && f.active !== false).forEach(f => {
      const cat = f.category || 'Sonstiges';
      grouped[cat] = (grouped[cat] || 0) + Number(f.amount || 0);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Math.round(value), color: CAT_COLORS[name] || '#8C8475' }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, fixed]);
  const expenseTotal = expensePie.reduce((s, e) => s + e.value, 0);

  return (
    <div className="px-5 pt-2 pb-32 dm-scroll">
      <div className="mb-4 mt-2">
        <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Insights</div>
        <h1 className="display text-3xl mt-0.5" style={{ fontWeight: 500 }}>Statistik</h1>
      </div>

      {/* Daily Barometer */}
      <div className="dm-card-hl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} style={{ color: barometerColor(todayMetrics.score) }} />
            <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              Tagesbarometer
            </span>
          </div>
          <span className="dm-chip" style={{ color: barometerColor(todayMetrics.score), borderColor: barometerColor(todayMetrics.score) + '66' }}>
            {barometerLabel(todayMetrics.score)}
          </span>
        </div>

        {/* Big circular gauge SVG */}
        <div className="flex items-center justify-center my-2" style={{ position: 'relative' }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="var(--bg-3)" strokeWidth="10" />
            <circle cx="70" cy="70" r="58" fill="none"
              stroke={barometerColor(todayMetrics.score)} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(todayMetrics.score / 100) * 364.4} 364.4`}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div className="display num" style={{ fontSize: 38, fontWeight: 600, color: barometerColor(todayMetrics.score), lineHeight: 1 }}>
              {todayMetrics.score}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>von 100</div>
          </div>
        </div>

        {/* Today summary */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line-soft)' }}>
          <div className="text-center">
            <div className="num" style={{ fontWeight: 600 }}>{todayMetrics.tasksDone}</div>
            <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Erledigt</div>
          </div>
          <div className="text-center">
            <div className="num" style={{ fontWeight: 600, color: (todayMetrics.incToday - todayMetrics.expToday) >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {(todayMetrics.incToday - todayMetrics.expToday) >= 0 ? '+' : ''}{fmt(todayMetrics.incToday - todayMetrics.expToday, currency)}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Heute Netto</div>
          </div>
          <div className="text-center">
            <div className="num" style={{ fontWeight: 600 }}>{todayMetrics.contactsToday + todayMetrics.attemptsToday}</div>
            <div className="text-xs" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Hitch heute</div>
          </div>
        </div>
      </div>

      {/* Hero — streak */}
      <div className="dm-card-hl p-5 mb-4 text-center" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, var(--accent-soft), transparent 60%)' }} />
        <div style={{ position: 'relative' }}>
          <Sparkles size={18} style={{ color: 'var(--accent)', margin: '0 auto 8px' }} />
          <div className="display num" style={{ fontSize: 56, fontWeight: 600, lineHeight: 1, color: 'var(--accent)' }}>{streak}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>Tage Streak</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>aufeinanderfolgende aktive Tage</div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="Monat Netto" value={fmt(monthIncome - monthExpense, currency)}
          accent={(monthIncome - monthExpense) >= 0 ? 'var(--green)' : 'var(--red)'} icon={Wallet} />
        <StatCard label="Erledigt" value={`${taskCompletionRate}%`}
          sub={`${tasks.filter(t => t.completed).length}/${tasks.length}`} icon={CheckSquare} />
        <StatCard label="Hitch Rate" value={`${successRate}%`}
          sub={`${successAttempts}/${attempts.length}`} accent="var(--accent)" icon={Heart} />
        <StatCard label="Aktive Projekte" value={projects.filter(p => p.status === 'active').length}
          sub={`${projects.length} total`} icon={Briefcase} />
      </div>

      {/* Money chart 30d */}
      <div className="dm-card p-4 mb-4">
        <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          Cashflow · 30 Tage
        </div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={last30} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7DA888" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7DA888" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#25342B" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#7E8C82', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7E8C82', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: '#16201A', border: '1px solid #25342B', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => fmt(v, currency)} />
              <Area type="monotone" dataKey="Netto" stroke="#7DA888" strokeWidth={2} fill="url(#gNet)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Pie Chart */}
      {expensePie.length > 0 && (
        <div className="dm-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
              Ausgaben Verteilung · {monthDE()}
            </div>
            <span className="num text-xs" style={{ color: 'var(--ink-2)' }}>{fmt(expenseTotal, currency)}</span>
          </div>
          <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={expensePie} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={36} outerRadius={70}
                  paddingAngle={1} stroke="var(--bg)" strokeWidth={2}>
                  {expensePie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#16201A', border: '1px solid #25342B', borderRadius: 8, fontSize: 12 }}
                  formatter={(v, n) => [fmt(v, currency), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, maxHeight: 220, overflowY: 'auto' }} className="dm-scroll">
              {expensePie.map((e, i) => {
                const pct = expenseTotal > 0 ? (e.value / expenseTotal * 100).toFixed(0) : 0;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                    <span className="flex-1 truncate" style={{ color: 'var(--ink-2)' }}>{e.name}</span>
                    <span className="num" style={{ color: 'var(--ink-3)', fontSize: 10 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tasks per week */}
      <div className="dm-card p-4 mb-4">
        <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
          Aufgaben erledigt · 8 Wochen
        </div>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={taskWeeks} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#25342B" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#7E8C82', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7E8C82', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: '#16201A', border: '1px solid #25342B', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="completed" fill="#8FB172" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hitch funnel */}
      {contacts.length > 0 && (
        <div className="dm-card p-4 mb-4">
          <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Hitch Funnel
          </div>
          <div className="space-y-2">
            {funnel.filter(f => f.value > 0).map((f, i) => {
              const pct = (f.value / contacts.length) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{f.name}</span>
                    <span className="num" style={{ color: 'var(--ink-2)' }}>{f.value}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: f.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity summary — comprehensive */}
      <div className="dm-card-hl p-5 mt-4" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)' }} />
        <div className="flex items-center gap-2 mb-3" style={{ position: 'relative' }}>
          <Award size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
            Zusammenfassung · {dateLongDE()}
          </span>
        </div>

        <div className="space-y-3" style={{ position: 'relative' }}>
          {/* Tasks summary */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <CheckSquare size={16} style={{ color: '#6FA0BC', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Aufgaben</div>
              <div className="text-sm mt-0.5">
                <span className="num" style={{ fontWeight: 600 }}>{todayMetrics.tasksDone}</span> heute erledigt ·
                <span className="num" style={{ fontWeight: 600 }}> {tasks.filter(t => !t.completed).length}</span> offen ·
                <span className="num" style={{ fontWeight: 600 }}> {tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0))).length}</span> überfällig
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {projects.filter(p => p.status === 'active').length} aktive Projekte
              </div>
            </div>
          </div>

          {/* Money summary */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <Wallet size={16} style={{ color: '#5FA875', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Finanzen</div>
              <div className="text-sm mt-0.5">
                <span className="num" style={{ fontWeight: 600, color: (monthIncome - monthExpense) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmt(monthIncome - monthExpense, currency)}
                </span> netto · <span className="num">{transactions.filter(t => sameMonth(t.date)).length}</span> Buchungen
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Fixkosten: {fmt(fixedIncomeTotal - fixedExpenseTotal, currency)}/Monat ·
                {' '}{fixed.filter(f => f.category === 'Abonnement' && f.active !== false).length} Abos
              </div>
            </div>
          </div>

          {/* Hitch summary */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <Heart size={16} style={{ color: '#7DA888', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Hitchtracker</div>
              <div className="text-sm mt-0.5">
                <span className="num" style={{ fontWeight: 600 }}>{contacts.length}</span> Kontakte ·
                <span className="num" style={{ fontWeight: 600 }}> {successRate}%</span> Erfolgsrate ·
                {(() => {
                  const r = contacts.filter(c => c.rating >= 5);
                  return r.length > 0
                    ? <> Ø <span className="num" style={{ fontWeight: 600 }}>{(r.reduce((s, c) => s + c.rating, 0) / r.length).toFixed(1)}</span>/10</>
                    : null;
                })()}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {contacts.filter(c => daysAgo(c.metAt) <= 7).length} diese Woche · {' '}
                {contacts.filter(c => c.followUpDate && new Date(c.followUpDate) <= new Date() && c.status !== 'closed').length} Follow-ups fällig
              </div>
            </div>
          </div>

          {/* Streak/momentum */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <Sparkles size={16} style={{ color: '#B8A85C', marginTop: 2, flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-xs uppercase" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Momentum</div>
              <div className="text-sm mt-0.5">
                <span className="num" style={{ fontWeight: 600 }}>{streak}</span> Tage Streak ·
                Heute Score <span className="num" style={{ fontWeight: 600, color: barometerColor(todayMetrics.score) }}>{todayMetrics.score}/100</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Status: {barometerLabel(todayMetrics.score)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ─────────────────────────────────────────────────────────────
// SETTINGS / EXPORT-IMPORT
// ─────────────────────────────────────────────────────────────
const SettingsSheet = ({ open, onClose, settings, setSettings, all, importAll, resetProjects }) => {
  const [draft, setDraft] = useState(settings);
  const [backupOpen, setBackupOpen] = useState(false);
  const fileRef = useRef();

  useEffect(() => { if (open) setDraft(settings); }, [open, settings]);

  // Generate backup JSON string (no side effects, completely safe)
  const generateBackupJson = () => {
    try {
      return JSON.stringify({ exportedAt: now(), version: 1, ...all }, null, 2);
    } catch (e) {
      console.error('Backup serialization failed:', e);
      return null;
    }
  };

  const exportICS = () => {
    const events = [
      ...all.tasks.filter(t => t.dueDate && !t.completed).map(t => ({
        id: t.id, title: t.title, description: t.notes || '', start: t.dueDate
      })),
      ...all.contacts.filter(c => c.followUpDate).map(c => ({
        id: c.id, title: `Follow-up: ${c.name}`, description: c.notes || '',
        location: c.location || '', start: c.followUpDate
      }))
    ];
    if (events.length === 0) { alert('Keine Termine zum Exportieren'); return; }
    const ok = downloadFile(`daymaker-calendar-${today()}.ics`, buildICS(events), 'text/calendar');
    if (!ok) alert('Download in diesem Browser nicht möglich. Bitte Backup-Sheet nutzen und Inhalt manuell kopieren.');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // No confirm() — iOS webviews suppress it. Direct import; user already chose the file.
        importAll(data);
        alert('Import erfolgreich');
        onClose();
      } catch {
        alert('Ungültige Datei');
      }
    };
    reader.readAsText(file);
  };

  const save = () => { setSettings(draft); onClose(); };

  return (
    <Sheet open={open} onClose={onClose} title="Einstellungen">
      <div className="space-y-4">
        <Field label="Name">
          <input value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="dm-input" placeholder="Dein Name" />
        </Field>
        <Field label="Währung">
          <select value={draft.currency || 'CHF'} onChange={e => setDraft({ ...draft, currency: e.target.value })} className="dm-input">
            <option value="CHF">CHF — Schweizer Franken</option>
            <option value="EUR">EUR — Euro</option>
            <option value="USD">USD — US Dollar</option>
            <option value="GBP">GBP — Pfund</option>
          </select>
        </Field>

        <button onClick={save} className="dm-btn-primary mt-2">Speichern</button>

        <div className="pt-4" style={{ borderTop: '1px solid var(--line-soft)' }}>
          <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Daten</div>
          <div className="dm-card p-4 mb-3" style={{ borderColor: 'var(--accent-line)', background: 'var(--accent-soft)' }}>
            <div className="text-sm mb-1" style={{ fontWeight: 500, color: 'var(--accent)' }}>
              <AlertCircle size={14} className="inline mr-1.5" /> Backup wichtig
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Daten werden im Browser gespeichert. Exportiere regelmässig ein Backup,
              damit nichts verloren geht.
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={() => setBackupOpen(true)} className="dm-btn-primary w-full">
              Sync & Backup öffnen
            </button>
            <button onClick={exportICS} className="dm-btn-ghost w-full">
              Termine als .ics herunterladen
            </button>
            <button onClick={() => fileRef.current?.click()} className="dm-btn-ghost w-full">
              Datei-Import (Desktop)
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json,text/plain" onChange={handleImport} hidden />
          </div>

          <div className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            <strong style={{ color: 'var(--ink-2)' }}>Google Kalender Sync:</strong> Direktes Sync nicht möglich
            in dieser App. Nutze den .ics Export für einmaligen Import,
            oder die GCal-Buttons bei einzelnen Aufgaben/Follow-ups für sofortiges Hinzufügen.
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid var(--line-soft)' }}>
          <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Wiederherstellen</div>
          <button onClick={() => {
              if (!confirm('Standardprojekte (AI Private Coach, Roki.kids, HookALand Music, Fitness & Gym Goals, Karma) und Preset-Tasks wiederherstellen? Bestehende Projekte und Tasks bleiben erhalten — fehlende werden ergänzt.')) return;
              const result = resetProjects && resetProjects();
              if (result) {
                alert(`${result.projects} Projekte wiederhergestellt, ${result.tasks} Tasks hinzugefügt.`);
              }
            }} className="dm-btn-ghost w-full text-sm">
            Standardprojekte + Tasks wiederherstellen
          </button>
          <div className="text-xs mt-2" style={{ color: 'var(--ink-4)', lineHeight: 1.4 }}>
            Falls Projekte oder Preset-Tasks verloren gegangen sind, hier wiederherstellen.
            Bestehende Projekte werden nicht überschrieben.
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid var(--line-soft)' }}>
          <div className="text-xs uppercase mb-3" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>Account</div>
          <button onClick={async () => {
              if (!confirm('Wirklich abmelden? Deine Daten bleiben in der Cloud — beim nächsten Login wieder verfügbar.')) return;
              await signOut();
            }} className="dm-btn-ghost w-full text-sm" style={{ color: 'var(--ink-2)' }}>
            Abmelden
          </button>
          <div className="text-xs mt-2" style={{ color: 'var(--ink-4)', lineHeight: 1.4 }}>
            Deine Daten werden in der Supabase-Cloud gespeichert. Beim nächsten Login auf jedem Gerät sind sie wieder da.
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid var(--line-soft)' }}>
          <div className="text-xs" style={{ color: 'var(--ink-4)', textAlign: 'center' }}>
            Daymaker · v2.0 · {all.tasks.length} Aufgaben · {all.transactions.length} Buchungen · {all.fixed?.length || 0} Fixkosten · {all.contacts.length} Kontakte
          </div>
        </div>
      </div>

      {backupOpen && (
        <BackupSheet
          json={generateBackupJson()}
          onClose={() => setBackupOpen(false)}
          onImport={(data) => { importAll(data); }} />
      )}
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────
// BACKUP SHEET — robust JSON export + paste-import (works on iPhone)
// ─────────────────────────────────────────────────────────────
const BackupSheet = ({ json, onClose, onImport }) => {
  const [tab, setTab] = useState('export'); // export | import
  const [copied, setCopied] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [pasteContent, setPasteContent] = useState('');
  const [importError, setImportError] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const textareaRef = useRef();
  const importTextareaRef = useRef();

  if (!json) {
    return (
      <Sheet open={true} onClose={onClose} title="Backup-Fehler">
        <div className="dm-card p-4 text-sm" style={{ color: 'var(--red)' }}>
          Backup konnte nicht erstellt werden.
        </div>
      </Sheet>
    );
  }

  const filename = `daymaker-backup-${today()}.json`;
  const sizeKb = Math.round(json.length / 1024 * 10) / 10;

  const handleCopy = async () => {
    const ok = await copyToClipboard(json);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      alert('Auto-Copy nicht möglich. Inhalt ist markiert — bitte mit Cmd/Ctrl+C kopieren.');
    }
  };

  const handleDownload = () => {
    const ok = downloadFile(filename, json, 'application/json');
    setDownloadStatus(ok ? 'success' : 'failed');
    setTimeout(() => setDownloadStatus(null), 3000);
  };

  const validateImport = (text) => {
    setImportError(null);
    setImportPreview(null);
    if (!text || !text.trim()) return;
    try {
      const data = JSON.parse(text.trim());
      const counts = {
        tasks: data.tasks?.length || 0,
        transactions: data.transactions?.length || 0,
        contacts: data.contacts?.length || 0,
        fixed: data.fixed?.length || 0,
        projects: data.projects?.length || 0,
        workouts: data.workouts?.length || 0,
        foods: data.foods?.length || 0
      };
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      if (total === 0 && !data.settings) {
        setImportError('Datei sieht leer aus — keine Aufgaben/Buchungen/Kontakte enthalten');
        return;
      }
      setImportPreview({ data, counts, exported: data.exportedAt });
    } catch (e) {
      setImportError('Ungültiges JSON-Format. Hast du den kompletten Inhalt von { bis } kopiert?');
    }
  };

  const handlePasteChange = (text) => {
    setPasteContent(text);
    validateImport(text);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPasteContent(text);
          validateImport(text);
          return;
        }
      }
    } catch (e) {}
    // Fallback: focus textarea so user can paste manually
    if (importTextareaRef.current) {
      importTextareaRef.current.focus();
      alert('Auto-Paste nicht möglich. Bitte Tap im Textfeld und manuell einfügen (Cmd/Ctrl+V).');
    }
  };

  const handleImport = () => {
    if (!importPreview) return;
    if (!confirmingImport) {
      setConfirmingImport(true);
      return;
    }
    onImport(importPreview.data);
    setPasteContent('');
    setImportPreview(null);
    setConfirmingImport(false);
    onClose();
  };

  return (
    <Sheet open={true} onClose={onClose} title="Sync & Backup" height="92vh">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('export')}
          className={`dm-chip flex-1 justify-center ${tab === 'export' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>
          Backup machen
        </button>
        <button onClick={() => setTab('import')}
          className={`dm-chip flex-1 justify-center ${tab === 'import' ? 'dm-chip-active' : ''}`}
          style={{ padding: '10px' }}>
          Backup laden
        </button>
      </div>

      {tab === 'export' && (
        <div className="space-y-3">
          <div className="dm-card p-3" style={{ borderColor: 'var(--accent-line)', background: 'var(--accent-soft)' }}>
            <div className="text-sm" style={{ fontWeight: 600, color: 'var(--accent)' }}>{filename}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{sizeKb} KB</div>
          </div>

          <button onClick={handleCopy} className="dm-btn-primary w-full"
            style={{ background: copied ? 'var(--green)' : 'var(--accent)' }}>
            {copied ? '✓ Kopiert — jetzt in Notiz einfügen' : 'In Zwischenablage kopieren'}
          </button>

          <button onClick={handleDownload} className="dm-btn-ghost w-full">
            {downloadStatus === 'success' ? '✓ Download gestartet' :
             downloadStatus === 'failed' ? '✗ Download blockiert — bitte kopieren' :
             'Als .json herunterladen (Desktop)'}
          </button>

          <div className="dm-card p-3 text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>iPhone ↔ Laptop Sync:</div>
            <div>1. Laptop: "In Zwischenablage kopieren"</div>
            <div>2. Apple Notizen / Google Keep öffnen → Notiz "Daymaker Sync" → Cmd+V</div>
            <div>3. Notiz syncronisiert via iCloud / Google Konto</div>
            <div>4. iPhone: gleiche Notiz öffnen → Inhalt kopieren</div>
            <div>5. iPhone: in dieser App → Einstellungen → Backup → "Backup laden" Tab → einfügen</div>
          </div>

          <div>
            <div className="text-xs mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Backup-Inhalt:
            </div>
            <textarea
              ref={textareaRef}
              value={json}
              readOnly
              onClick={(e) => e.target.select()}
              className="dm-input mono"
              style={{
                minHeight: 160, maxHeight: 320, fontSize: 10, lineHeight: 1.4,
                fontFamily: 'JetBrains Mono, monospace', resize: 'vertical',
                padding: 12, whiteSpace: 'pre', overflowX: 'auto'
              }} />
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="space-y-3">
          <div className="dm-card p-3" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
            <div className="text-sm" style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
              Backup einfügen
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Kopiere den JSON-Inhalt aus deiner Notiz (auf einem anderen Gerät erstellt) und füge ihn unten ein.
            </div>
          </div>

          <button onClick={handlePasteFromClipboard} className="dm-btn-primary w-full">
            Aus Zwischenablage einfügen
          </button>

          <div>
            <div className="text-xs mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Oder manuell einfügen (Tap → Lange drücken → Einfügen):
            </div>
            <textarea
              ref={importTextareaRef}
              value={pasteContent}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder='{"exportedAt":"...","tasks":[...]'
              className="dm-input mono"
              style={{
                minHeight: 200, maxHeight: 360, fontSize: 11, lineHeight: 1.4,
                fontFamily: 'JetBrains Mono, monospace', resize: 'vertical',
                padding: 12, whiteSpace: 'pre', overflowX: 'auto'
              }} />
          </div>

          {importError && (
            <div className="dm-card p-3 text-xs" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>
              {importError}
            </div>
          )}

          {importPreview && (
            <div className="dm-card-hl p-4" style={{ borderColor: 'var(--green)' }}>
              <div className="text-sm mb-2" style={{ fontWeight: 600, color: 'var(--green)' }}>
                ✓ Gültiges Backup erkannt
              </div>
              {importPreview.exported && (
                <div className="text-xs mb-2" style={{ color: 'var(--ink-3)' }}>
                  Erstellt: {new Date(importPreview.exported).toLocaleString('de-CH')}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                {importPreview.counts.tasks > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.tasks}</span> Aufgaben</div>}
                {importPreview.counts.transactions > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.transactions}</span> Buchungen</div>}
                {importPreview.counts.contacts > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.contacts}</span> Kontakte</div>}
                {importPreview.counts.fixed > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.fixed}</span> Fixkosten</div>}
                {importPreview.counts.projects > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.projects}</span> Projekte</div>}
                {importPreview.counts.workouts > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.workouts}</span> Workouts</div>}
                {importPreview.counts.foods > 0 && <div><span className="num" style={{ fontWeight: 600 }}>{importPreview.counts.foods}</span> Lebensmittel</div>}
              </div>
              {!confirmingImport ? (
                <button onClick={handleImport} className="dm-btn-primary w-full mt-3" style={{ background: 'var(--green)' }}>
                  Daten jetzt importieren
                </button>
              ) : (
                <div className="mt-3 dm-fade">
                  <div className="dm-card p-3 mb-2" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
                    <div className="text-sm" style={{ color: 'var(--ink)', fontWeight: 600, marginBottom: 4 }}>
                      ⚠ Aktuelle Daten werden überschrieben
                    </div>
                    <div className="text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.4 }}>
                      Alle Aufgaben, Buchungen, Kontakte etc. die aktuell in der App sind, werden durch das Backup ersetzt. Tap nochmal um zu bestätigen.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmingImport(false)}
                      className="dm-btn-ghost flex-1">
                      Abbrechen
                    </button>
                    <button onClick={handleImport} className="dm-btn-primary flex-1" style={{ background: 'var(--red)' }}>
                      Ja, importieren
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={onClose} className="dm-btn-ghost w-full mt-4">
        Schliessen
      </button>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────
// ADD MODAL — quick add for any entity
// ─────────────────────────────────────────────────────────────
const AddSheet = ({ open, type, onClose, onAdd, projects, currency, prefilledProjectId }) => {
  const [activeType, setActiveType] = useState(type || 'task');
  useEffect(() => { if (type) setActiveType(type); }, [type]);

  const [task, setTask] = useState({ title: '', notes: '', dueDate: '', priority: 'normal', projectId: '' });

  useEffect(() => {
    if (open && prefilledProjectId) {
      setTask(prev => ({ ...prev, projectId: prefilledProjectId }));
    }
  }, [open, prefilledProjectId]);
  const [tx, setTx] = useState({ type: 'expense', amount: '', category: 'Lebensmittel', description: '', date: today() });
  const [proj, setProj] = useState({ name: '', notes: '', deadline: '', color: '#7DA888' });
  const [contact, setContact] = useState({ name: '', location: '', source: 'Cold Approach', status: 'new', metAt: today(), notes: '', phone: '', email: '', instagram: '', followUpDate: '' });
  const [fixedDraft, setFixedDraft] = useState({ type: 'expense', name: '', amount: '', category: 'Abonnement', dayOfMonth: 1, active: true });

  const reset = () => {
    setTask({ title: '', notes: '', dueDate: '', priority: 'normal', projectId: '' });
    setTx({ type: 'expense', amount: '', category: 'Lebensmittel', description: '', date: today() });
    setProj({ name: '', notes: '', deadline: '', color: '#7DA888' });
    setContact({ name: '', location: '', source: 'Cold Approach', status: 'new', metAt: today(), notes: '', phone: '', email: '', instagram: '', followUpDate: '' });
    setFixedDraft({ type: 'expense', name: '', amount: '', category: 'Abonnement', dayOfMonth: 1, active: true });
  };

  const submit = () => {
    if (activeType === 'task' && task.title) {
      onAdd('task', { ...task, id: uid(), completed: false, createdAt: now(),
        projectId: task.projectId || null, dueDate: task.dueDate || null });
    } else if (activeType === 'transaction' && tx.amount) {
      onAdd('transaction', { ...tx, id: uid(), amount: Number(tx.amount), date: tx.date + 'T12:00:00.000Z' });
    } else if (activeType === 'project' && proj.name) {
      onAdd('project', { ...proj, id: uid(), status: 'active', createdAt: now(), deadline: proj.deadline || null });
    } else if (activeType === 'contact' && contact.name) {
      onAdd('contact', { ...contact, id: uid(), createdAt: now(),
        metAt: contact.metAt || today(), followUpDate: contact.followUpDate || null });
    } else if (activeType === 'fixed' && fixedDraft.name && fixedDraft.amount) {
      onAdd('fixed', { ...fixedDraft, id: uid(), amount: Number(fixedDraft.amount), createdAt: now() });
    } else {
      return;
    }
    reset();
    onClose();
  };

  const types = [
    { k: 'task', l: 'Aufgabe', i: CheckSquare },
    { k: 'transaction', l: 'Buchung', i: Wallet },
    { k: 'fixed', l: 'Fixkosten', i: Repeat },
    { k: 'project', l: 'Projekt', i: Briefcase },
    { k: 'contact', l: 'Kontakt', i: Users }
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Neu hinzufügen" height="90vh">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 dm-scroll" style={{ flexWrap: 'nowrap' }}>
        {types.map(t => {
          const Icon = t.i;
          return (
            <button key={t.k} onClick={() => setActiveType(t.k)}
              className={`dm-chip ${activeType === t.k ? 'dm-chip-active' : ''}`} style={{ flexShrink: 0 }}>
              <Icon size={12} /> {t.l}
            </button>
          );
        })}
      </div>

      {activeType === 'task' && (
        <div className="space-y-3">
          <Field label="Titel *">
            <input value={task.title} onChange={e => setTask({ ...task, title: e.target.value })} className="dm-input" autoFocus />
          </Field>
          <Field label="Notizen">
            <textarea value={task.notes} onChange={e => setTask({ ...task, notes: e.target.value })} className="dm-input" rows={3} style={{ resize: 'none' }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fällig">
              <input type="date" value={task.dueDate} onChange={e => setTask({ ...task, dueDate: e.target.value })} className="dm-input" />
            </Field>
            <Field label="Priorität">
              <select value={task.priority} onChange={e => setTask({ ...task, priority: e.target.value })} className="dm-input">
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
              </select>
            </Field>
          </div>
          {projects.filter(p => p.status === 'active').length > 0 && (
            <Field label="Projekt">
              <select value={task.projectId} onChange={e => setTask({ ...task, projectId: e.target.value })} className="dm-input">
                <option value="">Kein Projekt</option>
                {projects.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
        </div>
      )}

      {activeType === 'transaction' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setTx({ ...tx, type: 'expense', category: CATEGORIES.expense[0] })}
              className={`dm-chip flex-1 justify-center ${tx.type === 'expense' ? 'dm-chip-active' : ''}`} style={{ padding: '10px' }}>
              <ArrowDownRight size={14} /> Ausgabe
            </button>
            <button onClick={() => setTx({ ...tx, type: 'income', category: CATEGORIES.income[0] })}
              className={`dm-chip flex-1 justify-center ${tx.type === 'income' ? 'dm-chip-active' : ''}`} style={{ padding: '10px' }}>
              <ArrowUpRight size={14} /> Einnahme
            </button>
          </div>
          <Field label="Betrag *">
            <div className="relative">
              <input type="number" inputMode="decimal" step="0.01" value={tx.amount}
                onChange={e => setTx({ ...tx, amount: e.target.value })}
                className="dm-input num" placeholder="0.00" autoFocus
                style={{ fontSize: 28, fontWeight: 600, padding: '20px 14px' }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--ink-3)' }}>{currency}</span>
            </div>
          </Field>
          <Field label="Kategorie">
            <select value={tx.category} onChange={e => setTx({ ...tx, category: e.target.value })} className="dm-input">
              {CATEGORIES[tx.type].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Beschreibung">
            <input value={tx.description} onChange={e => setTx({ ...tx, description: e.target.value })}
              className="dm-input" placeholder="Optional" />
          </Field>
          <Field label="Datum">
            <input type="date" value={tx.date} onChange={e => setTx({ ...tx, date: e.target.value })} className="dm-input" />
          </Field>
        </div>
      )}

      {activeType === 'project' && (
        <div className="space-y-3">
          <Field label="Name *">
            <input value={proj.name} onChange={e => setProj({ ...proj, name: e.target.value })} className="dm-input" autoFocus />
          </Field>
          <Field label="Beschreibung">
            <textarea value={proj.notes} onChange={e => setProj({ ...proj, notes: e.target.value })} className="dm-input" rows={3} style={{ resize: 'none' }} />
          </Field>
          <Field label="Deadline">
            <input type="date" value={proj.deadline} onChange={e => setProj({ ...proj, deadline: e.target.value })} className="dm-input" />
          </Field>
          <Field label="Farbe">
            <div className="flex gap-2">
              {['#7DA888', '#5FA875', '#6FA0BC', '#9F86C0', '#C66454', '#B8A85C', '#5BAEA0'].map(c => (
                <button key={c} onClick={() => setProj({ ...proj, color: c })}
                  style={{ width: 32, height: 32, borderRadius: 8, background: c,
                    border: proj.color === c ? '2px solid var(--ink)' : '2px solid transparent' }} />
              ))}
            </div>
          </Field>
        </div>
      )}

      {activeType === 'fixed' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setFixedDraft({ ...fixedDraft, type: 'expense', category: CATEGORIES.expense[0] })}
              className={`dm-chip flex-1 justify-center ${fixedDraft.type === 'expense' ? 'dm-chip-active' : ''}`} style={{ padding: '10px' }}>
              <ArrowDownRight size={14} /> Fixe Ausgabe
            </button>
            <button onClick={() => setFixedDraft({ ...fixedDraft, type: 'income', category: CATEGORIES.income[0] })}
              className={`dm-chip flex-1 justify-center ${fixedDraft.type === 'income' ? 'dm-chip-active' : ''}`} style={{ padding: '10px' }}>
              <ArrowUpRight size={14} /> Fixe Einnahme
            </button>
          </div>
          <Field label="Name *">
            <input value={fixedDraft.name} onChange={e => setFixedDraft({ ...fixedDraft, name: e.target.value })}
              className="dm-input" autoFocus
              placeholder={fixedDraft.type === 'income' ? 'z.B. Gehalt, Stipendium' : 'z.B. Miete, Spotify, Krankenkasse'} />
          </Field>
          <Field label="Monatlicher Betrag *">
            <div className="relative">
              <input type="number" inputMode="decimal" step="0.01" value={fixedDraft.amount}
                onChange={e => setFixedDraft({ ...fixedDraft, amount: e.target.value })}
                className="dm-input num" placeholder="0.00"
                style={{ fontSize: 28, fontWeight: 600, padding: '20px 14px' }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--ink-3)' }}>{currency}</span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategorie">
              <select value={fixedDraft.category} onChange={e => setFixedDraft({ ...fixedDraft, category: e.target.value })} className="dm-input">
                {CATEGORIES[fixedDraft.type].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Tag im Monat">
              <input type="number" min="1" max="31" value={fixedDraft.dayOfMonth}
                onChange={e => setFixedDraft({ ...fixedDraft, dayOfMonth: Number(e.target.value) || 1 })}
                className="dm-input num" />
            </Field>
          </div>
          <Field label="Gruppe">
            <select value={fixedDraft.group || ''} onChange={e => setFixedDraft({ ...fixedDraft, group: e.target.value || null })} className="dm-input">
              <option value="">(Automatisch)</option>
              <option>Einnahmen</option>
              <option>Privat</option>
              <option>Extern</option>
              <option>Steuern</option>
              <option>AI Tools</option>
              <option>Sonstiges</option>
            </select>
          </Field>
          {fixedDraft.category === 'Abonnement' && (
            <Field label="Abo seit (Startdatum)">
              <input type="date" value={fixedDraft.startDate || ''}
                onChange={e => setFixedDraft({ ...fixedDraft, startDate: e.target.value || null })}
                className="dm-input" />
            </Field>
          )}
          <div className="dm-card p-3 text-xs" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>
            <Lightbulb size={12} className="inline mr-1" style={{ color: 'var(--accent)' }} />
            Fixkosten zählen automatisch zur monatlichen Bilanz. Bei Abos kannst du Reminder im Google Kalender aktivieren.
          </div>
        </div>
      )}

      {activeType === 'contact' && (
        <ContactForm draft={contact} setDraft={setContact} onSave={submit} onCancel={onClose} />
      )}

      {activeType !== 'contact' && (
        <button onClick={submit} className="dm-btn-primary mt-5">Hinzufügen</button>
      )}
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function Daymaker() {
  const [tab, setTab] = useState('today');
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState('task');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const [tasks, setTasks, tasksLoaded] = useStorage('daymaker:tasks', []);
  const [transactions, setTransactions, txLoaded] = useStorage('daymaker:transactions', []);
  const [projects, setProjects, projLoaded] = useStorage('daymaker:projects', []);
  const [contacts, setContacts, conLoaded] = useStorage('daymaker:contacts', []);
  const [attempts, setAttempts, attLoaded] = useStorage('daymaker:attempts', []);
  const [fixed, setFixed, fixedLoaded] = useStorage('daymaker:fixed', []);
  const [coachChat, setCoachChat, chatLoaded] = useStorage('daymaker:coach', []);
  const [workouts, setWorkouts, wLoaded] = useStorage('daymaker:workouts', []);
  const [foods, setFoods, foodsLoaded] = useStorage('daymaker:foods', []);
  const [exercisePlan, setExercisePlan, planLoaded] = useStorage('daymaker:plan', null);
  const [settings, setSettings, setLoaded] = useStorage('daymaker:settings', { name: '', currency: 'CHF' });

  const allLoaded = tasksLoaded && txLoaded && projLoaded && conLoaded && attLoaded && setLoaded && fixedLoaded && chatLoaded && wLoaded && foodsLoaded && planLoaded;

  // Onboarding for first time users
  const [showOnboard, setShowOnboard] = useState(false);
  useEffect(() => {
    if (allLoaded && !settings.name && !settings.onboarded) {
      setShowOnboard(true);
    }
  }, [allLoaded, settings]);

  // Seed default projects + their preset tasks (v4 — self-healing)
  // Runs once initially, also re-runs if user clicks "Reset Projects" in settings
  const seedProjects = (force = false) => {
    const SEED_PROJECTS = [
      {
        name: 'AI Private Coach', color: '#7DA888',
        tasks: ['Build landing page', 'Set up Stripe', 'Create lead magnet',
          'Write email sequence', 'LinkedIn content', 'AI coaching sessions']
      },
      {
        name: 'Roki.kids', color: '#6FA0BC',
        tasks: ['Finish gamification MVP', 'Partner outreach', 'Design character assets',
          'Build demo video', 'Investor deck slide 3']
      },
      {
        name: 'HookALand Music', color: '#9F86C0',
        tasks: ['Beat production session', 'Record vocals', 'Digital marketing post',
          'AI music project', 'Upload to Distrokid', 'Mix & master track']
      },
      {
        name: 'Fitness & Gym Goals', color: '#5FA875',
        tasks: ['Leg day squats', 'Track macros', 'Meal prep Sunday',
          'Cardio session', 'Check lean bulk progress']
      },
      {
        name: 'Karma (Dog)', color: '#B8A85C',
        tasks: ['Morning walk', 'Evening walk 17:00', 'Feed Karma',
          'Vet appointment check', 'Playtime & love']
      }
    ];

    const nextProjects = [...projects];
    const newTasks = [];
    const restoredCount = { projects: 0, tasks: 0 };

    SEED_PROJECTS.forEach(seed => {
      // Match by exact name or first word (e.g. "Karma" matches "Karma (Dog)")
      let existing = nextProjects.find(p =>
        p.name === seed.name ||
        (p.name && seed.name && p.name.toLowerCase().split(' ')[0] === seed.name.toLowerCase().split(' ')[0])
      );
      // Old name migrations
      if (!existing && seed.name === 'Karma (Dog)') {
        existing = nextProjects.find(p => p.name === 'Other');
        if (existing) existing.name = seed.name;
      }
      if (!existing && seed.name === 'HookALand Music') {
        existing = nextProjects.find(p => p.name === 'Hook Music');
        if (existing) existing.name = seed.name;
      }
      if (existing) {
        existing.color = seed.color;
        if (existing.status === 'done' && force) existing.status = 'active';
      } else {
        existing = {
          id: uid(), name: seed.name, color: seed.color,
          status: 'active', createdAt: now(), notes: '', deadline: null
        };
        nextProjects.push(existing);
        restoredCount.projects++;
      }
      // Seed tasks if project has no tasks (or if force=true and user wants reset)
      const hasTasks = tasks.some(t => t.projectId === existing.id);
      if (!hasTasks) {
        seed.tasks.forEach(title => {
          newTasks.push({
            id: uid(), title, completed: false, createdAt: now(),
            projectId: existing.id, dueDate: null, notes: '', priority: 'normal'
          });
          restoredCount.tasks++;
        });
      }
    });

    setProjects(nextProjects);
    if (newTasks.length > 0) {
      setTasks([...tasks, ...newTasks]);
    }
    setSettings(s => ({ ...s, projectsSeededV4: true, projectsSeededV3: true, projectsSeeded: true }));
    return restoredCount;
  };

  // Auto-seed on first load (V4 forces re-check for users who lost projects)
  useEffect(() => {
    if (!allLoaded) return;
    if (settings.projectsSeededV4) return;
    seedProjects(false);
  }, [allLoaded, settings.projectsSeededV4]);

  // Seed default fixed costs on first run
  useEffect(() => {
    if (allLoaded && !settings.fixedSeeded && fixed.length === 0) {
      const defaults = SEED_FIXED.map(f => ({ ...f, id: uid(), createdAt: now() }));
      setFixed(defaults);
      setSettings(s => ({ ...s, fixedSeeded: true }));
    }
  }, [allLoaded, settings.fixedSeeded]);

  const [prefilledProjectId, setPrefilledProjectId] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantChats, setAssistantChats] = useStorage('daymaker:assistant', { money: [], tasks: [], hitch: [] });

  const openAdd = (type = 'task') => { setAddType(type); setAddOpen(true); };
  const openAddInProject = (projectId) => {
    setPrefilledProjectId(projectId);
    setAddType('task');
    setAddOpen(true);
  };

  const handleAdd = (kind, item) => {
    if (kind === 'task') setTasks(prev => [...prev, item]);
    if (kind === 'transaction') setTransactions(prev => [...prev, item]);
    if (kind === 'project') setProjects(prev => [...prev, item]);
    if (kind === 'contact') setContacts(prev => [...prev, item]);
    if (kind === 'fixed') setFixed(prev => [...prev, item]);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      return { ...t, completed, completedAt: completed ? now() : null };
    }));
  };

  const importAll = (data) => {
    if (data.tasks) setTasks(data.tasks);
    if (data.transactions) setTransactions(data.transactions);
    if (data.projects) setProjects(data.projects);
    if (data.contacts) setContacts(data.contacts);
    if (data.attempts) setAttempts(data.attempts);
    if (data.fixed) setFixed(data.fixed);
    if (data.coachChat) setCoachChat(data.coachChat);
    if (data.assistantChats) setAssistantChats(data.assistantChats);
    if (data.workouts) setWorkouts(data.workouts);
    if (data.foods) setFoods(data.foods);
    if (data.exercisePlan) setExercisePlan(data.exercisePlan);
    if (data.settings) setSettings(data.settings);
  };

  const tabs = [
    { k: 'today', l: 'Heute' },
    { k: 'money', l: 'Geld' },
    { k: 'tasks', l: 'Tasks' },
    { k: 'fit', l: 'Fit' },
    { k: 'hitch', l: 'Hitch' },
    { k: 'stats', l: 'Stats' }
  ];

  // Timeout fallback: if storage takes too long, show app anyway after 1.5s
  const [forceLoaded, setForceLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceLoaded(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!allLoaded && !forceLoaded) {
    return (
      <div className="dm" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Styles />
        <div style={{ textAlign: 'center' }}>
          <div className="display text-2xl" style={{ color: 'var(--ink)' }}>Daymaker</div>
          <div className="text-xs mt-2" style={{ color: 'var(--ink-3)' }}>lädt...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dm" style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <Styles />
      <div className="dm-grain" />

      {/* Top bar */}
      <header className="dm-safe-top px-5 pb-3 flex items-center justify-between" style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <div className="flex items-center gap-2">
          <div className="display text-xl" style={{ fontWeight: 600 }}>
            Day<span style={{ color: 'var(--accent)' }}>maker</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSyncOpen(true)} className="text-xs px-3 py-1.5"
            style={{ color: 'var(--accent)', border: '1px solid var(--accent-line)', borderRadius: 8, fontWeight: 600 }}>
            Sync
          </button>
          <button onClick={() => setSettingsOpen(true)} className="text-xs px-3 py-1.5"
            style={{ color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 8 }}>
            Einstellungen
          </button>
        </div>
      </header>

      {/* Main view */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {tab === 'today' && <TodayView name={settings.name} tasks={tasks} setTasks={setTasks}
          transactions={transactions}
          contacts={contacts} projects={projects} fixed={fixed} currency={settings.currency} openAdd={openAdd}
          toggleTask={toggleTask} settings={settings} setSettings={setSettings} />}
        {tab === 'money' && <MoneyView transactions={transactions} setTransactions={setTransactions}
          fixed={fixed} setFixed={setFixed} currency={settings.currency} openAdd={openAdd} />}
        {tab === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks}
          projects={projects} setProjects={setProjects} openAdd={openAdd} toggleTask={toggleTask}
          openAddInProject={openAddInProject} />}
        {tab === 'hitch' && <HitchView contacts={contacts} setContacts={setContacts}
          attempts={attempts} setAttempts={setAttempts} openAdd={openAdd} currency={settings.currency}
          coachChat={coachChat} setCoachChat={setCoachChat} userName={settings.name} />}
        {tab === 'fit' && <FitView workouts={workouts} setWorkouts={setWorkouts}
          foods={foods} setFoods={setFoods} plan={exercisePlan} setPlan={setExercisePlan}
          settings={settings} setSettings={setSettings} />}
        {tab === 'stats' && <StatsView tasks={tasks} transactions={transactions} fixed={fixed}
          contacts={contacts} attempts={attempts} projects={projects} currency={settings.currency} />}
      </main>

      {/* Floating AI Assistant button */}
      <button onClick={() => setAssistantOpen(true)}
        className="fixed flex items-center justify-center dm-pop"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 152px)',
          right: 20, height: 44, padding: '0 18px', borderRadius: 22,
          background: 'var(--bg-1)', color: 'var(--accent)', zIndex: 20,
          border: '1px solid var(--accent-line)', fontWeight: 600, fontSize: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
        Assistant
      </button>

      {/* Floating add button */}
      <button onClick={() => openAdd(tab === 'money' ? 'transaction' : tab === 'hitch' ? 'contact' : tab === 'fit' ? 'food' : tab === 'tasks' ? 'task' : 'task')}
        className="fixed flex items-center justify-center"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          right: 20, height: 52, padding: '0 22px', borderRadius: 26,
          background: 'var(--accent)', color: '#0A0F0B', zIndex: 20, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(125, 168, 136, 0.3), 0 2px 8px rgba(0,0,0,0.3)'
        }}>
        Neu
      </button>

      {/* Bottom tab nav */}
      <nav className="fixed bottom-0 left-0 right-0 dm-safe-bottom" style={{
        background: 'var(--bg-1)', borderTop: '1px solid var(--line)',
        maxWidth: 480, margin: '0 auto', zIndex: 15,
        backdropFilter: 'blur(20px)'
      }}>
        <div className="flex justify-around pt-3 pb-2">
          {tabs.map(t => {
            const active = tab === t.k;
            return (
              <button key={t.k} onClick={() => setTab(t.k)}
                className="flex flex-col items-center gap-1.5 py-1 flex-1"
                style={{ color: active ? 'var(--accent)' : 'var(--ink-3)' }}>
                <span style={{ fontWeight: active ? 600 : 500, fontSize: 11, letterSpacing: '0.02em' }}>{t.l}</span>
                <span style={{
                  width: active ? 18 : 4, height: 2, borderRadius: 1,
                  background: active ? 'var(--accent)' : 'transparent',
                  transition: 'all 0.2s'
                }} />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sheets */}
      <AddSheet open={addOpen} type={addType} onClose={() => { setAddOpen(false); setPrefilledProjectId(null); }}
        onAdd={handleAdd} projects={projects} currency={settings.currency}
        prefilledProjectId={prefilledProjectId} />

      {/* Global AI Assistant Sheet */}
      {assistantOpen && (
        <AssistantSheet open={assistantOpen} onClose={() => setAssistantOpen(false)}
          currentTab={tab}
          chats={assistantChats} setChats={setAssistantChats}
          data={{ tasks, transactions, fixed, contacts, attempts, projects, currency: settings.currency }}
          userName={settings.name} />
      )}

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)}
        settings={settings} setSettings={setSettings}
        all={{ tasks, transactions, projects, contacts, attempts, fixed, coachChat, assistantChats, workouts, foods, exercisePlan, settings }}
        importAll={importAll}
        resetProjects={() => seedProjects(true)} />

      {syncOpen && (
        <BackupSheet
          json={(() => {
            try {
              return JSON.stringify({
                exportedAt: now(), version: 1,
                tasks, transactions, projects, contacts, attempts, fixed, coachChat,
                assistantChats, workouts, foods, exercisePlan, settings
              }, null, 2);
            } catch { return null; }
          })()}
          onClose={() => setSyncOpen(false)}
          onImport={(data) => importAll(data)} />
      )}

      {/* Onboarding */}
      {showOnboard && (
        <Sheet open={true} onClose={() => { setSettings({ ...settings, onboarded: true }); setShowOnboard(false); }}
          title="Willkommen">
          <div className="text-center mb-5 mt-2">
            <div className="display text-3xl mb-2" style={{ fontWeight: 600 }}>
              Day<span style={{ color: 'var(--accent)' }}>maker</span>
            </div>
            <div className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Dein täglicher Tracker für Aufgaben, Finanzen, Projekte und Kontakte.
            </div>
          </div>

          <Field label="Wie heisst du?">
            <input value={settings.name || ''} onChange={e => setSettings({ ...settings, name: e.target.value })}
              className="dm-input" placeholder="Dein Name" autoFocus />
          </Field>
          <Field label="Währung">
            <select value={settings.currency || 'CHF'} onChange={e => setSettings({ ...settings, currency: e.target.value })} className="dm-input">
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>

          <div className="dm-card p-4 mt-4 text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--accent)' }}>💾 Wichtig:</strong> Deine Daten werden lokal gespeichert und bleiben
            zwischen Sitzungen erhalten. <strong>Exportiere regelmässig ein Backup</strong> über Einstellungen → Daten,
            damit nichts verloren geht.
            <br /><br />
            <strong style={{ color: 'var(--accent)' }}>📁 Vorgeladen:</strong> 4 Hauptprojekte (AI Private Coach, Roki.kids, Hook Music, Other)
            sind in Aufgaben → Projekte. Du kannst sie umbenennen oder weitere hinzufügen.
          </div>

          <button onClick={() => { setSettings({ ...settings, onboarded: true }); setShowOnboard(false); }}
            className="dm-btn-primary mt-5">Loslegen</button>
        </Sheet>
      )}
    </div>
  );
}
