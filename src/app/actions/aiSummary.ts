"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateReportFromScript(scriptText: string, studentName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  if (!scriptText || !scriptText.trim()) {
    throw new Error("The uploaded script is empty.");
  }

  // List of stable models to automatically fallback if one is busy (503)
  const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let response: any = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert private tutor assistant. Review the following class script or transcript for student "${studentName}". Return ONLY a valid JSON object with these exact keys. Do not include markdown code blocks or extra conversational text:
{
  "title": "A short, catchy lesson title",
  "vocab": "Exactly 5 vocabulary words or target patterns with IPA pronunciation and a simple example sentence for each",
  "strengths": "What the student did exceptionally well during the class",
  "improvements": "Areas for the student to practice or improve next time",
  "parentMessage": "A warm, encouraging note to the parents summarizing the session",
  "homework": "Assigned homework instructions if any"
}

Class Script / Transcript:
"""
${scriptText}
"""`,
              },
            ],
          },
        ],
      });
      break; // Successfully got a response, exit loop!
    } catch (err) {
      console.warn(`Model ${modelName} busy, trying next...`);
    }
  }

  if (!response) {
    throw new Error("All AI model servers are currently experiencing high demand. Please try again in a few seconds.");
  }

  try {
    const rawText = response.text || "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON structure.");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("AI Script Parsing error:", error);
    throw new Error(error.message || "Failed to process script. Please make sure the output is valid.");
  }
}