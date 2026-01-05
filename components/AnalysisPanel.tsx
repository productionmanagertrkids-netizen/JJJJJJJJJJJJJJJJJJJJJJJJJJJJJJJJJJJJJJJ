
import React, { useState } from 'react';
import { Sparkles, BarChart3, Zap, Loader2, Lightbulb, Check, MessageCircle, TrendingUp, Package, Clock } from 'lucide-react';
import { ProductionJob, AnalysisResult } from '../types';
import { analyzeProductionData } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalysisPanelProps {
  data: ProductionJob[];
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ data }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!data || data.length === 0) return null;

  const timeToMinutes = (t: string) => {
    if (!t || t === '-' || !t.includes(':')) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateJobMetrics = (job: ProductionJob) => {
    const planStart = timeToMinutes(job.planStart);
    let planFinish = timeToMinutes(job.planFinish);
    let actualFinish = timeToMinutes(job.actualFinish);
    if (planStart === null || planFinish === null || actualFinish === null) return { delay: 0, score: null };
    if (planFinish < planStart) planFinish += 1440;
    if (actualFinish < planStart && (planStart - actualFinish) > 720) actualFinish += 1440;
    const planDuration = planFinish - planStart;
    const delayMinutes = Math.max(0, actualFinish - planFinish);
    const isOnTime = actualFinish <= planFinish;
    if (isOnTime) return { delay: 0, score: 100 };
    const totalUsed = planDuration + delayMinutes;
    return { delay: delayMinutes, score: Math.round((planDuration / (totalUsed || 1)) * 100) };
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
    let totalScore = 0; let count = 0;
    data.forEach(job => {
        const m = calculateJobMetrics(job);
        if (m.score !== null) { totalScore += m.score; count++; }
    });
    return count > 0 ? Math.round(totalScore / count) : 100;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeProductionData(data);
      setAnalysis(result);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleCopyToLine = () => {
    const totalQty = data.reduce((sum, item) => sum + item.quantity, 0);
    const completed = data.filter(item => item.status.includes('เสร็จ')).length;
    const avgScore = calculateAvgScore();
    const now = new Date().toLocaleString('th-TH');
    const delayedJobs = data.map(j => ({ ...j, m: calculateJobMetrics(j) })).filter(j => j.m.delay > 0);
    let text = `📊 *Production Report Analysis*\n📅 ${now}\n🏭 Dept: ${isSingleProcess ? data[0].process : 'All Areas'}\n\n`;
    text += `✅ Completed: ${completed}/${data.length}\n🔢 Total Volume: ${totalQty.toLocaleString()}\n⏱️ Efficiency: ${avgScore}%\n`;
    if (delayedJobs.length > 0) text += `⚠️ Delays: ${delayedJobs.length} jobs detected.\n`;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Total Volume', val: data.reduce((s, i) => s+i.quantity, 0).toLocaleString(), icon: Package, color: 'indigo' },
           { label: 'Efficiency Score', val: `${calculateAvgScore()}%`, icon: TrendingUp, color: 'emerald' },
           { label: 'Active Jobs', val: data.length, icon: BarChart3, color: 'amber' },
           { label: 'Avg Latency', val: `${Math.round(data.reduce((s, j) => s + calculateJobMetrics(j).delay, 0) / (data.length || 1))} min`, icon: Clock, color: 'rose' }
         ].map((card, idx) => (
           <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{card.val}</p>
              </div>
              <div className={`bg-${card.color}-50 p-3 rounded-xl`}>
                <card.icon className={`text-${card.color}-600`} size={24} />
              </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <BarChart3 className="text-indigo-600" size={24} />
                ปริมาณงาน {isSingleProcess ? `(แผนก ${processData[0].name})` : 'เปรียบเทียบทุกแผนก'}
              </h3>
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#1E293B" fontSize={13} width={100} tickLine={false} axisLine={false} fontWeight={800} />
                  <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantity" radius={[0, 8, 8, 0]} barSize={32}>
                     {processData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#0F172A] rounded-3xl p-8 shadow-2xl text-white flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-500/30">
                  <Sparkles size={12} /> AI Intelligence Center
                </div>
                <h3 className="text-2xl font-black mb-2 tracking-tight">Generate Insights</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">ใช้ขุมพลังของ Gemini AI ในการวิเคราะห์ข้อมูลเชิงลึกและค้นหาสิ่งที่ควรปรับปรุง</p>

                <div className="space-y-4">
                   <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full bg-white text-[#0F172A] hover:bg-slate-100 py-4 rounded-2xl font-black shadow-lg transition-all flex justify-center items-center gap-3 disabled:opacity-50 active:scale-95 text-lg"
                   >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      {loading ? 'Analyzing Data...' : 'เริ่มการวิเคราะห์ AI'}
                   </button>
                   <button
                      onClick={handleCopyToLine}
                      className="w-full bg-[#06C755] hover:bg-[#05B34C] text-white py-4 rounded-2xl font-black shadow-lg transition-all flex justify-center items-center gap-3 active:scale-95 text-lg"
                   >
                      {copied ? <Check size={20} /> : <MessageCircle size={20} />}
                      {copied ? 'คัดลอกข้อมูลแล้ว!' : 'คัดลอกส่งต่อรายงาน'}
                   </button>
                </div>
            </div>
            
            <div className="relative z-10 pt-10 text-center">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic opacity-50">Deep Insight • Performance Analysis • AI Prediction</p>
            </div>
        </div>
      </div>

      {analysis && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 h-2"></div>
            <div className="p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                   <div className="flex items-center gap-6">
                      <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 shadow-sm">
                          <Sparkles className="text-indigo-600 w-8 h-8" />
                      </div>
                      <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">รายงานการวิเคราะห์อัจฉริยะ</h2>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                             <p className="text-slate-500 font-bold text-sm tracking-wide">Analysis generated by Gemini-3 Flash Preview</p>
                          </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3 uppercase tracking-wider">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                  <Zap size={18} className="text-amber-600" />
                                </div>
                                Executive Summary
                            </h3>
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-slate-700 leading-relaxed text-base font-medium">
                                {analysis.summary}
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3 uppercase tracking-wider">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <TrendingUp size={18} className="text-emerald-600" />
                                </div>
                                Production Efficiency
                            </h3>
                            <div className="bg-emerald-50/30 p-8 rounded-3xl border border-emerald-100 text-slate-700 leading-relaxed text-base font-medium">
                                {analysis.efficiency}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                       <div className="bg-[#0F172A] p-8 rounded-3xl shadow-xl h-full border border-slate-800">
                          <h3 className="text-lg font-black text-indigo-400 mb-8 flex items-center gap-3 uppercase tracking-widest">
                              <Lightbulb size={20} className="text-indigo-500" />
                              Key Recommendations
                          </h3>
                          <ul className="space-y-6">
                              {analysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex gap-5 group items-start">
                                  <div className="shrink-0 mt-1">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-black">
                                          0{idx + 1}
                                      </div>
                                  </div>
                                  <p className="text-slate-300 text-sm leading-relaxed font-medium group-hover:text-white transition-colors">{rec}</p>
                              </li>
                              ))}
                          </ul>
                       </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
