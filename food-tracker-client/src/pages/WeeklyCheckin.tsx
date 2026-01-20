import { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/react";
import api from '../api';
import WebApp from '@twa-dev/sdk';
import { useNavigate } from 'react-router-dom';

const initialFormData = {
    weight: '', arm_l: '', arm_r: '', chest: '', waist: '', hips: '', leg_l: '', leg_r: ''
};

export default function WeeklyCheckin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [formData, setFormData] = useState(initialFormData);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        const telegramId = WebApp.initDataUnsafe?.user?.id || JSON.parse(localStorage.getItem('user_data') || '{}').telegram_id;
        if (telegramId) {
            setUserId(telegramId);
            fetchHistory(telegramId);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchHistory = async (id: number) => {
        try {
            const { data } = await api.get(`/api/measurements?telegram_id=${id}`);
            setHistory(data);
        } catch (error) {
            console.error("Ошибка загрузки истории", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!userId || !formData.weight) {
            return alert("Пожалуйста, укажите хотя бы ваш вес.");
        }
        setLoading(true);
        try {
            await api.post('/api/measurements', {
                user_id: userId,
                measurements: formData
            });
            setFormData(initialFormData); // Очищаем форму
            fetchHistory(userId); // Обновляем историю
            WebApp.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            alert("Ошибка сохранения");
        } finally {
            setLoading(false);
        }
    };

    const getDifference = (currentRow: any, prevRow: any, key: string) => {
        if (!prevRow) return <span className="text-gray-400">-</span>;
        const diff = (currentRow[key] || 0) - (prevRow[key] || 0);
        const diffFormatted = diff.toFixed(1);
        if (diff > 0) return <span className="text-red-500">+{diffFormatted}</span>;
        if (diff < 0) return <span className="text-green-500">{diffFormatted}</span>;
        return <span>0.0</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24">
            <Button size="sm" variant="light" onPress={() => navigate('/home')}>← Назад на главный</Button>
            <h1 className="text-2xl font-bold mt-2 mb-4">Еженедельный Check-in ✍️</h1>

            <Card className="mb-6">
                <CardBody className="gap-4">
                    <h2 className="font-bold text-lg">Новый замер</h2>
                    <div className="bg-blue-50 p-4 rounded-xl mb-6 text-sm text-blue-900">
                        <h3 className="font-bold mb-2">Правила точного замера 📏</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Взвешивание в <strong>ПОНЕДЕЛЬНИК</strong> утром 🗓️.</li>
                            <li>Сразу после пробуждения и туалета, <strong>ДО</strong> еды и воды 🥤.</li>
                            <li>На твердом ровном полу (не ковер!).</li>
                            <li>Минимум одежды (в белье).</li>
                            <li>Ленту держать параллельно полу.</li>
                        </ul>
                    </div>

                    <h2 className="font-bold text-lg">Новый замер</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Вес (кг)" type="number" placeholder="0.0" value={formData.weight} onValueChange={v => setFormData({ ...formData, weight: v })} isRequired />
                        <Input label="Грудь (см)" type="number" placeholder="0" value={formData.chest} onValueChange={v => setFormData({ ...formData, chest: v })} />

                        <Input label="Талия (см)" type="number" placeholder="Узкое место" value={formData.waist} onValueChange={v => setFormData({ ...formData, waist: v })} />
                        <Input label="Бедра (см)" type="number" placeholder="Широкая часть" value={formData.hips} onValueChange={v => setFormData({ ...formData, hips: v })} />

                        <Input label="Рука Лев. (см)" type="number" placeholder="Бицепс" value={formData.arm_l} onValueChange={v => setFormData({ ...formData, arm_l: v })} />
                        <Input label="Рука Прав. (см)" type="number" placeholder="Бицепс" value={formData.arm_r} onValueChange={v => setFormData({ ...formData, arm_r: v })} />

                        <Input label="Нога Лев. (см)" type="number" placeholder="Бедро" value={formData.leg_l} onValueChange={v => setFormData({ ...formData, leg_l: v })} />
                        <Input label="Нога Прав. (см)" type="number" placeholder="Бедро" value={formData.leg_r} onValueChange={v => setFormData({ ...formData, leg_r: v })} />
                    </div>
                    <Button color="primary" size="lg" onPress={handleSave} isLoading={loading}>Сохранить прогресс</Button>
                </CardBody>
            </Card>

            <Card>
                <CardBody>
                    <h2 className="font-bold text-lg mb-2">История замеров</h2>
                    {loading ? <Spinner /> : (
                        <Table aria-label="История замеров">
                            <TableHeader>
                                <TableColumn>ДАТА</TableColumn>
                                <TableColumn>ВЕС</TableColumn>
                                <TableColumn>РАЗН.</TableColumn>
                                <TableColumn>ТАЛИЯ</TableColumn>
                                <TableColumn>РАЗН.</TableColumn>
                            </TableHeader>
                            <TableBody emptyContent="Замеров пока нет">
                                {history.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>{item.weight || '-'}</TableCell>
                                        <TableCell>{getDifference(item, history[index - 1], 'weight')}</TableCell>
                                        <TableCell>{item.waist || '-'}</TableCell>
                                        <TableCell>{getDifference(item, history[index - 1], 'waist')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}