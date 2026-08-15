/**
 * Exibe o modal de fim de jogo com título e descrição personalizados.
 * 
 * @param {string|null} resultado - 'vitoria' | 'derrota' | 'empate'
 * @param {number} nivelDificuldade - Nível da IA (1 a 20)
 * @param {string} [motivo] - Ex: 'XEQUE_MATE', 'TEMPO', 'AFOGAMENTO', 'DESISTENCIA'
 */
export function exibirModalFimDeJogo(resultado, nivelDificuldade, motivo = '') {
    const modal = document.getElementById('modal-fim-de-jogo');
    const elTitulo = document.getElementById('titulo-fim-de-jogo');
    const elDescricao = document.getElementById('descricao-fim-de-jogo');
    const btnFecharModal = document.querySelector('#modal-fim-de-jogo button');
    btnFecharModal.addEventListener('click', () => fecharModalFimDeJogo());

    if (!modal || !elTitulo || !elDescricao) return;

    let titulo = '';
    let descricao = '';

    // Define os textos baseados no resultado e na dificuldade
    switch (resultado) {
        case 'vitoria':
            titulo = '🏆 Você Ganhou!';
            if (motivo === 'TEMPO') {
                descricao = 'Esperto! Você cozinhou o peixe até a vitória!😉'
            }
            else if (nivelDificuldade <= 3) {
                descricao = 'Bela vitória! Você sabe jogar xadrez! Parabéns!👏🏻';
            } else if (nivelDificuldade <= 10) {
                descricao = `Excelente partida! Mostra uma ótima leitura tática.👏🏻`;
            } else {
                descricao = `Impressionante! Uma vitória digna de mestre!🤯`;
            }
            break;

        case 'derrota':
            titulo = '👎 Você Perdeu';

            if (motivo === 'DESISTENCIA') {
                descricao = 'Já vai? Derrota do jogador por abandono da partida.🏳️';
            }
            else if (motivo === 'TEMPO') {
                descricao = 'Seu tempo acabou! Fique atento ao relógio da próxima vez.⏰';
            }
            else if (nivelDificuldade <= 3) {
                descricao = 'Não desanime! O xadrez exige prática, tente de novo.😉';
            }
            else if (nivelDificuldade <= 10) {
                descricao = 'Difícil? Talvez seja melhor ir para o nível capivara.🦫';
            }
            else {
                descricao = 'Nível avançado? Eu avisei que você não teria chance!🤖';
            }
            break;

        case 'empate':
        default:
            titulo = '🤝 Empate';
            if (motivo === 'AFOGAMENTO') {
                descricao = 'Empate por afogamento (Stalemate)! O rei não tem lances legais disponíveis, mas não está em xeque.';
            } else {
                descricao = 'Uma partida muito equilibrada! Nenhum dos lados conseguiu a vantagem decisiva.';
            }
            break;
    }

    // Preenche o modal e o exibe
    elTitulo.textContent = titulo;
    elDescricao.textContent = descricao;
    modal.classList.remove('modal-oculto');
}

/**
 * Esconde o modal de fim de jogo.
 */
export function fecharModalFimDeJogo() {
    const modal = document.getElementById('modal-fim-de-jogo');
    if (modal) {
        modal.classList.add('modal-oculto');
    }
}