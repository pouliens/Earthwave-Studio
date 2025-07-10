class SonificationApp {
    constructor() {
        this.dataService = new DataService();
        this.visualizer = new Visualizer();
        this.sonifier = new Sonifier();
        this.isPlaying = false;
        
        this.initializeUI();
        this.setupEventListeners();
        this.startDataCollection();
    }

    initializeUI() {
        this.playPauseButton = document.getElementById('playPause');
        this.volumeSlider = document.getElementById('volume');
        this.statusElement = document.getElementById('status');
        
        this.updateStatus('Ready');
    }

    setupEventListeners() {
        // Play/Pause button
        this.playPauseButton.addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        // Volume slider
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            this.sonifier.setMasterVolume(volume);
        });
        
        // Data service listener
        this.dataService.addListener((data) => {
            this.handleNewData(data);
        });
        
        // Handle window focus/blur for audio context
        window.addEventListener('focus', () => {
            if (this.sonifier.audioContext && this.sonifier.audioContext.state === 'suspended') {
                this.sonifier.audioContext.resume();
            }
        });
        
        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying) {
                // Optionally pause when page is hidden
                // this.pause();
            }
        });
    }

    startDataCollection() {
        this.updateStatus('Starting data collection...');
        this.dataService.start();
        this.updateStatus('Data collection active');
    }

    handleNewData(data) {
        console.log('New sensor data received:', data);
        
        // Update visualizations
        this.visualizer.updateData(data);
        
        // Update sonification
        this.sonifier.updateSonification(data);
        
        // Update audio visualization
        if (this.isPlaying) {
            const vizData = this.sonifier.getVisualizationData();
            this.visualizer.updateAudioVisualization(
                vizData.frequency,
                vizData.amplitude,
                vizData.waveform
            );
            
            const audioParams = this.sonifier.getCurrentAudioParams();
            this.visualizer.updateAudioIndicators(
                audioParams.pitch,
                audioParams.bpm,
                audioParams.waveform
            );
        }
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        try {
            this.updateStatus('Starting sonification...');
            
            // Start audio
            await this.sonifier.start();
            
            // Update UI
            this.isPlaying = true;
            this.playPauseButton.textContent = '⏸️ Pause';
            this.updateStatus('Playing');
            
            // Start visualization update loop
            this.startVisualizationLoop();
            
        } catch (error) {
            console.error('Error starting sonification:', error);
            this.updateStatus('Error starting audio');
        }
    }

    pause() {
        this.updateStatus('Stopping sonification...');
        
        // Stop audio
        this.sonifier.stop();
        
        // Update UI
        this.isPlaying = false;
        this.playPauseButton.textContent = '▶️ Play';
        this.updateStatus('Paused');
        
        // Stop visualization loop
        this.stopVisualizationLoop();
    }

    startVisualizationLoop() {
        if (this.visualizationInterval) {
            clearInterval(this.visualizationInterval);
        }
        
        this.visualizationInterval = setInterval(() => {
            if (this.isPlaying) {
                const vizData = this.sonifier.getVisualizationData();
                this.visualizer.updateAudioVisualization(
                    vizData.frequency,
                    vizData.amplitude,
                    vizData.waveform
                );
                
                const audioParams = this.sonifier.getCurrentAudioParams();
                this.visualizer.updateAudioIndicators(
                    audioParams.pitch,
                    audioParams.bpm,
                    audioParams.waveform
                );
            }
        }, 100); // Update visualization 10 times per second
    }

    stopVisualizationLoop() {
        if (this.visualizationInterval) {
            clearInterval(this.visualizationInterval);
            this.visualizationInterval = null;
        }
    }

    updateStatus(message) {
        this.statusElement.textContent = message;
        console.log(`Status: ${message}`);
    }

    // Public methods for external control
    getCurrentData() {
        return this.dataService.getCurrentData();
    }

    getSensorInfo() {
        return this.dataService.getSensorInfo();
    }

    getAudioParams() {
        return this.sonifier.getCurrentAudioParams();
    }

    // Cleanup method
    destroy() {
        this.dataService.stop();
        this.sonifier.stop();
        this.stopVisualizationLoop();
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing GasClam Data Sonification Dashboard...');
    
    window.sonificationApp = new SonificationApp();
    
    // Add some helpful debug information
    console.log('Application initialized. Available methods:');
    console.log('- sonificationApp.getCurrentData()');
    console.log('- sonificationApp.getSensorInfo()');
    console.log('- sonificationApp.getAudioParams()');
    
    // Log sensor information
    console.log('Sensor Information:', window.sonificationApp.getSensorInfo());
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.sonificationApp) {
        window.sonificationApp.destroy();
    }
});