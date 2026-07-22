import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

// --- Configuração da API ---
if (!process.env.API_KEY_GEMINI) {
    console.error("ERRO: A variável de ambiente API_KEY_GEMINI não está definida.");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.API_KEY_GEMINI
});
const model = "gemini-2.5-flash";

// Objeto para armazenar as sessões de chat ativas, indexadas pelo sessionId
const activeGameSessions = new Map();

// --- Configuração do Servidor Express ---
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

/**
 * Cria ou recupera uma ChatSession para uma partida específica.
 * A systemInstruction força uma resposta estritamente em JSON.
 */
function createOrGetChatSession(sessionId, cor_ia) {
    if (activeGameSessions.has(sessionId)) {
        return activeGameSessions.get(sessionId);
    }

    // Instrução do sistema configurada para JSON estruturado
    const systemInstruction = `
        Você é o motor de pensamento de uma IA de xadrez jogando de ${cor_ia}.
        Você receberá a posição FEN atual do tabuleiro.
        Sua resposta deve ser ESTRITAMENTE um objeto JSON válido contendo duas propriedades:
        1. "movimento": A notação UCI do seu lance escolhido (ex: "e7e5", "g1f3", "e7e8q"). NUNCA use "exe5" ou "O-O".
        2. "comentario": Um pensamento sucinto e bem-humorado em português sobre a posição ou sobre a sua estratégia (máximo 15 palavras).
    `;

    const newChat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7, // Balanço ideal entre criatividade nos comentários e coerência tática
            responseMimeType: "application/json" // Força o Gemini a responder apenas em JSON válido
        }
    });

    activeGameSessions.set(sessionId, newChat);
    console.log(`Nova ChatSession criada para o ID: ${sessionId}`);

    return newChat;
}

// --- Rota da IA de Xadrez ---
app.post('/api/jogada-ia', async (req, res) => {
    const { fen, cor_ia, sessionId, feedBackError } = req.body;

    if (!fen || !cor_ia || !sessionId) {
        return res.status(400).json({ error: "FEN, cor_ia e sessionId são obrigatórios." });
    }

    try {
        // 1. Recupera ou cria a sessão de chat (com contexto mantido)
        const chat = createOrGetChatSession(sessionId, cor_ia);

        // 2. Constrói o prompt
        let prompt;
        if (feedBackError) {
            prompt = feedBackError;
        } else {
            prompt = `A posição FEN atual é: ${fen}. Qual é o seu movimento e o seu pensamento nessa posição?`;
        }

        console.log(`ID: ${sessionId} | Calculando jogada e comentário para ${cor_ia}...`);

        // 3. Enviar mensagem para a sessão de chat
        const response = await chat.sendMessage({
            message: prompt
        });

        // 4. Faz o parse do JSON devolvido pelo Gemini
        const dadosIa = JSON.parse(response.text.trim());

        console.log(`ID: ${sessionId} | Gemini respondeu:`, dadosIa);

        // 5. Devolve o movimento e o comentário diretamente para o front-end
        res.json({
            movimento: dadosIa.movimento ? dadosIa.movimento.toLowerCase().trim() : null,
            comentario: dadosIa.comentario || "Analisando a melhor estrutura no tabuleiro..."
        });

    } catch (error) {
        console.error("Erro na chamada à API Gemini:", error);
        
        // Em caso de erro na sessão, exclui para não travar lances futuros
        activeGameSessions.delete(sessionId);
        
        return res.status(500).json({ 
            error: "Erro interno do servidor ao consultar a IA.", 
            details: error.message 
        });
    }
});

// --- Rota para Limpar a Sessão ---
app.post('/api/fim-partida', (req, res) => {
    const { sessionId } = req.body;
    if (activeGameSessions.has(sessionId)) {
        activeGameSessions.delete(sessionId);
        return res.json({ message: `Sessão ${sessionId} removida com sucesso.` });
    }
    res.status(404).json({ message: "Sessão não encontrada." });
});

// --- Iniciar o Servidor ---
app.listen(port, () => {
    console.log(`Servidor Express a correr em http://localhost:${port}`);
});