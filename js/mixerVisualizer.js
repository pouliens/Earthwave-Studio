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
                }
            }
        });
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
}