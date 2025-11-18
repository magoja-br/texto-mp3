// ========================================
// CONFIGURAÇÕES GLOBAIS
// ========================================
const API_URL = 'https://meu-proxy-tts.onrender.com/synthesize';

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
async function carregarVozes() {
    try {
        const response = await fetch('https://meu-proxy-tts.onrender.com/voices');
        const data = await response.json();

        if (data.voices && data.voices.length > 0) {
            preencherSelectVozes(data.voices);
        } else {
            console.error('Nenhuma voz disponível');
            vozSelect.innerHTML = '<option value="">Erro ao carregar vozes</option>';
        }
    } catch (error) {
        console.error('Erro ao carregar vozes:', error);
        vozSelect.innerHTML = '<option value="">Erro ao carregar vozes</option>';
    }
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

            // Definir voz padrão (português brasileiro feminino)
            if (voice.name === 'pt-BR-Standard-A' || 
                (idioma === 'pt-BR' && voice.ssmlGender === 'FEMALE' && !vozSelect.value)) {
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
// GERAÇÃO DE ÁUDIO
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
        mostrarCarregamento(true);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: texto,
                voiceName: vozSelecionada,
                speakingRate: velocidade
            })
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        criarPlayerAudio(audioUrl);
        criarBotaoDownload(audioBlob);

        mostrarCarregamento(false);

    } catch (error) {
        console.error('Erro ao gerar áudio:', error);
        alert('Erro ao gerar áudio: ' + error.message);
        mostrarCarregamento(false);
    }
}

function mostrarCarregamento(mostrar) {
    let loader = document.getElementById('audio-loader');

    if (mostrar) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'audio-loader';
            loader.className = 'audio-loader';
            loader.innerHTML = '🔄 Gerando áudio...';
            conteudoLeitura.appendChild(loader);
        }
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
