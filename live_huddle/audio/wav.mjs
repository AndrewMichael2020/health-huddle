export function pcm16ToWav(pcm, {sampleRate = 16000, channels = 1} = {}) {
  const bytesPerSample = 2;
  const header = Buffer.alloc(44 + pcm.length);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bytesPerSample * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  pcm.copy(header, 44);
  return header;
}

export function pcmDurationSeconds(pcmBytes, {sampleRate = 16000, channels = 1} = {}) {
  return pcmBytes / (sampleRate * channels * 2);
}
