# GasClam Data Sonification Dashboard

An interactive web application that transforms real-time sensor data from BGS GasClam sensors into musical visualizations and audio experiences.

## Live version

https://pouliens.github.io/Earthwave-Studio/

## Features

- **Real-time Data Visualization**: Live charts displaying sensor readings from 3 BGS sensors
- **Data Sonification**: Converts sensor data into musical parameters
- **Interactive Dashboard**: Visual and audio controls for the sonification experience
- **Web Audio API**: Browser-based audio synthesis without external dependencies

## Sensor Data Sources

- **BGS Site 1 GasClam**: Temperature, Methane, CO2, Oxygen, Barometric Pressure
- **BGS Site 5 GasClam**: Temperature, Methane, CO2, Oxygen, Barometric Pressure  
- **BGS GGERFS Barometer**: Air Temperature, Barometric Pressure

## Sonification Mapping

The application maps sensor readings to musical parameters as follows:

| Sensor Parameter | Musical Parameter | Range |
|------------------|-------------------|--------|
| Temperature | Pitch/Frequency | 10-30°C → 200-800Hz |
| Methane | Rhythm/BPM | 0-5% → 60-120 BPM |
| Carbon Dioxide | Timbre/Waveform | Different waveforms (sine, square, sawtooth) |
| Oxygen | Volume/Amplitude | 15-25% → soft to loud |
| Barometric Pressure | Stereo Panning | 990-1030 mbar → left to right |

## Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in a modern web browser
3. **Click "Play"** to start the sonification
4. **Adjust volume** using the slider
5. **Watch the charts** update with real-time data

## Technical Architecture

### Core Components

- **`index.html`**: Main dashboard interface
- **`js/dataService.js`**: BGS API integration and data fetching
- **`js/visualizer.js`**: Chart.js visualization and display updates
- **`js/sonifier.js`**: Web Audio API synthesis engine
- **`js/app.js`**: Main application controller
- **`css/style.css`**: Responsive dashboard styling

### Data Flow

1. **DataService** fetches sensor data from BGS SensorThings API
2. **Visualizer** updates charts and displays current values
3. **Sonifier** maps sensor values to audio parameters
4. **App** coordinates all components and handles user interactions

### Browser Requirements

- Modern web browser with Web Audio API support
- Chrome 66+, Firefox 60+, Safari 14+, Edge 79+
- Internet connection for live data (falls back to simulation)

## Development

The application is built with vanilla JavaScript and requires no build process:

```bash
# Simply open the HTML file in a browser
open index.html
```

### Adding New Sensors

To add additional sensors:

1. Add sensor configuration to `dataService.js`
2. Update HTML template in `index.html`
3. Extend visualization in `visualizer.js`
4. Add sonification mapping in `sonifier.js`

### Customizing Sonification

Modify the mapping parameters in `sonifier.js`:

```javascript
this.mappings = {
    temperature: {
        min: 10,
        max: 30,
        freqMin: 200,
        freqMax: 800
    },
    // ... other mappings
};
```

## API Integration

The application connects to the BGS SensorThings API:

- **Base URL**: `https://sensors.bgs.ac.uk/FROST-Server/v1.1`
- **Data Format**: OGC SensorThings API standard
- **Update Frequency**: 30 seconds
- **Fallback**: Simulated data when API is unavailable

## Future Enhancements

- Toggle individual data streams on/off
- Multiple musical styles/scales
- Export audio recordings
- Historical data playback
- Mobile-responsive improvements
- Real-time collaboration features

## License

This project is open source and available under the MIT License.

## Credits

- **Data Source**: British Geological Survey (BGS)
- **Visualization**: Chart.js
- **Audio**: Web Audio API
- **Styling**: CSS Grid and Flexbox
