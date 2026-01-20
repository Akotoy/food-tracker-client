import { Card, CardBody, CircularProgress, Checkbox, CardHeader, Divider } from "@nextui-org/react";
import { useEffect, useState } from "react";
import api from "../../api";
import WebApp from '@twa-dev/sdk';

export default function DisciplineWidget() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        const id = WebApp.initDataUnsafe?.user?.id || JSON.parse(localStorage.getItem('user_data') || '{}').telegram_id;
        if (id) {
            setUserId(id);
            fetchIndex(id);
        }
    }, []);

    const fetchIndex = async (id: number) => {
        try {
            const response = await api.get(`/api/discipline-index?telegram_id=${id}`);
            setData(response.data);
        } catch (error) {
            console.error("Ошибка загрузки индекса", error);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkoutCheck = async (key: 'did_live_workout' | 'did_recorded_workout', value: boolean) => {
        if (!userId) return;
        const todayStr = new Date().toISOString().split('T')[0];
        try {
            await api.post('/api/daily-checkins', {
                telegram_id: userId,
                date: todayStr,
                [key]: value
            });
            fetchIndex(userId); // Обновляем данные после сохранения
        } catch (error) {
            console.error("Ошибка сохранения чекина", error);
        }
    };
    
    const colors: any = { green: "success", yellow: "warning", red: "danger" };

    return (
        <div className="px-6 mt-6">
            <Card>
                <CardHeader>
                    <h3 className="font-bold text-gray-700 text-lg">Индекс Дисциплины</h3>
                </CardHeader>
                <Divider />
                {loading ? <CardBody><p>Загрузка...</p></CardBody> : (
                    <CardBody>
                        <div className="flex gap-6 items-center">
                            <CircularProgress
                                classNames={{ value: "text-2xl font-bold" }}
                                size="lg"
                                value={data.index}
                                color={colors[data.level]}
                                showValueLabel
                            />
                            <div className="flex-1">
                                <p className="font-bold text-lg">{data.status_text}</p>
                                <p className="text-xs text-gray-500">Ваш показатель за сегодня</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                            <Checkbox isSelected={data.checklist.food_logged} isReadOnly color="success">Еда внесена</Checkbox>
                            <Checkbox isSelected={data.checklist.weight_logged} isReadOnly color="success">Вес отмечен</Checkbox>
                            <Checkbox isSelected={data.checklist.water_goal_met} isReadOnly color="success">Норма воды >80%</Checkbox>
                            <Checkbox 
                                isSelected={data.checklist.workout_done} 
                                onValueChange={(v) => handleWorkoutCheck('did_recorded_workout', v)}
                            >
                                Я сделал(а) тренировку
                            </Checkbox>
                        </div>
                    </CardBody>
                )}
            </Card>
        </div>
    );
}