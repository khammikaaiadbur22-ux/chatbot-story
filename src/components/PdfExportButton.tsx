"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { StoryData } from "./StoryBlueprintPanel";

interface PdfExportButtonProps {
  storyData: StoryData;
  studentName: string;
  studentId: string;
}

export function PdfExportButton({ storyData, studentName, studentId }: PdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Create a temporary hidden container to render the PDF content
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.style.padding = "40px";
      container.style.background = "#fff";
      container.style.color = "#000";
      container.style.fontFamily = "Sarabun, sans-serif";
      
      const analysisContent = storyData.userProfile ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 18px; border-bottom: 2px solid #FF8C1A; padding-bottom: 5px;">การวิเคราะห์ความสนใจและความคิดสร้างสรรค์</h3>
          <p><strong>ความสนใจ:</strong> ${storyData.userProfile.interests?.join(", ") || "-"}</p>
          <p><strong>งานอดิเรก:</strong> ${storyData.userProfile.hobbies?.join(", ") || "-"}</p>
          <p><strong>ลักษณะนิสัย:</strong> ${storyData.userProfile.personality_traits?.join(", ") || "-"}</p>
          <p><strong>จินตนาการ/ไอเดีย:</strong> ${storyData.userProfile.imagination?.join(", ") || "-"}</p>
        </div>
      ` : "";

      container.innerHTML = `
        <div id="pdf-content" style="padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; color: #FF8C1A; margin: 0;">นิทานของ ${studentName}</h1>
            <p style="font-size: 16px; color: #666;">รหัสนักเรียน: ${studentId}</p>
          </div>
          
          ${analysisContent}
          
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 18px; border-bottom: 2px solid #FF8C1A; padding-bottom: 5px;">${storyData.title || "นิทานของฉัน"}</h3>
            <p style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${storyData.fullStory || "-"}</p>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #FFF9EE; border-radius: 10px;">
            <h4 style="margin: 0 0 10px 0; color: #FF8C1A;">ข้อคิดสอนใจ (Moral Lesson)</h4>
            <p style="margin: 0; font-size: 14px;">${storyData.moralLesson || "-"}</p>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // We need to wait for fonts to load if any, but Sarabun should be standard or loaded.
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`story_${studentName}_${studentId}.pdf`);

      document.body.removeChild(container);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportPdf}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-[#FF8C1A] hover:bg-[#E6780C] text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
    >
      {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      <span>{isExporting ? "กำลังสร้าง PDF..." : "บันทึก PDF"}</span>
    </button>
  );
}
