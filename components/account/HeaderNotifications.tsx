'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'order' | 'stock' | 'security' | 'system' | 'trial';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

const STORAGE_KEY = 'erpfy_notifications_v1';

function getDefaultNotifications(companyName: string): NotificationItem[] {
  return [
    {
      id: 'notif-1',
      type: 'order',
      title: 'New POS Sale #SL-1082',
      message: 'Received $420.00 cash payment for Order #SL-1082.',
      time: '5m ago',
      read: false,
      link: '/account/orders',
    },
    {
      id: 'notif-2',
      type: 'stock',
      title: 'Low Stock Alert',
      message: 'Organic Arabica Beans has only 3 units left in Main Warehouse.',
      time: '45m ago',
      read: false,
      link: '/account/products',
    },
    {
      id: 'notif-3',
      type: 'security',
      title: 'Active Session Verified',
      message: 'Logged in from Chrome on Windows (127.0.0.1).',
      time: '2h ago',
      read: false,
      link: '/account/profile',
    },
    {
      id: 'notif-4',
      type: 'system',
      title: 'System Backup Completed',
      message: 'Automated encrypted database snapshot created successfully.',
      time: 'Yesterday',
      read: true,
      link: '/account/settings',
    },
    {
      id: 'notif-5',
      type: 'trial',
      title: 'Workspace Active',
      message: `${companyName || 'Your ERP'} workspace is configured and operational.`,
      time: '2d ago',
      read: true,
      link: '/account',
    },
  ];
}

export function HeaderNotifications({
  companyName = 'ERPFY',
}: {
  companyName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        /* ignore */
      }
    }
    return getDefaultNotifications(companyName);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync back to localStorage
  const updateNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    updateNotifications(updated);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = notifications.filter((n) => n.id !== id);
    updateNotifications(updated);
  };

  const clearAll = () => {
    updateNotifications([]);
  };

  const resetDefaults = () => {
    const defaults = getDefaultNotifications(companyName);
    updateNotifications(defaults);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case 'stock':
        return <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />;
      case 'security':
        return <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />;
      case 'trial':
        return <Clock className="size-4 text-rose-600 dark:text-rose-400" />;
      case 'system':
      default:
        return <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/50';
      case 'stock':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/50';
      case 'security':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/50';
      case 'trial':
        return 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/50';
      case 'system':
      default:
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800/50';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 p-1 text-white/90 shadow-xs transition-all hover:bg-black/35 hover:scale-105 hover:text-white active:scale-95 focus:outline-hidden',
          open && 'ring-2 ring-white/40 bg-black/35',
        )}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-xs ring-2 ring-[var(--erpfy-topbar)] animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Modal */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-88 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] text-left text-[var(--erpfy-ink)] shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] px-3.5 py-3 bg-[var(--erpfy-surface-subtle)]/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--erpfy-ink-strong)]">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                  {unreadCount} new
                </span>
              ) : (
                <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--erpfy-brand-soft-ink)]">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--erpfy-brand)] hover:bg-[var(--erpfy-hover)] transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[var(--erpfy-ink-muted)] hover:bg-[var(--erpfy-hover)] hover:text-[var(--erpfy-ink)] transition"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] px-3.5 py-1.5 bg-[var(--erpfy-surface)]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                  filter === 'all'
                    ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]'
                    : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-hover)]',
                )}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                  filter === 'unread'
                    ? 'bg-[var(--erpfy-brand-soft)] text-[var(--erpfy-brand-soft-ink)]'
                    : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-hover)]',
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] font-medium text-[var(--erpfy-ink-muted)] hover:text-red-600 transition px-1.5 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Clear all notifications"
              >
                <Trash2 className="size-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--erpfy-line-soft)]">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[var(--erpfy-surface-subtle)] text-[var(--erpfy-ink-muted)]">
                  <Sparkles className="size-5" />
                </div>
                <p className="text-xs font-bold text-[var(--erpfy-ink)]">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="text-[11px] text-[var(--erpfy-ink-muted)] mt-0.5">
                  {filter === 'unread'
                    ? 'You are all caught up on critical updates!'
                    : 'All notifications have been cleared.'}
                </p>
                {notifications.length === 0 && (
                  <button
                    type="button"
                    onClick={resetDefaults}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--erpfy-line)] bg-white dark:bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-hover)] transition"
                  >
                    Restore sample alerts
                  </button>
                )}
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const innerContent = (
                  <>
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-2xs mt-0.5',
                        getIconBg(notif.type),
                      )}
                    >
                      {getIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            'text-xs truncate',
                            notif.read
                              ? 'text-[var(--erpfy-ink)] font-semibold'
                              : 'text-[var(--erpfy-ink-strong)] font-bold',
                          )}
                        >
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="size-1.5 rounded-full bg-[var(--erpfy-brand)] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--erpfy-ink-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-[var(--erpfy-ink-muted)] font-medium mt-1 inline-block">
                        {notif.time}
                      </span>
                    </div>

                    {/* Delete item button */}
                    <button
                      type="button"
                      onClick={(e) => deleteNotification(notif.id, e)}
                      className="absolute right-2.5 top-3 p-1 rounded-md text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Dismiss notification"
                      aria-label={`Dismiss ${notif.title}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                );

                const itemClass = cn(
                  'group relative flex w-full items-start gap-3 p-3 text-left transition hover:bg-[var(--erpfy-hover)]',
                  !notif.read && 'bg-[var(--erpfy-brand-soft)]/20',
                );

                return notif.link ? (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                      setOpen(false);
                    }}
                    className={itemClass}
                  >
                    {innerContent}
                  </Link>
                ) : (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                    }}
                    className={itemClass}
                  >
                    {innerContent}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--erpfy-line-soft)] px-3 py-2 bg-[var(--erpfy-surface-subtle)]/40 text-center">
            <Link
              href="/account/settings"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-brand)] transition"
            >
              Notification Preferences & Settings →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
