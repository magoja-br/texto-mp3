document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação com Google Cloud TTS');

    // --- CHAVE DE API (REMOVIDA/COMENTADA) ---
    // const apiKey = "chave"; 
    // --- VOZ E VELOCIDADE ---
    const NOME_DA_VOZ = 'pt-BR-Chirp3-HD-Algieba'; 
    let taxaDeFala = 1.0; 

    const cabecalho = document.querySelector('header');
    const fileInput = document.getElementById('file-input');
    const areaLeitura = document.getElementById('conteudo-leitura');
    const vozSelect = document.getElementById('voz-select');
    const velocidadeSlider = document.getElementById('velocidade-slider');
    const velocidadeValor = document.getElementById('velocidade-valor');
    const voltarBtn = document.getElementById('voltar-btn');

    // --- Variáveis de Estado ---
    let indiceParagrafoAtual = 0;
    let paragrafosDoTexto = []; 
    let paragrafosSelecionados = []; 
    let estadoLeitura = 'parado'; 
    let audioAtual = null; // Referência ao objeto Audio ATUALMENTE a tocar ou pausado
    let audioAtualUrl = null; // Guarda o URL (Data URL) do audioAtual para comparação
    let timeoutLimpezaAudio = null; 
    let abortController = null; 
    let isAudioPlaying = false; 
    let isProcessingAudio = false; 
    let ultimoParagrafoClicado = null; // Variável de estado para shift+click

    const audioCache = new Map();
    const vozFallback = 'pt-BR-Neural2-B'; 
    let vozAtual = NOME_DA_VOZ; 
    let vozesDisponiveis = []; 

    // --- Funções Auxiliares ---

    function sanitizeText(text) {
        if (!text || typeof text !== 'string') return '';
        return text.replace(/[\u{1F600}-\u{1F6FF}]/gu, '') 
                   .replace(/[^\p{L}\p{N}\p{P}\p{Z}\s]/gu, '') 
                   .trim();
    }

    async function carregarVozesDisponiveis() {
        const SUA_CHAVE_API_PARA_LISTAR = "SUA_CHAVE_API_REAL_AQUI"; // MANTENHA ASSIM PARA USAR A LISTA PADRÃO

        if (SUA_CHAVE_API_PARA_LISTAR === "SUA_CHAVE_API_REAL_AQUI" || SUA_CHAVE_API_PARA_LISTAR.length < 10) {
             console.warn("Chave API não configurada para listar vozes. Usando lista padrão.");
             preencherDropdownVozes([
                 { name: 'pt-BR-Neural2-B', gender: 'MALE' }, { name: 'pt-BR-Neural2-D', gender: 'MALE' },
                 { name: 'pt-BR-Neural2-A', gender: 'FEMALE' }, { name: 'pt-BR-Neural2-C', gender: 'FEMALE' },
                 { name: 'pt-BR-Wavenet-A', gender: 'FEMALE'}, { name: 'pt-BR-Wavenet-B', gender: 'MALE'},
                 { name: 'pt-BR-Wavenet-D', gender: 'FEMALE'}, { name: 'pt-BR-Chirp3-HD-Algieba', gender: 'MALE' } 
             ]);
             return; 
         }
        // Código restante para buscar vozes da API (não será executado)...
        try {
            const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${SUA_CHAVE_API_PARA_LISTAR}`);
            if (!response.ok) {
                throw new Error(`Erro ao buscar vozes: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            if (data.voices && data.voices.length > 0) {
                const vozesFiltradas = data.voices
                    .filter(voice => voice.languageCodes.includes('pt-BR') && (voice.name.includes('Neural2') || voice.name.includes('Wavenet') || voice.name.includes('Chirp')))
                    .map(voice => ({ name: voice.name, gender: voice.ssmlGender || 'UNKNOWN' }));
                preencherDropdownVozes(vozesFiltradas);
            } else {
                console.warn('Nenhuma voz pt-BR retornada pela API. Usando lista padrão.');
                preencherDropdownVozes([ { name: 'pt-BR-Neural2-B', gender: 'MALE' }, { name: 'pt-BR-Chirp3-HD-Algieba', gender: 'MALE' } ]);
            }
        } catch (error) {
            console.error('Erro ao carregar vozes da API:', error);
            alert('Não foi possível carregar as vozes da Google. Usando vozes padrão.');
            preencherDropdownVozes([ { name: 'pt-BR-Neural2-B', gender: 'MALE' }, { name: 'pt-BR-Chirp3-HD-Algieba', gender: 'MALE' } ]);
        }
    }

    function preencherDropdownVozes(listaVozes) {
        vozesDisponiveis = listaVozes; 
        vozSelect.innerHTML = ''; 

        vozesDisponiveis.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            let genderText = 'Desconhecido';
            if (voice.gender === 'MALE') genderText = 'Masculina';
            else if (voice.gender === 'FEMALE') genderText = 'Feminina';
            option.textContent = `${voice.name} (${genderText})`;
            vozSelect.appendChild(option);
        });

        if (vozesDisponiveis.some(voice => voice.name === NOME_DA_VOZ)) {
            vozAtual = NOME_DA_VOZ;
            vozSelect.value = NOME_DA_VOZ;
        } else if (vozesDisponiveis.some(voice => voice.name === vozFallback)) {
            console.warn(`Voz padrão ${NOME_DA_VOZ} não encontrada, usando fallback ${vozFallback}.`);
            vozAtual = vozFallback;
            vozSelect.value = vozFallback;
        } else if (vozesDisponiveis.length > 0) {
            console.warn(`Voz padrão e fallback não encontradas. Usando a primeira voz: ${vozesDisponiveis[0].name}`);
            vozAtual = vozesDisponiveis[0].name;
            vozSelect.value = vozAtual;
        } else {
             console.error("Nenhuma voz disponível para selecionar.");
             vozAtual = ''; 
        }
        console.log('Vozes carregadas no dropdown. Voz atual:', vozAtual);
    }

    function toggleButtons(disabled) {
        const buttons = [
            document.getElementById('play-pause-btn'), document.getElementById('stop-btn'),
            document.getElementById('prev-btn'), document.getElementById('next-btn'),
            document.getElementById('download-mp3-btn'), document.getElementById('select-all-btn'), 
            voltarBtn
        ];
        buttons.forEach(btn => { if (btn) btn.disabled = disabled; });
        if (fileInput) fileInput.disabled = disabled;
        if (vozSelect) vozSelect.disabled = disabled;
        if (velocidadeSlider) velocidadeSlider.disabled = disabled;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Inicialização e Eventos ---

    carregarVozesDisponiveis();

    fileInput.addEventListener('change', handleFileSelect);

    // --- Lógica de Toque Longo/Curto ---
    let pressTimer = null;
    let longPressTriggered = false;

    areaLeitura.addEventListener('pointerdown', (event) => {
        if (isProcessingAudio) return;
        const paragrafoClicado = event.target.closest('.paragrafo');
        if (!paragrafoClicado) return;
        
        // Permite scroll normal, mas monitora o toque para 'Toque Longo'
        
        pressTimer = setTimeout(() => {
            handleParagrafoLongPress(paragrafoClicado); 
            longPressTriggered = true; 
        }, 500); 
        
        longPressTriggered = false; 
    });

    areaLeitura.addEventListener('pointerup', (event) => {
        clearTimeout(pressTimer);
        pressTimer = null;
        
        const paragrafoClicado = event.target.closest('.paragrafo');
        // Se houve toque longo, handleParagrafoClick não deve ser chamado
        if (!longPressTriggered && paragrafoClicado) {
            handleParagrafoClick(event); 
        }
    });

    areaLeitura.addEventListener('pointermove', () => {
        // Se o dedo se move muito, cancela o timer de toque longo
        clearTimeout(pressTimer);
        pressTimer = null;
    });
    
    areaLeitura.addEventListener('pointerleave', () => {
        clearTimeout(pressTimer);
        pressTimer = null;
    });
    // --- Fim da Lógica de Toque ---

    vozSelect.addEventListener('change', (e) => {
        const novaVoz = e.target.value;
        if (vozesDisponiveis.some(voice => voice.name === novaVoz)) {
            vozAtual = novaVoz;
        } else {
            console.warn(`Voz selecionada ${novaVoz} inválida, revertendo para ${vozAtual}.`);
            e.target.value = vozAtual; 
            return; 
        }
        audioCache.clear(); 
        console.log(`Voz alterada para: ${vozAtual}`);
        vozSelect.classList.add('changed');
        setTimeout(() => vozSelect.classList.remove('changed'), 1000);

        if (estadoLeitura === 'tocando' || estadoLeitura === 'pausado') {
            const indiceParaRetomar = indiceParagrafoAtual;
            pararLeitura(false); 
            indiceParagrafoAtual = indiceParaRetomar; 
            tocarPausarLeitura(); 
        }
    });

    velocidadeSlider.addEventListener('input', (e) => {
        taxaDeFala = parseFloat(e.target.value);
        velocidadeValor.textContent = taxaDeFala.toFixed(2); 
        audioCache.clear(); 
        console.log(`Velocidade alterada para: ${taxaDeFala}`);
        
        if (estadoLeitura === 'tocando' || estadoLeitura === 'pausado') {
            const indiceParaRetomar = indiceParagrafoAtual;
            pararLeitura(false); 
            indiceParagrafoAtual = indiceParaRetomar; 
            tocarPausarLeitura(); 
        }
    });

    voltarBtn.addEventListener('click', debounce(() => {
        if (isProcessingAudio) return; 
        pausarLeitura(); 
        cabecalho.classList.remove('hidden'); 
        voltarBtn.style.display = 'none'; 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        console.log(`Botão VOLTAR clicado, leitura pausada no índice: ${indiceParagrafoAtual}`);
    }, 200));

    // --- Funções de Manipulação de Arquivo ---

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        areaLeitura.innerHTML = `<p class="aviso">Carregando e processando "${file.name}"...</p>`;
        voltarBtn.style.display = 'none'; 
        const playerContainer = document.getElementById('player-container');
        if (playerContainer) playerContainer.remove(); 

        const fileType = file.name.split('.').pop().toLowerCase();
        console.log(`Tipo de arquivo detectado: ${fileType}`);

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                let textoCompleto = '';
                if (fileType === 'txt') {
                    textoCompleto = e.target.result;
                } else if (fileType === 'pdf') {
                    if (typeof pdfjsLib === 'undefined') {
                       alert('Biblioteca PDF.js não carregada.');
                       areaLeitura.innerHTML = `<p class="aviso">Erro ao carregar recursos para PDF.</p>`;
                       return;
                    }
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`; 
                    const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
                    console.log(`PDF com ${pdf.numPages} páginas carregado.`);
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        textoCompleto += textContent.items.map(item => item.str).join(' ') + '\n\n'; 
                    }
                } else if (fileType === 'docx') {
                    if (typeof mammoth === 'undefined') {
                        alert('Biblioteca Mammoth.js não carregada.');
                        areaLeitura.innerHTML = `<p class="aviso">Erro ao carregar recursos para DOCX.</p>`;
                        return;
                    }
                    const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                    textoCompleto = result.value.replace(/\n/g, '\n\n'); 
                } else if (fileType === 'xlsx') {
                     if (typeof XLSX === 'undefined') {
                         alert('Biblioteca XLSX (SheetJS) não carregada.');
                         areaLeitura.innerHTML = `<p class="aviso">Erro ao carregar recursos para XLSX.</p>`;
                         return;
                     }
                     // O tratamento do XLSX é feito em handleFileSelect.
                     // Este bloco else if foi movido para o reader.readAsArrayBuffer abaixo
                     // para garantir a leitura correta do ArrayBuffer. 
                     // No entanto, para fins de código completo, vamos manter a lógica como no último script fornecido:

                     const data = new Uint8Array(e.target.result);
                     const workbook = XLSX.read(data, { type: 'array' });
                     let textoPlanilha = '';
                     workbook.SheetNames.forEach(sheetName => {
                         const worksheet = workbook.Sheets[sheetName];
                         const csvData = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' }); 
                         textoPlanilha += csvData.replace(/(\t)+/g, ' ').replace(/\n/g, '\n\n'); 
                     });
                     textoCompleto = textoPlanilha;
                }
                
                exibirTexto(textoCompleto); 

            } catch (error) {
                console.error(`Erro ao processar ${fileType.toUpperCase()}:`, error);
                areaLeitura.innerHTML = `<p class="aviso">Ocorreu um erro ao ler o arquivo ${fileType.toUpperCase()}.</p>`;
                pararLeitura(true); 
            }
        };

        reader.onerror = (e) => {
             console.error("Erro ao ler o arquivo:", e);
             areaLeitura.innerHTML = `<p class="aviso">Não foi possível ler o arquivo selecionado.</p>`;
             pararLeitura(true);
        };

        if (fileType === 'txt') {
            reader.readAsText(file, 'UTF-8'); 
        } else if (fileType === 'pdf' || fileType === 'docx' || fileType === 'xlsx') {
            reader.readAsArrayBuffer(file); 
        } else {
            areaLeitura.innerHTML = `<p class="aviso">Formato de arquivo não suportado (.${fileType}).</p>`;
            pararLeitura(true);
        }
    }


    // --- Funções de Exibição e Controle ---

    function exibirTexto(texto) {
        pararLeitura(true); 
        areaLeitura.innerHTML = ''; 
        audioCache.clear(); 
        paragrafosSelecionados = []; 
        ultimoParagrafoClicado = null; 

        const painelControleAntigo = document.getElementById('player-container');
        if (painelControleAntigo) painelControleAntigo.remove();

        const playerHtml = `
            <div id="player-container" class="player-controls">
                <button id="prev-btn" class="player-button" title="Ir para o parágrafo anterior" disabled>←</button>
                <button id="play-pause-btn" class="player-button" title="Tocar / Pausar">▶️</button>
                <button id="stop-btn" class="player-button" title="Parar e voltar ao início">⏹️</button>
                <button id="next-btn" class="player-button" title="Ir para o próximo parágrafo">→</button>
                <button id="select-all-btn" class="player-button" title="Selecionar todos os parágrafos">☑️</button>
                <button id="download-mp3-btn" class="player-button" title="Gerar MP3 dos parágrafos selecionados" disabled>🎵</button>
            </div>`;
        cabecalho.insertAdjacentHTML('afterend', playerHtml);

        document.getElementById('play-pause-btn').addEventListener('click', debounce(tocarPausarLeitura, 200));
        document.getElementById('stop-btn').addEventListener('click', debounce(() => {
            if (isProcessingAudio) return; 
            pararLeitura(true); 
            cabecalho.classList.remove('hidden'); 
            voltarBtn.style.display = 'none'; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
            console.log('Leitura parada pelo botão STOP, índice resetado para 0');
        }, 200));
        document.getElementById('prev-btn').addEventListener('click', debounce(retrocederParagrafo, 200));
        document.getElementById('next-btn').addEventListener('click', debounce(avancarParagrafo, 200));
        document.getElementById('download-mp3-btn').addEventListener('click', debounce(gerarMp3EDownload, 300)); 
        document.getElementById('select-all-btn').addEventListener('click', debounce(selecionarTudo, 200)); // Listener para o novo botão

        const paragrafos = texto.split(/\n{2,}/).length > 1 ? texto.split(/\n{2,}/) : texto.split('\n');

        paragrafosDoTexto = []; 
        areaLeitura.innerHTML = ''; 

        paragrafos.forEach((p_texto, index) => {
            const textoLimpo = p_texto.trim();
            if (textoLimpo) { 
                const p = document.createElement('p');
                p.className = 'paragrafo';
                p.dataset.index = index; 
                p.textContent = textoLimpo;
                areaLeitura.appendChild(p);
                paragrafosDoTexto.push(p); 
            }
        });

        indiceParagrafoAtual = 0; 
        atualizarBotoesNavegacao(); 
        console.log(`Texto exibido. ${paragrafosDoTexto.length} parágrafos encontrados.`);
        voltarBtn.style.display = paragrafosDoTexto.length > 0 ? 'block' : 'none';
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) playPauseBtn.disabled = paragrafosDoTexto.length === 0;
    }

    // --- FUNÇÃO PARA SELECIONAR/DESSELECIONAR TODO O TEXTO ---
    function selecionarTudo() {
        if (isProcessingAudio) return;

        if (paragrafosDoTexto.length === 0) return;
        
        // Verifica se TODOS já estão selecionados
        const todosSelecionados = paragrafosDoTexto.length === paragrafosSelecionados.length && paragrafosDoTexto.every(p => p.classList.contains('selecionado'));

        // Certifica-se de que a leitura pare se estiver ativa
        pararLeitura(false); 
        
        if (todosSelecionados) {
            // Desselecionar Tudo
            paragrafosDoTexto.forEach(p => p.classList.remove('selecionado'));
            paragrafosSelecionados = [];
            ultimoParagrafoClicado = null;
            console.log("Todos os parágrafos deselecionados.");
        } else {
            // Selecionar Tudo
            paragrafosSelecionados = []; // Limpa seleção anterior
            paragrafosDoTexto.forEach((p, index) => {
                p.classList.add('selecionado');
                paragrafosSelecionados.push(p);
                ultimoParagrafoClicado = index; // Define o último clicado como o último do texto
            });
            console.log(`Todos os ${paragrafosSelecionados.length} parágrafos selecionados.`);
        }
        
        atualizarBotoesNavegacao(); // Garante que o botão 🎵 seja habilitado/desabilitado
    }
    // --- FIM DA FUNÇÃO SELECIONAR TUDO ---


    // Lida com TOQUE LONGO para seleção múltipla (como Ctrl+Click)
    function handleParagrafoLongPress(paragrafoClicado) {
        if (isProcessingAudio) return; 
        pararLeitura(false); // Pausa a leitura se estiver ativa
        
        const index = Array.from(paragrafosDoTexto).indexOf(paragrafoClicado);
        if (index === -1) return;
        
        console.log(`Toque longo detectado no parágrafo ${index}`);
        
        if (navigator.vibrate) {
            navigator.vibrate(50); 
        }

        // Lógica de Tocar (Ctrl+Click no desktop)
        if (paragrafoClicado.classList.contains('selecionado')) {
            paragrafoClicado.classList.remove('selecionado');
            paragrafosSelecionados = paragrafosSelecionados.filter(p => p !== paragrafoClicado);
            console.log(`Parágrafo ${index} deselecionado.`);
        } else {
            paragrafoClicado.classList.add('selecionado');
            paragrafosSelecionados.push(paragrafoClicado);
            ultimoParagrafoClicado = index; 
            console.log(`Parágrafo ${index} adicionado à seleção.`);
        }
        
        // Mantém apenas os parágrafos da seleção na lista
        paragrafosSelecionados.sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));
        
        atualizarBotoesNavegacao(); 
    }


    // MODIFICADO: Lida com TOQUE CURTO (Celular) e cliques de desktop
    function handleParagrafoClick(event) {
        if (isProcessingAudio) return; 

        const paragrafoClicado = event.target.closest('.paragrafo');
        if (!paragrafoClicado) return; 

        const index = Array.from(paragrafosDoTexto).indexOf(paragrafoClicado);
        if (index === -1) return; 

        // 1. Lógica de Seleção (Shift e Ctrl) - APENAS PARA DESKTOP
        if (event.shiftKey && ultimoParagrafoClicado !== null) {
            pararLeitura(false); // Para qualquer leitura antes de nova seleção
            const startIndex = Math.min(ultimoParagrafoClicado, index);
            const endIndex = Math.max(ultimoParagrafoClicado, index);

            paragrafosDoTexto.forEach(p => p.classList.remove('selecionado'));
            paragrafosSelecionados = [];

            for (let i = startIndex; i <= endIndex; i++) {
                paragrafosDoTexto[i].classList.add('selecionado');
                paragrafosSelecionados.push(paragrafosDoTexto[i]);
            }
            console.log(`Intervalo selecionado: ${startIndex} a ${endIndex} (${paragrafosSelecionados.length} parágrafos)`);
            ultimoParagrafoClicado = index; // Atualiza o último clicado

        } else if (event.ctrlKey || event.metaKey) {
            pararLeitura(false); // Para qualquer leitura antes de nova seleção
            // Comportamento de clique (desktop)
            if (paragrafoClicado.classList.contains('selecionado')) {
                paragrafoClicado.classList.remove('selecionado');
                paragrafosSelecionados = paragrafosSelecionados.filter(p => p !== paragrafoClicado);
                console.log(`Parágrafo ${index} deselecionado.`);
            } else {
                paragrafoClicado.classList.add('selecionado');
                paragrafosSelecionados.push(paragrafoClicado);
                ultimoParagrafoClicado = index; 
                console.log(`Parágrafo ${index} adicionado à seleção.`);
            }
        } else {
            // 2. Seleção de um único parágrafo (clique simples / toque curto)
            
            // Se o parágrafo já está selecionado E o estado de leitura não é 'tocando', ignora
            if (paragrafoClicado.classList.contains('selecionado') && estadoLeitura !== 'tocando') {
                console.log(`Parágrafo ${index} já selecionado. Ignorando toque curto.`);
                return;
            }
            
            // Limpa qualquer seleção anterior, pois um clique simples inicia a leitura
            paragrafosDoTexto.forEach(p => p.classList.remove('selecionado'));
            paragrafosSelecionados = [];

            paragrafoClicado.classList.add('selecionado'); // Adiciona destaque temporário de seleção
            paragrafosSelecionados.push(paragrafoClicado); // Seleciona apenas este parágrafo
            ultimoParagrafoClicado = index; 
            console.log(`Parágrafo único selecionado: ${index}`);

            // Inicia a leitura a partir deste parágrafo
            iniciarLeituraDePontoEspecifico(index);
        }

        atualizarBotoesNavegacao();
    }


    // Atualiza o estado visual dos botões
    function atualizarBotoesNavegacao() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        const downloadMp3Btn = document.getElementById('download-mp3-btn');
        const selectAllBtn = document.getElementById('select-all-btn'); 

        const haParagrafos = paragrafosDoTexto.length > 0;
        const processando = isProcessingAudio;
        
        // A lista de leitura será o texto completo (índices globais) se não houver seleção ativa
        // O índice atual é SEMPRE global na leitura do texto completo, mas LOCAL na leitura de seleção.
        const listaAtual = paragrafosSelecionados.length > 0 ? paragrafosSelecionados : paragrafosDoTexto;
        
        // Se estiver lendo a seleção, o índice atual é LOCAL (0 a N-1).
        // Se estiver lendo o texto completo, o índice atual é GLOBAL (0 a P-1).
        const fimDaLista = indiceParagrafoAtual >= listaAtual.length - 1;
        
        // O botão Stop deve estar sempre habilitado se a leitura não estiver 'parada'
        if (stopBtn) stopBtn.disabled = estadoLeitura === 'parado' && !processando;

        if (prevBtn) prevBtn.disabled = !haParagrafos || indiceParagrafoAtual <= 0 || processando;
        if (nextBtn) nextBtn.disabled = !haParagrafos || fimDaLista || processando; 
        if (playPauseBtn) playPauseBtn.disabled = !haParagrafos || processando;
        if (downloadMp3Btn) downloadMp3Btn.disabled = paragrafosSelecionados.length === 0 || processando;
        if (selectAllBtn) selectAllBtn.disabled = !haParagrafos || processando; 
    }

    // Inicia a leitura a partir de um índice específico (GLOBAL)
    function iniciarLeituraDePontoEspecifico(novoIndiceGlobal) {
        if (isProcessingAudio || paragrafosDoTexto.length === 0) return; 

        // Limpa a seleção temporária que o clique simples criou
        paragrafosDoTexto.forEach(p => p.classList.remove('selecionado'));
        paragrafosSelecionados = []; 

        if (novoIndiceGlobal >= 0 && novoIndiceGlobal < paragrafosDoTexto.length) {
            console.log(`Iniciando leitura no índice GLOBAL ${novoIndiceGlobal}`);
            pararLeitura(false); 
            
            // O índice de leitura passa a ser GLOBAL
            indiceParagrafoAtual = novoIndiceGlobal; 
            atualizarBotoesNavegacao(); 

            estadoLeitura = 'tocando';
            const btn = document.getElementById('play-pause-btn');
            if(btn) btn.innerHTML = '⏸️';
            cabecalho.classList.add('hidden'); 
            voltarBtn.style.display = 'block'; 

            setTimeout(() => lerProximoParagrafo(), 50);
        } else {
            console.warn(`Índice inválido para iniciar leitura: ${novoIndiceGlobal}`);
        }
    }

     // Adiciona/Remove classe CSS para destacar o parágrafo atual
     function atualizarDestaqueParagrafo() {
         let paragrafoDestacado = false;
         
         // 1. Limpa todos os destaques de leitura
         paragrafosDoTexto.forEach(p => p.classList.remove('lendo-agora'));
         
         if (estadoLeitura !== 'tocando') return; 

         // 2. Determina o parágrafo a destacar
         let paragrafoParaDestacar;
         let indiceGlobalParaDestacar;
         
         if (paragrafosSelecionados.length > 0) {
             // Lendo a seleção: indiceParagrafoAtual é LOCAL (0 a N-1)
             if (indiceParagrafoAtual < paragrafosSelecionados.length) {
                 paragrafoParaDestacar = paragrafosSelecionados[indiceParagrafoAtual];
                 indiceGlobalParaDestacar = parseInt(paragrafoParaDestacar.dataset.index);
             }
         } else {
             // Lendo o texto completo: indiceParagrafoAtual é GLOBAL (0 a P-1)
             if (indiceParagrafoAtual < paragrafosDoTexto.length) {
                 paragrafoParaDestacar = paragrafosDoTexto[indiceParagrafoAtual];
                 indiceGlobalParaDestacar = indiceParagrafoAtual;
             }
         }

         // 3. Aplica destaque e scroll
         if (paragrafoParaDestacar) {
             paragrafoParaDestacar.classList.add('lendo-agora');
             // Só faz scroll se o parágrafo não estiver já visível
             const rect = paragrafoParaDestacar.getBoundingClientRect();
             if (rect.top < 0 || rect.bottom > window.innerHeight) {
                paragrafoParaDestacar.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
             console.log(`Destaque aplicado ao índice GLOBAL ${indiceGlobalParaDestacar}.`);
             paragrafoDestacado = true;
         }

         return paragrafoDestacado;
     }


    // --- Funções de Controle de Leitura ---

    function avancarParagrafo() {
        if (isProcessingAudio) { console.log("Avançar bloqueado: processando áudio."); return; }
        // Determina a lista e o índice de leitura
        const listaDeLeitura = paragrafosSelecionados.length > 0 ? paragrafosSelecionados : paragrafosDoTexto;

        if (indiceParagrafoAtual < listaDeLeitura.length - 1) {
            pararLeitura(false); // Pausa o áudio atual
            indiceParagrafoAtual++;
            console.log(`Avançando para parágrafo ${indiceParagrafoAtual} (lista de leitura).`);
            atualizarBotoesNavegacao();
            tocarPausarLeitura(); // Tenta retomar a leitura do novo parágrafo
        } else {
            console.log("Já está no último parágrafo da lista de leitura.");
        }
    }

    function retrocederParagrafo() {
        if (isProcessingAudio) { console.log("Retroceder bloqueado: processando áudio."); return; }
        if (indiceParagrafoAtual > 0) {
            pararLeitura(false); // Pausa o áudio atual
            indiceParagrafoAtual--;
            console.log(`Retrocedendo para parágrafo ${indiceParagrafoAtual} (lista de leitura).`);
            atualizarBotoesNavegacao();
            tocarPausarLeitura(); // Tenta retomar a leitura do novo parágrafo
        } else {
            console.log("Já está no primeiro parágrafo da lista de leitura.");
        }
    }

    function tocarPausarLeitura() {
        if (isProcessingAudio) {
            console.warn('Play/Pause ignorado: processando áudio.');
            return; 
        }
        
        // Decide qual lista ler: os selecionados ou todos
        const listaDeLeitura = paragrafosSelecionados.length > 0 ? paragrafosSelecionados : paragrafosDoTexto;

        if (listaDeLeitura.length === 0) {
            console.warn("Nenhum parágrafo para ler.");
            return;
        }
        
        const btn = document.getElementById('play-pause-btn');
        if (!btn) return; 

        if(timeoutLimpezaAudio) {
            clearTimeout(timeoutLimpezaAudio);
            timeoutLimpezaAudio = null;
        }

        if (estadoLeitura === 'tocando') {
            console.log('Pausando leitura...');
            pausarLeitura(); 
        } else { // 'parado' ou 'pausado'
            
            const leituraDeSelecaoAtiva = paragrafosSelecionados.length > 0;

            if (estadoLeitura === 'parado' || (estadoLeitura === 'pausado' && leituraDeSelecaoAtiva)) {
                 // Sempre começa do 0 se o estado é 'parado' OU se havia uma seleção anterior (pausado)
                 indiceParagrafoAtual = 0;
                 console.log("Resetando índice para 0 (estado parado ou nova seleção).");
            } 
            // Se estadoLeitura é 'pausado' E NÃO HÁ SELEÇÃO, o índice mantém-se (comportamento de 'pausa' normal no texto completo).
            
            console.log(`Iniciando/Retomando leitura no parágrafo ${indiceParagrafoAtual} da lista ${leituraDeSelecaoAtiva ? 'selecionada' : 'completa'}`);
            btn.innerHTML = '⏸️'; 
            estadoLeitura = 'tocando';
            cabecalho.classList.add('hidden'); 
            voltarBtn.style.display = 'block'; 

            if (audioAtual && audioAtual.paused && !isAudioPlaying) {
                 console.log('Retomando áudio pausado...');
                 isProcessingAudio = true; 
                 toggleButtons(true);
                 audioAtual.play().then(() => {
                     console.log('Áudio retomado com sucesso.');
                     isAudioPlaying = true;
                     isProcessingAudio = false; 
                     toggleButtons(false); 
                     atualizarBotoesNavegacao();
                     atualizarDestaqueParagrafo(); 
                 }).catch((error) => {
                     console.error('Erro ao retomar áudio:', error);
                     isProcessingAudio = false; 
                     toggleButtons(false);
                     pararLeitura(false); 
                 });
            } else {
                 console.log('Iniciando ciclo lerProximoParagrafo...');
                 setTimeout(() => lerProximoParagrafo(), 50); 
            }
        }
    }

    function pausarLeitura() {
        estadoLeitura = 'pausado';
        isAudioPlaying = false; 

        if(timeoutLimpezaAudio) {
            clearTimeout(timeoutLimpezaAudio);
            timeoutLimpezaAudio = null;
        }
        if (isProcessingAudio && abortController) {
             console.log("Pausando durante processamento: Abortando fetch TTS.");
             abortController.abort();
             abortController = null;
             isProcessingAudio = false; 
        }

        if (audioAtual && !audioAtual.paused) {
            console.log("Pausando audioAtual");
            try { audioAtual.pause(); } catch(e) { console.warn("Erro ao pausar (ignorado):", e); }
        } else {
            console.log("Pausar chamado, mas áudio já pausado/não existe ou processamento foi cancelado.");
        }

        const btn = document.getElementById('play-pause-btn');
        if(btn) btn.innerHTML = '▶️'; 
        toggleButtons(false); 
        atualizarBotoesNavegacao();
        console.log(`Leitura pausada no índice: ${indiceParagrafoAtual}`);
        atualizarDestaqueParagrafo(); // Limpa o destaque se não for 'tocando'
    }

    // MODIFICADO: Função PararLeitura (Mais robusta)
    function pararLeitura(resetarIndice = false) {
        console.log(`Parando leitura, resetarIndice: ${resetarIndice}, estado ANTES: ${estadoLeitura}`);
        const estadoAnterior = estadoLeitura; 
        estadoLeitura = 'parado'; // Define como parado imediatamente
        isAudioPlaying = false;

        // Cancela fetch pendente
        if (isProcessingAudio && abortController) {
            console.log("Parando durante processamento: Abortando fetch TTS.");
            abortController.abort();
            abortController = null;
            // isProcessingAudio será resetado no finally
        }

        // Limpa timeout de limpeza
        if(timeoutLimpezaAudio) {
            clearTimeout(timeoutLimpezaAudio);
            timeoutLimpezaAudio = null;
        }

        const audioParaLimpar = audioAtual; // Guarda referência local
        const urlParaLimpar = audioAtualUrl; // Guarda URL local
        audioAtual = null; // Anula referência global
        audioAtualUrl = null;

        if (audioParaLimpar) {
            console.log("Iniciando processo de parada para audioParaLimpar existente.");
            
            // Tenta remover os listeners (necessário para evitar chamadas após parada)
            audioParaLimpar.onended = null; 
            audioParaLimpar.onerror = null;

            if (!audioParaLimpar.paused) {
                try {
                    audioParaLimpar.pause();
                    console.log("Audio pausado imediatamente.");
                } catch (e) { console.warn("Erro ao pausar áudio durante limpeza (ignorado):", e); }
            } 

            // Limpa o src com delay para liberar o recurso na memória
            setTimeout(() => {
                console.log("Executando limpeza final atrasada (src='').");
                try { 
                    if (audioParaLimpar.src === urlParaLimpar) {
                        audioParaLimpar.src = ''; 
                    }
                } catch(e) { console.warn("Erro (ignorado) ao limpar src do áudio:", e); }
            }, 300); 
        }

        // Reset do índice e scroll
        if (resetarIndice) {
            console.log("Resetando índice para 0 e limpando seleção.");
            indiceParagrafoAtual = 0;
            paragrafosDoTexto.forEach(p => p.classList.remove('selecionado'));
            paragrafosSelecionados = [];
            ultimoParagrafoClicado = null;
            areaLeitura.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Atualização da UI
        atualizarDestaqueParagrafo(); // Limpa o destaque de leitura
        const btn = document.getElementById('play-pause-btn');
        if (btn) btn.innerHTML = '▶️';
        cabecalho.classList.remove('hidden'); 
        voltarBtn.style.display = 'none'; 

        // Garante liberação do estado e botões
        isProcessingAudio = false;
        toggleButtons(false);
        atualizarBotoesNavegacao();

        console.log(`Leitura parada completa. Índice final: ${indiceParagrafoAtual}`);
    }

    // --- FUNÇÃO DE AVANÇO ---
    async function lerProximoParagrafo() {
        if (estadoLeitura !== 'tocando') {
             console.log("lerProximoParagrafo chamado, mas estado não é 'tocando'. Parando.");
             isProcessingAudio = false; 
             toggleButtons(false); 
             atualizarBotoesNavegacao();
             return;
        }

        // Determina a lista de leitura
        const listaDeLeitura = paragrafosSelecionados.length > 0 ? paragrafosSelecionados : paragrafosDoTexto;

        if (indiceParagrafoAtual >= listaDeLeitura.length) {
            console.log('Fim do texto (ou da seleção) alcançado.');
            pararLeitura(true); 
            alert("Leitura concluída!");
            return;
        }

        const paragrafoElementoAtual = listaDeLeitura[indiceParagrafoAtual];
        const textoParaLer = sanitizeText(paragrafoElementoAtual.textContent);

        atualizarDestaqueParagrafo(); // Destaca o parágrafo atual e rola a tela

        if (!textoParaLer) {
            console.warn(`Parágrafo ${indiceParagrafoAtual} vazio após sanitização. Pulando.`);
            indiceParagrafoAtual++;
            atualizarBotoesNavegacao(); 
            setTimeout(() => lerProximoParagrafo(), 50); 
            return;
        }

        try {
            // Callbacks definidos aqui para ter acesso a 'paragrafoElementoAtual'
            const onAudioEndCallback = (event) => {
                console.log(`onAudioEndCallback: Áudio do índice ${indiceParagrafoAtual} terminou. Estado atual: ${estadoLeitura}`);
                isAudioPlaying = false; 
                
                // Limpa os listeners com segurança
                if (event && event.target) {
                    event.target.removeEventListener('ended', onAudioEndCallback);
                    event.target.removeEventListener('error', onAudioErrorCallback);
                }

                if (paragrafoElementoAtual) { 
                    paragrafoElementoAtual.classList.remove('lendo-agora');
                }

                if (estadoLeitura === 'tocando') {
                    indiceParagrafoAtual++; 
                    atualizarBotoesNavegacao(); 
                    setTimeout(() => lerProximoParagrafo(), 100); 
                } else {
                    console.log(`onAudioEndCallback: Estado mudou para ${estadoLeitura}. Interrompendo ciclo.`);
                    isProcessingAudio = false; 
                    toggleButtons(false); 
                    atualizarBotoesNavegacao();
                }
            };
            
            const onAudioErrorCallback = (errorEvent) => {
                console.error("Erro no elemento Audio (callback):", errorEvent);
                isAudioPlaying = false; isProcessingAudio = false;
                
                // Limpa os listeners com segurança
                if (errorEvent && errorEvent.target) {
                    errorEvent.target.removeEventListener('ended', onAudioEndCallback);
                    errorEvent.target.removeEventListener('error', onAudioErrorCallback);
                }

                toggleButtons(false); atualizarBotoesNavegacao();
                // O alerta já é feito em lerTexto
                pararLeitura(false); 
            };

            console.log(`Iniciando chamada para índice ${indiceParagrafoAtual}`);
            await lerTexto(textoParaLer, onAudioEndCallback, onAudioErrorCallback); 

        } catch (error) {
            console.error(`Erro capturado no ciclo lerProximoParagrafo (índice ${indiceParagrafoAtual}):`, error ? error.message : 'Erro desconhecido');
             if (estadoLeitura !== 'parado') {
                  pararLeitura(false); 
             }
        }
    }
    // --- FIM DA FUNÇÃO DE AVANÇO ---


    // *** FUNÇÃO DE ÁUDIO (CHAMA O BACKEND E CORRIGE CACHE/ERROS) ***
    function lerTexto(texto, onEndedCallback, onErrorCallback) { 

        if (isProcessingAudio && abortController) {
             console.warn("Já processando áudio, abortando fetch anterior.");
             abortController.abort();
             if(audioAtual && !audioAtual.paused) {
                try { audioAtual.pause(); } catch(e){}
             }
             audioAtual = null;
             audioAtualUrl = null; 
        } else if (isAudioPlaying && audioAtual) {
            console.warn("Áudio já estava tocando, parando antes de iniciar novo.");
            if(audioAtual && !audioAtual.paused) {
                try { audioAtual.pause(); } catch(e){}
            }
             audioAtual = null;
             audioAtualUrl = null;
        }

        isProcessingAudio = true; 
        toggleButtons(true); 
        atualizarBotoesNavegacao(); 

        abortController = new AbortController();
        const signal = abortController.signal;

        const textoSanitizado = sanitizeText(texto);
        if (!textoSanitizado) {
             console.warn("Texto vazio fornecido para lerTexto.");
             isProcessingAudio = false;
             toggleButtons(false);
             atualizarBotoesNavegacao();
             if (onEndedCallback) onEndedCallback();
             return Promise.resolve(); 
        }

        const cacheKey = `${textoSanitizado}_${vozAtual}_${taxaDeFala}`;
        const isQuestion = textoSanitizado.endsWith('?') && textoSanitizado.length < 60; 
        
        // LÓGICA DE CACHE
        if (!isQuestion && audioCache.has(cacheKey)) {
             console.log(`Áudio encontrado no cache para índice ${indiceParagrafoAtual}.`);
             const audioSrcFromCache = audioCache.get(cacheKey); 

              if (audioAtual) {
                  console.warn("Limpando referência de áudio anterior (cache).");
                  audioAtual = null; 
                  audioAtualUrl = null;
              }

             audioAtual = new Audio(audioSrcFromCache); 
             audioAtualUrl = audioSrcFromCache; 
             console.log("Novo objeto audioAtual criado (cache):", audioAtual);
             isAudioPlaying = false; 

             return new Promise((resolve, reject) => {
                 const handleErrorCache = (e) => {
                    console.error("Erro no áudio do cache:", e);
                    isAudioPlaying = false; isProcessingAudio = false;
                    audioCache.delete(cacheKey); 
                    
                    if (audioAtual && audioAtual.src === audioSrcFromCache) {
                        audioAtual = null;
                        audioAtualUrl = null;
                    }
                    
                    if (e && e.target) {
                        e.target.removeEventListener('ended', handleEndedCache);
                        e.target.removeEventListener('error', handleErrorCache);
                    } else {
                        console.warn("handleErrorCache: e.target indefinido, não foi possível remover listeners.");
                    }

                    toggleButtons(false); atualizarBotoesNavegacao();
                    if (onErrorCallback) onErrorCallback(e); 
                    reject(e);
                 };
                 
                 const handleEndedCache = (e) => {
                    console.log(`Evento 'ended' (cache) disparado.`);
                    isAudioPlaying = false;
                    
                    if (audioAtual && audioAtual.src === audioSrcFromCache) {
                        audioAtual = null;
                        audioAtualUrl = null;
                    }
                    
                    e.target.removeEventListener('ended', handleEndedCache);
                    e.target.removeEventListener('error', handleErrorCache);
                    
                    if (onEndedCallback) onEndedCallback(e);
                    resolve();
                 };

                 audioAtual.addEventListener('ended', handleEndedCache);
                 audioAtual.addEventListener('error', handleErrorCache);

                 console.log("Tentando play() (cache)...");
                 audioAtual.play().then(() => {
                     console.log("Playback iniciado (cache).");
                     isAudioPlaying = true;
                     isProcessingAudio = false; 
                     toggleButtons(false);
                     atualizarBotoesNavegacao();
                 }).catch(playError => {
                     console.error("Erro direto no play() (cache):", playError);
                     handleErrorCache({ target: audioAtual }); 
                 });
             });
        }
        // FIM DA LÓGICA DE CACHE

        console.log(`Áudio não encontrado no cache para índice ${indiceParagrafoAtual}. Chamando backend...`);
        const bodyParaBackend = {
            text: textoSanitizado,
            voice: vozAtual, 
            speed: taxaDeFala   
        };
        
        // URL DO RENDER
        const backendUrl = 'https://meu-proxy-tts.onrender.com/synthesize'; 

        return fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyParaBackend),
            signal: signal 
        })
        .then(res => {
            console.log("Resposta recebida do backend, status:", res.status);
             if (abortController && abortController.signal === signal) {
                  abortController = null;
             }

            if (!res.ok) {
                return res.json().catch(() => null).then(errData => {
                    const errorMessage = errData?.error || `Erro do backend: ${res.status} ${res.statusText}`;
                    console.error("Erro na resposta do backend:", errorMessage);
                    throw new Error(errorMessage);
                });
            }
            return res.json();
        })
        .then(data => {
             if (estadoLeitura !== 'tocando') {
                 console.warn("Estado mudou durante fetch/processamento TTS. Ignorando resposta e não tocando áudio.");
                 isProcessingAudio = false; 
                 toggleButtons(false); 
                 atualizarBotoesNavegacao();
                 throw new Error("Leitura interrompida antes de tocar."); 
             }

            if (data.audioContent) {
                console.log("AudioContent recebido do backend.");
                // Usa Data URL (Base64)
                const audioSrc = "data:audio/mp3;base64," + data.audioContent;
                
                 if (audioAtual) {
                     console.warn("Limpando referência de áudio anterior (backend).");
                     audioAtual = null; 
                     audioAtualUrl = null;
                 }

                audioAtual = new Audio(audioSrc);
                audioAtualUrl = audioSrc; 
                console.log("Novo objeto audioAtual criado (backend):", audioAtual);
                isAudioPlaying = false; 

                if (!isQuestion) {
                    audioCache.set(cacheKey, audioSrc); // Cacheia o Data URL
                    console.log(`Áudio (Data URL) adicionado ao cache para índice ${indiceParagrafoAtual}.`);
                }

                return new Promise((resolve, reject) => {
                    const handleErrorBackend = (e) => {
                        console.error("Erro no elemento Audio (backend):", e);
                        isAudioPlaying = false; isProcessingAudio = false;
                        
                        if (audioAtual && audioAtual.src === audioSrc) {
                            audioAtual = null;
                            audioAtualUrl = null;
                        }
                         
                        if (e && e.target) { 
                            e.target.removeEventListener('ended', handleEndedBackend);
                            e.target.removeEventListener('error', handleErrorBackend);
                        } else {
                           console.warn("handleErrorBackend: e.target indefinido, não foi possível remover listeners.");
                        }

                        toggleButtons(false); atualizarBotoesNavegacao();
                        alert("Erro ao carregar ou reproduzir o áudio do servidor.");
                        if (onErrorCallback) onErrorCallback(e); 
                        reject(e);
                    };

                    const handleEndedBackend = (e) => {
                        console.log(`Evento 'ended' (backend) disparado.`);
                        isAudioPlaying = false;
                        
                        if (audioAtual && audioAtual.src === audioSrc) {
                             audioAtual = null;
                             audioAtualUrl = null;
                         } 

                        e.target.removeEventListener('ended', handleEndedBackend);
                        e.target.removeEventListener('error', handleErrorBackend);

                        if (onEndedCallback) onEndedCallback(e);
                        resolve();
                    };

                    audioAtual.addEventListener('ended', handleEndedBackend);
                    audioAtual.addEventListener('error', handleErrorBackend);

                    console.log("Tentando play() (backend)...");
                    audioAtual.play().then(() => {
                        console.log("Playback iniciado (backend).");
                        isAudioPlaying = true;
                        isProcessingAudio = false; 
                        toggleButtons(false);
                        atualizarBotoesNavegacao();
                    }).catch(playError => {
                        console.error("Erro direto no play() (backend):", playError);
                        handleErrorBackend({target: audioAtual}); 
                    });
                });

            } else {
                console.error("Resposta do backend OK, mas sem audioContent:", data);
                throw new Error("Resposta do backend inválida (sem audioContent)");
            }
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log(`Fetch para índice ${indiceParagrafoAtual} abortado.`);
            } else {
                alert(`Não foi possível obter o áudio do servidor: ${error.message}`);
                console.error(`Erro durante a chamada/processamento para índice ${indiceParagrafoAtual}:`, error);
            }

            if (error.name !== 'AbortError') {
                isProcessingAudio = false;
                toggleButtons(false);
                atualizarBotoesNavegacao();
            }
            if (abortController && abortController.signal === signal) abortController = null; 

            return Promise.reject(error); 
        });
    }
    // *** FIM DA FUNÇÃO DE ÁUDIO ***


    // Função auxiliar para converter Base64 para Blob
    function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
        try {
             if (!b64Data || typeof b64Data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b64Data.substring(0, 1024))) {
                  console.error("String Base64 inválida recebida:", b64Data.substring(0, 100) + "..."); 
                  throw new Error('Dados de áudio inválidos recebidos do servidor.');
             }

            const byteCharacters = atob(b64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            return new Blob(byteArrays, { type: contentType });
        } catch (e) {
             console.error("Erro ao converter Base64 para Blob:", e, "Tipo de dado:", typeof b64Data, "Início:", String(b64Data).substring(0, 50));
             throw new Error("Falha ao decodificar dados de áudio recebidos."); 
        }
    }


    // --- FUNÇÃO PARA GERAR E BAIXAR MP3 ---
    async function gerarMp3EDownload() {
        if (isProcessingAudio) {
             alert('Aguarde o processamento de áudio atual terminar.');
             return;
        }
        if (paragrafosSelecionados.length === 0) {
            alert('Por favor, selecione um ou mais parágrafos para gerar o MP3.\n(Use o botão ☑️, Toque Longo [telemóvel] ou Ctrl/Shift+Click [PC]).');
            return;
        }
        
        // Pausa a leitura se estiver ativa
        pararLeitura(false);

        isProcessingAudio = true; 
        toggleButtons(true);
        atualizarBotoesNavegacao();
        const downloadBtn = document.getElementById('download-mp3-btn');
        if (downloadBtn) downloadBtn.innerHTML = '⚙️'; 

        console.log(`Iniciando geração de MP3 para ${paragrafosSelecionados.length} parágrafo(s) selecionado(s).`);
        
        // Salva os parágrafos atuais para restaurar depois
        const paragrafosAtuais = Array.from(areaLeitura.children);
        
        areaLeitura.innerHTML = `<p class="aviso">Gerando MP3 para ${paragrafosSelecionados.length} parágrafo(s)... Por favor, aguarde. Isto pode demorar um pouco.</p>`;
        window.scrollTo({ top: 0, behavior: 'smooth' }); 


        try {
            // Ordena a seleção pela ordem de aparição no texto
            const paragrafosOrdenados = paragrafosSelecionados.sort((a, b) => {
                const indexA = Array.from(paragrafosDoTexto).indexOf(a);
                const indexB = Array.from(paragrafosDoTexto).indexOf(b);
                return indexA - indexB;
            });

            let textoCompleto = paragrafosOrdenados
                .map(p => sanitizeText(p.textContent))
                .filter(t => t) 
                .join('\n\n'); 

             if (!textoCompleto) {
                 throw new Error('Nenhum texto válido nos parágrafos selecionados.');
             }

            console.log(`Texto concatenado (${textoCompleto.length} caracteres) enviado para o backend...`);

             const bodyParaBackend = {
                 text: textoCompleto,
                 voice: vozAtual,
                 speed: taxaDeFala
             };
             
             // URL CORRIGIDO DO RENDER
             const backendUrl = 'https://meu-proxy-tts.onrender.com/synthesize'; 

             const response = await fetch(backendUrl, {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(bodyParaBackend)
             });

             if (!response.ok) {
                 const errData = await response.json().catch(() => null);
                 const errorMessage = errData?.error || `Erro do backend: ${response.status} ${response.statusText}`;
                 console.error("Erro na resposta do backend (download):", errorMessage);
                 throw new Error(errorMessage);
             }

             const data = await response.json();

             if (data.audioContent) {
                 console.log("AudioContent (MP3) recebido do backend para download.");
                 const audioBlob = b64toBlob(data.audioContent, 'audio/mp3');
                 const audioUrl = URL.createObjectURL(audioBlob);
                 downloadAudio(audioUrl); 
             } else {
                 console.error("Resposta do backend OK, mas sem audioContent (download).");
                 throw new Error("Resposta do backend inválida (sem audioContent) para download.");
             }

        } catch (error) {
            console.error('Erro ao gerar/baixar MP3:', error.message);
            alert(`Falha ao gerar o arquivo MP3: ${error.message}`);
        } finally {
            isProcessingAudio = false; 
            toggleButtons(false);
            
            // Restaurar a visualização dos parágrafos
            areaLeitura.innerHTML = ''; 
            paragrafosAtuais.forEach(p => areaLeitura.appendChild(p)); // Restaura os parágrafos originais
            // Mantém as classes 'selecionado'

            atualizarBotoesNavegacao();
            if (downloadBtn) downloadBtn.innerHTML = '🎵'; 
            console.log("Processo de geração/download de MP3 finalizado.");
        }
    }

    // Função auxiliar para iniciar o download do áudio
    function downloadAudio(audioBlobUrl) {
        const link = document.createElement('a');
        link.href = audioBlobUrl;
        const nomeArquivoOriginal = fileInput.files[0]?.name.split('.')[0] || 'audio_selecionado';
        link.download = `${nomeArquivoOriginal}_${paragrafosSelecionados.length}parags.mp3`;
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link); 
        console.log('Download do MP3 iniciado com URL:', audioBlobUrl);
        
        setTimeout(() => URL.revokeObjectURL(audioBlobUrl), 100);
    }
    // --- FIM DA FUNÇÃO DE DOWNLOAD ---

}); // Fecha o DOMContentLoaded