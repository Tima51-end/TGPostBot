import { Bot, Context, session, type SessionFlavor } from "grammy";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { addDays, setHours, setMinutes } from "date-fns";
import http from "http"; // Добавлено для Render
import type { SessionData } from "./types.js";
import { initScheduler } from "./scheduler.js";

dotenv.config();

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!,
);

// Инициализируем сессию
bot.use(session({ initial: (): SessionData => ({ step: "idle" }) }));

// --- 1. КОМАНДЫ ---

bot.command("start", async (ctx) => {
  ctx.session.step = "idle";
  const welcome = `
👋 **Привет! Я менеджер твоего канала.**

Используй команды из меню или вводи вручную:
/newpost — создать новый пост
/newglobaldescription — изменить текст подписей
/newgloballink — изменить общую ссылку
  `;
  await ctx.reply(welcome, { parse_mode: "Markdown" });
});

bot.command("newpost", async (ctx) => {
  ctx.session.step = "waiting_post_media";
  ctx.session.tempPost = { media: [] };
  await ctx.reply("📸 Отправляй медиа (фото или видео)!");
});

bot.command("newglobaldescription", async (ctx) => {
  ctx.session.step = "waiting_description";
  await ctx.reply("✍️ Пришли стандартный текст под всеми постами:");
});

bot.command("newgloballink", async (ctx) => {
  ctx.session.step = "waiting_link";
  await ctx.reply("🔗 Пришли стандартную ссылку:");
});

// --- 2. ОБРАБОТКА МЕДИА ---

bot.on(["message:photo", "message:video"], async (ctx) => {
  if (ctx.session.step !== "waiting_post_media" || !ctx.session.tempPost)
    return;

  let fileId: string | undefined;
  let type: "photo" | "video" = "photo";

  if (ctx.message?.photo) {
    fileId = ctx.message.photo[ctx.message.photo.length - 1]?.file_id;
    type = "photo";
  } else if (ctx.message?.video) {
    fileId = ctx.message.video.file_id;
    type = "video";
  }

  if (fileId) {
    ctx.session.tempPost.media.push({ type, file_id: fileId });
  }

  const isMediaGroup = ctx.message?.media_group_id;
  const next = async () => {
    if (ctx.session.step === "waiting_post_media") {
      ctx.session.step = "waiting_post_desc";
      await ctx.reply(
        "📝 Нужна кастомная подпись? Пришли текст или **-** для стандартного.",
      );
    }
  };

  if (isMediaGroup) setTimeout(next, 1000);
  else await next();
});

// --- 3. ОБРАБОТКА ТЕКСТА ---

bot.on("message:text", async (ctx) => {
  const step = ctx.session.step;
  const text = ctx.message.text;

  if (step === "waiting_description") {
    const { error } = await supabase
      .from("global_settings")
      .update({ description: text })
      .eq("id", 1);
    if (error) return ctx.reply("🚨 Ошибка БД: " + error.message);
    ctx.session.step = "idle";
    return ctx.reply("✅ Текст сохранен!");
  }

  if (step === "waiting_link") {
    const { error } = await supabase
      .from("global_settings")
      .update({ link: text })
      .eq("id", 1);
    if (error) return ctx.reply("🚨 Ошибка БД.");
    ctx.session.step = "idle";
    return ctx.reply("✅ Ссылка сохранена!");
  }

  if (step === "waiting_post_desc") {
    if (ctx.session.tempPost) {
      ctx.session.tempPost.custom_desc = text === "-" ? undefined : text;
    }
    ctx.session.step = "waiting_post_time";
    return ctx.reply("⏰ Когда выложить? (Напр: \`15:00\`)", {
      parse_mode: "Markdown",
    });
  }

  if (step === "waiting_post_time") {
    const match = text.match(/(?:\+(\d+)\s+)?(\d{1,2}):(\d{2})/);
    if (!match) return ctx.reply("⚠️ Неверный формат времени.");

    let targetDate = new Date();
    const daysStr = match[1];
    const hoursStr = match[2]!;
    const minsStr = match[3]!;

    if (daysStr) targetDate = addDays(targetDate, parseInt(daysStr));
    targetDate = setHours(targetDate, parseInt(hoursStr));
    targetDate = setMinutes(targetDate, parseInt(minsStr));

    if (ctx.session.tempPost) {
      await supabase.from("scheduled_posts").insert({
        media_urls: ctx.session.tempPost.media,
        custom_desc: ctx.session.tempPost.custom_desc ?? null,
        scheduled_at: targetDate.toISOString(),
        is_published: false,
      });
    }

    ctx.session.step = "idle";
    await ctx.reply(
      `🎉 Запланировано на ${targetDate.toLocaleString("ru-RU")}`,
    );
  }
});

// --- 4. СЕРВЕР ДЛЯ RENDER (Keep-alive) ---
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive!");
  })
  .listen(PORT, () => {
    console.log(`📡 Health-check server on port ${PORT}`);
  });

bot.catch((err) => console.error("Bot error:", err));

initScheduler();
bot.start();
console.log("🚀 Бот запущен!");
