import { Tabuleiro } from './tabuleiro.js';
import { Clock } from './clock.js';
import { desenharCoordenadas, gerarFEN, algebraicoParaCoord } from './notations.js';
import { obterJogadaStockfish, obterComentarioGemini } from './api.js';
import { exibirModalFimDeJogo, fecharModalFimDeJogo } from './fimdejogo.js';

let sessionId = null;//desativado temporariamente 
const elComentario = document.getElementById('texto-comentario');
const DOM_TABULEIRO = document.getElementById('tabuleiro');
const DOM_TIMER_W = document.getElementById('timer-w');
const DOM_TIMER_B = document.getElementById('timer-b');
const jogo = new Tabuleiro();
//--------------- VARIÁVEIS DE ESTADO ----------------//
let corJogador = 'w'; // 'w' para Brancas (padrão) ou 'b' para Pretas
let corIA = 'b';      // Inverso de corJogador
let nivelDificuldade = 8;
let processandoIA = false;
let estadoAnterior = null;
let podeDesfazer = false;
let oportunidade = 3;

// Arrays para guardar o histórico das peças capturadas
const capturadasPeloJogador = [];
const capturadasPelaIA = [];

//--------------- ELEMENTOS DE INTERFACE ----------------//
const nivelTitulo = document.getElementById('nivel-titulo')
const modalCor = document.getElementById('modal-selecao-cor');
const modalDificuldade = document.getElementById('modal-dificuldade');
const painelJogo = document.getElementById('game-container');

const btnBrancas = document.getElementById('btn-jogar-brancas');
const btnPretas = document.getElementById('btn-jogar-pretas');
const btnsDificuldade = document.querySelectorAll('.btn-dificuldade');
const painelPecasJogador = document.getElementById('pecas-capturadas-jogador');
const painelPecasIA = document.getElementById('pecas-capturadas-ia');
const btnDesfazer = document.getElementById('btn-desfazer');
const btnDesistir = document.getElementById('btn-desistir');

//--------------- PASSO 1: ESCOLHA DA COR ----------------//
btnBrancas.addEventListener('click', () => selecionarCor('w'));
btnPretas.addEventListener('click', () => selecionarCor('b'));

function selecionarCor(cor) {
    corJogador = cor;
    corIA = cor === 'w' ? 'b' : 'w'; // Inverte a cor da IA

    // Transição: Esconde modal de cor e abre o de dificuldade
    modalCor.classList.add('modal-oculto');
    modalDificuldade.classList.remove('modal-oculto');
}

//--------------- PASSO 2: ESCOLHA DA DIFICULDADE E INÍCIO ----------------//
btnsDificuldade.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        nivelDificuldade = parseInt(target.dataset.level, 10);

        // Oculta o modal de dificuldade
        modalDificuldade.classList.add('modal-oculto');
        definirDificuldade(nivelDificuldade);

        // Inicia a partida com as configurações definidas
        iniciarJogo();
    });
});
function definirDificuldade(nivel) {
    switch (nivel) {
        case 1:
            nivelTitulo.textContent = '(Iniciante)';
            break;
        case 8:
            nivelTitulo.textContent = '(Medio)';
            break;
        case 16:
            nivelTitulo.textContent = '(Avançado)';
            break;
    }
}

function iniciarJogo() {
    // Cria um ID de sessão único para esta partida 
    sessionId = `partida_${Date.now()}`;

    tentarIniciarMusica(); // Tenta ligar a música no primeiro clique
    // Ajusta a visão do tabuleiro com base na cor escolhida no Passo 1
    painelJogo.classList.toggle('visao-pretas', corJogador === 'b');

    // Inicia a renderização e o relógio
    renderizarTabuleiro();
    relogio.iniciar();

    // Se o jogador escolheu Pretas, a IA (Brancas) faz o primeiro lance
    if (jogo.turno === corIA) {
        setTimeout(() => { //tempo para sensação de pensamento da IA
            executarTurnoIA();
        }, 1500);
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
music.volume = 1; // Volume ajustado para música de fundo não encobrir os efeitos
let musicaPausada = true; // Começa pausada

//toca sons gerais de jogo, como movimento, xeque, xeque-mate e captura
function tocarSom(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(error => console.log("Erro ao tocar áudio:", error));
}

// Inicia a música no primeiro clique do usuário para evitar bloqueio do navegador
function tentarIniciarMusica() {
    music.play().then(() => {
        musicaPausada = false;
        atualizarBotaoAudio(); // Garante que o ícone esteja certo ao iniciar
    }).catch(() => {
        musicaPausada = true;
        atualizarBotaoAudio();
    });
}

// Pausa ou retoma a música de fundo e atualiza a interface
function alternarMusica() {
    if (musicaPausada) {
        music.play().then(() => {
            musicaPausada = false;
            atualizarBotaoAudio();
        }).catch(() => { });
    } else {
        music.pause();
        musicaPausada = true;
        atualizarBotaoAudio();
    }
}

// Função utilitária para manter o ícone e o botão sempre sincronizados
function atualizarBotaoAudio() {
    iconeAudio.textContent = musicaPausada ? '🔇' : '🔊';
    btnMutarAudio.classList.toggle('mutado', musicaPausada);
}

const btnMutarAudio = document.getElementById('btn-mutar-audio');
const iconeAudio = document.getElementById('icone-audio');

btnMutarAudio.addEventListener('click', () => {
    alternarMusica();
});


// ----------- Cria o relógio com 5 minutos para cada jogador -----------//
// Flags para controlar se o alerta já foi tocado para cada jogador
let alertaTocadoW = false;
let alertaTocadoB = false;

const relogio = new Clock(
    5,
    (dados) => {
        DOM_TIMER_W.textContent = dados.w;
        DOM_TIMER_B.textContent = dados.b;

        const elBranca = document.querySelector('.timer-conteiner.branca');
        const elPreta = document.querySelector('.timer-conteiner.preto');

        if (elBranca && elPreta) {
            // Conversão garantida para número
            const segW = Number(dados.wSegundos);
            const segB = Number(dados.bSegundos);

            const emPerigoW = segW <= 30;
            const emPerigoB = segB <= 30;

            // 1. Marca/Desmarca a classe 'ativo' conforme o turno
            elBranca.classList.toggle('ativo', dados.turnoAtivo === 'w');
            elPreta.classList.toggle('ativo', dados.turnoAtivo === 'b');

            // 2. Aplica/Remove a classe 'perigo'
            elBranca.classList.toggle('perigo', emPerigoW);
            elPreta.classList.toggle('perigo', emPerigoB);

            // 3. Toca o alerta sonoro apenas na entrada dos 30s
            if (emPerigoW && !alertaTocadoW) {
                tocarSom(audioAlerta);
                alertaTocadoW = true;
            }

            if (emPerigoB && !alertaTocadoB) {
                tocarSom(audioAlerta);
                alertaTocadoB = true;
            }
        }
    },
    (quemPerdeu) => {
        jogo.jogoFinalizado = true;
        tocarSom(audioXequeMate);
        const jogadorVenceu = quemPerdeu !== corJogador;
        if (jogadorVenceu) {
            finalizarPartida('vitoria', 'TEMPO')
        }
        else {
            finalizarPartida('derrota', 'TEMPO')
        }
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

/**
 * Registra a captura com base no turno de quem efetuou a jogada
 * @param {string} pecaCapturada - O caractere da peça que foi removida (ex: 'p', 'P', 'q', etc.)
 * @param {string} turnoAtual - 'w' (Brancas) ou 'b' (Pretas) no momento do lance
 */
function registrarCaptura(pecaCapturada, turnoAtual) {
    if (!pecaCapturada) return;

    // Se o turno de quem capturou for igual à cor do Jogador Humano, vai para o painel dele!
    if (turnoAtual === corJogador) {
        capturadasPeloJogador.push(pecaCapturada);
    } else {
        // Caso contrário, quem capturou foi a IA
        capturadasPelaIA.push(pecaCapturada);
    }

    renderizarPecasCapturadas();
}

//atualiza os paineis de peças capturadas para o jogador e para a IA
function renderizarPecasCapturadas() {


    if (painelPecasJogador) {
        painelPecasJogador.innerHTML = capturadasPeloJogador
            .map(p => `<span class="peca-capturada">${UNICODE_PECAS[p]}</span>`)
            .join('');
    }

    if (painelPecasIA) {
        painelPecasIA.innerHTML = capturadasPelaIA
            .map(p => `<span class="peca-capturada">${UNICODE_PECAS[p]}</span>`)
            .join('');
    }
}
//atualiza painel de comentario
function simularPensamentoIAComentario() {
    let pontos = 0
    let pensamento = null
    //anular qualquer interval ativo por segurança
    if (pensamento) clearInterval(pensamento)
    pensamento = setInterval(() => {
        if (processandoIA) {
            clearInterval(pensamento);
            pensamento = null;
            return
        }
        pontos = (pontos + 1) % 4; // Alterna ciclicamente entre 0, 1, 2 e 3
        elComentario.textContent = 'Pensando' + '.'.repeat(pontos);
    }, 400);
}

//--------------- Controle de Seleção e Jogadas ---------------//
let movimentosPossiveis = [];
let casaSelecionada = null;

function tratarCliqueCasa(linha, coluna) {
    // Bloqueia cliques se o jogo acabou OU se for a vez da IA jogar
    if (jogo.jogoFinalizado || jogo.turno === corIA || processandoIA) return;

    const corPecaClicada = jogo.obterCorPeca(linha, coluna);
    const clicouEmDestinoValido = movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);

    // Mover peça para destino válido
    if (casaSelecionada && clicouEmDestinoValido) {
        let jogoTurno = jogo.turno; // Salva o turno antes de mover

        //============função undo============//
        salvarEstadoJogo(); // Salva o estado atual antes de mover para permitir desfazer
        podeDesfazer = false; // Permite desfazer após salvar o estado
        //===================================//

        //para checagem de movimento de enpassant 
        const pecaOrigem = jogo.obterPeca(casaSelecionada.linha, casaSelecionada.coluna);
        const ehEnpassant = validarEnpassant(pecaOrigem, casaSelecionada, { linha, coluna });

        //para checagem de captura de peça inimiga
        const TemPecaInimiga = jogo.obterPeca(linha, coluna);

        //realizar movimento
        jogo.moverPeca(casaSelecionada.linha, casaSelecionada.coluna, linha, coluna);
        limparSelecao();

        //Checa Xeque-Mate ou Empate após a jogada
        const estadoFim = jogo.verificarFimDeJogo ? jogo.verificarFimDeJogo() : null;

        if (estadoFim) {
            relogio.parar();
            renderizarTabuleiro();
            if (estadoFim.tipo === 'XEQUE_MATE') {
                const resultado = estadoFim.vencedor === corJogador ? 'vitoria' : 'derrota';
                tocarSom(audioXequeMate);
                setTimeout(() => {
                    finalizarPartida(resultado, estadoFim.tipo)
                }, 1000);
            } else {
                setTimeout(() => {
                    finalizarPartida('empate', estadoFim.tipo)
                }, 1000);
            }
            return;
        }

        if (TemPecaInimiga) {
            tocarSom(audioCaptura); // Som de captura
            registrarCaptura(TemPecaInimiga, jogoTurno); // Registra a captura
        }
        else if (ehEnpassant) { //se não tiver peça inimiga, mas for um movimento de enpassant, registra a captura
            tocarSom(audioCaptura); // Som de captura
            registrarCaptura('p', jogoTurno); // Registra a captura
        }
        // Toca som adequado para a jogada (Xeque vs Movimento Padrão)
        if (jogo.estaEmXeque && jogo.estaEmXeque(jogo.turno)) {
            tocarSom(audioXeque);
        }
        tocarSom(audioMovimento);


        renderizarTabuleiro();

        // Alterna o relógio para o próximo jogador
        if (typeof relogio.mudarTurno === 'function') {
            relogio.mudarTurno(jogo.turno);
        } else if (typeof relogio.alternarTurno === 'function') {
            relogio.alternarTurno();
        }
        simularPensamentoIAComentario();
        // Chama a IA para fazer a jogada
        setTimeout(() => {
            executarTurnoIA();
        }, 2000);
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

//==========função para limpar seleção e movimentos possíveis==========//
function limparSelecao() {
    casaSelecionada = null;
    movimentosPossiveis = [];
}

//====função auxiliar para validar movimento de enpassant====//
function validarEnpassant(pecaOrigem, origem, destino) {
    const ehPiao = pecaOrigem.toLowerCase() === 'p';
    const ehDiagonal = Math.abs(origem.coluna - destino.coluna) === 1;

    // Certifica que existe um alvo de En Passant ativo
    if (!jogo.alvoEnPassant) return false;

    // Compara linha e coluna de destino com o alvoEnPassant
    const ehDestinoAlvo = destino.linha === jogo.alvoEnPassant.linha &&
        destino.coluna === jogo.alvoEnPassant.coluna;

    return ehPiao && ehDiagonal && ehDestinoAlvo;
}

//=============================== Função para a IA jogar ==============================//
async function executarTurnoIA() {
    if (jogo.jogoFinalizado || processandoIA) return;

    processandoIA = true;

    // 1. Gera a FEN da posição atual para enviar ao Stockfish
    const fenAtual = gerarFEN(jogo);

    // 2. Chama o backend do Stockfish
    const resposta = await obterJogadaStockfish(fenAtual, nivelDificuldade);

    if (resposta && resposta.movimento) {
        const uci = resposta.movimento; // Ex: "e2e4" ou "e7e8q"

        // Extrai as casas de origem e destino da string UCI
        const origemStr = uci.substring(0, 2); // Ex: "e2"
        const destinoStr = uci.substring(2, 4); // Ex: "e4"

        const origem = algebraicoParaCoord(origemStr);
        const destino = algebraicoParaCoord(destinoStr);

        // A. DETECÇÃO DE CAPTURA (ANTES DE MOVER)
        const pecaDestino = jogo.obterPeca(destino.linha, destino.coluna);
        const ehCaptura = pecaDestino !== '';

        const ehEnpassant = validarEnpassant(jogo.obterPeca(origem.linha, origem.coluna), origem, destino);

        // 3. Executa a jogada no tabuleiro IMEDIATAMENTE
        const jogoTurno = jogo.turno; // Salva o turno antes de mover
        jogo.moverPeca(origem.linha, origem.coluna, destino.linha, destino.coluna);

        // 3.1 Dispara os efeitos sonoros correspondentes sem atraso
        if (ehCaptura) {
            tocarSom(audioCaptura);
            registrarCaptura(pecaDestino, jogoTurno); // Registra a captura
        }
        else if (ehEnpassant) { //se não tiver peça inimiga, mas for um movimento de enpassant, registra a captura
            tocarSom(audioCaptura); // Som de captura
            registrarCaptura('p', jogoTurno); // Registra a captura
        }
        if (jogo.estaEmXeque(corJogador)) { //se for um xeque toca o som
            tocarSom(audioXeque);
        }
        tocarSom(audioMovimento); // Som de movimento padrão

        // 4. Checa Fim de Jogo
        const estadoFim = jogo.verificarFimDeJogo();
        if (estadoFim) {
            relogio.parar();
            renderizarTabuleiro();
            if (estadoFim.tipo === 'XEQUE_MATE') {
                const resultado = estadoFim.vencedor === corJogador ? 'vitoria' : 'derrota';
                tocarSom(audioXequeMate);
                setTimeout(() => {
                    finalizarPartida(resultado, estadoFim.tipo)
                }, 1000);
            } else {
                setTimeout(() => {
                    finalizarPartida('empate', estadoFim.tipo)
                }, 1000);
            }
            processandoIA = false;
            return;
        }

        // 5. Alterna relógio e atualiza a interface visual IMEDIATAMENTE
        if (typeof relogio.mudarTurno === 'function') {
            relogio.mudarTurno(jogo.turno);
        } else if (typeof relogio.alternarTurno === 'function') {
            relogio.alternarTurno();
        }

        renderizarTabuleiro();

        // Libera o estado de processamento para permitir que o usuário continue jogando
        processandoIA = false;

        // 6. CHAMA O GEMINI EM SEGUNDO PLANO (Não usa 'await' para não travar o jogo)
        //     const novaFen = gerarFEN(jogo);
        //     if (elComentario) elComentario.textContent = "Analisando a jogada...";

        //     obterComentarioGemini(novaFen, corIA, uci)
        //         .then(respostaGemini => {
        //             if (respostaGemini && respostaGemini.comentario && elComentario) {
        //                 elComentario.textContent = respostaGemini.comentario;
        //             }
        //         })
        //         .catch(err => {
        //             console.error("Erro ao obter comentário:", err);
        //             if (elComentario) elComentario.textContent = "IA realizou o lance.";
        //         });

        //     return;

        //6.exibe comentário da IA sobre a jogada feita
        elComentario.textContent = `Joguei ${uci}.`;

    }

    processandoIA = false;

    // A IA terminou de jogar: libera o botão de desfazer
    podeDesfazer = true;
    atualizarBotaoDesfazer();
}

//==============Função para desfazer ultima jogada==================//
btnDesfazer.addEventListener('click', desfazerJogada);
function salvarEstadoJogo() {
    estadoAnterior = {
        // Copia a matriz do tabuleiro
        grid: JSON.parse(JSON.stringify(jogo.grid)),
        turno: jogo.turno,
        direitosRoque: JSON.parse(JSON.stringify(jogo.direitosRoque)),
        alvoEnPassant: jogo.alvoEnPassant ? { ...jogo.alvoEnPassant } : null,
        jogoFinalizado: jogo.jogoFinalizado,

        // Copia os arrays inteiros de capturas exatamente como estão agora
        capturadasPeloJogador: [...capturadasPeloJogador],
        capturadasPelaIA: [...capturadasPelaIA]
    };
}
function desfazerJogada() {
    if (!podeDesfazer || !estadoAnterior || processandoIA) return;


    // 1. Restaura o estado da classe do jogo
    jogo.grid = JSON.parse(JSON.stringify(estadoAnterior.grid));
    jogo.turno = estadoAnterior.turno;
    jogo.direitosRoque = JSON.parse(JSON.stringify(estadoAnterior.direitosRoque));
    jogo.alvoEnPassant = estadoAnterior.alvoEnPassant ? { ...estadoAnterior.alvoEnPassant } : null;
    jogo.jogoFinalizado = estadoAnterior.jogoFinalizado;

    // 2. Restaura os arrays de capturas copiando os valores salvos de volta
    capturadasPeloJogador.length = 0;
    capturadasPeloJogador.push(...estadoAnterior.capturadasPeloJogador);

    capturadasPelaIA.length = 0;
    capturadasPelaIA.push(...estadoAnterior.capturadasPelaIA);

    // 3. Aplica as regras de trava do botão (só pode desfazer 1x)
    oportunidade--;
    podeDesfazer = false;
    estadoAnterior = null;
    atualizarBotaoDesfazer();

    // 4. Sincroniza o turno do relógio para o jogador
    if (typeof relogio.mudarTurno === 'function') {
        relogio.mudarTurno(jogo.turno);
    } else if (typeof relogio.alternarTurno === 'function') {
        relogio.alternarTurno();
    }

    // 5. Redesenha a tela e o painel de capturas
    if (typeof renderizarPecasCapturadas === 'function') {
        renderizarPecasCapturadas();
    }
    renderizarTabuleiro();
    tocarSom(audioMovimento);
}

// Auxiliar visual do botão no HTML
function atualizarBotaoDesfazer() {
    if (btnDesfazer) {
        const estaPermitido = podeDesfazer && nivelDificuldade < 9 && oportunidade > 0;
        btnDesfazer.disabled = !estaPermitido;

    }
}

//===========abandonar==========//
btnDesistir.addEventListener('click', desistirPartida);
function desistirPartida() {
    if (jogo.jogoFinalizado || processandoIA) return;

    const confirmou = confirm("Tem certeza de que deseja desistir da partida?");
    if (!confirmou) return;

    // Encerra a partida
    jogo.jogoFinalizado = true;
    if (relogio && typeof relogio.parar === 'function') {
        relogio.parar();
    }

    // Trava os controles
    podeDesfazer = false;
    atualizarBotaoDesfazer();

    finalizarPartida('derrota', 'DESISTENCIA');
}

/**
 * Função centralizada para encerrar a partida
 */
function finalizarPartida(resultado, motivo) {
    jogo.jogoFinalizado = true;

    if (relogio && typeof relogio.parar === 'function') {
        relogio.parar();
    }
    console.log(resultado);

    podeDesfazer = false;
    atualizarBotaoDesfazer();

    // Transforma o botão de Desistir em botão de Recomeçar
    btnDesistir.textContent = '🔄 Recomeçar';
    btnDesistir.addEventListener('click', () => {
        setTimeout(() => {
            window.location.reload();
        })
    })
    // comentario do stockfish
    if (resultado === 'vitoria') {
        elComentario.textContent = "Fim de jogo. @#$*&"
    }else{
        elComentario.textContent = "Fim de jogo. kkkkk"
    }

    // Exibe o modal dinâmico
    exibirModalFimDeJogo(resultado, nivelDificuldade, motivo);
}


