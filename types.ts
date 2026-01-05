
export interface ProductionJob {
  id: number;           // ลำดับ
  jobName: string;      // ชื่อใบงาน (e.g., SPTR-161268-R5)
  cutTime: string;      // เวลาตัด
  quantity: number;     // จำนวน
  line: string;         // ไลน์
  process: string;      // แผนก/กระบวนการ (มาจากชื่อ Sheet เช่น STAMP, LASER)
  status: string;       // สถานะ
  planStart: string;    // แผนเริ่ม
  planFinish: string;   // แผนเสร็จ
  actualStart: string;  // เริ่มจริง
  actualFinish: string; // เสร็จจริง
  date: string;         // วันที่ (YYYY-MM-DD)
}

export interface AnalysisResult {
  summary: string;
  efficiency: string;
  recommendations: string[];
}
