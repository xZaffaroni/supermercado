'use client';

import { useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Layers, Truck, ShoppingBag,
  Users, BarChart3, Wallet, Settings, LogOut, Menu, X, ChevronRight, Store
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'cajero', 'empleado'] },
  { href: '/pos', label: 'POS / Caja', icon: ShoppingCart, roles: ['administrador', 'cajero'] },
  { href: '/productos', label: 'Productos', icon: Package, roles: ['administrador', 'empleado'] },
  { href: '/inventario', label: 'Inventario', icon: Layers, roles: ['administrador', 'empleado'] },
  { href: '/proveedores', label: 'Proveedores', icon: Truck, roles: ['administrador', 'empleado'] },
  { href: '/compras', label: 'Compras', icon: ShoppingBag, roles: ['administrador', 'empleado'] },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: ['administrador', 'cajero', 'empleado'] },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['administrador'] },
  { href: '/cajas', label: 'Control de Caja', icon: Wallet, roles: ['administrador', 'cajero'] },
  { href: '/configuracion', label: 'Configuración', icon: Settings, roles: ['administrador'] },
];

export default function Sidebar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading || !user || pathname === '/login') return null;

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.rol));

  const roleBadgeColor = user.rol === 'administrador' ? 'bg-emerald-500/20 text-emerald-400' :
    user.rol === 'cajero' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg shadow-xl text-white"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-in-out
        bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-700/50
        ${collapsed ? 'w-[72px]' : 'w-64'} 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-2xl`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-slate-700/50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Store size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold text-sm tracking-wide">SuperPOS</h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">Sistema de Gestión</p>
            </div>
          )}
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {user.nombre.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.nombre}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${roleBadgeColor}`}>
                  {user.rol}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${isActive
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/5'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className={`flex-shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-white'}`} />
                {!collapsed && (
                  <span className="flex-1">{item.label}</span>
                )}
                {!collapsed && isActive && <ChevronRight size={14} className="text-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl text-sm transition-all mb-1 justify-center"
          >
            <ChevronRight size={18} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
            {!collapsed && <span>Colapsar</span>}
          </button>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
