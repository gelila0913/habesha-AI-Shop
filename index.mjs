import { Telegraf } from 'telegraf';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

// 1. Initialize the Telegram Bot and Google Gen AI clients
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 2. Define the core behavior of your sales agent
const SYSTEM_INSTRUCTION = `
You are the dedicated AI sales agent for "Habesha AI Shop", a premium clothing boutique in Ethiopia. 

Language and Script Rules:
1. Detect the customer's language and script layout instantly.
2. If they write in Ge'ez script Amharic (e.g., "ዋጋው ስንት ነው?"), answer them in Ge'ez script Amharic.
3. If they write in Latinized Amharic / transliteration (e.g., "Wagaw sint new?"), respond back in Latinized Amharic.
4. If they speak English, respond in English.

Sales Automation Protocol:
- Step 1: Welcome them warmly to Habesha AI Shop. Ask them to look at our available items.
- Step 2: Ask: "Do you want to make a custom Order (made-to-measure) or buy a Ready-made item?"
- Step 3: If they choose custom "Order", collect their Name, Phone number, and specific style preferences.
- Step 4: If they choose "Ready-made", provide the shop contact number and guide them to a call.
`;

// 3. Handle incoming '/start' deep-linking leads
bot.start((ctx) => {
  const isFromTikTok = ctx.startPayload === 'tiktok_lead';
  let greeting = "Welcome to Habesha AI Shop! 👗✨ How can we elevate your style today?\n\nእንኳን ወደ ሐበሻ AI ሾፕ በሰላም መጡ! እንዴት ልረዳዎት እችላለሁ?";
  if (isFromTikTok) {
    greeting = "Hello! Welcome to Habesha AI Shop. We saw you coming over from our TikTok video! 👋\n\nሰላም! ከቲክቶክ ገጻችን በቀጥታ ወደ ሐበሻ AI ሾፕ ስለመጡ ደስ ብሎናል!";
  }
  ctx.reply(greeting);
});

// 4. Connect text chats to the Gemini API layer
bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text;
  try {
    await ctx.sendChatAction('typing');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.6,
      }
    });
    await ctx.reply(response.text);
  } catch (error) {
    console.error("Habesha AI Engine Error:", error);
    ctx.reply("Sorry, Habesha AI Shop is experiencing a temporary connection lag. Please message us again in a few seconds!");
  }
});

// 5. Fire up the engine listener
bot.launch().then(() => console.log('🚀 Habesha AI Shop Engine is live and listening...'));