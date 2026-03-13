import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-[#020617] text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 lg:pl-64 h-screen overflow-y-auto">
          <div className="w-full h-full animate-fade-in p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(51, 65, 85, 0.5)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />
    </AuthProvider>
  );
}
