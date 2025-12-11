import { Routes, Route } from "react-router-dom";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Scanner from "./pages/Scanner"; // <-- Импорт
import Profile from "./pages/Profile"; // <-- Импорт
import Achievements from "./pages/Achievements";
import AiCoach from "./pages/AiCoach";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/home" element={<Home />} />
      <Route path="/scanner" element={<Scanner />} /> {/* <-- Маршрут */}
      <Route path="/profile" element={<Profile />} />
      <Route path="/achievements" element={<Achievements />} />
      <Route path="/ai-coach" element={<AiCoach />} />
    </Routes>
  );
}

export default App;