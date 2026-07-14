import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Save, ChevronDown, ChevronRight, Calendar, BarChart2, BookOpen, Trash2, X, CheckCircle } from 'lucide-react';
import api from '../services/api';

const CELL_W = 38;
const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

// ── Duration reference data ───────────────────────────────────────────────────
const DURATION_REF = [
  {
    phase: 'Mobilisation',
    activities: [
      { name: 'Site hoarding & security',   min: 0.5, typ: 1,   max: 2,  drivers: 'Site size, security requirements, access roads' },
      { name: 'Site setup & welfare',        min: 1,   typ: 2,   max: 3,  drivers: 'Team size, site facilities needed, distance from town' },
      { name: 'Setting out',                 min: 0.5, typ: 1,   max: 2,  drivers: 'Drawing complexity, surveyor availability, site conditions' },
    ],
  },
  {
    phase: 'Substructure',
    activities: [
      { name: 'Excavation',                  min: 1,   typ: 2,   max: 4,  drivers: 'Ground type, depth, equipment vs manual, access' },
      { name: 'Blinding & DPC',              min: 0.5, typ: 1,   max: 1.5,drivers: 'Area, curing time, weather' },
      { name: 'Foundations (strip/pad/raft)',min: 2,   typ: 3,   max: 6,  drivers: 'Foundation type, concrete supply, reinforcement complexity' },
      { name: 'Ground beams & tie beams',    min: 1,   typ: 2,   max: 4,  drivers: 'Span lengths, reinforcement, concrete curing' },
      { name: 'Ground floor slab',           min: 1,   typ: 2,   max: 3,  drivers: 'Area, slab thickness, curing time' },
    ],
  },
  {
    phase: 'Superstructure',
    activities: [
      { name: 'Columns & beams (per floor)', min: 2,   typ: 3,   max: 5,  drivers: 'Number of columns, concrete supply reliability, curing' },
      { name: 'Suspended floor slab',        min: 1,   typ: 2,   max: 4,  drivers: 'Slab type (solid/ribbed/hollow pot), area, curing' },
      { name: 'Staircase',                   min: 1,   typ: 2,   max: 4,  drivers: 'Type (cast in-situ vs precast), complexity of design' },
    ],
  },
  {
    phase: 'Roofing',
    activities: [
      { name: 'Roof structure (trusses)',    min: 1,   typ: 2,   max: 4,  drivers: 'Truss type, roof complexity, carpenter availability' },
      { name: 'Roof covering',               min: 1,   typ: 2,   max: 3,  drivers: 'Material (sheet vs tile), roof area and pitch' },
      { name: 'Fascia, soffit & gutters',    min: 0.5, typ: 1,   max: 2,  drivers: 'Perimeter length, material, detailing complexity' },
    ],
  },
  {
    phase: 'External Envelope',
    activities: [
      { name: 'External blockwork',          min: 4,   typ: 8,   max: 14, drivers: 'Number of floors, wall area, block availability, gang size' },
      { name: 'External render / cladding',  min: 2,   typ: 4,   max: 8,  drivers: 'Finish type, wall area, drying time between coats' },
      { name: 'Windows & external doors',    min: 1,   typ: 2,   max: 4,  drivers: 'Number of openings, fabrication lead time, material' },
    ],
  },
  {
    phase: 'Internal Works',
    activities: [
      { name: 'Internal block partitions',   min: 2,   typ: 4,   max: 7,  drivers: 'Floor area, partition layout complexity' },
      { name: 'Internal plastering',         min: 2,   typ: 4,   max: 8,  drivers: 'Wall area, plaster coats, drying time, team size' },
      { name: 'Floor screed',                min: 1,   typ: 2,   max: 3,  drivers: 'Area, screed depth, curing time before tiling' },
      { name: 'Ceiling (POP / drywall)',     min: 1,   typ: 3,   max: 6,  drivers: 'Ceiling type, design complexity, floor area' },
    ],
  },
  {
    phase: 'MEP',
    activities: [
      { name: 'First fix electrical',        min: 1,   typ: 3,   max: 5,  drivers: 'Number of points, panel complexity, chasing required' },
      { name: 'First fix plumbing',          min: 1,   typ: 3,   max: 5,  drivers: 'Number of fittings, pipe routing, slab penetrations' },
      { name: 'Second fix electrical',       min: 2,   typ: 3,   max: 5,  drivers: 'Fittings, finishings quality, generator & inverter setup' },
      { name: 'Second fix plumbing',         min: 1,   typ: 2,   max: 4,  drivers: 'Fittings quality, sanitary ware installation' },
      { name: 'Testing & commissioning',     min: 1,   typ: 2,   max: 3,  drivers: 'System complexity, punch list items, utility connections' },
    ],
  },
  {
    phase: 'Finishes & Handover',
    activities: [
      { name: 'Floor tiles & finishes',         min: 1,   typ: 3,   max: 6,  drivers: 'Tile size & pattern, floor area, tiler skill level' },
      { name: 'Internal doors & ironmongery',   min: 1,   typ: 2,   max: 3,  drivers: 'Number of doors, door type, lead time on supply' },
      { name: 'Painting & decorating',          min: 2,   typ: 4,   max: 7,  drivers: 'Number of coats, finish quality, area, drying time' },
      { name: 'External works & landscaping',   min: 2,   typ: 4,   max: 8,  drivers: 'Paving area, planting, drainage, perimeter fencing' },
      { name: 'Snagging & handover',            min: 1,   typ: 2,   max: 4,  drivers: 'Snagging list length, client availability, documentation' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function weekToDate(startDate, week) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + week * 7);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function totalWeeks(phases) {
  let max = 0;
  (phases || []).forEach((ph) => {
    (ph.activities || []).forEach((a) => {
      max = Math.max(max, a.startWeek + a.durationWeeks);
    });
  });
  return max + 4;
}

function phaseRange(phase) {
  if (!phase.activities.length) return null;
  const start = Math.min(...phase.activities.map((a) => a.startWeek));
  const end   = Math.max(...phase.activities.map((a) => a.startWeek + a.durationWeeks));
  return { start, duration: end - start };
}

// ── Activity edit modal ───────────────────────────────────────────────────────
function ActivityModal({ activity, phaseColor, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...activity });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Edit Activity</h2>
          <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Activity Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start (week)</label>
              <input type="number" min={0} value={form.startWeek} onChange={(e) => setForm((f) => ({ ...f, startWeek: Number(e.target.value) }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (weeks)</label>
              <input type="number" min={1} value={form.durationWeeks} onChange={(e) => setForm((f) => ({ ...f, durationWeeks: Math.max(1, Number(e.target.value)) }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">% Complete</label>
            <input type="number" min={0} max={100} value={form.percentComplete} onChange={(e) => setForm((f) => ({ ...f, percentComplete: Math.min(100, Math.max(0, Number(e.target.value))) }))} className={inputCls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => onDelete(activity._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onSave(form)} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gantt chart ───────────────────────────────────────────────────────────────
function GanttChart({ programme, onChange }) {
  const [collapsed, setCollapsed] = useState({});
  const [editing, setEditing]     = useState(null);
  const weeks = totalWeeks(programme.phases);
  const cols  = Array.from({ length: weeks }, (_, i) => i);

  const togglePhase = (idx) => setCollapsed((c) => ({ ...c, [idx]: !c[idx] }));

  const updateActivity = (phaseIdx, actId, updates) => {
    const phases = programme.phases.map((ph, pi) => {
      if (pi !== phaseIdx) return ph;
      return { ...ph, activities: ph.activities.map((a) => a._id?.toString() === actId?.toString() ? { ...a, ...updates } : a) };
    });
    onChange({ ...programme, phases });
  };

  const deleteActivity = (phaseIdx, actId) => {
    const phases = programme.phases.map((ph, pi) => {
      if (pi !== phaseIdx) return ph;
      return { ...ph, activities: ph.activities.filter((a) => a._id?.toString() !== actId?.toString()) };
    });
    onChange({ ...programme, phases });
    setEditing(null);
  };

  const addActivity = (phaseIdx) => {
    const ph = programme.phases[phaseIdx];
    const lastEnd = ph.activities.length
      ? Math.max(...ph.activities.map((a) => a.startWeek + a.durationWeeks))
      : 0;
    const newAct = { _id: `tmp_${Date.now()}`, name: 'New activity', startWeek: lastEnd, durationWeeks: 2, percentComplete: 0 };
    const phases = programme.phases.map((p, pi) =>
      pi === phaseIdx ? { ...p, activities: [...p.activities, newAct] } : p
    );
    onChange({ ...programme, phases });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      {/* Header row */}
      <div className="flex" style={{ minWidth: 200 + weeks * CELL_W }}>
        {/* Name column header */}
        <div className="shrink-0 w-48 px-3 py-2 bg-gray-50 border-b border-r border-gray-200 text-xs font-semibold text-gray-500 sticky left-0 z-10">
          Activity
        </div>
        {/* Week headers */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {cols.map((w) => (
            <div key={w} style={{ width: CELL_W, minWidth: CELL_W }}
              className="border-r border-gray-100 text-center text-[10px] text-gray-400 py-2 font-medium">
              W{w + 1}
              {programme.startDate && (
                <div className="text-[9px] text-gray-300">{weekToDate(programme.startDate, w)}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Phase rows */}
      {programme.phases.map((phase, pi) => {
        const range = phaseRange(phase);
        return (
          <div key={phase._id || pi}>
            {/* Phase header */}
            <div className="flex border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => togglePhase(pi)}
              style={{ minWidth: 200 + weeks * CELL_W }}>
              <div className="shrink-0 w-48 px-3 py-2.5 flex items-center gap-2 border-r border-gray-200 sticky left-0 bg-white z-10">
                <span style={{ background: phase.color }} className="w-2.5 h-2.5 rounded-full shrink-0" />
                <span className="text-xs font-semibold text-gray-700 truncate">{phase.name}</span>
                {collapsed[pi] ? <ChevronRight size={12} className="text-gray-400 ml-auto shrink-0" /> : <ChevronDown size={12} className="text-gray-400 ml-auto shrink-0" />}
              </div>
              {/* Phase summary bar */}
              <div className="relative flex items-center" style={{ width: weeks * CELL_W }}>
                {range && (
                  <div
                    className="absolute h-3 rounded-full opacity-30"
                    style={{ left: range.start * CELL_W + 2, width: range.duration * CELL_W - 4, background: phase.color }}
                  />
                )}
              </div>
            </div>

            {/* Activity rows */}
            {!collapsed[pi] && phase.activities.map((act) => (
              <div key={act._id}
                className="flex border-b border-gray-50 hover:bg-blue-50/30 transition-colors group"
                style={{ minWidth: 200 + weeks * CELL_W }}>
                <div className="shrink-0 w-48 px-3 py-1.5 flex items-center border-r border-gray-100 sticky left-0 bg-white z-10 group-hover:bg-blue-50/30">
                  <span className="text-xs text-gray-600 truncate">{act.name}</span>
                  {act.percentComplete > 0 && (
                    <span className="ml-auto text-[10px] font-medium shrink-0" style={{ color: phase.color }}>{act.percentComplete}%</span>
                  )}
                </div>
                <div className="relative flex items-center" style={{ width: weeks * CELL_W, height: 32 }}>
                  {/* Background cells */}
                  {cols.map((w) => (
                    <div key={w} style={{ width: CELL_W, minWidth: CELL_W }}
                      className="h-full border-r border-gray-50 shrink-0" />
                  ))}
                  {/* Bar */}
                  <div
                    className="absolute h-5 rounded cursor-pointer hover:brightness-110 transition-all flex items-center overflow-hidden"
                    style={{
                      left: act.startWeek * CELL_W + 1,
                      width: act.durationWeeks * CELL_W - 2,
                      background: phase.color,
                      top: '50%', transform: 'translateY(-50%)',
                    }}
                    onClick={() => setEditing({ act, phaseIdx: pi, phaseColor: phase.color })}
                  >
                    {act.percentComplete > 0 && (
                      <div className="h-full bg-black/20 rounded-l" style={{ width: `${act.percentComplete}%` }} />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add activity button */}
            {!collapsed[pi] && (
              <div className="flex border-b border-gray-50" style={{ minWidth: 200 + weeks * CELL_W }}>
                <button
                  onClick={() => addActivity(pi)}
                  className="w-48 px-3 py-1.5 text-xs text-gray-400 hover:text-primary-900 flex items-center gap-1 border-r border-gray-100 sticky left-0 bg-white z-10 transition-colors"
                >
                  <Plus size={11} /> Add activity
                </button>
                <div style={{ width: weeks * CELL_W }} />
              </div>
            )}
          </div>
        );
      })}

      {editing && (
        <ActivityModal
          activity={editing.act}
          phaseColor={editing.phaseColor}
          onSave={(updates) => { updateActivity(editing.phaseIdx, editing.act._id, updates); setEditing(null); }}
          onDelete={(id) => deleteActivity(editing.phaseIdx, id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Weekly report form ────────────────────────────────────────────────────────
function WeeklyReportTab({ programme, progId, onSaved }) {
  const currentWeek = programme.startDate
    ? Math.ceil((Date.now() - new Date(programme.startDate)) / (7 * 86400000))
    : 1;
  const [weekNum, setWeekNum]         = useState(Math.max(1, currentWeek));
  const [overallPlanned, setPlanned]  = useState('');
  const [overallActual, setActual]    = useState('');
  const [phaseProgress, setPhProg]    = useState(
    programme.phases.map((ph) => ({ phase: ph.name, planned: '', actual: '' }))
  );
  const [lookAhead, setLookAhead]     = useState('');
  const [issues, setIssues]           = useState('');
  const [signedOffBy, setSignedOff]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    const existing = programme.weeklyReports?.find((r) => r.weekNumber === weekNum);
    if (existing) {
      setPlanned(existing.overallPlanned ?? '');
      setActual(existing.overallActual ?? '');
      setLookAhead(existing.lookAhead ?? '');
      setIssues(existing.issues ?? '');
      setSignedOff(existing.signedOffBy ?? '');
      setPhProg(programme.phases.map((ph) => {
        const found = existing.phaseProgress?.find((p) => p.phase === ph.name);
        return { phase: ph.name, planned: found?.planned ?? '', actual: found?.actual ?? '' };
      }));
    } else {
      setPlanned(''); setActual(''); setLookAhead(''); setIssues(''); setSignedOff('');
      setPhProg(programme.phases.map((ph) => ({ phase: ph.name, planned: '', actual: '' })));
    }
  }, [weekNum, programme]);

  const weekEnding = new Date(new Date(programme.startDate).getTime() + weekNum * 7 * 86400000);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/programmes/${progId}/weekly-report`, {
        weekNumber: weekNum,
        weekEnding,
        overallPlanned: Number(overallPlanned),
        overallActual: Number(overallActual),
        phaseProgress: phaseProgress.map((p) => ({ ...p, planned: Number(p.planned), actual: Number(p.actual) })),
        lookAhead,
        issues,
        signedOffBy,
      });
      onSaved(data.programme);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Week Number</label>
          <input type="number" min={1} value={weekNum} onChange={(e) => setWeekNum(Number(e.target.value))}
            className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
        </div>
        <div className="text-xs text-gray-400 mt-4">
          Week ending: <strong className="text-gray-700">{weekEnding.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Overall Progress</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Planned % Complete</label>
            <input type="number" min={0} max={100} value={overallPlanned} onChange={(e) => setPlanned(e.target.value)} className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Actual % Complete</label>
            <input type="number" min={0} max={100} value={overallActual} onChange={(e) => setActual(e.target.value)} className={inputCls} placeholder="0" />
          </div>
        </div>
        {overallPlanned !== '' && overallActual !== '' && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${Number(overallActual) >= Number(overallPlanned) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            Variance: {(Number(overallActual) - Number(overallPlanned)).toFixed(1)}%
            {Number(overallActual) >= Number(overallPlanned) ? ' (Ahead / On track)' : ' (Behind programme)'}
          </div>
        )}
      </div>

      {/* Phase progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Phase Progress</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 pb-1 border-b border-gray-100">
            <span className="col-span-2">Phase</span><span>Planned %</span><span>Actual %</span>
          </div>
          {phaseProgress.map((pp, i) => (
            <div key={pp.phase} className="grid grid-cols-4 gap-2 items-center">
              <span className="col-span-2 text-xs text-gray-700 truncate">{pp.phase}</span>
              <input type="number" min={0} max={100} value={pp.planned}
                onChange={(e) => setPhProg((arr) => arr.map((x, xi) => xi === i ? { ...x, planned: e.target.value } : x))}
                className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-900/30" placeholder="0" />
              <input type="number" min={0} max={100} value={pp.actual}
                onChange={(e) => setPhProg((arr) => arr.map((x, xi) => xi === i ? { ...x, actual: e.target.value } : x))}
                className={`px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-900/30 ${pp.actual !== '' && pp.planned !== '' && Number(pp.actual) < Number(pp.planned) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                placeholder="0" />
            </div>
          ))}
        </div>
      </div>

      {/* Look-ahead & Issues */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Look-ahead (next 2 weeks)</label>
          <textarea rows={4} value={lookAhead} onChange={(e) => setLookAhead(e.target.value)} className={inputCls + ' resize-none'} placeholder="Activities planned for the next 2 weeks…" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Issues & Actions</label>
          <textarea rows={4} value={issues} onChange={(e) => setIssues(e.target.value)} className={inputCls + ' resize-none'} placeholder="Current issues, blockers, and agreed actions…" />
        </div>
      </div>

      {/* Sign-off */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Signed off by</label>
          <input value={signedOffBy} onChange={(e) => setSignedOff(e.target.value)} className={inputCls} placeholder="Name / role" />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 disabled:opacity-60 transition-colors shrink-0">
          {saved ? <><CheckCircle size={15} /> Saved</> : saving ? 'Saving…' : <><Save size={15} /> Save Report</>}
        </button>
      </div>

      {/* History */}
      {programme.weeklyReports?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Report History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left pb-2 font-medium">Week</th>
                  <th className="text-left pb-2 font-medium">Week Ending</th>
                  <th className="text-right pb-2 font-medium">Planned</th>
                  <th className="text-right pb-2 font-medium">Actual</th>
                  <th className="text-right pb-2 font-medium">Variance</th>
                  <th className="text-left pb-2 font-medium">Signed Off</th>
                </tr>
              </thead>
              <tbody>
                {[...programme.weeklyReports].sort((a, b) => a.weekNumber - b.weekNumber).map((r) => {
                  const v = (r.overallActual || 0) - (r.overallPlanned || 0);
                  return (
                    <tr key={r.weekNumber} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50"
                      onClick={() => setWeekNum(r.weekNumber)}>
                      <td className="py-2">W{r.weekNumber}</td>
                      <td className="py-2 text-gray-500">{r.weekEnding ? new Date(r.weekEnding).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                      <td className="py-2 text-right">{r.overallPlanned ?? '—'}%</td>
                      <td className="py-2 text-right">{r.overallActual ?? '—'}%</td>
                      <td className={`py-2 text-right font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>{v >= 0 ? '+' : ''}{v.toFixed(1)}%</td>
                      <td className="py-2 text-gray-500">{r.signedOffBy || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Duration reference ────────────────────────────────────────────────────────
function DurationRef() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Typical week ranges for each construction activity. Use these to sense-check your programme before submitting.</p>
      {DURATION_REF.map((phase) => (
        <div key={phase.phase} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{phase.phase}</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-4 py-2 font-medium">Activity</th>
                <th className="text-center px-2 py-2 font-medium w-16">Min wks</th>
                <th className="text-center px-2 py-2 font-medium w-16">Typical</th>
                <th className="text-center px-2 py-2 font-medium w-16">Max wks</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Key drivers</th>
              </tr>
            </thead>
            <tbody>
              {phase.activities.map((a) => (
                <tr key={a.name} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-gray-700">{a.name}</td>
                  <td className="px-2 py-2 text-center text-gray-500">{a.min}</td>
                  <td className="px-2 py-2 text-center font-semibold text-primary-900">{a.typ}</td>
                  <td className="px-2 py-2 text-center text-gray-500">{a.max}</td>
                  <td className="px-4 py-2 text-gray-400 hidden sm:table-cell">{a.drivers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProgrammeBuilder() {
  const [programmes, setProgrammes] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [tab, setTab]               = useState('gantt');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [creating, setCreating]     = useState(false);
  const [newForm, setNewForm]       = useState({ name: 'Construction Programme', startDate: new Date().toISOString().slice(0, 10) });
  const [projects, setProjects]     = useState([]);
  const saveTimer = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: pd }, { data: proj }] = await Promise.all([
        api.get('/programmes'),
        api.get('/projects'),
      ]);
      setProgrammes(pd.programmes || []);
      setProjects(proj.projects || []);
      if (pd.programmes?.length) {
        setSelected((prev) => {
          if (prev) return prev;
          return null;
        });
        if (!selected) {
          const { data } = await api.get(`/programmes/${pd.programmes[0]._id}`);
          setSelected(data.programme);
        }
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleChange = (updated) => {
    setSelected(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(updated), 1200);
  };

  const autoSave = async (prog) => {
    if (!prog?._id) return;
    setSaving(true);
    try {
      await api.put(`/programmes/${prog._id}`, { phases: prog.phases, startDate: prog.startDate, name: prog.name });
    } finally { setSaving(false); }
  };

  const handleCreate = async () => {
    try {
      const { data } = await api.post('/programmes', newForm);
      setProgrammes((p) => [data.programme, ...p]);
      const { data: full } = await api.get(`/programmes/${data.programme._id}`);
      setSelected(full.programme);
      setCreating(false);
      showToast('Programme created');
    } catch (e) {
      showToast('Failed to create');
    }
  };

  const handleSelectProg = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/programmes/${id}`);
      setSelected(data.programme);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm('Delete this programme?')) return;
    await api.delete(`/programmes/${selected._id}`);
    setSelected(null);
    loadList();
    showToast('Deleted');
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg z-50 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Programme of Works</h1>
          <p className="text-sm text-gray-500 mt-0.5">8-phase Gantt chart — change the start date to reschedule everything instantly.</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 transition-colors">
          <Plus size={15} /> New Programme
        </button>
      </div>

      {/* Programme selector + start date */}
      {programmes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selected?._id || ''}
            onChange={(e) => handleSelectProg(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30"
          >
            {programmes.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          {selected && (
            <>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <label className="text-xs text-gray-500">Start date</label>
                <input type="date" value={selected.startDate ? new Date(selected.startDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => handleChange({ ...selected, startDate: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
              </div>
              <span className="text-xs text-gray-400">{saving ? 'Saving…' : 'Auto-saved'}</span>
              <button onClick={handleDelete} className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
            </>
          )}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">New Programme</h2>
              <button onClick={() => setCreating(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Programme Name</label>
                <input value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select value={newForm.projectId || ''} onChange={(e) => setNewForm((f) => ({ ...f, projectId: e.target.value || undefined }))} className={inputCls}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input type="date" value={newForm.startDate} onChange={(e) => setNewForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setCreating(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900" />
        </div>
      ) : !selected ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p>No programme yet.</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-primary-900 font-medium hover:underline">Create your first programme</button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {[
              { key: 'gantt',  label: 'Gantt Chart',       icon: BarChart2 },
              { key: 'report', label: 'Weekly Report',      icon: Calendar },
              { key: 'ref',    label: 'Duration Reference', icon: BookOpen },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary-900 text-primary-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {tab === 'gantt'  && <GanttChart programme={selected} onChange={handleChange} />}
          {tab === 'report' && <WeeklyReportTab programme={selected} progId={selected._id} onSaved={(p) => setSelected(p)} />}
          {tab === 'ref'    && <DurationRef />}
        </>
      )}
    </div>
  );
}
