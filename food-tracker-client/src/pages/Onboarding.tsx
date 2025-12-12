import { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody, Select, SelectItem, Spinner } from "@nextui-org/react";
import api from '../api'; 
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk'; // <-- Важная штука для связи с Телегой

const GENDER_OPTIONS = [
  { key: "male", label: "Мужской" },
  { key: "female", label: "Женский" },
];

const ACTIVITY_OPTIONS = [
  { key: "sedentary", label: "Сидячий (Офис)" },
  { key: "light", label: "Легкий (1-3 трен/нед)" },
  { key: "moderate", label: "Средний (3-5 трен/нед)" },
  { key: "active", label: "Высокий (6-7 трен/нед)" },
];

const GOAL_OPTIONS = [
    { key: "loss", label: "📉 Похудение" },
    { key: "maintenance", label: "⚖️ Поддержание веса" },
    { key: "gain", label: "💪 Набор мышечной массы" },
    { key: "detox", label: "🥗 ЗОЖ / Детокс" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // Состояние проверки входа
  
  const [formData, setFormData] = useState({
    telegram_id: 0, // Пока 0, заменим на реальный
    first_name: "",
    username: "",
    birth_date: "",
    gender: "male",
    weight: 70,
    height: 175,
    activity_level: "sedentary",
    target_goal: "loss", 
    target_weight: 65,   
  });

  // 1. ПРИ ЗАГРУЗКЕ: Узнаем, кто открыл приложение
  useEffect(() => {
    const initAuth = async () => {
        // Проверяем, запущены ли мы внутри Телеграма
        if (WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
            const user = WebApp.initDataUnsafe.user;
            console.log("👤 Telegram User:", user);

            // Обновляем форму реальными данными
            setFormData(prev => ({
                ...prev,
                telegram_id: user.id,
                first_name: user.first_name || "",
                username: user.username || "",
            }));

            // 2. Спрашиваем сервер: "Этот юзер уже есть в базе?"
            try {
                // Используем /daily-stats как проверку (если юзера нет, вернет ошибку)
                const res = await api.get(`/api/daily-stats?telegram_id=${user.id}`);
                
                if (res.data && res.data.user) {
                    console.log("✅ Юзер найден! Авто-вход.");
                    localStorage.setItem('user_data', JSON.stringify(res.data.user));
                    navigate('/home'); // СРАЗУ НА ГЛАВНУЮ
                    return; 
                }
            } catch (e) {
                console.log("🆕 Юзер не найден, показываем регистрацию.");
            }
        } else {
            console.log("⚠️ Приложение открыто не в Telegram (или локально)");
            // Для тестов на компе оставим фейковый ID
            setFormData(prev => ({ ...prev, telegram_id: Date.now() }));
        }
        
        // Убираем спиннер загрузки
        setCheckingAuth(false);
    };

    initAuth();
  }, []);

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.birth_date) return alert("Заполни все поля!");

    setLoading(true);
    try {
      const response = await api.post('/api/sync-user', { userData: formData });
      console.log("Успех!", response.data);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      navigate('/home'); 
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || error.message;
      alert(`Ошибка: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Пока проверяем юзера - показываем красивую загрузку
  if (checkingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-blue-50">
              <Spinner size="lg" label="Ищем тебя в базе..." color="primary" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Привет, {formData.first_name}! 👋</h1>
        <p className="text-gray-500 text-center mb-6">Давай настроим твой план питания.</p>

        <Card className="shadow-xl border border-blue-100">
          <CardBody className="gap-4 p-6">
            <Input label="Имя" value={formData.first_name} onValueChange={(v) => setFormData({...formData, first_name: v})} variant="bordered" />
            <Input type="date" label="Дата рождения" placeholder=" " value={formData.birth_date} onValueChange={(v) => setFormData({...formData, birth_date: v})} variant="bordered" />
            
            <Select label="Пол" selectedKeys={[formData.gender]} onChange={(e) => setFormData({...formData, gender: e.target.value})} variant="bordered">
              {GENDER_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </Select>

            <div className="flex gap-2">
               <Input type="number" label="Вес (кг)" value={String(formData.weight)} onValueChange={(v) => setFormData({...formData, weight: Number(v)})} variant="bordered" />
               <Input type="number" label="Рост (см)" value={String(formData.height)} onValueChange={(v) => setFormData({...formData, height: Number(v)})} variant="bordered" />
            </div>

            <Select label="Активность" selectedKeys={[formData.activity_level]} onChange={(e) => setFormData({...formData, activity_level: e.target.value})} variant="bordered">
                {ACTIVITY_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </Select>

            <div className="border-t border-gray-100 my-2"></div>
            
            <Select label="Моя Цель" color="primary" selectedKeys={[formData.target_goal]} onChange={(e) => setFormData({...formData, target_goal: e.target.value})} variant="bordered">
                {GOAL_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </Select>

            <Input type="number" label="Желаемый вес (кг)" color="primary" value={String(formData.target_weight)} onValueChange={(v) => setFormData({...formData, target_weight: Number(v)})} variant="bordered" />

            <Button color="primary" size="lg" className="mt-2 font-bold shadow-lg" isLoading={loading} onPress={handleSubmit}>
              Погнали! 🚀
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}