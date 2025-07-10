class Sonifier {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.oscillators = [];
        this.gainNodes = [];
        this.masterGain = null;
        this.currentData = {};
        this.instruments = [];
        
        // Sonification parameters
        this.mappings = {
            temperature: {
                min: 10,
                max: 30,
                freqMin: 200,
                freqMax: 800
            },
            methane: {
                min: 0,
                max: 5,
                bpmMin: 60,
                bpmMax: 120
            },
            co2: {
                min: 0,
                max: 2,
                waveforms: ['sine', 'square', 'sawtooth', 'triangle']
            },
            oxygen: {
                min: 15,
                max: 25,
                volumeMin: 0.1,
                volumeMax: 0.8
            },
            pressure: {
                min: 990,
                max: 1030,
                panMin: -1,
                panMax: 1
            }
        };
        
        this.initializeAudio();
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create instruments for each sensor
            this.createInstruments();
            
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }

    createInstruments() {
        // Create 3 instruments for the 3 main sensors
        const sensorKeys = ['site1', 'site5', 'barometer'];
        
        sensorKeys.forEach((sensorKey, index) => {
            const instrument = this.createInstrument(index);
            this.instruments.push({
                key: sensorKey,
                ...instrument
            });
        });
    }

    createInstrument(index) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const pannerNode = this.audioContext.createStereoPanner();
        const filter = this.audioContext.createBiquadFilter();
        
        // Set up audio chain: oscillator -> filter -> gain -> panner -> master
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
        
        return {
            oscillator,
            gainNode,
            pannerNode,
            filter,
            isStarted: false,
            currentFreq: 440,
            currentGain: 0,
            currentPan: 0
        };
    }

    mapTemperatureToPitch(temperature) {
        const { min, max, freqMin, freqMax } = this.mappings.temperature;
        const normalized = Math.max(0, Math.min(1, (temperature - min) / (max - min)));
        return freqMin + (freqMax - freqMin) * normalized;
    }

    mapMethaneToRhythm(methane) {
        const { min, max, bpmMin, bpmMax } = this.mappings.methane;
        const normalized = Math.max(0, Math.min(1, (methane - min) / (max - min)));
        return bpmMin + (bpmMax - bpmMin) * normalized;
    }

    mapCO2ToWaveform(co2) {
        const { min, max, waveforms } = this.mappings.co2;
        const normalized = Math.max(0, Math.min(1, (co2 - min) / (max - min)));
        const index = Math.floor(normalized * (waveforms.length - 1));
        return waveforms[index];
    }

    mapOxygenToVolume(oxygen) {
        const { min, max, volumeMin, volumeMax } = this.mappings.oxygen;
        const normalized = Math.max(0, Math.min(1, (oxygen - min) / (max - min)));
        return volumeMin + (volumeMax - volumeMin) * normalized;
    }

    mapPressureToPan(pressure) {
        const { min, max, panMin, panMax } = this.mappings.pressure;
        const normalized = Math.max(0, Math.min(1, (pressure - min) / (max - min)));
        return panMin + (panMax - panMin) * normalized;
    }

    updateSonification(sensorData) {
        if (!this.isPlaying || !this.audioContext) return;
        
        this.currentData = sensorData;
        
        // Update each instrument based on its sensor data
        this.instruments.forEach((instrument, index) => {
            const data = sensorData[instrument.key];
            if (!data) return;
            
            this.updateInstrument(instrument, data, index);
        });
    }

    updateInstrument(instrument, data, index) {
        const now = this.audioContext.currentTime;
        
        // Update pitch based on temperature
        if (data.temperature !== undefined) {
            const pitch = this.mapTemperatureToPitch(data.temperature);
            instrument.oscillator.frequency.setTargetAtTime(pitch, now, 0.1);
            instrument.currentFreq = pitch;
        }
        
        // Update waveform based on CO2
        if (data.co2 !== undefined) {
            const waveform = this.mapCO2ToWaveform(data.co2);
            instrument.oscillator.type = waveform;
        }
        
        // Update volume based on oxygen
        if (data.oxygen !== undefined) {
            const volume = this.mapOxygenToVolume(data.oxygen);
            instrument.gainNode.gain.setTargetAtTime(volume, now, 0.1);
            instrument.currentGain = volume;
        }
        
        // Update panning based on pressure
        if (data.pressure !== undefined) {
            const pan = this.mapPressureToPan(data.pressure);
            instrument.pannerNode.pan.setTargetAtTime(pan, now, 0.1);
            instrument.currentPan = pan;
        }
        
        // Update filter based on methane (affects timbre)
        if (data.methane !== undefined) {
            const filterFreq = 500 + (data.methane / 5) * 2000;
            instrument.filter.frequency.setTargetAtTime(filterFreq, now, 0.1);
        }
    }

    start() {
        if (this.isPlaying) return;
        
        if (!this.audioContext) {
            console.error('Audio context not initialized');
            return;
        }
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Start all oscillators
        this.instruments.forEach(instrument => {
            if (!instrument.isStarted) {
                instrument.oscillator.start();
                instrument.isStarted = true;
            }
        });
        
        this.isPlaying = true;
        this.startRhythmEngine();
        
        console.log('Sonification started');
    }

    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.stopRhythmEngine();
        
        // Stop all oscillators and recreate them
        this.instruments.forEach((instrument, index) => {
            if (instrument.isStarted) {
                instrument.oscillator.stop();
            }
        });
        
        // Recreate instruments for next play
        this.instruments = [];
        this.createInstruments();
        
        console.log('Sonification stopped');
    }

    startRhythmEngine() {
        if (this.rhythmInterval) {
            clearInterval(this.rhythmInterval);
        }
        
        this.rhythmInterval = setInterval(() => {
            this.updateRhythm();
        }, 100); // Update rhythm every 100ms
    }

    stopRhythmEngine() {
        if (this.rhythmInterval) {
            clearInterval(this.rhythmInterval);
            this.rhythmInterval = null;
        }
    }

    updateRhythm() {
        if (!this.isPlaying || !this.currentData) return;
        
        // Create rhythmic pulses based on methane levels
        this.instruments.forEach(instrument => {
            const data = this.currentData[instrument.key];
            if (!data || data.methane === undefined) return;
            
            const bpm = this.mapMethaneToRhythm(data.methane);
            const beatInterval = 60 / bpm; // seconds per beat
            
            // Simple pulse effect
            const now = this.audioContext.currentTime;
            const pulseStrength = 0.3;
            
            // Create a brief volume pulse
            if (Math.random() < 0.3) { // 30% chance per update
                const currentGain = instrument.currentGain;
                instrument.gainNode.gain.setValueAtTime(currentGain, now);
                instrument.gainNode.gain.setValueAtTime(currentGain * (1 + pulseStrength), now + 0.05);
                instrument.gainNode.gain.setValueAtTime(currentGain, now + 0.1);
            }
        });
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
            this.masterGain.gain.setTargetAtTime(normalizedVolume, this.audioContext.currentTime, 0.1);
        }
    }

    getCurrentAudioParams() {
        if (!this.instruments.length) return { pitch: 0, bpm: 0, waveform: 'sine' };
        
        // Get average values from all instruments
        const avgPitch = this.instruments.reduce((sum, inst) => sum + inst.currentFreq, 0) / this.instruments.length;
        
        // Calculate BPM from methane data
        let avgBpm = 60;
        if (this.currentData.site1 && this.currentData.site1.methane !== undefined) {
            avgBpm = this.mapMethaneToRhythm(this.currentData.site1.methane);
        }
        
        // Get waveform from first instrument
        const waveform = this.instruments[0] ? this.instruments[0].oscillator.type : 'sine';
        
        return {
            pitch: avgPitch,
            bpm: avgBpm,
            waveform: waveform
        };
    }

    getVisualizationData() {
        const params = this.getCurrentAudioParams();
        return {
            frequency: params.pitch,
            amplitude: this.instruments.reduce((sum, inst) => sum + inst.currentGain, 0) / this.instruments.length,
            waveform: params.waveform
        };
    }
}