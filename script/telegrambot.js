require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { config } = require("../src/config/env");

const telegramConfig = config.telegram || {};
const botToken = telegramConfig.botToken;
const apiBase = telegramConfig.apiBase;
const apiToken = telegramConfig.apiToken;
const frontendUrl = telegramConfig.frontendUrl;
const allowedUserIds = Array.isArray(telegramConfig.allowedUserIds) ? telegramConfig.allowedUserIds : [];
const allowedChatIds = Array.isArray(telegramConfig.allowedChatIds) ? telegramConfig.allowedChatIds : [];
const allowGroup = telegramConfig.allowGroup === true;

// Check required config - throw instead of exit so it can be caught when imported
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required in .env");
}
if (!apiBase) {
  throw new Error("TELEGRAM_API_BASE is required in .env");
}
if (allowedUserIds.length === 0) {
  console.warn("Warning: TELEGRAM_ALLOWED_USER_IDS is empty; bot will deny all users.");
}

const bot = new TelegramBot(botToken, { polling: true });

// Store user sessions
const userSessions = new Map();

// Categories with Khmer labels
const categories = [
  { id: "internet", label: "Internet", khmer: "អ៊ីនធឺណិត" },
  { id: "email", label: "Email", khmer: "អ៊ីមែល" },
  { id: "tech_device", label: "Tech Device", khmer: "ឧបករណ៍បច្ចេកទេស" },
  { id: "other", label: "Others", khmer: "ផ្សេងៗ" },
];

// Titles with Khmer labels
const titles = [
  { id: "mr", label: "Mr.", khmer: "លោក" },
  { id: "mrs", label: "Mrs.", khmer: "លោកស្រី" },
  { id: "miss", label: "Miss", khmer: "កញ្ញា" },
  { id: "he", label: "H.E.", khmer: "ឯកឧត្តម/លោកជំទាវ" },
  { id: "dr", label: "Dr.", khmer: "បណ្ឌិត" },
  { id: "none", label: "None", khmer: "គ្មាន" },
];

// Check if chat is allowed (default: private only)
function isChatAllowed(chat) {
  if (!chat) return false;
  if (!allowGroup && chat.type !== "private") return false;
  if (allowedChatIds.length === 0) return true;
  return allowedChatIds.includes(String(chat.id));
}

// Check if user is authorized (requires allowlist)
function isAuthorized(userId, chat) {
  if (!isChatAllowed(chat)) return false;
  if (allowedUserIds.length === 0) return false;
  return allowedUserIds.includes(String(userId));
}

// Initialize user session
function initSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      step: null,
      data: {},
    });
  }
  return userSessions.get(chatId);
}

// Clear user session
function clearSession(chatId) {
  userSessions.delete(chatId);
}

// Send category selection
function sendCategoryPrompt(chatId) {
  const keyboard = [
    [
      { text: categories[0].khmer, callback_data: "cat:internet" },
      { text: categories[1].khmer, callback_data: "cat:email" },
    ],
    [
      { text: categories[2].khmer, callback_data: "cat:tech_device" },
      { text: categories[3].khmer, callback_data: "cat:other" },
    ],
  ];
  return bot.sendMessage(chatId, "សូមជ្រើសរើសបញ្ហាដែលពាក់ព័ន្ធ:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

// Send title selection
function sendTitlePrompt(chatId) {
  const keyboard = [
    [
      { text: titles[0].khmer, callback_data: "title:mr" },
      { text: titles[1].khmer, callback_data: "title:mrs" },
    ],
    [
      { text: titles[2].khmer, callback_data: "title:miss" },
      { text: titles[3].khmer, callback_data: "title:he" },
    ],
    [
      { text: titles[4].khmer, callback_data: "title:dr" },
      { text: titles[5].khmer, callback_data: "title:none" },
    ],
  ];
  return bot.sendMessage(chatId, "សូមជ្រើសរើសឋានៈ:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

// Submit ticket to API
async function submitTicket(chatId, session) {
  try {
    const formData = new FormData();
    formData.append("name", session.data.name || "");
    formData.append("courtesyName", session.data.title || "");
    formData.append("position", session.data.position || "");
    formData.append("department", session.data.department || "");
    formData.append("phoneNumber", session.data.phoneNumber || "");
    formData.append("roomNumber", session.data.roomNumber || "");
    formData.append("description", session.data.description || "");
    formData.append("ticketCategory", session.data.category || "");

    // Add images if any
    if (session.data.images && session.data.images.length > 0) {
      for (const imagePath of session.data.images) {
        if (fs.existsSync(imagePath)) {
          formData.append("images", fs.createReadStream(imagePath));
        }
      }
    }

    const headers = {
      ...formData.getHeaders(),
    };

    // Add API token if configured
    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    const response = await axios.post(`${apiBase}/api/tickets`, formData, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error submitting ticket:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || "កំហុសមិនស្គាល់",
    };
  }
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  // Check authorization
  if (!isAuthorized(userId, msg.chat)) {
    await bot.sendMessage(
      chatId,
      "សូមទោស។ អ្នកមិនមានសិទ្ធិប្រើប្រាស់ប្រព័ន្ធនេះទេ។\n\nSorry. You are not authorized to use this system."
    );
    return;
  }

  clearSession(chatId);
  await bot.sendMessage(
    chatId,
    "សូមស្វាគមន៍មកកាន់ប្រព័ន្ធកំណត់ត្រាបញ្ហាបច្ចេកទេស។\n\nសូមចុច /new ដើម្បីចាប់ផ្តើមបង្កើតបញ្ហាថ្មី។"
  );
});

// Handle /id command (for allowlist setup)
bot.onText(/\/id/, async (msg) => {
  const chat = msg.chat;
  if (!allowGroup && chat.type !== "private") {
    await bot.sendMessage(chat.id, "Please DM me to get your user ID.");
    return;
  }
  const userId = msg.from?.id != null ? String(msg.from.id) : "unknown";
  const chatId = chat?.id != null ? String(chat.id) : "unknown";
  const chatType = chat?.type || "unknown";
  await bot.sendMessage(
    chat.id,
    `Your user ID: ${userId}\nChat ID: ${chatId}\nChat type: ${chatType}`
  );
});

// Handle /new command
bot.onText(/\/new/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  if (!isAuthorized(userId, msg.chat)) {
    await bot.sendMessage(chatId, "សូមទោស។ អ្នកមិនមានសិទ្ធិប្រើប្រាស់ប្រព័ន្ធនេះទេ។");
    return;
  }

  const session = initSession(chatId);
  session.step = "category";
  session.data = {};
  await sendCategoryPrompt(chatId);
});

// Handle /cancel command
bot.onText(/\/cancel/, async (msg) => {
  const chatId = msg.chat.id;
  clearSession(chatId);
  await bot.sendMessage(chatId, "បានបោះបង់។ សូមចុច /new ដើម្បីចាប់ផ្តើមឡើងវិញ។");
});

// Handle callback queries (button clicks)
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = String(query.from.id);
  const data = query.data;

  if (!isAuthorized(userId, query.message?.chat)) {
    await bot.answerCallbackQuery(query.id, { text: "មិនមានសិទ្ធិ" });
    return;
  }

  const session = initSession(chatId);

  if (data.startsWith("cat:")) {
    const categoryId = data.split(":")[1];
    const category = categories.find((c) => c.id === categoryId);
    session.data.category = categoryId;
    session.step = "title";
    await bot.answerCallbackQuery(query.id, { text: `បានជ្រើស: ${category.khmer}` });
    await sendTitlePrompt(chatId);
  } else if (data.startsWith("title:")) {
    const titleId = data.split(":")[1];
    const title = titles.find((t) => t.id === titleId);
    session.data.title = title.label;
    session.step = "name";
    await bot.answerCallbackQuery(query.id, { text: `បានជ្រើស: ${title.khmer}` });
    await bot.sendMessage(chatId, "សូមបញ្ចូលឈ្មោះរបស់អ្នក:");
  } else if (data === "action:submit") {
    if (session.step !== "confirm") {
      await bot.answerCallbackQuery(query.id, { text: "សូមចាប់ផ្តើមឡើងវិញដោយប្រើ /new" });
      return;
    }
    session.step = "submitting";
    await bot.answerCallbackQuery(query.id, { text: "កំពុងដាក់ស្នើ..." });
    await bot.sendMessage(chatId, "⏳ កំពុងដាក់ស្នើ...");
    const result = await submitTicket(chatId, session);
    if (result.success) {
      // API returns { success, data: { ticket } } so result.data.data.ticket
      const ticket = result.data?.data?.ticket || result.data?.ticket || result.data;
      const ticketCode = ticket?.ticketCode;
      const ticketId = ticket?.id;
      
      let successMsg = "✅ បានដាក់ស្នើដោយជោគជ័យ។ សូមអរគុណ។";
      if (ticketCode) {
        successMsg += `\n\n🎫 លេខកូដសំបុត្រ: ${ticketCode}`;
      } else if (ticketId) {
        successMsg += `\n\n🎫 លេខសំបុត្រ: #${ticketId}`;
      }
      
      // Build inline keyboard with link to homepage
      const keyboard = [];
      if (frontendUrl) {
        keyboard.push([{ text: "🔍 ពិនិត្យស្ថានភាពសំបុត្រ", url: frontendUrl }]);
      }
      keyboard.push([{ text: "📝 បង្កើតសំបុត្រថ្មី", callback_data: "action:new" }]);
      
      await bot.sendMessage(chatId, successMsg, {
        reply_markup: { inline_keyboard: keyboard },
      });
      clearSession(chatId);
    } else {
      await bot.sendMessage(chatId, `❌ កំហុស: ${result.error}\n\nសូមព្យាយាមម្តងទៀតដោយប្រើ /new`);
      clearSession(chatId);
    }
  } else if (data === "action:cancel") {
    clearSession(chatId);
    await bot.answerCallbackQuery(query.id, { text: "បានបោះបង់" });
    await bot.sendMessage(chatId, "❌ បានបោះបង់។ សូមចុច /new ដើម្បីចាប់ផ្តើមឡើងវិញ។");
  } else if (data === "action:new") {
    session.step = "category";
    session.data = {};
    await bot.answerCallbackQuery(query.id, { text: "ចាប់ផ្តើមសំបុត្រថ្មី" });
    await sendCategoryPrompt(chatId);
  } else if (data === "action:skip_photo") {
    if (session.step !== "photo") {
      await bot.answerCallbackQuery(query.id, { text: "សូមចាប់ផ្តើមឡើងវិញដោយប្រើ /new" });
      return;
    }
    session.step = "confirm";
    await bot.answerCallbackQuery(query.id, { text: "រំលងរូបភាព" });
    await sendConfirmation(chatId, session);
  }
});

// Handle text messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const text = msg.text;

  if (!isAuthorized(userId, msg.chat)) {
    return;
  }

  const session = initSession(chatId);

  if (!session.step) {
    return;
  }

  // Allow /skip during photo step; ignore other commands
  const isCommand = text && text.startsWith("/");
  const allowCommand = session.step === "photo" && text === "/skip";
  if (isCommand && !allowCommand) {
    return;
  }

  switch (session.step) {
    case "name":
      session.data.name = text || "";
      session.step = "position";
      await bot.sendMessage(chatId, "សូមបញ្ចូលតួនាទីរបស់អ្នក:");
      break;

    case "position":
      session.data.position = text || "";
      session.step = "department";
      await bot.sendMessage(chatId, "សូមបញ្ចូលនាយកដ្ឋាន:");
      break;

    case "department":
      session.data.department = text || "";
      session.step = "phone";
      await bot.sendMessage(chatId, "សូមបញ្ចូលលេខទូរស័ព្ទ:");
      break;

    case "phone":
      session.data.phoneNumber = text || "";
      session.step = "room";
      await bot.sendMessage(chatId, "សូមបញ្ចូលលេខបន្ទប់ (ប្រសិនបើមាន):");
      break;

    case "room":
      session.data.roomNumber = text || "";
      session.step = "description";
      await bot.sendMessage(chatId, "សូមបញ្ចូលការពិពណ៌នាអំពីបញ្ហា:");
      break;

    case "description":
      session.data.description = text || "";
      session.step = "photo";
      await bot.sendMessage(chatId, "🖼️ សូមផ្ញើរូបភាព (ប្រសិនបើមាន) ឬចុចប៊ូតុងខាងក្រោមដើម្បីបន្ត:", {
        reply_markup: {
          inline_keyboard: [[{ text: "⏭️ រំលង", callback_data: "action:skip_photo" }]],
        },
      });
      break;

    case "photo":
      if (text === "/skip") {
        session.step = "confirm";
        await sendConfirmation(chatId, session);
      }
      break;

    case "confirm":
      // Buttons handle submit/cancel now, but keep text fallback
      if (text && text.toLowerCase() === "submit") {
        // Trigger submit via callback simulation
        await bot.sendMessage(chatId, "សូមចុចប៊ូតុង ✅ ដាក់ស្នើ ខាងលើ");
      }
      break;
  }
});

// Handle photo messages
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  if (!isAuthorized(userId, msg.chat)) {
    return;
  }

  const session = initSession(chatId);

  if (session.step === "photo") {
    try {
      const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
      const fileId = photo.file_id;
      const file = await bot.getFile(fileId);
      const filePath = file.file_path;

      // Download photo
      const telegramDir = path.join(__dirname, "..", "uploads", "telegram");
      if (!fs.existsSync(telegramDir)) {
        fs.mkdirSync(telegramDir, { recursive: true });
      }

      await bot.downloadFile(fileId, telegramDir);
      const finalPath = path.join(telegramDir, filePath.split("/").pop());

      if (!session.data.images) {
        session.data.images = [];
      }
      session.data.images.push(finalPath);

      await bot.sendMessage(
        chatId,
        "បានទទួលរូបភាព។ សូមផ្ញើរូបភាពបន្ថែម (ប្រសិនបើមាន) ឬចុច /skip ដើម្បីបន្ត:"
      );
    } catch (error) {
      console.error("Error handling photo:", error);
      await bot.sendMessage(chatId, "កំហុសក្នុងការទទួលរូបភាព។ សូមព្យាយាមម្តងទៀត។");
    }
  }
});

// Send confirmation message with buttons
async function sendConfirmation(chatId, session) {
  const category = categories.find((c) => c.id === session.data.category);
  const title = titles.find((t) => t.label === session.data.title);

  let summary = "📋 សេចក្តីសង្ខេប:\n\n";
  summary += `🏷️ ប្រភេទបញ្ហា: ${category ? category.khmer : session.data.category}\n`;
  summary += `👤 ឋានៈ: ${title ? title.khmer : session.data.title}\n`;
  summary += `📛 ឈ្មោះ: ${session.data.name}\n`;
  summary += `💼 តួនាទី: ${session.data.position}\n`;
  summary += `🏢 នាយកដ្ឋាន: ${session.data.department}\n`;
  summary += `📞 លេខទូរស័ព្ទ: ${session.data.phoneNumber}\n`;
  if (session.data.roomNumber) {
    summary += `🚪 លេខបន្ទប់: ${session.data.roomNumber}\n`;
  }
  summary += `📝 ការពិពណ៌នា: ${session.data.description}\n`;
  if (session.data.images && session.data.images.length > 0) {
    summary += `🖼️ រូបភាព: ${session.data.images.length} ផ្ទាំង\n`;
  }

  const keyboard = [
    [
      { text: "✅ ដាក់ស្នើ", callback_data: "action:submit" },
      { text: "❌ បោះបង់", callback_data: "action:cancel" },
    ],
  ];

  await bot.sendMessage(chatId, summary, {
    reply_markup: { inline_keyboard: keyboard },
  });
}

// Handle errors
bot.on("polling_error", (error) => {
  console.error("Telegram polling error:", error.message || error);
});

// Only log startup message when run directly (not imported)
if (require.main === module) {
  console.log("Telegram bot started. Waiting for messages...");
}
