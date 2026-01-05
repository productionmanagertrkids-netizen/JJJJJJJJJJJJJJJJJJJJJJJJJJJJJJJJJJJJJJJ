
import React, { useMemo, useState } from 'react';
import { ProductionJob } from '../types';
import { CheckCircle2, Clock, AlertTriangle, BarChart3, Search, Filter, Check, X, FileDown, Timer, ArrowUpRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductionTableProps {
  data: ProductionJob[];
  selectedJobName?: string;
  onJobNameChange?: (jobName: string) => void;
  availableJobNames?: string[];
}

const ProductionTable: React.FC<ProductionTableProps> = ({ data, selectedJobName = 'ALL', onJobNameChange, availableJobNames = [] }) => {
  const [delayFilter, setDelayFilter] = useState<'ALL' | 'START_DELAYED' | 'FINISH_DELAYED' | 'ON_TIME'>('ALL');

  if (!data || data.length === 0) return null;

  const timeToMinutes = (t: string) => {
    if (!t || t === '-' || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number); return h * 60 + m;
  };

  const calculateMetrics = (job: ProductionJob) => {
    const pStart = timeToMinutes(job.planStart);
    let pFinish = timeToMinutes(job.planFinish);
    let aStart = timeToMinutes(job.actualStart);
    let aFinish = timeToMinutes(job.actualFinish);

    if (pStart === null || pFinish === null || aFinish === null) return { delay: 0, sDelay: 0, isOnTime: false, score: null, deducted: null, isC: false };
    if (pFinish < pStart) pFinish += 1440;
    if (aStart !== null && aStart < pStart && (pStart - aStart) > 720) aStart += 1440;
    if (aFinish < pStart && (pStart - aFinish) > 720) aFinish += 1440;

    const dur = pFinish - pStart;
    const sDelay = aStart !== null ? Math.max(0, aStart - pStart) : 0;
    const delay = Math.max(0, aFinish - pFinish);
    const isOnTime = aFinish <= pFinish;
    const isC = job.status.includes("เสร็จแล้ว") || job.status.includes("Completed");

    if (isOnTime) return { delay: 0, sDelay, isOnTime: true, score: 100, deducted: 0, isC };
    const score = Math.max(0, Math.round((dur / (dur + delay)) * 100));
    return { delay, sDelay, isOnTime: false, score, deducted: 100 - score, isC };
  };

  const displayData = useMemo(() => {
    if (delayFilter === 'ALL') return data;
    return data.filter(job => {
      const m = calculateMetrics(job);
      if (delayFilter === 'START_DELAYED') return m.sDelay > 0;
      if (delayFilter === 'FINISH_DELAYED') return m.delay > 0;
      if (delayFilter === 'ON_TIME') return m.delay === 0 && m.sDelay === 0;
      return true;
    });
  }, [data, delayFilter]);

  const handleExportExcel = () => {
    const exportData = displayData.map((item, index) => {
      const m = calculateMetrics(item);
      return { "No": index + 1, "Job Name": item.jobName, "Qty": item.quantity, "Dept": item.process, "Status": item.status, "Plan Start": item.planStart, "Plan Finish": item.planFinish, "Actual Start": item.actualStart, "Actual Finish": item.actualFinish, "Delay (min)": m.delay, "Efficiency (%)": m.score || "-" };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ProductionReport");
    XLSX.writeFile(workbook, `Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex flex-col bg-white">
      {/* List Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <LayersIcon size={20} className="text-indigo-600" />
              รายการภารกิจที่กำลังดำเนินการ
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Job Execution Registry</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex bg-slate-100 p-1 rounded-xl">
                {['ALL', 'FINISH_DELAYED', 'ON_TIME'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setDelayFilter(f as any)}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${delayFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {f === 'ALL' ? 'ทั้งหมด' : f === 'FINISH_DELAYED' ? 'ล่าช้า' : 'ตรงเวลา'}
                  </button>
                ))}
             </div>
             
             <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select
                  value={selectedJobName}
                  onChange={(e) => onJobNameChange?.(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">เลือกชื่อใบงาน...</option>
                  {availableJobNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
             </div>

             <button onClick={handleExportExcel} className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all">
                <FileDown size={20} />
             </button>
          </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50/50">
              {['ID', 'Job Details', 'Dept', 'Status', 'Timing (Plan/Actual)', 'Delay (min)', 'Efficiency'].map((h, i) => (
                <th key={h} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 ${i === 0 ? 'text-center' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayData.map((row, idx) => {
              const m = calculateMetrics(row);
              return (
                <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">{row.jobName}</span>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><PackageIcon size={10} /> Qty: {row.quantity}</span>
                        <span className="flex items-center gap-1"><LayersIcon size={10} /> Line: {row.line}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight">{row.process}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${row.status.includes('เสร็จ') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {row.status.includes('เสร็จ') ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                       <div className="flex flex-col text-slate-400">
                          <span>{row.planStart}</span>
                          <span>{row.planFinish}</span>
                       </div>
                       <div className="h-6 w-px bg-slate-200"></div>
                       <div className="flex flex-col text-indigo-700">
                          <span>{row.actualStart === '-' ? 'Waiting' : row.actualStart}</span>
                          <span>{row.actualFinish === '-' ? '-' : row.actualFinish}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {m.delay > 0 ? (
                      <div className="flex items-center gap-1 text-rose-600 font-black">
                         <ArrowUpRight size={14} />
                         <span>+{m.delay} m</span>
                      </div>
                    ) : (
                      <span className="text-emerald-500 font-bold">On Time</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {m.score !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                           <div className={`h-full rounded-full ${m.score >= 90 ? 'bg-emerald-500' : m.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${m.score}%` }}></div>
                        </div>
                        <span className="text-xs font-black text-slate-800">{m.score}%</span>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LayersIcon = ({ size, className }: { size: number, className?: string }) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.1 6.13a2 2 0 0 0 0 3.66l9.07 3.95a2 2 0 0 0 1.66 0l9.07-3.95a2 2 0 0 0 0-3.66Z"/><path d="m2.1 14.74 9.07 3.95a2 2 0 0 0 1.66 0l9.07-3.95"/><path d="m2.1 19.16 9.07 3.95a2 2 0 0 0 1.66 0l9.07-3.95"/></svg>;
const PackageIcon = ({ size, className }: { size: number, className?: string }) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;

export default ProductionTable;
