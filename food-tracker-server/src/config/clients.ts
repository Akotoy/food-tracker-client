import 'dotenv/config';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Telegraf } from 'telegraf';

// Проверка переменных
if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ ОШИБКА: Не заполнен файл .env");
    process.exit(1);
}

// Экспортируем готовые инстансы
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);