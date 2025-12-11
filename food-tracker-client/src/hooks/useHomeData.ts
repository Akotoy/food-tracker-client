import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import WebApp from '@twa-dev/sdk';

export interface Stats {
    user: { first_name: string; avatar_seed?: string; weight: number };
    goals: { calories: number; protein: number; fats: number; carbs: number };
    current: { calories: number; protein: number; fats: number; carbs: number };
    water: number;
    streak: number;
    logs: any[];
}

export function useHomeData() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Stats | null>(null);
    const [water, setWater] = useState(0);
    const [weight, setWeight] = useState(0);

    const fetchData = async () => {
        try {
            const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
            const userId = localUser.telegram_id || localUser.id;
            if (!userId) { navigate('/'); return; }

            const response = await api.get(`/api/daily-stats?telegram_id=${userId}`);
            setData(response.data);
            setWater(response.data.water);
            setWeight(response.data.user.weight);
        } catch (error) {
            console.error("Load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Обновление воды
    const updateWater = async (amount: number) => {
        try { WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
        const newVal = Math.max(0, water + amount);
        setWater(newVal);
        if (newVal >= 2000 && water < 2000) try { WebApp.HapticFeedback.notificationOccurred('success'); } catch (e) {}
        
        try {
            const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
            await api.post('/api/water', { user_id: localUser.telegram_id || localUser.id, amount });
        } catch (e) { setWater(water); }
    };

    // Обновление веса
    const updateWeight = async (amount: number) => {
        try { WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
        const newVal = Math.round((weight + amount) * 10) / 10;
        setWeight(newVal);
        
        try {
            const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
            await api.post('/api/weight', { user_id: localUser.telegram_id || localUser.id, amount });
        } catch (e) { setWeight(weight); }
    };

    return { 
        data, loading, water, weight, 
        updateWater, updateWeight, refresh: fetchData 
    };
}