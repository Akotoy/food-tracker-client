import { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody, Select, SelectItem, Spinner, Checkbox, Avatar } from "@nextui-org/react";
import api from '../api';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

// Опции для селекторов
const GENDER_OPTIONS = [ { key: "male", label: "Мужской" }, { key: "female", label: "Женский" }];
const GOAL_OPTIONS = [
    { key: "nutrition_fix", label: "Наладить Рацион" },
    { key: "discipline", label: "Развить дисциплину" },
    { key: "muscle_gain", label: "Набрать мышечную массу" },
    { key: "energy_boost", label: "Повысить энергию" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(1); // Шаг анкеты

  const [formData, setFormData] = useState({
    telegram_id: 0,
    first_name: "",
    last_name: "",
    username: "",
    avatar_url: "",
    gender: "male",
    age: 30,
    height: 170,
    weight: 70,
    chest_cm: 0,
    waist_cm: 0,
    hips_cm: 0,
    target_weight: 65,
    secondary_goals: new Set([]),
    is_terms_accepted: false,
  });

  // Функция для обновления полей
  const updateField = (field: string, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 1. Проверка авторизации при загрузке
  useEffect(() => {
    const initAuth = async () => {
        if (WebApp.initDataUnsafe?.user) {
            const tgUser = WebApp.initDataUnsafe.user;
            setFormData(prev => ({
                ...prev,
                telegram_id: tgUser.id,
                first_name: tgUser.first_name || "",
                last_name: tgUser.last_name || "",
                username: tgUser.username || "",
                avatar_url: tgUser.photo_url || "",
            }));

            try {
                const res = await api.get(`/api/daily-stats?telegram_id=${tgUser.id}`);
                if (res.data?.user?.height > 0 && res.data?.user?.weight > 0) {
                    localStorage.setItem('user_data', JSON.stringify(res.data.user));
                    navigate('/home');
                    return;
                }
            } catch (e) { console.log("Новый пользователь, показываем анкету."); }

        } else { console.log("DEV MODE"); setFormData(prev => ({ ...prev, telegram_id: 12345 })); }
        setCheckingAuth(false);
    };
    initAuth();
  }, [navigate]);

  // 2. Отправка формы
  const handleSubmit = async () => {
    if (!formData.is_terms_accepted) {
        return alert("Пожалуйста, подтвердите согласие на обработку данных.");
    }
    setLoading(true);
    try {
      // Конвертируем Set в массив для отправки
      const payload = { ...formData, secondary_goals: Array.from(formData.secondary_goals) };
      const response = await api.post('/api/sync-user', { userData: payload });
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      navigate('/home');
    } catch (error: any) {
      alert(`Ошибка: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col justify-center">
      <Card className="max-w-md mx-auto w-full shadow-xl border">
        <CardBody className="gap-4 p-6">

          {/* ШАГ 1: Личные данные */}
          {step === 1 && (
            <>
              <div className="text-center">
                <Avatar src={formData.avatar_url} className="w-24 h-24 mx-auto mb-4" />
                <h1 className="font-bold text-xl">Личные данные</h1>
                <p className="text-sm text-gray-500 mb-4">Расскажите немного о себе</p>
              </div>
              <Input label="Имя" value={formData.first_name} onValueChange={(v) => updateField('first_name', v)} />
              <Input label="Фамилия" value={formData.last_name} onValueChange={(v) => updateField('last_name', v)} />
              <Select label="Пол" selectedKeys={[formData.gender]} onChange={(e) => updateField('gender', e.target.value)}>
                {GENDER_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </Select>
              <Input type="number" label="Возраст" value={String(formData.age)} onValueChange={(v) => updateField('age', v)} />
              <Button color="primary" size="lg" onPress={() => setStep(2)}>Далее →</Button>
            </>
          )}

          {/* ШАГ 2: Параметры тела */}
          {step === 2 && (
            <>
              <h1 className="font-bold text-xl text-center">Параметры тела</h1>
              <p className="text-sm text-gray-500 text-center mb-4">Эти данные нужны для расчета вашей нормы КБЖУ.</p>
              <Input type="number" label="Рост (см)" value={String(formData.height)} onValueChange={(v) => updateField('height', v)} />
              <Input type="number" label="Вес (кг)" value={String(formData.weight)} onValueChange={(v) => updateField('weight', v)} />
              <Input type="number" label="Обхват груди (см)" value={String(formData.chest_cm)} onValueChange={(v) => updateField('chest_cm', v)} />
              <Input type="number" label="Обхват талии (см)" value={String(formData.waist_cm)} onValueChange={(v) => updateField('waist_cm', v)} />
              <Input type="number" label="Обхват бедер (см)" value={String(formData.hips_cm)} onValueChange={(v) => updateField('hips_cm', v)} />
              <div className="flex gap-2 mt-2">
                 <Button variant="flat" onPress={() => setStep(1)}>← Назад</Button>
                 <Button color="primary" className="flex-1" onPress={() => setStep(3)}>Далее →</Button>
              </div>
            </>
          )}

          {/* ШАГ 3: Цели */}
          {step === 3 && (
            <>
              <h1 className="font-bold text-xl text-center">Ваши цели</h1>
              <p className="text-sm text-gray-500 text-center mb-4">К какому результату вы стремитесь?</p>
              <Input type="number" label="Желаемый вес (кг)" color="primary" value={String(formData.target_weight)} onValueChange={(v) => updateField('target_weight', v)} />
              <Select label="Второстепенные цели" selectionMode="multiple" placeholder="Выберите одну или несколько" selectedKeys={formData.secondary_goals} onSelectionChange={(keys) => updateField('secondary_goals', keys)}>
                {GOAL_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </Select>
              <Checkbox isSelected={formData.is_terms_accepted} onValueChange={(v) => updateField('is_terms_accepted', v)} className="mt-4">
                  Я согласен на <a href="#" className="text-blue-500">обработку персональных данных</a>
              </Checkbox>
              <div className="flex gap-2 mt-2">
                 <Button variant="flat" onPress={() => setStep(2)}>← Назад</Button>
                 <Button color="success" className="flex-1 font-bold" isLoading={loading} onPress={handleSubmit}>Завершить 🚀</Button>
              </div>
            </>
          )}

        </CardBody>
      </Card>
    </div>
  );
}