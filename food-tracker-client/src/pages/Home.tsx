import { useState } from "react";
import { Button, Spinner, useDisclosure } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import { useHomeData } from "../hooks/useHomeData";

// Импортируем наши новые компоненты
import HeaderCard from "../components/home/HeaderCard";
import MacrosCard from "../components/home/MacrosCard";
import TrackerWidget from "../components/home/TrackerWidget";
import FoodList from "../components/home/FoodList";
import EditFoodModal from "../components/home/EditFoodModal";
import DisciplineWidget from "../components/home/home/DisciplineWidget";

export default function Home() {
  const navigate = useNavigate();
  const { data, loading, water, weight, updateWater, updateWeight, refresh } = useHomeData();

  // Состояние модалки
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState(null);

  const openEdit = (item: any) => {
    setSelectedItem(item);
    onOpen();
  };

  if (loading || !data) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-white pb-28">

      {/* 1. Шапка */}
      <HeaderCard data={data} />

      {/* НОВЫЙ ВИДЖЕТ */}
      <DisciplineWidget />

      {/* 2. БЖУ */}
      <MacrosCard current={data.current} goals={data.goals} />

      {/* 3. Вода */}
      <TrackerWidget
        title="Вода 💧"
        value={water} unit="мл" goal="Цель: 2000 мл"
        color="primary"
        max={2000}
        onSubtract={() => updateWater(-100)}
        onAdd={() => updateWater(100)}
        stepLabel="+ 100 мл"
      />

      {/* 4. Вес (НОВЫЙ ВИДЖЕТ) */}
      <TrackerWidget
        title="Вес ⚖️"
        value={weight} unit="кг" goal={`Цель: ${data.user.weight - 5} кг`}
        color="secondary" // Фиолетовый
        onSubtract={() => updateWeight(-0.1)}
        onAdd={() => updateWeight(0.1)}
        stepLabel="+ 100 г"
        primaryAction="subtract" // <--- ДОБАВИЛИ ЭТУ СТРОКУ
      />

      {/* 5. Список Еды */}
      <FoodList logs={data.logs} onItemClick={openEdit} />

      {/* 6. FAB (Кнопка добавления) */}
      {/* НИЖНЯЯ ПАНЕЛЬ С КНОПКАМИ */}
      <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-between items-end z-50 pointer-events-none">

        {/* Кнопка AI (Слева) */}
        <Button
          className="pointer-events-auto bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-xl shadow-purple-500/40 font-bold h-14 rounded-2xl px-6 min-w-0"
          onPress={() => navigate('/ai-coach')}
        >
          ✨ AI Коуч
        </Button>

        {/* Кнопка ПЛЮС (Справа) */}
        <Button
          size="lg"
          color="primary"
          className="pointer-events-auto rounded-full w-16 h-16 shadow-2xl shadow-blue-600/50 text-3xl pb-1"
          onPress={() => navigate('/scanner')}
        >
          +
        </Button>
      </div>

      {/* 7. Модалка редактирования */}
      <EditFoodModal
        isOpen={isOpen}
        onClose={onOpenChange}
        item={selectedItem}
        onRefresh={refresh}
      />

    </div>
  );
}