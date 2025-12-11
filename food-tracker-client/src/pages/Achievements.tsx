import { Button, Card, CardBody, Progress } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api";
import WebApp from '@twa-dev/sdk';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Label } from 'recharts';

export default function Achievements() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);
  const [chartData, setChartData] = useState<any>({ weight: [], water: [] });
  
  // Состояние для карусели дней
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayStats, setDayStats] = useState<any>(null);

  // Загрузка общих данных
  useEffect(() => {
    const fetchData = async () => {
        const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
        const id = localUser.telegram_id || localUser.id;
        const resStats = await api.get(`/api/daily-stats?telegram_id=${id}`);
        setStreak(resStats.data.streak);
        const resCharts = await api.get(`/api/charts-data?telegram_id=${id}`);
        setChartData(resCharts.data);
    };
    fetchData();
  }, []);

  // Загрузка данных конкретного дня при смене даты
  useEffect(() => {
      const fetchDayData = async () => {
          const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
          const id = localUser.telegram_id || localUser.id;
          
          // Формат YYYY-MM-DD для запроса (без учета часового пояса, просто локальный стринг)
          const dateStr = selectedDate.toISOString().split('T')[0];
          
          const res = await api.get(`/api/history-day?telegram_id=${id}&date=${dateStr}`);
          setDayStats(res.data);
      };
      fetchDayData();
  }, [selectedDate]);

  // Навигация по дням
  const changeDate = (days: number) => {
      try { WebApp.HapticFeedback.selectionChanged(); } catch(e) {}
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + days);
      setSelectedDate(newDate);
  };

  // Данные для круговой диаграммы
  const pieData = dayStats ? [
      { name: 'Съедено', value: dayStats.totals.calories, color: '#3b82f6' }, // Синий
      { name: 'Остаток', value: Math.max(0, dayStats.goals.calories - dayStats.totals.calories), color: '#e5e7eb' } // Серый
  ] : [];

  return (
    <div className="min-h-screen bg-white p-4 pb-10">
      <Button size="sm" variant="light" onPress={() => navigate('/home')}>← Назад</Button>
      <h1 className="text-2xl font-bold mt-2 mb-6">Достижения 🎖️</h1>

      {/* --- КАРУСЕЛЬ ДНЕЙ И ДИАГРАММА --- */}
      <Card className="bg-white border border-gray-100 shadow-sm mb-8">
          <CardBody>
              {/* Переключатель дней */}
              <div className="flex justify-between items-center mb-4">
                  <Button isIconOnly size="sm" variant="light" onPress={() => changeDate(-1)}>◀</Button>
                  <div className="text-center">
                      <div className="font-bold text-lg">{selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
                      <div className="text-xs text-gray-400">{selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}</div>
                  </div>
                  <Button isIconOnly size="sm" variant="light" onPress={() => changeDate(1)} isDisabled={selectedDate.toDateString() === new Date().toDateString()}>▶</Button>
              </div>

              {/* Круговая диаграмма */}
              {dayStats && (
                  <div className="h-64 relative flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={pieData}
                                  cx="50%" cy="50%"
                                  innerRadius={60} outerRadius={80}
                                  dataKey="value"
                                  startAngle={90} endAngle={-270}
                                  stroke="none"
                              >
                                  {pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                  {/* Текст в центре */}
                                  <Label 
                                      value={`${dayStats.totals.calories}`} 
                                      position="center" 
                                      dy={-10}
                                      className="text-3xl font-bold fill-gray-800"
                                      style={{ fontSize: '24px', fontWeight: 'bold' }}
                                  />
                                  <Label 
                                      value={`из ${dayStats.goals.calories}`} 
                                      position="center" 
                                      dy={15}
                                      className="text-xs fill-gray-400"
                                      style={{ fontSize: '12px' }}
                                  />
                              </Pie>
                          </PieChart>
                      </ResponsiveContainer>
                      
                      {/* БЖУ под кругом */}
                      <div className="absolute bottom-0 w-full flex justify-around text-xs text-gray-500">
                          <div className="text-center"><span className="block font-bold text-blue-500 text-lg">{dayStats.totals.protein}</span>Белки</div>
                          <div className="text-center"><span className="block font-bold text-orange-500 text-lg">{dayStats.totals.fats}</span>Жиры</div>
                          <div className="text-center"><span className="block font-bold text-green-500 text-lg">{dayStats.totals.carbs}</span>Угли</div>
                      </div>
                  </div>
              )}
          </CardBody>
      </Card>

      {/* АЧИВКИ (Старый код) */}
      <h3 className="font-bold text-gray-700 mb-2">Серия</h3>
      <div className="flex flex-col gap-4 mb-8">
         <Card className="border-2 border-yellow-400 bg-yellow-50 shadow-none">
            <CardBody className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-yellow-200">🔥</div>
                <div className="flex-1">
                    <div className="flex justify-between mb-1">
                        <h4 className="font-bold text-yellow-900">Огненная серия</h4>
                        <span className="text-xs font-bold text-yellow-600">{streak} дн.</span>
                    </div>
                    <Progress value={Math.min((streak / 7) * 100, 100)} color="warning" className="h-2" />
                    <p className="text-xs text-gray-400 mt-1">До следующей награды: {Math.max(0, 7 - streak)} дн.</p>
                </div>
            </CardBody>
         </Card>
      </div>

      <h3 className="font-bold text-lg mb-4">Динамика веса</h3>
      <div className="h-64 w-full bg-gray-50 rounded-xl p-2 border border-gray-100 mb-8">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.weight}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={3} dot={{r:4}} />
            </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}