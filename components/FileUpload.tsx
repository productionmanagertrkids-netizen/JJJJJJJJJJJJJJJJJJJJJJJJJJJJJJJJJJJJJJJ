
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Files, Loader2, X, CheckCircle2 } from 'lucide-react';
import { ProductionJob } from '../types';
import { read, utils } from 'xlsx';

interface FileUploadProps {
  onDataLoaded: (data: ProductionJob[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const processFile = async (file: File): Promise<ProductionJob[]> => {
    const fileDate = new Date(file.lastModified).toISOString().split('T')[0];
    const fileName = file.name.toLowerCase();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let jobs: ProductionJob[] = [];
          if (fileName.endsWith('.csv')) {
            const text = e.target?.result as string;
            const lines = text.trim().split('\n');
            jobs = lines.slice(1).map((line, index) => {
              const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              return {
                id: parseInt(cols[0]) || index + 1,
                jobName: cols[1] || "Unknown",
                cutTime: cols[2] || "-",
                quantity: parseInt(cols[3]) || 0,
                line: cols[4] || "Line 1",
                process: "Imported CSV",
                status: cols[5] || "Pending",
                planStart: cols[6] || "-",
                planFinish: cols[7] || "-",
                actualStart: cols[8] || "-",
                actualFinish: cols[9] || "-",
                date: fileDate
              };
            });
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = read(data, { type: 'array' });
            let autoIdCounter = 1;

            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1, raw: false });
              if (!rows || rows.length < 2) return;
              const sheetJobs = rows.slice(1).map((row) => {
                const idVal = row[0] ? parseInt(String(row[0])) : autoIdCounter;
                if (!row[0]) autoIdCounter++;
                return {
                  id: idVal,
                  jobName: row[1] ? String(row[1]) : "Unknown",
                  cutTime: row[2] ? String(row[2]) : "-",
                  quantity: row[3] ? parseInt(String(row[3])) : 0,
                  line: row[4] ? String(row[4]) : "Line 1",
                  process: sheetName.trim(),
                  status: row[5] ? String(row[5]) : "Pending",
                  planStart: row[6] ? String(row[6]) : "-",
                  planFinish: row[7] ? String(row[7]) : "-",
                  actualStart: row[8] ? String(row[8]) : "-",
                  actualFinish: row[9] ? String(row[9]) : "-",
                  date: fileDate
                };
              });
              jobs = [...jobs, ...sheetJobs];
            });
          }
          resolve(jobs);
        } catch (err) { reject(err); }
      };
      if (fileName.endsWith('.csv')) reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    let allAggregatedJobs: ProductionJob[] = [];

    try {
      for (const file of pendingFiles) {
        const fileJobs = await processFile(file);
        allAggregatedJobs = [...allAggregatedJobs, ...fileJobs];
      }
      if (allAggregatedJobs.length === 0) throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์ที่เลือก");
      onDataLoaded(allAggregatedJobs);
      setPendingFiles([]);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการประมวลผลไฟล์ กรุณาตรวจสอบความถูกต้องของข้อมูล");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSampleData = () => {
    const today = new Date().toISOString().split('T')[0];
    const sample: ProductionJob[] = [
      { id: 1, jobName: "SPTR-161268-R5", cutTime: "16:31", quantity: 50, line: "Line 1", process: "STAMP", status: "เสร็จแล้ว @ 16:44", planStart: "16:31", planFinish: "16:44", actualStart: "16:31", actualFinish: "16:44", date: today },
      { id: 2, jobName: "STK-9901-X", cutTime: "08:00", quantity: 120, line: "Line A", process: "STK", status: "กำลังผลิต", planStart: "08:00", planFinish: "10:00", actualStart: "08:05", actualFinish: "-", date: today },
      { id: 3, jobName: "CTT-5541-B", cutTime: "09:30", quantity: 200, line: "Line 2", process: "CTT", status: "รอวัตถุดิบ", planStart: "09:30", planFinish: "11:30", actualStart: "-", actualFinish: "-", date: today },
    ];
    onDataLoaded(sample);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-12 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all duration-300 group">
        <div className="bg-indigo-100 p-5 rounded-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
          <Files className="w-10 h-10 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-3">นําเข้าแหล่งข้อมูล</h3>
        <p className="text-slate-500 text-base mb-10 text-center max-w-sm font-medium leading-relaxed">
          รองรับไฟล์ Excel (.xlsx) และ CSV คุณสามารถเลือกหลายไฟล์ได้พร้อมกันเพื่อรวบรวมข้อมูล
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <label className={`cursor-pointer bg-[#0F172A] hover:bg-slate-800 text-white px-8 py-3 rounded-2xl flex items-center gap-3 transition-all font-bold shadow-lg shadow-slate-200 active:scale-95 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={20} />
            <span>เลือกไฟล์จากเครื่อง</span>
            <input id="file-input" type="file" multiple accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileChange} disabled={isProcessing} />
          </label>
          <button 
            onClick={loadSampleData}
            className="text-slate-600 font-bold border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300 px-8 py-3 rounded-2xl transition-all active:scale-95"
          >
            ใช้ข้อมูลสาธิต
          </button>
        </div>
      </div>

      {pendingFiles.length > 0 && (
        <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4 px-2">
             <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
               <CheckCircle2 size={16} className="text-emerald-500" />
               รายการไฟล์ที่เลือก ({pendingFiles.length})
             </h4>
             <button onClick={() => setPendingFiles([])} className="text-rose-500 text-xs font-bold hover:underline">ยกเลิกทั้งหมด</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="text-emerald-500 shrink-0" size={18} />
                  <span className="text-sm font-bold text-slate-700 truncate">{f.name}</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUploadAll}
            disabled={isProcessing}
            className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
            {isProcessing ? 'กำลังประมวลผลข้อมูล...' : 'เริ่มนำเข้าข้อมูลทั้งหมด'}
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-6 text-rose-600 flex items-center gap-3 text-sm bg-rose-50 px-6 py-4 rounded-2xl border border-rose-100 font-bold">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
