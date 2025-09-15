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

app.use(bodyParser.json());

// Contact formdan murojaat qabul qilish
app.post("/contact", async (req, res) => {
  try {
    const { name, subject, email, message } = req.body;

    const text = `
📩 Yangi murojaat keldi:
👤 Ism: ${name}
📌 Mavzu: ${subject}
📧 Email: ${email}
📝 Xabar: ${message}
`;

    // Telegram botga yuborish
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text,
      }
    );

    res.status(200).json({ success: true, message: "Xabar yuborildi!" });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ success: false, message: "Xatolik yuz berdi" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-portda ishlayapti...`);
});
