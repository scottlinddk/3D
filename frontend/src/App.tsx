import { Routes, Route } from "react-router-dom";
import { GradientBackground } from "@/components/GradientBackground";
import { NavBar } from "@/components/NavBar";
import { UploadPage } from "@/pages/UploadPage";
import { CalibrationPage } from "@/pages/CalibrationPage";
import { EditorPage } from "@/pages/EditorPage";
import { ExportPage } from "@/pages/ExportPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SharePage } from "@/pages/SharePage";

export default function App() {
  return (
    <>
      <GradientBackground />
      <NavBar />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/calibrate/:token" element={<CalibrationPage />} />
        <Route path="/edit/:token" element={<EditorPage />} />
        <Route path="/export/:token" element={<ExportPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/share" element={<SharePage />} />
      </Routes>
    </>
  );
}
