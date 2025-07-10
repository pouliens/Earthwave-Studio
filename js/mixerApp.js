class MixerApp {
    constructor() {
        this.dataService = new DataService();
        this.visualizer = new MixerVisualizer();
        this.sonifier = new MixerSonifier();
        
        this.availableDatastreams = new Map();
        this.isPlaying = false;
        this.playbackInterval = null;
        this.playbackSpeed = 1000; // 1 second per data point
        
        this.initializeInterface();
        this.setupEventListeners();
        this.loadAvailableDatastreams();
    }

    initializeInterface() {
        this.libraryList = document.getElementById('library-list');
        this.mixerChannels = document.getElementById('mixer-channels');
        this.masterPlayButton = document.getElementById('master-play');
        this.masterVolumeSlider = document.getElementById('master-volume');
        this.beatTempoSlider = document.getElementById('beat-tempo');
        this.tempoDisplay = document.getElementById('tempo-display');
        this.playbackSpeedSlider = document.getElementById('playback-speed');
        this.musicalScaleSelect = document.getElementById('musical-scale');
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

        // Beat tempo
        this.beatTempoSlider.addEventListener('input', (e) => {
            const tempo = parseInt(e.target.value);
            this.sonifier.setBeatTempo(tempo);
            this.tempoDisplay.textContent = tempo;
        });

        // Playback speed
        this.playbackSpeedSlider.addEventListener('input', (e) => {
            this.playbackSpeed = parseInt(e.target.value);
            if (this.isPlaying) {
                // Restart playback animation with new speed
                this.startPlaybackAnimation();
            }
        });

        // Musical scale
        this.musicalScaleSelect.addEventListener('change', (e) => {
            this.sonifier.setMusicalScale(e.target.value);
            this.updateStatus(`Changed to ${e.target.value} scale`);
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

    async addDatastream(datastreamId) {
        const datastream = this.availableDatastreams.get(datastreamId);
        if (!datastream || datastream.isAdded) return;

        // Mark as added
        datastream.isAdded = true;
        
        // Update status to show loading
        this.updateStatus(`Loading data for ${datastream.name}...`);
        
        // Add to visualizer
        this.visualizer.addDatastream(datastreamId, datastream.name, datastream.unit);
        
        // Create audio channel
        this.sonifier.createChannel(datastreamId, datastream.name);
        
        // Load synchronized historical data (last 50 real readings)
        try {
            const datastreamNumericId = this.getDatastreamId(datastream.sensorKey, datastream.parameter);
            console.log(`🔍 Attempting to load data for: ${datastream.sensorKey}_${datastream.parameter}`);
            console.log(`🔗 Mapped to BGS datastream ID: ${datastreamNumericId}`);
            
            if (datastreamNumericId) {
                console.log(`📊 Loading last 50 observations for ${datastreamId} (BGS API ID: ${datastreamNumericId})`);
                const historicalData = await this.dataService.fetchSynchronizedHistoricalData(datastreamNumericId, 50);
                
                if (historicalData && historicalData.length > 0) {
                    console.log(`✅ Successfully loaded ${historicalData.length} real observations for ${datastreamId}`);
                    console.log(`📅 Data range: ${historicalData[0].timestamp} to ${historicalData[historicalData.length-1].timestamp}`);
                    
                    // Load data into visualizer
                    this.visualizer.loadHistoricalData(datastreamId, historicalData);
                    
                    // Set value range for sonification based on real data
                    const values = historicalData.map(entry => entry.value);
                    const minValue = Math.min(...values);
                    const maxValue = Math.max(...values);
                    console.log(`📈 Value range: ${minValue.toFixed(2)} to ${maxValue.toFixed(2)}`);
                    this.sonifier.setChannelValueRange(datastreamId, minValue, maxValue);
                    
                    this.updateStatus(`Added ${datastream.name} (${historicalData.length} real observations)`);
                } else {
                    console.log(`❌ No historical data available for ${datastreamId}`);
                    this.updateStatus(`Added ${datastream.name} (no historical data available)`);
                }
            } else {
                console.error(`❌ No BGS datastream mapping found for ${datastream.sensorKey}_${datastream.parameter}`);
                this.updateStatus(`Added ${datastream.name} (no data source configured)`);
            }
        } catch (error) {
            console.error(`💥 Error loading historical data for ${datastreamId}:`, error);
            this.updateStatus(`Added ${datastream.name} (error loading data)`);
        }
        
        // Update interface
        this.renderLibrary();
        this.renderMixerChannels();
        this.visualizer.updateActiveCount();
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
                            ${channel && channel.isPlaying ? '⏸' : '▶'}
                        </button>
                        <button onclick="window.mixerApp.removeDatastream('${datastreamId}')" 
                                class="remove-button">✕</button>
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
        this.masterPlayButton.textContent = '⏸ Stop All';
        this.masterPlayButton.classList.add('playing');
        this.renderMixerChannels();
        
        // Start visual playback indicator
        this.visualizer.startPlaybackIndicator();
        this.startPlaybackAnimation();
        
        this.updateStatus('Playing');
    }

    stopAll() {
        this.sonifier.stopAll();
        this.isPlaying = false;
        this.masterPlayButton.textContent = '▶ Play All';
        this.masterPlayButton.classList.remove('playing');
        this.renderMixerChannels();
        
        // Stop visual playback indicator
        this.visualizer.stopPlaybackIndicator();
        this.stopPlaybackAnimation();
        
        this.updateStatus('Stopped');
    }

    startPlaybackAnimation() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
        }

        this.playbackInterval = setInterval(() => {
            if (this.isPlaying) {
                this.visualizer.advancePlaybackIndicator();
                
                // Update sonification based on current playback position
                this.updateSonificationFromPlayback();
            }
        }, this.playbackSpeed);
    }

    stopPlaybackAnimation() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    updateSonificationFromPlayback() {
        const currentIndex = this.visualizer.getPlaybackPosition();
        
        // Calculate the actual maximum data length among active datastreams
        let maxDataLength = 0;
        let activeDatastreamCount = 0;
        
        this.availableDatastreams.forEach((datastream, datastreamId) => {
            if (!datastream.isAdded) return;
            
            activeDatastreamCount++;
            const streamInfo = this.visualizer.activeDatastreams.get(datastreamId);
            if (streamInfo && streamInfo.data) {
                maxDataLength = Math.max(maxDataLength, streamInfo.data.length);
            }
        });
        
        // Update playback position display with actual max length
        const positionElement = document.getElementById('playback-position');
        if (positionElement) {
            positionElement.textContent = `${currentIndex + 1} / ${maxDataLength}`;
        }
        
        // Update each active datastream with the value at current playback position
        this.availableDatastreams.forEach((datastream, datastreamId) => {
            if (!datastream.isAdded) return;

            const streamInfo = this.visualizer.activeDatastreams.get(datastreamId);
            if (streamInfo && streamInfo.data) {
                // Use the data if available at current index, otherwise use the last available value
                const dataIndex = Math.min(currentIndex, streamInfo.data.length - 1);
                if (streamInfo.data[dataIndex]) {
                    const value = streamInfo.data[dataIndex].value;
                    this.sonifier.updateChannelValue(datastreamId, value);
                    
                    // Update the displayed current value in real-time
                    this.updateCurrentValueDisplay(datastreamId, value, datastream.unit);
                }
            }
        });
    }

    updateCurrentValueDisplay(datastreamId, value, unit) {
        // Find and update the current value display for this specific datastream
        const channelElement = document.getElementById(`channel-${datastreamId}`);
        if (channelElement) {
            const currentValueElement = channelElement.querySelector('.current-value');
            if (currentValueElement) {
                // Add a visual indicator that this is live playback data
                currentValueElement.textContent = `Current: ${value.toFixed(2)} ${unit} 🔊`;
                
                // Remove the indicator after a short time to show it's updating
                setTimeout(() => {
                    if (currentValueElement) {
                        currentValueElement.textContent = `Current: ${value.toFixed(2)} ${unit}`;
                    }
                }, 200);
            }
        }
    }

    startDataCollection() {
        this.dataService.start();
        this.updateStatus('Ready');
    }

    handleNewData(data) {
        // Check if we're in simulation mode
        const isSimulation = this.dataService.isUsingSimulation();
        
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

        // Update displays
        this.renderMixerChannels();
        
        // Update status if in simulation mode
        if (isSimulation) {
            this.updateStatus('<span class="simulation-status">Sensor offline - using simulation</span>');
        }
    }

    formatParameterName(param) {
        const names = {
            temperature: 'Temperature',
            methane: 'Methane',
            co2: 'Carbon Dioxide',
            oxygen: 'Oxygen',
            pressure: 'Pressure',
            conductivity: 'Conductivity',
            tds: 'TDS (Total Dissolved Solids)'
        };
        return names[param] || param.charAt(0).toUpperCase() + param.slice(1);
    }

    getParameterUnit(param) {
        const units = {
            temperature: '°C',
            methane: '%',
            co2: '%',
            oxygen: '%',
            pressure: 'mbar',
            conductivity: 'uS/cm',
            tds: 'mg/L'
        };
        return units[param] || '';
    }

    getDatastreamId(sensorKey, parameter) {
        // Map internal sensor/parameter combinations to BGS API datastream IDs
        const datastreamMapping = {
            'site1_temperature': 94,
            'site1_methane': 103,
            'site1_co2': 110,
            'site1_oxygen': 109,
            'site1_pressure': 102,
            'site5_temperature': 108,
            'site5_methane': 100,
            'site5_co2': 93,
            'site5_oxygen': 101,
            'site5_pressure': 104,
            'barometer_temperature': 79,
            'barometer_pressure': 80,
            'gga08_conductivity': 13,
            'gga08_tds': 38
        };
        
        const key = `${sensorKey}_${parameter}`;
        return datastreamMapping[key] || null;
    }

    formatMappingName(mapping) {
        const names = {
            melody: 'Melody - Lead musical line',
            bass: 'Bass - Deep foundation tones',
            harmony: 'Harmony - Rich accompaniment',
            ambient: 'Ambient - Atmospheric pads',
            bells: 'Bells - Sparkling metallic tones'
        };
        return names[mapping] || mapping;
    }


    updateStatus(message) {
        this.statusElement.innerHTML = message;
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

    // Tempo synchronization and tab management methods
    getCurrentTempo() {
        return this.sonifier.getCurrentTempo();
    }

    onTabSwitch(tabName) {
        // Handle tab switching - notify sonifier
        this.sonifier.onTabSwitch(tabName);
        
        if (tabName === 'sensor-data') {
            // When switching back to sensor data tab, ensure tempo synchronization
            this.synchronizeTempoWithBeatMaker();
            this.updateStatus('Sensor data tab active');
        } else if (tabName === 'beat-maker') {
            this.updateStatus('Beat maker tab active');
        }
    }

    synchronizeTempoWithBeatMaker() {
        // Listen for tempo changes from beat maker
        document.addEventListener('beatMakerTempoChange', (e) => {
            const newTempo = e.detail.bpm;
            this.sonifier.setBeatTempo(newTempo);
            this.updateTempoDisplay(newTempo);
        });
    }

    updateTempoDisplay(tempo) {
        if (this.tempoDisplay) {
            this.tempoDisplay.textContent = tempo;
        }
        if (this.beatTempoSlider) {
            this.beatTempoSlider.value = tempo;
        }
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