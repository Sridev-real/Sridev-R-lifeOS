import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, Calendar, AlertTriangle, Shield, Trash2, X, ExternalLink } from 'lucide-react';
import { useLifeOS } from '../../context/LifeOSContext';
import { downloadCalendarEvent } from '../../utils/calendarExport';
import { NavTab } from '../layout/Sidebar';

interface NotificationDropdownProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigateTab }) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    dismissNotification,
    snoozeNotification,
    clearAllNotifications
  } = useLifeOS();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeNotifications = notifications.filter(n => {
    if (n.isDismissed) return false;
    if (n.snoozedUntil && new Date(n.snoozedUntil).getTime() > Date.now()) return false;
    return true;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'expiry':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'deadline':
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'problem':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'opportunity':
        return <Shield className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleActionClick = (tab?: string) => {
    if (tab && onNavigateTab) {
      onNavigateTab(tab as NavTab);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer"
        title="Notifications & Action Alerts"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Notifications
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {activeNotifications.length}
              </span>
            </div>
            {activeNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {activeNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No urgent reminders or pending action items right now.</p>
              </div>
            ) : (
              activeNotifications.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors ${
                    item.isRead
                      ? 'bg-transparent opacity-85'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/20'
                  } hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                      {getIconForType(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => dismissNotification(item.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Interactive Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                        {item.targetTab && (
                          <button
                            type="button"
                            onClick={() => {
                              markNotificationRead(item.id);
                              handleActionClick(item.targetTab);
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            Open {item.targetTab}
                          </button>
                        )}

                        {item.dueDate && (
                          <button
                            type="button"
                            onClick={() => downloadCalendarEvent(item.title, item.message, item.dueDate!)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Add to Google / Apple Calendar (.ics)"
                          >
                            <Calendar className="w-2.5 h-2.5 text-indigo-500" />
                            Add .ics
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => snoozeNotification(item.id, 1)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium cursor-pointer transition-colors"
                        >
                          Tomorrow
                        </button>

                        <button
                          type="button"
                          onClick={() => snoozeNotification(item.id, 3)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium cursor-pointer transition-colors"
                        >
                          In 3 days
                        </button>

                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-auto cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
