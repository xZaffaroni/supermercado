'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Search, ScanLine, ShoppingCart, Trash2, Plus, Minus, 
  CreditCard, Banknote, Building2, Printer, Save, AlertCircle, X, Check
} from 'lucide-react';

export default function POS() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [barcode, setBarcode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [caja, setCaja] = useState<any>(null);
  const [montoInicial, setMontoInicial] = useState('0');
  
  // Modal states
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  
  // Checkout states
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [descuento, setDescuento] = useState(0);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkCajaStatus();
    // Focus barcode on load
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Checkout
      if (e.key === 'F2' && caja && items.length > 0) {
        e.preventDefault();
        setIsCheckout(true);
      }
      // F4: Search
      if (e.key === 'F4') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      // Esc: Close modals or clear search
      if (e.key === 'Escape') {
        setIsCheckout(false);
        setIsOpeningCaja(false);
        setSearchQuery('');
        setSearchResults([]);
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [caja, items]);

  const checkCajaStatus = async () => {
    try {
      const res = await api.get('/cajas/actual');
      setCaja(res.data);
      if (!res.data) setIsOpeningCaja(true);
    } catch (error) {
      toast.error('Error al verificar estado de caja');
    }
  };

  const abrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/cajas/abrir', { monto_inicial: parseFloat(montoInicial) });
      setCaja(res.data);
      setIsOpeningCaja(false);
      toast.success('Caja abierta correctamente');
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al abrir caja');
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    
    try {
      const res = await api.get(`/productos/barcode/${barcode.trim()}`);
      agregarProducto(res.data);
      setBarcode('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Producto no encontrado');
      setBarcode('');
    }
  };

  const searchProductos = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/productos?search=${query}&activo=true&limit=10`);
      setSearchResults(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const agregarProducto = (producto: any) => {
    const existingIndex = items.findIndex(item => item.producto_id === producto.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      // Check stock
      if (newItems[existingIndex].cantidad + 1 > producto.stock) {
        toast.error(`Stock insuficiente. Disponible: ${producto.stock}`);
        return;
      }
      newItems[existingIndex].cantidad += 1;
      newItems[existingIndex].subtotal = newItems[existingIndex].cantidad * newItems[existingIndex].precio_unitario;
      setItems(newItems);
    } else {
      if (producto.stock < 1) {
        toast.error('Producto sin stock');
        return;
      }
      setItems([...items, {
        producto_id: producto.id,
        nombre: producto.nombre,
        codigo_barras: producto.codigo_barras,
        cantidad: 1,
        precio_unitario: Number(producto.precio_venta),
        stock: producto.stock,
        subtotal: Number(producto.precio_venta)
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
    barcodeInputRef.current?.focus();
  };

  const updateItemQty = (index: number, newQty: number) => {
    const newItems = [...items];
    if (newQty <= 0) {
      newItems.splice(index, 1);
    } else {
      if (newQty > newItems[index].stock) {
        toast.error(`Stock insuficiente. Disponible: ${newItems[index].stock}`);
        return;
      }
      newItems[index].cantidad = newQty;
      newItems[index].subtotal = newQty * newItems[index].precio_unitario;
    }
    setItems(newItems);
  };

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal - descuento;
  const cambio = parseFloat(montoRecibido || '0') - total;

  const handleCheckout = async () => {
    if (metodoPago === 'efectivo' && parseFloat(montoRecibido) < total) {
      toast.error('El monto recibido es menor al total');
      return;
    }

    const toastId = toast.loading('Procesando venta...');
    try {
      const payload = {
        caja_id: caja.id,
        items: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          descuento: 0
        })),
        metodo_pago: metodoPago,
        descuento,
        monto_recibido: metodoPago === 'efectivo' ? parseFloat(montoRecibido) : 0
      };

      const res = await api.post('/ventas', payload);
      
      toast.success('Venta procesada con éxito', { id: toastId });
      
      // Auto print dummy
      console.log('Imprimiendo ticket...', res.data);
      
      // Reset POS
      setItems([]);
      setIsCheckout(false);
      setMetodoPago('efectivo');
      setMontoRecibido('');
      setDescuento(0);
      barcodeInputRef.current?.focus();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar la venta', { id: toastId });
    }
  };

  if (!user) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4 animate-fade-in">
      
      {/* LEFT: Item List & Barcode */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Top Bar: Barcode & Search */}
        <div className="glass p-4 rounded-2xl flex gap-4 z-20 shadow-lg">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="Escanear código de barras..."
              className="w-full pl-12 pr-4 py-4 !text-lg !font-mono bg-slate-900 !border-emerald-500/30 focus:!border-emerald-500 !rounded-xl"
              disabled={!caja}
            />
          </form>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={e => searchProductos(e.target.value)}
              placeholder="Buscar por nombre o usar [F4]..."
              className="w-full pl-12 pr-4 py-4 !text-lg bg-slate-900 !rounded-xl"
              disabled={!caja}
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-16 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                {searchResults.map((prod: any) => (
                  <button
                    key={prod.id}
                    className="w-full text-left p-4 border-b border-slate-700/50 hover:bg-slate-700 focus:bg-slate-700 transition flex justify-between items-center group"
                    onClick={() => agregarProducto(prod)}
                  >
                    <div>
                      <p className="font-bold text-white group-hover:text-emerald-400 transition">{prod.nombre}</p>
                      <p className="text-sm font-mono text-slate-400">{prod.codigo_barras}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-lg">{formatCurrency(Number(prod.precio_venta))}</p>
                      <p className={`text-xs ${prod.stock > 10 ? 'text-emerald-400' : 'text-amber-400'}`}>Stock: {prod.stock}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden shadow-lg border border-slate-700/50">
          <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="text-emerald-400" /> Carrito de Venta
            </h2>
            <div className="flex gap-2 text-sm text-slate-400 font-medium">
              <span className="bg-slate-800 px-2 py-1 rounded">F2 - Cobrar</span>
              <span className="bg-slate-800 px-2 py-1 rounded">F4 - Buscar</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <ScanLine size={64} className="mb-4" />
                <p className="text-xl">Escanea productos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={`${item.producto_id}-${idx}`} className="bg-slate-800/80 p-3 rounded-xl flex items-center gap-4 hover:bg-slate-700/80 transition group border border-slate-700/50">
                    <div className="font-mono text-xs w-8 text-center bg-slate-900 text-slate-400 rounded py-1">{idx + 1}</div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold whitespace-nowrap overflow-hidden text-ellipsis truncate text-white text-lg">{item.nombre}</h3>
                      <p className="text-slate-400 font-mono text-sm">{item.codigo_barras || 'Sin código'}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                      <button onClick={() => updateItemQty(idx, item.cantidad - 1)} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition">
                        <Minus size={18} />
                      </button>
                      <input 
                        type="number" 
                        value={item.cantidad} 
                        onChange={e => updateItemQty(idx, parseInt(e.target.value) || 0)}
                        className="w-16 text-center !bg-transparent !border-0 font-bold text-lg p-0 focus:ring-0"
                      />
                      <button onClick={() => updateItemQty(idx, item.cantidad + 1)} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-emerald-400 transition" disabled={item.cantidad >= item.stock}>
                        <Plus size={18} />
                      </button>
                    </div>
                    
                    <div className="text-right w-24">
                      <p className="text-sm font-medium text-slate-400">{formatCurrency(item.precio_unitario)}</p>
                    </div>

                    <div className="text-right w-32 border-l border-slate-700 pl-4">
                      <p className="font-black text-xl text-emerald-400">{formatCurrency(item.subtotal)}</p>
                    </div>
                    
                    <button onClick={() => updateItemQty(idx, 0)} className="text-slate-500 hover:text-red-500 bg-slate-900 p-3 rounded-lg hover:bg-red-500/10 transition border border-slate-700">
                      <Trash2 size={24} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Totals & Summary */}
      <div className="w-[400px] flex flex-col gap-4">
        
        {/* User Card */}
        <div className="glass p-4 rounded-2xl flex items-center justify-between border-slate-700/50 shadow-lg">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cajero</p>
            <p className="font-bold text-white truncate w-48">{user.nombre}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Caja Libre</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${caja ? 'bg-emerald-500 animate-pulse-glow' : 'bg-red-500'}`}></span>
              <span className="font-mono text-sm font-bold bg-slate-900 px-2 py-0.5 rounded text-white border border-slate-700/50">
                {caja ? `#${caja.id}` : 'CERRADA'}
              </span>
            </div>
          </div>
        </div>

        {/* Totals Box */}
        <div className="glass flex-1 rounded-2xl p-6 flex flex-col shadow-lg border-slate-700/50 overflow-hidden relative">
          {/* Subtle gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
          
          <h3 className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm mb-6 flex items-center gap-2">
            <Banknote size={16} className="text-emerald-500" /> 
            Resumen de Venta
          </h3>
          
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Subtotal</span>
              <span className="font-mono text-lg text-white font-bold tracking-wide">{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800 group transition hover:border-emerald-500/30">
              <span className="text-slate-400 font-medium flex items-center gap-2">
                Descuento
                <button 
                  onClick={() => {
                    const d = prompt('Ingrese monto de descuento:', descuento.toString());
                    if (d !== null && !isNaN(Number(d))) setDescuento(Number(d));
                  }}
                  className="bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition text-emerald-400 hover:bg-emerald-500/20"
                >
                  Editar
                </button>
              </span>
              <span className="font-mono text-lg text-amber-400 font-bold tracking-wide">-{formatCurrency(descuento)}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Artículos</span>
              <span className="font-black text-xl text-white bg-slate-800 px-3 py-0.5 rounded-md border border-slate-700">
                {items.reduce((acc, curr) => acc + curr.cantidad, 0)}
              </span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <div className="flex justify-between items-end mb-8">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">TOTAL A PAGAR</span>
              <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">{formatCurrency(total)}</span>
            </div>

            <button
              onClick={() => setIsCheckout(true)}
              disabled={items.length === 0 || !caja}
              className="w-full py-5 rounded-2xl font-black text-2xl uppercase tracking-widest transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20
                flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0 active:scale-95"
            >
              <CreditCard size={28} />
              COBRAR (F2)
            </button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Opening Register Modal */}
      {isOpeningCaja && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl w-[450px] animate-slide-in border border-slate-700/50 shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 shadow-inner">
              <AlertCircle size={32} className="text-amber-500" />
            </div>
            
            <h2 className="text-3xl font-black mb-2 text-white tracking-tight">Caja Cerrada</h2>
            <p className="text-slate-400 mb-8 font-medium">Debe registrar un monto inicial para operar.</p>
            
            <form onSubmit={abrirCaja} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">
                  Efectivo Inicial (Apertura)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500 font-light">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full !pl-12 !py-4 !text-3xl !font-black !bg-slate-900 !tracking-wide rounded-xl focus:!border-amber-500"
                    autoFocus
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white py-4 rounded-xl font-black text-lg transition shadow-lg shadow-amber-500/20"
              >
                Abrir Caja y Comenzar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700/50 p-6 sm:p-8 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-in shadow-2xl">
            
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
              <h2 className="text-3xl font-black text-white tracking-tight">Completar Venta</h2>
              <button onClick={() => setIsCheckout(false)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 hover:text-white transition group border border-slate-700">
                <X size={24} className="text-slate-400 group-hover:text-white group-hover:rotate-90 transition" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all ${
                  metodoPago === 'efectivo'
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800/50 border-2 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Banknote size={36} />
                <span className="font-bold uppercase tracking-wider">Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('tarjeta')}
                className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all ${
                  metodoPago === 'tarjeta'
                    ? 'bg-blue-500/20 border-2 border-blue-500 scale-105 shadow-lg shadow-blue-500/20 text-blue-400'
                    : 'bg-slate-800/50 border-2 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CreditCard size={36} />
                <span className="font-bold uppercase tracking-wider">Tarjeta</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all ${
                  metodoPago === 'transferencia'
                    ? 'bg-purple-500/20 border-2 border-purple-500 scale-105 shadow-lg shadow-purple-500/20 text-purple-400'
                    : 'bg-slate-800/50 border-2 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Building2 size={36} />
                <span className="font-bold uppercase tracking-wider text-center leading-tight">Transferencia</span>
              </button>
            </div>

            <div className="bg-black/40 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800">
              <div className="text-center md:text-left">
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] mb-2 text-sm">A PAGAR</p>
                <div className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                  {formatCurrency(total)}
                </div>
              </div>

              {metodoPago === 'efectivo' && (
                <div className="w-full md:w-64 glass p-6 rounded-2xl relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Monto Recibido
                  </label>
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    className="w-full !py-3 !px-4 !text-3xl !font-black !bg-slate-900 text-emerald-400 border border-slate-700/50 rounded-xl"
                    autoFocus
                    placeholder="0"
                  />
                  
                  {parseFloat(montoRecibido) > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-end">
                      <span className="text-slate-400 font-medium">CAMBIO:</span>
                      <span className={`text-2xl font-black ${cambio >= 0 ? 'text-amber-400' : 'text-red-500'}`}>
                        {formatCurrency(cambio)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={metodoPago === 'efectivo' && parseFloat(montoRecibido || '0') < total}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-2xl uppercase tracking-widest py-6 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
            >
              <Check size={32} />
              Confirmar e Imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
