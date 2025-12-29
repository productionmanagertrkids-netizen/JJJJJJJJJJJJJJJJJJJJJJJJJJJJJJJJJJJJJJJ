
import React, { useState } from 'react';
import { Sparkles, BarChart3, Zap, Loader2, Lightbulb, Copy, Check, MessageCircle } from 'lucide-react';
import { ProductionJob, AnalysisResult } from '../types';
import { analyzeProductionData } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface AnalysisPanelProps {
  data: ProductionJob[];
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (data.length === 0) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeProductionData(data);
    setAnalysis(result);
    setLoading(false);
  };

  const timeToMinutes = (t: string) => {
    if (!t || t === '-' || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateJobMetrics = (job: ProductionJob) => {
    const planStart = timeToMinutes(job.planStart);
    let planFinish = timeToMinutes(job.planFinish);
    let actualFinish = timeToMinutes(job.actualFinish);

    if (planStart === null || planFinish === null || actualFinish === null) {
      return { delay: 0, score: null, isOnTime: false };
    }

    if (planFinish < planStart) planFinish += 1440;
    if (actualFinish < planStart && (planStart - actualFinish) > 720) actualFinish += 1440;

    const planDuration = planFinish - planStart;
    const delayMinutes = Math.max(0, actualFinish - planFinish);
    const isOnTime = actualFinish <= planFinish;

    if (isOnTime) {
      return { delay: 0, score: 100, isOnTime: true };
    } else {
      const totalUsed = planDuration + delayMinutes;
      const score = Math.round((planDuration / (totalUsed || 1)) * 100);
      return { delay: delayMinutes, score: Math.max(0, score), isOnTime: false };
    }
  };

  const processData = data.reduce((acc, curr) => {
    const processName = curr.process || 'Unknown';
    const existing = acc.find(item => item.name === processName);
    if (existing) {
      existing.quantity += curr.quantity;
      existing.jobs += 1;
    } else {
      acc.push({ name: processName, quantity: curr.quantity, jobs: 1 });
    }
    return acc;
  }, [] as { name: string; quantity: number; jobs: number }[]);

  processData.sort((a, b) => b.quantity - a.quantity);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const isSingleProcess = processData.length === 1;

  const calculateAvgScore = () => {
    let totalScore = 0;
    let count = 0;
    data.forEach(job => {
        const m = calculateJobMetrics(job);
        if (m.score !== null) {
            totalScore += m.score;
            count++;
        }
    });
    return count > 0 ? Math.round(totalScore / count) : 100;
  };

  const handleCopyToLine = () => {
    const totalQty = data.reduce((sum, item) => sum + item.quantity, 0);
    const completed = data.filter(item => item.status.includes('เสร็จ')).length;
    const avgScore = calculateAvgScore();
    const now = new Date().toLocaleString('th-TH');

    // Filter only delayed jobs
    const delayedJobs = data.map(job => ({
      ...job,
      metrics: calculateJobMetrics(job)
    })).filter(j => j.metrics.delay > 0);

    let text = `📊 *สรุปข้อมูลการผลิต (Line Report)*\n`;
    text += `📅 วันที่: ${now}\n`;
    text += `🏭 แผนก: ${isSingleProcess ? data[0].process : 'ภาพรวมทั้งหมด'}\n\n`;
    text += `📦 ใบงานทั้งหมด: ${data.length} รายการ\n`;
    text += `✅ ผลิตเสร็จแล้ว: ${completed} รายการ\n`;
    text += `🔢 ยอดผลิตรวม: ${totalQty.toLocaleString()} Units\n`;
    text += `⏱️ คะแนนเวลาเฉลี่ย: ${avgScore}%\n`;
    text += `--------------------------\n`;
    text += `⚠️ *รายการที่ล่าช้า (${delayedJobs.length} ใบงาน):*\n`;
    
    if (delayedJobs.length === 0) {
      text += `✨ ยอดเยี่ยม! ไม่มีรายการล่าช้า\n`;
    } else {
      delayedJobs.forEach((job, index) => {
        text += `${index + 1}. ${job.jobName}\n`;
        text += `   - ล่าช้า: ${job.metrics.delay} นาที\n`;
        text += `   - คะแนน: ${job.metrics.score}%\n`;
      });
    }

    text += `--------------------------\n`;
    text += `🚀 วิเคราะห์โดย Smart Production AI`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-base font-bold text-slate-700 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" />
            {isSingleProcess 
              ? `ปริมาณงานของ ${processData[0].name}` 
              : 'เปรียบเทียบปริมาณงานแยกตามแผนก'}
          </h3>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={70} tickLine={false} axisLine={false} fontWeight={500} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={24}>
                   {processData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1e1b4b] p-8 rounded-2xl shadow-lg text-white flex flex-col justify-between items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

            <div className="relative z-10 w-full">
                <div className="flex justify-center mb-2">
                    <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <BarChart3 size={24} className="text-indigo-300" />
                    </div>
                </div>
                <h3 className="text-xl font-bold mb-8">สรุปข้อมูล {isSingleProcess ? 'แผนกนี้' : 'ภาพรวม'}</h3>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                        <p className="text-indigo-200 text-[10px] uppercase tracking-wider mb-1 font-medium">
                            {isSingleProcess ? 'จำนวนใบงาน' : 'จำนวนแผนก'}
                        </p>
                        <p className="text-3xl font-bold tracking-tight">
                            {isSingleProcess ? data.length : processData.length}
                        </p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                        <p className="text-indigo-200 text-[10px] uppercase tracking-wider mb-1 font-medium">ยอดรวมผลิต</p>
                        <p className="text-3xl font-bold tracking-tight">
                            {data.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="relative z-10 flex flex-col gap-3 w-full max-w-[200px]">
                {!analysis ? (
                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full bg-white text-[#1e1b4b] hover:bg-indigo-50 py-3 rounded-full font-bold shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 text-sm"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    วิเคราะห์อัจฉริยะ
                </button>
                ) : (
                    <div className="text-emerald-400 font-medium flex items-center justify-center gap-2 bg-white/10 py-2 rounded-full text-xs">
                        <Check size={14} /> วิเคราะห์เสร็จสิ้น
                    </div>
                )}

                <button
                    onClick={handleCopyToLine}
                    className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white py-3 rounded-full font-bold shadow-md transition-all flex justify-center items-center gap-2 transform hover:scale-105 active:scale-95 text-sm"
                >
                    {copied ? <Check size={18} /> : <MessageCircle size={18} />}
                    {copied ? 'คัดลอกแล้ว!' : '📋 สรุปส่ง Line'}
                </button>
            </div>
        </div>
      </div>

      {analysis && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                        <Sparkles className="text-indigo-600 w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            ผลการวิเคราะห์ AI 
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Smart Analysis for {isSingleProcess ? data[0].process : 'All Departments'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="prose prose-slate max-w-none">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Zap size={20} className="text-amber-500" fill="currentColor" fillOpacity={0.2} />
                                    บทสรุปผู้บริหาร
                                </h3>
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-slate-600 leading-relaxed text-sm">
                                    {analysis.summary}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-emerald-600" />
                                    ประสิทธิภาพการผลิต
                                </h3>
                                <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 text-slate-700 leading-relaxed text-sm">
                                    {analysis.efficiency}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-900 mb-5 flex items-center gap-2">
                            <Lightbulb size={20} className="text-indigo-600" fill="currentColor" fillOpacity={0.2} />
                            ข้อเสนอแนะ
                        </h3>
                        <ul className="space-y-4">
                            {analysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex gap-4 items-start group">
                                <div className="mt-0.5 min-w-[24px]">
                                    <div className="w-6 h-6 rounded-full bg-white text-indigo-600 shadow-sm border border-indigo-100 flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform">
                                        {idx + 1}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                            </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
