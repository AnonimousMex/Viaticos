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

  // Función para formatear fechas a "9 de agosto"
  const formatearFechaSimple = (fechaStr: string) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  };

  const cargarDatos = useCallback(async () => {
    const { data } = await supabase.from('resumen_presupuesto').select('*').order('nombre')
    if (data) setResumen(data)
    setCargando(false)
  }, [])

  const editarPresupuesto = async (id: string, actual: number) => {
    const nuevo = prompt("Nuevo monto de inversión inicial:", actual.toString());
    if (nuevo !== null && !isNaN(parseFloat(nuevo))) {
      await supabase.from('departamentos').update({ presupuesto_inicial: parseFloat(nuevo) }).eq('id', id);
      cargarDatos();
    }
  }

  const verDetalles = async (carrera: CarreraResumen) => {
    setSeleccionada(carrera)
    const { data } = await supabase
      .from('registros')
      .select(`*, choferes(nombre)`)
      .eq('departamento_id', carrera.id)
      .order('fecha_viaje', { ascending: false })
    if (data) setViajes(data)
  }

  const exportarAExcel = async () => {
    const { data: todos } = await supabase
      .from('registros')
      .select(`*, departamentos(nombre), choferes(nombre)`)
      .order('fecha_viaje', { ascending: true });

    if (!todos) return alert("No hay datos");

    const wb = XLSX.utils.book_new();
    const deptos = Array.from(new Set(todos.map(r => r.departamentos?.nombre)));

    deptos.forEach(depto => {
      const dataDepto = todos
        .filter(r => r.departamentos?.nombre === depto)
        .map(r => ({
          'FECHA REGISTRO': r.fecha,
          'COMISIÓN': `DEL ${formatearFechaSimple(r.fecha_viaje)} AL ${formatearFechaSimple(r.fecha_vuelta)}`.toUpperCase(),
          'DESTINO': r.destino,
          'CHOFER': r.chofer_externo || r.choferes?.nombre || 'N/A',
          'FOLIO': r.folio_autorizacion,
          'OFICIO': r.oficio,
          'SUBPRESUPUESTO': r.subpresupuesto,
          'REQUISICIÓN': r.requisicion,
          'PEAJE $': r.peaje,
          'COMBUSTIBLE $': r.combustible,
          'VIÁTICOS $': r.otros,
          'TOTAL $': (Number(r.peaje) + Number(r.combustible) + Number(r.otros))
        }));

      const ws = XLSX.utils.json_to_sheet(dataDepto);
      XLSX.utils.book_append_sheet(wb, ws, depto?.toString().substring(0, 31));
    });

    XLSX.writeFile(wb, "Control_Viaticos_Completo.xlsx");
  };

  useEffect(() => { cargarDatos() }, [cargarDatos])

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-black italic">COORDINACIÓN DE TRANSPORTE</h1>
            <h2 className="text-xl font-bold text-slate-700">SISTEMA DE VIÁTICOS PARTIDA 44102</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] text-blue-600">INSTITUTO TECNOLÓGICO DE MORELIA</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRegistroAEditar(null); setMostrarModal(true); }} className="bg-blue-800 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-900 transition-all uppercase italic text-sm">➕ NUEVO VIÁTICO</button>
            <button onClick={exportarAExcel} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all uppercase italic text-sm">📊 DESCARGAR EXCEL</button>
          </div>
        </header>

        {mostrarModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl overflow-y-auto max-h-[95vh]">
              <FormularioGasto 
                onActualizar={() => { cargarDatos(); if (seleccionada) verDetalles(seleccionada); setMostrarModal(false); }} 
                registroEditable={registroAEditar}
                onCancelarEdicion={() => { setMostrarModal(false); setRegistroAEditar(null); }}
              />
            </div>
          </div>
        )}

        {/* Tarjetas de Departamentos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {resumen.map(item => (
            <div key={item.id} className={`p-6 rounded-[2.5rem] border-4 bg-white transition-all shadow-sm ${seleccionada?.id === item.id ? 'border-blue-600 scale-105 shadow-xl' : 'border-transparent hover:border-slate-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 onClick={() => verDetalles(item)} className="text-[9px] font-black text-blue-600 uppercase tracking-tight leading-tight min-h-[40px] flex items-center cursor-pointer w-4/5">
                  {item.nombre}
                </h3>
                <button onClick={() => editarPresupuesto(item.id, item.presupuesto_inicial)} className="text-slate-300 hover:text-orange-500 transition-colors text-xs">✏️</button>
              </div>
              <div onClick={() => verDetalles(item)} className="cursor-pointer">
                <p className="text-3xl font-black text-slate-800">${item.saldo_actual?.toLocaleString('es-MX', {minimumFractionDigits:2})}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Inversión Inicial: ${item.presupuesto_inicial?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Historial Detallado */}
        {seleccionada && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white italic">
              <h2 className="text-xl font-black uppercase tracking-widest">HISTORIAL: {seleccionada.nombre}</h2>
              <button onClick={() => setSeleccionada(null)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold uppercase">Cerrar</button>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-400 text-[9px] uppercase tracking-widest font-black">
                    <th className="px-4 py-2">Fechas</th>
                    <th className="px-4 py-2">Documentación</th>
                    <th className="px-4 py-2">Destino / Chofer</th>
                    <th className="px-4 py-2 text-center">Gasto Total</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {viajes.map(v => (
                    <tr key={v.id} className="bg-slate-50 hover:bg-blue-50 transition-colors font-bold text-[11px]">
                      <td className="px-4 py-4 rounded-l-2xl border-y border-l leading-relaxed">
                        <div className="text-[9px] text-slate-400">REGISTRO: {v.fecha}</div>
                        <div className="text-blue-700 font-black uppercase tracking-tighter">
                          COMISIÓN: <br/>
                          <span className="text-emerald-700">DEL {formatearFechaSimple(v.fecha_viaje)}</span> <br/>
                          <span className="text-emerald-700">AL {formatearFechaSimple(v.fecha_vuelta)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y leading-tight uppercase">
                        <div className="text-slate-700">FOLIO: {v.folio_autorizacion || '--'}</div>
                        <div className="text-slate-500">OFICIO: {v.oficio || '--'}</div>
                        <div className="text-blue-600 text-[9px] mt-1">SUB: {v.subpresupuesto || '--'}</div>
                        <div className="text-blue-800 text-[9px]">REQ: {v.requisicion || '--'}</div>
                      </td>
                      <td className="px-4 py-4 border-y uppercase">
                        <div className="font-black text-slate-800">{v.destino}</div>
                        <div className="text-blue-500 italic text-[9px]">CHOFER: {v.chofer_externo || v.choferes?.nombre}</div>
                      </td>
                      <td className="px-4 py-4 border-y text-center">
                        <div className="text-lg font-black text-slate-900 mb-1">
                          ${(Number(v.peaje) + Number(v.combustible) + Number(v.otros)).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                        </div>
                        <div className="flex flex-col text-[8px] uppercase opacity-70">
                          <span>PEAJE: ${v.peaje}</span>
                          <span>GASOLINA: ${v.combustible}</span>
                          <span>VIÁTICOS: ${v.otros}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-r rounded-r-2xl text-right">
                        <button onClick={() => { setRegistroAEditar(v); setMostrarModal(true); }} className="text-orange-600 font-black mr-3 hover:underline">EDITAR</button>
                        <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from('registros').delete().eq('id', v.id); cargarDatos(); verDetalles(seleccionada); } }} className="text-red-600 font-black hover:underline">BORRAR</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {viajes.length === 0 && <p className="text-center py-10 text-slate-300 font-black italic uppercase">Sin registros</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}