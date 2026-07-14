import React from 'react';
import { Home, Compass, Search, Library, ShieldAlert, LogOut, Disc, Bell, User } from 'lucide-react';
import { User as UserType, Notification } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserType | null;
  onLogout: () => void;
  notifications: Notification[];
  unreadCount: number;
  setShowNotifications: (show: boolean) => void;
  showNotifications: boolean;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  unreadCount,
  setShowNotifications,
  showNotifications,
}: SidebarProps) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <div className="w-64 bg-black/40 border-r border-white/5 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="relative">
          <Disc className="w-8 h-8 text-brand-magenta animate-spin" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-0 bg-brand-violet/20 blur-md rounded-full -z-10" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-wider text-glow bg-gradient-to-r from-brand-magenta via-brand-violet to-brand-cyan bg-clip-text text-transparent">
            MELODIA
          </h1>
          <span className="font-mono text-[9px] text-white/30 tracking-widest block -mt-1">AI CLOUD</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 py-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setShowNotifications(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                isActive
                  ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/10 text-white border-l-2 border-brand-violet shadow-[inset_0_0_12px_rgba(139,92,246,0.1)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-brand-violet' : 'text-white/40 group-hover:text-white/80'
              }`} />
              {item.label}
            </button>
          );
        })}

        {/* Admin Section (Seeded user 'admin@melodia.ai' / 'admin123' triggers this) */}
        {user?.role === 'admin' && (
          <div className="pt-6">
            <span className="px-4 font-mono text-[10px] text-white/30 tracking-wider uppercase block mb-2">
              System Admin
            </span>
            <button
              onClick={() => {
                setCurrentTab('admin');
                setShowNotifications(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium ${
                currentTab === 'admin'
                  ? 'bg-red-500/10 text-red-200 border-l-2 border-red-500'
                  : 'text-red-400/60 hover:text-red-200 hover:bg-red-500/5'
              }`}
            >
              <ShieldAlert className="w-5 h-5 text-red-500/80 group-hover:text-red-400" />
              Admin Panel
            </button>
          </div>
        )}
      </div>

      {/* Footer / User Profile State */}
      <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
        {user ? (
          <div className="space-y-3">
            {/* Quick Stats Trigger Notification */}
            <div className="flex items-center justify-between px-2">
              <div
                onClick={() => setCurrentTab('profile')}
                className="flex items-center gap-2 hover:bg-white/5 px-2 py-1.5 rounded-xl transition-all cursor-pointer group"
                title="View My Profile"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-violet/20 flex items-center justify-center border border-brand-violet/30 group-hover:border-brand-violet">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover animate-fade-in" />
                  ) : (
                    <User className="w-4 h-4 text-brand-violet" />
                  )}
                </div>
                <div className="max-w-[100px] truncate">
                  <p className="text-xs font-semibold text-white/90 truncate group-hover:text-brand-violet transition-colors">{user.username}</p>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{user.role}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                title="Notifications"
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-magenta" />
                )}
              </button>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white/70 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-white/5 transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout Session
            </button>
          </div>
        ) : (
          <div className="p-3 text-center rounded-xl bg-brand-violet/5 border border-brand-violet/10">
            <p className="text-xs text-white/50">Audiophile Experience</p>
            <p className="text-[10px] text-white/30 font-mono mt-1">MELODIA CLOUD MUSIC</p>
          </div>
        )}
      </div>
    </div>
  );
}
