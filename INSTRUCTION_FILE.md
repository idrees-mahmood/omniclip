# OMNICLIP CODEBASE INSTRUCTION FILE

## PROJECT OVERVIEW
- **Name**: Omniclip
- **Purpose**: Open-source browser-based video editor
- **Core Philosophy**: Client-side video editing with no server dependencies
- **Features**: Timeline editing, media management, transitions, effects, filters, animations, real-time collaboration, Quran subtitle generation
- **Key Differentiator**: Runs entirely in browser using WebCodecs for high performance

## ARCHITECTURE

### Core Pattern
- Component-based architecture with unidirectional data flow
- State → Actions → Controllers → Components flow
- Web components with shadow DOM for UI isolation

### Key Classes/Objects
- `OmniContext`: Central context manager that holds state and controller instances
- `Nexus<OmniContext>`: Context provider/consumer system for components
- `State`: Split into historical (with undo/redo) and non-historical parts
- `Controllers`: Specialized logic handlers (Timeline, Media, Compositor, VideoExport, etc.)

## TECH STACK

### Frontend
- TypeScript
- @benev/slate: UI framework
- @benev/construct: Layout management
- Lit: Web component base library
- Pixi.js: Canvas rendering
- GSAP: Animation engine

### Media Processing
- WebCodecs API: Browser-native video encoding/decoding
- FFmpeg (WASM): Additional media processing
- WaveSurfer.js: Audio visualization
- MP4Box: MP4 container manipulation

## STATE MANAGEMENT

### Structure
- `historical_state`: Supports undo/redo (effects, tracks, filters, animations, transitions)
- `non_historical_state`: UI state (selected items, playback, export progress)
- State persistence via localStorage keyed by project ID

### Actions
- Historical actions: Affect project content (add/remove effects, text styling, etc.)
- Non-historical actions: Affect UI state (playback, zoom, timeline position)
- All actions can be broadcast for collaboration

## COMPONENTS STRUCTURE

### Main Components
- `omni-timeline`: Timeline editing with tracks, effects, and playhead
- `omni-media`: Media asset management (import, display, add to timeline)
- `omni-text`: Text creation and styling
- `omni-filters`: Visual filters for media
- `omni-transitions`: Transition effects between clips
- `omni-anim`: Animation effects for media
- `omni-subtitles`: Subtitle management
- `omni-quran-subtitles`: Automatic generation of subtitles for Quran recitations
- `omni-manager`: Project management UI

### UI Framework
- Components use shadow DOM for style isolation
- `shadow_component` and `light_component` for component creation
- HTML templating with lit's html template literal tag

## DATA MODEL

### Core Types
- `Effect`: Base interface for timeline items
  - `VideoEffect`: Video clip
  - `AudioEffect`: Audio clip
  - `ImageEffect`: Image asset
  - `TextEffect`: Text element
- `Track`: Timeline track
- `Filter`: Visual filter applied to effects
- `Animation`: Animation applied to effects
- `Transition`: Transition between effects

### Timeline Structure
- Multiple tracks containing effects
- Effects have position, duration, and track index
- Effects can be trimmed, split, and repositioned

## CONTROLLERS

### Key Controllers
- `Timeline`: Manages playhead, effects positioning, and track operations
- `Media`: Handles importing, storing, and retrieving media assets
- `Compositor`: Renders the preview and manages visual objects
- `VideoExport`: Handles rendering and exporting final video
- `Shortcuts`: Keyboard shortcuts manager
- `Collaboration`: WebRTC-based collaboration

## WORKFLOW PATTERNS

### Media Import Flow
1. User imports media through `omni-media`
2. `Media` controller processes files and creates elements
3. Media is stored and thumbnails generated
4. User adds media to timeline via UI
5. `Compositor` creates canvas objects for preview

### Timeline Editing Flow
1. User manipulates effects on timeline
2. Actions update state
3. State changes trigger re-renders
4. `Compositor` updates preview

### Rendering Flow
1. User initiates export
2. `VideoExport` controller captures frames from `Compositor`
3. WebCodecs encodes frames to video
4. Output file is generated for download

## COLLABORATION SYSTEM

### Implementation
- WebRTC-based peer-to-peer communication
- Host/client model with state synchronization
- Action broadcasting to keep clients in sync
- Collaboration controller manages connections

## FILE ORGANIZATION

### Key Directories
- `/s/components/`: Web components for UI
- `/s/context/`: State, actions, and controllers
- `/s/context/controllers/`: Business logic
- `/s/tools/`: Utility functionality
- `/s/views/`: Shared UI elements
- `/s/icons/`: SVG icons

### Build Output
- `/x/`: Compiled JavaScript output

## EXTENSION POINTS

### Component System
- Add new components by registering via `registerElements`
- Create new effect types by extending Effect interface
- Add new actions to manipulate state

### Controller Pattern
- Each domain has a controller with its public API
- New features should follow controller pattern for consistency

## CONVENTIONS

### Naming
- Components prefixed with `omni-`
- Controllers use PascalCase
- Actions use snake_case
- State properties use snake_case

### Component Structure
- `.ts` file for component logic
- `styles.ts` for component-specific styles
- `panel.ts` for construct layout integration

### State Updates
- Always use actions to update state
- Track state changes for collaboration broadcast
- Check if client before making historical changes

## PERFORMANCE CONSIDERATIONS

### Critical Paths
- Timeline rendering (avoid expensive operations)
- Video decoding (happens on dedicated thread)
- Preview rendering (uses WebGL for acceleration)
- Export process (runs encoder in worker)

### Memory Management
- Media caching needs manual control
- Large files should be garbage collected when not needed
- Dispose Pixi.js objects explicitly

## ERROR HANDLING

### Media Errors
- WebCodecs support detection at startup
- Fallbacks for unsupported codecs
- Error states in export process
- User-facing error messages for common issues

### State Consistency
- Validation in actions before state changes
- State recovery from localStorage on errors
- Collaboration resync mechanisms

## TESTING STRATEGY

### Test Files
- `s/tests.test.ts`: Entry point for tests
- Test environment flag with `IS_TEST_ENV`

### Testing Approach
- Unit tests for utility functions
- Component tests for UI behavior
- Media processing tests with test fixtures

## LOCALIZATION

### Current State
- Limited localization support
- Hardcoded English strings

### Future Considerations
- Extract strings for localization
- Add language selection support

## ACCESSIBILITY

### Current Implementation
- Basic keyboard shortcuts
- Limited screen reader support

### Improvement Areas
- ARIA attributes for timeline elements
- Focus management in complex interactions
- Keyboard navigation enhancements

## BROWSER COMPATIBILITY

### Requirements
- Modern browsers with WebCodecs support
- Chrome/Edge recommended
- Firefox with flags for some features
- Limited Safari support

### Detection
- Feature detection at startup with graceful fallbacks
- Warning for unsupported browsers

## SECURITY CONSIDERATIONS

### Local Processing
- All processing happens client-side
- No server communication for core functionality
- Files never leave the browser

### Collaboration
- WebRTC with encryption
- No central server for content
- Peer-to-peer connections only

## DEPLOYMENT

### Build Process
- `npm run build`: Development build
- `npm run build-production`: Production build
- `npm run build-netlify`: Netlify-specific build

### Output
- Bundled JavaScript with sourcemaps
- Static HTML/CSS/JS deployment
- No server-side components required

## FUTURE ROADMAP

### Planned Features
- Audio editing enhancements
- Speech-to-text capabilities
- Keyframe animation system
- More transitions and effects
- Performance optimizations
- Enhanced Quran subtitle generation with more language options

## QURAN SUBTITLE GENERATION

### Implementation
- Extracts audio from selected video/audio clips using WebCodecs and FFmpeg (WASM)
- Sends audio to external API for Quran ayah matching
- Creates synchronized subtitle entries from matched ayahs
- Arabic text with RTL support using Uthmanic Hafs font
- User interface for selecting surah and ayah ranges and customizing text appearance
- Supports text positioning, font size adjustment, and word wrap settings
- Environment variable support for backend URL configuration with fallbacks

### API Integration
- Connects to external Quran matching API (configurable via VITE_BACKEND_URL)
- Sends audio file and metadata via multipart/form-data
- Receives timestamped ayah matches for subtitle generation
- Uses CORS for secure cross-origin communication
- Handles various response formats and error conditions

### Usage Flow
1. User selects video/audio clip on timeline
2. User enters surah number and optional ayah range
3. System extracts audio and sends to API with progress indicators
4. API returns matched ayahs with timestamps
5. System generates subtitle text effects on timeline
6. User can customize appearance settings for created subtitles

### Technical Details
- Uses FFmpegHelper for audio extraction through WASM
- Processes audio in-browser for privacy and efficiency
- Converts API response to subtitle entries with proper timestamps
- Leverages existing subtitle manager for track management
- Comprehensive error handling for API failures and extraction issues
- Visual progress indicators for each stage of the process

## QURAN SUBTITLE TECHNICAL IMPLEMENTATION

### Component Structure
- `s/components/omni-quran-subtitles/component.ts`: Main component logic
- `s/components/omni-quran-subtitles/styles.ts`: Component styling
- `s/components/omni-quran-subtitles/panel.ts`: Layout integration

### Key Features
- **Audio Extraction**: Utilizes FFmpeg WASM to extract audio from video clips
- **Timestamp Parsing**: Handles SRT format timestamps (00:01:23,456) and numerical seconds
- **Subtitle Positioning**: 9-point positioning system (top/middle/bottom + left/center/right)
- **Text Customization**: Font size, word wrap width, and position controls
- **Multi-track Support**: Manages text effects across multiple timeline tracks
- **Visual Feedback**: Progress indicators and detailed status messages
- **Error Handling**: Comprehensive error detection and user-friendly messages

### State Management
- Uses component-level state for UI controls and processing status
- Tracks where subtitles are created for later editing
- Maintains list of all tracks containing text effects
- Uses context actions for making changes to text effects

### Track Management
- Subtitles are placed on a dedicated track, typically above the selected media track
- Text effects store their track number for later manipulation
- UI allows selecting which track to apply changes to
- Track selection can be done via UI or by selecting text on timeline

### Text Positioning and Styling
- Configurable text position using pivot points and canvas coordinates
- Font size adjustments with immediate visual feedback
- Word wrap width control for text flow management
- Applies styling changes to all text effects on a selected track
- Canvas refresh system to ensure changes are immediately visible

### Error and Edge Cases
- Handles API connectivity failures
- Manages FFmpeg initialization errors
- Validates input parameters before processing
- Handles empty or invalid API responses
- Provides fallbacks for missing environment variables

### Future Improvements
- Layer management to ensure subtitles appear above video content
- Enhanced styling options including fill, stroke, and drop shadow properties
- Dynamic attribute editing with dropdown menus
- Proper RTL text alignment with center positioning
- Fixing track numbering system mismatches

## KNOWN LIMITATIONS

### Technical Constraints
- Browser memory limits for large projects
- WebCodecs API limitations
- Export quality vs. file size tradeoffs
- Limited codec support in browsers

### UI/UX Considerations
- Complex timeline operations need better visual feedback
- Mobile support is limited
- Large projects can cause performance issues

## CONTRIBUTION GUIDELINES

### Process
- Discord server for communication
- Issue selection for contributors
- Pull request workflow

### Development Setup
1. Clone repository
2. `npm install`
3. `npm run build`
4. `npm start`

## TROUBLESHOOTING

### Common Issues
- WebCodecs not supported in browser
- Memory limitations with large media
- Export failures with complex projects
- Collaboration connection issues

### Diagnostic Tools
- Browser console logging
- State inspection via browser devtools
- Performance monitoring tools 


## Features to implement

### Quran subtitles
- ✅ Improve the styling of the attribute editing into a dynamic dropdown to make the UI less clustered for the user
- ✅ Add the ability to change all font, multiline, fill, stroke and drop shadow properties, mimiicing the functionality of omni text, except we apply the settings to all text. THis is on top of the positioning functionality
- ✅ Text defaults to RTL despite a text align default to center. Center should be the correct behaivour
- Fix canvas rendering issues for font colour, wrap width etc
- ✅ Add line height to the position and size section
- ✅ Debug track numbering system, there seems to be a mismatch between the actual track number and the internal track number

## TRACK NUMBERING SYSTEM

### Track Indexing
- Tracks are 0-indexed in the internal state
- Track 0 appears at the TOP of the timeline visually
- Higher track numbers appear LOWER in the timeline visually
- For layering/rendering purposes, the zIndex is calculated as: `zIndex = tracks.length - effect.track`
- This means track 0 has the LOWEST rendering priority (appears at the bottom of the visual stack)

### Implementation Details
- Track indices are used consistently across the codebase but inverted for visual rendering
- The SubtitleManager has a helper method `getVisualTrackPosition` to convert between internal track index and visual position
- Components display both the track index and visual position to avoid confusion
- Documentation has been added to key methods that handle track indices
- Error handling has been improved to avoid invalid track numbers

### Usage Notes
- When selecting a track, the UI shows both track index and position from top
- When adding new elements, consider whether you want them on top (lower track index) or bottom (higher track index)
- The SubtitleManager places subtitles on the track above the selected media (preferredTrack + 1)
- UI components correctly handle the track to zIndex transformation for proper layering 