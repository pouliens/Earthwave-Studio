class BeatMaker {
    constructor() {
        this.DRUM_SOUNDS = [
            { name: 'Kick', key: 'kick', color: '#ff4444' },
            { name: 'Snare', key: 'snare', color: '#44ff44' },
            { name: 'Hi-Hat', key: 'hihat', color: '#4444ff' },
            { name: 'Clap', key: 'clap', color: '#ffff44' },
            { name: 'Crash', key: 'crash', color: '#ff44ff' },
            { name: 'Perc', key: 'perc', color: '#44ffff' }
        ];

        this.STEPS = 8;
        this.DEFAULT_BPM = 120;
        
        this.PRESET_BEATS = {
            'ambient-pulse': {
                name: 'Ambient Pulse',
                description: 'Subtle rhythmic foundation for environmental data',
                bpm: 100,
                pattern: {
                    kick: [true, false, false, false, true, false, false, false],
                    snare: [false, false, false, false, false, false, false, false],
                    hihat: [false, false, true, false, false, false, true, false],
                    clap: [false, false, false, false, false, false, false, false],
                    crash: [false, false, false, false, false, false, false, false],
                    perc: [false, true, false, true, false, true, false, true]
                }
            },
            'organic-flow': {
                name: 'Organic Flow',
                description: 'Natural rhythm that complements sensor sonification',
                bpm: 85,
                pattern: {
                    kick: [true, false, false, true, false, false, false, false],
                    snare: [false, false, false, false, true, false, false, false],
                    hihat: [false, true, false, true, false, true, false, true],
                    clap: [false, false, false, false, false, false, false, false],
                    crash: [false, false, false, false, false, false, false, false],
                    perc: [false, false, true, false, false, false, true, false]
                }
            },
            'data-groove': {
                name: 'Data Groove',
                description: 'Structured beat for layering with dynamic sensor data',
                bpm: 110,
                pattern: {
                    kick: [true, false, false, false, false, false, true, false],
                    snare: [false, false, true, false, false, false, true, false],
                    hihat: [true, false, true, false, true, false, true, false],
                    clap: [false, false, false, false, false, false, false, false],
                    crash: [false, false, false, false, false, false, false, false],
                    perc: [false, true, false, false, false, true, false, false]
                }
            }
        };

        // Initialize pattern
        this.pattern = {};
        this.DRUM_SOUNDS.forEach(sound => {
            this.pattern[sound.key] = new Array(this.STEPS).fill(false);
        });

        // State
        this.isPlaying = false;
        this.currentStep = 0;
        this.bpm = this.DEFAULT_BPM;
        this.audioContext = null;
        this.tempoSynced = true;
        
        this.intervalRef = null;
        this.stepTimeoutRef = null;
        this.tempoListenerAdded = false;

        this.initialize();
    }

    initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupInterface();
            });
        } else {
            this.setupInterface();
        }
        
        // Also set up interface when switching to beat maker tab
        document.addEventListener('tabSwitch', (e) => {
            if (e.detail.tabName === 'beat-maker') {
                setTimeout(() => this.setupInterface(), 100); // Small delay to ensure DOM is ready
            }
        });
    }

    setupInterface() {
        this.setupEventListeners();
        this.renderSequencer();
        this.renderPresets();
    }

    setupEventListeners() {
        // Control buttons
        const playBtn = document.getElementById('beat-play-btn');
        const pauseBtn = document.getElementById('beat-pause-btn');
        const stopBtn = document.getElementById('beat-stop-btn');
        const clearBtn = document.getElementById('beat-clear-btn');
        const syncCheckbox = document.getElementById('tempo-sync-checkbox');

        if (playBtn && !playBtn.hasAttribute('data-beat-listener')) {
            playBtn.addEventListener('click', () => this.startSequencer());
            playBtn.setAttribute('data-beat-listener', 'true');
        }
        if (pauseBtn && !pauseBtn.hasAttribute('data-beat-listener')) {
            pauseBtn.addEventListener('click', () => this.pauseSequencer());
            pauseBtn.setAttribute('data-beat-listener', 'true');
        }
        if (stopBtn && !stopBtn.hasAttribute('data-beat-listener')) {
            stopBtn.addEventListener('click', () => this.stopSequencer());
            stopBtn.setAttribute('data-beat-listener', 'true');
        }
        if (clearBtn && !clearBtn.hasAttribute('data-beat-listener')) {
            clearBtn.addEventListener('click', () => this.clearPattern());
            clearBtn.setAttribute('data-beat-listener', 'true');
        }
        if (syncCheckbox && !syncCheckbox.hasAttribute('data-beat-listener')) {
            syncCheckbox.addEventListener('change', (e) => this.setTempoSync(e.target.checked));
            syncCheckbox.setAttribute('data-beat-listener', 'true');
        }

        // Listen for tempo changes from sensor data mixer (only add once)
        if (!this.tempoListenerAdded) {
            document.addEventListener('tempoChange', (e) => {
                if (this.tempoSynced) {
                    this.setBPM(e.detail.bpm);
                }
            });
            this.tempoListenerAdded = true;
        }
    }

    get stepInterval() {
        return (60 / this.bpm / 4) * 1000;
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Beat Maker audio initialized');
        } catch (error) {
            console.error('Failed to initialize Beat Maker audio:', error);
        }
    }

    playSound(soundKey) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const now = this.audioContext.currentTime;
            
            switch (soundKey) {
                case 'kick':
                    oscillator.frequency.setValueAtTime(80, now);
                    oscillator.frequency.exponentialRampToValueAtTime(0.1, now + 0.5);
                    filter.frequency.setValueAtTime(200, now);
                    filter.Q.setValueAtTime(1, now);
                    gainNode.gain.setValueAtTime(0.8, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    oscillator.type = 'sine';
                    break;
                case 'snare':
                    oscillator.frequency.setValueAtTime(300, now);
                    filter.frequency.setValueAtTime(2000, now);
                    filter.Q.setValueAtTime(0.5, now);
                    gainNode.gain.setValueAtTime(0.5, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    oscillator.type = 'sawtooth';
                    break;
                case 'hihat':
                    oscillator.frequency.setValueAtTime(8000, now);
                    filter.frequency.setValueAtTime(6000, now);
                    filter.Q.setValueAtTime(0.8, now);
                    gainNode.gain.setValueAtTime(0.15, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                    oscillator.type = 'triangle';
                    break;
                case 'clap':
                    oscillator.frequency.setValueAtTime(1200, now);
                    filter.frequency.setValueAtTime(3000, now);
                    filter.Q.setValueAtTime(1, now);
                    gainNode.gain.setValueAtTime(0.4, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    oscillator.type = 'triangle';
                    break;
                case 'crash':
                    oscillator.frequency.setValueAtTime(6000, now);
                    filter.frequency.setValueAtTime(8000, now);
                    filter.Q.setValueAtTime(0.3, now);
                    gainNode.gain.setValueAtTime(0.3, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                    oscillator.type = 'sawtooth';
                    break;
                case 'perc':
                    oscillator.frequency.setValueAtTime(900, now);
                    filter.frequency.setValueAtTime(1500, now);
                    filter.Q.setValueAtTime(1.5, now);
                    gainNode.gain.setValueAtTime(0.4, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    oscillator.type = 'sine';
                    break;
            }
            
            oscillator.start(now);
            oscillator.stop(now + 1);
        } catch (error) {
            console.error('Failed to play sound:', error);
        }
    }

    toggleStep(soundKey, step) {
        this.pattern[soundKey][step] = !this.pattern[soundKey][step];
        this.updateSequencerDisplay();
    }

    playCurrentStep() {
        this.DRUM_SOUNDS.forEach(sound => {
            if (this.pattern[sound.key][this.currentStep]) {
                this.playSound(sound.key);
            }
        });
    }

    nextStep() {
        this.currentStep = (this.currentStep + 1) % this.STEPS;
        this.updateSequencerDisplay();
    }

    async startSequencer() {
        if (!this.audioContext) {
            await this.initializeAudio();
        }
        
        if (!this.audioContext) return;
        
        this.isPlaying = true;
        this.playCurrentStep();
        
        this.intervalRef = setInterval(() => {
            this.nextStep();
            this.playCurrentStep();
        }, this.stepInterval);

        this.updateControlButtons();
    }

    stopSequencer() {
        this.isPlaying = false;
        this.currentStep = 0;
        if (this.intervalRef) {
            clearInterval(this.intervalRef);
            this.intervalRef = null;
        }
        this.updateSequencerDisplay();
        this.updateControlButtons();
    }

    pauseSequencer() {
        this.isPlaying = false;
        if (this.intervalRef) {
            clearInterval(this.intervalRef);
            this.intervalRef = null;
        }
        this.updateControlButtons();
    }

    clearPattern() {
        this.DRUM_SOUNDS.forEach(sound => {
            this.pattern[sound.key] = new Array(this.STEPS).fill(false);
        });
        this.updateSequencerDisplay();
    }

    loadPreset(presetKey) {
        const preset = this.PRESET_BEATS[presetKey];
        if (!preset) return;
        
        this.pattern = { ...preset.pattern };
        this.setBPM(preset.bpm);
        
        // Stop playback when loading new preset
        if (this.isPlaying) {
            this.stopSequencer();
        }
        
        this.updateSequencerDisplay();
    }

    setBPM(bpm) {
        this.bpm = bpm;
        
        // Restart interval if playing
        if (this.isPlaying) {
            if (this.intervalRef) {
                clearInterval(this.intervalRef);
            }
            this.intervalRef = setInterval(() => {
                this.nextStep();
                this.playCurrentStep();
            }, this.stepInterval);
        }

        // Notify sensor data mixer about tempo change
        if (!this.tempoSynced) {
            const tempoChangeEvent = new CustomEvent('beatMakerTempoChange', {
                detail: { bpm: this.bpm }
            });
            document.dispatchEvent(tempoChangeEvent);
        }
    }

    setTempoSync(synced) {
        this.tempoSynced = synced;
        
        // If sync is enabled, get current tempo from sensor mixer
        if (synced && window.mixerApp && window.mixerApp.getCurrentTempo) {
            const currentTempo = window.mixerApp.getCurrentTempo();
            this.setBPM(currentTempo);
        }
    }

    renderSequencer() {
        const sequencerGrid = document.getElementById('sequencer-grid');
        if (!sequencerGrid) return;

        sequencerGrid.innerHTML = '';

        // Create step numbers row
        const stepNumbersRow = document.createElement('div');
        stepNumbersRow.className = 'step-numbers';
        
        const emptyLabel = document.createElement('div');
        emptyLabel.className = 'sound-label';
        stepNumbersRow.appendChild(emptyLabel);

        for (let i = 0; i < this.STEPS; i++) {
            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';
            stepNumber.textContent = i + 1;
            stepNumbersRow.appendChild(stepNumber);
        }
        sequencerGrid.appendChild(stepNumbersRow);

        // Create rows for each drum sound
        this.DRUM_SOUNDS.forEach(sound => {
            const row = document.createElement('div');
            row.className = 'sequencer-row';

            // Sound label
            const soundLabel = document.createElement('div');
            soundLabel.className = 'sound-label';
            soundLabel.textContent = sound.name;
            soundLabel.style.borderLeft = `4px solid ${sound.color}`;
            row.appendChild(soundLabel);

            // Step buttons
            for (let stepIndex = 0; stepIndex < this.STEPS; stepIndex++) {
                const stepButton = document.createElement('button');
                stepButton.className = 'step-btn';
                stepButton.addEventListener('click', () => this.toggleStep(sound.key, stepIndex));
                row.appendChild(stepButton);
            }

            sequencerGrid.appendChild(row);
        });

        this.updateSequencerDisplay();
    }

    renderPresets() {
        const presetGrid = document.getElementById('preset-grid');
        if (!presetGrid) return;

        presetGrid.innerHTML = '';

        Object.entries(this.PRESET_BEATS).forEach(([key, preset]) => {
            const presetCard = document.createElement('div');
            presetCard.className = 'preset-card';

            presetCard.innerHTML = `
                <h4>${preset.name}</h4>
                <p>${preset.description}</p>
                <div class="preset-info">
                    <span>BPM: ${preset.bpm}</span>
                </div>
                <button class="preset-load-btn" onclick="window.beatMaker.loadPreset('${key}')">
                    Load Beat
                </button>
            `;

            presetGrid.appendChild(presetCard);
        });
    }

    updateSequencerDisplay() {
        const sequencerGrid = document.getElementById('sequencer-grid');
        if (!sequencerGrid) return;

        // Update step numbers to show current step
        const stepNumbers = sequencerGrid.querySelectorAll('.step-number');
        stepNumbers.forEach((stepNumber, index) => {
            stepNumber.classList.toggle('current', index === this.currentStep);
        });

        // Update step buttons
        const rows = sequencerGrid.querySelectorAll('.sequencer-row');
        rows.forEach((row, soundIndex) => {
            if (soundIndex >= this.DRUM_SOUNDS.length) return;
            
            const sound = this.DRUM_SOUNDS[soundIndex];
            const stepButtons = row.querySelectorAll('.step-btn');
            
            stepButtons.forEach((button, stepIndex) => {
                const isActive = this.pattern[sound.key][stepIndex];
                const isCurrent = stepIndex === this.currentStep;
                
                button.classList.toggle('active', isActive);
                button.classList.toggle('current-step', isCurrent);
                
                if (isActive) {
                    button.style.backgroundColor = sound.color;
                } else {
                    button.style.backgroundColor = '';
                }
                
                if (isCurrent) {
                    button.style.borderColor = sound.color;
                } else {
                    button.style.borderColor = '';
                }
            });
        });
    }

    updateControlButtons() {
        const playBtn = document.getElementById('beat-play-btn');
        const pauseBtn = document.getElementById('beat-pause-btn');
        const stopBtn = document.getElementById('beat-stop-btn');

        if (playBtn) playBtn.disabled = this.isPlaying;
        if (pauseBtn) pauseBtn.disabled = !this.isPlaying;
        if (stopBtn) stopBtn.disabled = !this.isPlaying;
    }

    onTabSwitch(tabName) {
        if (tabName === 'beat-maker') {
            // Refresh display when switching to beat maker tab
            this.updateSequencerDisplay();
        }
    }

    // Public API methods
    getPattern() {
        return this.pattern;
    }

    getBPM() {
        return this.bpm;
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}

// Initialize beat maker when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.beatMaker = new BeatMaker();
});