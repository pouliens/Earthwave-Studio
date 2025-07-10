class Visualizer {
    constructor() {
        this.charts = {};
        this.initializeCharts();
    }

    initializeCharts() {
        // Site 1 Chart
        this.charts.site1 = new Chart(document.getElementById('site1-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Methane (%)',
                        data: [],
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'CO2 (%)',
                        data: [],
                        borderColor: '#4BC0C0',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Oxygen (%)',
                        data: [],
                        borderColor: '#9966FF',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
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
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Gas Concentration (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

        // Site 5 Chart (similar structure)
        this.charts.site5 = new Chart(document.getElementById('site5-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Methane (%)',
                        data: [],
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'CO2 (%)',
                        data: [],
                        borderColor: '#4BC0C0',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Oxygen (%)',
                        data: [],
                        borderColor: '#9966FF',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
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
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Gas Concentration (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

        // Barometer Chart
        this.charts.barometer = new Chart(document.getElementById('barometer-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Pressure (mbar)',
                        data: [],
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
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
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Pressure (mbar)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

        // Audio Visualizer
        this.audioCanvas = document.getElementById('audio-visualizer');
        this.audioCtx = this.audioCanvas.getContext('2d');
        this.audioCanvas.width = 800;
        this.audioCanvas.height = 150;
        
        this.maxDataPoints = 50;
    }

    updateData(sensorData) {
        const currentTime = new Date().toLocaleTimeString();
        
        // Update Site 1
        if (sensorData.site1) {
            if (sensorData.site1.historical) {
                this.loadHistoricalData('site1', sensorData.site1.historical);
            } else {
                this.updateChart('site1', sensorData.site1, currentTime);
            }
            this.updateDisplayValues('site1', sensorData.site1);
        }
        
        // Update Site 5
        if (sensorData.site5) {
            if (sensorData.site5.historical) {
                this.loadHistoricalData('site5', sensorData.site5.historical);
            } else {
                this.updateChart('site5', sensorData.site5, currentTime);
            }
            this.updateDisplayValues('site5', sensorData.site5);
        }
        
        // Update Barometer
        if (sensorData.barometer) {
            if (sensorData.barometer.historical) {
                this.loadHistoricalData('barometer', sensorData.barometer.historical);
            } else {
                this.updateChart('barometer', sensorData.barometer, currentTime);
            }
            this.updateDisplayValues('barometer', sensorData.barometer);
        }
    }

    loadHistoricalData(sensorKey, historicalData) {
        const chart = this.charts[sensorKey];
        if (!chart) return;

        // Clear existing data
        chart.data.labels = [];
        chart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });

        // Get the first parameter to determine data length
        const firstParam = Object.keys(historicalData)[0];
        if (!firstParam || !historicalData[firstParam]) return;

        // Populate timestamps
        chart.data.labels = historicalData[firstParam].map(entry => 
            new Date(entry.timestamp).toLocaleTimeString()
        );

        // Populate datasets based on sensor type
        if (sensorKey === 'barometer') {
            if (historicalData.temperature) {
                chart.data.datasets[0].data = historicalData.temperature.map(entry => entry.value);
            }
            if (historicalData.pressure) {
                chart.data.datasets[1].data = historicalData.pressure.map(entry => entry.value);
            }
        } else {
            if (historicalData.temperature) {
                chart.data.datasets[0].data = historicalData.temperature.map(entry => entry.value);
            }
            if (historicalData.methane) {
                chart.data.datasets[1].data = historicalData.methane.map(entry => entry.value);
            }
            if (historicalData.co2) {
                chart.data.datasets[2].data = historicalData.co2.map(entry => entry.value);
            }
            if (historicalData.oxygen) {
                chart.data.datasets[3].data = historicalData.oxygen.map(entry => entry.value);
            }
        }

        chart.update();
    }

    updateChart(sensorKey, data, timestamp) {
        const chart = this.charts[sensorKey];
        if (!chart) return;

        // Add new timestamp
        chart.data.labels.push(timestamp);
        
        // Keep only last N data points
        if (chart.data.labels.length > this.maxDataPoints) {
            chart.data.labels.shift();
        }

        // Update datasets based on sensor type
        if (sensorKey === 'barometer') {
            chart.data.datasets[0].data.push(data.temperature || 0);
            chart.data.datasets[1].data.push(data.pressure || 0);
            
            // Trim old data
            if (chart.data.datasets[0].data.length > this.maxDataPoints) {
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }
        } else {
            chart.data.datasets[0].data.push(data.temperature || 0);
            chart.data.datasets[1].data.push(data.methane || 0);
            chart.data.datasets[2].data.push(data.co2 || 0);
            chart.data.datasets[3].data.push(data.oxygen || 0);
            
            // Trim old data
            if (chart.data.datasets[0].data.length > this.maxDataPoints) {
                chart.data.datasets.forEach(dataset => {
                    dataset.data.shift();
                });
            }
        }

        chart.update('none');
    }

    updateDisplayValues(sensorKey, data) {
        const prefix = sensorKey === 'barometer' ? 'barometer' : sensorKey;
        
        if (data.temperature !== undefined) {
            const element = document.getElementById(`${prefix}-temp`);
            if (element) {
                element.textContent = data.temperature.toFixed(1);
            }
        }
        
        if (data.methane !== undefined) {
            const element = document.getElementById(`${prefix}-methane`);
            if (element) {
                element.textContent = data.methane.toFixed(2);
            }
        }
        
        if (data.co2 !== undefined) {
            const element = document.getElementById(`${prefix}-co2`);
            if (element) {
                element.textContent = data.co2.toFixed(2);
            }
        }
        
        if (data.oxygen !== undefined) {
            const element = document.getElementById(`${prefix}-oxygen`);
            if (element) {
                element.textContent = data.oxygen.toFixed(1);
            }
        }
        
        if (data.pressure !== undefined) {
            const element = document.getElementById(`${prefix}-pressure`);
            if (element) {
                element.textContent = data.pressure.toFixed(1);
            }
        }
    }

    updateAudioVisualization(frequency, amplitude, waveform) {
        const canvas = this.audioCanvas;
        const ctx = this.audioCtx;
        
        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw frequency bars
        const barWidth = canvas.width / 50;
        const barHeight = amplitude * 100;
        
        for (let i = 0; i < 50; i++) {
            const x = i * barWidth;
            const height = Math.random() * barHeight + 10;
            
            // Color based on frequency
            const hue = (frequency / 1000) * 360;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            
            ctx.fillRect(x, canvas.height - height, barWidth - 2, height);
        }
        
        // Draw waveform
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < canvas.width; i++) {
            const x = i;
            const y = canvas.height / 2 + Math.sin(i * 0.1 + Date.now() * 0.01) * amplitude * 30;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }

    updateAudioIndicators(pitch, bpm, waveform) {
        document.getElementById('pitch-value').textContent = pitch.toFixed(1);
        document.getElementById('bpm-value').textContent = bpm.toFixed(0);
        document.getElementById('waveform-value').textContent = waveform;
    }
}