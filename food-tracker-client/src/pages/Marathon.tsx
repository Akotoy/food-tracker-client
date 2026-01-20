import { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody, Tabs, Tab, Progress, User, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@nextui-org/react";
import api from '../api';
import WebApp from '@twa-dev/sdk';
import { useNavigate } from 'react-router-dom';

// Типы
type Participant = {
    user: {
        first_name: string;
        last_name: string;
        avatar_url: string;
        weight: number;
        target_weight: number;
    };
    progress: number;
};

export default function Marathon() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false); // Заглушка, реально надо проверять на бэке
    const [token, setToken] = useState("");
    const [ladder, setLadder] = useState<Participant[]>([]);
    const [marathonId, setMarathonId] = useState<number | null>(null);

    // Эмуляция проверки участия
    useEffect(() => {
        // Тут по-хорошему надо бы дернуть API чтобы узнать участвует ли юзер
        // API для этого пока нет в явном виде, но можно добавить или хранить в локалстораже
        const storedMarathon = localStorage.getItem('marathon_id');
        if (storedMarathon) {
            setJoined(true);
            setMarathonId(Number(storedMarathon));
            fetchLadder(Number(storedMarathon));
        }
    }, []);

    const fetchLadder = async (id: number) => {
        try {
            const { data } = await api.get(`/api/marathon/${id}/ladder`);
            setLadder(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleJoin = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user_data') || '{}');
            const { data } = await api.post('/api/marathon/join', {
                telegram_id: user.telegram_id,
                token,
                current_weight: user.weight
            });

            setJoined(true);
            setMarathonId(data.marathon.id);
            localStorage.setItem('marathon_id', String(data.marathon.id));
            fetchLadder(data.marathon.id);
            WebApp.HapticFeedback.notificationOccurred('success');
        } catch (e: any) {
            alert(e.response?.data?.error || "Ошибка входа");
            WebApp.HapticFeedback.notificationOccurred('error');
        } finally {
            setLoading(false);
        }
    };

    if (!joined) {
        return (
            <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 text-white">
                <Card className="w-full max-w-sm">
                    <CardBody className="gap-6 p-8 text-center">
                        <div>
                            <h1 className="text-2xl font-bold text-black">Марафон 🏃‍♂️</h1>
                            <p className="text-gray-500">Введите код доступа, чтобы вступить в группу.</p>
                        </div>
                        <Input
                            placeholder="Код (например, LETO-2024)"
                            value={token}
                            onValueChange={setToken}
                            classNames={{ inputWrapper: "h-14" }}
                        />
                        <Button color="primary" size="lg" onPress={handleJoin} isLoading={loading} className="font-bold">
                            Вступить
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
                <h1 className="text-xl font-bold">Марафон 🏆</h1>
            </div>

            <div className="p-4">
                <Tabs aria-label="Marathon Options" className="mb-4">
                    <Tab key="ladder" title="Рейтинг">
                        <Card>
                            <CardBody>
                                <Table aria-label="Ladder">
                                    <TableHeader>
                                        <TableColumn>УЧАСТНИК</TableColumn>
                                        <TableColumn>ПРОГРЕСС</TableColumn>
                                    </TableHeader>
                                    <TableBody emptyContent="Нет участников">
                                        {ladder.map((p, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <User
                                                        name={`${p.user.first_name}`}
                                                        description={idx === 0 ? "Лидер 🔥" : `${idx + 1} место`}
                                                        avatarProps={{ src: p.user.avatar_url }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs">{p.progress.toFixed(1)}%</span>
                                                        <Progress size="sm" value={p.progress} color={idx < 3 ? "warning" : "primary"} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardBody>
                        </Card>
                    </Tab>
                    <Tab key="tasks" title="Анкета">
                        <Card>
                            <CardBody className="text-center py-10">
                                <p className="text-gray-500">Опросник будет доступен позже</p>
                                <Button className="mt-4" isDisabled>Пройти опрос</Button>
                            </CardBody>
                        </Card>
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
}
