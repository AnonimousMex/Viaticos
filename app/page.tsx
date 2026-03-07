'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import FormularioGasto from './components/FormularioGasto'
import * as XLSX from 'xlsx'

interface CarreraResumen {
  id: string; nombre: string; presupuesto_inicial: number; saldo_actual: number;
}

export default function Home() {
  const [resumen, setResumen] = useState<CarreraResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [seleccionada, setSeleccionada] = useState<CarreraResumen | null>(null)
  const [viajes, setViajes] = useState<any[]>([])
  const [registroAEditar, setRegistroAEditar] = useState<any>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargarDatos = useCallback(async () => {
    const { data } = await supabase.from('resumen_presupuesto').select('*').order('nombre')
    if (data) setResumen(data)
    setCargando(false)
  }, [])

  const verDetalles = async (carrera: CarreraResumen) => {
    setSeleccionada(carrera)
    const { data } = await supabase
      .from('registros')
      .select(`*, choferes(nombre)`)
      .eq('departamento_id', carrera.id)
      .order('fecha_viaje', { ascending: false })
    if (data) setViajes(data)
  }

  // EXCEL ACTUALIZADO CON TODAS LAS COLUMNAS
  const exportarAExcel = async () => {
    const { data: todos, error } = await supabase
      .from('registros')
      .select(`*, departamentos(nombre), choferes(nombre)`)
      .order('fecha_viaje', { ascending: true });

    if (error || !todos) return alert("No hay datos para exportar");

    const wb = XLSX.utils.book_new();
    const deptos = Array.from(new Set(todos.map(r => r.departamentos?.nombre)));

    deptos.forEach(depto => {
      const dataDepto = todos
        .filter(r => r.departamentos?.nombre === depto)
        .map(r => ({
          'FECHA REGISTRO': r.fecha,
          'FECHA VIAJE': r.fecha_viaje,
          'DESTINO': r.destino,
          'CHOFER': r.choferes?.nombre,
          'FOLIO': r.folio_autorizacion,
          'OFICIO': r.oficio,
          'TOTAL $': (Number(r.peaje) + Number(r.combustible)),
          'PEAJE $': r.peaje,
          'GASOLINA $': r.combustible
        }));

      const ws = XLSX.utils.json_to_sheet(dataDepto);
      XLSX.utils.book_append_sheet(wb, ws, depto?.toString().substring(0, 31));
    });

    XLSX.writeFile(wb, "Reporte_Viaticos_Completo_2026.xlsx");
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Borrar este registro?")) return
    await supabase.from('registros').delete().eq('id', id)
    cargarDatos()
    if (seleccionada) verDetalles(seleccionada)
  }

  const abrirEdicion = (reg: any) => {
    setRegistroAEditar(reg)
    setMostrarModal(true)
  }

  useEffect(() => { cargarDatos() }, [cargarDatos])

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black text-slate-800 tracking-tighter">SISTEMA DE VIÁTICOS</h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs italic">Panel de Control Administrativo</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => { setRegistroAEditar(null); setMostrarModal(true); }}
              className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              ➕ NUEVO VIÁTICO
            </button>
            <button 
              onClick={exportarAExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-sm"
            >
              📊 DESCARGAR EXCEL
            </button>
          </div>
        </header>

        {/* MODAL EMERGENTE */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-5xl my-auto animate-in fade-in zoom-in-95 duration-300">
              <FormularioGasto 
                onActualizar={() => {
                  cargarDatos();
                  if (seleccionada) verDetalles(seleccionada);
                  setMostrarModal(false);
                }} 
                registroEditable={registroAEditar}
                onCancelarEdicion={() => {
                  setMostrarModal(false);
                  setRegistroAEditar(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Tarjetas de Presupuesto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {cargando ? <div className="col-span-full py-10 text-center font-bold text-slate-400">Actualizando saldos...</div> : resumen.map(item => (
            <div 
              key={item.id} 
              onClick={() => verDetalles(item)}
              className={`p-6 rounded-3xl border-4 transition-all cursor-pointer ${seleccionada?.id === item.id ? 'border-blue-600 bg-white shadow-xl scale-105' : 'border-transparent bg-white shadow-sm hover:border-slate-200'}`}
            >
              <h3 className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest truncate">{item.nombre}</h3>
              <p className="text-3xl font-black text-slate-800">${item.saldo_actual?.toLocaleString('es-MX', {minimumFractionDigits:2})}</p>
              <div className="w-full bg-slate-100 h-2.5 mt-4 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ${ (item.saldo_actual / item.presupuesto_inicial) < 0.2 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.max(0, (item.saldo_actual / item.presupuesto_inicial) * 100)}%` }} 
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tabla de Historial */}
        {seleccionada && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest italic">HISTORIAL: {seleccionada.nombre}</h2>
              <button onClick={() => setSeleccionada(null)} className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-xs font-black uppercase">Cerrar Tabla</button>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-4 py-2">Fechas (R/V)</th>
                    <th className="px-4 py-2">Folio/Oficio</th>
                    <th className="px-4 py-2">Destino / Chofer</th>
                    <th className="px-4 py-2 text-center">Inversión</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {viajes.map(v => (
                    <tr key={v.id} className="bg-slate-50 hover:bg-blue-50 transition-colors group">
                      <td className="px-4 py-4 rounded-l-2xl border-y border-l">
                        <div className="font-bold text-slate-700 text-xs">R: {new Date(v.fecha).toLocaleDateString()}</div>
                        <div className="text-emerald-700 font-bold italic text-[10px]">V: {new Date(v.fecha_viaje).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-4 border-y">
                        <div className="font-bold uppercase text-[10px] text-slate-500">{v.folio_autorizacion || '--'}</div>
                        <div className="text-slate-400 text-[9px] font-bold">OF: {v.oficio || '--'}</div>
                      </td>
                      <td className="px-4 py-4 border-y">
                        <div className="font-black text-slate-800 uppercase text-xs tracking-tight">{v.destino}</div>
                        <div className="text-blue-500 font-bold text-[10px]">{v.choferes?.nombre}</div>
                      </td>
                      <td className="px-4 py-4 border-y text-center">
                        <div className="text-lg font-black text-slate-900">${(Number(v.peaje) + Number(v.combustible)).toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
                        <div className="flex justify-center gap-2 text-[9px] font-bold mt-1 uppercase">
                          <span className="text-blue-600">P: ${v.peaje}</span>
                          <span className="text-orange-600">G: ${v.combustible}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-r rounded-r-2xl text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => abrirEdicion(v)} className="bg-white border p-2 px-4 rounded-xl text-orange-600 font-bold hover:bg-orange-600 hover:text-white transition-all text-[10px] shadow-sm">Editar</button>
                          <button onClick={() => eliminar(v.id)} className="bg-white border p-2 px-4 rounded-xl text-red-600 font-bold hover:bg-red-600 hover:text-white transition-all text-[10px] shadow-sm">Borrar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {viajes.length === 0 && <p className="text-center py-20 text-slate-300 font-bold italic uppercase tracking-widest">Sin registros en esta carrera</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}