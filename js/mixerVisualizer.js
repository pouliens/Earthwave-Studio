class MixerVisualizer {
    constructor() {
        this.chart = null;
        this.activeDatastreams = new Map();
        this.maxDataPoints = 50;
        this.colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];
        this.colorIndex = 0;
        
        this.initializeChart();
    }

    initializeChart() {
        const canvas = document.getElementById('main-chart');
        if (!canvas) return;

        this.chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Active Datastreams'
                    }
                },
                animation: {
                    duration: 0 // Disable animations for smoother playback indicator
                }
            }
        });

        // Add playback indicator line
        this.playbackIndicator = {
            currentIndex: -1,
            isVisible: false
        };
    }

    addDatastream(datastreamId, name, unit) {
        if (this.activeDatastreams.has(datastreamId)) return;

        const color = this.colors[this.colorIndex % this.colors.length];
        this.colorIndex++;

        const dataset = {
            label: `${name} (${unit})`,
            data: [],
            borderColor: color,
            backgroundColor: this.hexToRgba(color, 0.1),
            tension: 0.4,
            fill: false
        };

        this.activeDatastreams.set(datastreamId, {
            name,
            unit,
            color,
            datasetIndex: this.chart.data.datasets.length,
            data: []
        });

        this.chart.data.datasets.push(dataset);
        this.chart.update();
    }

    removeDatastream(datastreamId) {
        if (!this.activeDatastreams.has(datastreamId)) return;

        const streamInfo = this.activeDatastreams.get(datastreamId);
        
        // Remove dataset
        this.chart.data.datasets.splice(streamInfo.datasetIndex, 1);
        
        // Update indices for remaining datasets
        this.activeDatastreams.forEach((info, id) => {
            if (info.datasetIndex > streamInfo.datasetIndex) {
                info.datasetIndex--;
            }
        });

        this.activeDatastreams.delete(datastreamId);
        this.chart.update();
    }

    updateDatastream(datastreamId, value, timestamp) {
        if (!this.activeDatastreams.has(datastreamId)) return;

        const streamInfo = this.activeDatastreams.get(datastreamId);
        const dataset = this.chart.data.datasets[streamInfo.datasetIndex];
        
        if (!dataset) return;

        // Add new data point
        dataset.data.push(value);
        streamInfo.data.push({ value, timestamp });

        // Update labels if this is the first dataset or if we need more labels
        if (this.chart.data.labels.length < dataset.data.length) {
            this.chart.data.labels.push(this.formatTimestamp(timestamp));
        }

        // Trim old data
        if (dataset.data.length > this.maxDataPoints) {
            dataset.data.shift();
            streamInfo.data.shift();
            
            // Trim labels if all datasets are at max length
            const minLength = Math.min(...this.chart.data.datasets.map(d => d.data.length));
            if (minLength >= this.maxDataPoints && this.chart.data.labels.length > this.maxDataPoints) {
                this.chart.data.labels.shift();
            }
        }

        this.chart.update('none');
    }

    loadHistoricalData(datastreamId, historicalData) {
        if (!this.activeDatastreams.has(datastreamId) || !historicalData.length) return;

        const streamInfo = this.activeDatastreams.get(datastreamId);
        const dataset = this.chart.data.datasets[streamInfo.datasetIndex];
        
        if (!dataset) return;

        // Clear existing data
        dataset.data = [];
        streamInfo.data = [];

        // Add historical data
        historicalData.forEach(entry => {
            dataset.data.push(entry.value);
            streamInfo.data.push(entry);
        });

        // Update labels if this is the first dataset or if we need to expand labels
        if (this.chart.data.labels.length < dataset.data.length) {
            const labelsNeeded = dataset.data.length - this.chart.data.labels.length;
            for (let i = 0; i < labelsNeeded; i++) {
                const dataIndex = this.chart.data.labels.length + i;
                if (historicalData[dataIndex]) {
                    this.chart.data.labels.push(this.formatTimestamp(historicalData[dataIndex].timestamp));
                }
            }
        }

        this.chart.update();
    }

    getActiveDatastreams() {
        return Array.from(this.activeDatastreams.keys());
    }

    getCurrentValue(datastreamId) {
        if (!this.activeDatastreams.has(datastreamId)) return null;
        
        const streamInfo = this.activeDatastreams.get(datastreamId);
        const data = streamInfo.data;
        
        return data.length > 0 ? data[data.length - 1].value : null;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    clear() {
        this.chart.data.labels = [];
        this.chart.data.datasets = [];
        this.activeDatastreams.clear();
        this.colorIndex = 0;
        this.chart.update();
    }

    updateActiveCount() {
        const countElement = document.getElementById('active-count');
        if (countElement) {
            countElement.textContent = this.activeDatastreams.size;
        }
    }

    startPlaybackIndicator() {
        this.playbackIndicator.isVisible = true;
        this.playbackIndicator.currentIndex = 0;
        this.addPlaybackIndicatorDataset();
        this.updatePlaybackIndicator();
    }

    stopPlaybackIndicator() {
        this.playbackIndicator.isVisible = false;
        this.playbackIndicator.currentIndex = -1;
        this.removePlaybackIndicatorDataset();
    }

    addPlaybackIndicatorDataset() {
        // Remove existing indicator if present
        this.removePlaybackIndicatorDataset();

        // Add vertical line dataset
        const indicatorDataset = {
            label: 'Now Playing',
            data: [],
            borderColor: '#FF4444',
            backgroundColor: 'rgba(255, 68, 68, 0.2)',
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            type: 'line',
            order: -1, // Draw on top
            showLine: false // Hide the line, we'll draw vertical lines manually
        };

        this.chart.data.datasets.push(indicatorDataset);
        this.playbackIndicator.datasetIndex = this.chart.data.datasets.length - 1;
    }

    removePlaybackIndicatorDataset() {
        if (this.playbackIndicator.datasetIndex !== undefined) {
            this.chart.data.datasets.splice(this.playbackIndicator.datasetIndex, 1);
            delete this.playbackIndicator.datasetIndex;
        }
    }

    updatePlaybackIndicator() {
        if (!this.playbackIndicator.isVisible || this.chart.data.labels.length === 0) return;

        // Update the current playing position
        this.playbackIndicator.currentIndex = Math.min(
            this.playbackIndicator.currentIndex,
            this.chart.data.labels.length - 1
        );

        // Highlight current data points for all active datastreams
        this.chart.data.datasets.forEach((dataset, index) => {
            if (index === this.playbackIndicator.datasetIndex) return; // Skip indicator dataset
            
            // Reset all point styles
            dataset.pointBackgroundColor = dataset.borderColor;
            dataset.pointRadius = 3;
            dataset.pointBorderWidth = 1;
            
            // Highlight current point
            if (this.playbackIndicator.currentIndex >= 0 && 
                this.playbackIndicator.currentIndex < dataset.data.length) {
                
                const pointColors = Array(dataset.data.length).fill(dataset.borderColor);
                const pointRadii = Array(dataset.data.length).fill(3);
                const pointBorderWidths = Array(dataset.data.length).fill(1);
                
                // Make current point larger and red
                pointColors[this.playbackIndicator.currentIndex] = '#FF4444';
                pointRadii[this.playbackIndicator.currentIndex] = 8;
                pointBorderWidths[this.playbackIndicator.currentIndex] = 3;
                
                dataset.pointBackgroundColor = pointColors;
                dataset.pointRadius = pointRadii;
                dataset.pointBorderWidth = pointBorderWidths;
            }
        });

        this.chart.update('none');
    }

    advancePlaybackIndicator() {
        if (!this.playbackIndicator.isVisible) return;

        this.playbackIndicator.currentIndex++;
        
        // Loop back to start if we've reached the end
        if (this.playbackIndicator.currentIndex >= this.chart.data.labels.length) {
            this.playbackIndicator.currentIndex = 0;
        }
        
        this.updatePlaybackIndicator();
    }

    setPlaybackPosition(index) {
        if (!this.playbackIndicator.isVisible) return;
        
        this.playbackIndicator.currentIndex = Math.max(0, Math.min(index, this.chart.data.labels.length - 1));
        this.updatePlaybackIndicator();
    }

    getPlaybackPosition() {
        return this.playbackIndicator.currentIndex;
    }

    getDataLength() {
        return this.chart.data.labels.length;
    }
}