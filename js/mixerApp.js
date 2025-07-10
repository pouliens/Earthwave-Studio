class MixerApp {
    constructor() {
        this.dataService = new DataService();
        this.visualizer = new MixerVisualizer();
        this.sonifier = new MixerSonifier();
        
        this.availableDatastreams = new Map();
        this.isPlaying = false;
        
        this.initializeInterface();
        this.setupEventListeners();
        this.loadAvailableDatastreams();
    }

    initializeInterface() {
        this.libraryList = document.getElementById('library-list');
        this.mixerChannels = document.getElementById('mixer-channels');
        this.masterPlayButton = document.getElementById('master-play');
        this.masterVolumeSlider = document.getElementById('master-volume');
        this.statusElement = document.getElementById('status');
        
        this.updateStatus('Initializing...');
    }

    setupEventListeners() {
        // Master play button
        this.masterPlayButton.addEventListener('click', () => {
            this.toggleMasterPlay();
        });

        // Master volume
        this.masterVolumeSlider.addEventListener('input', (e) => {
            this.sonifier.setMasterVolume(parseInt(e.target.value));
        });

        // Data service listener
        this.dataService.addListener((data) => {
            this.handleNewData(data);
        });
    }

    loadAvailableDatastreams() {
        const sensorInfo = this.dataService.getSensorInfo();
        
        Object.entries(sensorInfo).forEach(([sensorKey, sensor]) => {
            sensor.parameters.forEach(param => {
                const datastreamId = `${sensorKey}_${param}`;
                const name = `${sensor.name.replace('BGS ', '')} - ${this.formatParameterName(param)}`;
                const unit = this.getParameterUnit(param);
                
                this.availableDatastreams.set(datastreamId, {
                    sensorKey,
                    parameter: param,
                    name,
                    unit,
                    isAdded: false
                });
            });
        });

        this.renderLibrary();
        this.startDataCollection();
    }

    renderLibrary() {
        this.libraryList.innerHTML = '';
        
        this.availableDatastreams.forEach((datastream, datastreamId) => {
            const item = document.createElement('div');
            item.className = `datastream-item ${datastream.isAdded ? 'added' : ''}`;
            
            item.innerHTML = `
                <div class="datastream-info">
                    <div class="datastream-name">${datastream.name}</div>
                    <div class="datastream-description">${datastream.unit}</div>
                </div>
                <button class="add-button" 
                        ${datastream.isAdded ? 'disabled' : ''}
                        onclick="window.mixerApp.addDatastream('${datastreamId}')">
                    ${datastream.isAdded ? 'Added' : 'Add'}
                </button>
            `;
            
            this.libraryList.appendChild(item);
        });
    }

    addDatastream(datastreamId) {
        const datastream = this.availableDatastreams.get(datastreamId);
        if (!datastream || datastream.isAdded) return;

        // Mark as added
        datastream.isAdded = true;
        
        // Add to visualizer
        this.visualizer.addDatastream(datastreamId, datastream.name, datastream.unit);
        
        // Create audio channel
        this.sonifier.createChannel(datastreamId, datastream.name);
        
        // Load historical data if available
        const currentData = this.dataService.getCurrentDataWithHistory();
        const sensorData = currentData[datastream.sensorKey];
        if (sensorData && sensorData.historical && sensorData.historical[datastream.parameter]) {
            this.visualizer.loadHistoricalData(datastreamId, sensorData.historical[datastream.parameter]);
            
            // Set value range for sonification
            const values = sensorData.historical[datastream.parameter].map(entry => entry.value);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            this.sonifier.setChannelValueRange(datastreamId, minValue, maxValue);
        }
        
        // Update interface
        this.renderLibrary();
        this.renderMixerChannels();
        this.visualizer.updateActiveCount();
        
        this.updateStatus(`Added ${datastream.name}`);
    }

    removeDatastream(datastreamId) {
        const datastream = this.availableDatastreams.get(datastreamId);
        if (!datastream || !datastream.isAdded) return;

        // Mark as not added
        datastream.isAdded = false;
        
        // Remove from visualizer
        this.visualizer.removeDatastream(datastreamId);
        
        // Remove audio channel
        this.sonifier.removeChannel(datastreamId);
        
        // Update interface
        this.renderLibrary();
        this.renderMixerChannels();
        this.visualizer.updateActiveCount();
        
        this.updateStatus(`Removed ${datastream.name}`);
    }

    renderMixerChannels() {
        const activeDatastreams = Array.from(this.availableDatastreams.entries())
            .filter(([id, datastream]) => datastream.isAdded);

        if (activeDatastreams.length === 0) {
            this.mixerChannels.innerHTML = `
                <div class="empty-mixer">
                    <p>👈 Add datastreams from the library to start mixing</p>
                </div>
            `;
            return;
        }

        this.mixerChannels.innerHTML = '';

        activeDatastreams.forEach(([datastreamId, datastream]) => {
            const channel = this.sonifier.getChannelInfo(datastreamId);
            const currentValue = this.visualizer.getCurrentValue(datastreamId);
            
            const channelElement = document.createElement('div');
            channelElement.className = `mixer-channel ${channel && channel.isPlaying ? 'playing' : ''}`;
            channelElement.id = `channel-${datastreamId}`;
            
            channelElement.innerHTML = `
                <div class="channel-header">
                    <div class="channel-name">${datastream.name}</div>
                    <div class="channel-controls">
                        <button onclick="window.mixerApp.toggleChannel('${datastreamId}')" 
                                class="${channel && channel.isPlaying ? 'playing' : ''}">
                            ${channel && channel.isPlaying ? '⏸️' : '▶️'}
                        </button>
                        <button onclick="window.mixerApp.removeDatastream('${datastreamId}')" 
                                class="remove-button">❌</button>
                    </div>
                </div>
                <div class="channel-settings">
                    <div class="setting-group">
                        <label>Audio Mapping</label>
                        <select onchange="window.mixerApp.setChannelMapping('${datastreamId}', this.value)">
                            ${this.sonifier.getAvailableMappings().map(mapping => 
                                `<option value="${mapping}" ${channel && channel.audioMapping === mapping ? 'selected' : ''}>
                                    ${this.formatMappingName(mapping)}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>Volume</label>
                        <input type="range" min="0" max="100" value="${channel ? channel.volume * 100 : 50}"
                               onchange="window.mixerApp.setChannelVolume('${datastreamId}', this.value / 100)">
                    </div>
                </div>
                <div class="current-value">
                    Current: ${currentValue !== null ? currentValue.toFixed(2) : '--'} ${datastream.unit}
                </div>
            `;
            
            this.mixerChannels.appendChild(channelElement);
        });
    }

    toggleChannel(datastreamId) {
        const channel = this.sonifier.getChannelInfo(datastreamId);
        if (!channel) return;

        if (channel.isPlaying) {
            this.sonifier.stopChannel(datastreamId);
        } else {
            this.sonifier.startChannel(datastreamId);
        }

        this.renderMixerChannels();
    }

    setChannelMapping(datastreamId, mapping) {
        this.sonifier.setChannelMapping(datastreamId, mapping);
        this.updateStatus(`Changed ${this.availableDatastreams.get(datastreamId).name} to ${this.formatMappingName(mapping)}`);
    }

    setChannelVolume(datastreamId, volume) {
        this.sonifier.setChannelVolume(datastreamId, volume);
    }

    toggleMasterPlay() {
        if (this.isPlaying) {
            this.stopAll();
        } else {
            this.playAll();
        }
    }

    playAll() {
        this.sonifier.startAll();
        this.isPlaying = true;
        this.masterPlayButton.textContent = '⏸️ Stop All';
        this.masterPlayButton.classList.add('playing');
        this.renderMixerChannels();
        this.updateStatus('Playing');
    }

    stopAll() {
        this.sonifier.stopAll();
        this.isPlaying = false;
        this.masterPlayButton.textContent = '▶️ Play All';
        this.masterPlayButton.classList.remove('playing');
        this.renderMixerChannels();
        this.updateStatus('Stopped');
    }

    startDataCollection() {
        this.dataService.start();
        this.updateStatus('Ready');
    }

    handleNewData(data) {
        // Update active datastreams with new values
        this.availableDatastreams.forEach((datastream, datastreamId) => {
            if (!datastream.isAdded) return;

            const sensorData = data[datastream.sensorKey];
            if (sensorData && sensorData[datastream.parameter] !== undefined) {
                const value = sensorData[datastream.parameter];
                const timestamp = new Date().toISOString();

                // Update visualizer
                this.visualizer.updateDatastream(datastreamId, value, timestamp);
                
                // Update sonifier
                this.sonifier.updateChannelValue(datastreamId, value);
            }
        });

        // Update mixer channel displays
        this.renderMixerChannels();
    }

    formatParameterName(param) {
        const names = {
            temperature: 'Temperature',
            methane: 'Methane',
            co2: 'Carbon Dioxide',
            oxygen: 'Oxygen',
            pressure: 'Pressure'
        };
        return names[param] || param.charAt(0).toUpperCase() + param.slice(1);
    }

    getParameterUnit(param) {
        const units = {
            temperature: '°C',
            methane: '%',
            co2: '%',
            oxygen: '%',
            pressure: 'mbar'
        };
        return units[param] || '';
    }

    formatMappingName(mapping) {
        const names = {
            pitch: 'Pitch/Frequency',
            volume: 'Volume',
            filter: 'Filter/Timbre',
            panning: 'Stereo Panning',
            rhythm: 'Rhythm/Pulse'
        };
        return names[mapping] || mapping;
    }

    updateStatus(message) {
        this.statusElement.textContent = message;
        console.log(`Status: ${message}`);
    }

    // Public API methods
    getActiveDatastreams() {
        return Array.from(this.availableDatastreams.entries())
            .filter(([id, datastream]) => datastream.isAdded)
            .map(([id, datastream]) => ({ id, ...datastream }));
    }

    getCurrentValues() {
        const values = {};
        this.availableDatastreams.forEach((datastream, datastreamId) => {
            if (datastream.isAdded) {
                values[datastreamId] = this.visualizer.getCurrentValue(datastreamId);
            }
        });
        return values;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Sensor Data Sonification Mixer...');
    
    window.mixerApp = new MixerApp();
    
    console.log('Mixer initialized. Available methods:');
    console.log('- mixerApp.getActiveDatastreams()');
    console.log('- mixerApp.getCurrentValues()');
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.mixerApp) {
        window.mixerApp.stopAll();
    }
});