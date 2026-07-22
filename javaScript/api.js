const API_URL = 'https://chess-stockfish-iota.vercel.app/api/jogada-ia';
const GEMINI_API_URL = '/api/comentario';

/**
 * Envia o FEN atual para o Stockfish e retorna o movimento calculado.
 * @param {string} fen - Notação FEN do tabuleiro atual
 * @param {number} level - Profundidade de análise do Stockfish
 * @returns {Promise<{movimento: string, ismate?: string}>}
 */
export async function obterJogadaStockfish(fen, level = 12) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen, level })
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        const data = await response.json();
        return data; // Retorna { movimento: 'e2e4', ismate: 'cp' / 'mate' }
    } catch (error) {
        console.error("Falha ao comunicar com o backend do Stockfish:", error);
        return null;
    }
}
/**
 * Solicita ao Gemini um comentário em tempo real sobre a jogada realizada.
 * @param {string} fen - Notação FEN atualizada após o lance
 * @param {string} corIA - 'Brancas' ou 'Pretas'
 * @param {string} lanceExecutado - Notação do lance ex: 'e2e4'
 * @returns {Promise<{comentario: string}>}
 */
export async function obterComentarioGemini(fen, corIA, lanceExecutado) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                fen, 
                cor_ia: corIA === 'w' ? 'Brancas' : 'Pretas',
                lanceExecutado 
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na API Gemini: ${response.statusText}`);
        }

        const data = await response.json();
        return data; // Retorna { comentario: '...' }
    } catch (error) {
        console.error("Falha ao comunicar com o Gemini:", error);
        return { comentario: "A IA está concentrada na partida." };
    }
}