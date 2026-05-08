import { Routes, Route } from "react-router-dom";
import { GradientBackground } from "@/components/GradientBackground";
import { NavBar } from "@/components/NavBar";
import { BackendConfigBanner } from "@/components/BackendConfigBanner";
import { UploadPage } from "@/pages/UploadPage";
import { CalibrationPage } from "@/pages/CalibrationPage";
import { EditorPage } from "@/pages/EditorPage";
import { ExportPage } from "@/pages/ExportPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SharePage } from "@/pages/SharePage";
import { LoginPage } from "@/pages/LoginPage";
import { AuthProvider } from "@/contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <GradientBackground />
      <NavBar />
      <BackendConfigBanner />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/calibrate/:token" element={<CalibrationPage />} />
        <Route path="/edit/:token" element={<EditorPage />} />
        <Route path="/export/:token" element={<ExportPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/share" element={<SharePage />} />
      </Routes>
    </AuthProvider>
  );
}
