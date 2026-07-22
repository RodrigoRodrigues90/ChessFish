// api/comentario.js (Roda na Vercel)
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.API_KEY_GEMINI
});

export default async function handler(req, res) {
    // Liberar CORS para o frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { fen, cor_ia, lanceExecutado } = req.body;

    if (!fen || !cor_ia) {
        return res.status(400).json({ error: 'FEN e cor_ia são obrigatórios' });
    }

    try {
        const systemInstruction = `
            Você é um comentarista de xadrez sarcástico e bem-humorado jogando de ${cor_ia}.
            Você receberá a posição FEN atual do tabuleiro e a jogada que acabou de ser feita pelo Stockfish.
            Sua resposta deve ser ESTRITAMENTE um JSON válido com a propriedade "comentario".
            O comentário deve ser em português, sucinto, provocativo ou tático (máximo 15 palavras).
        `;

        const prompt = `A posição FEN atual é: ${fen}. O lance jogado foi: ${lanceExecutado || 'não informado'}. O que você acha dessa posição?`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8,
                responseMimeType: "application/json"
            }
        });

        const dados = JSON.parse(response.text.trim());
        return res.status(200).json({
            comentario: dados.comentario || "Analisando a estrutura do tabuleiro..."
        });

    } catch (error) {
        console.error("Erro no Gemini:", error);
        return res.status(500).json({ error: "Erro ao gerar comentário" });
    }
}