
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

async function listModels() {
    try {
        // There isn't a direct listModels method on the client instance in some versions,
        // but usually it's available via a ModelService or similar.
        // However, the error message suggested calling ListModels.
        // In the Node SDK, it might be exposed differently or we might just have to try a known working one.

        // Actually, looking at the docs/SDK structure, currently there isn't a simple public helper for listModels in the high-level generic client 
        // without using the model manager or generic request.

        // Let's try to just test a simple prompt with a few common names to see which works.
        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",
            "gemini-pro"
        ];

        console.log("Testing models...");

        for (const modelName of candidates) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`✅ Success: ${modelName}`);
                // If one works, we can stop or list all working ones
            } catch (error: any) {
                console.log(`❌ Failed: ${modelName} - ${error.message?.split('[')[0]}`); // simplify error
            }
        }

    } catch (error) {
        console.error("Script Error:", error);
    }
}

listModels();
