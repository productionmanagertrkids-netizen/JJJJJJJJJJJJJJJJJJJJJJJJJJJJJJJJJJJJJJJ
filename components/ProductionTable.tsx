
import React, { useMemo, useState } from 'react';
import { ProductionJob } from '../types';
import { CheckCircle2, Clock, AlertTriangle, BarChart3, Search, Filter, Check, X, FileDown, Timer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductionTableProps {
  data: ProductionJob[];
  selectedJobName?: string;
  onJobNameChange?: (jobName: string) => void;
  availableJobNames?: string[];
}

const ProductionTable: React.FC<ProductionTableProps> = ({ 
  data, 
  selectedJobName = 'ALL', 
  onJobNameChange, 
  availableJobNames = [] 
}) => {
  const [delayFilter, setDelayFilter] = useState<'ALL' | 'DELAYED' | 'ON_TIME'>('ALL');

  if (data.length === 0) return null;

  const timeToMinutes = (t: string) => {
    if (!t || t === '-' || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateMetrics = (job: ProductionJob) => {
    const planStart = timeToMinutes(job.planStart);
    let planFinish = timeToMinutes(job.planFinish);
    let actualFinish = timeToMinutes(job.actualFinish);

    if (planStart === null || planFinish === null || actualFinish === null) {
      return { 
        planDuration: 0, 
        delay: 0, 
        isOnTime: false, 
        score: null, 
        deducted: null,
        isCompleted: false
      };
    }

    if (planFinish < planStart) planFinish += 24 * 60;
    if (actualFinish < planStart && (planStart - actualFinish) > 12 * 60) actualFinish += 24 * 60;

    const planDuration = planFinish - planStart;
    const delayMinutes = Math.max(0, actualFinish - planFinish);
    const isOnTime = actualFinish <= planFinish;
    
    const isCompleted = job.status.includes("เสร็จแล้ว") || job.status.includes("Completed");

    if (isOnTime) {
      return { 
        planDuration, 
        delay: 0, 
        isOnTime: true, 
        score: 100, 
        deducted: 0,
        isCompleted
      };
    } else {
      const totalTimeUsed = planDuration + delayMinutes;
      const duration = totalTimeUsed > 0 ? totalTimeUsed : 1;
      let score = Math.round((planDuration / duration) * 100);
      if (score > 100) score = 100;
      if (score < 0) score = 0;
      return { 
        planDuration, 
        delay: delayMinutes, 
        isOnTime: false, 
        score: score, 
        deducted: 100 - score,
        isCompleted
      };
    }
  };

  // Apply Delay Filter
  const displayData = useMemo(() => {
    if (delayFilter === 'ALL') return data;
    return data.filter(job => {
      const metrics = calculateMetrics(job);
      if (delayFilter === 'DELAYED') return metrics.delay > 0;
      if (delayFilter === 'ON_TIME') return metrics.delay === 0;
      return true;
    });
  }, [data, delayFilter]);

  const handleExportExcel = () => {
    const exportData = displayData.map((item, index) => {
      const metrics = calculateMetrics(item);
      return {
        "ลำดับ": index + 1,
        "ชื่อใบงาน": item.jobName,
        "เวลาตัด": item.cutTime,
        "จำนวน": item.quantity,
        "ไลน์": item.line,
        "แผนก": item.process,
        "สถานะ": item.status,
        "แผนเริ่ม": item.planStart,
        "แผนเสร็จ": item.planFinish,
        "เริ่มจริง": item.actualStart,
        "เสร็จจริง": item.actualFinish,
        "เวลาตามแผน (นาที)": metrics.planDuration,
        "ล่าช้า (นาที)": metrics.delay,
        "เสร็จทันเวลา": metrics.isCompleted ? (metrics.isOnTime ? "Yes" : "No") : "-",
        "คะแนนเวลา (%)": metrics.score !== null ? `${metrics.score}%` : "-",
        "% ที่ถูกหัก": metrics.deducted !== null ? `${metrics.deducted}%` : "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Production Report");
    
    worksheet["!cols"] = Array(16).fill({ wch: 15 });

    XLSX.writeFile(workbook, `Production_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    if (status.includes("เสร็จแล้ว") || status.includes("Completed")) return "text-green-700 bg-green-50 border-green-200";
    if (status.includes("กำลัง") || status.includes("In Progress")) return "text-blue-700 bg-blue-50 border-blue-200";
    return "text-orange-700 bg-orange-50 border-orange-200";
  };

  const getStatusIcon = (status: string) => {
     if (status.includes("เสร็จแล้ว")) return <CheckCircle2 size={11} className="mr-1" />;
     if (status.includes("กำลัง")) return <Clock size={11} className="mr-1" />;
     return <AlertTriangle size={11} className="mr-1" />;
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-300";
    if (score >= 95) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 80) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  }

  const processSummary = useMemo(() => {
    const groups: Record<string, { count: number; qty: number; completed: number; onTimeScore: number; lateScore: number; totalScore: number; scoredCount: number }> = {};
    
    data.forEach(job => {
      const p = job.process || 'Unknown';
      if (!groups[p]) groups[p] = { count: 0, qty: 0, completed: 0, onTimeScore: 0, lateScore: 0, totalScore: 0, scoredCount: 0 };
      
      groups[p].count++;
      groups[p].qty += job.quantity;
      
      const metrics = calculateMetrics(job);
      if (metrics.score !== null) {
        groups[p].totalScore += metrics.score;
        groups[p].scoredCount++;
        if (metrics.score === 100) {
          groups[p].onTimeScore++;
        } else {
          groups[p].lateScore++;
        }
      }

      const s = job.status.toLowerCase();
      if (s.includes('เสร็จ') || s.includes('completed') || s.includes('ok')) {
        groups[p].completed++;
      }
    });

    return Object.entries(groups).map(([name, stats]) => ({
      name,
      ...stats,
      avgScore: stats.scoredCount > 0 ? Math.round(stats.totalScore / stats.scoredCount) : null
    }));
  }, [data]);

  return (
    <div className="space-y-8">
      {/* 1. Summary by Department */}
      {processSummary.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                    <BarChart3 size={18} className="text-indigo-600" />
                    สรุปคะแนนประสิทธิภาพรายแผนก
                </h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
                            <th className="px-6 py-4 w-1/4">แผนก</th>
                            <th className="px-6 py-4 text-center bg-indigo-50/50 text-indigo-700">คะแนนเฉลี่ย</th>
                            <th className="px-6 py-4 text-center">ตรงเวลา (100%)</th>
                            <th className="px-6 py-4 text-center">ล่าช้า</th>
                            <th className="px-6 py-4 text-right">ยอดผลิตรวม</th>
                            <th className="px-6 py-4 text-center">สถานะเสร็จ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processSummary.map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black border-2 ${getScoreColor(row.avgScore)}`}>
                                        {row.avgScore !== null ? `${row.avgScore}%` : '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center text-emerald-600 font-bold">{row.onTimeScore}</td>
                                <td className="px-6 py-4 text-center text-rose-600 font-bold">{row.lateScore}</td>
                                <td className="px-6 py-4 text-right text-slate-800 font-medium">{row.qty.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-500">{row.completed} / {row.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* 2. Detailed Job List with All Columns */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-slate-800">รายการผลิตโดยละเอียด</h2>
            <span className="text-[10px] text-slate-400 mt-0.5">แสดง {displayData.length} จาก {data.length} รายการ</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <FileDown size={16} />
              Export Excel
            </button>

            {/* Delay Filter Dropdown */}
            <div className="relative group min-w-[160px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Timer size={16} />
              </div>
              <select
                value={delayFilter}
                onChange={(e) => setDelayFilter(e.target.value as any)}
                className="block w-full pl-10 pr-10 py-2 text-xs bg-white border border-slate-200 text-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition-all cursor-pointer hover:border-slate-400"
              >
                <option value="ALL">สถานะล่าช้า: ทั้งหมด</option>
                <option value="DELAYED">เฉพาะที่ล่าช้า</option>
                <option value="ON_TIME">ตรงเวลาเท่านั้น</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Filter size={14} />
              </div>
            </div>

            {/* Job Name Dropdown */}
            <div className="relative group min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <select
                value={selectedJobName}
                onChange={(e) => onJobNameChange?.(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 text-xs bg-white border border-slate-200 text-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition-all cursor-pointer hover:border-slate-400"
              >
                <option value="ALL">เลือกชื่อใบงานทั้งหมด</option>
                {availableJobNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Filter size={14} />
              </div>
            </div>

            {(selectedJobName !== 'ALL' || delayFilter !== 'ALL') && (
              <button 
                onClick={() => {
                    onJobNameChange?.('ALL');
                    setDelayFilter('ALL');
                }}
                className="text-xs text-indigo-600 font-bold hover:bg-indigo-50 bg-indigo-50/50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200">
                <th className="px-3 py-4 w-8 text-center border-r border-slate-100">ลำดับ</th>
                <th className="px-3 py-4 min-w-[110px] border-r border-slate-100">ชื่อใบงาน</th>
                <th className="px-3 py-4 text-center bg-blue-50/30">เวลาตัด</th>
                <th className="px-3 py-4 text-center">จำนวน</th>
                <th className="px-3 py-4 text-center">ไลน์</th>
                <th className="px-3 py-4 min-w-[90px]">สถานะ</th>
                <th className="px-3 py-4 text-center text-slate-400 bg-slate-100/30">แผนเริ่ม</th>
                <th className="px-3 py-4 text-center text-slate-400 bg-slate-100/30">แผนเสร็จ</th>
                <th className="px-3 py-4 text-center text-indigo-700 bg-indigo-50/30 font-bold">เริ่มจริง</th>
                <th className="px-3 py-4 text-center text-indigo-700 bg-indigo-50/30 font-bold">เสร็จจริง</th>
                <th className="px-3 py-4 text-center text-slate-500">เวลาตามแผน (นาที)</th>
                <th className="px-3 py-4 text-center text-rose-500 font-bold">ล่าช้า (นาที)</th>
                <th className="px-3 py-4 text-center">เสร็จทันเวลา</th>
                <th className="px-3 py-4 text-center text-slate-700 bg-slate-100 font-black border-l border-slate-200">คะแนนเวลา (%)</th>
                <th className="px-3 py-4 text-center text-rose-600 bg-rose-50 font-black border-l border-slate-200">% ที่ถูกหัก (ล่าช้า)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map((row, idx) => {
                const metrics = calculateMetrics(row);
                return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="px-3 py-3 font-bold text-slate-800 border-r border-slate-100">{row.jobName}</td>
                    <td className="px-3 py-3 text-center font-medium text-blue-600">{row.cutTime}</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{row.quantity}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{row.line}</td>
                    <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(row.status)}`}>
                        {getStatusIcon(row.status)}
                        {row.status}
                        </span>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400">{row.planStart}</td>
                    <td className="px-3 py-3 text-center text-slate-400">{row.planFinish}</td>
                    <td className="px-3 py-3 text-center text-slate-800 font-bold">{row.actualStart}</td>
                    <td className="px-3 py-3 text-center text-slate-800 font-bold">{row.actualFinish}</td>
                    <td className="px-3 py-3 text-center text-slate-500">
                        {metrics.planDuration > 0 ? metrics.planDuration : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                        {metrics.delay > 0 ? (
                            <span className="text-rose-600 font-black">+{metrics.delay}</span>
                        ) : (
                            <span className="text-emerald-500 font-medium">0</span>
                        )}
                    </td>
                    <td className="px-3 py-3 text-center">
                        {metrics.isCompleted ? (
                             metrics.isOnTime ? (
                                <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600">
                                    <Check size={10} strokeWidth={4} />
                                </div>
                             ) : (
                                <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-rose-600">
                                    <X size={10} strokeWidth={4} />
                                </div>
                             )
                        ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center border-l border-slate-200">
                        {metrics.score !== null ? (
                            <span className={`inline-flex items-center justify-center min-w-[36px] py-0.5 rounded border text-[9px] font-black ${getScoreColor(metrics.score)}`}>
                                {metrics.score}%
                            </span>
                        ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center border-l border-slate-200">
                        {metrics.deducted !== null && metrics.deducted > 0 ? (
                            <span className="text-rose-600 font-bold">-{metrics.deducted}%</span>
                        ) : (
                            metrics.deducted === 0 ? <span className="text-emerald-500 font-bold">0%</span> : <span className="text-slate-300">-</span>
                        )}
                    </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionTable;
