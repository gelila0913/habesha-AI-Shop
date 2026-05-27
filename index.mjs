import { Telegraf } from 'telegraf';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import fetch from 'node-fetch';

// 1. Initialize the Telegram Bot and Google Gen AI clients
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 2. Define the core behavior of your sales agent with Multimodal (Visual) awareness
const SYSTEM_INSTRUCTION = `
You are the dedicated AI sales agent for "Habesha AI Shop", a premium clothing boutique in Ethiopia. 

Visual & Screenshot Protocol:
- The customer might send you a screenshot or an image of a dress/cloth they saw on our TikTok videos.
- Carefully look at the image provided. Identify the type of Habesha dress, its unique embroidery, patterns, and colors.
- When they ask "how much is it?" or ask about the item in the photo, look at the picture and respond accurately:
  * Quote prices around 15,000 to 25,000 ETB depending on the richness of the style.
  * State clearly that custom orders take exactly 15 days to be made completely fresh.

Language and Script Rules:
1. Detect the customer's language and script layout instantly.
2. If they write in Ge'ez script Amharic (e.g., "ዋጋው ስንት ነው?"), answer them in Ge'ez script Amharic.
3. If they write in Latinized Amharic / transliteration (e.g., "Wagaw sint new?", "sintewu"), respond back in Latinized Amharic.
4. If they speak English, respond in English.

Sales Automation Protocol:
- Step 1: Welcome them warmly. If they sent an image, compliment their choice immediately! Tell them the price and that it takes 15 days to prepare.
- Step 2: Ask: "Do you want to make a custom Order (made-to-measure) or buy a Ready-made item?"
- Step 3: If they choose custom "Order", collect their Name, Phone number, and style choices.
- Step 4: If they choose "Ready-made", explain that you must check inventory right away, provide the shop number, and tell them to call immediately.
`;

// Runtime state tracker: Holds continuous chat histories across multi-turn user messages
const activeSessions = new Map();

// Helper function to safely get or initialize a user chat session
function getOrCreateSession(chatId) {
  if (!activeSessions.has(chatId)) {
    const chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      }
    });
    activeSessions.set(chatId, chatSession);
  }
  return activeSessions.get(chatId);
}

// 3. Handle incoming '/start' deep-linking leads
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  if (activeSessions.has(chatId)) {
    activeSessions.delete(chatId);
  }

  let greeting = "Welcome to Habesha AI Shop! 👗✨ How can we elevate your style today?\n\nYou can message us or directly send a screenshot of the dress you saw on our TikTok!";
  if (ctx.startPayload === 'tiktok_lead') {
    greeting = "Hello! Welcome to Habesha AI Shop. We saw you coming over from our TikTok video! 👋\n\nPlease drop the screenshot of the dress you liked from the video here, and we'll check the pricing and details for you instantly!";
  }
  ctx.reply(greeting);
});

// 4. Handle incoming Photos/Screenshots from TikTok leads
bot.on('photo', async (ctx) => {
  const chatId = ctx.chat.id;
  // Capture any text message sent along with the image caption (e.g., "how much is this?")
  const textCaption = ctx.message.caption || "Look at this dress screenshot I uploaded from your TikTok.";

  try {
    await ctx.sendChatAction('typing');

    // 4a. Get the highest resolution version of the photo array sent
    const photoArray = ctx.message.photo;
    const fileId = photoArray[photoArray.length - 1].file_id;

    // 4b. Fetch the file download path using Telegraf's API engine
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // 4c. Download the image into memory buffer
    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // 4d. Format media structure into Gemini native inline parts
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    };

    // 4e. Fetch existing or new session and stream both parts at once
    const currentChat = getOrCreateSession(chatId);
    const aiResponse = await currentChat.sendMessage({
      message: [textCaption, imagePart]
    });

    await ctx.reply(aiResponse.text);

  } catch (error) {
    console.error("Multimodal Extraction Error:", error);
    ctx.reply("I received your screenshot, but had a hard time opening it. Can you please upload it again or type out your inquiry? 🙏");
  }
});

// 5. Connect regular text chats to the Gemini API layer
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userMessage = ctx.message.text;

  try {
    await ctx.sendChatAction('typing');

    const currentChat = getOrCreateSession(chatId);
    const response = await currentChat.sendMessage({
      message: userMessage
    });

    await ctx.reply(response.text);

  } catch (error) {
    console.error("Habesha AI Engine Error:", error);
    ctx.reply("Sorry, Habesha AI Shop is experiencing a temporary connection lag. Please message us again in a few seconds!");
  }
});

// 6. Fire up the engine listener
bot.launch().then(() => console.log('🚀 Habesha AI Multimodal Shop Engine is live...'));