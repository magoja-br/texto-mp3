// Configuração da API
const API_URL = 'https://meu-proxy-tts.onrender.com';
const MAX_CHUNK_SIZE = 2500; // Tamanho máximo de cada chunk

// Função para dividir texto em chunks
function dividirTextoEmChunks(texto, tamanhoMaximo = MAX_CHUNK_SIZE) {
    const chunks = [];
    let inicio = 0;

    while (inicio < texto.length) {
        let fim = inicio + tamanhoMaximo;

        // Se não é o último chunk, tenta quebrar em pontuação ou espaço
        if (fim < texto.length) {
            const substring = texto.substring(inicio, fim);
            const ultimoPonto = Math.max(
                substring.lastIndexOf('.'),
                substring.lastIndexOf('!'),
                substring.lastIndexOf('?'),
                substring.lastIndexOf(';')
            );

            if (ultimoPonto > tamanhoMaximo * 0.7) {
                fim = inicio + ultimoPonto + 1;
            } else {
                const ultimoEspaco = substring.lastIndexOf(' ');
                if (ultimoEspaco > tamanhoMaximo * 0.7) {
                    fim = inicio + ultimoEspaco + 1;
                }
            }
        }

        chunks.push(texto.substring(inicio, fim).trim());
        inicio = fim;
    }

    return chunks;
}

// Função para converter Base64 para ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Função para concatenar áudios usando Web Audio API
async function concatenarAudios(audioBuffers) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Decodificar todos os áudios
    const decodedBuffers = await Promise.all(
        audioBuffers.map(buffer => audioContext.decodeAudioData(buffer))
    );

    // Calcular duração total
    const totalLength = decodedBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const numberOfChannels = decodedBuffers[0].numberOfChannels;
    const sampleRate = decodedBuffers[0].sampleRate;

    // Criar buffer concatenado
    const concatenatedBuffer = audioContext.createBuffer(
        numberOfChannels,
        totalLength,
        sampleRate
    );

    // Copiar dados de cada buffer
    let offset = 0;
    for (const buffer of decodedBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            concatenatedBuffer.getChannelData(channel).set(
                buffer.getChannelData(channel),
                offset
            );
        }
        offset += buffer.length;
    }

    return concatenatedBuffer;
}

// Função para converter AudioBuffer para MP3 (usando lamejs)
function audioBufferToMp3(audioBuffer) {
    const mp3encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128);
    const samples = audioBuffer.getChannelData(0);
    const sampleBlockSize = 1152;
    const mp3Data = [];

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(convertFloat32ToInt16(sampleChunk));
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
}

// Converter Float32Array para Int16Array
function convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        buf[i] = Math.min(1, buffer[i]) * 0x7FFF;
    }
    return buf;
}

// Função principal para gerar áudio
async function gerarAudio() {
    const texto = document.getElementById('texto').value.trim();

    if (!texto) {
        alert('Por favor, insira um texto!');
        return;
    }

    const btnGerar = document.getElementById('btnGerar');
    const progressDiv = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    try {
        btnGerar.disabled = true;
        btnGerar.textContent = 'Gerando...';
        progressDiv.style.display = 'block';

        // Dividir texto em chunks
        const chunks = dividirTextoEmChunks(texto);
        console.log(`Texto dividido em ${chunks.length} chunks`);

        // Gerar áudio para cada chunk
        const audioBuffers = [];

        for (let i = 0; i < chunks.length; i++) {
            progressText.textContent = `Processando parte ${i + 1} de ${chunks.length}...`;
            progressBar.style.width = `${((i + 1) / chunks.length) * 100}%`;

            const response = await fetch(`${API_URL}/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: chunks[i],
                    languageCode: document.getElementById('idioma')?.value || 'pt-BR',
                    voiceName: document.getElementById('voz')?.value || 'pt-BR-Standard-A',
                    audioEncoding: 'MP3'
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ao gerar áudio: ${response.statusText}`);
            }

            const data = await response.json();
            const arrayBuffer = base64ToArrayBuffer(data.audioContent);
            audioBuffers.push(arrayBuffer);
        }

        progressText.textContent = 'Concatenando áudios...';

        // Concatenar áudios
        const concatenatedBuffer = await concatenarAudios(audioBuffers);

        progressText.textContent = 'Gerando MP3...';

        // Converter para MP3
        const mp3Blob = audioBufferToMp3(concatenatedBuffer);

        // Criar URL para download
        const url = URL.createObjectURL(mp3Blob);

        // Atualizar player de áudio
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer) {
            audioPlayer.src = url;
            audioPlayer.style.display = 'block';
        }

        // Criar botão de download
        const downloadBtn = document.getElementById('btnDownload') || document.createElement('a');
        downloadBtn.id = 'btnDownload';
        downloadBtn.href = url;
        downloadBtn.download = 'audio.mp3';
        downloadBtn.textContent = 'Download MP3';
        downloadBtn.className = 'btn btn-success';
        downloadBtn.style.display = 'inline-block';

        if (!document.getElementById('btnDownload')) {
            document.getElementById('controles').appendChild(downloadBtn);
        }

        progressText.textContent = 'Concluído!';
        setTimeout(() => {
            progressDiv.style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao gerar áudio: ' + error.message);
        progressDiv.style.display = 'none';
    } finally {
        btnGerar.disabled = false;
        btnGerar.textContent = 'Gerar Áudio';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const btnGerar = document.getElementById('btnGerar');
    if (btnGerar) {
        btnGerar.addEventListener('click', gerarAudio);
    }
});
