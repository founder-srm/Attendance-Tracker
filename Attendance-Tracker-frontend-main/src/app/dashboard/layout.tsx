"use client";

import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, QrCode, Users, LogOut, Calendar, Settings, Eye } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, isViewingAsMember, setViewingAsMember } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scan QR', href: '/dashboard/scan', icon: QrCode },
    { name: 'Events & Volunteering', href: '/dashboard/events', icon: Calendar },
    { name: 'Team Profile', href: '/dashboard/team', icon: Users },
    { name: 'Edit Profile', href: '/dashboard/profile', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-club-bg">
      <aside className="w-64 bg-club-navy text-white hidden md:block flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-club-steel">
          <h1 className="text-lg font-bold text-club-gold tracking-tight">Founders' Club</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-club-steel text-white' 
                    : 'text-gray-300 hover:bg-club-steel hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-club-gold' : ''} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {profile?.role === 'admin' && (
            <div className="pt-4 border-t border-club-steel mt-4">
              <button
                onClick={() => {
                  setViewingAsMember(false);
                  router.push("/admin");
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:bg-club-steel hover:text-white text-left"
              >
                <Eye size={18} />
                <span>Admin Portal</span>
              </button>
            </div>
          )}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {profile?.role === 'admin' && isViewingAsMember && (
          <div className="bg-yellow-500 text-black text-xs font-semibold px-6 py-2 flex items-center justify-between border-b border-yellow-600 flex-shrink-0">
            <span>You are viewing the Member Dashboard in simulation mode. Your permissions remain Admin.</span>
            <button
              onClick={() => {
                setViewingAsMember(false);
                router.push("/admin");
              }}
              className="bg-black text-white px-3 py-1 rounded hover:bg-zinc-800 transition text-[10px]"
            >
              Switch to Admin View
            </button>
          </div>
        )}

        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
          <h2 className="text-lg font-semibold text-club-navy">Member Dashboard</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-club-steel hidden sm:inline-block">
              {profile?.full_name || profile?.email || "Member"}
            </span>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm font-medium text-club-steel hover:text-club-gold transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}