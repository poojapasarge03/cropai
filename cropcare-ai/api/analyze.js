import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// ========================================
// Gemini API
// ========================================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ========================================
// Multer
// ========================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ========================================
// Convert Multer Middleware to Promise
// ========================================
const uploadMiddleware = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single("image")(req, res, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

// ========================================
// Vercel API Handler
// ========================================
export default async function handler(req, res) {
  try {
    console.log("🌱 CropCare AI analysis request");

    // ------------------------------------
    // Method
    // ------------------------------------
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed.",
      });
    }

    // ------------------------------------
    // API Key
    // ------------------------------------
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    // ------------------------------------
    // Upload
    // ------------------------------------
    await uploadMiddleware(req, res);

    // ------------------------------------
    // Check Image
    // ------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image was uploaded.",
      });
    }

    // ------------------------------------
    // Validate Image
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

    console.log("📷 Image:", req.file.originalname);
    console.log("📦 Size:", req.file.size);
    console.log("📝 Type:", req.file.mimetype);

    // ========================================
    // Base64
    // ========================================
    const base64Image =
      req.file.buffer.toString("base64");

    // ========================================
    // Prompt
    // ========================================
    const prompt = `
You are CropCare AI, an agricultural plant disease detection assistant.

Carefully analyze the uploaded plant or leaf image.

Identify:

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
- Keep recommendations concise and practical.
- Do not return Markdown.
- Return only JSON.

If the image does not clearly show enough plant information:

plantName = "Unknown"
scientificName = ""
disease = "Unable to determine"
pathogen = ""
confidence = "Low"

Even when the image is unclear, provide at least:
- one symptom
- one treatment recommendation
- one prevention tip.
`;

    // ========================================
    // Gemini
    // ========================================
    console.log("🤖 Sending image to Gemini...");

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
    // Gemini Response
    // ========================================
    const rawText = response.text;

    console.log("🤖 Gemini response:");
    console.log(rawText);

    if (!rawText) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    // ========================================
    // Parse JSON
    // ========================================
    let result;

    try {
      result = JSON.parse(rawText);
    } catch (error) {
      console.error(
        "❌ Gemini JSON parsing failed:",
        rawText
      );

      return res.status(500).json({
        success: false,
        error: "AI returned an invalid analysis format.",
      });
    }

    // ========================================
    // Normalize
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
        ["Low", "Medium", "High"].includes(
          result.confidence
        )
          ? result.confidence
          : "Low",

      symptoms:
        Array.isArray(result.symptoms)
          ? result.symptoms
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim()
              )
              .map((item) => item.trim())
          : [],

      treatment:
        Array.isArray(result.treatment)
          ? result.treatment
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim()
              )
              .map((item) => item.trim())
          : [],

      prevention:
        Array.isArray(result.prevention)
          ? result.prevention
              .filter(
                (item) =>
                  typeof item === "string" &&
                  item.trim()
              )
              .map((item) => item.trim())
          : [],
    };

    // ========================================
    // Fallbacks
    // ========================================
    if (result.symptoms.length === 0) {
      result.symptoms = [
        "No clear symptoms could be reliably identified from the image.",
      ];
    }

    if (result.treatment.length === 0) {
      result.treatment = [
        "Upload a clearer image or consult a qualified agricultural expert.",
      ];
    }

    if (result.prevention.length === 0) {
      result.prevention = [
        "Provide a clear, well-lit image of the affected plant area.",
      ];
    }

    // ========================================
    // Success
    // ========================================
    return res.status(200).json({
      success: true,
      result,
    });

  } catch (error) {
    console.error(
      "❌ CropCare AI API error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Server failed to analyze the image.",
    });
  }
}