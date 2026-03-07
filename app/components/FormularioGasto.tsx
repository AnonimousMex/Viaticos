'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function FormularioGasto({ onActualizar, registroEditable, onCancelarEdicion }: any) {
  const [carreras, setCarreras] = useState<any[]>([])
  const [choferes, setChoferes] = useState<any[]>([])
  const [enviando, setEnviando] = useState(false)
  const [esChoferExterno, setEsChoferExterno] = useState(false)
  
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<any>({
    departamento_id: '', chofer_id: '', chofer_externo: '', destino: '', 
    folio_autorizacion: '', oficio: '', subpresupuesto: '', requisicion: '',
    peaje: 0, combustible: 0, otros: 0, 
    fecha: hoy, fecha_viaje: hoy, fecha_vuelta: hoy
  })

  useEffect(() => {
    async function cargar() {
      const { data: d } = await supabase.from('departamentos').select('id, nombre').order('nombre')
      const { data: c } = await supabase.from('choferes').select('id, nombre').order('nombre')
      setCarreras(d || []); setChoferes(c || [])
    }
    cargar()
  }, [])

  useEffect(() => {
    if (registroEditable) {
      setForm(registroEditable)
      setEsChoferExterno(!!registroEditable.chofer_externo)
    }
  }, [registroEditable])

  const guardar = async (e: any) => {
    e.preventDefault(); setEnviando(true)
    const { choferes: _, departamentos: __, ...data } = form
    if (esChoferExterno) data.chofer_id = null; else data.chofer_externo = null;
    
    try {
      if (registroEditable) await supabase.from('registros').update(data).eq('id', registroEditable.id)
      else await supabase.from('registros').insert([data])
      onActualizar()
    } catch (error: any) { alert(error.message) }
    finally { setEnviando(false) }
  }

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black italic text-slate-800 uppercase tracking-tighter">Captura de Comisión</h2>
        <button onClick={onCancelarEdicion} className="text-red-500 font-bold">Cerrar ✕</button>
      </div>
      
      <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[10px] font-black uppercase">
        {/* FECHAS */}
        <div className="flex flex-col text-blue-600"><label className="mb-1">📅 Registro</label>
          <input type="date" value={form.fecha} className="p-3 border rounded-xl bg-blue-50" onChange={e => setForm({...form, fecha: e.target.value})} />
        </div>
        <div className="flex flex-col text-emerald-600"><label className="mb-1">🚐 Ida</label>
          <input type="date" value={form.fecha_viaje} className="p-3 border rounded-xl bg-emerald-50" onChange={e => setForm({...form, fecha_viaje: e.target.value})} />
        </div>
        <div className="flex flex-col text-orange-600"><label className="mb-1">🔄 Vuelta</label>
          <input type="date" value={form.fecha_vuelta || ''} className="p-3 border rounded-xl bg-orange-50" onChange={e => setForm({...form, fecha_vuelta: e.target.value})} />
        </div>

        {/* INFO BASE */}
        <div className="md:col-span-2 flex flex-col"><label>Departamento</label>
          <select required value={form.departamento_id} className="p-3 border rounded-xl" onChange={e => setForm({...form, departamento_id: e.target.value})}>
            <option value="">Seleccionar...</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        
        <div className="flex flex-col"><label>Chofer</label>
          {!esChoferExterno ? (
            <select value={form.chofer_id || ''} className="p-3 border rounded-xl" onChange={e => setForm({...form, chofer_id: e.target.value})}>
              <option value="">En lista...</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          ) : (
            <input placeholder="Nombre Chofer" value={form.chofer_externo || ''} className="p-3 border-2 border-yellow-200 rounded-xl uppercase" onChange={e => setForm({...form, chofer_externo: e.target.value.toUpperCase()})} />
          )}
          <button type="button" onClick={() => setEsChoferExterno(!esChoferExterno)} className="text-[8px] text-blue-500 mt-1 text-left">{esChoferExterno ? "← Ver lista" : "+ Chofer Externo"}</button>
        </div>

        <div className="md:col-span-3 flex flex-col"><label>Destino</label>
          <input required value={form.destino} className="p-3 border rounded-xl uppercase font-black" onChange={e => setForm({...form, destino: e.target.value.toUpperCase()})} />
        </div>

        {/* DINERO */}
        <div className="flex flex-col"><label className="text-blue-600">Peaje $</label>
          <input type="number" step="0.01" value={form.peaje} className="p-3 border-2 border-blue-100 rounded-xl text-lg" onChange={e => setForm({...form, peaje: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="flex flex-col"><label className="text-orange-600">Combustible $</label>
          <input type="number" step="0.01" value={form.combustible} className="p-3 border-2 border-orange-100 rounded-xl text-lg" onChange={e => setForm({...form, combustible: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="flex flex-col"><label className="text-emerald-600">Viáticos $</label>
          <input type="number" step="0.01" value={form.otros} className="p-3 border-2 border-emerald-100 rounded-xl text-lg" onChange={e => setForm({...form, otros: parseFloat(e.target.value) || 0})} />
        </div>

        {/* CAMPOS ADICIONALES */}
        <div className="grid grid-cols-2 md:grid-cols-4 md:col-span-3 gap-4">
          <div className="flex flex-col"><label className="text-slate-400">Folio</label>
            <input value={form.folio_autorizacion} className="p-3 border rounded-xl uppercase" onChange={e => setForm({...form, folio_autorizacion: e.target.value})} />
          </div>
          <div className="flex flex-col"><label className="text-slate-400">Oficio</label>
            <input value={form.oficio} className="p-3 border rounded-xl uppercase" onChange={e => setForm({...form, oficio: e.target.value})} />
          </div>
          <div className="flex flex-col"><label className="text-slate-400">Subpresupuesto</label>
            <input value={form.subpresupuesto} className="p-3 border rounded-xl uppercase" onChange={e => setForm({...form, subpresupuesto: e.target.value})} />
          </div>
          <div className="flex flex-col"><label className="text-slate-400">Requisición</label>
            <input value={form.requisicion} className="p-3 border rounded-xl uppercase" onChange={e => setForm({...form, requisicion: e.target.value})} />
          </div>
        </div>

        <button disabled={enviando} className="md:col-span-3 bg-blue-800 text-white p-5 rounded-[2rem] font-black text-xl shadow-2xl mt-4 active:scale-95 transition-all">
          {enviando ? "PROCESANDO..." : registroEditable ? "CONFIRMAR CAMBIOS" : "REGISTRAR VIÁTICO"}
        </button>
      </form>
    </div>
  )
}