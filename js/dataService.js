class DataService {
    constructor() {
        this.baseUrl = 'https://sensors.bgs.ac.uk/FROST-Server/v1.1';
        this.sensorData = {
            site1: {
                id: 19,
                datastreams: {
                    temperature: 94,
                    methane: 103,
                    co2: 110,
                    oxygen: 109,
                    pressure: 102
                },
                currentValues: {},
                historicalData: {}
            },
            site5: {
                id: 15,
                datastreams: {
                    temperature: 108,
                    methane: 100,
                    co2: 93,
                    oxygen: 101,
                    pressure: 104
                },
                currentValues: {},
                historicalData: {}
            },
            barometer: {
                id: 8,
                datastreams: {
                    temperature: 79,
                    pressure: 80
                },
                currentValues: {},
                historicalData: {}
            },
            gga08: {
                id: 3,
                datastreams: {
                    conductivity: 13,
                    tds: 38
                },
                currentValues: {},
                historicalData: {}
            }
        };
        this.updateInterval = 30000; // 30 seconds
        this.isRunning = false;
        this.listeners = [];
        this.usingSimulation = false;
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners(data) {
        this.listeners.forEach(callback => callback(data));
    }

    async fetchLatestObservation(datastreamId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/Datastreams(${datastreamId})/Observations?$top=1&$orderby=phenomenonTime desc`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                return {
                    value: data.value[0].result,
                    timestamp: data.value[0].phenomenonTime
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching datastream ${datastreamId}:`, error);
            return null;
        }
    }

    async fetchHistoricalData(datastreamId, count = 50) {
        try {
            const response = await fetch(
                `${this.baseUrl}/Datastreams(${datastreamId})/Observations?$top=${count}&$orderby=phenomenonTime desc`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                return data.value.reverse().map(obs => ({
                    value: obs.result,
                    timestamp: obs.phenomenonTime
                }));
            }
            return [];
        } catch (error) {
            console.error(`Error fetching historical data for datastream ${datastreamId}:`, error);
            return [];
        }
    }

    async fetchSynchronizedHistoricalData(datastreamId, count = 50) {
        try {
            console.log(`Fetching last ${count} real observations for datastream ${datastreamId}...`);
            
            // Directly fetch the last N observations, ordered by time descending
            const response = await fetch(
                `${this.baseUrl}/Datastreams(${datastreamId})/Observations?$top=${count}&$orderby=phenomenonTime desc`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                // Reverse to get chronological order (oldest to newest)
                const formattedData = data.value.reverse().map(obs => ({
                    value: obs.result,
                    timestamp: obs.phenomenonTime
                }));
                
                console.log(`Fetched ${formattedData.length} real observations for ${datastreamId}`);
                console.log(`Time range: ${formattedData[0].timestamp} to ${formattedData[formattedData.length-1].timestamp}`);
                return formattedData;
            }
            
            console.log(`No observations found for datastream ${datastreamId}`);
            return [];
        } catch (error) {
            console.error(`Error fetching historical data for datastream ${datastreamId}:`, error);
            return [];
        }
    }

    async fetchSensorData(sensorKey) {
        const sensor = this.sensorData[sensorKey];
        const results = {};
        
        for (const [param, datastreamId] of Object.entries(sensor.datastreams)) {
            const observation = await this.fetchLatestObservation(datastreamId);
            if (observation) {
                results[param] = observation.value;
            } else {
                // Use simulated data if API fails
                results[param] = this.simulateValue(param);
            }
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        sensor.currentValues = results;
        return results;
    }

    simulateValue(param) {
        // Simulate realistic sensor values for demo purposes
        const now = Date.now();
        const baseWave = Math.sin(now / 60000) * 0.5 + 0.5; // 1 minute cycle
        const noise = (Math.random() - 0.5) * 0.1;
        
        switch (param) {
            case 'temperature':
                return 15 + baseWave * 10 + noise; // 15-25°C
            case 'methane':
                return 0.5 + baseWave * 2 + Math.abs(noise); // 0.5-2.5%
            case 'co2':
                return 0.1 + baseWave * 0.5 + Math.abs(noise); // 0.1-0.6%
            case 'oxygen':
                return 20 + baseWave * 2 + noise; // 20-22%
            case 'pressure':
                return 1000 + baseWave * 20 + noise; // 1000-1020 mbar
            case 'conductivity':
                return 200 + baseWave * 300 + Math.abs(noise * 50); // 200-500 uS/cm
            case 'tds':
                return 100 + baseWave * 200 + Math.abs(noise * 30); // 100-300 mg/L
            default:
                return 0;
        }
    }

    async updateAllSensors() {
        try {
            const results = {};
            
            // Fetch data for all sensors
            for (const sensorKey of Object.keys(this.sensorData)) {
                console.log(`Fetching data for ${sensorKey}...`);
                results[sensorKey] = await this.fetchSensorData(sensorKey);
            }
            
            // Reset simulation flag on successful data fetch
            this.usingSimulation = false;
            
            // Notify listeners with new data
            this.notifyListeners(results);
            
            return results;
        } catch (error) {
            console.error('Error updating sensor data:', error);
            
            // Mark as using simulation mode
            this.usingSimulation = true;
            
            // Fallback to simulated data
            const simulatedResults = {};
            for (const sensorKey of Object.keys(this.sensorData)) {
                const sensor = this.sensorData[sensorKey];
                simulatedResults[sensorKey] = {};
                for (const param of Object.keys(sensor.datastreams)) {
                    simulatedResults[sensorKey][param] = this.simulateValue(param);
                }
            }
            
            this.notifyListeners(simulatedResults);
            return simulatedResults;
        }
    }


    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('Starting data service...');
        
        // Start with immediate sensor data update (no bulk historical loading)
        this.updateAllSensors();
        
        // Set up periodic updates for live data
        this.intervalId = setInterval(() => {
            this.updateAllSensors();
        }, this.updateInterval);
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('Data service stopped');
    }

    getCurrentData() {
        const results = {};
        for (const [sensorKey, sensor] of Object.entries(this.sensorData)) {
            results[sensorKey] = { ...sensor.currentValues };
        }
        return results;
    }


    // Helper method to get sensor info
    getSensorInfo() {
        return {
            site1: {
                name: 'BGS Site 1 GasClam',
                location: 'Glasgow, UK',
                parameters: ['temperature', 'methane', 'co2', 'oxygen', 'pressure']
            },
            site5: {
                name: 'BGS Site 5 GasClam',
                location: 'Glasgow, UK',
                parameters: ['temperature', 'methane', 'co2', 'oxygen', 'pressure']
            },
            barometer: {
                name: 'BGS GGERFS Barometer',
                location: 'Glasgow, UK',
                parameters: ['temperature', 'pressure']
            },
            gga08: {
                name: 'BGS Groundwater Logger GGA08',
                location: 'Glasgow, UK',
                parameters: ['conductivity', 'tds']
            }
        };
    }

    // Check if currently using simulation mode
    isUsingSimulation() {
        return this.usingSimulation || false;
    }
}