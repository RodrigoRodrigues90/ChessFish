import { Tabuleiro } from './tabuleiro.js';
import { Clock } from './clock.js';
import { coordParaAlgebraico, desenharCoordenadas, gerarFEN } from './notations.js';

const DOM_TABULEIRO = document.getElementById('tabuleiro');
const DOM_TIMER_W = document.getElementById('timer-w');
const DOM_TIMER_B = document.getElementById('timer-b');
const jogo = new Tabuleiro();

//---------------modal de escolha de cor----------------//
let corJogador = 'w'; // 'w' para Brancas (padrão) ou 'b' para Pretas

// Captura dos botões de escolha
const modalCor = document.getElementById('modal-selecao-cor');
const painelJogo = document.getElementById('game-container');
const btnBrancas = document.getElementById('btn-jogar-brancas');
const btnPretas = document.getElementById('btn-jogar-pretas');

btnBrancas.addEventListener('click', () => iniciarJogoComCor('w'));
btnPretas.addEventListener('click', () => iniciarJogoComCor('b'));

function iniciarJogoComCor(cor) {
    corJogador = cor;
    modalCor.classList.add('modal-oculto'); // Oculta o modal
    // Liga ou desliga o reverse com base na cor escolhida
    painelJogo.classList.toggle('visao-pretas', corJogador === 'b');
    // Inicia o relógio somente após a escolha da cor
    relogio.iniciar(); 
    renderizarTabuleiro();
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
    if (jogo.jogoFinalizado) return;

    const corPecaClicada = jogo.obterCorPeca(linha, coluna);
    const clicouEmDestinoValido = movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);

    // Mover peça para destino válido
    if (casaSelecionada && clicouEmDestinoValido) {
        const TemPecaInimiga = jogo.obterPeca(linha, coluna);
        
        // converter notações:
        const origem = coordParaAlgebraico(casaSelecionada.linha, casaSelecionada.coluna);
        const destino = coordParaAlgebraico(linha, coluna);

        console.log(`Movimento realizado: de ${origem} para ${destino}`);

        // Gera a FEN da posição atual pós-jogada
        const fenAtual = gerarFEN(jogo);
        console.log("FEN Atual:", fenAtual);

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