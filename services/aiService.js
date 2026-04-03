const axios = require('axios');

const generateAutoReply = async (reviewText) => {
    try {
        const response = await axios.post(
            'https://router.huggingface.co/v1/chat/completions',
            {
                model: 'deepseek-ai/DeepSeek-R1:novita',
                messages: [{
                    role: 'user',
                    content: `Generate a short, professional and friendly reply for the following customer review: "${reviewText}". Keep it under 3 sentences.`,
                }],
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