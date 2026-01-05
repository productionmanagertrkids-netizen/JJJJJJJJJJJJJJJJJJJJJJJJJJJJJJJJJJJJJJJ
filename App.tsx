
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, Settings, Layers, PieChart, Calendar, ChevronDown, Inbox, Trash2, PlusCircle, Bell } from 'lucide-react';
import { ProductionJob } from './types';
import FileUpload from './components/FileUpload';
import ProductionTable from './components/ProductionTable';
import AnalysisPanel from './components/AnalysisPanel';

const App: React.FC = () => {
  const [data, setData] = useState<ProductionJob[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedJobName, setSelectedJobName] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  const availableDates = useMemo(() => {
    const unique = new Set<string>(data.map(d => d.date));
    return Array.from(unique).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const processesForSelectedDate = useMemo(() => {
    const baseData = selectedDate === 'ALL' ? data : data.filter(d => d.date === selectedDate);
    const unique = new Set(baseData.map(d => d.process));
    return Array.from(unique).sort();
  }, [data, selectedDate]);

  useEffect(() => {
    if (activeTab !== 'ALL' && !processesForSelectedDate.includes(activeTab)) {
      setActiveTab('ALL');
    }
  }, [selectedDate, processesForSelectedDate, activeTab]);

  useEffect(() => {
    setSelectedJobName('ALL');
  }, [activeTab, selectedDate]);

  const jobNamesForCurrentTab = useMemo(() => {
    let base = data;
    if (selectedDate !== 'ALL') base = base.filter(d => d.date === selectedDate);
    if (activeTab !== 'ALL') base = base.filter(d => d.process === activeTab);
    const unique = new Set(base.map(d => d.jobName));
    return Array.from(unique).sort();
  }, [data, activeTab, selectedDate]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedDate !== 'ALL') result = result.filter(d => d.date === selectedDate);
    if (activeTab !== 'ALL') result = result.filter(d => d.process === activeTab);
    if (selectedJobName !== 'ALL') result = result.filter(d => d.jobName === selectedJobName);
    return result;
  }, [data, activeTab, selectedJobName, selectedDate]);

  const hasData = data.length > 0;
  const hasFilteredData = filteredData.length > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Sarabun']">
      {/* Formal Header */}
      <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500 p-2 rounded-lg shadow-inner">
                <LayoutDashboard className="text-white w-5 h-5" />
              </div>
              <div className="border-l border-slate-700 pl-4">
                <h1 className="text-lg font-bold tracking-tight">Production Flow AI</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Enterprise Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {hasData && (
                <div className="flex items-center gap-3 py-1.5 px-3 bg-slate-800/50 rounded-full border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-slate-300">
                    System Active: {selectedDate === 'ALL' ? 'Historical View' : selectedDate}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
                <button className="text-slate-400 hover:text-white transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <Settings size={20} />
                </button>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-slate-600">
                  AD
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar / Filters Area */}
      {hasData && (
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-40">
          <div className="max-w-[1600px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold pr-2">
                <Calendar size={16} />
                <span>ตัวกรองวันที่:</span>
              </div>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-4 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 cursor-pointer min-w-[160px]"
                >
                  <option value="ALL">เลือกทุกวันที่</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button 
                  onClick={() => setData([])}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-100"
                >
                  <Trash2 size={16} />
                  ล้างข้อมูล
                </button>
                <button 
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-md"
                >
                  <PlusCircle size={16} />
                  เพิ่มไฟล์ข้อมูล
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Area */}
      <main className="max-w-[1600px] w-full mx-auto px-6 py-8 flex-grow">
        {!hasData ? (
          <div className="max-w-3xl mx-auto py-12">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Data Integration</h2>
              <p className="text-slate-500 text-lg font-medium">เริ่มต้นโดยการนำเข้าไฟล์ข้อมูลการผลิตของคุณเพื่อทำการวิเคราะห์ด้วย AI</p>
            </div>
            <FileUpload onDataLoaded={(newData) => setData([...data, ...newData])} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Context Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all
                  ${activeTab === 'ALL' 
                    ? 'bg-[#0F172A] text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }
                `}
              >
                <PieChart size={16} />
                Overview
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'ALL' ? 'bg-indigo-500/20 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                  {selectedDate === 'ALL' ? data.length : data.filter(d => d.date === selectedDate).length}
                </span>
              </button>
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              {processesForSelectedDate.map((proc) => (
                <button
                  key={proc}
                  onClick={() => setActiveTab(proc)}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap
                    ${activeTab === proc 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }
                  `}
                >
                  {proc}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === proc ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {data.filter(d => d.process === proc && (selectedDate === 'ALL' || d.date === selectedDate)).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Content View */}
            <div className="animate-in fade-in duration-700 min-h-[600px]">
              {hasFilteredData ? (
                <div className="grid grid-cols-1 gap-8">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-12">
                      <AnalysisPanel key={`analysis-${activeTab}-${selectedDate}`} data={filteredData} />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <ProductionTable 
                      data={filteredData} 
                      selectedJobName={selectedJobName}
                      onJobNameChange={setSelectedJobName}
                      availableJobNames={jobNamesForCurrentTab}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-32 flex flex-col items-center justify-center text-center">
                  <div className="bg-slate-50 p-6 rounded-full mb-6 text-slate-300">
                    <Inbox size={64} strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">No records found for this view</h3>
                  <p className="text-slate-500 max-w-sm mt-3 text-base leading-relaxed">
                    ปรับเปลี่ยนเงื่อนไขการกรองหรือตรวจสอบไฟล์ต้นฉบับเพื่อให้แน่ใจว่ามีข้อมูลในวันที่และแผนกที่เลือก
                  </p>
                  <button 
                    onClick={() => { setActiveTab('ALL'); setSelectedDate('ALL'); }}
                    className="mt-8 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Reset Filter View
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-400 text-xs">PF</div>
             <p className="text-slate-500 text-xs font-medium">
               © 2024 Production Flow AI. Intelligent Operations Platform.
             </p>
          </div>
          <div className="flex gap-8 text-[10px] text-slate-400 uppercase tracking-widest font-black">
             <span className="hover:text-indigo-600 cursor-pointer transition-colors">Documentation</span>
             <span className="hover:text-indigo-600 cursor-pointer transition-colors">API Reference</span>
             <span className="hover:text-indigo-600 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
      
      {/* Hidden inputs for actions */}
      <input 
        id="file-input" 
        type="file" 
        multiple 
        className="hidden" 
        onChange={(e) => {
          // FileUpload component logic is triggered through this if needed
          // but usually handled within the component itself.
        }} 
      />
    </div>
  );
};

export default App;
