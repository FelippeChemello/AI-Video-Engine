import wav from 'wav'

export async function saveWaveFile(filePath: string, audioBuffer: Buffer, channels = 1, rate = 24000, sampleWidth = 2) {
    return new Promise<void>((resolve, reject) => {
        const writer = new wav.FileWriter(filePath, {
            channels,
            sampleRate: rate,
            bitDepth: sampleWidth * 8,
        })

        writer.on('error', (err) => {
            console.error(`[SAVE-WAV] Error writing WAV file: ${err}`)
            reject(err)
        })
        writer.on('finish', () => {
            console.log(`[SAVE-WAV] WAV file saved successfully: ${filePath}`)
            resolve()
        })

        writer.write(audioBuffer)
        writer.end()
        console.log(`[SAVE-WAV] Finished writing WAV file: ${filePath}`)
    })
}

interface WavConversionOptions {
  numChannels: number,
  sampleRate: number,
  bitsPerSample: number
}

export function convertToWav(rawData: string, mimeType: string) {
  const options = parseMimeType(mimeType)
  const buffer = Buffer.from(rawData, 'base64');
  const wavHeader = createWavHeader(buffer.length, options);

  return Buffer.concat([wavHeader, buffer]);
}

function parseMimeType(mimeType: string) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const format = fileType.split('/')[1];

  const options: WavConversionOptions = {
    numChannels: 1,
    sampleRate: 24000,
    bitsPerSample: 16,
  };

  const linearPcmMatch = format?.match(/^L(\d+)$/i);
  if (linearPcmMatch) {
    const bits = Number.parseInt(linearPcmMatch[1], 10);
    if (Number.isInteger(bits) && bits > 0) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    const parsedValue = Number.parseInt(value, 10);

    if (key.toLowerCase() === 'rate' && Number.isInteger(parsedValue) && parsedValue > 0) {
      options.sampleRate = parsedValue;
    }

    if (key.toLowerCase() === 'channels' && Number.isInteger(parsedValue) && parsedValue > 0) {
      options.numChannels = parsedValue;
    }
  }

  return options;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
  buffer.write('WAVE', 8);                      // Format
  buffer.write('fmt ', 12);                     // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);        // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
  buffer.writeUInt32LE(byteRate, 28);           // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
  buffer.write('data', 36);                     // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

  return buffer;
}
