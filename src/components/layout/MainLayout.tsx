'use client';

import { useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // The login screen renders on its own, without navigation chrome
    if (pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <div className="main-layout">
            <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-[#111827]/45 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <main className="main-content">
                <Navbar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <div className="page-content w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
