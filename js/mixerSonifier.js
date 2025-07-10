class MixerSonifier {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.activeChannels = new Map();
        this.isPlaying = false;
        
        // Available audio mappings
        this.audioMappings = [
            'pitch', 'volume', 'filter', 'panning', 'rhythm'
        ];

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

        // Set up audio chain
        oscillator.connect(filter);
        filter.connect(gainNode);
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
            isPlaying: false,
            volume: 0.5,
            currentValue: 0,
            minValue: 0,
            maxValue: 100,
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

        channel.currentValue = value;

        if (!channel.isPlaying) return;

        const now = this.audioContext.currentTime;
        const normalizedValue = this.normalizeValue(value, channel.minValue, channel.maxValue);

        switch (channel.audioMapping) {
            case 'pitch':
                const frequency = 200 + (normalizedValue * 600); // 200-800 Hz
                channel.oscillator.frequency.setTargetAtTime(frequency, now, 0.1);
                break;

            case 'volume':
                const volume = normalizedValue * channel.volume;
                channel.gainNode.gain.setTargetAtTime(volume, now, 0.1);
                break;

            case 'filter':
                const filterFreq = 200 + (normalizedValue * 2000); // 200-2200 Hz
                channel.filter.frequency.setTargetAtTime(filterFreq, now, 0.1);
                break;

            case 'panning':
                const pan = (normalizedValue - 0.5) * 2; // -1 to 1
                channel.pannerNode.pan.setTargetAtTime(pan, now, 0.1);
                break;

            case 'rhythm':
                // Rhythm affects volume pulsing
                this.updateRhythm(channel, normalizedValue);
                break;
        }
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
}