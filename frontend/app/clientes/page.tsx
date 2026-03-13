'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Users, UserPlus, Mail, Phone, MapPin, Search, Edit2, 
  Trash2, ShoppingBag, Loader2 
} from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    notas: ''
  });

  useEffect(() => {
    fetchClientes();
  }, [search]);

  const fetchClientes = async () => {
    try {
      const res = await api.get(`/clientes?search=${search}&limit=50`);
      setClientes(res.data.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentCliente) {
        await api.put(`/clientes/${currentCliente.id}`, formData);
        toast.success('Cliente actualizado');
      } else {
        await api.post('/clientes', formData);
        toast.success('Cliente creado');
      }
      setIsModalOpen(false);
      fetchClientes();
    } catch (error) {
      toast.error('Error al guardar cliente');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <Users size={32} className="text-emerald-500" />
            Directorio de Clientes
          </h1>
          <p className="text-slate-400 mt-1">Gestiona la información y fidelización de clientes</p>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl"
            />
          </div>
          <button 
            onClick={() => {
              setCurrentCliente(null);
              setFormData({ nombre: '', telefono: '', email: '', direccion: '', notas: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <UserPlus size={20} /> <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 size={40} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max overflow-y-auto pb-6 scrollbar-thin">
          {clientes.map(cliente => (
            <div key={cliente.id} className="glass p-6 rounded-2xl border border-slate-700/50 hover:border-emerald-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold text-xl">{cliente.nombre.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-emerald-400 transition">{cliente.nombre}</h3>
                    <p className="text-xs text-slate-500">Cliente #{cliente.id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCurrentCliente(cliente); setFormData(cliente); setIsModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Phone size={16} className="text-slate-500" />
                  <span>{cliente.telefono || <span className="text-slate-600 italic">No registrado</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Mail size={16} className="text-slate-500" />
                  <span>{cliente.email || <span className="text-slate-600 italic">No registrado</span>}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <MapPin size={16} className="text-slate-500" />
                  <span className="truncate">{cliente.direccion || <span className="text-slate-600 italic">No registrado</span>}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1"><ShoppingBag size={14} /> Historial disponible</span>
                <button className="text-emerald-400 font-medium hover:text-emerald-300 transition">Ver Compras →</button>
              </div>
            </div>
          ))}
          {clientes.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 glass rounded-2xl">
              No se encontraron clientes
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-xl animate-slide-in shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus className="text-emerald-400" />
              {currentCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Nombre Completo *</label>
                <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">Teléfono</label>
                  <input type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Dirección</label>
                <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Notas</label>
                <textarea rows={3} value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} className="w-full resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-800">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition">Guardar Cliente</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
