"use server";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateReportFromScript(scriptText: string, studentName: string) {
  if (!scriptText || !scriptText.trim()) {
    throw new Error("The uploaded script is empty.");
  }

  try {
  const response = await ai.models.generateContent({
  model: "gemini-3.5-flash", // 👈 Use this or "gemini-3.8-flash"
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
    const rawText = response.text || "{}";

    // Safely extract the JSON object using regex
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