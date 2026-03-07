'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Item { id: string; nombre: string }

export default function FormularioGasto({ 
  onActualizar, 
  registroEditable, 
  onCancelarEdicion 
}: { 
  onActualizar: () => void, 
  registroEditable?: any,
  onCancelarEdicion?: () => void 
}) {
  const [carreras, setCarreras] = useState<Item[]>([])
  const [choferes, setChoferes] = useState<Item[]>([])
  const [enviando, setEnviando] = useState(false)
  const hoy = new Date().toISOString().split('T')[0]

  const initialForm = {
    departamento_id: '', chofer_id: '', destino: '', folio_autorizacion: '', oficio: '',
    subpresupuesto: '', requisicion: '', peaje: 0, combustible: 0, otros: 0,
    fecha: hoy, fecha_viaje: hoy
  }

  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    async function cargar() {
      const { data: d } = await supabase.from('departamentos').select('id, nombre').order('nombre')
      const { data: c } = await supabase.from('choferes').select('id, nombre').order('nombre')
      if (d) setCarreras(d); if (c) setChoferes(c)
    }
    cargar()
  }, [])

  useEffect(() => {
    if (registroEditable) {
      setForm({
        ...registroEditable,
        fecha: registroEditable.fecha || hoy,
        fecha_viaje: registroEditable.fecha_viaje || hoy
      })
    } else { setForm(initialForm) }
  }, [registroEditable, hoy])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { choferes: _, departamentos: __, ...datosAGuardar } = form as any;
    try {
      if (registroEditable) {
        await supabase.from('registros').update(datosAGuardar).eq('id', registroEditable.id)
      } else {
        await supabase.from('registros').insert([datosAGuardar])
      }
      onActualizar();
    } catch (error: any) { alert(error.message) }
    finally { setEnviando(false) }
  }

  return (
    <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl border-8 border-slate-100 relative">
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">
          {registroEditable ? '📝 Editar Viático' : '🚀 Nueva Captura'}
        </h2>
        <button 
          type="button" 
          onClick={onCancelarEdicion} 
          className="bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white w-10 h-10 rounded-full font-black transition-all flex items-center justify-center"
        >
          ✕
        </button>
      </div>
      
      <form onSubmit={guardar} className="text-sm text-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col">
            <label className="font-black mb-1 text-blue-700 text-[10px] uppercase tracking-widest">📅 Registro</label>
            <input type="date" required value={form.fecha || ''} className="p-4 border rounded-2xl bg-blue-50 font-bold outline-none ring-blue-200 focus:ring-4" onChange={e => setForm({...form, fecha: e.target.value})} />
          </div>
          <div className="flex flex-col">
            <label className="font-black mb-1 text-green-700 text-[10px] uppercase tracking-widest">🚐 Viaje</label>
            <input type="date" required value={form.fecha_viaje || ''} className="p-4 border rounded-2xl bg-green-50 font-bold outline-none ring-green-200 focus:ring-4" onChange={e => setForm({...form, fecha_viaje: e.target.value})} />
          </div>
          <div className="flex flex-col md:col-span-2">
            <label className="font-black mb-1 text-slate-400 text-[10px] uppercase tracking-widest">Documentación</label>
            <div className="flex gap-2">
               <input placeholder="Folio" value={form.folio_autorizacion || ''} className="p-4 border rounded-2xl w-full uppercase font-bold bg-slate-50" onChange={e => setForm({...form, folio_autorizacion: e.target.value})} />
               <input placeholder="Oficio" value={form.oficio || ''} className="p-4 border rounded-2xl w-full uppercase font-bold bg-slate-50" onChange={e => setForm({...form, oficio: e.target.value})} />
            </div>
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="font-black mb-1 text-[10px] uppercase tracking-widest">Carrera Seleccionada</label>
            <select required value={form.departamento_id || ''} className="p-4 border rounded-2xl bg-white font-bold outline-none ring-slate-100 focus:ring-4 appearance-none" onChange={e => setForm({...form, departamento_id: e.target.value})}>
              <option value="">-- Elige carrera --</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col md:col-span-2">
            <label className="font-black mb-1 text-[10px] uppercase tracking-widest">Chofer Asignado</label>
            <select required value={form.chofer_id || ''} className="p-4 border rounded-2xl bg-white font-bold outline-none ring-slate-100 focus:ring-4 appearance-none" onChange={e => setForm({...form, chofer_id: e.target.value})}>
              <option value="">-- Elige chofer --</option>
              {choferes.map(ch => <option key={ch.id} value={ch.id}>{ch.nombre}</option>)}
            </select>
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="font-black mb-1 text-[10px] uppercase tracking-widest">Destino del Viaje</label>
            <input required value={form.destino || ''} className="p-4 border rounded-2xl uppercase font-bold bg-slate-50" placeholder="Ej. MÉXICO, CDMX" onChange={e => setForm({...form, destino: e.target.value.toUpperCase()})} />
          </div>
          <div className="flex flex-col">
            <label className="font-black mb-1 text-blue-600 text-[10px] uppercase tracking-widest">Peaje (Casetas) $</label>
            <input type="number" step="0.01" value={form.peaje ?? 0} className="p-4 border-2 border-blue-100 rounded-2xl w-full font-black text-blue-800 text-lg" onChange={e => setForm({...form, peaje: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="flex flex-col">
            <label className="font-black mb-1 text-orange-600 text-[10px] uppercase tracking-widest">Gasolina $</label>
            <input type="number" step="0.01" value={form.combustible ?? 0} className="p-4 border-2 border-orange-100 rounded-2xl w-full font-black text-orange-800 text-lg" onChange={e => setForm({...form, combustible: parseFloat(e.target.value) || 0})} />
          </div>
        </div>

        <button disabled={enviando} className={`w-full mt-10 text-white p-5 rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-95 ${registroEditable ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-800 hover:bg-blue-900'}`}>
          {enviando ? 'GUARDANDO DATOS...' : registroEditable ? 'ACTUALIZAR INFORMACIÓN' : 'REGISTRAR VIÁTICO'}
        </button>
      </form>
    </div>
  )
}