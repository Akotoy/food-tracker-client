import cron from 'node-cron';
import { supabase, bot } from '../config/clients';

// 1. 🚨 ПРОВЕРКА ПЕРЕБОРА (Вызывается сразу после еды)
export const checkOverlimit = async (userId: number, addedCalories: number) => {
    try {
        const { data: user } = await supabase.from('users').select('daily_calories_goal, first_name').eq('telegram_id', userId).single();
        if (!user) return;

        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

        const { data: logs } = await supabase
            .from('food_logs')
            .select('calories')
            .eq('user_id', userId)
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString());

        const totalCalories = logs?.reduce((sum, item) => sum + item.calories, 0) || 0;
        const previousTotal = totalCalories - addedCalories;

        // Если перешагнули черту именно сейчас
        if (previousTotal <= user.daily_calories_goal && totalCalories > user.daily_calories_goal) {
            const over = totalCalories - user.daily_calories_goal;
            try {
                await bot.telegram.sendMessage(userId, 
                    `🚨 <b>Лимит превышен!</b>\nЛишние: <b>${over} ккал</b>.\nНичего страшного, завтра скорректируем!`, 
                    { parse_mode: 'HTML' }
                );
            } catch (e) {}
        }
    } catch (e) { console.error("Notification Error:", e); }
};

// 2. 🔥 СПАСЕНИЕ СТРАЙКА (Cron)
const runStreakSaver = async () => {
    console.log("⏰ Cron: Проверка страйков...");
    const { data: users } = await supabase.from('users').select('telegram_id, first_name');
    if (!users) return;

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    for (const user of users) {
        const { count } = await supabase.from('food_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.telegram_id).gte('created_at', todayStart.toISOString());
        if (count === 0) {
            try {
                await bot.telegram.sendMessage(user.telegram_id, `🔥 <b>${user.first_name}, не теряй страйк!</b>\nВнеси хотя бы стакан воды!`);
            } catch (e) {}
        }
    }
};

// Функция запуска таймеров
export const setupCronJobs = () => {
    cron.schedule('0 18 * * *', runStreakSaver); // 18:00 UTC = 21:00 MSK
    console.log("✅ Cron Jobs запущены");
};