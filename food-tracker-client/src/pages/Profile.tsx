import { useEffect, useState } from "react";
import { Button, Input, Card, CardBody, Avatar, Select, SelectItem } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Список животных для аватарок (DiceBear API)
const ANIMAL_SEEDS = ['bear', 'cat', 'dog', 'lion', 'panda', 'rabbit', 'fox', 'koala'];

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (localUser) setUserData(localUser);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Важно: передаем ID корректно
      const payload = {
         ...userData,
         // Если telegram_id нет, берем id (актуально для тестов в браузере)
         telegram_id: userData.telegram_id || userData.id 
      };

      const response = await axios.post('/api/sync-user', { userData: payload });
      
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      setUserData(response.data.user);
      alert("Сохранено! ✅");
    } catch (error) {
      console.error(error);
      alert("Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  // Функция для случайного аватара
  const randomizeAvatar = () => {
    const randomSeed = ANIMAL_SEEDS[Math.floor(Math.random() * ANIMAL_SEEDS.length)];
    setUserData({ ...userData, avatar_seed: randomSeed });
  };

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-6 pb-10 rounded-b-[2rem] shadow-sm flex flex-col items-center">
        <div className="w-full flex justify-between mb-4">
            <Button size="sm" variant="light" onPress={() => navigate('/home')}>← Назад</Button>
            <h2 className="font-bold text-lg">Настройки</h2>
            <div className="w-8"></div>
        </div>

        {/* АВАТАРКА */}
        <div className="relative group cursor-pointer" onClick={randomizeAvatar}>
            <Avatar 
              // Используем DiceBear "Fun Emoji" для минимализма
              src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${userData.avatar_seed || 'bear'}`} 
              className="w-28 h-28 text-large mb-3 border-4 border-blue-100 transition-transform group-hover:scale-105" 
            />
            <div className="absolute bottom-3 right-0 bg-blue-500 text-white rounded-full p-1 shadow-md">
                🔄
            </div>
        </div>
        <p className="text-xs text-gray-400 mb-2">Нажми, чтобы сменить</p>

        <h1 className="text-xl font-bold">{userData.first_name}</h1>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-4">
             {/* ДАТА РОЖДЕНИЯ */}
             <Input 
                label="Дата рождения" 
                type="date" 
                value={userData.birth_date ? userData.birth_date.split('T')[0] : ''} 
                onValueChange={(v) => setUserData({...userData, birth_date: v})}
                variant="faded"
             />

             <div className="flex gap-4">
                <Input 
                    label="Вес (кг)" type="number" 
                    value={String(userData.weight)} 
                    onValueChange={(v) => setUserData({...userData, weight: Number(v)})}
                />
                <Input 
                    label="Рост (см)" type="number" 
                    value={String(userData.height)} 
                    onValueChange={(v) => setUserData({...userData, height: Number(v)})}
                />
             </div>
             
             <Button color="primary" size="lg" className="font-bold mt-4" isLoading={loading} onPress={handleSave}>
                Сохранить изменения
             </Button>
        </div>
      </div>
    </div>
  );
}