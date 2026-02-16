import schedule from "node-schedule";
import { createClient } from "@supabase/supabase-js";
import { Bot, InputMediaBuilder } from "grammy";
import * as dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!,
);
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!;

export const initScheduler = () => {
  schedule.scheduleJob("*/1 * * * *", async () => {
    const now = new Date().toISOString();

    const { data: posts, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("is_published", false)
      .lte("scheduled_at", now);

    if (error || !posts || posts.length === 0) return;

    const { data: settings } = await supabase
      .from("global_settings")
      .select("*")
      .eq("id", 1)
      .single();

    for (const post of posts) {
      try {
        const baseDesc = post.custom_desc || settings?.description || "";
        const link = settings?.link ? `\n\n${settings.link}` : "";
        const fullCaption = `${baseDesc}${link}`.trim();

        const media = post.media_urls as Array<{
          type: "photo" | "video";
          file_id: string;
        }>;
        const options = fullCaption ? { caption: fullCaption } : {};

        if (media.length === 1) {
          const item = media[0]!;
          if (item.type === "photo") {
            await bot.api.sendPhoto(CHANNEL_ID, item.file_id, options);
          } else {
            await bot.api.sendVideo(CHANNEL_ID, item.file_id, options);
          }
        } else {
          const inputMedia = media.map((item, index) => {
            const mediaOptions =
              index === 0 && fullCaption ? { caption: fullCaption } : {};
            return item.type === "photo"
              ? InputMediaBuilder.photo(item.file_id, mediaOptions)
              : InputMediaBuilder.video(item.file_id, mediaOptions);
          });

          await bot.api.sendMediaGroup(CHANNEL_ID, inputMedia);
        }

        await supabase
          .from("scheduled_posts")
          .update({ is_published: true })
          .eq("id", post.id);
        console.log(`✅ Пост ${post.id} опубликован`);
      } catch (err) {
        console.error(`❌ Ошибка:`, err);
      }
    }
  });
};
