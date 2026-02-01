let dnaSequence = "";

// ---------- INPUT ----------

function loadInput() {
  const input = document.getElementById("inputBox").value.trim();
  if (!input) return;

  if (input.includes("\n")) {
    dnaSequence = parseFasta(input);
    done("Sequence loaded");
    return;
  }

  if (/^[ATGCU\s]+$/i.test(input)) {
    dnaSequence = input.replace(/U/gi, "T").replace(/\s+/g, "").toUpperCase();
    done("Sequence loaded");
    return;
  }

  document.getElementById("status").textContent = "Invalid input";
}

// ---------- PARSER ----------

function parseFasta(text) {
  return text
    .split(/\r?\n/)
    .filter(line => !line.startsWith(">"))
    .join("")
    .replace(/U/gi, "T")
    .replace(/[^ATGC]/gi, "")
    .toUpperCase();
}

function done(msg) {
  document.getElementById("inputBox").value = dnaSequence;
  if (dnaSequence.length > 5000) {
    document.getElementById("status").textContent =
      msg + " (only first 5000 bases will be played)";
  } else {
    document.getElementById("status").textContent = msg;
  }
}

// ---------- CONTROLS ----------

function getMapping() {
  return {
    A: parseFloat(noteA.value),
    T: parseFloat(noteT.value),
    G: parseFloat(noteG.value),
    C: parseFloat(noteC.value)
  };
}

function updateSpeedDisplay() {
  speedVal.textContent = speed.value;
}

// ---------- AUDIO GENERATION ----------

async function generateAndPlay() {
  if (!dnaSequence) return;

  const status = document.getElementById("status");
  status.textContent = "Generating audio...";

  let seq = dnaSequence.slice(0, 5000);
  const speed = parseFloat(document.getElementById("speed").value);
  const waveform = document.getElementById("waveform").value;
  const mapping = getMapping();

  const sampleRate = 44100;
  const duration = seq.length * speed;
  const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

  let t = 0;
  for (let base of seq) {
    const freq = mapping[base];
    if (!freq) continue;
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + speed);
    t += speed;
  }

  const buffer = await ctx.startRendering();
  const wav = bufferToWav(buffer);
  const url = URL.createObjectURL(wav);

  audioPlayer.src = url;
  audioPlayer.play();
  downloadBtn.href = url;
  downloadBtn.download = "dna_music.wav";

  status.textContent = "Audio generated.";
}

// ---------- WAV ----------

function bufferToWav(buffer) {
  const samples = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const len = samples.length * 2;
  const buf = new ArrayBuffer(44 + len);
  const view = new DataView(buf);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, len, true);
  floatTo16(view, 44, samples);
  return new Blob([buf], { type: "audio/wav" });
}

function floatTo16(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}