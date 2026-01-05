
import { GoogleGenAI, Type } from "@google/genai";
import { ProductionJob, AnalysisResult } from "../types";

// ใน Production จริงบนเครื่องคอมพิวเตอร์ (Vite) จะใช้ import.meta.env.VITE_API_KEY
// ในที่นี้เราจะตรวจสอบทั้งสองทางเพื่อให้รันได้ทุกที่
const API_KEY = (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeProductionData = async (jobs: ProductionJob[]): Promise<AnalysisResult> => {
  try {
    const prompt = `
      Analyze the following production data (in JSON format). 
      The data comes from multiple sheets in an Excel file. 
      The field "process" indicates the Sheet Name (e.g., STAMP, STK, LASER).
      
      Data: ${JSON.stringify(jobs)}

      Please provide a response in THAI language (ภาษาไทย) structured as JSON.
      
      IMPORTANT: In your analysis, please explicitly mention specific processes (Sheet names) when relevant.
      For example, "แผนก STAMP มีงานล่าช้า..." or "แผนก LASER ทำงานได้ตามแผน...".

      Fields required:
      1. "summary": An executive summary. Provide a breakdown or mention notable statuses for EACH process/sheet found in the data if significant.
      2. "efficiency": Comments on the efficiency (Plan vs Actual time comparison). Compare performance between different processes if possible.
      3. "recommendations": An array of strings suggesting improvements. Group recommendations by process if applicable.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            efficiency: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Error analyzing data:", error);
    return {
      summary: "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้",
      efficiency: "N/A",
      recommendations: ["ตรวจสอบ API Key ในไฟล์ .env หรือลองใหม่อีกครั้ง"]
    };
  }
};
