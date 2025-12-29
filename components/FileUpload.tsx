import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { ProductionJob } from '../types';
import { read, utils } from 'xlsx';

interface FileUploadProps {
  onDataLoaded: (data: ProductionJob[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error("File appears empty or invalid");

      // Skip header
      const parsedData: ProductionJob[] = lines.slice(1).map((line, index) => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        return {
          id: parseInt(cols[0]) || index + 1,
          jobName: cols[1] || "Unknown",
          cutTime: cols[2] || "-",
          quantity: parseInt(cols[3]) || 0,
          line: cols[4] || "Line 1",
          process: "Imported CSV", // Default for CSV
          status: cols[5] || "Pending",
          planStart: cols[6] || "-",
          planFinish: cols[7] || "-",
          actualStart: cols[8] || "-",
          actualFinish: cols[9] || "-"
        };
      });

      onDataLoaded(parsedData);
      setError(null);
    } catch (err) {
      setError("รูปแบบไฟล์ CSV ไม่ถูกต้อง กรุณาตรวจสอบข้อมูล");
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        
        let allJobs: ProductionJob[] = [];
        let autoIdCounter = 1;

        // Iterate through ALL sheets in the workbook
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert sheet to json array
            const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1, raw: false });
            
            // Skip empty sheets or sheets with only header
            if (!rows || rows.length < 2) return;

            // Skip header row (slice 1) and map data
            const sheetJobs = rows.slice(1).map((row) => {
                // Determine ID: use value from file if present, else use auto-increment counter
                const idVal = row[0] ? parseInt(String(row[0])) : autoIdCounter;
                if (!row[0]) autoIdCounter++;

                return {
                    id: idVal,
                    jobName: row[1] ? String(row[1]) : "Unknown",
                    cutTime: row[2] ? String(row[2]) : "-",
                    quantity: row[3] ? parseInt(String(row[3])) : 0,
                    line: row[4] ? String(row[4]) : "Line 1",
                    process: sheetName.trim(), // Capture and clean the Sheet Name
                    status: row[5] ? String(row[5]) : "Pending",
                    planStart: row[6] ? String(row[6]) : "-",
                    planFinish: row[7] ? String(row[7]) : "-",
                    actualStart: row[8] ? String(row[8]) : "-",
                    actualFinish: row[9] ? String(row[9]) : "-"
                };
            });
            
            allJobs = [...allJobs, ...sheetJobs];
        });

        if (allJobs.length === 0) {
            throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์ หรือไฟล์ว่างเปล่า");
        }

        onDataLoaded(allJobs);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parseExcel(file);
    } else {
        setError("รองรับเฉพาะไฟล์ .csv หรือ .xlsx เท่านั้น");
    }
  };

  const loadSampleData = () => {
    const sample = [
      // STAMP
      {
        id: 1,
        jobName: "SPTR-161268-R5",
        cutTime: "16:31",
        quantity: 50,
        line: "Line 1",
        process: "STAMP",
        status: "เสร็จแล้ว @ 16:44",
        planStart: "16:31",
        planFinish: "16:44",
        actualStart: "16:31",
        actualFinish: "16:44"
      },
      // STK
      {
        id: 2,
        jobName: "STK-9901-X",
        cutTime: "08:00",
        quantity: 120,
        line: "Line A",
        process: "STK",
        status: "กำลังผลิต",
        planStart: "08:00",
        planFinish: "10:00",
        actualStart: "08:05",
        actualFinish: "-"
      },
      // CTT
      {
        id: 3,
        jobName: "CTT-5541-B",
        cutTime: "09:30",
        quantity: 200,
        line: "Line 2",
        process: "CTT",
        status: "รอวัตถุดิบ",
        planStart: "09:30",
        planFinish: "11:30",
        actualStart: "-",
        actualFinish: "-"
      },
      // LASER
      {
        id: 4,
        jobName: "EXT-99201-A1",
        cutTime: "13:00",
        quantity: 45,
        line: "Line 2",
        process: "LASER",
        status: "รอคิว",
        planStart: "13:00",
        planFinish: "15:00",
        actualStart: "-",
        actualFinish: "-"
      },
      // TUBE
      {
        id: 5,
        jobName: "TB-8812-P",
        cutTime: "10:15",
        quantity: 80,
        line: "Line 3",
        process: "TUBE",
        status: "เครื่องจักรขัดข้อง",
        planStart: "10:15",
        planFinish: "12:00",
        actualStart: "10:20",
        actualFinish: "-"
      },
      // PACK
      {
        id: 6,
        jobName: "PKG-2201",
        cutTime: "15:00",
        quantity: 500,
        line: "Line 1",
        process: "PACK",
        status: "กำลังผลิต",
        planStart: "15:00",
        planFinish: "18:00",
        actualStart: "15:10",
        actualFinish: "-"
      }
    ];
    onDataLoaded(sample);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 hover:bg-slate-50 transition-colors">
        <FileSpreadsheet className="w-12 h-12 text-indigo-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">นำเข้าข้อมูลการผลิต</h3>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
          รองรับไฟล์ Excel (.xlsx) ที่มีหลาย Sheet (เช่น STAMP, STK, CTT, LASER, TUBE, PACK)<br/>
          ระบบจะอ่านข้อมูลจากทุก Sheet และแยกประเภทให้อัตโนมัติ
        </p>
        
        <div className="flex gap-4">
          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all">
            <Upload size={18} />
            <span>อัปโหลด Excel / CSV</span>
            <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                className="hidden" 
                onChange={handleFileUpload} 
            />
          </label>
          <button 
            onClick={loadSampleData}
            className="text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-6 py-2 rounded-lg transition-all"
          >
            ใช้ข้อมูลตัวอย่าง
          </button>
        </div>
        
        {error && (
          <div className="mt-4 text-red-500 flex items-center gap-2 text-sm bg-red-50 px-4 py-2 rounded-md">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;