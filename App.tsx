
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, Layers, PieChart, Search, Filter } from 'lucide-react';
import { ProductionJob } from './types';
import FileUpload from './components/FileUpload';
import ProductionTable from './components/ProductionTable';
import AnalysisPanel from './components/AnalysisPanel';

const App: React.FC = () => {
  const [data, setData] = useState<ProductionJob[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedJobName, setSelectedJobName] = useState<string>('ALL');

  // Extract unique processes (Sheet names)
  const processes = useMemo(() => {
    const unique = new Set(data.map(d => d.process));
    return Array.from(unique);
  }, [data]);

  // Extract unique job names based on the active department tab
  const jobNamesForCurrentTab = useMemo(() => {
    const dataForJobs = activeTab === 'ALL' ? data : data.filter(d => d.process === activeTab);
    const unique = new Set(dataForJobs.map(d => d.jobName));
    return Array.from(unique).sort();
  }, [data, activeTab]);

  // Filter data based on BOTH active tab (Process) and selected job name
  const filteredData = useMemo(() => {
    let result = data;
    if (activeTab !== 'ALL') {
      result = result.filter(d => d.process === activeTab);
    }
    if (selectedJobName !== 'ALL') {
      result = result.filter(d => d.jobName === selectedJobName);
    }
    return result;
  }, [data, activeTab, selectedJobName]);

  // Reset job filter when department tab or data changes
  useEffect(() => {
    setSelectedJobName('ALL');
  }, [activeTab, data]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <LayoutDashboard className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-none">Smart Production Tracker</h1>
                <p className="text-xs text-slate-500 mt-1">ระบบติดตามการผลิตและวิเคราะห์ข้อมูลอัจครยะ</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Step 1: Upload */}
        <section>
          {data.length === 0 ? (
            <div className="max-w-2xl mx-auto mt-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">เริ่มต้นใช้งาน</h2>
                <p className="text-slate-500">อัปโหลดไฟล์ข้อมูลการผลิตของคุณเพื่อเริ่มการวิเคราะห์</p>
              </div>
              <FileUpload onDataLoaded={setData} />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="text-indigo-600" />
                  แดชบอร์ดข้อมูลการผลิต
                </h2>
                <button 
                  onClick={() => setData([])}
                  className="text-sm text-slate-500 hover:text-red-500 underline transition-colors"
                >
                  ล้างข้อมูล / อัปโหลดใหม่
                </button>
              </div>

              {/* Tabs Navigation */}
              <div className="border-b border-slate-200 mb-6 overflow-x-auto">
                <div className="flex space-x-2 pb-1">
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`
                      px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all border-b-2 
                      ${activeTab === 'ALL' 
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <PieChart size={16} />
                      ภาพรวมทั้งหมด ({data.length})
                    </span>
                  </button>
                  {processes.map((proc) => (
                    <button
                      key={proc}
                      onClick={() => setActiveTab(proc)}
                      className={`
                        px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all border-b-2 
                        ${activeTab === proc 
                          ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }
                      `}
                    >
                      {proc} <span className="ml-1 px-1.5 py-0.5 bg-slate-200 rounded-full text-xs text-slate-600">
                        {data.filter(d => d.process === proc).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Header Info Section (Process Name only) */}
              <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-slate-700 leading-tight">
                    {activeTab === 'ALL' ? 'ภาพรวมทุกแผนก' : `ข้อมูลแผนก: ${activeTab}`}
                  </h3>
                  <p className="text-sm text-slate-500">
                    แสดงข้อมูลจำนวน {filteredData.length} รายการ
                  </p>
                </div>
              </div>

              {/* Dynamic Content based on Filtered Data */}
              <div className="animate-in fade-in duration-300">
                {/* Analysis Panel receives Filtered Data */}
                <AnalysisPanel key={`${activeTab}-${selectedJobName}`} data={filteredData} />
                
                <div className="mt-8">
                   <ProductionTable 
                      data={filteredData} 
                      selectedJobName={selectedJobName}
                      onJobNameChange={setSelectedJobName}
                      availableJobNames={jobNamesForCurrentTab}
                   />
                </div>
              </div>
            </>
          )}
        </section>

      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© 2024 Smart Production Tracker. Powered by Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
