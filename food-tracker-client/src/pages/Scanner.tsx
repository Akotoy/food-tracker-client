import { useState, useRef, useMemo, useEffect } from 'react';
import { Button, Card, CardBody, Textarea, Chip, Select, SelectItem } from "@nextui-org/react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import WebApp from '@twa-dev/sdk';

// Функция для цветов оценки
const getGradeColor = (grade: string) => {
    switch (grade) {
        case 'A': return "bg-green-500 text-white shadow-green-200";
        case 'B': return "bg-yellow-400 text-white shadow-yellow-200";
        case 'C': return "bg-orange-400 text-white shadow-orange-200";
        case 'D': return "bg-red-500 text-white shadow-red-200";
        default: return "bg-gray-400 text-white";
    }
};

export default function Scanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState("");
  
  const [aiResult, setAiResult] = useState<any>(null); 
  const [editedWeight, setEditedWeight] = useState<number>(0);

  // Варианты веса
  const weightOptions = useMemo(() => {
    if (!aiResult) return [];
    const base = aiResult.weight_g || 100;
    const options = [base - 100, base - 50, base, base + 50, base + 100];
    return [...new Set(options.filter(w => w > 0))];
  }, [aiResult]);

  // Пересчет КБЖУ
  const currentStats = useMemo(() => {
    if (!aiResult || !editedWeight) return null;
    const ratio = editedWeight / (aiResult.weight_g || 100);
    return {
      calories: Math.round(aiResult.calories * ratio),
      protein: Math.round(aiResult.protein * ratio),
      fats: Math.round(aiResult.fats * ratio),
      carbs: Math.round(aiResult.carbs * ratio),
    };
  }, [aiResult, editedWeight]);

  // Сохранение (для Main Button)
  const saveFood = async () => {
    try {
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}

      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const foodToSave = {
        name: aiResult.name,
        ...currentStats,
        weight_g: editedWeight,
        grade: aiResult.grade // <-- Сохраняем оценку
      };
      
      await axios.post('/api/log-food', {
        user_id: userData.telegram_id || userData.id,
        food: foodToSave
      });

      navigate('/home'); 
    } catch (error) {
      try { WebApp.HapticFeedback.notificationOccurred('error'); } catch(e) {}
      alert("Не удалось сохранить :(");
    }
  };

  // Управление кнопкой Telegram
  useEffect(() => {
    if (aiResult && currentStats) {
        WebApp.MainButton.setText(`СОХРАНИТЬ (${currentStats.calories} ККАЛ)`);
        WebApp.MainButton.show();
        WebApp.MainButton.onClick(saveFood);
    } else {
        WebApp.MainButton.hide();
    }
    return () => {
        WebApp.MainButton.hide();
        WebApp.MainButton.offClick(saveFood);
    };
  }, [aiResult, currentStats, editedWeight]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeFood = async () => {
    if (!image && !text) return alert("Добавь фото или описание!");
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e) {}
    
    setLoading(true);
    setAiResult(null);

    try {
      const response = await axios.post('/api/analyze-food', { imageBase64: image, textDescription: text });
      const data = response.data;
      setAiResult(data);
      setEditedWeight(data.weight_g || 100);
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
    } catch (error) {
      try { WebApp.HapticFeedback.notificationOccurred('error'); } catch(e) {}
      alert("Ошибка анализа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="mb-4">
        <Button size="sm" variant="light" onPress={() => navigate('/home')}>← Назад</Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Что кушаем? 📸</h1>

      {aiResult && currentStats ? (
        <div className="flex flex-col gap-4 animate-appearance-in">
          <Card className={`border-2 shadow-none ${aiResult.grade === 'D' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <CardBody className="gap-4">
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {/* ГРЕЙД БЕЙДЖ */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-md ${getGradeColor(aiResult.grade)}`}>
                            {aiResult.grade}
                        </div>
                        <h2 className="text-xl font-bold leading-tight">{aiResult.name}</h2>
                    </div>
                    <div className="bg-white/50 p-2 rounded-lg border border-black/5">
                        <p className="text-xs italic">💡 {aiResult.advice}</p>
                    </div>
                  </div>
                  <Chip color={aiResult.grade === 'D' ? "danger" : "primary"} size="lg" className="font-bold ml-2">
                    {currentStats.calories}
                  </Chip>
              </div>

              {/* ВЫБОР ВЕСА */}
              <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <Select 
                    label="Вес порции" 
                    selectedKeys={[String(editedWeight)]}
                    onChange={(e) => {
                        setEditedWeight(Number(e.target.value));
                        try { WebApp.HapticFeedback.selectionChanged(); } catch(e) {}
                    }}
                    variant="bordered"
                  >
                    {weightOptions.map((weight) => (
                      <SelectItem key={weight} value={weight} textValue={`${weight} г`}>
                        {weight} г {weight === aiResult.weight_g && "(AI)"}
                      </SelectItem>
                    ))}
                  </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                 <div className="bg-white p-2 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500">Белки</div>
                    <div className="font-bold text-lg">{currentStats.protein}г</div>
                 </div>
                 <div className="bg-white p-2 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500">Жиры</div>
                    <div className="font-bold text-lg">{currentStats.fats}г</div>
                 </div>
                 <div className="bg-white p-2 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500">Углев.</div>
                    <div className="font-bold text-lg">{currentStats.carbs}г</div>
                 </div>
              </div>
            </CardBody>
          </Card>

          <Button variant="flat" color="danger" onPress={() => { setAiResult(null); try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e) {} }}>
            Сбросить / Другое фото
          </Button>

          {/* Dev Button для браузера */}
          {!WebApp.initData && <Button color="success" className="mt-2" onPress={saveFood}>Сохранить (Dev)</Button>}
        </div>
      ) : (
        // ФОРМА ЗАГРУЗКИ
        <div className="flex flex-col gap-6">
           <div 
             className="border-2 border-dashed border-gray-300 rounded-2xl h-64 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
             onClick={() => { fileInputRef.current?.click(); try { WebApp.HapticFeedback.selectionChanged(); } catch(e) {} }}
           >
             {image ? <img src={image} alt="Preview" className="w-full h-full object-contain rounded-2xl" /> : <><span className="text-4xl mb-2">📷</span><span className="text-gray-400 font-medium">Нажми для фото</span></>}
             <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
           </div>

           <div className="text-center text-gray-400 font-medium">- ИЛИ -</div>

           <Textarea placeholder="Напиши текстом (напр. Яблоко)" value={text} onValueChange={setText} minRows={2} />

           <Button color="primary" size="lg" className="font-bold" isLoading={loading} onPress={analyzeFood}>Рассчитать ✨</Button>
        </div>
      )}
    </div>
  );
}