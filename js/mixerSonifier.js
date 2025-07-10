class MixerSonifier {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.activeChannels = new Map();
        this.isPlaying = false;
        
        // Available audio mappings
        this.audioMappings = [
            'pitch', 'volume', 'filter', 'panning', 'rhythm', 'melody', 'bass', 'harmony'
        ];

        // Musical scales
        this.scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            pentatonic: [0, 2, 4, 7, 9],
            blues: [0, 3, 5, 6, 7, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10]
        };

        this.currentScale = 'pentatonic';
        this.baseFrequency = 220; // A3
        
        // Beat/rhythm system
        this.beatEnabled = false;
        this.beatInterval = null;
        this.beatTempo = 120; // BPM
        this.beatGain = null;
        this.beatOscillator = null;

        this.initializeAudio();
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);
            
            // Initialize beat system
            this.initializeBeatSystem();
            
            console.log('Mixer audio system initialized');
        } catch (error) {
            console.error('Failed to initialize mixer audio:', error);
        }
    }

    createChannel(datastreamId, name, audioMapping = 'pitch') {
        if (this.activeChannels.has(datastreamId) || !this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const pannerNode = this.audioContext.createStereoPanner();
        const filter = this.audioContext.createBiquadFilter();
        const delayNode = this.audioContext.createDelay(1.0);
        const delayGain = this.audioContext.createGain();
        const reverbConvolver = this.audioContext.createConvolver();

        // Set up audio chain with effects
        oscillator.connect(filter);
        filter.connect(gainNode);
        
        // Add delay effect
        gainNode.connect(delayNode);
        delayNode.connect(delayGain);
        delayGain.connect(gainNode); // Feedback
        delayNode.delayTime.value = 0.3;
        delayGain.gain.value = 0.2;
        
        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain);

        // Initial settings
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.value = 0;
        pannerNode.pan.value = 0;
        
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1;

        const channel = {
            datastreamId,
            name,
            audioMapping,
            oscillator,
            gainNode,
            pannerNode,
            filter,
            delayNode,
            delayGain,
            isPlaying: false,
            volume: 0.5,
            currentValue: 0,
            minValue: null, // Auto-detect from data
            maxValue: null, // Auto-detect from data
            valueHistory: [], // Track recent values for auto-scaling
            isStarted: false
        };

        this.activeChannels.set(datastreamId, channel);
        return channel;
    }

    removeChannel(datastreamId) {
        if (!this.activeChannels.has(datastreamId)) return;

        const channel = this.activeChannels.get(datastreamId);
        
        if (channel.isStarted) {
            try {
                channel.oscillator.stop();
            } catch (e) {
                // Oscillator might already be stopped
            }
        }

        this.activeChannels.delete(datastreamId);
    }

    updateChannelValue(datastreamId, value) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel || !this.audioContext) return;

        // Update value history for auto-scaling
        channel.valueHistory.push(value);
        if (channel.valueHistory.length > 50) {
            channel.valueHistory.shift(); // Keep last 50 values
        }

        // Auto-detect min/max from recent history
        if (channel.valueHistory.length >= 10) {
            const sortedValues = [...channel.valueHistory].sort((a, b) => a - b);
            const percentile5 = sortedValues[Math.floor(sortedValues.length * 0.05)];
            const percentile95 = sortedValues[Math.floor(sortedValues.length * 0.95)];
            
            channel.minValue = percentile5;
            channel.maxValue = percentile95;
        }

        channel.currentValue = value;

        if (!channel.isPlaying) return;

        const now = this.audioContext.currentTime;
        const normalizedValue = this.normalizeValue(value, channel.minValue, channel.maxValue);

        switch (channel.audioMapping) {
            case 'pitch':
                const frequency = 200 + (normalizedValue * 600); // 200-800 Hz
                channel.oscillator.frequency.setTargetAtTime(frequency, now, 0.1);
                break;

            case 'melody':
                const note = this.valueToNote(normalizedValue);
                const melodyFreq = this.noteToFrequency(note);
                channel.oscillator.frequency.setTargetAtTime(melodyFreq, now, 0.1);
                channel.oscillator.type = 'triangle';
                break;

            case 'bass':
                const bassNote = this.valueToNote(normalizedValue, -2); // Two octaves lower
                const bassFreq = this.noteToFrequency(bassNote);
                channel.oscillator.frequency.setTargetAtTime(bassFreq, now, 0.1);
                channel.oscillator.type = 'square';
                break;

            case 'harmony':
                const harmonyNote = this.valueToNote(normalizedValue, 1); // One octave higher
                const harmonyFreq = this.noteToFrequency(harmonyNote);
                channel.oscillator.frequency.setTargetAtTime(harmonyFreq, now, 0.1);
                channel.oscillator.type = 'sawtooth';
                break;

            case 'volume':
                const volume = Math.max(0.1, normalizedValue) * channel.volume;
                channel.gainNode.gain.setTargetAtTime(volume, now, 0.1);
                break;

            case 'filter':
                const filterFreq = 200 + (normalizedValue * 2000); // 200-2200 Hz
                channel.filter.frequency.setTargetAtTime(filterFreq, now, 0.1);
                // Add resonance variation
                const resonance = 1 + (normalizedValue * 10);
                channel.filter.Q.value = resonance;
                break;

            case 'panning':
                const pan = (normalizedValue - 0.5) * 2; // -1 to 1
                channel.pannerNode.pan.setTargetAtTime(pan, now, 0.1);
                break;

            case 'rhythm':
                // Rhythm affects volume pulsing and delay time
                this.updateRhythm(channel, normalizedValue);
                const delayTime = 0.1 + (normalizedValue * 0.4); // 0.1-0.5 seconds
                channel.delayNode.delayTime.setTargetAtTime(delayTime, now, 0.1);
                break;
        }
    }

    valueToNote(normalizedValue, octaveOffset = 0) {
        const scale = this.scales[this.currentScale];
        const noteIndex = Math.floor(normalizedValue * scale.length);
        const scaleNote = scale[Math.min(noteIndex, scale.length - 1)];
        
        // Add octave variation based on value
        const octave = 4 + octaveOffset + Math.floor(normalizedValue * 2);
        
        return scaleNote + (octave * 12);
    }

    noteToFrequency(midiNote) {
        // Convert MIDI note to frequency: A4 (440Hz) is MIDI note 69
        return this.baseFrequency * Math.pow(2, (midiNote - 57) / 12);
    }

    updateRhythm(channel, normalizedValue) {
        if (!channel.rhythmInterval) {
            const bpm = 60 + (normalizedValue * 60); // 60-120 BPM
            const interval = 60000 / bpm; // milliseconds per beat

            channel.rhythmInterval = setInterval(() => {
                if (channel.isPlaying && this.audioContext) {
                    const now = this.audioContext.currentTime;
                    const currentGain = channel.gainNode.gain.value;
                    
                    // Brief volume pulse
                    channel.gainNode.gain.setValueAtTime(currentGain, now);
                    channel.gainNode.gain.setValueAtTime(currentGain * 1.5, now + 0.05);
                    channel.gainNode.gain.setValueAtTime(currentGain, now + 0.1);
                }
            }, interval);
        }
    }

    startChannel(datastreamId) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel || channel.isPlaying || !this.audioContext) return;

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (!channel.isStarted) {
            channel.oscillator.start();
            channel.isStarted = true;
        }

        // Set initial volume based on mapping
        if (channel.audioMapping === 'volume') {
            const normalizedValue = this.normalizeValue(channel.currentValue, channel.minValue, channel.maxValue);
            channel.gainNode.gain.value = normalizedValue * channel.volume;
        } else {
            channel.gainNode.gain.value = channel.volume;
        }

        channel.isPlaying = true;
    }

    stopChannel(datastreamId) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel || !channel.isPlaying) return;

        channel.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
        channel.isPlaying = false;

        // Clear rhythm interval
        if (channel.rhythmInterval) {
            clearInterval(channel.rhythmInterval);
            channel.rhythmInterval = null;
        }
    }

    setChannelVolume(datastreamId, volume) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        channel.volume = Math.max(0, Math.min(1, volume));
        
        if (channel.isPlaying && channel.audioMapping !== 'volume') {
            channel.gainNode.gain.setTargetAtTime(
                channel.volume, 
                this.audioContext.currentTime, 
                0.1
            );
        }
    }

    setChannelMapping(datastreamId, audioMapping) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel || !this.audioMappings.includes(audioMapping)) return;

        // Clear old rhythm interval
        if (channel.rhythmInterval) {
            clearInterval(channel.rhythmInterval);
            channel.rhythmInterval = null;
        }

        channel.audioMapping = audioMapping;
        
        // Reset some parameters
        if (this.audioContext) {
            const now = this.audioContext.currentTime;
            
            switch (audioMapping) {
                case 'pitch':
                    channel.oscillator.frequency.setTargetAtTime(440, now, 0.1);
                    channel.gainNode.gain.setTargetAtTime(channel.volume, now, 0.1);
                    break;
                case 'volume':
                    channel.gainNode.gain.setTargetAtTime(0.1, now, 0.1);
                    break;
                case 'filter':
                    channel.filter.frequency.setTargetAtTime(1000, now, 0.1);
                    channel.gainNode.gain.setTargetAtTime(channel.volume, now, 0.1);
                    break;
                case 'panning':
                    channel.pannerNode.pan.setTargetAtTime(0, now, 0.1);
                    channel.gainNode.gain.setTargetAtTime(channel.volume, now, 0.1);
                    break;
            }
        }

        // Apply current value with new mapping
        this.updateChannelValue(datastreamId, channel.currentValue);
    }

    setChannelValueRange(datastreamId, minValue, maxValue) {
        const channel = this.activeChannels.get(datastreamId);
        if (!channel) return;

        channel.minValue = minValue;
        channel.maxValue = maxValue;
    }

    startAll() {
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
        if (this.masterGain && this.audioContext) {
            const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
            this.masterGain.gain.setTargetAtTime(
                normalizedVolume, 
                this.audioContext.currentTime, 
                0.1
            );
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

    initializeBeatSystem() {
        if (!this.audioContext) return;

        // Create multiple oscillators for richer drum sounds
        this.kickOscillator = this.audioContext.createOscillator();
        this.snareOscillator = this.audioContext.createOscillator();
        this.hihatOscillator = this.audioContext.createOscillator();
        
        // Create individual gain nodes
        this.kickGain = this.audioContext.createGain();
        this.snareGain = this.audioContext.createGain();
        this.hihatGain = this.audioContext.createGain();
        
        // Create filters for better drum character
        this.kickFilter = this.audioContext.createBiquadFilter();
        this.snareFilter = this.audioContext.createBiquadFilter();
        this.hihatFilter = this.audioContext.createBiquadFilter();
        
        // Set up kick drum (deep and punchy)
        this.kickOscillator.type = 'sine';
        this.kickOscillator.frequency.value = 40; // Very low frequency
        this.kickFilter.type = 'lowpass';
        this.kickFilter.frequency.value = 100; // Cut high frequencies
        this.kickFilter.Q.value = 2; // Add some resonance
        this.kickOscillator.connect(this.kickFilter);
        this.kickFilter.connect(this.kickGain);
        this.kickGain.connect(this.masterGain);
        
        // Set up snare drum (snappy and bright)
        this.snareOscillator.type = 'square';
        this.snareOscillator.frequency.value = 200;
        this.snareFilter.type = 'highpass';
        this.snareFilter.frequency.value = 300; // Cut low frequencies
        this.snareFilter.Q.value = 5; // Very sharp and snappy
        this.snareOscillator.connect(this.snareFilter);
        this.snareFilter.connect(this.snareGain);
        this.snareGain.connect(this.masterGain);
        
        // Set up hi-hat (crisp and bright)
        this.hihatOscillator.type = 'sawtooth';
        this.hihatOscillator.frequency.value = 10000; // Very high frequency
        this.hihatFilter.type = 'highpass';
        this.hihatFilter.frequency.value = 8000;
        this.hihatFilter.Q.value = 3;
        this.hihatOscillator.connect(this.hihatFilter);
        this.hihatFilter.connect(this.hihatGain);
        this.hihatGain.connect(this.masterGain);
        
        // Initialize gains to 0
        this.kickGain.gain.value = 0;
        this.snareGain.gain.value = 0;
        this.hihatGain.gain.value = 0;
        
        // Start all oscillators
        this.kickOscillator.start();
        this.snareOscillator.start();
        this.hihatOscillator.start();
    }

    startBeat() {
        if (!this.audioContext || this.beatEnabled) return;
        
        this.beatEnabled = true;
        this.scheduleBeatLoop();
    }

    stopBeat() {
        if (!this.beatEnabled) return;
        
        this.beatEnabled = false;
        if (this.beatInterval) {
            clearInterval(this.beatInterval);
            this.beatInterval = null;
        }
    }

    scheduleBeatLoop() {
        if (this.beatInterval) {
            clearInterval(this.beatInterval);
        }

        const beatIntervalMs = (60 / this.beatTempo) * 1000; // Convert BPM to milliseconds
        let beatCount = 0;

        this.beatInterval = setInterval(() => {
            if (!this.beatEnabled || !this.audioContext) return;

            const now = this.audioContext.currentTime;
            
            // Create different patterns for different beats in the measure
            const isKick = beatCount % 4 === 0; // Kick on 1 and 3
            const isSnare = beatCount % 4 === 2; // Snare on 2 and 4
            const isHiHat = beatCount % 2 === 1; // Hi-hat on off-beats

            if (isKick) {
                // Deep, punchy kick drum
                this.playKickDrum();
            } else if (isSnare) {
                // Snappy snare drum
                this.playSnareDrum();
            } else if (isHiHat) {
                // Crisp hi-hat
                this.playHiHat();
            }

            beatCount++;
        }, beatIntervalMs);
    }

    playKickDrum() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        // Frequency sweep for punch (40Hz -> 20Hz)
        this.kickOscillator.frequency.setValueAtTime(40, now);
        this.kickOscillator.frequency.exponentialRampToValueAtTime(20, now + 0.05);
        
        // Volume envelope - punchy attack, longer decay
        this.kickGain.gain.setValueAtTime(0, now);
        this.kickGain.gain.setValueAtTime(0.8, now + 0.005); // Very fast attack
        this.kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // Long decay
    }

    playSnareDrum() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        // Add frequency modulation for snappy character
        this.snareOscillator.frequency.setValueAtTime(200, now);
        this.snareOscillator.frequency.exponentialRampToValueAtTime(150, now + 0.02);
        
        // Filter sweep for snap
        this.snareFilter.frequency.setValueAtTime(800, now);
        this.snareFilter.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        
        // Sharp attack, quick decay
        this.snareGain.gain.setValueAtTime(0, now);
        this.snareGain.gain.setValueAtTime(0.6, now + 0.002); // Very sharp attack
        this.snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Quick decay
    }

    playHiHat() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        // High frequency modulation for metallic character
        this.hihatOscillator.frequency.setValueAtTime(12000, now);
        this.hihatOscillator.frequency.exponentialRampToValueAtTime(8000, now + 0.01);
        
        // Very sharp attack, very quick decay
        this.hihatGain.gain.setValueAtTime(0, now);
        this.hihatGain.gain.setValueAtTime(0.3, now + 0.001); // Instant attack
        this.hihatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03); // Very quick decay
    }

    setBeatTempo(bpm) {
        this.beatTempo = Math.max(60, Math.min(200, bpm)); // Limit between 60-200 BPM
        
        if (this.beatEnabled) {
            // Restart beat loop with new tempo
            this.scheduleBeatLoop();
        }
    }

    getBeatTempo() {
        return this.beatTempo;
    }

    isBeatEnabled() {
        return this.beatEnabled;
    }
}