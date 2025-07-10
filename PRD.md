# Sensor Data Sonification Platform - Product Requirements Document

## 1. Product Overview

### 1.1 Vision
A comprehensive web-based platform that transforms real-time environmental sensor data into immersive audio-visual experiences, making scientific data accessible and engaging through sound.

### 1.2 Mission
To bridge the gap between complex environmental datasets and human understanding by leveraging sonification techniques, enabling researchers, educators, and the public to "hear" environmental changes and patterns.

### 1.3 Target Users
- **Environmental researchers** analyzing sensor data patterns
- **Educators** teaching about environmental monitoring
- **Data scientists** exploring alternative data representation methods
- **Artists and musicians** interested in data-driven compositions
- **General public** engaging with environmental data

## 2. Current Implementation

### 2.1 System Architecture

The platform consists of two main interfaces:

#### 2.1.1 Sensor Data Mixer (`index.html`)
- **Purpose**: Professional-grade audio mixing interface for sensor data
- **Technology**: Dual audio engines (Web Audio API + Tone.js)
- **Features**: 
  - Real-time BGS sensor data integration
  - Multi-channel audio mixing
  - 5 distinct audio mapping tools
  - Musical scale selection
  - Tempo synchronization with beat maker

#### 2.1.2 Beat Maker (`Beat-Maker/index.html`)
- **Purpose**: Rhythmic accompaniment creation
- **Technology**: React + Tone.js
- **Features**:
  - 8-step sequencer with 6 drum sounds
  - Preset beat patterns (Ambient Pulse, Organic Flow, Data Groove)
  - Tempo sync with sensor data mixer
  - Visual step sequencer interface

### 2.2 Audio Tools (5 Distinct Mappings)

#### 2.2.1 Melody
- **Description**: Lead musical line that follows data values
- **Implementation**: Clear sine/triangle waves with reverb
- **Behavior**: Higher data values = higher musical notes
- **Use Case**: Primary melodic representation of data trends

#### 2.2.2 Bass
- **Description**: Deep foundation tones providing rhythmic anchor
- **Implementation**: Square waves, 2 octaves down, low-pass filtered
- **Behavior**: Steady rhythmic pulses with pitch following data
- **Use Case**: Underlying structure and foundation

#### 2.2.3 Harmony
- **Description**: Rich accompaniment with chord progressions
- **Implementation**: Sawtooth waves with chorus, 1 octave up
- **Behavior**: Chord triads that change with data values
- **Use Case**: Harmonic context and musical richness

#### 2.2.4 Ambient
- **Description**: Atmospheric pads creating spatial depth
- **Implementation**: Sustained chords with heavy reverb and delay
- **Behavior**: Slow-evolving atmospheric textures
- **Use Case**: Background ambience and spatial awareness

#### 2.2.5 Bells
- **Description**: Sparkling metallic accents for data peaks
- **Implementation**: MetalSynth with high resonance, 2 octaves up
- **Behavior**: Triggered on significant data changes or peaks
- **Use Case**: Highlighting important data events

### 2.3 Data Sources

#### 2.3.1 BGS Sensor Network Integration
- **API**: BGS SensorThings API (`https://sensors.bgs.ac.uk/FROST-Server/v1.1`)
- **Sensors**: Multiple GasClam and environmental monitoring stations
- **Parameters**: Temperature, Methane, CO2, Oxygen, Barometric Pressure
- **Update Frequency**: Configurable (default 30 seconds)
- **Fallback**: Simulated data when API unavailable

#### 2.3.2 MCP BGS Sensors Integration
- **Purpose**: Enhanced sensor discovery and data access
- **Tools**: 
  - `discover_system`: Explore available sensors
  - `find_sensors`: Search by location/property
  - `get_sensor_details`: Detailed sensor information
  - `get_sensor_data`: Retrieve measurements
  - `query_api`: Direct API access

### 2.4 Technical Implementation

#### 2.4.1 Core Technologies
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, React (Beat Maker)
- **Audio**: Web Audio API, Tone.js
- **Visualization**: Chart.js
- **Build**: No build process required for main app, Vite for Beat Maker

#### 2.4.2 Key Components
```
js/
├── mixerApp.js          # Main application controller
├── mixerSonifier.js     # Web Audio API implementation  
├── toneSonifier.js      # Tone.js implementation
├── dataService.js       # BGS API integration
├── mixerVisualizer.js   # Chart.js visualizations
├── beatMaker.js         # Beat sequencer
└── tabManager.js        # Interface management
```

#### 2.4.3 Audio Architecture
- **Dual Engine Design**: Web Audio API for basic synthesis, Tone.js for advanced effects
- **Real-time Processing**: Live data normalization and audio parameter mapping
- **Musical Intelligence**: Automatic scaling, musical key selection, tempo sync
- **Performance Optimization**: Efficient audio graph management

## 3. How to Run

### 3.1 Main Sensor Data Mixer
```bash
# Option 1: Direct browser access
open index.html

# Option 2: Local server (recommended)
python -m http.server 8000
# Then visit http://localhost:8000
```

### 3.2 Beat Maker (Development Mode)
```bash
cd Beat-Maker/
npm install
npm run dev
# Visit http://localhost:5173
```

### 3.3 Beat Maker (Production Build)
```bash
cd Beat-Maker/
npm run build
# Deploy dist/ folder to web server
```

### 3.4 System Requirements
- **Browser**: Chrome 66+, Firefox 60+, Safari 14+, Edge 79+
- **Network**: Internet connection for live data
- **Audio**: Web Audio API support
- **Permissions**: May require user gesture for audio initialization

## 4. Current Features

### 4.1 Data Integration ✅
- [x] BGS SensorThings API connection
- [x] Real-time data fetching and normalization
- [x] Automatic sensor discovery
- [x] Fallback simulation mode
- [x] MCP BGS sensors integration

### 4.2 Audio Sonification ✅
- [x] 5 distinct audio mapping tools
- [x] Musical scale system (Major, Minor, Pentatonic, Blues, Dorian)
- [x] Real-time audio synthesis
- [x] Dual audio engine architecture
- [x] Volume and tempo controls

### 4.3 Visualization ✅
- [x] Real-time data charts
- [x] Sensor status indicators
- [x] Audio level meters
- [x] Interactive mixer interface

### 4.4 Beat Making ✅
- [x] 8-step drum sequencer
- [x] 6 drum sound library
- [x] Preset pattern library
- [x] Tempo synchronization
- [x] Visual step indicators

### 4.5 User Interface ✅
- [x] Tabbed interface design
- [x] Responsive layout
- [x] Professional mixer aesthetic
- [x] Real-time status updates

## 5. Future Improvements

### 5.1 Near-term Enhancements (Next 3 months)

#### 5.1.1 Advanced Audio Features
- [ ] **Spatial Audio**: 3D positioning of audio sources based on sensor locations
- [ ] **Effect Chains**: User-configurable audio effect routing
- [ ] **MIDI Integration**: Export/import MIDI data for DAW integration
- [ ] **Audio Recording**: Export sonified sessions as audio files

#### 5.1.2 Data Analysis
- [ ] **Pattern Detection**: Automatic identification of data patterns/anomalies
- [ ] **Historical Playback**: Timeline scrubbing through past data
- [ ] **Data Comparison**: Side-by-side comparison of different time periods
- [ ] **Statistical Overlays**: Real-time statistical analysis visualization

#### 5.1.3 User Experience
- [ ] **Preset Management**: Save/load custom audio configurations
- [ ] **Tutorial System**: Interactive onboarding for new users
- [ ] **Accessibility**: Screen reader support, keyboard navigation
- [ ] **Mobile App**: Native mobile application

### 5.2 Medium-term Goals (3-6 months)

#### 5.2.1 Collaboration Features
- [ ] **Multi-user Sessions**: Real-time collaborative sonification
- [ ] **Social Sharing**: Share interesting sonification discoveries
- [ ] **Community Presets**: User-generated preset library
- [ ] **Performance Mode**: Live performance interface for presentations

#### 5.2.2 Advanced Synthesis
- [ ] **Machine Learning**: AI-driven pattern sonification
- [ ] **Granular Synthesis**: More complex audio textures
- [ ] **Physical Modeling**: Realistic instrument simulations
- [ ] **Generative Music**: AI composition based on data patterns

#### 5.2.3 Data Expansion
- [ ] **Weather Data**: Integration with meteorological APIs
- [ ] **Satellite Data**: Environmental monitoring from space
- [ ] **Ocean Data**: Marine sensor integration
- [ ] **Air Quality**: Pollution monitoring sonification

### 5.3 Long-term Vision (6+ months)

#### 5.3.1 Platform Evolution
- [ ] **VR/AR Integration**: Immersive 3D sonification environments
- [ ] **Real-time Streaming**: Live broadcast of sonification sessions
- [ ] **Educational Platform**: Curriculum and lesson plan integration
- [ ] **Research Tools**: Advanced analysis and publication features

#### 5.3.2 Scientific Applications
- [ ] **Climate Monitoring**: Long-term climate change sonification
- [ ] **Earthquake Data**: Seismic activity audio representation
- [ ] **Wildlife Tracking**: Animal migration pattern sonification
- [ ] **Urban Planning**: City infrastructure data analysis

#### 5.3.3 Artistic Applications
- [ ] **Concert Integration**: Live performance with real environmental data
- [ ] **Installation Art**: Museum and gallery integration
- [ ] **Film Scoring**: Environmental soundtrack generation
- [ ] **Therapeutic Applications**: Relaxation and meditation uses

## 6. Technical Roadmap

### 6.1 Performance Optimization
- **WebAssembly Integration**: High-performance audio processing
- **Service Workers**: Offline capability and data caching
- **WebGL Acceleration**: GPU-accelerated visualizations
- **Streaming Architecture**: Real-time data streaming optimization

### 6.2 Scalability Improvements
- **Microservices**: Modular backend architecture
- **CDN Integration**: Global content delivery
- **Load Balancing**: High-availability deployment
- **Database Optimization**: Efficient data storage and retrieval

### 6.3 Standards Compliance
- **WCAG 2.1**: Full accessibility compliance
- **PWA Standards**: Progressive web app features
- **Web Audio Extensions**: Integration with emerging web standards
- **Data Portability**: Standard data export formats

## 7. Success Metrics

### 7.1 User Engagement
- **Active Users**: Monthly and daily active users
- **Session Duration**: Average time spent in application
- **Feature Usage**: Adoption rates of different audio tools
- **User Retention**: Return user percentage

### 7.2 Technical Performance
- **Load Times**: Application startup performance
- **Audio Latency**: Real-time audio responsiveness
- **Data Accuracy**: Sensor data integration reliability
- **Cross-browser Compatibility**: Support across different browsers

### 7.3 Scientific Impact
- **Research Citations**: Academic papers referencing the platform
- **Educational Adoption**: Schools and universities using the tool
- **Data Insights**: Novel discoveries enabled by sonification
- **Community Contributions**: User-generated content and improvements

## 8. Risk Assessment

### 8.1 Technical Risks
- **Browser Compatibility**: Web Audio API variations across browsers
- **Data Availability**: BGS API reliability and uptime
- **Performance Constraints**: Real-time audio processing limitations
- **Security Concerns**: Safe handling of user data and API keys

### 8.2 Mitigation Strategies
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Multiple Data Sources**: Backup APIs and simulation modes
- **Performance Monitoring**: Real-time performance tracking
- **Security Audits**: Regular security reviews and updates

## 9. Conclusion

The Sensor Data Sonification Platform represents a significant step forward in making environmental data accessible and engaging through innovative audio-visual techniques. With its robust dual-engine architecture, comprehensive feature set, and clear roadmap for future development, the platform is well-positioned to serve researchers, educators, and the general public in understanding our environment through sound.

The current implementation provides a solid foundation with 5 distinct audio tools, real-time data integration, and professional-grade mixing capabilities. The planned enhancements will expand the platform's capabilities in spatial audio, machine learning, and collaborative features, positioning it as a leader in the emerging field of data sonification.

---

*Document Version: 1.0*  
*Last Updated: July 10, 2025*  
*Next Review: August 10, 2025*