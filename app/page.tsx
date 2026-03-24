"use client";

import { useMemo, useState } from "react";

type Patient = {
  id: string;
  name: string;
  arrival: number;
  processing: number;
  due: number;
};

type ResultRow = {
  order: number;
  patient: Patient;
  start: number;
  finish: number;
  flowTime: number;
  tardiness: number;
  status: string;
  isLate: boolean;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const EXAMPLE_PATIENTS: Omit<Patient, "id">[] = [
  { name: "Elena Vázquez", arrival: 0, processing: 2, due: 5 },
  { name: "Marcus Chen", arrival: 1, processing: 4, due: 6 },
  { name: "Priya Nair", arrival: 2, processing: 1, due: 4 },
  { name: "James Okafor", arrival: 3, processing: 3, due: 7 },
  { name: "Sofía Lindström", arrival: 4, processing: 2, due: 8 },
];

function computePeps(patients: Patient[]): ResultRow[] {
  const sorted = [...patients].sort((a, b) => a.arrival - b.arrival);
  let prevFinish = 0;
  return sorted.map((patient, index) => {
    const start = Math.max(patient.arrival, prevFinish);
    const finish = start + patient.processing;
    const flowTime = finish - patient.arrival;
    const tardiness = Math.max(0, finish - patient.due);
    prevFinish = finish;
    const isLate = tardiness > 0;
    const status = isLate
      ? `⚠ ${tardiness} días de retraso`
      : "✓ A tiempo";
    return {
      order: index + 1,
      patient,
      start,
      finish,
      flowTime,
      tardiness,
      status,
      isLate,
    };
  });
}

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-medium text-[#1A5F9E] outline-none transition placeholder:text-slate-400 focus:border-[#1A5F9E] focus:ring-2 focus:ring-[#1A5F9E]/20 sm:text-sm";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6";

export default function Home() {
  const [name, setName] = useState("");
  const [arrival, setArrival] = useState("");
  const [processing, setProcessing] = useState("");
  const [due, setDue] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [formulasOpen, setFormulasOpen] = useState(false);

  const kpis = useMemo(() => {
    if (!results || results.length === 0) return null;
    const n = results.length;
    const sumFlow = results.reduce((s, r) => s + r.flowTime, 0);
    const sumProc = results.reduce((s, r) => s + r.patient.processing, 0);
    const sumTard = results.reduce((s, r) => s + r.tardiness, 0);
    const arrivals = results.map((r) => r.patient.arrival);
    const finishes = results.map((r) => r.finish);
    const makespan = Math.max(...finishes) - Math.min(...arrivals);
    const avgCompletion = sumFlow / n;
    const utilization = makespan > 0 ? (sumProc / makespan) * 100 : 0;
    const avgJobsInSystem = makespan > 0 ? sumFlow / makespan : 0;
    const avgTardiness = sumTard / n;
    return {
      avgCompletion,
      utilization,
      avgJobsInSystem,
      avgTardiness,
    };
  }, [results]);

  function addPatient(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(arrival);
    const p = Number(processing);
    const d = Number(due);
    if (!name.trim() || Number.isNaN(a) || Number.isNaN(p) || Number.isNaN(d)) return;
    setPatients((prev) => [
      ...prev,
      { id: uid(), name: name.trim(), arrival: a, processing: p, due: d },
    ]);
    setName("");
    setArrival("");
    setProcessing("");
    setDue("");
    setResults(null);
  }

  function removePatient(id: string) {
    setPatients((prev) => prev.filter((x) => x.id !== id));
    setResults(null);
  }

  function loadExample() {
    setPatients(
      EXAMPLE_PATIENTS.map((p) => ({ ...p, id: uid() }))
    );
    setResults(null);
  }

  function calculate() {
    if (patients.length === 0) return;
    setResults(computePeps(patients));
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-blue-200/80">
      <header
        className="border-b border-[#154a80]/30 shadow-sm"
        style={{ backgroundColor: "#1A5F9E" }}
      >
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/35 bg-white/15 shadow-sm backdrop-blur-[2px]"
              aria-hidden
            >
              <span className="text-lg font-bold tracking-tight text-white">XZ</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                Calculadora PEPS · Clínica médica
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Xenia Zetino
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50 sm:text-[15px]">
                Planificación primero en entrar, primero en salir (FIFO): tiempos de flujo,
                retrasos e indicadores en un solo panel.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-10">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-7">
          <section className={`order-1 ${cardClass}`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
              Añadir paciente
            </h2>
            <form onSubmit={addPatient} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
              <label className="sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Nombre del paciente</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre completo"
                  autoComplete="name"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">Hora de llegada (días)</span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">Tiempo de procesamiento (días)</span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="decimal"
                  value={processing}
                  onChange={(e) => setProcessing(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Fecha límite (días)</span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-xl bg-[#1A5F9E] px-4 py-2.5 text-base font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-[#154a80] active:scale-[0.99] sm:w-auto sm:min-w-[140px] sm:text-sm"
                >
                  Añadir paciente
                </button>
                <button
                  type="button"
                  onClick={loadExample}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 sm:w-auto sm:text-sm"
                >
                  Cargar ejemplo
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-200/80 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A5F9E] sm:text-xs">
                  Lista de pacientes ({patients.length})
                </h2>
                <button
                  type="button"
                  onClick={calculate}
                  disabled={patients.length === 0}
                  className="min-h-11 w-full rounded-xl border-2 border-[#1A5F9E] bg-white px-4 py-2.5 text-base font-semibold text-[#1A5F9E] shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-60 active:scale-[0.99] sm:w-auto sm:min-w-[120px] sm:text-sm"
                >
                  Calcular
                </button>
              </div>
              {patients.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Aún no hay pacientes. Añada filas o cargue el ejemplo.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  {patients.map((p) => (
                    <li key={p.id} className="px-3 py-3 sm:py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug text-slate-800">{p.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Lleg. {p.arrival} · Proc. {p.processing} · Venc. {p.due}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePatient(p.id)}
                          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100"
                          aria-label={`Quitar ${p.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className={`order-2 ${cardClass}`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
              Resultados
            </h2>
            {!results || results.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Pulse <span className="font-medium text-slate-700">Calcular</span> para ver la
                secuencia FIFO y los indicadores.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3 md:hidden">
                  {results.map((r) => (
                    <div
                      key={r.patient.id}
                      className={
                        r.isLate
                          ? "rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm"
                          : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm"
                      }
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-black/5 pb-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                            Orden {r.order}
                          </p>
                          <p className="font-medium">{r.patient.name}</p>
                        </div>
                        <p className="text-right text-xs leading-snug">{r.status}</p>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:text-sm">
                        <div>
                          <dt className="text-slate-600 opacity-90">Llegada</dt>
                          <dd className="font-mono tabular-nums">{r.patient.arrival}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600 opacity-90">Procesamiento</dt>
                          <dd className="font-mono tabular-nums">{r.patient.processing}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600 opacity-90">Inicio</dt>
                          <dd className="font-mono tabular-nums">{r.start}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600 opacity-90">Fin</dt>
                          <dd className="font-mono tabular-nums">{r.finish}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600 opacity-90">Tiempo de flujo</dt>
                          <dd className="font-mono tabular-nums">{r.flowTime}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600 opacity-90">Fecha límite</dt>
                          <dd className="font-mono tabular-nums">{r.patient.due}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-slate-600 opacity-90">Retraso</dt>
                          <dd className="font-mono tabular-nums">{r.tardiness}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200/80 md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm lg:min-w-0">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Orden</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Paciente</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Llegada</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Procesamiento</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Inicio</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Fin</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Tiempo flujo</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Fecha límite</th>
                        <th className="whitespace-nowrap px-2 py-2.5 font-semibold">Retraso</th>
                        <th className="min-w-28 px-2 py-2.5 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.patient.id}
                          className={
                            r.isLate
                              ? "bg-red-50 text-red-900"
                              : "bg-emerald-50 text-emerald-900"
                          }
                        >
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.order}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-medium">
                            {r.patient.name}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.patient.arrival}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.patient.processing}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.start}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.finish}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.flowTime}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.patient.due}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                            {r.tardiness}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 text-xs">
                            {r.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {kpis && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Tiempo medio de finalización
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A5F9E]">
                    {kpis.avgCompletion.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">días</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Utilización
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A5F9E]">
                    {kpis.utilization.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-500">Σ procesamiento ÷ horizonte</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Media de trabajos en sistema
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A5F9E]">
                    {kpis.avgJobsInSystem.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">Σ tiempo flujo ÷ horizonte</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Retraso medio
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A5F9E]">
                    {kpis.avgTardiness.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">días</p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={() => setFormulasOpen((o) => !o)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white active:bg-slate-100 sm:min-h-0 sm:py-2"
              >
                <span>Referencia de fórmulas</span>
                <span className="text-[#1A5F9E]" aria-hidden>
                  {formulasOpen ? "−" : "+"}
                </span>
              </button>
              {formulasOpen && (
                <dl className="mt-3 space-y-3 rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
                  <div>
                    <dt className="font-semibold text-slate-800">Inicio real (FIFO)</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">
                      max(llegada, fin anterior); el primero usa fin anterior = 0
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Tiempo de finalización</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">inicio + procesamiento</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Tiempo de flujo</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">fin − llegada</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Retraso</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">
                      max(0, fin − fecha límite)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Horizonte (makespan)</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">
                      max(fin) − min(llegada)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Tiempo medio de finalización</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">
                      Σ(tiempo de flujo) ÷ n
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Utilización</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">
                      Σ(procesamiento) ÷ horizonte × 100%
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Media de trabajos en sistema</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">
                      Σ(tiempo de flujo) ÷ horizonte
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Retraso medio</dt>
                    <dd className="mt-1 font-mono text-xs text-slate-600">Σ(retraso) ÷ n</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
