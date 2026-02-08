// Quick test to verify gemini-2.5-flash works
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

async function test() {
    console.log("Testing gemini-2.5-flash model...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Say 'Hello, the API works!'");
        const response = await result.response;
        console.log("✅ SUCCESS! Response:", response.text());
    } catch (error: any) {
        console.log("❌ FAILED:", error.message);
    }
}

test();
