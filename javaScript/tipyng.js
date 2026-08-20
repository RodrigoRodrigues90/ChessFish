/**
* Realiza  efeito de digitação nos comentarios da aplicação
* @param {string} htmlTexto - string de resposta do servifor com comentarios pré-processados
*/
export function tipyng(htmlTexto) {
    const elComentario = document.getElementById("texto-comentario");
    if (!elComentario) return;

    // Transforma o HTML em nós manipuláveis pelo JS
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlTexto, 'text/html');
    const nodes = Array.from(doc.body.childNodes);

    // Reseta o elemento e os índices a cada nova chamada
    elComentario.innerHTML = "";
    let nodeIndex = 0;
    let charIndex = 0;

    // Função interna responsável por fazer o loop da digitação
    function passo() {
        if (nodeIndex < nodes.length) {
            const currentNode = nodes[nodeIndex];

            // Se for nó de texto, digita caractere por caractere
            if (currentNode.nodeType === Node.TEXT_NODE) {
                if (charIndex === 0) {
                    elComentario.appendChild(document.createTextNode(""));
                }

                elComentario.lastChild.textContent += currentNode.textContent.charAt(charIndex);
                charIndex++;

                if (charIndex >= currentNode.textContent.length) {
                    charIndex = 0;
                    nodeIndex++;
                }
            }
            // Se for tag (<br>, <strong>, etc.), insere inteira
            else {
                elComentario.appendChild(currentNode.cloneNode(true));
                nodeIndex++;
            }

            // Rolagem automática
            requestAnimationFrame(() => {
                wrapper.scrollTop = wrapper.scrollHeight ;
            });

            // Chama o próximo caractere
            setTimeout(passo, 35);
        }
    }

    // Inicia a animação
    passo();
}