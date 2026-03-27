"use client";

import { useMemo, useState } from "react";

type Ticket = {
  id: string;
  name: string;
  arrival: number;
  processing: number;
  due: number;
};

type ResultRow = {
  order: number;
  ticket: Ticket;
  start: number;
  finish: number;
  flowTime: number;
  tardiness: number;
  status: string;
  isLate: boolean;
};

type XeniaJob = {
  job: string;
  description: string;
  tr: number;
  tp: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const EXAMPLE_TICKETS: Omit<Ticket, "id">[] = [
  {
    name: "Backup incremental — DB producción",
    arrival: 0,
    processing: 2,
    due: 5,
  },
  { name: "Migración VM a clúster Hyper-V", arrival: 1, processing: 4, due: 6 },
  {
    name: "Revisión RAID almacenamiento NAS",
    arrival: 2,
    processing: 1,
    due: 4,
  },
  {
    name: "Incidente crítico — correo Exchange",
    arrival: 3,
    processing: 3,
    due: 7,
  },
  {
    name: "Parche de seguridad Windows Server",
    arrival: 4,
    processing: 2,
    due: 8,
  },
];

const XENIA_JOBS: XeniaJob[] = [
  { job: "A", description: "Cambio de disco duro", tr: 4, tp: 2 },
  { job: "B", description: "Instalaciones de RAM", tr: 3, tp: 1 },
  { job: "C", description: "Reparación servidor", tr: 6, tp: 3 },
  { job: "D", description: "Diagnóstico general", tr: 2, tp: 2 },
  { job: "E", description: "Cambio de fuente", tr: 5, tp: 1 },
];

const INVENTORY_ITEMS: { name: string; detail?: string; optional?: boolean }[] =
  [
    { name: "Discos duros", detail: "HDD y SSD" },
    { name: "Memorias RAM" },
    { name: "Fuentes de poder" },
    { name: "Tarjetas madre" },
    { name: "Procesadores" },
    { name: "Ventiladores y sistema de enfriamiento" },
    { name: "Cables", detail: "SATA, poder, red" },
    { name: "Tarjetas de red" },
    { name: "Pasta térmica" },
    { name: "UPS o reguladores", optional: true },
  ];

const INVENTORY_POLICY: { product: string; stockMin: number }[] = [
  { product: "Memorias RAM", stockMin: 20 },
  { product: "Discos duros (HDD / SSD)", stockMin: 15 },
  { product: "Fuentes de poder", stockMin: 8 },
  { product: "Tarjetas madre", stockMin: 6 },
  { product: "Procesadores", stockMin: 6 },
  { product: "Ventiladores / enfriamiento", stockMin: 12 },
  { product: "Cables (SATA, poder, red)", stockMin: 30 },
  { product: "Tarjetas de red", stockMin: 10 },
  { product: "Pasta térmica", stockMin: 18 },
  { product: "UPS o reguladores", stockMin: 4 },
];

type InventorySkuRow = {
  id: string;
  code: string;
  description: string;
  unitCost: number;
  initialStock: number;
  purchases: number;
  used: number;
  safetyStock: number;
  reorderPoint: number;
};

const DEFAULT_INVENTORY_SKU: Omit<InventorySkuRow, "id">[] = [
  {
    code: "RAM-32G-ECC",
    description: "Memoria RAM 32GB ECC DDR4",
    unitCost: 120,
    initialStock: 20,
    purchases: 10,
    used: 4,
    safetyStock: 5,
    reorderPoint: 10,
  },
  {
    code: "SSD-ENT-2TB",
    description: "Disco Sólido Enterprise 2TB",
    unitCost: 250,
    initialStock: 15,
    purchases: 5,
    used: 1,
    safetyStock: 3,
    reorderPoint: 7,
  },
  {
    code: "HDD-SAS-4TB",
    description: "Disco Duro SAS 4TB 10K RPM",
    unitCost: 180,
    initialStock: 12,
    purchases: 8,
    used: 0,
    safetyStock: 3,
    reorderPoint: 8,
  },
  {
    code: "PSU-1000W-R",
    description: "Fuente de Poder Redundante 1000W",
    unitCost: 200,
    initialStock: 8,
    purchases: 2,
    used: 0,
    safetyStock: 3,
    reorderPoint: 10,
  },
  {
    code: "FAN-SRV-120",
    description: "Ventilador de Chasis Servidor 120mm",
    unitCost: 35,
    initialStock: 30,
    purchases: 20,
    used: 3,
    safetyStock: 2,
    reorderPoint: 8,
  },
  {
    code: "BTY-UPS-12V",
    description: "Batería de Reemplazo UPS 12V",
    unitCost: 45,
    initialStock: 24,
    purchases: 0,
    used: 0,
    safetyStock: 10,
    reorderPoint: 15,
  },
  {
    code: "CBL-DAC-10G",
    description: "Cable de Red DAC SFP+ 10Gbps",
    unitCost: 25,
    initialStock: 50,
    purchases: 30,
    used: 0,
    safetyStock: 5,
    reorderPoint: 11,
  },
  {
    code: "PST-TRM-PRO",
    description: "Pasta Térmica Alto Rendimiento 50g",
    unitCost: 15,
    initialStock: 10,
    purchases: 5,
    used: 1,
    safetyStock: 15,
    reorderPoint: 17,
  },
  {
    code: "NIC-PCIE-4P",
    description: "Tarjeta de Red PCIe 4 Puertos Gigabit",
    unitCost: 85,
    initialStock: 10,
    purchases: 2,
    used: 0,
    safetyStock: 2,
    reorderPoint: 6,
  },
  {
    code: "CTRL-RAID-8",
    description: "Controlador RAID 8 Puertos",
    unitCost: 350,
    initialStock: 5,
    purchases: 0,
    used: 0,
    safetyStock: 1,
    reorderPoint: 8,
  },
];

function computePeps(tickets: Ticket[]): ResultRow[] {
  const sorted = [...tickets].sort((a, b) => a.arrival - b.arrival);
  let prevFinish = 0;
  return sorted.map((ticket, index) => {
    const start = Math.max(ticket.arrival, prevFinish);
    const finish = start + ticket.processing;
    const flowTime = finish - ticket.arrival;
    const tardiness = Math.max(0, finish - ticket.due);
    prevFinish = finish;
    const isLate = tardiness > 0;
    const status = isLate ? `⚠ ${tardiness} días de retraso` : "✓ A tiempo";
    return {
      order: index + 1,
      ticket,
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

const numberFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const tableInputClass =
  "min-h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1A5F9E] focus:ring-2 focus:ring-[#1A5F9E]/20 md:min-h-9 md:px-2 md:py-1.5";

const tableNumericInputClass = `${tableInputClass} min-w-[4.5rem]`;

const mobileInventoryFieldClass =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-medium text-slate-800 outline-none transition focus:border-[#1A5F9E] focus:ring-2 focus:ring-[#1A5F9E]/20 touch-manipulation sm:min-h-11 sm:text-sm";

function computeInventoryLine(row: InventorySkuRow) {
  const available = row.initialStock + row.purchases;
  const costAvailable = available * row.unitCost;
  const cogs = row.used * row.unitCost;
  const ending = available - row.used;
  const alert =
    ending <= row.reorderPoint ? "Solicitar Pedido" : "Nivel Óptimo";
  return { available, costAvailable, cogs, ending, alert };
}

function computeRcRows(jobs: XeniaJob[]) {
  return jobs.map((job) => ({
    ...job,
    rc: job.tr / job.tp,
  }));
}

function computePriorityRows(rcRows: ReturnType<typeof computeRcRows>) {
  return [...rcRows].sort((a, b) => {
    if (a.rc === b.rc) return a.job.localeCompare(b.job);
    return a.rc - b.rc;
  });
}

function computeFlowRows(priorityRows: ReturnType<typeof computePriorityRows>) {
  let accumulated = 0;
  return priorityRows.map((row) => {
    accumulated += row.tp;
    return {
      ...row,
      accumulated,
      delay: Math.max(0, accumulated - row.tr),
    };
  });
}

export default function Home() {
  const [name, setName] = useState("");
  const [arrival, setArrival] = useState("");
  const [processing, setProcessing] = useState("");
  const [due, setDue] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [formulasOpen, setFormulasOpen] = useState(false);
  const [inventoryFormulasOpen, setInventoryFormulasOpen] = useState(false);
  const [mainTab, setMainTab] = useState<
    "peps" | "inventario" | "razon-critica"
  >(
    "peps",
  );
  const [inventorySkuRows, setInventorySkuRows] = useState<InventorySkuRow[]>(
    () => DEFAULT_INVENTORY_SKU.map((r) => ({ ...r, id: uid() })),
  );
  const [invCode, setInvCode] = useState("");
  const [invDesc, setInvDesc] = useState("");
  const [invUnitCost, setInvUnitCost] = useState("");
  const [invInitial, setInvInitial] = useState("");
  const [invPurchases, setInvPurchases] = useState("");
  const [invUsed, setInvUsed] = useState("");
  const [invSafety, setInvSafety] = useState("");
  const [invReorder, setInvReorder] = useState("");

  const kpis = useMemo(() => {
    if (!results || results.length === 0) return null;
    const n = results.length;
    const sumFlow = results.reduce((s, r) => s + r.flowTime, 0);
    const sumProc = results.reduce((s, r) => s + r.ticket.processing, 0);
    const sumTard = results.reduce((s, r) => s + r.tardiness, 0);
    const arrivals = results.map((r) => r.ticket.arrival);
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

  const inventoryResult = useMemo(
    () =>
      INVENTORY_POLICY.map((item) => {
        const safetyStock = item.stockMin * 0.25;
        const total = item.stockMin + safetyStock;
        return { ...item, safetyStock, total };
      }),
    [],
  );

  const [xeniaJobs, setXeniaJobs] = useState<XeniaJob[]>(XENIA_JOBS);

  const xeniaRcRows = useMemo(() => computeRcRows(xeniaJobs), [xeniaJobs]);
  const xeniaPriorityRows = useMemo(() => computePriorityRows(xeniaRcRows), [
    xeniaRcRows,
  ]);
  const xeniaFlowRows = useMemo(() => computeFlowRows(xeniaPriorityRows), [
    xeniaPriorityRows,
  ]);
  const xeniaKpis = useMemo(() => {
    const totalDelay = xeniaFlowRows.reduce((s, r) => s + r.delay, 0);
    const onTimeJobs = xeniaFlowRows.filter((r) => r.delay === 0).length;
    const lateJobs = xeniaFlowRows.length - onTimeJobs;
    const avgDelay = xeniaFlowRows.length > 0 ? totalDelay / xeniaFlowRows.length : 0;
    return { totalDelay, onTimeJobs, lateJobs, avgDelay };
  }, [xeniaFlowRows]);

  function patchXeniaJob(index: number, patch: Partial<XeniaJob>) {
    setXeniaJobs((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addTicket(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(arrival);
    const p = Number(processing);
    const d = Number(due);
    if (!name.trim() || Number.isNaN(a) || Number.isNaN(p) || Number.isNaN(d))
      return;
    setTickets((prev) => [
      ...prev,
      { id: uid(), name: name.trim(), arrival: a, processing: p, due: d },
    ]);
    setName("");
    setArrival("");
    setProcessing("");
    setDue("");
    setResults(null);
  }

  function removeTicket(id: string) {
    setTickets((prev) => prev.filter((x) => x.id !== id));
    setResults(null);
  }

  function loadExample() {
    setTickets(EXAMPLE_TICKETS.map((p) => ({ ...p, id: uid() })));
    setResults(null);
  }

  function calculate() {
    if (tickets.length === 0) return;
    setResults(computePeps(tickets));
  }

  function patchInventorySku(id: string, patch: Partial<InventorySkuRow>) {
    setInventorySkuRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function removeInventorySku(id: string) {
    setInventorySkuRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addInventorySku(e: React.FormEvent) {
    e.preventDefault();
    const unitCost = Number(invUnitCost);
    const initialStock = Number(invInitial);
    const purchases = Number(invPurchases);
    const used = Number(invUsed);
    const safetyStock = Number(invSafety);
    const reorderPoint = Number(invReorder);
    if (
      !invCode.trim() ||
      !invDesc.trim() ||
      Number.isNaN(unitCost) ||
      Number.isNaN(initialStock) ||
      Number.isNaN(purchases) ||
      Number.isNaN(used) ||
      Number.isNaN(safetyStock) ||
      Number.isNaN(reorderPoint)
    )
      return;
    setInventorySkuRows((prev) => [
      ...prev,
      {
        id: uid(),
        code: invCode.trim(),
        description: invDesc.trim(),
        unitCost,
        initialStock,
        purchases,
        used,
        safetyStock,
        reorderPoint,
      },
    ]);
    setInvCode("");
    setInvDesc("");
    setInvUnitCost("");
    setInvInitial("");
    setInvPurchases("");
    setInvUsed("");
    setInvSafety("");
    setInvReorder("");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900 selection:bg-blue-200/80">
      <div className="border-b border-slate-200/80 bg-slate-100/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-2 py-2.5 sm:px-5 sm:py-4">
          <div className="flex justify-start overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:justify-center sm:overflow-visible sm:pb-0">
            <div
              className="inline-flex shrink-0 rounded-full bg-slate-200/90 p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]"
              role="tablist"
              aria-label="PEPS e inventario"
            >
            <button
              type="button"
              role="tab"
              id="tab-peps"
              aria-selected={mainTab === "peps"}
              aria-controls="panel-peps"
              tabIndex={mainTab === "peps" ? 0 : -1}
              onClick={() => setMainTab("peps")}
              className={
                mainTab === "peps"
                  ? "flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm shadow-slate-900/10 sm:gap-2 sm:px-4 sm:text-sm"
                  : "flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-slate-600 transition hover:text-slate-800 sm:gap-2 sm:px-4 sm:text-sm"
              }
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M3 8h18" strokeLinecap="round" />
                <circle
                  cx="6.5"
                  cy="6"
                  r="0.65"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="9"
                  cy="6"
                  r="0.65"
                  fill="currentColor"
                  stroke="none"
                />
                <circle
                  cx="11.5"
                  cy="6"
                  r="0.65"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
              PEPS
            </button>
            <button
              type="button"
              role="tab"
              id="tab-inventario"
              aria-selected={mainTab === "inventario"}
              aria-controls="panel-inventario"
              tabIndex={mainTab === "inventario" ? 0 : -1}
              onClick={() => setMainTab("inventario")}
              className={
                mainTab === "inventario"
                  ? "flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm shadow-slate-900/10 sm:gap-2 sm:px-4 sm:text-sm"
                  : "flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-slate-600 transition hover:text-slate-800 sm:gap-2 sm:px-4 sm:text-sm"
              }
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path
                  d="M4 7h16M4 12h16M4 17h10"
                  strokeLinecap="round"
                />
                <rect x="2" y="4" width="20" height="16" rx="2" />
              </svg>
              Inventario
            </button>
            <button
              type="button"
              role="tab"
              id="tab-razon-critica"
              aria-selected={mainTab === "razon-critica"}
              aria-controls="panel-razon-critica"
              tabIndex={mainTab === "razon-critica" ? 0 : -1}
              onClick={() => setMainTab("razon-critica")}
              className={
                mainTab === "razon-critica"
                  ? "flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm shadow-slate-900/10 sm:gap-2 sm:px-4 sm:text-sm"
                  : "flex shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-slate-600 transition hover:text-slate-800 sm:gap-2 sm:px-4 sm:text-sm"
              }
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8 8l8 8M16 8l-8 8" strokeLinecap="round" />
              </svg>
              Razón Crítica
            </button>
            </div>
          </div>
        </div>
      </div>

      <div
        id="panel-razon-critica"
        role="tabpanel"
        aria-labelledby="tab-razon-critica"
        hidden={mainTab !== "razon-critica"}
      >
        <main className="mx-auto max-w-6xl px-3 pb-10 pt-6 sm:px-5 sm:pb-10 sm:py-10">
          <section className={`${cardClass} mb-6`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
              Investigación de Operaciones · Método de Razón Crítica
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Ejercicio de priorización de 5 trabajos IT usando RC = TR ÷ TP,
              con orden de ejecución y análisis de retraso acumulado.
            </p>
          </section>

          <section className={`${cardClass} mb-6`}>
            <h3 className="text-sm font-semibold text-slate-900">
              Trabajos (datos iniciales)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Edita TR y TP para recalcular RC, prioridad y retraso en tiempo real.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#1A5F9E] text-[11px] uppercase tracking-wide text-white">
                    <th className="px-3 py-2.5 font-semibold">Trabajo</th>
                    <th className="px-3 py-2.5 font-semibold">Descripción</th>
                    <th className="px-3 py-2.5 font-semibold">TR</th>
                    <th className="px-3 py-2.5 font-semibold">TP</th>
                  </tr>
                </thead>
                <tbody>
                  {xeniaJobs.map((row, i) => (
                    <tr
                      key={`xenia-job-${i}`}
                      className={
                        i % 2 === 0
                          ? "border-b border-slate-100 bg-white"
                          : "border-b border-slate-100 bg-slate-50/70"
                      }
                    >
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.job}
                          onChange={(e) =>
                            patchXeniaJob(i, { job: e.target.value.toUpperCase() })
                          }
                          className={`${tableInputClass} font-mono font-semibold text-slate-900`}
                          autoComplete="off"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            patchXeniaJob(i, { description: e.target.value })
                          }
                          className={tableInputClass}
                          autoComplete="off"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.tr}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchXeniaJob(i, { tr: Math.max(0, n) });
                          }}
                          className={`${tableNumericInputClass} font-mono tabular-nums text-slate-700`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="any"
                          min={0.01}
                          value={row.tp}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchXeniaJob(i, { tp: Math.max(0.01, n) });
                          }}
                          className={`${tableNumericInputClass} font-mono tabular-nums text-slate-700`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-900">
                Cálculo razón crítica
              </h3>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#1A5F9E] text-[11px] uppercase tracking-wide text-white">
                      <th className="px-3 py-2.5 font-semibold">Trabajo</th>
                      <th className="px-3 py-2.5 font-semibold">TR</th>
                      <th className="px-3 py-2.5 font-semibold">TP</th>
                      <th className="px-3 py-2.5 font-semibold">RC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xeniaRcRows.map((row, i) => (
                      <tr
                        key={`xenia-rc-${i}`}
                        className={
                          i % 2 === 0
                            ? "border-b border-slate-100 bg-white"
                            : "border-b border-slate-100 bg-slate-50/70"
                        }
                      >
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                          {row.job}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700">
                          {row.tr}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700">
                          {row.tp}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-[#1A5F9E]">
                          {numberFormatter.format(row.rc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={cardClass}>
              <h3 className="text-sm font-semibold text-slate-900">
                Orden de prioridad
              </h3>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[360px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#1A5F9E] text-[11px] uppercase tracking-wide text-white">
                      <th className="px-3 py-2.5 font-semibold">Orden</th>
                      <th className="px-3 py-2.5 font-semibold">Trabajo</th>
                      <th className="px-3 py-2.5 font-semibold">RC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xeniaPriorityRows.map((row, i) => (
                      <tr
                        key={`xenia-priority-${i}-${row.job}`}
                        className={
                          i % 2 === 0
                            ? "border-b border-slate-100 bg-white"
                            : "border-b border-slate-100 bg-slate-50/70"
                        }
                      >
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                          {row.job}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-[#1A5F9E]">
                          {numberFormatter.format(row.rc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className={`${cardClass} mt-6`}>
            <h3 className="text-sm font-semibold text-slate-900">
              Tiempo de flujo y retraso
            </h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#1A5F9E] text-[11px] uppercase tracking-wide text-white">
                    <th className="px-3 py-2.5 font-semibold">Trabajo</th>
                    <th className="px-3 py-2.5 font-semibold">TP</th>
                    <th className="px-3 py-2.5 font-semibold">Acumulado</th>
                    <th className="px-3 py-2.5 font-semibold">TR</th>
                    <th className="px-3 py-2.5 font-semibold">Retraso</th>
                  </tr>
                </thead>
                <tbody>
                  {xeniaFlowRows.map((row, i) => (
                    <tr
                      key={`xenia-flow-${i}-${row.job}`}
                      className={
                        i % 2 === 0
                          ? "border-b border-slate-100 bg-white"
                          : "border-b border-slate-100 bg-slate-50/70"
                      }
                    >
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                        {row.job}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700">
                        {row.tp}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700">
                        {row.accumulated}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700">
                        {row.tr}
                      </td>
                      <td
                        className={
                          row.delay === 0
                            ? "px-3 py-2.5 font-mono font-semibold tabular-nums text-emerald-700"
                            : "px-3 py-2.5 font-mono font-semibold tabular-nums text-amber-700"
                        }
                      >
                        {row.delay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Retraso total
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1A5F9E]">
                  {xeniaKpis.totalDelay}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  A tiempo
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700">
                  {xeniaKpis.onTimeJobs}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Tardíos
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-amber-700">
                  {xeniaKpis.lateJobs}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Retraso promedio
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1A5F9E]">
                  {xeniaKpis.avgDelay.toFixed(2)}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <div
        id="panel-peps"
        role="tabpanel"
        aria-labelledby="tab-peps"
        hidden={mainTab !== "peps"}
      >
        <header
          className="border-b border-[#154a80]/30 shadow-sm"
          style={{ backgroundColor: "#1A5F9E" }}
        >
          <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
            <div className="min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                  Calculadora PEPS · Soporte IT y servidores
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Empresa de Soporte IT y Servidores (Regla Razón Crítica - RC)
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50 sm:text-[15px]">
                  Soporte IT y servidores con inventario de repuestos y
                  herramientas. La calculadora modela la cola de tickets en FIFO
                  (PEPS); abajo se detalla cómo el mismo criterio ordena el uso
                  del material del almacén.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 pb-10 pt-6 sm:px-5 sm:pb-10 sm:py-10">
          <section className={`${cardClass} mb-6 lg:mb-7`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
              <div className="min-w-0 flex-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
                  Inventario · Herramientas y repuestos
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Catálogo operativo de la empresa para ejecutar servicios de
                  campo y taller.
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {INVENTORY_ITEMS.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A5F9E]"
                        aria-hidden
                      />
                      <span>
                        <span className="font-medium text-slate-800">
                          {item.name}
                          {item.optional ? (
                            <span className="ml-1 text-xs font-normal text-slate-500">
                              (opcional)
                            </span>
                          ) : null}
                        </span>
                        {item.detail ? (
                          <span className="mt-0.5 block text-xs text-slate-600">
                            {item.detail}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-900/4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-linear-to-r from-sky-50/90 to-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1A5F9E]">
                      Resultado final (tabla)
                    </p>
                    <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:inline">
                      Seguridad = 25% × mínimo
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-[#1A5F9E] text-[11px] uppercase tracking-wide text-white">
                          <th className="px-4 py-3 font-semibold">Producto</th>
                          <th className="px-4 py-3 font-semibold">
                            Stock mínimo
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Stock seguridad
                          </th>
                          <th className="px-4 py-3 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryResult.map((row, i) => (
                          <tr
                            key={row.product}
                            className={
                              i % 2 === 0
                                ? "border-b border-slate-100 bg-white last:border-b-0"
                                : "border-b border-slate-100 bg-slate-50/70 last:border-b-0"
                            }
                          >
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {row.product}
                            </td>
                            <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700">
                              {numberFormatter.format(row.stockMin)}
                            </td>
                            <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700">
                              {numberFormatter.format(row.safetyStock)}
                            </td>
                            <td className="px-4 py-2.5 font-mono tabular-nums font-medium text-slate-900">
                              {numberFormatter.format(row.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 rounded-2xl border border-sky-200/80 bg-sky-50/60 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Dónde aplica PEPS (FIFO)
                </h3>
                <ul className="mt-3 list-disc space-y-3 pl-4 text-sm leading-relaxed text-slate-700 marker:text-[#1A5F9E]">
                  <li>
                    <strong className="font-semibold text-slate-800">
                      Cola de tickets (esta calculadora).
                    </strong>{" "}
                    Primero en entrar, primero en salir: se ordenan los tickets
                    por momento de llegada a cola; el técnico o el banco de
                    trabajo atiende en ese orden cuando la capacidad es
                    secuencial. Los tiempos de resolución y el SLA se calculan
                    con esa secuencia.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-800">
                      Salida de inventario.
                    </strong>{" "}
                    Las piezas y consumibles que ingresaron antes al almacén
                    (compras, recepciones, RMA) deben salir primero al despacho
                    por ticket o por orden de trabajo. Así se evita que discos,
                    RAM, pasta térmica o cables “viejos” queden obsoletos al
                    fondo del estante, se homogeniza la rotación y se facilita
                    la trazabilidad en auditorías.
                  </li>
                  <li>
                    Los ítems marcados como opcionales (p. ej. UPS o
                    reguladores) siguen la misma lógica cuando están en stock:
                    primero lo recibido antes, al asignarlo a un proyecto o
                    instalación.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-7">
            <section className={`order-1 ${cardClass}`}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
                Registrar ticket
              </h2>
              <form
                onSubmit={addTicket}
                className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3"
              >
                <label className="sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">
                    Descripción del ticket
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Actualización firmware firewall"
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span className="text-xs font-medium text-slate-600">
                    Llegada a cola (días)
                  </span>
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
                  <span className="text-xs font-medium text-slate-600">
                    Tiempo de resolución (días)
                  </span>
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
                  <span className="text-xs font-medium text-slate-600">
                    Compromiso SLA (días)
                  </span>
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
                    Añadir ticket
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
                    Cola de tickets ({tickets.length})
                  </h2>
                  <button
                    type="button"
                    onClick={calculate}
                    disabled={tickets.length === 0}
                    className="min-h-11 w-full rounded-xl border-2 border-[#1A5F9E] bg-white px-4 py-2.5 text-base font-semibold text-[#1A5F9E] shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-60 active:scale-[0.99] sm:w-auto sm:min-w-[120px] sm:text-sm"
                  >
                    Calcular
                  </button>
                </div>
                {tickets.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Aún no hay tickets. Añada filas o cargue el ejemplo.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    {tickets.map((p) => (
                      <li key={p.id} className="px-3 py-3 sm:py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug text-slate-800">
                              {p.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Lleg. {p.arrival} · Resol. {p.processing} · SLA{" "}
                              {p.due}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTicket(p.id)}
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
                  Pulse{" "}
                  <span className="font-medium text-slate-700">Calcular</span>{" "}
                  para ver la secuencia FIFO y los KPIs de la cola de soporte.
                </p>
              ) : (
                <>
                  <div className="mt-4 space-y-3 md:hidden">
                    {results.map((r) => (
                      <div
                        key={r.ticket.id}
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
                            <p className="font-medium">{r.ticket.name}</p>
                          </div>
                          <p className="text-right text-xs leading-snug">
                            {r.status}
                          </p>
                        </div>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:text-sm">
                          <div>
                            <dt className="text-slate-600 opacity-90">
                              Llegada
                            </dt>
                            <dd className="font-mono tabular-nums">
                              {r.ticket.arrival}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-600 opacity-90">
                              Resolución
                            </dt>
                            <dd className="font-mono tabular-nums">
                              {r.ticket.processing}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-600 opacity-90">
                              Inicio
                            </dt>
                            <dd className="font-mono tabular-nums">
                              {r.start}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-600 opacity-90">Fin</dt>
                            <dd className="font-mono tabular-nums">
                              {r.finish}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-600 opacity-90">
                              Tiempo de flujo
                            </dt>
                            <dd className="font-mono tabular-nums">
                              {r.flowTime}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-600 opacity-90">SLA</dt>
                            <dd className="font-mono tabular-nums">
                              {r.ticket.due}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-slate-600 opacity-90">
                              Retraso
                            </dt>
                            <dd className="font-mono tabular-nums">
                              {r.tardiness}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200/80 md:block">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm lg:min-w-0">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Orden
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Ticket
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Llegada
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Resolución
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Inicio
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Fin
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Tiempo flujo
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            SLA
                          </th>
                          <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                            Retraso
                          </th>
                          <th className="min-w-28 px-2 py-2.5 font-semibold">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr
                            key={r.ticket.id}
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
                              {r.ticket.name}
                            </td>
                            <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                              {r.ticket.arrival}
                            </td>
                            <td className="border-b border-slate-100 px-2 py-2.5 font-mono text-xs">
                              {r.ticket.processing}
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
                              {r.ticket.due}
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
                    <p className="text-xs text-slate-500">
                      Σ resolución ÷ horizonte
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Media de tickets en sistema
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#1A5F9E]">
                      {kpis.avgJobsInSystem.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Σ tiempo flujo ÷ horizonte
                    </p>
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
                      <dt className="font-semibold text-slate-800">
                        Inicio real (FIFO)
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        max(llegada, fin anterior); el primero usa fin anterior
                        = 0
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Tiempo de finalización
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        inicio + tiempo de resolución
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Tiempo de flujo
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        fin − llegada
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">Retraso</dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        max(0, fin − SLA comprometido)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Horizonte (makespan)
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        max(fin) − min(llegada)
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Tiempo medio de finalización
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        Σ(tiempo de flujo) ÷ n
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Utilización
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        Σ(resolución) ÷ horizonte × 100%
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Media de tickets en sistema
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        Σ(tiempo de flujo) ÷ horizonte
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-800">
                        Retraso medio
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-600">
                        Σ(retraso) ÷ n
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <div
        id="panel-inventario"
        role="tabpanel"
        aria-labelledby="tab-inventario"
        hidden={mainTab !== "inventario"}
      >
        <header
          className="border-b border-[#154a80]/30 shadow-sm"
          style={{ backgroundColor: "#1A5F9E" }}
        >
          <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100">
              Infraestructura IT · marzo 2026
            </p>
            <h1 className="mt-2 text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:text-3xl">
              Control de inventario
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-50 sm:text-[15px]">
              Mercadería disponible, valoración, salidas y punto de
              reabastecimiento. Las celdas editables alimentan las columnas
              calculadas.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 pb-10 pt-6 sm:px-5 sm:pb-10 sm:py-10">
          <section className={`${cardClass} mb-5 sm:mb-6`}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
              Añadir artículo
            </h2>
            <form
              onSubmit={addInventorySku}
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">
                  Código de artículo
                </span>
                <input
                  type="text"
                  value={invCode}
                  onChange={(e) => setInvCode(e.target.value)}
                  className={inputClass}
                  autoComplete="off"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">
                  Descripción
                </span>
                <input
                  type="text"
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  className={inputClass}
                  autoComplete="off"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">
                  Costo unitario (USD)
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="decimal"
                  value={invUnitCost}
                  onChange={(e) => setInvUnitCost(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">
                  Inventario inicial
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="numeric"
                  value={invInitial}
                  onChange={(e) => setInvInitial(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">
                  Compras
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="numeric"
                  value={invPurchases}
                  onChange={(e) => setInvPurchases(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">
                  Salidas / utilizados
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="numeric"
                  value={invUsed}
                  onChange={(e) => setInvUsed(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">
                  Margen de seguridad
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="numeric"
                  value={invSafety}
                  onChange={(e) => setInvSafety(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-xs font-medium text-slate-600">
                  Punto de reabastecimiento
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  inputMode="numeric"
                  value={invReorder}
                  onChange={(e) => setInvReorder(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-xl bg-[#1A5F9E] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-[#154a80] active:scale-[0.99] sm:w-auto"
                >
                  Añadir a la tabla
                </button>
              </div>
            </form>
          </section>

          <section className={cardClass}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A5F9E] sm:text-xs">
                  Matriz de inventario
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {inventorySkuRows.length} artículos
                </p>
                <p className="mt-2 text-xs leading-snug text-slate-500 md:hidden">
                  Vista en tarjetas en móvil; tabla completa desde tablet.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4 md:hidden">
              {inventorySkuRows.map((row) => {
                const line = computeInventoryLine(row);
                const alertBad = line.alert === "Solicitar Pedido";
                const fl =
                  "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
                return (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={fl}>Código</p>
                        <input
                          type="text"
                          value={row.code}
                          onChange={(e) =>
                            patchInventorySku(row.id, {
                              code: e.target.value,
                            })
                          }
                          className={`${mobileInventoryFieldClass} mt-1 font-mono`}
                        />
                      </div>
                      <span
                        className={
                          alertBad
                            ? "inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-1.5 text-center text-[11px] font-semibold leading-tight text-amber-900"
                            : "inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2.5 py-1.5 text-center text-[11px] font-semibold leading-tight text-emerald-900"
                        }
                      >
                        {line.alert}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInventorySku(row.id)}
                        aria-label="Quitar artículo"
                        className="min-h-12 min-w-12 shrink-0 touch-manipulation rounded-xl border border-red-200 bg-red-50 px-2 text-sm font-semibold text-red-700 active:bg-red-100"
                      >
                        ✕
                      </button>
                    </div>
                    <label className="mt-3 block">
                      <span className={fl}>Descripción</span>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          patchInventorySku(row.id, {
                            description: e.target.value,
                          })
                        }
                        className={`${mobileInventoryFieldClass} mt-1`}
                      />
                    </label>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <label className="block min-w-0">
                        <span className={fl}>Costo unit. (USD)</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.unitCost}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchInventorySku(row.id, { unitCost: n });
                          }}
                          className={`${mobileInventoryFieldClass} mt-1 font-mono tabular-nums`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className={fl}>Inv. inicial</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.initialStock}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchInventorySku(row.id, {
                                initialStock: Math.max(0, n),
                              });
                          }}
                          className={`${mobileInventoryFieldClass} mt-1 font-mono tabular-nums`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className={fl}>Compras</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.purchases}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchInventorySku(row.id, {
                                purchases: Math.max(0, n),
                              });
                          }}
                          className={`${mobileInventoryFieldClass} mt-1 font-mono tabular-nums`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className={fl}>Salidas</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.used}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchInventorySku(row.id, {
                                used: Math.max(0, n),
                              });
                          }}
                          className={`${mobileInventoryFieldClass} mt-1 font-mono tabular-nums`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className={fl}>Margen seg.</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.safetyStock}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchInventorySku(row.id, {
                                safetyStock: Math.max(0, n),
                              });
                          }}
                          className={`${mobileInventoryFieldClass} mt-1 font-mono tabular-nums`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className={fl}>Pto. reabast.</span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={row.reorderPoint}
                          onChange={(e) => {
                            const n = e.target.valueAsNumber;
                            if (!Number.isNaN(n))
                              patchInventorySku(row.id, {
                                reorderPoint: Math.max(0, n),
                              });
                          }}
                          className={`${mobileInventoryFieldClass} mt-1 font-mono tabular-nums`}
                        />
                      </label>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Calculados
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">Merc. disp.</dt>
                          <dd className="font-mono font-medium tabular-nums text-slate-900">
                            {numberFormatter.format(line.available)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">
                            Costo merc. disp.
                          </dt>
                          <dd className="break-all font-mono text-sm font-medium tabular-nums text-slate-900">
                            {currencyFormatter.format(line.costAvailable)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">CMV</dt>
                          <dd className="font-mono font-medium tabular-nums text-slate-900">
                            {row.used === 0
                              ? "—"
                              : currencyFormatter.format(line.cogs)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Inv. final</dt>
                          <dd className="font-mono text-base font-semibold tabular-nums text-[#1A5F9E]">
                            {numberFormatter.format(line.ending)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200/90 shadow-sm [-webkit-overflow-scrolling:touch] md:block">
              <table className="w-full min-w-[1320px] border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1A5F9E] text-[10px] uppercase tracking-wide text-white sm:text-[11px]">
                    <th className="sticky left-0 z-10 min-w-54 bg-[#1A5F9E] px-2 py-2.5 font-semibold">
                      Código
                    </th>
                    <th className="min-w-[18rem] px-2 py-2.5 font-semibold">
                      Descripción
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Costo unit.
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Inv. inicial
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Compras
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Merc. disponible
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Costo merc. disp.
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Salidas
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      CMV
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Inv. final
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Margen seg.
                    </th>
                    <th className="whitespace-nowrap px-2 py-2.5 font-semibold">
                      Pto. reabast.
                    </th>
                    <th className="min-w-28 px-2 py-2.5 font-semibold">
                      Alerta
                    </th>
                    <th className="w-10 px-1 py-2.5 font-semibold"> </th>
                  </tr>
                </thead>
                <tbody>
                  {inventorySkuRows.map((row, i) => {
                    const line = computeInventoryLine(row);
                    const alertBad = line.alert === "Solicitar Pedido";
                    return (
                      <tr
                        key={row.id}
                        className={
                          i % 2 === 0
                            ? "border-b border-slate-100 bg-white"
                            : "border-b border-slate-100 bg-slate-50/80"
                        }
                      >
                        <td
                          className={
                            i % 2 === 0
                              ? "sticky left-0 z-1 min-w-54 border-r border-slate-100 bg-white px-1.5 py-1"
                              : "sticky left-0 z-1 min-w-54 border-r border-slate-100 bg-slate-50/80 px-1.5 py-1"
                          }
                        >
                          <input
                            type="text"
                            value={row.code}
                            onChange={(e) =>
                              patchInventorySku(row.id, {
                                code: e.target.value,
                              })
                            }
                            className={`${tableInputClass} font-mono text-xs tabular-nums sm:text-sm`}
                            autoComplete="off"
                          />
                        </td>
                        <td className="min-w-[18rem] px-1.5 py-1">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              patchInventorySku(row.id, {
                                description: e.target.value,
                              })
                            }
                            className={tableInputClass}
                            autoComplete="off"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={row.unitCost}
                            onChange={(e) => {
                              const n = e.target.valueAsNumber;
                              if (!Number.isNaN(n))
                                patchInventorySku(row.id, { unitCost: n });
                            }}
                            className={`${tableNumericInputClass} font-mono tabular-nums`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={row.initialStock}
                            onChange={(e) => {
                              const n = e.target.valueAsNumber;
                              if (!Number.isNaN(n))
                                patchInventorySku(row.id, {
                                  initialStock: Math.max(0, n),
                                });
                            }}
                            className={`${tableNumericInputClass} font-mono tabular-nums`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={row.purchases}
                            onChange={(e) => {
                              const n = e.target.valueAsNumber;
                              if (!Number.isNaN(n))
                                patchInventorySku(row.id, {
                                  purchases: Math.max(0, n),
                                });
                            }}
                            className={`${tableNumericInputClass} font-mono tabular-nums`}
                          />
                        </td>
                        <td className="px-2 py-2 font-mono tabular-nums text-slate-800">
                          {numberFormatter.format(line.available)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono tabular-nums text-slate-800">
                          {currencyFormatter.format(line.costAvailable)}
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={row.used}
                            onChange={(e) => {
                              const n = e.target.valueAsNumber;
                              if (!Number.isNaN(n))
                                patchInventorySku(row.id, {
                                  used: Math.max(0, n),
                                });
                            }}
                            className={`${tableNumericInputClass} font-mono tabular-nums`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-mono tabular-nums text-slate-800">
                          {row.used === 0
                            ? "—"
                            : currencyFormatter.format(line.cogs)}
                        </td>
                        <td className="px-2 py-2 font-mono font-semibold tabular-nums text-slate-900">
                          {numberFormatter.format(line.ending)}
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={row.safetyStock}
                            onChange={(e) => {
                              const n = e.target.valueAsNumber;
                              if (!Number.isNaN(n))
                                patchInventorySku(row.id, {
                                  safetyStock: Math.max(0, n),
                                });
                            }}
                            className={`${tableNumericInputClass} font-mono tabular-nums`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={row.reorderPoint}
                            onChange={(e) => {
                              const n = e.target.valueAsNumber;
                              if (!Number.isNaN(n))
                                patchInventorySku(row.id, {
                                  reorderPoint: Math.max(0, n),
                                });
                            }}
                            className={`${tableNumericInputClass} font-mono tabular-nums`}
                          />
                        </td>
                        <td
                          className={`px-2 py-2 text-xs font-medium sm:text-sm ${
                            alertBad
                              ? "text-amber-800"
                              : "text-emerald-800"
                          }`}
                        >
                          {line.alert}
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeInventorySku(row.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={() => setInventoryFormulasOpen((o) => !o)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white active:bg-slate-100 sm:min-h-0 sm:py-2"
              >
                <span>Referencia de fórmulas (inventario)</span>
                <span className="text-[#1A5F9E]" aria-hidden>
                  {inventoryFormulasOpen ? "−" : "+"}
                </span>
              </button>
              {inventoryFormulasOpen && (
                <dl className="mt-3 space-y-3 rounded-xl border border-slate-200/80 bg-white/90 p-3 text-sm leading-relaxed text-slate-700 shadow-sm sm:p-4">
                  <div>
                    <dt className="font-semibold text-slate-800">
                      Mercadería disponible
                    </dt>
                    <dd className="mt-1 wrap-break-word font-mono text-xs text-slate-600">
                      inventario inicial + compras
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">
                      Costo de mercadería disponible
                    </dt>
                    <dd className="mt-1 wrap-break-word font-mono text-xs text-slate-600">
                      mercadería disponible × costo unitario
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">
                      Costo de mercaderías vendidas (CMV)
                    </dt>
                    <dd className="mt-1 wrap-break-word font-mono text-xs text-slate-600">
                      salidas × costo unitario
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">
                      Inventario final
                    </dt>
                    <dd className="mt-1 wrap-break-word font-mono text-xs text-slate-600">
                      mercadería disponible − salidas
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">
                      Punto de reabastecimiento
                    </dt>
                    <dd className="mt-1 wrap-break-word font-mono text-xs text-slate-600">
                      (tiempo de entrega × demanda diaria) + margen de seguridad
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">
                      Alerta de inventario
                    </dt>
                    <dd className="mt-1 wrap-break-word font-mono text-xs text-slate-600">
                      si inventario final ≤ punto de reabastecimiento →
                      Solicitar Pedido; si no → Nivel Óptimo
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
