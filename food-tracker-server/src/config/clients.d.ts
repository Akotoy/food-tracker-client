import 'dotenv/config';
import { OpenAI } from 'openai';
import { Telegraf } from 'telegraf';
export declare const openai: OpenAI;
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const bot: Telegraf<import("telegraf").Context<import("@telegraf/types").Update>>;
//# sourceMappingURL=clients.d.ts.map