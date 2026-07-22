import { Tabuleiro } from './tabuleiro.js';
import { Clock } from './clock.js';
import { desenharCoordenadas, gerarFEN, algebraicoParaCoord  } from './notations.js';
import { obterJogadaStockfish } from './api.js';

const DOM_TABULEIRO = document.getElementById('tabuleiro');
const DOM_TIMER_W = document.getElementById('timer-w');
const DOM_TIMER_B = document.getElementById('timer-b');
const jogo = new Tabuleiro();

//---------------modal de escolha de dificuldade----------------//
let nivelDificuldade = 8;

const modalDificuldade = document.getElementById('modal-dificuldade');
const btnsDificuldade = document.querySelectorAll('.btn-dificuldade');

// 1. Passo 1: Selecionar Dificuldade
btnsDificuldade.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        nivelDificuldade = parseInt(target.dataset.level, 10);
        
        // Transição: Esconde modal de dificuldade e exibe modal de cor
        modalDificuldade.classList.add('modal-oculto');
    });
});

//---------------modal de escolha de cor----------------//
let corJogador = 'w'; // 'w' para Brancas (padrão) ou 'b' para Pretas
let corIA = 'b';      // Inverso de corJogador
let processandoIA = false;

// Captura dos botões de escolha
const modalCor = document.getElementById('modal-selecao-cor');
const painelJogo = document.getElementById('game-container');
const btnBrancas = document.getElementById('btn-jogar-brancas');
const btnPretas = document.getElementById('btn-jogar-pretas');

btnBrancas.addEventListener('click', () => iniciarJogoComCor('w'));
btnPretas.addEventListener('click', () => iniciarJogoComCor('b'));

function iniciarJogoComCor(cor) {
    corJogador = cor;
    corIA = cor === 'w' ? 'b' : 'w'; // Inverte a cor da IA
    modalCor.classList.add('modal-oculto'); // Oculta o modal
    // Liga ou desliga o reverse com base na cor escolhida
    painelJogo.classList.toggle('visao-pretas', corJogador === 'b');
    // Inicia o relógio somente após a escolha da cor
    relogio.iniciar(); 
    renderizarTabuleiro();

    // Se o jogador escolheu jogar de Pretas, a IA (Brancas) joga primeiro!
    if (jogo.turno === corIA) {
        setTimeout(() => {
            executarTurnoIA();
        }, 1500); // Pequeno atraso para sensação mais natural
    }
}

//------------------------------ Audios ------------------------------//
const audioMovimento = new Audio('./sounds/chesspiece.mp3');
const audioXeque = new Audio('./sounds/xeque.mp3');
const audioXequeMate = new Audio('./sounds/win.mp3');
const audioCaptura = new Audio('./sounds/botão.mp3');
const audioAlerta = new Audio('./sounds/clock.mp3');
const music = new Audio('./sounds/music.mp3');
music.loop = true;
music.volume = 0.3; // Volume ajustado para música de fundo não encobrir os efeitos

let musicaIniciada = false;
let musicaPausada = false;

function tocarSom(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(error => console.log("Erro ao tocar áudio:", error));
}

// Inicia a música no primeiro clique do usuário para evitar bloqueio do navegador
function tentarIniciarMusica() {
    if (!musicaIniciada) {
        music.play().then(() => {
            musicaIniciada = true;
        }).catch(() => { });
    }
}
// pausa ou retoma a música de fundo ao clicar no botão
function alternarMusica() {
    if (musicaPausada) {
        music.pause();
        musicaPausada = true;
    } else {
        music.play();
        musicaPausada = false;
    }
}

const btnMutarAudio = document.getElementById('btn-mutar-audio');
const iconeAudio = document.getElementById('icone-audio');

btnMutarAudio.addEventListener('click', () => {
    musicaPausada = !musicaPausada;
    
    // Atualiza o ícone e a classe visual do botão
    iconeAudio.textContent = musicaPausada ? '🔇' : '🔊';
    btnMutarAudio.classList.toggle('mutado', musicaPausada);
    alternarMusica();
});


// ----------- Cria o relógio com 5 minutos para cada jogador -----------//
// Flags para controlar se o alerta já foi tocado para cada jogador
let alertaTocadoW = false;
let alertaTocadoB = false;

const relogio = new Clock(
    5,
    // Função onTick: Executada a cada 1 segundo pelo relógio
    (dados) => {
        DOM_TIMER_W.textContent = dados.w;
        DOM_TIMER_B.textContent = dados.b;

        const elBranca = document.querySelector('.timer-conteiner.branca');
        const elPreta = document.querySelector('.timer-conteiner.preto');

        if (elBranca && elPreta) {
            elBranca.classList.toggle('ativo', dados.turnoAtivo === 'w');
            elPreta.classList.toggle('ativo', dados.turnoAtivo === 'b');

            const emPerigoW = dados.wSegundos <= 30;
            const emPerigoB = dados.bSegundos <= 30;

            // Toca o som APENAS UMA VEZ no momento exato em que entra nos 30 segundos
            if (emPerigoW && !alertaTocadoW) {
                tocarSom(audioAlerta);
                alertaTocadoW = true;
            }

            if (emPerigoB && !alertaTocadoB) {
                tocarSom(audioAlerta);
                alertaTocadoB = true;
            }

            // Aplica/remove a classe CSS de perigo
            elBranca.classList.toggle('perigo', emPerigoW);
            elPreta.classList.toggle('perigo', emPerigoB);
        }
    },
    (quemPerdeu) => {
        jogo.jogoFinalizado = true;
        const vencedor = quemPerdeu === 'w' ? 'Pretas' : 'Brancas';
        alert(`Acabou o tempo! As ${vencedor} vencem.`);
        window.location.reload();
    }
);

//------------------------------ Renderização do tabuleiro ------------------------------//
const UNICODE_PECAS = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟'
};

function renderizarTabuleiro() {
    DOM_TABULEIRO.innerHTML = '';

    // Inverte o tabuleiro na tela se o jogador for de Pretas ('b')
    const linhas = corJogador === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const colunas = corJogador === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

    //faz uma checagem se o rei está em xeque.
    const reiEmxeque = jogo.estaEmXeque(jogo.turno);
    let casaRei = null;

    if (reiEmxeque) {
        const reiAtacado = jogo.turno === 'w' ? 'K' : 'k';
        for (let linha = 0; linha < 8; linha++) {
            for (let coluna = 0; coluna < 8; coluna++) {
                if (jogo.obterPeca(linha, coluna) === reiAtacado) {
                    casaRei = { linha, coluna };
                    break;
                }
            }
            if (casaRei) break;
        }
    }

    for (let linha of linhas) {
        for (let coluna of colunas) {
            const casa = document.createElement('div');
            casa.classList.add('casa');

            const ehClara = (linha + coluna) % 2 === 0;
            casa.classList.add(ehClara ? 'clara' : 'escura');

            casa.dataset.linha = linha;
            casa.dataset.coluna = coluna;

            // Destaque da casa selecionada
            if (casaSelecionada && casaSelecionada.linha === linha && casaSelecionada.coluna === coluna) {
                casa.classList.add('selecionada');
            }

            // Destaque do rei em xeque
            if (reiEmxeque && casaRei && casaRei.linha === linha && casaRei.coluna === coluna) {
                casa.classList.add('reiemxeque');
            }

            // Indicador de movimento válido
            const ehMovimentoValido = movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);
            if (ehMovimentoValido) {
                const indicador = document.createElement('div');
                indicador.classList.add('indicador-movimento');
                casa.appendChild(indicador);
            }

            const codigoPeca = jogo.obterPeca(linha, coluna);
            if (codigoPeca) {
                const peca = document.createElement('span');
                peca.classList.add('peca', codigoPeca === codigoPeca.toUpperCase() ? 'branca' : 'preta');
                peca.textContent = UNICODE_PECAS[codigoPeca];
                casa.appendChild(peca);
            }

            casa.addEventListener('click', () => tratarCliqueCasa(linha, coluna));
            DOM_TABULEIRO.appendChild(casa);
        }
    }
    // Desenha as coordenadas laterais e inferiores
    desenharCoordenadas(DOM_TABULEIRO, corJogador);
}

//--------------- Controle de Seleção e Jogadas ---------------//
let movimentosPossiveis = [];
let casaSelecionada = null;

function tratarCliqueCasa(linha, coluna) {
    tentarIniciarMusica(); // Tenta ligar a música no primeiro clique
    // Bloqueia cliques se o jogo acabou OU se for a vez da IA jogar
    if (jogo.jogoFinalizado || jogo.turno === corIA || processandoIA) return;

    const corPecaClicada = jogo.obterCorPeca(linha, coluna);
    const clicouEmDestinoValido = movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);

    // Mover peça para destino válido
    if (casaSelecionada && clicouEmDestinoValido) {
        const TemPecaInimiga = jogo.obterPeca(linha, coluna);
        
        jogo.moverPeca(casaSelecionada.linha, casaSelecionada.coluna, linha, coluna);
        limparSelecao();

        // Checa Xeque-Mate ou Empate após a jogada
        const estadoFim = jogo.verificarFimDeJogo ? jogo.verificarFimDeJogo() : null;

        if (estadoFim) {
            relogio.parar();
            renderizarTabuleiro();
            if (estadoFim.tipo === 'XEQUE_MATE') {
                tocarSom(audioXequeMate);
                setTimeout(() => {
                    alert(`XEQUE-MATE! Vitória das ${estadoFim.vencedor}.`);
                }, 1000);
            } else {
                setTimeout(() => {
                    alert(`EMPATE por afogamento!`);
                }, 1000);
            }
            return;
        }

        // Toca som adequado para a jogada (Xeque vs Movimento Padrão)
        if (jogo.estaEmXeque && jogo.estaEmXeque(jogo.turno)) {
            tocarSom(audioXeque);
        } else {
            if (TemPecaInimiga) {
                tocarSom(audioCaptura); // Som de captura
            }
            tocarSom(audioMovimento);
        }

        renderizarTabuleiro();

        // Alterna o relógio para o próximo jogador
        if (typeof relogio.mudarTurno === 'function') {
            relogio.mudarTurno(jogo.turno);
        } else if (typeof relogio.alternarTurno === 'function') {
            relogio.alternarTurno();
        }
        // Chama a IA imediatamente após a jogada do jogador humano
        setTimeout(() => {
            executarTurnoIA();
        }, 3000); // Pequeno atraso de 300ms para sensação mais natural
        return;
    }

    // Selecionar uma peça própria
    if (corPecaClicada === jogo.turno) {
        casaSelecionada = { linha, coluna };
        movimentosPossiveis = jogo.obterMovimentosValidos(linha, coluna);
        renderizarTabuleiro();
        return;
    }

    // Clique em local inválido
    limparSelecao();
    renderizarTabuleiro();
}

function limparSelecao() {
    casaSelecionada = null;
    movimentosPossiveis = [];
}

//=============================== Função para a IA jogar ==============================//
async function executarTurnoIA() {
    if (jogo.jogoFinalizado || processandoIA) return;

    processandoIA = true;
    
    // 1. Gera a FEN da posição atual para enviar ao Stockfish
    const fenAtual = gerarFEN(jogo);

    // 2. Chama o backend
    const resposta = await obterJogadaStockfish(fenAtual, nivelDificuldade);

    if (resposta && resposta.movimento) {
        const uci = resposta.movimento; // Ex: "e2e4" ou "e7e8q"
        
        // Extrai as casas de origem e destino da string UCI
        const origemStr = uci.substring(0, 2); // Ex: "e2"
        const destinoStr = uci.substring(2, 4); // Ex: "e4"

        const origem = algebraicoParaCoord(origemStr);
        const destino = algebraicoParaCoord(destinoStr);

        // A. DETECCÇÃO DE CAPTURA (ANTES DE MOVER)
        const pecaDestino = jogo.obterPeca(destino.linha, destino.coluna);
        const ehCaptura = pecaDestino !== ''

        // 3. Executa a jogada no tabuleiro
        jogo.moverPeca(origem.linha, origem.coluna, destino.linha, destino.coluna);
        tocarSom(audioMovimento);
        if (ehCaptura) {
            tocarSom(audioCaptura);
        }
        // 3.1 Checa se a jogada da IA colocou o jogador humano em xeque
        if (jogo.estaEmXeque(corJogador)) {
            tocarSom(audioXeque);
        }

        // 4. Checa Fim de Jogo
        const estadoFim = jogo.verificarFimDeJogo();
        if (estadoFim) {
            relogio.parar();
            renderizarTabuleiro();
            if (estadoFim.tipo === 'XEQUE_MATE') {
                tocarSom(audioXequeMate);
                alert(`XEQUE-MATE! Vitória das ${estadoFim.vencedor}.`);
            } else {
                alert(`EMPATE por afogamento (Stalemate)!`);
            }
            processandoIA = false;
            return;
        }

        // 5. Alterna relógio e atualiza tela
        if (typeof relogio.mudarTurno === 'function') {
            relogio.mudarTurno(jogo.turno);
        } else if (typeof relogio.alternarTurno === 'function') {
            relogio.alternarTurno();
        }

        renderizarTabuleiro();
    }

    processandoIA = false;
}