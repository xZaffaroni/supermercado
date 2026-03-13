'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, PackageSearch, AlertTriangle, 
  Image as ImageIcon, Loader2, Save, X, ScanLine 
} from 'lucide-react';

export default function Productos() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProducto, setCurrentProducto] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barras: '',
    precio_compra: '',
    precio_venta: '',
    stock: '',
    stock_minimo: '5',
    categoria_id: '',
    proveedor_id: '',
    activo: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    try {
      const [prodRes, catRes, provRes] = await Promise.all([
        api.get(`/productos?search=${search}&limit=100`),
        api.get('/categorias'),
        api.get('/proveedores')
      ]);
      setProductos(prodRes.data.data);
      setCategorias(catRes.data);
      setProveedores(provRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (prod: any = null) => {
    if (prod) {
      setCurrentProducto(prod);
      setFormData({
        nombre: prod.nombre,
        codigo_barras: prod.codigo_barras || '',
        precio_compra: prod.precio_compra,
        precio_venta: prod.precio_venta,
        stock: prod.stock,
        stock_minimo: prod.stock_minimo,
        categoria_id: prod.categoria_id || '',
        proveedor_id: prod.proveedor_id || '',
        activo: prod.activo
      });
    } else {
      setCurrentProducto(null);
      setFormData({
        nombre: '',
        codigo_barras: '',
        precio_compra: '',
        precio_venta: '',
        stock: '0',
        stock_minimo: '5',
        categoria_id: '',
        proveedor_id: '',
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentProducto) {
        await api.put(`/productos/${currentProducto.id}`, formData);
        toast.success('Producto actualizado');
      } else {
        await api.post('/productos', formData);
        toast.success('Producto creado');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de desactivar este producto?')) {
      try {
        await api.delete(`/productos/${id}`);
        toast.success('Producto desactivado');
        fetchData();
      } catch (error) {
        toast.error('Error al desactivar');
      }
    }
  };

  const formatCurrency = (val: string | number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(val));

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <PackageSearch size={32} className="text-emerald-500" />
            Catálogo de Productos
          </h1>
          <p className="text-slate-400 mt-1">Gestiona inventario, precios y códigos de barras</p>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0 active:scale-95"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 glass rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={40} className="text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-auto flex-1 scrollbar-thin">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-900/80 sticky top-0 backdrop-blur-md z-10 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider">Código</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider text-center">Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          {prod.imagen_url ? (
                            <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <ImageIcon size={20} className="text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{prod.nombre}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                            ${prod.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                            {prod.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-800">
                        {prod.codigo_barras || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{formatCurrency(prod.precio_venta)}</span>
                        <span className="text-xs text-slate-500">Costo: {formatCurrency(prod.precio_compra)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-bold
                          ${Number(prod.stock) <= Number(prod.stock_minimo) 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                          {prod.stock}
                          {Number(prod.stock) <= Number(prod.stock_minimo) && <AlertTriangle size={14} />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {prod.categoria_nombre || <span className="text-slate-600 italic">Sin categoría</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openModal(prod)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {prod.activo && (
                          <button 
                            onClick={() => handleDelete(prod.id)}
                            className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-700 hover:border-red-500/30"
                            title="Desactivar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {productos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 bg-slate-900/20">
                      <PackageSearch size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No se encontraron productos</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-in shadow-2xl">
            <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-slate-700/50 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  {currentProducto ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                {currentProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre del Producto *</label>
                  <input
                    type="text" required value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full !text-lg !py-3"
                    placeholder="Ej: Coca-Cola 2L"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Código de Barras</label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text" value={formData.codigo_barras}
                      onChange={e => setFormData({...formData, codigo_barras: e.target.value})}
                      className="w-full pl-10 !font-mono"
                      placeholder="Escanear..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                  <select
                    value={formData.categoria_id}
                    onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                    className="w-full"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-full h-px bg-slate-800 my-4"></div>

              {/* Precios e Inventario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Precio Costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number" step="0.01" required value={formData.precio_compra}
                      onChange={e => setFormData({...formData, precio_compra: e.target.value})}
                      className="w-full pl-8 font-bold text-slate-300 focus:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 text-emerald-400">Precio Venta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                    <input
                      type="number" step="0.01" required value={formData.precio_venta}
                      onChange={e => setFormData({...formData, precio_venta: e.target.value})}
                      className="w-full pl-8 font-black text-emerald-400 border-emerald-500/30 focus:border-emerald-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Stock Inicial</label>
                  <input
                    type="number" value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    className="w-full font-bold"
                    disabled={!!currentProducto} // No se edita stock directo si ya existe (se usa ajuste)
                  />
                  {currentProducto && <p className="text-[10px] text-amber-500 mt-1">Use Ajuste de Inventario para modificar</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Stock Mínimo</label>
                  <input
                    type="number" required value={formData.stock_minimo}
                    onChange={e => setFormData({...formData, stock_minimo: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="w-full h-px bg-slate-800 my-4"></div>

              {/* Otros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Proveedor</label>
                  <select
                    value={formData.proveedor_id}
                    onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                    className="w-full"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                {currentProducto && (
                  <div className="flex items-center mt-8">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.activo}
                        onChange={e => setFormData({...formData, activo: e.target.checked})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      <span className="ml-3 text-sm font-medium text-slate-300">
                        {formData.activo ? 'Producto Activo' : 'Producto Inactivo'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
