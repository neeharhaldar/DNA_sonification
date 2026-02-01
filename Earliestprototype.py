import numpy as np
from scipy.io.wavfile import write

# DNA sequence (you can change this)
dna = "ATGCGTACGTTAGCGATCGATGCGTATATAGCG"

# Map bases to musical frequencies (Hz)
mapping = {
    "A": 261.63,  # C note
    "T": 293.66,  # D note
    "G": 329.63,  # E note
    "C": 349.23   # F note
}

sample_rate = 44100
note_duration = 0.2  # seconds per base

audio = []

for base in dna:
    freq = mapping.get(base, 0)
    t = np.linspace(0, note_duration, int(sample_rate * note_duration), False)
    wave = np.sin(2 * np.pi * freq * t)
    audio.extend(wave)

audio = np.array(audio)
audio = audio / np.max(np.abs(audio))  # normalize

write("dna_music.wav", sample_rate, audio)

print("Saved as dna_music.wav")