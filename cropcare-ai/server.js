import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// Middleware
// ========================================
app.use(cors());
app.use(express.json());

// ========================================
// Image Upload Configuration
// ========================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// ========================================
// Check Gemini API Key
// ========================================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in .env file");
  process.exit(1);
}

// ========================================
// Google Gemini AI
// ========================================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ========================================
// Health Check Route
// ========================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CropCare AI server is running!",
  });
});

// ========================================
// Analyze Plant Image
// ========================================
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    console.log("\n========================================");
    console.log("🌱 New plant analysis request");
    console.log("========================================");

    // ------------------------------------
    // Check if image exists
    // ------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image was uploaded.",
      });
    }

    console.log("📷 Image received:", req.file.originalname);
    console.log("📦 Image size:", req.file.size, "bytes");
    console.log("📝 Image type:", req.file.mimetype);

    // ------------------------------------
    // Validate image type
    // ------------------------------------
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "Please upload a JPG, PNG, or WEBP image.",
      });
    }

    // ------------------------------------
    // Convert image to Base64
    // ------------------------------------
    const base64Image = req.file.buffer.toString("base64");

    // ========================================
    // Gemini Prompt
    // ========================================
    const prompt = `
You are CropCare AI, an agricultural plant disease detection assistant.

Carefully analyze the uploaded plant or leaf image.

Your task is to identify:

1. Plant name
2. Scientific name
3. Possible disease
4. Likely pathogen or cause
5. Confidence level
6. Visible symptoms
7. Recommended treatment
8. Prevention tips

IMPORTANT RULES:

- Analyze only what can reasonably be determined from the image.
- Do not invent symptoms that are not visually supported.
- Do not claim a disease with high confidence when the image is unclear.
- confidence MUST be exactly one of:
  "Low", "Medium", or "High".
- Every symptom must be a separate array item.
- Every treatment recommendation must be a separate array item.
- Every prevention tip must be a separate array item.
- Keep all recommendations concise and practical.
- Do not return Markdown.
- Return only the requested JSON structure.

If the image does not clearly show enough plant information:

plantName = "Unknown"
scientificName = ""
disease = "Unable to determine"
pathogen = ""
confidence = "Low"

Even when the image is unclear, provide:
- at least one useful symptom
- at least one useful treatment recommendation
- at least one useful prevention tip

Make sure the response follows the provided JSON schema exactly.
`;

    console.log("🤖 Sending image to Gemini...");

    // ========================================
    // Gemini API Request
    // ========================================
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

      // ========================================
      // Structured JSON Response
      // ========================================
      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: "OBJECT",

          properties: {
            plantName: {
              type: "STRING",
            },

            scientificName: {
              type: "STRING",
            },

            disease: {
              type: "STRING",
            },

            pathogen: {
              type: "STRING",
            },

            confidence: {
              type: "STRING",
              enum: ["Low", "Medium", "High"],
            },

            symptoms: {
              type: "ARRAY",
              items: {
                type: "STRING",
              },
            },

            treatment: {
              type: "ARRAY",
              items: {
                type: "STRING",
              },
            },

            prevention: {
              type: "ARRAY",
              items: {
                type: "STRING",
              },
            },
          },

          required: [
            "plantName",
            "scientificName",
            "disease",
            "pathogen",
            "confidence",
            "symptoms",
            "treatment",
            "prevention",
          ],
        },
      },
    });

    // ========================================
    // Get Gemini Response
    // ========================================
    const rawText = response.text;

    console.log("\n🤖 Gemini response received:");
    console.log(rawText);

    if (!rawText) {
      throw new Error("Gemini returned an empty response.");
    }

    // ========================================
    // Parse JSON
    // ========================================
    let result;

    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error("❌ JSON parsing failed.");
      console.error("Gemini returned:", rawText);

      return res.status(500).json({
        success: false,
        error: "AI returned an invalid analysis format.",
      });
    }

    // ========================================
    // Normalize Gemini Result
    // ========================================
    result = {
      plantName:
        typeof result.plantName === "string" &&
        result.plantName.trim()
          ? result.plantName.trim()
          : "Unknown",

      scientificName:
        typeof result.scientificName === "string"
          ? result.scientificName.trim()
          : "",

      disease:
        typeof result.disease === "string" &&
        result.disease.trim()
          ? result.disease.trim()
          : "Unable to determine",

      pathogen:
        typeof result.pathogen === "string"
          ? result.pathogen.trim()
          : "",

      confidence:
        ["Low", "Medium", "High"].includes(result.confidence)
          ? result.confidence
          : "Low",

      symptoms:
        Array.isArray(result.symptoms)
          ? result.symptoms
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim().length > 0
              )
              .map((item) => item.trim())
          : [],

      treatment:
        Array.isArray(result.treatment)
          ? result.treatment
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim().length > 0
              )
              .map((item) => item.trim())
          : [],

      prevention:
        Array.isArray(result.prevention)
          ? result.prevention
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim().length > 0
              )
              .map((item) => item.trim())
          : [],
    };

    // ========================================
    // Make Sure Arrays Are Never Empty
    // ========================================
    if (result.symptoms.length === 0) {
      result.symptoms = [
        "No clear symptoms could be reliably identified from the image.",
      ];
    }

    if (result.treatment.length === 0) {
      result.treatment = [
        "Upload a clearer image or consult a qualified agricultural expert before treatment.",
      ];
    }

    if (result.prevention.length === 0) {
      result.prevention = [
        "Provide a clear, well-lit image of the affected plant area for better assessment.",
      ];
    }

    // ========================================
    // Log Final Result
    // ========================================
    console.log("\n========================================");
    console.log("✅ Final structured result:");
    console.log("========================================");
    console.log(JSON.stringify(result, null, 2));

    // ========================================
    // Send Result to Frontend
    // ========================================
    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ Gemini analysis error");
    console.error("========================================");
    console.error(error);

    // ------------------------------------
    // File size error
    // ------------------------------------
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "Image is too large. Maximum size is 5 MB.",
      });
    }

    // ------------------------------------
    // Gemini API error
    // ------------------------------------
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error:
          error.message ||
          "Gemini API request failed.",
      });
    }

    // ------------------------------------
    // General error
    // ------------------------------------
    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Failed to analyze the image. Please try again.",
    });
  }
});

// ========================================
// Handle Unknown Routes
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found.",
  });
});

// ========================================
// Start Server
// ========================================
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n========================================");
  console.log("🌱 CropCare AI Server");
  console.log("========================================");
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`🔍 Analysis endpoint: http://localhost:${PORT}/api/analyze`);
  console.log("========================================\n");
});