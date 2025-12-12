import { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody, Select, SelectItem, Spinner } from "@nextui-org/react";
import api from '../api'; 
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

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
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [formData, setFormData] = useState({
    telegram_id: 0,
    first_name: "",
    username: "",
    birth_date: "",
    gender: "male",
    weight: 0,
    height: 0,
    activity_level: "sedentary",
    target_goal: "loss", 
    target_weight: 0,   
  });

  // 1. ПРИ ЗАГРУЗКЕ: Проверка пользователя
  useEffect(() => {
    const initAuth = async () => {
        // Проверяем, в Телеграме ли мы
        if (WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
            const tgUser = WebApp.initDataUnsafe.user;
            console.log("👤 Telegram User:", tgUser);

            // Сразу заполняем базовые данные из Телеграма
            setFormData(prev => ({
                ...prev,
                telegram_id: tgUser.id,
                first_name: tgUser.first_name || "",
                username: tgUser.username || "",
            }));

            // Спрашиваем сервер: "Знаешь этого парня?"
            try {
                // Используем daily-stats как способ получить профиль
                const res = await api.get(`/api/daily-stats?telegram_id=${tgUser.id}`);
                
                if (res.data && res.data.user) {
                    const dbUser = res.data.user;
                    
                    // 🔥 ГЛАВНАЯ ПРОВЕРКА:
                    // Пускаем внутрь только если Вес, Рост и Дата Рождения заполнены
                    if (dbUser.weight > 0 && dbUser.height > 0 && dbUser.birth_date) {
                        console.log("✅ Анкета полная. Авто-вход.");
                        localStorage.setItem('user_data', JSON.stringify(dbUser));
                        navigate('/home');
                        return;
                    } else {
                        console.log("📝 Юзер есть, но анкета не полная. Режим редактирования.");
                        // Подставляем то, что уже есть в базе, чтобы не вводить заново
                        setFormData(prev => ({
                            ...prev,
                            ...dbUser, // Перезаписываем поля данными из базы
                            telegram_id: tgUser.id // На всякий случай держим актуальный ID
                        }));
                    }
                }
            } catch (e) {
                console.log("🆕 Юзер не найден, показываем чистую анкету.");
            }
        } else {
            console.log("⚠️ Запуск вне Telegram (Dev Mode)");
            setFormData(prev => ({ ...prev, telegram_id: Date.now() }));
        }
        
        setCheckingAuth(false);
    };

    initAuth();
  }, []);

  const handleSubmit = async () => {
    // Простая валидация
    if (!formData.first_name || !formData.birth_date || !formData.weight || !formData.height) {
        return alert("Пожалуйста, заполни все поля (Дата, Вес, Рост)!");
    }

    setLoading(true);
    try {
      // Отправляем на сервер
      const response = await api.post('/api/sync-user', { userData: formData });
      
      console.log("Успех!", response.data);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      
      // Идем домой
      navigate('/home'); 

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || error.message;
      alert(`Ошибка сохранения: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-blue-50">
              <Spinner size="lg" label="Синхронизация..." color="primary" />
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
            <Input 
                label="Имя" 
                value={formData.first_name} 
                onValueChange={(v) => setFormData({...formData, first_name: v})} 
                variant="bordered" 
            />
            <Input 
                type="date" 
                label="Дата рождения" 
                placeholder=" " 
                value={formData.birth_date} 
                onValueChange={(v) => setFormData({...formData, birth_date: v})} 
                variant="bordered" 
            />
            
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