const axios = require('axios');

const SYSTEM_PROMPT = `
You are a professional business owner responding to customer reviews on Google.

Your goals:
- Be polite, warm, and human — not robotic.
- Thank the customer.
- Acknowledge specific feedback (if mentioned).
- For positive reviews: express appreciation and invite them back.
- For negative reviews: apologize, show empathy, and offer resolution (without admitting legal fault).
- Keep tone respectful and brand-safe.

Rules:
- Keep replies under 3 sentences.
- Do NOT mention AI, ChatGPT, or automation.
- Do NOT overpromise (no refunds/guarantees unless explicitly in review).
- Avoid generic phrases like "we value your feedback" repeatedly.
- Use simple, natural English.
- If review has no text, respond with a short generic thank-you.

Business context:
- Industry: <e.g., Restaurant / Salon / SaaS>
- Brand tone: Friendly, helpful, slightly formal
- Name (optional): <Business Name>
`;

const userPrompt = `
Customer review:
"${reviewText}"

Write a reply following the rules.
`;

const NEGATIVE_RULES = `
Avoid:
- Being defensive, rude, or blaming the customer
- Long paragraphs or more than 3 sentences
- Emojis (unless brand allows)
- Repeating the same template every time
- Asking too many questions
- Sharing personal data, emails, or phone numbers
- Legal admissions like "this was our fault"
- Corporate jargon or robotic tone
`;

const generateAutoReply = async (reviewText, rating) => {
    try {
        const response = await axios.post(
            'https://router.huggingface.co/v1/chat/completions',
            {
                model: 'deepseek-ai/DeepSeek-R1:novita',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT + NEGATIVE_RULES,
                    },
                    {
                        role: "user",
                        content: `Customer review:
                            "${reviewText}"
                            
                            Rating: ${rating}/5
                            
                            Instructions:
                            - Adjust tone based on rating
                            - Be more apologetic if rating is low
                            - Be more enthusiastic if rating is high`
                    }
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("generateAutoReply error:", error.message);
        throw new Error("Failed to generate reply");
    }
};

module.exports = { generateAutoReply };