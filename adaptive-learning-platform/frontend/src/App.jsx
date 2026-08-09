import { Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./lib/LanguageContext";
import Home from "./pages/Home";
import StudentQuiz from "./pages/StudentQuiz";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<StudentQuiz />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
      </Routes>
    </LanguageProvider>
  );
}
