const Groq = require("groq-sdk");

// اپنی نئی GROQ API Key یہاں پیسٹ کریں
const groq = new Groq({ apiKey: "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"  });

const askGemini = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "No prompt provided" });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are PROTRADER AI, a smart and helpful trading assistant. Answer in simple English."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile", // یہ Groq کا بہترین ماڈل ہے
        });

        const answer = chatCompletion.choices[0]?.message?.content || "No response.";
        
        console.log("Success: Response received from Groq!");
        res.json({ answer: answer });

    } catch (error) {
        console.error("Groq Error Detail:", error.message);
        res.status(500).json({ 
            answer: "Server connected but AI is busy. Please try again." 
        });
    }
};

module.exports = { askGemini };