import { supabase } from '../config/clients';
export const SYSTEM_PROMPT = `
You are a professional nutritionist. Analyze the food.
1. Identify the food name (translate to Russian).
2. Estimate weight if not specified (standard portion).
3. Calculate macros.
4. GRADE the food from 'A' (Very Healthy) to 'D' (Unhealthy) based on balance/sugar/trans-fats.
5. Give a short, actionable advice in Russian (max 10 words).

Return ONLY JSON:
{ "name": "string", "calories": number, "protein": number, "fats": number, "carbs": number, "weight_g": number, "grade": "A" | "B" | "C" | "D", "advice": "string" }
`;
export const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};
export const calculateStreak = async (userId) => {
    const { data: logs } = await supabase.from('food_logs').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    if (!logs || logs.length === 0)
        return 0;
    const uniqueDays = new Set(logs.map(l => l.created_at.split('T')[0]));
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (!uniqueDays.has(today) && !uniqueDays.has(yesterday))
        return 0;
    let checkDate = new Date();
    if (!uniqueDays.has(today))
        checkDate.setDate(checkDate.getDate() - 1);
    while (uniqueDays.has(checkDate.toISOString().split('T')[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
};
//# sourceMappingURL=common.js.map