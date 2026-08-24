import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No image was uploaded.",
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const prompt = `
You are CropCare AI, an agricultural plant disease detection assistant.

Analyze the uploaded plant image.

Return a clear assessment with:
1. Plant name
2. Possible disease or condition
3. Confidence level
4. Visible symptoms
5. Recommended treatment
6. Prevention tips

If the image is unclear or does not show a plant clearly, say so instead of guessing.

This is general AI-assisted guidance and not a substitute for advice from a qualified agricultural expert.
`;

    const response = await ai.models.generateContent({
     model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    res.json({
      result: response.text,
    });
  } catch (error) {
    console.error("Gemini analysis error:", error);

    res.status(500).json({
      error: "Failed to analyze the image.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`CropCare AI server running at http://localhost:${PORT}`);
});