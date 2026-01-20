import { Router } from 'express';
import { supabase, openai } from '../config/clients';
import { calculateAge, calculateStreak, SYSTEM_PROMPT } from '../utils/common';
import { checkOverlimit } from '../utils/notifications';
const router = Router();
// Настройка модели (используем стабильную gpt-4o)
const AI_MODEL = "gpt-4o";
// 1. ПРОФИЛЬ И РЕГИСТРАЦИЯ
router.post('/sync-user', async (req, res) => {
    try {
        const { userData } = req.body;
        const telegramId = userData.telegram_id;
        if (!telegramId) {
            return res.status(400).json({ error: "No telegram_id provided" });
        }
        // Данные для сохранения в базу
        const dataToSave = {
            telegram_id: telegramId,
            first_name: userData.first_name,
            last_name: userData.last_name,
            username: userData.username,
            gender: userData.gender,
            age: Number(userData.age),
            height: Number(userData.height),
            weight: Number(userData.weight),
            chest_cm: Number(userData.chest_cm),
            waist_cm: Number(userData.waist_cm),
            hips_cm: Number(userData.hips_cm),
            target_weight: Number(userData.target_weight),
            secondary_goals: userData.secondary_goals, // это массив
            is_terms_accepted: userData.is_terms_accepted,
            avatar_url: userData.avatar_url,
            // Пока оставляем старые поля для обратной совместимости
            activity_level: userData.activity_level || 'sedentary',
            target_goal: userData.target_goal || 'loss'
        };
        // Расчет BMR, если есть все данные
        if (userData.weight && userData.height && userData.age && userData.gender) {
            const age = Number(userData.age);
            const weight = Number(userData.weight);
            const height = Number(userData.height);
            let bmr = userData.gender === 'male'
                ? 88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age)
                : 447.6 + (9.2 * weight) + (3.1 * height) - (4.3 * age);
            // Упрощенный расчет цели, т.к. детальных полей пока нет
            let goalMultiplier = 1.0;
            if (weight > Number(userData.target_weight))
                goalMultiplier = 0.85; // Если цель ниже текущего веса - худеем
            if (weight < Number(userData.target_weight))
                goalMultiplier = 1.15; // Если выше - набираем
            const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
            const dailyCalories = Math.round(bmr * (activityMultipliers[dataToSave.activity_level] || 1.2) * goalMultiplier);
            dataToSave.daily_calories_goal = dailyCalories;
            dataToSave.daily_protein_goal = Math.round((dailyCalories * 0.3) / 4);
            dataToSave.daily_fats_goal = Math.round((dailyCalories * 0.3) / 9);
            dataToSave.daily_carbs_goal = Math.round((dailyCalories * 0.4) / 4);
        }
        const { data, error } = await supabase.from('users')
            .upsert(dataToSave, { onConflict: 'telegram_id' })
            .select();
        if (error)
            throw error;
        res.json({ success: true, user: data[0] });
    }
    catch (e) {
        console.error("Sync Error:", e);
        res.status(500).json({ error: e.message });
    }
});
// 2. СТАТИСТИКА
router.get('/daily-stats', async (req, res) => {
    try {
        const telegram_id = Number(req.query.telegram_id);
        const { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
        if (!user)
            throw new Error("User not found");
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const { data: foodLogs } = await supabase.from('food_logs').select('*').eq('user_id', telegram_id).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()).order('created_at', { ascending: false });
        const { data: waterLogs } = await supabase.from('water_logs').select('amount_ml').eq('user_id', telegram_id).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString());
        const waterTotal = waterLogs?.reduce((sum, item) => sum + item.amount_ml, 0) || 0;
        const current = foodLogs?.reduce((acc, item) => ({
            calories: acc.calories + (item.calories || 0), protein: acc.protein + (item.protein || 0), fats: acc.fats + (item.fats || 0), carbs: acc.carbs + (item.carbs || 0),
        }), { calories: 0, protein: 0, fats: 0, carbs: 0 });
        const streak = await calculateStreak(telegram_id);
        res.json({
            user,
            goals: { calories: user.daily_calories_goal, protein: user.daily_protein_goal, fats: user.daily_fats_goal, carbs: user.daily_carbs_goal },
            current, water: Math.max(0, waterTotal), streak, logs: foodLogs
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: existingLog } = await supabase.from('weight_logs').select('id').eq('user_id', user_id).gte('created_at', todayStart.toISOString()).limit(1).single();
        if (existingLog)
            await supabase.from('weight_logs').update({ weight: newWeight }).eq('id', existingLog.id);
        else
            await supabase.from('weight_logs').insert({ user_id, weight: newWeight });
        res.json({ success: true, newWeight });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 5. ГРАФИКИ
router.get('/charts-data', async (req, res) => {
    const telegram_id = Number(req.query.telegram_id);
    const { data: weightData } = await supabase.from('weight_logs').select('created_at, weight').eq('user_id', telegram_id).order('created_at', { ascending: true }).limit(100);
    const { data: waterData } = await supabase.from('water_logs').select('created_at, amount_ml').eq('user_id', telegram_id).order('created_at', { ascending: true });
    const waterGrouped = {};
    waterData?.forEach((item) => { const date = item.created_at.split('T')[0]; waterGrouped[date] = (waterGrouped[date] || 0) + item.amount_ml; });
    res.json({ weight: weightData?.map((w) => ({ date: w.created_at.split('T')[0], value: w.weight })), water: Object.keys(waterGrouped).map(date => ({ date, value: waterGrouped[date] })) });
});
// 6. AI СКАНЕР
router.post('/analyze-food', async (req, res) => {
    const { imageBase64, textDescription } = req.body;
    try {
        const messages = [{ role: "system", content: SYSTEM_PROMPT }];
        if (imageBase64)
            messages.push({ role: "user", content: [{ type: "text", text: "Analyze image" }, { type: "image_url", image_url: { url: imageBase64 } }] });
        else
            messages.push({ role: "user", content: textDescription });
        const completion = await openai.chat.completions.create({ model: AI_MODEL, messages, response_format: { type: "json_object" } });
        res.json(JSON.parse(completion.choices[0].message.content || '{}'));
    }
    catch (e) {
        res.status(500).json({ error: "AI Error" });
    }
});
// 7. СОХРАНЕНИЕ ЕДЫ (С проверкой перебора)
router.post('/log-food', async (req, res) => {
    try {
        const { user_id, food } = req.body;
        const { data, error } = await supabase.from('food_logs').insert({ user_id, name: food.name, calories: food.calories, protein: food.protein, fats: food.fats, carbs: food.carbs, grade: food.grade, is_image_recognized: true }).select();
        if (error)
            throw error;
        checkOverlimit(user_id, food.calories); // Уведомление
        res.json({ success: true, data });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
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
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const { data: recentLogs } = await supabase.from('food_logs').select('name, calories, grade, created_at').eq('user_id', user_id).gte('created_at', threeDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(20);
        const foodContext = recentLogs?.map(l => `- ${l.name} (${l.calories}kcal, Grade: ${l.grade})`).join('\n') || "User hasn't logged food recently.";
        const systemPrompt = `You are a friendly AI Nutritionist. User: ${user.first_name}, Goal: ${user.target_goal}. Recent Food: ${foodContext}. Answer in Russian.`;
        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }]
        });
        res.json({ reply: completion.choices[0].message.content });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 10. ИСТОРИЯ ДНЯ
router.get('/history-day', async (req, res) => {
    try {
        const telegram_id = Number(req.query.telegram_id);
        const dateStr = String(req.query.date);
        const { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
        const dayStart = new Date(dateStr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateStr);
        dayEnd.setHours(23, 59, 59, 999);
        const { data: logs } = await supabase.from('food_logs').select('*').eq('user_id', telegram_id).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
        const totals = logs?.reduce((acc, item) => ({ calories: acc.calories + (item.calories || 0), protein: acc.protein + (item.protein || 0), fats: acc.fats + (item.fats || 0), carbs: acc.carbs + (item.carbs || 0), }), { calories: 0, protein: 0, fats: 0, carbs: 0 });
        res.json({ totals, goals: { calories: user.daily_calories_goal, protein: user.daily_protein_goal, fats: user.daily_fats_goal, carbs: user.daily_carbs_goal } });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/measurements', async (req, res) => {
    try {
        const { user_id, measurements } = req.body;
        // Добавляем user_id в объект с замерами
        const dataToInsert = { user_id, ...measurements };
        const { error } = await supabase.from('weekly_measurements').insert(dataToInsert);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/measurements', async (req, res) => {
    try {
        const telegram_id = Number(req.query.telegram_id);
        const { data, error } = await supabase
            .from('weekly_measurements')
            .select('*')
            .eq('user_id', telegram_id)
            .order('created_at', { ascending: true }); // Сортируем от старых к новым
        if (error)
            throw error;
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 12. ИНДЕКС ДИСЦИПЛИНЫ
router.get('/discipline-index', async (req, res) => {
    try {
        const telegram_id = Number(req.query.telegram_id);
        let index = 0;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStr = todayStart.toISOString().split('T')[0];
        // 1. Проверка еды (+40 баллов)
        const { count: foodCount } = await supabase.from('food_logs').select('*', { count: 'exact', head: true })
            .eq('user_id', telegram_id).gte('created_at', todayStart.toISOString());
        const food_logged = foodCount > 0;
        if (food_logged)
            index += 40;
        // 2. Проверка веса (+20 баллов)
        const { count: weightCount } = await supabase.from('weight_logs').select('*', { count: 'exact', head: true })
            .eq('user_id', telegram_id).gte('created_at', todayStart.toISOString());
        const weight_logged = weightCount > 0;
        if (weight_logged)
            index += 20;
        // 3. Проверка воды (+20 баллов)
        const { data: user } = await supabase.from('users').select('daily_water_goal').eq('telegram_id', telegram_id).single();
        const waterGoal = user?.daily_water_goal || 2000;
        const { data: waterLogs } = await supabase.from('water_logs').select('amount_ml')
            .eq('user_id', telegram_id).gte('created_at', todayStart.toISOString());
        const waterTotal = waterLogs?.reduce((sum, item) => sum + item.amount_ml, 0) || 0;
        const water_goal_met = waterTotal >= waterGoal * 0.8;
        if (water_goal_met)
            index += 20;
        // 4. Проверка тренировки (+20 баллов)
        const { data: checkin } = await supabase.from('daily_checkins').select('*')
            .eq('user_id', telegram_id).eq('date', todayStr).single();
        const workout_done = checkin?.did_live_workout || checkin?.did_recorded_workout;
        if (workout_done)
            index += 20;
        // Определяем уровень и статус
        let level = 'red';
        let status_text = 'Нужно взять себя в руки';
        if (index > 40) {
            level = 'yellow';
            status_text = 'Есть над чем поработать';
        }
        if (index > 80) {
            level = 'green';
            status_text = 'Отличный результат!';
        }
        res.json({
            index, level, status_text,
            checklist: { food_logged, weight_logged, water_goal_met, workout_done }
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/daily-checkins', async (req, res) => {
    try {
        const { telegram_id, date, did_live_workout, did_recorded_workout } = req.body;
        const { error } = await supabase.from('daily_checkins').upsert({ user_id: telegram_id, date, did_live_workout, did_recorded_workout }, { onConflict: 'user_id,date' });
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 13. МАРАФОНЫ
router.post('/marathon/join', async (req, res) => {
    try {
        const { telegram_id, token, current_weight } = req.body;
        // 1. Находим марафон по токену
        const { data: marathon } = await supabase.from('marathons').select('*').eq('access_token', token).single();
        if (!marathon)
            return res.status(404).json({ error: "Марафон с таким кодом не найден" });
        // 2. Добавляем участника
        const { error } = await supabase.from('marathon_participants').insert({
            marathon_id: marathon.id,
            user_id: telegram_id,
            start_weight: current_weight
        });
        if (error) {
            if (error.code === '23505')
                return res.status(400).json({ error: "Вы уже участвуете в этом марафоне" });
            throw error;
        }
        res.json({ success: true, marathon });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/marathon/:id/ladder', async (req, res) => {
    try {
        const marathon_id = req.params.id;
        // Получаем участников
        const { data: participants } = await supabase
            .from('marathon_participants')
            .select('user_id, start_weight, users(first_name, last_name, avatar_url, weight, target_weight)')
            .eq('marathon_id', marathon_id);
        if (!participants)
            return res.json([]);
        // Считаем прогресс для каждого
        const ladder = participants.map((p) => {
            const start = p.start_weight;
            const current = p.users.weight;
            const target = p.users.target_weight;
            // Прогресс: сколько скинул от того что нужно скинуть
            // (Start - Current) / (Start - Target) * 100
            let progress = 0;
            if (start > target) { // Худеем
                const totalToLose = start - target;
                const lost = start - current;
                progress = (lost / totalToLose) * 100;
            }
            else if (start < target) { // Набираем
                const totalToGain = target - start;
                const gained = current - start;
                progress = (gained / totalToGain) * 100;
            }
            return {
                user: p.users,
                progress: Math.min(Math.max(progress, 0), 100) // 0-100%
            };
        });
        // Сортируем: у кого больше прогресс - тот выше
        ladder.sort((a, b) => b.progress - a.progress);
        res.json(ladder);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/marathon/save-assessment', async (req, res) => {
    try {
        const { participant_id, type, answers } = req.body;
        // Тут стоило бы найти participant_id по user_id и marathon_id, но пока доверимся фронту или упростим
        // Для надежности лучше передавать user_id и marathon_id
        // Предположим мы передаем user_id и marathon_id для поиска участника
        const { user_id, marathon_id } = req.body;
        const { data: participant } = await supabase.from('marathon_participants')
            .select('id')
            .eq('user_id', user_id)
            .eq('marathon_id', marathon_id)
            .single();
        if (!participant)
            throw new Error("Participant not found");
        const { error } = await supabase.from('marathon_assessments').insert({
            participant_id: participant.id,
            type,
            answers
        });
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
export default router;
//# sourceMappingURL=api.js.map