let dnaSequence = "";
let isPlaying = false;

const inputBox = document.getElementById("inputBox");
const status = document.getElementById("status");
const tempoSlider = document.getElementById("tempo");

const melodyInstrumentSelect = document.getElementById("melodyInstrument");
const chordInstrumentSelect = document.getElementById("chordInstrument");

const mapA = document.getElementById("mapA");
const mapT = document.getElementById("mapT");
const mapG = document.getElementById("mapG");
const mapC = document.getElementById("mapC");

const codonMapBox = document.getElementById("codonMapBox");

// Recorder
const recorder = new Tone.Recorder();
Tone.getDestination().connect(recorder);

// Synths
let melodySynth;
let chordSynth;

// ---------- INPUT ----------
function loadInput() {
  let input = inputBox.value.trim();
  if (!input) return;

  dnaSequence = input
    .split(/\r?\n/)
    .filter(l => !l.startsWith(">"))
    .join("")
    .replace(/U/gi, "T")
    .replace(/[^ATGC]/gi, "")
    .toUpperCase();

  status.textContent = "Sequence loaded.";
}

// ---------- BASE → NOTE ----------
function baseToNote(b) {
  if (b === "A") return mapA.value;
  if (b === "T") return mapT.value;
  if (b === "G") return mapG.value;
  if (b === "C") return mapC.value;
  return "C4";
}

// ---------- REAL TRIAD ----------
function makeMajorTriad(rootNote) {
  const root = Tone.Frequency(rootNote);
  return [
    root.toNote(),
    root.transpose(4).toNote(),
    root.transpose(7).toNote()
  ];
}

// ---------- PARSE USER CODON MAP ----------
function parseCodonMappings() {
  const text = codonMapBox.value.trim();
  let map = {};

  if (!text) return map;

  const lines = text.split(/\r?\n/);
  for (let line of lines) {
    if (!line.includes("=")) continue;

    const [codon, chordStr] = line.split("=");
    const notes = chordStr.split(",").map(n => n.trim());

    if (/^[ATGC]{3}$/.test(codon) && notes.length >= 3) {
      map[codon] = notes;
    }
  }
  return map;
}

// ---------- BUILD SYNTHS ----------
function buildSynths() {
  if (melodySynth) melodySynth.dispose();
  if (chordSynth) chordSynth.dispose();

  const melType = melodyInstrumentSelect.value;
  const chordType = chordInstrumentSelect.value;

  if (melType === "fm") {
    melodySynth = new Tone.FMSynth().toDestination();
  } else if (melType === "am") {
    melodySynth = new Tone.AMSynth().toDestination();
  } else {
    melodySynth = new Tone.Synth({
      oscillator: { type: melType },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.2,
        release: 0.5
      }
    }).toDestination();
  }

  if (chordType === "fm") {
    chordSynth = new Tone.PolySynth(Tone.FMSynth);
  } else if (chordType === "am") {
    chordSynth = new Tone.PolySynth(Tone.AMSynth);
  } else {
    chordSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: chordType },
      envelope: {
        attack: 0.2,
        decay: 0.5,
        sustain: 0.6,
        release: 1.0
      }
    });
  }

  chordSynth.volume.value = -12;
  const chordFilter = new Tone.Filter(600, "lowpass").toDestination();
  chordSynth.connect(chordFilter);
}

// ---------- MUSIC ----------
async function playMusic() {
  if (!dnaSequence) return;

  status.textContent = "Generating audio...";

  await Tone.start();
  Tone.Transport.stop();
  Tone.Transport.cancel();

  buildSynths();
  Tone.Transport.bpm.value = tempoSlider.value;

  const codonMap = parseCodonMappings();

  let melodyEvents = [];
  let chordEvents = [];

  const step = 0.4;
  const melodyDur = "4n";
  const chordDur = "2n";

  for (let i = 0; i < dnaSequence.length; i++) {
    const note = baseToNote(dnaSequence[i]).replace("4", "5");
    melodyEvents.push([i * step, note]);
  }

  let t = 0;
  for (let i = 0; i < dnaSequence.length - 2; i += 3) {
    const codon = dnaSequence.slice(i, i + 3);

    let chord;
    if (codonMap[codon]) {
      chord = codonMap[codon];
    } else {
      const root = baseToNote(codon[0]).replace("4", "3");
      chord = makeMajorTriad(root);
    }

    chordEvents.push([t, chord]);
    t += step * 3;
  }

  const melodyPart = new Tone.Part((time, note) => {
    melodySynth.triggerAttackRelease(note, melodyDur, time);
  }, melodyEvents);

  const chordPart = new Tone.Part((time, chord) => {
    chordSynth.triggerAttackRelease(chord, chordDur, time);
  }, chordEvents);

  melodyPart.start(0);
  chordPart.start(0);

  recorder.start();
  Tone.Transport.start();

  status.textContent = "Audio generated.";
}

// ---------- PLAY / PAUSE ----------
function togglePlay() {
  if (Tone.Transport.state === "started") {
    Tone.Transport.pause();
    status.textContent = "Paused.";
  } else if (Tone.Transport.state === "paused") {
    Tone.Transport.start();
    status.textContent = "Playing...";
  }
}

// ---------- DOWNLOAD ----------
async function downloadAudio() {
  status.textContent = "Exporting audio...";

  const recording = await recorder.stop();
  const url = URL.createObjectURL(recording);

  const a = document.createElement("a");
  a.href = url;
  a.download = "dna_music.wav";
  a.click();

  status.textContent = "Audio downloaded.";
}