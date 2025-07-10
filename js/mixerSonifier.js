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

        this.initializeAudio();
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);
            
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
}