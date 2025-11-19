document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const textInput = document.getElementById('textInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const speedInput = document.getElementById('speedInput');
    const generateBtn = document.getElementById('generateBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const statusDiv = document.getElementById('status');
    const textDisplay = document.getElementById('textDisplay');
    const selectedParagraphsDiv = document.getElementById('selectedParagraphs');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadLink = document.getElementById('downloadLink');

    let currentTextContent = '';
    let selectedParagraphs = new Set(); // Usar Set para armazenar IDs ou índices de parágrafos selecionados

    // Hardcoded voices for pt-BR
    const hardcodedVoices = [
        { name: 'Portuguese (Brazil) Wavenet-A (pt-BR-Wavenet-A)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Wavenet-B (pt-BR-Wavenet-B)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Wavenet-C (pt-BR-Wavenet-C)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Wavenet-D (pt-BR-Wavenet-D)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Wavenet-E (pt-BR-Wavenet-E)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Wavenet-F (pt-BR-Wavenet-F)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Neural2-A (pt-BR-Neural2-A)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Neural2-B (pt-BR-Neural2-B)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Neural2-C (pt-BR-Neural2-C)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Chirp (pt-BR-Standard-C)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Chirp (pt-BR-Standard-A)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Chirp (pt-BR-Standard-B)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Chirp (pt-BR-Standard-D)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Chirp (pt-BR-Standard-E)', languageCode: 'pt-BR', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 },
        { name: 'Portuguese (Brazil) Chirp (pt-BR-Standard-F)', languageCode: 'pt-BR', ssmlGender: 'MALE', naturalSampleRateHertz: 24000 },
    ];

    function populateVoiceSelect() {
        voiceSelect.innerHTML = ''; // Clear existing options
        hardcodedVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name; // Use full name as value
            option.textContent = voice.name;
            voiceSelect.appendChild(option);
        });
        // Set a default voice if available
        const defaultVoice = hardcodedVoices.find(v => v.name.includes('Chirp3-HD-Algieba')) || hardcodedVoices[0];
        if (defaultVoice) {
            voiceSelect.value = defaultVoice.name;
        }
    }

    populateVoiceSelect();

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        statusDiv.textContent = 'Lendo arquivo...';
        textDisplay.innerHTML = '';
        currentTextContent = '';
        selectedParagraphs.clear();
        updateSelectedParagraphsDisplay();
        generateBtn.disabled = true;
        downloadBtn.style.display = 'none';
        downloadLink.href = '#';
        downloadLink.download = '';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const fileType = file.name.split('.').pop().toLowerCase();

            let text = '';
            if (fileType === 'pdf') {
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdf.numPages;
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
            } else if (fileType === 'docx') {
                const zip = new JSZip();
                const doc = await zip.loadAsync(arrayBuffer);
                const contentXml = await doc.file('word/document.xml').async('text');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(contentXml, 'application/xml');
                const paragraphs = xmlDoc.getElementsByTagName('w:p');
                for (let i = 0; i < paragraphs.length; i++) {
                    text += paragraphs[i].textContent + '\n';
                }
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                text = XLSX.utils.sheet_to_txt(worksheet);
            } else if (fileType === 'txt') {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(arrayBuffer);
            } else {
                statusDiv.textContent = 'Tipo de arquivo não suportado.';
                return;
            }

            currentTextContent = text;
            displayParagraphs(text);
            statusDiv.textContent = 'Arquivo lido com sucesso. Selecione os parágrafos ou gere o áudio.';
            generateBtn.disabled = false;

        } catch (error) {
            console.error('Erro ao ler o arquivo:', error);
            statusDiv.textContent = 'Erro ao ler o arquivo.';
        }
    });

    textInput.addEventListener('input', () => {
        currentTextContent = textInput.value;
        textDisplay.innerHTML = ''; // Clear paragraphs when typing in textarea
        selectedParagraphs.clear();
        updateSelectedParagraphsDisplay();
        generateBtn.disabled = currentTextContent.trim() === '';
        downloadBtn.style.display = 'none';
        downloadLink.href = '#';
        downloadLink.download = '';
    });

    function displayParagraphs(text) {
        textDisplay.innerHTML = '';
        const paragraphs = text.split(/\n+/).filter(p => p.trim() !== ''); // Split by one or more newlines
        paragraphs.forEach((pText, index) => {
            const p = document.createElement('p');
            p.textContent = pText.trim();
            p.dataset.index = index; // Store original index
            p.classList.add('paragraph-item'); // Add a class for styling

            p.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) { // Verifica se Ctrl (Windows/Linux) ou Command (Mac) está pressionado
                    toggleSelecaoParagrafo(p);
                }
            });

            // Suporte para mobile (toque longo)
            let touchTimer;
            p.addEventListener('touchstart', (e) => {
                touchTimer = setTimeout(() => {
                    toggleSelecaoParagrafo(p);
                }, 500); // 500ms para toque longo
            });

            p.addEventListener('touchend', () => {
                clearTimeout(touchTimer);
            });

            textDisplay.appendChild(p);
        });
    }

    function toggleSelecaoParagrafo(elemento) {
        const index = parseInt(elemento.dataset.index);
        if (selectedParagraphs.has(index)) {
            selectedParagraphs.delete(index);
            elemento.classList.remove('selecionado');
        } else {
            selectedParagraphs.add(index);
            elemento.classList.add('selecionado');
        }
        updateSelectedParagraphsDisplay();
    }

    function updateSelectedParagraphsDisplay() {
        selectedParagraphsDiv.textContent = `Parágrafos selecionados: ${selectedParagraphs.size}`;
        clearSelectionBtn.style.display = selectedParagraphs.size > 0 ? 'inline-block' : 'none';
    }

    clearSelectionBtn.addEventListener('click', () => {
        selectedParagraphs.clear();
        document.querySelectorAll('.paragraph-item').forEach(p => {
            p.classList.remove('selecionado');
        });
        updateSelectedParagraphsDisplay();
    });

    generateBtn.addEventListener('click', async () => {
        let textToSynthesize = currentTextContent;

        if (selectedParagraphs.size > 0) {
            const allParagraphs = currentTextContent.split(/\n+/).filter(p => p.trim() !== '');
            const sortedIndices = Array.from(selectedParagraphs).sort((a, b) => a - b);
            textToSynthesize = sortedIndices.map(index => allParagraphs[index]).join('\n\n');
        }

        if (textToSynthesize.trim() === '') {
            statusDiv.textContent = 'Nenhum texto para sintetizar.';
            return;
        }

        generateBtn.disabled = true;
        statusDiv.textContent = 'Gerando áudio...';
        audioPlayer.src = '';
        downloadBtn.style.display = 'none';
        downloadLink.href = '#';
        downloadLink.download = '';

        try {
            const selectedVoiceOption = voiceSelect.options[voiceSelect.selectedIndex];
            const selectedVoiceName = selectedVoiceOption.value;
            const voice = hardcodedVoices.find(v => v.name === selectedVoiceName);

            if (!voice) {
                statusDiv.textContent = 'Voz selecionada não encontrada.';
                generateBtn.disabled = false;
                return;
            }

            const chunks = dividirTextoEmChunks(textToSynthesize, 2500);
            const audioBuffers = [];

            for (let i = 0; i < chunks.length; i++) {
                statusDiv.textContent = `Gerando áudio ${i + 1}/${chunks.length}...`;
                const response = await fetch('https://meu-proxy-tts.onrender.com/synthesize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: chunks[i],
                        voiceName: voice.name,
                        languageCode: voice.languageCode,
                        ssmlGender: voice.ssmlGender,
                        speakingRate: parseFloat(speedInput.value),
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
                }

                const audioBlob = await response.blob();
                const arrayBuffer = await audioBlob.arrayBuffer();
                audioBuffers.push(arrayBuffer);
            }

            statusDiv.textContent = 'Concatenando áudios...';
            const finalAudioBlob = await concatenarAudios(audioBuffers);

            const audioUrl = URL.createObjectURL(finalAudioBlob);
            audioPlayer.src = audioUrl;
            audioPlayer.play();
            statusDiv.textContent = 'Áudio gerado e reproduzindo!';

            downloadLink.href = audioUrl;
            downloadLink.download = 'audio_sintetizado.mp3';
            downloadBtn.style.display = 'inline-block';

        } catch (error) {
            console.error('Erro ao gerar áudio:', error);
            statusDiv.textContent = `Erro ao gerar áudio: ${error.message}`;
        } finally {
            generateBtn.disabled = false;
        }
    });

    function dividirTextoEmChunks(texto, tamanhoMaximo) {
        const chunks = [];
        let textoRestante = texto;

        while (textoRestante.length > 0) {
            if (textoRestante.length <= tamanhoMaximo) {
                chunks.push(textoRestante);
                break;
            }

            let pontoCorte = -1;

            // Tenta cortar em quebras de linha
            pontoCorte = textoRestante.lastIndexOf('\n', tamanhoMaximo);
            if (pontoCorte === -1) {
                pontoCorte = textoRestante.lastIndexOf('.', tamanhoMaximo);
            }
            if (pontoCorte === -1) {
                pontoCorte = textoRestante.lastIndexOf('!', tamanhoMaximo);
            }
            if (pontoCorte === -1) {
                pontoCorte = textoRestante.lastIndexOf('?', tamanhoMaximo);
            }
            if (pontoCorte === -1) {
                pontoCorte = textoRestante.lastIndexOf(';', tamanhoMaximo);
            }
            if (pontoCorte === -1) {
                pontoCorte = textoRestante.lastIndexOf(',', tamanhoMaximo);
            }
            if (pontoCorte === -1) {
                pontoCorte = textoRestante.lastIndexOf(' ', tamanhoMaximo);
            }

            if (pontoCorte === -1 || pontoCorte === 0) {
                // Se não encontrou um bom ponto de corte, corta no tamanho máximo
                pontoCorte = tamanhoMaximo;
            } else {
                // Inclui o caractere de pontuação no chunk atual
                pontoCorte++;
            }

            chunks.push(textoRestante.substring(0, pontoCorte).trim());
            textoRestante = textoRestante.substring(pontoCorte).trim();
        }
        return chunks.filter(chunk => chunk.length > 0); // Remove chunks vazios
    }

    async function concatenarAudios(audioArrayBuffers) {
        if (audioArrayBuffers.length === 0) {
            return new Blob([], { type: 'audio/mpeg' });
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const decodedAudios = await Promise.all(audioArrayBuffers.map(buffer => audioContext.decodeAudioData(buffer)));

        // Determine the maximum sample rate and number of channels
        let maxSampleRate = 0;
        let maxChannels = 0;
        decodedAudios.forEach(audio => {
            if (audio.sampleRate > maxSampleRate) maxSampleRate = audio.sampleRate;
            if (audio.numberOfChannels > maxChannels) maxChannels = audio.numberOfChannels;
        });

        // Calculate total length
        let totalLength = 0;
        decodedAudios.forEach(audio => {
            // Adjust length if sample rates differ
            totalLength += audio.length * (maxSampleRate / audio.sampleRate);
        });

        const finalBuffer = audioContext.createBuffer(maxChannels, totalLength, maxSampleRate);

        let offset = 0;
        decodedAudios.forEach(audio => {
            for (let channel = 0; channel < audio.numberOfChannels; channel++) {
                const inputData = audio.getChannelData(channel);
                const outputData = finalBuffer.getChannelData(channel);

                // Resample if sample rates differ
                if (audio.sampleRate !== maxSampleRate) {
                    const ratio = audio.sampleRate / maxSampleRate;
                    for (let i = 0; i < inputData.length; i++) {
                        const outputIndex = Math.floor(i / ratio) + offset;
                        if (outputIndex < totalLength) {
                            outputData[outputIndex] += inputData[i]; // Simple resampling and mixing
                        }
                    }
                } else {
                    outputData.set(inputData, offset);
                }
            }
            offset += audio.length * (maxSampleRate / audio.sampleRate);
        });

        // Encode to MP3 using lamejs
        const mp3encoder = new lamejs.Mp3Encoder(maxChannels, maxSampleRate, 128); // stereo (2), 44.1kHz, 128kbps
        const mp3Data = [];

        // Get channel data from the finalBuffer
        const left = finalBuffer.getChannelData(0);
        const right = maxChannels > 1 ? finalBuffer.getChannelData(1) : left; // Use left for right if mono

        const sampleBlockSize = 1152; // can be anything but 1152 is a good default
        for (let i = 0; i < left.length; i += sampleBlockSize) {
            const leftChunk = left.subarray(i, i + sampleBlockSize);
            const rightChunk = right.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }
        const mp3buf = mp3encoder.flush();   // finish writing mp3
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        return new Blob(mp3Data, { type: 'audio/mpeg' });
    }
});