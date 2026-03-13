'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, ShoppingCart, PackageOpen, Users, 
  DollarSign, Clock, AlertTriangle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.rol !== 'administrador') {
      router.push('/pos');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await api.get('/reportes/dashboard');
        setData(res.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || dataLoading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-7xl mx-auto">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Resumen en tiempo real del sistema
          </p>
        </div>
        <div className="text-right glass px-4 py-2 rounded-xl">
          <p className="text-sm text-slate-400 font-medium">Fecha Actual</p>
          <p className="text-lg font-bold text-white tracking-wide">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventas de Hoy"
          value={formatCurrency(data.ventas_hoy.monto)}
          subtitle={`${data.ventas_hoy.total} tickets emitidos`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatCurrency(data.ventas_mes.monto)}
          subtitle={`${data.ventas_mes.total} operaciones`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Stock Bajo"
          value={data.stock_bajo.toString()}
          subtitle="Productos a reponer"
          icon={AlertTriangle}
          color="amber"
          alert={data.stock_bajo > 0}
        />
        <StatCard
          title="Total Productos"
          value={data.total_productos.toString()}
          subtitle={`${data.total_clientes} clientes registrados`}
          icon={PackageOpen}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Clock className="text-emerald-400" size={24} /> Ventas por Hora (Hoy)
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.ventas_por_hora}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="hora" 
                  stroke="#94a3b8" 
                  tickFormatter={(val) => `${val}:00`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickFormatter={(val) => `$${val/1000}k`}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#10b981' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  formatter={(value: any) => [formatCurrency(value), 'Monto']}
                  labelFormatter={(label) => `Hora: ${label}:00`}
                />
                <Line 
                  type="monotone" 
                  dataKey="monto" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }} 
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Sales List */}
        <div className="glass p-6 rounded-2xl flex flex-col">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-white">
            <ShoppingCart className="text-emerald-400" size={24} /> Últimas Ventas
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
            {data.ultimas_ventas.map((venta: any) => (
              <div key={venta.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs font-bold bg-slate-900 px-2 py-1 rounded text-emerald-400">
                    {venta.numero_ticket}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(venta.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-3">
                  <span className="text-xl font-bold text-white tracking-wide">{formatCurrency(venta.total)}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0
                    ${venta.metodo_pago === 'efectivo' ? 'bg-green-500/20 text-green-400' :
                      venta.metodo_pago === 'tarjeta' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'}`}>
                    {venta.metodo_pago}
                  </span>
                </div>
              </div>
            ))}
            {data.ultimas_ventas.length === 0 && (
              <div className="text-center py-10 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                No hay ventas hoy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, alert }: any) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/20 text-emerald-500 bg-emerald-500/10',
    blue: 'from-blue-500 to-indigo-500 shadow-blue-500/20 text-blue-500 bg-blue-500/10',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/20 text-amber-500 bg-amber-500/10',
    purple: 'from-purple-500 to-fuchsia-500 shadow-purple-500/20 text-purple-500 bg-purple-500/10',
  };
  const activeColor = colors[color as keyof typeof colors];

  return (
    <div className={`glass p-6 rounded-2xl relative overflow-hidden group ${alert ? 'border-amber-500/50' : ''}`}>
      {/* Background icon */}
      <Icon className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500`} />
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">{title}</p>
          <h3 className={`text-4xl font-black text-white tracking-tight ${alert ? 'text-amber-400' : ''}`}>
            {value}
          </h3>
          <p className="text-slate-500 text-sm mt-2 font-medium bg-slate-900/50 inline-block px-2 py-1 rounded-md">{subtitle}</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${activeColor.split(' ')[0]} ${activeColor.split(' ')[1]} shadow-lg ${activeColor.split(' ')[2]}`}>
          <Icon className="text-white w-7 h-7" />
        </div>
      </div>
    </div>
  );
}
