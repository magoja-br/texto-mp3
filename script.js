// ========================================
// CONFIGURAÇÕES GLOBAIS
// ========================================
const API_URL = 'https://meu-proxy-tts.onrender.com/synthesize';

// Lista de vozes fixa (não precisa buscar da API)
const VOZES_DISPONIVEIS = [
    // Português Brasil - Chirp3 HD (Melhor qualidade)
    { name: 'pt-BR-Chirp3-HD-Algieba', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },
    { name: 'pt-BR-Chirp3-HD-Alpheratz', languageCodes: ['pt-BR'], ssmlGender: 'MALE' },

    // Português Brasil - Standard
    { name: 'pt-BR-Standard-A', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },
    { name: 'pt-BR-Standard-B', languageCodes: ['pt-BR'], ssmlGender: 'MALE' },
    { name: 'pt-BR-Standard-C', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },

    // Português Brasil - Wavenet
    { name: 'pt-BR-Wavenet-A', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },
    { name: 'pt-BR-Wavenet-B', languageCodes: ['pt-BR'], ssmlGender: 'MALE' },
    { name: 'pt-BR-Wavenet-C', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },

    // Português Brasil - Neural2
    { name: 'pt-BR-Neural2-A', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },
    { name: 'pt-BR-Neural2-B', languageCodes: ['pt-BR'], ssmlGender: 'MALE' },
    { name: 'pt-BR-Neural2-C', languageCodes: ['pt-BR'], ssmlGender: 'FEMALE' },

    // Português Portugal
    { name: 'pt-PT-Standard-A', languageCodes: ['pt-PT'], ssmlGender: 'FEMALE' },
    { name: 'pt-PT-Standard-B', languageCodes: ['pt-PT'], ssmlGender: 'MALE' },
    { name: 'pt-PT-Standard-C', languageCodes: ['pt-PT'], ssmlGender: 'MALE' },
    { name: 'pt-PT-Standard-D', languageCodes: ['pt-PT'], ssmlGender: 'FEMALE' },
    { name: 'pt-PT-Wavenet-A', languageCodes: ['pt-PT'], ssmlGender: 'FEMALE' },
    { name: 'pt-PT-Wavenet-B', languageCodes: ['pt-PT'], ssmlGender: 'MALE' },
    { name: 'pt-PT-Wavenet-C', languageCodes: ['pt-PT'], ssmlGender: 'MALE' },
    { name: 'pt-PT-Wavenet-D', languageCodes: ['pt-PT'], ssmlGender: 'FEMALE' },

    // Inglês US
    { name: 'en-US-Standard-A', languageCodes: ['en-US'], ssmlGender: 'MALE' },
    { name: 'en-US-Standard-B', languageCodes: ['en-US'], ssmlGender: 'MALE' },
    { name: 'en-US-Standard-C', languageCodes: ['en-US'], ssmlGender: 'FEMALE' },
    { name: 'en-US-Standard-D', languageCodes: ['en-US'], ssmlGender: 'MALE' },
    { name: 'en-US-Standard-E', languageCodes: ['en-US'], ssmlGender: 'FEMALE' },

    // Espanhol
    { name: 'es-ES-Standard-A', languageCodes: ['es-ES'], ssmlGender: 'FEMALE' },
    { name: 'es-ES-Standard-B', languageCodes: ['es-ES'], ssmlGender: 'MALE' },
    { name: 'es-US-Standard-A', languageCodes: ['es-US'], ssmlGender: 'FEMALE' },
    { name: 'es-US-Standard-B', languageCodes: ['es-US'], ssmlGender: 'MALE' },

    // Francês
    { name: 'fr-FR-Standard-A', languageCodes: ['fr-FR'], ssmlGender: 'FEMALE' },
    { name: 'fr-FR-Standard-B', languageCodes: ['fr-FR'], ssmlGender: 'MALE' },
    { name: 'fr-FR-Standard-C', languageCodes: ['fr-FR'], ssmlGender: 'FEMALE' },
    { name: 'fr-FR-Standard-D', languageCodes: ['fr-FR'], ssmlGender: 'MALE' },
];

// ========================================
// ELEMENTOS DO DOM
// ========================================
const fileInput = document.getElementById('file-input');
const conteudoLeitura = document.getElementById('conteudo-leitura');
const vozSelect = document.getElementById('voz-select');
const velocidadeSlider = document.getElementById('velocidade-slider');
const velocidadeValor = document.getElementById('velocidade-valor');
const voltarBtn = document.getElementById('voltar-btn');

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================
let textoCompleto = '';
let audioAtual = null;

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    carregarVozes();
    configurarEventListeners();
});

// ========================================
// CARREGAR VOZES DISPONÍVEIS
// ========================================
function carregarVozes() {
    preencherSelectVozes(VOZES_DISPONIVEIS);
}

function preencherSelectVozes(voices) {
    vozSelect.innerHTML = '';

    // Agrupar vozes por idioma
    const vozesPorIdioma = {};
    voices.forEach(voice => {
        const idioma = voice.languageCodes[0];
        if (!vozesPorIdioma[idioma]) {
            vozesPorIdioma[idioma] = [];
        }
        vozesPorIdioma[idioma].push(voice);
    });

    // Criar optgroups
    Object.keys(vozesPorIdioma).sort().forEach(idioma => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = getNomeIdioma(idioma);

        vozesPorIdioma[idioma].forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.ssmlGender})`;

            // Definir voz padrão (pt-BR-Chirp3-HD-Algieba)
            if (voice.name === 'pt-BR-Chirp3-HD-Algieba') {
                option.selected = true;
            }

            optgroup.appendChild(option);
        });

        vozSelect.appendChild(optgroup);
    });
}

function getNomeIdioma(codigo) {
    const idiomas = {
        'pt-BR': 'Português (Brasil)',
        'pt-PT': 'Português (Portugal)',
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
        'es-ES': 'Español (España)',
        'es-US': 'Español (US)',
        'fr-FR': 'Français',
        'de-DE': 'Deutsch',
        'it-IT': 'Italiano',
    };
    return idiomas[codigo] || codigo;
}

// ========================================
// CONFIGURAR EVENT LISTENERS
// ========================================
function configurarEventListeners() {
    fileInput.addEventListener('change', handleFileUpload);
    velocidadeSlider.addEventListener('input', atualizarVelocidade);
    voltarBtn.addEventListener('click', voltarAoInicio);
}

function atualizarVelocidade() {
    velocidadeValor.textContent = parseFloat(velocidadeSlider.value).toFixed(2);
}

// ========================================
// UPLOAD E PROCESSAMENTO DE ARQUIVOS
// ========================================
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileType = file.name.split('.').pop().toLowerCase();

    try {
        let texto = '';

        switch (fileType) {
            case 'txt':
                texto = await lerArquivoTexto(file);
                break;
            case 'pdf':
                texto = await lerArquivoPDF(file);
                break;
            case 'docx':
                texto = await lerArquivoDOCX(file);
                break;
            case 'xlsx':
                texto = await lerArquivoXLSX(file);
                break;
            default:
                alert('Formato de arquivo não suportado!');
                return;
        }

        if (texto.trim()) {
            textoCompleto = texto;
            exibirTexto(texto);
        } else {
            alert('Não foi possível extrair texto do arquivo.');
        }
    } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        alert('Erro ao processar arquivo: ' + error.message);
    }
}

function lerArquivoTexto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function lerArquivoPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const typedArray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let textoCompleto = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    textoCompleto += pageText + '\n\n';
                }

                resolve(textoCompleto);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function lerArquivoDOCX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function lerArquivoXLSX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                let textoCompleto = '';

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const sheetText = XLSX.utils.sheet_to_txt(worksheet);
                    textoCompleto += `\n=== ${sheetName} ===\n${sheetText}\n`;
                });

                resolve(textoCompleto);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ========================================
// EXIBIÇÃO DE TEXTO
// ========================================
function exibirTexto(texto) {
    conteudoLeitura.innerHTML = '';

    const paragrafos = texto.split(/\n\n+/);

    paragrafos.forEach((paragrafo, index) => {
        if (paragrafo.trim()) {
            const p = document.createElement('p');
            p.textContent = paragrafo.trim();
            p.dataset.index = index;
            p.classList.add('paragrafo');

            // Eventos para seleção
            p.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    toggleSelecaoParagrafo(p);
                }
            });

            // Suporte para mobile (toque longo)
            let touchTimer;
            p.addEventListener('touchstart', (e) => {
                touchTimer = setTimeout(() => {
                    toggleSelecaoParagrafo(p);
                }, 500);
            });

            p.addEventListener('touchend', () => {
                clearTimeout(touchTimer);
            });

            conteudoLeitura.appendChild(p);
        }
    });

    // Adicionar botão de gerar MP3
    adicionarBotaoGerarMP3();
    voltarBtn.style.display = 'block';
}

function toggleSelecaoParagrafo(elemento) {
    elemento.classList.toggle('selecionado');
}

function adicionarBotaoGerarMP3() {
    const botaoExistente = document.getElementById('gerar-mp3-btn');
    if (botaoExistente) {
        botaoExistente.remove();
    }

    const botao = document.createElement('button');
    botao.id = 'gerar-mp3-btn';
    botao.className = 'gerar-mp3-button';
    botao.innerHTML = '🎵 Gerar MP3';
    botao.addEventListener('click', gerarMP3Selecionado);

    conteudoLeitura.appendChild(botao);
}

// ========================================
// NOVA FUNÇÃO: DIVIDIR TEXTO EM CHUNKS
// ========================================
function dividirTextoEmChunks(texto, tamanhoMaximo = 2500) {
    const chunks = [];
    let inicio = 0;

    while (inicio < texto.length) {
        let fim = inicio + tamanhoMaximo;

        // Se não é o último chunk, procurar por quebra natural
        if (fim < texto.length) {
            // Procurar por ponto final, quebra de linha ou espaço
            const ultimoPonto = texto.lastIndexOf('.', fim);
            const ultimaQuebra = texto.lastIndexOf('\n', fim);
            const ultimoEspaco = texto.lastIndexOf(' ', fim);

            // Usar a quebra mais próxima do fim
            const quebraNatural = Math.max(ultimoPonto, ultimaQuebra, ultimoEspaco);

            if (quebraNatural > inicio) {
                fim = quebraNatural + 1;
            }
        }

        chunks.push(texto.substring(inicio, fim).trim());
        inicio = fim;
    }

    return chunks;
}

// ========================================
// GERAÇÃO DE ÁUDIO COM CHUNKS E CONCATENAÇÃO
// ========================================
async function gerarMP3Selecionado() {
    const paragrafosSelecionados = document.querySelectorAll('.paragrafo.selecionado');

    if (paragrafosSelecionados.length === 0) {
        alert('Selecione pelo menos um parágrafo com Ctrl+Click!');
        return;
    }

    const textoSelecionado = Array.from(paragrafosSelecionados)
        .map(p => p.textContent)
        .join('\n\n');

    await gerarAudio(textoSelecionado);
}

async function gerarAudio(texto) {
    const vozSelecionada = vozSelect.value;
    const velocidade = parseFloat(velocidadeSlider.value);

    if (!vozSelecionada) {
        alert('Selecione uma voz!');
        return;
    }

    try {
        mostrarCarregamento(true, 'Preparando texto...');

        // Dividir texto em chunks de 2500 caracteres
        const chunks = dividirTextoEmChunks(texto, 2500);

        console.log(`Texto dividido em ${chunks.length} chunks`);

        // Gerar áudio para cada chunk
        const audioBlobs = [];

        for (let i = 0; i < chunks.length; i++) {
            mostrarCarregamento(true, `Gerando áudio ${i + 1}/${chunks.length}...`);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: chunks[i],
                    voiceName: vozSelecionada,
                    speakingRate: velocidade
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const audioBlob = await response.blob();
            audioBlobs.push(audioBlob);
        }

        // Concatenar áudios
        mostrarCarregamento(true, 'Concatenando áudios...');
        const audioFinal = await concatenarAudios(audioBlobs);

        const audioUrl = URL.createObjectURL(audioFinal);

        criarPlayerAudio(audioUrl);
        criarBotaoDownload(audioFinal);

        mostrarCarregamento(false);

    } catch (error) {
        console.error('Erro ao gerar áudio:', error);
        alert('Erro ao gerar áudio: ' + error.message);
        mostrarCarregamento(false);
    }
}

// ========================================
// NOVA FUNÇÃO: CONCATENAR ÁUDIOS
// ========================================
async function concatenarAudios(audioBlobs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffers = [];

    // Decodificar todos os blobs
    for (const blob of audioBlobs) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
    }

    // Calcular duração total
    const duracaoTotal = audioBuffers.reduce((sum, buffer) => sum + buffer.duration, 0);
    const sampleRate = audioBuffers[0].sampleRate;
    const numberOfChannels = audioBuffers[0].numberOfChannels;

    // Criar buffer concatenado
    const bufferConcatenado = audioContext.createBuffer(
        numberOfChannels,
        Math.ceil(duracaoTotal * sampleRate),
        sampleRate
    );

    // Copiar dados de cada buffer
    let offset = 0;
    for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            bufferConcatenado.getChannelData(channel).set(channelData, offset);
        }
        offset += buffer.length;
    }

    // Converter para blob MP3
    const wavBlob = await audioBufferToWav(bufferConcatenado);
    return wavBlob;
}

// ========================================
// CONVERTER AUDIOBUFFER PARA WAV
// ========================================
function audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = [];
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = buffer.getChannelData(channel)[i];
            const intSample = Math.max(-1, Math.min(1, sample));
            data.push(intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF);
        }
    }

    const dataLength = data.length * bytesPerSample;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        view.setInt16(offset, data[i], true);
        offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function mostrarCarregamento(mostrar, mensagem = '🔄 Gerando áudio...') {
    let loader = document.getElementById('audio-loader');

    if (mostrar) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'audio-loader';
            loader.className = 'audio-loader';
            conteudoLeitura.appendChild(loader);
        }
        loader.innerHTML = mensagem;
    } else {
        if (loader) {
            loader.remove();
        }
    }
}

function criarPlayerAudio(audioUrl) {
    const playerExistente = document.getElementById('audio-player-container');
    if (playerExistente) {
        playerExistente.remove();
    }

    const container = document.createElement('div');
    container.id = 'audio-player-container';
    container.className = 'audio-player-container';

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = audioUrl;
    audio.className = 'audio-player';

    container.appendChild(audio);
    conteudoLeitura.appendChild(container);

    audio.play();
}

function criarBotaoDownload(audioBlob) {
    const botaoExistente = document.getElementById('download-mp3-btn');
    if (botaoExistente) {
        botaoExistente.remove();
    }

    const botao = document.createElement('a');
    botao.id = 'download-mp3-btn';
    botao.className = 'download-button';
    botao.innerHTML = '💾 Baixar MP3';
    botao.href = URL.createObjectURL(audioBlob);
    botao.download = `audio_${Date.now()}.mp3`;

    conteudoLeitura.appendChild(botao);
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================
function voltarAoInicio() {
    conteudoLeitura.innerHTML = '<p class="aviso">Carregue um arquivo para começar. Você pode selecionar parágrafos com Ctrl+Click (PC) ou Toque Longo (Telemóvel) e usar o botão 🎵 para gerar um MP3 completo do que estiver selecionado.</p>';
    fileInput.value = '';
    textoCompleto = '';
    voltarBtn.style.display = 'none';

    if (audioAtual) {
        audioAtual.pause();
        audioAtual = null;
    }
}

// Configurar PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
}
