import { message } from 'telegraf/filters';
import { Markup } from 'telegraf'; // <-- Добавили Markup для кнопок
import { bot, openai, supabase } from '../config/clients';
import { SYSTEM_PROMPT } from '../utils/common';
import { checkOverlimit } from '../utils/notifications';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';

const AI_MODEL = "gpt-4o"; 

// --- ФУНКЦИЯ АНАЛИЗА (Без изменений) ---
const handleTextAnalysis = async (userId: number, text: string, ctx: any) => {
    try {
        ctx.reply(`🤔 Анализирую: "${text}"...`);
        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: text }],
            response_format: { type: "json_object" }
        });
        const result = JSON.parse(completion.choices[0].message.content || '{}');

        if (!result.calories && result.calories !== 0) { ctx.reply("❌ Не смог определить еду."); return; }

        const { error } = await supabase.from('food_logs').insert({
            user_id: userId, name: result.name, calories: result.calories, protein: result.protein, fats: result.fats, carbs: result.carbs, grade: result.grade, is_image_recognized: false
        });

        if (error) { if (error.code === '23503') ctx.reply("⚠️ Нажми /start"); else throw error; return; }
        
        checkOverlimit(userId, result.calories);
        ctx.reply(`✅ [${result.grade}] ${result.name}\n⚖️ ~${result.weight_g} г\n🔥 ${result.calories} ккал\n💡 ${result.advice}`);
    } catch (e) { console.error(e); ctx.reply("❌ Ошибка анализа."); }
};

export const setupBot = () => {
    
    // 1. КОМАНДА /START С ЗАПРОСОМ ТЕЛЕФОНА
    bot.command('start', async (ctx) => {
        const userId = ctx.from.id;
        
        // Регистрируем юзера (если его еще нет)
        await supabase.from('users').upsert({ 
            telegram_id: userId, 
            first_name: ctx.from.first_name, 
            username: ctx.from.username, 
            daily_calories_goal: 2000 
        });

        // Отправляем приветствие с КНОПКОЙ
        ctx.reply(
            `👋 Привет, ${ctx.from.first_name}!\nДля полной авторизации нажми кнопку ниже, чтобы отправить свой номер телефона.`,
            Markup.keyboard([
                Markup.button.contactRequest('📱 Отправить номер телефона')
            ]).resize().oneTime()
        );
    });

    // 2. ОБРАБОТКА ПОЛУЧЕНИЯ КОНТАКТА
    bot.on(message('contact'), async (ctx) => {
        const userId = ctx.from.id;
        const phone = ctx.message.contact.phone_number;

        // Проверяем, что номер принадлежит именно этому пользователю (защита от пересылки чужих контактов)
        if (ctx.message.contact.user_id !== userId) {
            ctx.reply("❌ Пожалуйста, отправьте СВОЙ номер телефона через кнопку меню.");
            return;
        }

        // Сохраняем номер в базу
        const { error } = await supabase
            .from('users')
            .update({ phone: phone })
            .eq('telegram_id', userId);

        if (error) {
            console.error(error);
            ctx.reply("Ошибка сохранения номера.");
        } else {
            ctx.reply(
                "✅ Авторизация успешна! Номер сохранен.\nТеперь ты можешь пользоваться всеми функциями: скидывать фото еды, голосовые или текст.", 
                Markup.removeKeyboard() // Убираем кнопку
            );
        }
    });

    // 3. ГОЛОС
    bot.on(message('voice'), async (ctx) => {
        try {
            const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
            const response = await axios({ url: fileLink.href, method: 'GET', responseType: 'stream' });
            const tempFilePath = path.join(os.tmpdir(), `voice_${ctx.message.voice.file_id}.ogg`);
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
            const transcription = await openai.audio.transcriptions.create({ file: fs.createReadStream(tempFilePath), model: "whisper-1", language: "ru" });
            fs.unlinkSync(tempFilePath);
            if(transcription.text) await handleTextAnalysis(ctx.from.id, transcription.text, ctx);
            else ctx.reply("🤷‍♂️ Пусто.");
        } catch (e) { ctx.reply("❌ Ошибка голоса."); }
    });

    // 4. ТЕКСТ
    bot.on(message('text'), async (ctx) => {
        if (ctx.message.text.startsWith('/')) return;
        await handleTextAnalysis(ctx.from.id, ctx.message.text, ctx);
    });

    // 5. ФОТО
    // ... внутри setup.ts

    // ФОТО
    bot.on(message('photo'), async (ctx) => {
        try {
            ctx.reply("🔎 Анализирую фото...");
            
            // Берем фото лучшего качества
            const photo = ctx.message.photo.pop(); 
            if (!photo) return;
            
            // Получаем прямую ссылку на файл
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);
            
            // Отправляем ссылку прямо в GPT-4o (не скачивая файл на сервер)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o", // Обязательно gpt-4o или gpt-4o-mini
                messages: [
                    { role: "system", content: SYSTEM_PROMPT }, 
                    { role: "user", content: [
                        { type: "text", text: "Analyze this food image" },
                        { type: "image_url", image_url: { url: fileLink.href } }
                    ]}
                ],
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(completion.choices[0].message.content || '{}');
            
            const { error } = await supabase.from('food_logs').insert({
                user_id: ctx.from.id, 
                name: result.name, 
                calories: result.calories, 
                protein: result.protein, 
                fats: result.fats, 
                carbs: result.carbs, 
                grade: result.grade, 
                is_image_recognized: true
            });
            
            if (error) throw error;

            // (Если у тебя настроены уведомления - раскомментируй)
            // checkOverlimit(ctx.from.id, result.calories);

            ctx.reply(`✅ [${result.grade}] ${result.name}\n🔥 ${result.calories} ккал\n💡 ${result.advice}`);
        } catch (e: any) { 
            console.error("Photo Error:", e); // Пишем ошибку в лог
            ctx.reply(`❌ Ошибка фото: ${e.message}`); 
        }
    });

    bot.launch().then(() => console.log("🤖 Telegram Bot started!"));
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};