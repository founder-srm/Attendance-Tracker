"use client";

import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, CalendarDays, Users, ClipboardList, ClipboardCheck, Download, LogOut } from 'lucide-react';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Extract profile instead of user
  const { profile } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };
  
//   const adminNavItems = [
//     { name: 'Admin Dashboard', href: '/admin', icon: Settings },
//     { name: 'Manage Meetings', href: '/admin/meetings', icon: Calendar },
//     { name: 'Export Data', href: '/admin/export', icon: Download },
//   ];

    const adminNavItems = [
        { name: 'Admin Dashboard', href: '/admin', icon: Settings },
        { name: 'Manage Users', href: '/admin/users', icon: Users },
        { name: 'Manage Meetings', href: '/admin/meetings', icon: ClipboardList },
        { name: 'Manual Attendance', href: '/admin/attendance', icon: ClipboardCheck },
        { name: 'Manage Events', href: '/admin/events', icon: CalendarDays },
        { name: 'Export Reports', href: '/admin/export', icon: Download },
    ];

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <aside className="w-64 bg-zinc-900 text-white hidden md:block">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-emerald-400 tracking-tight">FC Admin Portal</h1>
        </div>
        
        <nav className="p-4 space-y-2">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-zinc-800 text-emerald-400' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Admin Control</h2>
          <div className="flex items-center space-x-4">
            {/* Display full_name and Role badge! */}
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-sm font-bold text-zinc-900">{profile?.full_name || "Admin User"}</span>
               <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">{profile?.role}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors ml-4"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}