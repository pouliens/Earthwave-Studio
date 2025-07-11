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
                            text: 'Normalized Value (0-100%)'
                        },
                        min: -10,
                        max: 110,
                        ticks: {
                            callback: function(value) {
                                if (value < 0 || value > 100) return '';
                                return value + '%';
                            }
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
                        text: 'Active Datastreams (Normalized 0-100%)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const datasetLabel = context.dataset.label;
                                const normalizedValue = context.parsed.y;
                                const originalValue = context.dataset.originalValues?.[context.dataIndex] || 'N/A';
                                return `${datasetLabel}: ${normalizedValue.toFixed(1)}% (${originalValue})`;
                            }
                        }
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
            originalValues: [], // Store original values for tooltips
            borderColor: color,
            backgroundColor: this.hexToRgba(color, 0.1),
            tension: 0.4,
            fill: false,
            minValue: null,
            maxValue: null
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

        // Store original value
        dataset.originalValues = dataset.originalValues || [];
        dataset.originalValues.push(value);
        streamInfo.data.push({ value, timestamp });

        // Auto-detect min/max for normalization
        this.updateValueRange(dataset, value);

        // Add normalized data point
        const normalizedValue = this.normalizeToPercentage(value, dataset.minValue, dataset.maxValue);
        dataset.data.push(normalizedValue);

        // Update labels if this is the first dataset or if we need more labels
        if (this.chart.data.labels.length < dataset.data.length) {
            this.chart.data.labels.push(this.formatTimestamp(timestamp));
        }

        // Trim old data
        if (dataset.data.length > this.maxDataPoints) {
            dataset.data.shift();
            dataset.originalValues.shift();
            streamInfo.data.shift();
            
            // Recalculate min/max after trimming
            this.recalculateValueRange(dataset);
            
            // Trim labels if all datasets are at max length
            const minLength = Math.min(...this.chart.data.datasets.map(d => d.data.length));
            if (minLength >= this.maxDataPoints && this.chart.data.labels.length > this.maxDataPoints) {
                this.chart.data.labels.shift();
            }
        }

        this.chart.update('none');
    }

    updateValueRange(dataset, newValue) {
        if (dataset.minValue === null || newValue < dataset.minValue) {
            dataset.minValue = newValue;
        }
        if (dataset.maxValue === null || newValue > dataset.maxValue) {
            dataset.maxValue = newValue;
        }
        
        // Add small buffer to avoid division by zero
        if (dataset.maxValue === dataset.minValue) {
            dataset.maxValue += Math.abs(dataset.minValue) * 0.1 + 1;
        }
    }

    recalculateValueRange(dataset) {
        if (!dataset.originalValues || dataset.originalValues.length === 0) return;
        
        dataset.minValue = Math.min(...dataset.originalValues);
        dataset.maxValue = Math.max(...dataset.originalValues);
        
        // Add small buffer
        if (dataset.maxValue === dataset.minValue) {
            dataset.maxValue += Math.abs(dataset.minValue) * 0.1 + 1;
        }

        // Renormalize all existing data
        for (let i = 0; i < dataset.originalValues.length; i++) {
            dataset.data[i] = this.normalizeToPercentage(
                dataset.originalValues[i], 
                dataset.minValue, 
                dataset.maxValue
            );
        }
    }

    normalizeToPercentage(value, min, max) {
        if (max === min) return 50; // Default to middle if no variation
        return ((value - min) / (max - min)) * 100;
    }

    loadHistoricalData(datastreamId, historicalData) {
        if (!this.activeDatastreams.has(datastreamId) || !historicalData.length) return;

        const streamInfo = this.activeDatastreams.get(datastreamId);
        const dataset = this.chart.data.datasets[streamInfo.datasetIndex];
        
        if (!dataset) return;

        // Clear existing data
        dataset.data = [];
        dataset.originalValues = [];
        streamInfo.data = [];

        // Calculate min/max from historical data
        const values = historicalData.map(entry => entry.value);
        dataset.minValue = Math.min(...values);
        dataset.maxValue = Math.max(...values);
        
        // Add small buffer to avoid division by zero
        if (dataset.maxValue === dataset.minValue) {
            dataset.maxValue += Math.abs(dataset.minValue) * 0.1 + 1;
        }

        // Add normalized historical data
        historicalData.forEach(entry => {
            dataset.originalValues.push(entry.value);
            const normalizedValue = this.normalizeToPercentage(entry.value, dataset.minValue, dataset.maxValue);
            dataset.data.push(normalizedValue);
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

        // Don't constrain the current index here - let advancePlaybackIndicator handle looping
        // The currentIndex should already be properly managed by advancePlaybackIndicator()

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

        const previousIndex = this.playbackIndicator.currentIndex;
        this.playbackIndicator.currentIndex++;
        
        // Loop back to start if we've reached the end (use actual max data length)
        const maxLength = this.getDataLength();
        if (this.playbackIndicator.currentIndex >= maxLength) {
            console.log(`Looping back to start - reached end of data (index: ${this.playbackIndicator.currentIndex}, length: ${maxLength})`);
            this.playbackIndicator.currentIndex = 0;
        }
        
        // Debug logging to track advancement
        if (this.playbackIndicator.currentIndex !== previousIndex + 1 && this.playbackIndicator.currentIndex !== 0) {
            console.log(`Playback position changed unexpectedly: ${previousIndex} -> ${this.playbackIndicator.currentIndex}`);
        }
        
        this.updatePlaybackIndicator();
    }

    setPlaybackPosition(index) {
        if (!this.playbackIndicator.isVisible) return;
        
        const maxLength = this.getDataLength();
        this.playbackIndicator.currentIndex = Math.max(0, Math.min(index, maxLength - 1));
        this.updatePlaybackIndicator();
    }

    getPlaybackPosition() {
        return this.playbackIndicator.currentIndex;
    }

    getDataLength() {
        // Return the maximum length among all active datastreams
        let maxLength = this.chart.data.labels.length;
        
        // Also check individual datastream lengths
        this.activeDatastreams.forEach((streamInfo) => {
            if (streamInfo.data && streamInfo.data.length > maxLength) {
                maxLength = streamInfo.data.length;
            }
        });
        
        // Ensure we always have at least 1 to prevent division by zero or infinite loops
        return Math.max(1, maxLength);
    }
}