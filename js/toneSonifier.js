class ToneSonifier {
    constructor() {
        this.isInitialized = false;
        this.activeChannels = new Map();
        this.isPlaying = false;
        this.masterVolume = null;
        
        // Simplified, intuitive audio mappings
        this.audioMappings = [
            'melody',      // Lead musical line
            'bass',        // Deep foundation tones  
            'harmony',     // Rich accompaniment
            'ambient',     // Atmospheric pads
            'bells'        // Sparkling metallic tones
        ];

        // Musical scales
        this.scales = {
            major: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
            minor: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'],
            pentatonic: ['C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5'],
            blues: ['C4', 'Eb4', 'F4', 'Gb4', 'G4', 'Bb4', 'C5', 'Eb5'],
            dorian: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5']
        };

        this.currentScale = 'pentatonic';
        this.beatTempo = 120;
    }

    async initializeAudio() {
        if (this.isInitialized) return;
        
        try {
            await Tone.start();
            
            // Create master volume control
            this.masterVolume = new Tone.Volume(-10).toDestination();
            
            console.log('Tone.js audio system initialized');
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Tone.js audio:', error);
        }
    }

    createChannel(datastreamId, name, audioMapping = 'melody') {
        if (this.activeChannels.has(datastreamId) || !this.isInitialized) {
            if (!this.isInitialized) {
                this.initializeAudio().then(() => {
                    this.createChannel(datastreamId, name, audioMapping);
                });
            }
            return null;
        }

        let instrument, effects;

        switch (audioMapping) {
            case 'melody':
                // Crystal-clear lead melodic line
                instrument = new Tone.Synth({
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.8 }
                });
                effects = new Tone.Reverb(0.3).connect(
                    new Tone.Filter(3000, 'highpass').connect(this.masterVolume)
                );
                instrument.connect(effects);
                break;

            case 'bass':
                // Deep bass foundation
                instrument = new Tone.MonoSynth({
                    oscillator: { type: 'square' },
                    filter: { Q: 6, type: 'lowpass', rolloff: -24 },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.4 }
                });
                effects = new Tone.Filter(400, 'lowpass').connect(this.masterVolume);
                instrument.connect(effects);
                break;

            case 'harmony':
                // Rich harmonic accompaniment
                instrument = new Tone.PolySynth({
                    oscillator: { type: 'sawtooth' },
                    envelope: { attack: 0.2, decay: 0.4, sustain: 0.7, release: 1.0 }
                });
                effects = new Tone.Filter(1500, 'lowpass').connect(
                    new Tone.Chorus(4, 2.5, 0.5).connect(this.masterVolume)
                );
                instrument.connect(effects);
                break;

            case 'ambient':
                // Atmospheric pads with space and depth
                instrument = new Tone.PolySynth({
                    oscillator: { type: 'sine' },
                    envelope: { attack: 2, decay: 1, sustain: 0.8, release: 3 }
                });
                effects = new Tone.FeedbackDelay('8n', 0.4).connect(
                    new Tone.Reverb(0.8).connect(this.masterVolume)
                );
                instrument.connect(effects);
                break;

            case 'bells':
                // Sparkling metallic tones
                instrument = new Tone.MetalSynth({
                    frequency: 200,
                    envelope: { attack: 0.001, decay: 1.4, release: 0.2 },
                    harmonicity: 5.1,
                    modulationIndex: 32,
                    resonance: 4000,
                    octaves: 1.5
                });
                effects = new Tone.Chorus(4, 2.5, 0.5).connect(
                    new Tone.Reverb(0.4).connect(this.masterVolume)
                );
                instrument.connect(effects);
                break;
        }

        const channel = {
            datastreamId,
            name,
            audioMapping,
            instrument,
            effects,
            isPlaying: false,
            volume: 0.7,
            currentValue: 0,
            minValue: null,
            maxValue: null,
            valueHistory: [],
            lastNoteTime: 0,
            currentNote: null
        };

        this.activeChannels.set(datastreamId, channel);
        return channel;
    }

    removeChannel(datastreamId) {
        if (!this.activeChannels.has(datastreamId)) return;

        const channel = this.activeChannels.get(datastreamId);
        
        // Stop any playing notes
        if (channel.currentNote && channel.audioMapping === 'melody') {
            try {
                channel.instrument.triggerRelease();
            } catch (e) {
                // Note might already be released
            }
        }

        // Dispose of Tone.js objects
        if (channel.instrument) {
            channel.instrument.dispose();
        }
        if (channel.effects) {
            channel.effects.dispose();
        }

        this.activeChannels.delete(datastreamId);
    }

    updateChannelValue(datastreamId, value) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel || !this.isInitialized) return;

        // Update value history for auto-scaling
        channel.valueHistory.push(value);
        if (channel.valueHistory.length > 50) {
            channel.valueHistory.shift();
        }

        // Auto-detect min/max from recent history
        if (channel.valueHistory.length >= 10) {
            const sortedValues = [...channel.valueHistory].sort((a, b) => a - b);
            const percentile5 = sortedValues[Math.floor(sortedValues.length * 0.05)];
            const percentile95 = sortedValues[Math.floor(sortedValues.length * 0.95)];
            
            channel.minValue = percentile5;
            channel.maxValue = percentile95;
        }

        const previousValue = channel.currentValue;
        channel.currentValue = value;

        if (!channel.isPlaying) return;

        const normalizedValue = this.normalizeValue(value, channel.minValue, channel.maxValue);
        const currentTime = Tone.now();

        switch (channel.audioMapping) {
            case 'melody':
                this.updateMelody(channel, normalizedValue, currentTime);
                break;

            case 'bass':
                this.updateBass(channel, normalizedValue, currentTime);
                break;

            case 'harmony':
                this.updateHarmony(channel, normalizedValue, currentTime);
                break;

            case 'ambient':
                this.updateAmbient(channel, normalizedValue, currentTime);
                break;

            case 'bells':
                this.updateBells(channel, normalizedValue, previousValue, currentTime);
                break;
        }
    }

    updateMelody(channel, normalizedValue, currentTime) {
        // Convert normalized value to musical note - lead melodic line
        const scaleNotes = this.scales[this.currentScale];
        const noteIndex = Math.floor(normalizedValue * (scaleNotes.length - 1));
        const note = scaleNotes[noteIndex];

        // Only trigger new note if it's different or enough time has passed
        if (note !== channel.currentNote || currentTime - channel.lastNoteTime > 0.5) {
            if (channel.currentNote) {
                channel.instrument.triggerRelease();
            }
            
            const velocity = 0.3 + (normalizedValue * 0.4); // 0.3 to 0.7
            channel.instrument.triggerAttack(note, currentTime, velocity);
            channel.currentNote = note;
            channel.lastNoteTime = currentTime;
        }
    }

    updateBass(channel, normalizedValue, currentTime) {
        // Play bass notes on a steady rhythm, two octaves lower
        const scaleNotes = this.scales[this.currentScale];
        const noteIndex = Math.floor(normalizedValue * (scaleNotes.length - 1));
        const bassNote = Tone.Frequency(scaleNotes[noteIndex]).transpose(-24); // 2 octaves down

        if (currentTime - channel.lastNoteTime > 1) { // Every second
            const velocity = 0.4 + (normalizedValue * 0.3);
            channel.instrument.triggerAttackRelease(bassNote, '4n', currentTime, velocity);
            channel.lastNoteTime = currentTime;
        }
    }

    updateHarmony(channel, normalizedValue, currentTime) {
        // Play sustained chords that change with the data
        const scaleNotes = this.scales[this.currentScale];
        const baseIndex = Math.floor(normalizedValue * (scaleNotes.length - 3));
        
        // Create a triad (3-note chord) one octave higher
        const chord = [
            Tone.Frequency(scaleNotes[baseIndex]).transpose(12),
            Tone.Frequency(scaleNotes[baseIndex + 2]).transpose(12),
            Tone.Frequency(scaleNotes[baseIndex + 4] || scaleNotes[baseIndex + 1]).transpose(12)
        ];

        // Only change chord if value has changed significantly
        if (currentTime - channel.lastNoteTime > 2) {
            const velocity = 0.2 + (normalizedValue * 0.3);
            channel.instrument.triggerAttackRelease(chord, '2n', currentTime, velocity);
            channel.lastNoteTime = currentTime;
        }
    }

    updateAmbient(channel, normalizedValue, currentTime) {
        // Play atmospheric sustained chords with long attack/release
        const scaleNotes = this.scales[this.currentScale];
        const baseIndex = Math.floor(normalizedValue * (scaleNotes.length - 3));
        
        // Create ambient chord cluster
        const ambientChord = [
            scaleNotes[baseIndex],
            scaleNotes[baseIndex + 2],
            scaleNotes[baseIndex + 4] || scaleNotes[baseIndex + 1]
        ];

        // Very slow chord changes for atmospheric effect
        if (currentTime - channel.lastNoteTime > 4) {
            const velocity = 0.1 + (normalizedValue * 0.2); // Very quiet
            channel.instrument.triggerAttackRelease(ambientChord, '1m', currentTime, velocity); // 1 measure long
            channel.lastNoteTime = currentTime;
        }
    }

    updateBells(channel, normalizedValue, previousValue, currentTime) {
        // Trigger bell sounds on data peaks and significant changes
        const changeMagnitude = Math.abs(normalizedValue - previousValue);
        
        if ((normalizedValue > 0.7 || changeMagnitude > 0.15) && currentTime - channel.lastNoteTime > 0.5) {
            const scaleNotes = this.scales[this.currentScale];
            const noteIndex = Math.floor(normalizedValue * (scaleNotes.length - 1));
            const bellNote = Tone.Frequency(scaleNotes[noteIndex]).transpose(24); // 2 octaves up
            
            const velocity = 0.3 + (normalizedValue * 0.4);
            channel.instrument.triggerAttackRelease(bellNote, '2n', currentTime, velocity);
            channel.lastNoteTime = currentTime;
        }
    }

    startChannel(datastreamId) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        channel.isPlaying = true;
        
        // Trigger initial sound based on current value
        this.updateChannelValue(datastreamId, channel.currentValue);
    }

    stopChannel(datastreamId) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        channel.isPlaying = false;
        
        // Stop any playing notes
        if (channel.currentNote && channel.audioMapping === 'melody') {
            try {
                channel.instrument.triggerRelease();
                channel.currentNote = null;
            } catch (e) {
                // Note might already be released
            }
        }
    }

    setChannelVolume(datastreamId, volume) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        channel.volume = Math.max(0, Math.min(1, volume / 100));
        
        // Update instrument volume
        if (channel.instrument.volume) {
            const dbVolume = Tone.gainToDb(channel.volume);
            channel.instrument.volume.value = dbVolume;
        }
    }

    setChannelMapping(datastreamId, audioMapping) {
        // Remove old channel and create new one with different mapping
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        const wasPlaying = channel.isPlaying;
        const currentValue = channel.currentValue;
        const name = channel.name;

        this.removeChannel(datastreamId);
        this.createChannel(datastreamId, name, audioMapping);
        
        if (wasPlaying) {
            this.startChannel(datastreamId);
        }
        
        // Apply current value with new mapping
        this.updateChannelValue(datastreamId, currentValue);
    }

    setChannelValueRange(datastreamId, minValue, maxValue) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        channel.minValue = minValue;
        channel.maxValue = maxValue;
    }

    startAll() {
        if (!this.isInitialized) {
            this.initializeAudio().then(() => this.startAll());
            return;
        }

        this.isPlaying = true;
        this.activeChannels.forEach((channel, datastreamId) => {
            this.startChannel(datastreamId);
        });
    }

    stopAll() {
        this.isPlaying = false;
        this.activeChannels.forEach((channel, datastreamId) => {
            this.stopChannel(datastreamId);
        });
    }

    setMasterVolume(volume) {
        if (this.masterVolume) {
            const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
            const dbVolume = Tone.gainToDb(normalizedVolume);
            this.masterVolume.volume.value = dbVolume;
        }
    }

    normalizeValue(value, min, max) {
        if (max === min) return 0.5;
        return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }

    getAvailableMappings() {
        return [...this.audioMappings];
    }

    getChannelInfo(datastreamId) {
        return this.activeChannels.get(datastreamId);
    }

    getAllChannels() {
        return Array.from(this.activeChannels.values());
    }

    setMusicalScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
        }
    }

    getAvailableScales() {
        return Object.keys(this.scales);
    }

    // Tempo synchronization methods
    setBeatTempo(bpm) {
        this.beatTempo = Math.max(60, Math.min(200, bpm));
        
        // Update Tone.js transport if needed
        Tone.Transport.bpm.value = this.beatTempo;
        
        // Notify beat maker about tempo change
        const tempoChangeEvent = new CustomEvent('tempoChange', {
            detail: { bpm: this.beatTempo }
        });
        document.dispatchEvent(tempoChangeEvent);
    }

    getCurrentTempo() {
        return this.beatTempo;
    }

    onTabSwitch(tabName) {
        if (tabName === 'sensor-data') {
            this.synchronizeWithBeatMaker();
        }
    }

    synchronizeWithBeatMaker() {
        if (window.beatMaker && window.beatMaker.tempoSynced) {
            const beatMakerTempo = window.beatMaker.getBPM();
            if (beatMakerTempo !== this.beatTempo) {
                this.beatTempo = beatMakerTempo;
                Tone.Transport.bpm.value = this.beatTempo;
                this.updateTempoDisplay();
            }
        }
    }

    updateTempoDisplay() {
        const tempoDisplay = document.getElementById('tempo-display');
        const tempoSlider = document.getElementById('beat-tempo');
        
        if (tempoDisplay) {
            tempoDisplay.textContent = this.beatTempo;
        }
        if (tempoSlider) {
            tempoSlider.value = this.beatTempo;
        }
    }
}