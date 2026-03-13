'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Calendar, Download, Loader2, ArrowUpRight, ArrowDownRight, 
  DollarSign, ShoppingCart, TrendingUp 
} from 'lucide-react';

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [rangoFechas, setRangoFechas] = useState({
    desde: new Date(new Date().setDate(1)).toISOString().split('T')[0], // Primer día del mes
    hasta: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [rangoFechas]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ventasData, productosData, dashboardData] = await Promise.all([
        api.get(`/reportes/ventas-mes`),
        api.get('/reportes/productos-mas-vendidos?periodo=30'),
        api.get('/reportes/dashboard')
      ]);
      
      setData({
        ventasMes: ventasData.data,
        productosTop: productosData.data,
        kpis: dashboardData.data
      });
    } catch (error) {
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={48} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <TrendingUp size={32} className="text-emerald-500" />
            Reportes y Analíticas
          </h1>
          <p className="text-slate-400 mt-1">Análisis detallado del rendimiento de tu negocio</p>
        </div>
        
        <div className="flex gap-4 items-center PrintHidden">
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-4 border border-slate-700">
            <Calendar size={20} className="text-slate-400" />
            <input 
              type="date" 
              value={rangoFechas.desde}
              onChange={(e) => setRangoFechas({...rangoFechas, desde: e.target.value})}
              className="bg-transparent border-none p-0 !text-sm text-slate-300 focus:ring-0" 
            />
            <span className="text-slate-500">-</span>
            <input 
              type="date" 
              value={rangoFechas.hasta}
              onChange={(e) => setRangoFechas({...rangoFechas, hasta: e.target.value})}
              className="bg-transparent border-none p-0 !text-sm text-slate-300 focus:ring-0" 
            />
          </div>
          <button 
            onClick={handleImprimir}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-colors"
          >
            <Download size={20} /> Exportar
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border-emerald-500/30 border-l-4">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Ingresos del Mes</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-white">{formatCurrency(data.kpis.ventas_mes.monto || 0)}</h3>
            <span className="flex items-center text-emerald-400 text-sm font-bold bg-emerald-500/10 px-2 py-1 rounded">
              <ArrowUpRight size={16} /> +12%
            </span>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl border-blue-500/30 border-l-4">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Operaciones</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-white">{data.kpis.ventas_mes.total || 0} tickets</h3>
            <span className="flex items-center text-emerald-400 text-sm font-bold bg-emerald-500/10 px-2 py-1 rounded">
              <ArrowUpRight size={16} /> +5%
            </span>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl border-amber-500/30 border-l-4">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Ticket Promedio</p>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-white">
              {formatCurrency(data.kpis.ventas_mes.total ? data.kpis.ventas_mes.monto / data.kpis.ventas_mes.total : 0)}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Curva de Ventas */}
        <div className="glass p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-6">Evolución de Ingresos (Mensual)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.ventasMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="fecha" 
                  stroke="#94a3b8" 
                  tickFormatter={(val) => new Date(val).getDate().toString()}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickFormatter={(val) => `$${val/1000}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('es-AR')}
                  formatter={(value: any) => [formatCurrency(value), 'Monto']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_monto" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#0f172a' }} 
                  activeDot={{ r: 8, fill: '#3b82f6' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productos Top - Barras */}
        <div className="glass p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-6">Top 5 Productos (Por Volumen)</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {data.productosTop.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.productosTop.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis dataKey="nombre" type="category" stroke="#94a3b8" width={100} tickFormatter={(val) => val.substring(0, 12) + '...'} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(value: any) => [value + ' unidades', 'Vendidos']}
                  />
                  <Bar dataKey="total_vendido" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {data.productosTop.slice(0, 5).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
                <p className="text-slate-500 text-center">No hay datos suficientes</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Detallada */}
      <div className="glass rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-white">Rendimiento por Producto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Unidades Vendidas</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Generados</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Participación (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.productosTop.slice(0,10).map((prod: any, idx: number) => {
                const totalIngresosTodos = data.productosTop.reduce((acc: number, curr: any) => acc + Number(curr.total_ingresos), 0);
                const porcentaje = ((Number(prod.total_ingresos) / totalIngresosTodos) * 100).toFixed(1);
                
                return (
                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="font-bold text-white">{prod.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {prod.total_vendido} <span className="text-slate-500 text-xs">unid.</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      {formatCurrency(prod.total_ingresos)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-300 font-mono text-sm">{porcentaje}%</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${porcentaje}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
