import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8050;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint - serverni faol saqlash uchun
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "Contact Bot Backend is running!",
    endpoints: {
      health: "/health",
      contact: "/contact"
    }
  });
});

// Contact formdan murojaat qabul qilish
app.post("/contact", async (req, res) => {
  try {
    const { name, subject, email, message } = req.body;

    // Validation
    if (!name || !subject || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Barcha maydonlarni to'ldiring!" 
      });
    }

    const text = `
📩 Yangi murojaat keldi:
👤 Ism: ${name}
📌 Mavzu: ${subject}
📧 Email: ${email}
📝 Xabar: ${message}

⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}
`;

    // Telegram botga yuborish (timeout bilan)
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text,
      },
      {
        timeout: 10000 // 10 soniya timeout
      }
    );

    res.status(200).json({ success: true, message: "Xabar yuborildi!" });
  } catch (error) {
    console.error("Error:", error.message);
    
    if (error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        success: false, 
        message: "Telegram bot javob bermadi. Qayta urinib ko'ring." 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Xabar yuborishda xatolik yuz berdi" 
      });
    }
  }
});

// Keep-alive funksiyasi - serverni uyquga ketishdan saqlaydi
const keepAlive = () => {
  const interval = setInterval(async () => {
    try {
      const response = await axios.get(`https://contact-bot-backend.onrender.com/health`, {
        timeout: 5000
      });
      console.log(`✅ Keep-alive ping: ${response.data.status} - ${new Date().toLocaleString()}`);
    } catch (error) {
      console.log(`❌ Keep-alive failed: ${error.message}`);
    }
  }, 14 * 60 * 1000); // Har 14 daqiqada

  // Process tugaganda interval'ni tozalash
  process.on('SIGINT', () => {
    clearInterval(interval);
    process.exit(0);
  });
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Server xatoligi yuz berdi' 
  });
});

// 404 handler - barcha qolgan yo'llar uchun
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint topilmadi',
    requestedPath: req.path,
    method: req.method
  });
});

const server = app.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-portda ishlayapti...`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  
  // Keep-alive'ni ishga tushirish (faqat production'da)
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Keep-alive ishga tushirildi...');
    keepAlive();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔴 SIGTERM signali olindi, server yopilmoqda...');
  server.close(() => {
    console.log('✅ Server yopildi.');
  });
});

export default app;