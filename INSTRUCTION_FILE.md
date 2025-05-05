# OMNICLIP CODEBASE INSTRUCTION FILE

## PROJECT OVERVIEW
- **Name**: Omniclip
- **Purpose**: Open-source browser-based video editor
- **Core Philosophy**: Client-side video editing with no server dependencies
- **Features**: Timeline editing, media management, transitions, effects, filters, animations, real-time collaboration
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