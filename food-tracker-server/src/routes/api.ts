import { Router } from 'express';
import { supabase, openai } from '../config/clients';
import { calculateAge, calculateStreak, SYSTEM_PROMPT } from '../utils/common';
import { checkOverlimit } from '../utils/notifications'; 

const router = Router();

// Настройка модели (используем стабильную gpt-4o)
const AI_MODEL = "gpt-4o"; 


// 1. ПРОФИЛЬ (БЕЗОПАСНАЯ ВЕРСИЯ)
router.post('/sync-user', async (req, res) => {
    try {
        const { userData } = req.body;
        
        // ВАЖНО: Удаляем поле 'id' из userData, чтобы не ломать UUID в базе
        // Мы используем деструктуризацию: id уходит в никуда, остальное в cleanData
        const { id, ...cleanData } = userData; 

        // Если telegram_id не пришел, пробуем взять его из id (для обратной совместимости), иначе ошибка
        const telegramId = cleanData.telegram_id || id;
        
        if (!telegramId) return res.status(400).json({ error: "No telegram_id provided" });

        let age = cleanData.age || 25;
        if (cleanData.birth_date) age = calculateAge(cleanData.birth_date);
        
        // Расчет BMR
        let bmr = cleanData.gender === 'male' 
            ? 88.36 + (13.4 * cleanData.weight) + (4.8 * cleanData.height) - (5.7 * age)
            : 447.6 + (9.2 * cleanData.weight) + (3.1 * cleanData.height) - (4.3 * age);
        
        let goalMultiplier = 1.0;
        if (cleanData.target_goal === 'loss') goalMultiplier = 0.85;
        if (cleanData.target_goal === 'gain') goalMultiplier = 1.15;
        
        const activityMultipliers: any = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
        const dailyCalories = Math.round(Math.round(bmr * (activityMultipliers[cleanData.activity_level] || 1.2)) * goalMultiplier);

        const { data, error } = await supabase.from('users').upsert({
            telegram_id: telegramId,
            ...cleanData, // Используем очищенные данные (без id)
            age,
            daily_calories_goal: dailyCalories,
            daily_protein_goal: Math.round((dailyCalories * 0.3) / 4),
            daily_fats_goal: Math.round((dailyCalories * 0.3) / 9),
            daily_carbs_goal: Math.round((dailyCalories * 0.4) / 4),
        }, { onConflict: 'telegram_id' })
        .select();

        if (error) throw error;
        res.json({ success: true, user: data[0] });
    } catch (e: any) { 
        console.error("Sync Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// 2. СТАТИСТИКА
router.get('/daily-stats', async (req, res) => {
    try {
        const telegram_id = Number(req.query.telegram_id);
        const { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
        if (!user) throw new Error("User not found");

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        const { data: foodLogs } = await supabase.from('food_logs').select('*').eq('user_id', telegram_id).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()).order('created_at', { ascending: false });
        const { data: waterLogs } = await supabase.from('water_logs').select('amount_ml').eq('user_id', telegram_id).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString());

        const waterTotal = waterLogs?.reduce((sum, item) => sum + item.amount_ml, 0) || 0;
        const current = foodLogs?.reduce((acc: any, item: any) => ({
            calories: acc.calories + (item.calories || 0), protein: acc.protein + (item.protein || 0), fats: acc.fats + (item.fats || 0), carbs: acc.carbs + (item.carbs || 0),
        }), { calories: 0, protein: 0, fats: 0, carbs: 0 });

        const streak = await calculateStreak(telegram_id);

        res.json({
            user,
            goals: { calories: user.daily_calories_goal, protein: user.daily_protein_goal, fats: user.daily_fats_goal, carbs: user.daily_carbs_goal },
            current, water: Math.max(0, waterTotal), streak, logs: foodLogs
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 3. ВОДА
router.post('/water', async (req, res) => {
    const { user_id, amount } = req.body;
    await supabase.from('water_logs').insert({ user_id, amount_ml: amount });
    res.json({ success: true });
});

// 4. ВЕС (Один раз в день)
router.post('/weight', async (req, res) => {
    const { user_id, amount } = req.body;
    try {
        const { data: user } = await supabase.from('users').select('weight').eq('telegram_id', user_id).single();
        const newWeight = Math.round((user.weight + amount) * 10) / 10;
        await supabase.from('users').update({ weight: newWeight }).eq('telegram_id', user_id);
        
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const { data: existingLog } = await supabase.from('weight_logs').select('id').eq('user_id', user_id).gte('created_at', todayStart.toISOString()).limit(1).single();
        
        if (existingLog) await supabase.from('weight_logs').update({ weight: newWeight }).eq('id', existingLog.id);
        else await supabase.from('weight_logs').insert({ user_id, weight: newWeight });
        
        res.json({ success: true, newWeight });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 5. ГРАФИКИ
router.get('/charts-data', async (req, res) => {
    const telegram_id = Number(req.query.telegram_id);
    const { data: weightData } = await supabase.from('weight_logs').select('created_at, weight').eq('user_id', telegram_id).order('created_at', { ascending: true }).limit(100);
    const { data: waterData } = await supabase.from('water_logs').select('created_at, amount_ml').eq('user_id', telegram_id).order('created_at', { ascending: true });
    const waterGrouped: any = {};
    waterData?.forEach((item: any) => { const date = item.created_at.split('T')[0]; waterGrouped[date] = (waterGrouped[date] || 0) + item.amount_ml; });
    res.json({ weight: weightData?.map((w: any) => ({ date: w.created_at.split('T')[0], value: w.weight })), water: Object.keys(waterGrouped).map(date => ({ date, value: waterGrouped[date] })) });
});

// 6. AI СКАНЕР
router.post('/analyze-food', async (req, res) => {
    const { imageBase64, textDescription } = req.body;
    try {
        const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
        if (imageBase64) messages.push({ role: "user", content: [{ type: "text", text: "Analyze image" }, { type: "image_url", image_url: { url: imageBase64 } }] });
        else messages.push({ role: "user", content: textDescription });
        const completion = await openai.chat.completions.create({ model: AI_MODEL, messages, response_format: { type: "json_object" } });
        res.json(JSON.parse(completion.choices[0].message.content || '{}'));
    } catch (e) { res.status(500).json({ error: "AI Error" }); }
});

// 7. СОХРАНЕНИЕ ЕДЫ (С проверкой перебора)
router.post('/log-food', async (req, res) => {
    try {
        const { user_id, food } = req.body;
        const { data, error } = await supabase.from('food_logs').insert({ user_id, name: food.name, calories: food.calories, protein: food.protein, fats: food.fats, carbs: food.carbs, grade: food.grade, is_image_recognized: true }).select();
        if (error) throw error;
        
        checkOverlimit(user_id, food.calories); // Уведомление

        res.json({ success: true, data });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 8. УДАЛЕНИЕ И РЕДАКТИРОВАНИЕ
router.delete('/log-food/:id', async (req, res) => { 
    await supabase.from('food_logs').delete().eq('id', req.params.id); 
    res.json({ success: true }); 
});

router.put('/log-food/:id', async (req, res) => { 
    const { name, calories, protein, fats, carbs, weight_g } = req.body; 
    await supabase.from('food_logs').update({ name, calories, protein, fats, carbs, weight_g }).eq('id', req.params.id); 
    res.json({ success: true }); 
});

// 9. AI ЧАТ
router.post('/ai-chat', async (req, res) => {
    const { user_id, message, history } = req.body;
    try {
        const { data: user } = await supabase.from('users').select('*').eq('telegram_id', user_id).single();
        const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const { data: recentLogs } = await supabase.from('food_logs').select('name, calories, grade, created_at').eq('user_id', user_id).gte('created_at', threeDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(20);
        
        const foodContext = recentLogs?.map(l => `- ${l.name} (${l.calories}kcal, Grade: ${l.grade})`).join('\n') || "User hasn't logged food recently.";
        
        const systemPrompt = `You are a friendly AI Nutritionist. User: ${user.first_name}, Goal: ${user.target_goal}. Recent Food: ${foodContext}. Answer in Russian.`;

        const completion = await openai.chat.completions.create({
            model: AI_MODEL, 
            messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }] as any
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 10. ИСТОРИЯ ДНЯ
router.get('/history-day', async (req, res) => {
    try {
        const telegram_id = Number(req.query.telegram_id);
        const dateStr = String(req.query.date);
        const { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
        const dayStart = new Date(dateStr); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(dateStr); dayEnd.setHours(23,59,59,999);
        const { data: logs } = await supabase.from('food_logs').select('*').eq('user_id', telegram_id).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
        const totals = logs?.reduce((acc: any, item: any) => ({ calories: acc.calories + (item.calories || 0), protein: acc.protein + (item.protein || 0), fats: acc.fats + (item.fats || 0), carbs: acc.carbs + (item.carbs || 0), }), { calories: 0, protein: 0, fats: 0, carbs: 0 });
        res.json({ totals, goals: { calories: user.daily_calories_goal, protein: user.daily_protein_goal, fats: user.daily_fats_goal, carbs: user.daily_carbs_goal } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;