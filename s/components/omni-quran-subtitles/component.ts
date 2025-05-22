import { html } from "@benev/slate"

import { styles } from "./styles.js"
import { shadow_component } from "../../context/context.js"
import { FFmpegHelper } from "../../context/controllers/video-export/helpers/FFmpegHelper/helper.js"
import { fetchFile } from "@ffmpeg/util/dist/esm/index.js"
import { AnyEffect, VideoEffect, AudioEffect, TextEffect } from "../../context/types.js"

// Debug helper function
const debug = (message: string, data?: any) => {
  console.log(`[QuranSubtitles] ${message}`, data !== undefined ? data : '');
};

export const OmniQuranSubtitles = shadow_component(use => {
  use.styles(styles)
  use.watch(() => use.context.state)

  debug("Component initialized");

  const subtitleManager = use.context.controllers.compositor.managers.subtitleManager
  const mediaController = use.context.controllers.media
  const timelineController = use.context.controllers.timeline

  const [selectedEffectId, setSelectedEffectId] = use.state("")
  const [isProcessing, setIsProcessing] = use.state(false)
  const [errorMessage, setErrorMessage] = use.state("")
  const [statusMessage, setStatusMessage] = use.state("")
  const [progressStage, setProgressStage] = use.state(0) // 0: not started, 1: extraction, 2: sending, 3: processing, 4: adding
  const [processingDetails, setProcessingDetails] = use.state("") // Additional details about current stage
  const [lastCreatedTrack, setLastCreatedTrack] = use.state(-1) // Track where the last batch of subtitles were created
  const [fontSize, setFontSize] = use.state(60)
  const [textPosition, setTextPosition] = use.state("bottom-center")
  const [wordWrapWidth, setWordWrapWidth] = use.state(1700)
  const [lineHeight, setLineHeight] = use.state(50)
  const [textTracks, setTextTracks] = use.state<number[]>([]) // All tracks with text effects
  const [activeCategory, setActiveCategory] = use.state("position")
  const [fontFamily, setFontFamily] = use.state("Uthmanic Hafs")
  const [textAlign, setTextAlign] = use.state<"left" | "center" | "right" | "justify">("center")
  const [textFill, setTextFill] = use.state("#FFFFFF")
  const [strokeEnabled, setStrokeEnabled] = use.state(true)
  const [strokeColor, setStrokeColor] = use.state("#000000")
  const [strokeThickness, setStrokeThickness] = use.state(3)
  const [dropShadowEnabled, setDropShadowEnabled] = use.state(true)
  const [dropShadowColor, setDropShadowColor] = use.state("#000000")
  const [dropShadowDistance, setDropShadowDistance] = use.state(2)
  const [dropShadowBlur, setDropShadowBlur] = use.state(0)
  const [dropShadowAlpha, setDropShadowAlpha] = use.state(0.5)

  // Find all text effects on a specific track
  const findTextEffectsOnTrack = (trackNumber: number): TextEffect[] => {
    if (trackNumber < 0) return [];
    
    const textEffects = use.context.state.effects.filter(
      effect => effect.kind === "text" && effect.track === trackNumber
    ) as TextEffect[];
    
    debug(`Found ${textEffects.length} text effects on track ${trackNumber}`);
    return textEffects;
  }

  // Find all tracks that contain text effects
  const findAllTextTracks = (): number[] => {
    const tracks = new Set<number>();
    
    use.context.state.effects.forEach(effect => {
      if (effect.kind === "text") {
        tracks.add(effect.track);
      }
    });
    
    // IMPORTANT: Track indices are 0-based
    // Track 0 is visually at the TOP of the timeline
    // Higher track numbers are displayed LOWER in the timeline
    // But for zIndex rendering, track 0 is at the BOTTOM of the visual stack
    const trackArray = Array.from(tracks).sort((a, b) => a - b);
    debug(`Found ${trackArray.length} tracks with text effects`, trackArray);
    return trackArray;
  }

  // Set the active track for editing
  const setActiveTrack = (trackNumber: number) => {
    debug(`Setting active track from ${lastCreatedTrack} to ${trackNumber}`);
    setLastCreatedTrack(trackNumber);
    
    // Calculate visual position (0 = top, higher = lower in timeline)
    const totalTracks = use.context.state.tracks.length;
    const visualPosition = trackNumber; // Since track 0 is at the top visually
    
    setStatusMessage(`Selected track ${trackNumber} (position ${visualPosition + 1} from top) for editing`);
    
    // Log the text effects on this track for verification
    const textEffects = findTextEffectsOnTrack(trackNumber);
    debug(`Found ${textEffects.length} text effects on track ${trackNumber}`, textEffects);
  }

  // Listen for selected effect changes
  use.effect(function () {
    const selectedEffect = use.context.state.selected_effect
    if (selectedEffect && (selectedEffect.kind === "video" || selectedEffect.kind === "audio")) {
      setSelectedEffectId(selectedEffect.id)
      debug("Selected effect changed", {
        id: selectedEffect.id,
        type: selectedEffect.kind
      });
    } else if (selectedEffect && selectedEffect.kind === "text") {
      // When a text effect is selected, update the lastCreatedTrack
      setLastCreatedTrack(selectedEffect.track)
      debug("Selected text effect", {
        id: selectedEffect.id,
        track: selectedEffect.track
      });
    }

    // Find all tracks that have text effects
    const tracks = findAllTextTracks();
    setTextTracks(tracks);

    return () => {
      // Cleanup if needed
    }
  }, [use.context.state.selected_effect, use.context.state.effects])

  // Extract audio from a video file
  const extractAudioFromEffect = async (effectId: string) => {
    debug("Starting audio extraction", { effectId });
    try {
      setProgressStage(1)
      setStatusMessage("Extracting audio...")
      setProcessingDetails("Initializing audio extraction")

      const effect = use.context.state.effects.find(e => e.id === effectId) as VideoEffect | AudioEffect
      if (!effect) {
        debug("Effect not found", { effectId });
        throw new Error("Selected effect not found");
      }

      debug("Effect found", {
        kind: effect.kind,
        id: effect.id,
        hasFileHash: 'file_hash' in effect
      });

      if (!('file_hash' in effect)) throw new Error("Selected effect doesn't have a file")

      setProcessingDetails("Accessing media file...")
      const file = await mediaController.get_file(effect.file_hash)
      if (!file) {
        debug("Media file not found", { fileHash: effect.file_hash });
        throw new Error("Media file not found");
      }

      debug("Media file accessed", {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Use FFmpeg to extract audio
      setProcessingDetails("Initializing FFmpeg...")
      debug("Initializing FFmpeg");
      const ffmpeg = new FFmpegHelper(use.context.actions)
      await ffmpeg.isLoading

      // Write the file to FFmpeg's virtual file system
      setProcessingDetails("Writing file to FFmpeg...")
      debug("Writing file to FFmpeg");
      const fileData = await fetchFile(file);
      debug("File fetched for FFmpeg");
      await ffmpeg.ffmpeg.writeFile("input.mp4", fileData)

      // Extract audio to MP3
      setProcessingDetails("Converting to MP3 format...")
      debug("Converting to MP3");
      await ffmpeg.ffmpeg.exec([
        "-i", "input.mp4",
        "-vn", // No video
        "-acodec", "mp3",
        "-ac", "2", // Stereo
        "-ab", "192k", // Bitrate
        "output.mp3"
      ])

      // Read the resulting MP3 file
      setProcessingDetails("Reading processed audio...")
      debug("Reading MP3 output");
      const audioData = await ffmpeg.ffmpeg.readFile("output.mp3")
      debug("Audio extraction complete");

      setStatusMessage("Audio extracted successfully!")
      setProcessingDetails("Audio extraction complete")
      return new File([audioData], "audio.mp3", { type: "audio/mp3" })
    } catch (err: unknown) {
      debug("Error in audio extraction", err);
      console.error("Error extracting audio:", err)
      if (err instanceof Error) {
        setErrorMessage(`Error extracting audio: ${err.message}`)
      } else {
        setErrorMessage("Error extracting audio: Unknown error")
      }
      throw err
    }
  }

  // Parse SRT timestamp format (00:01:23,456) to milliseconds
  const parseSrtTimestamp = (timestamp: any): number => {
    debug("Parsing timestamp", { timestamp, type: typeof timestamp });

    // Handle undefined or null
    if (timestamp === undefined || timestamp === null) {
      debug("Timestamp is undefined or null");
      return 0;
    }

    // Handle numeric values (seconds)
    if (typeof timestamp === 'number') {
      debug("Timestamp is number, converting from seconds", timestamp * 1000);
      return timestamp * 1000; // Already in seconds, convert to ms
    }

    // Ensure timestamp is a string for matching
    const timestampStr = String(timestamp);

    // Handle SRT format: 00:01:23,456
    const match = timestampStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) {
      debug("Timestamp format not recognized", { timestamp });
      return 0;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);

    const result = hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
    debug("Parsed timestamp components", { hours, minutes, seconds, milliseconds, result });
    return result;
  };

  // Process the extracted audio with the Quran API
  const processAudio = async (event: SubmitEvent) => {
    debug("Process audio triggered");
    event.preventDefault()

    if (!selectedEffectId) {
      debug("No effect selected");
      setErrorMessage("Please select a video or audio clip first")
      return
    }

    // Get form values
    const form = event.target as HTMLFormElement
    const surahNumber = form.surah.value
    const startAyah = form.start_ayah.value
    const endAyah = form.end_ayah.value

    debug("Form values", { surahNumber, startAyah, endAyah });

    if (!surahNumber) {
      debug("No surah number provided");
      setErrorMessage("Please enter a surah number")
      return
    }

    try {
      setIsProcessing(true)
      setErrorMessage("")
      setStatusMessage("Starting audio extraction...")
      setProgressStage(1) // Extraction stage
      setProcessingDetails("Preparing to extract audio...")

      // Extract audio from the selected effect
      debug("Calling extractAudioFromEffect");
      const audioFile = await extractAudioFromEffect(selectedEffectId)
      debug("Audio file created", { name: audioFile.name, size: audioFile.size, type: audioFile.type });

      // Update status
      setProgressStage(2) // Sending stage
      setStatusMessage("Sending audio to Quran API...")
      setProcessingDetails("Preparing data for API submission...")

      // Create form data to send to the API
      const formData = new FormData()
      formData.append("audio", audioFile)
      formData.append("start_surah", surahNumber)
      formData.append("end_surah", surahNumber)
      if (startAyah) formData.append("start_ayah", startAyah)
      if (endAyah) formData.append("end_ayah", endAyah)

      debug("FormData created with fields", {
        audio: audioFile.name,
        start_surah: surahNumber,
        end_surah: surahNumber,
        start_ayah: startAyah || 'not provided',
        end_ayah: endAyah || 'not provided'
      });

      // Get the backend URL with fallback
      const backendUrl = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_BACKEND_URL)
        ? import.meta.env.VITE_BACKEND_URL
        : "http://localhost:5000"

      debug("Using backend URL", backendUrl);

      // Send to the API
      setProcessingDetails(`Connecting to ${backendUrl}...`)
      debug("Sending request to API");
      const response = await fetch(`${backendUrl}/process`, {
        method: "POST",
        body: formData,
      })

      debug("API response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.json()
        debug("API error response", errorData);
        throw new Error(errorData.error || "API request failed")
      }

      // Update status
      setProgressStage(3) // Processing stage
      setStatusMessage("Processing API response...")
      setProcessingDetails("Parsing matched ayahs...")

      // Parse the response
      const data = await response.json()
      debug("API response parsed", {
        matchCount: data.count,
        hasMatches: !!data.matches,
        matchesLength: data.matches?.length,
        matches: data.matches
      });

      setProcessingDetails(`Successfully matched ${data.count} ayahs!`)

      // Update status
      setProgressStage(4) // Adding stage
      setStatusMessage("Creating subtitles...")
      setProcessingDetails("Preparing subtitle entries...")

      // Convert the API response to subtitle entries
      debug("Converting matches to subtitle entries");
      const subtitleEntries = data.matches.map((match: any, index: number) => {
        const startTime = parseSrtTimestamp(match.start);
        const endTime = parseSrtTimestamp(match.end);
        
        debug(`Subtitle ${index + 1}`, {
          ayahText: match.original_text,
          rawStartTime: match.start,
          rawEndTime: match.end,
          parsedStartTime: startTime,
          parsedEndTime: endTime
        });
        
        return {
          text: match.original_text,
          startTime: startTime,
          endTime: endTime,
          style: {
            fontSize: fontSize,
            fontFamily: "Uthmanic Hafs",
            fill: ["#FFFFFF"],
            stroke: "#000000",
            strokeThickness: 3,
            lineHeight: lineHeight,
            wordWrapWidth: wordWrapWidth,
          },
          // Position at bottom center
          align: "center",
          wordWrap: true,
          // Canvas positioning
          rect: getPositionRect(textPosition)
        };
      });

      debug("Subtitle entries created", { count: subtitleEntries.length });

      setProcessingDetails("Adding subtitles to timeline...")
      
      // Get the track of the selected effect
      const selectedEffect = use.context.state.effects.find(e => e.id === selectedEffectId) as VideoEffect | AudioEffect;
      const selectedTrack = selectedEffect ? selectedEffect.track : 0;
      debug("Selected effect track", { track: selectedTrack });
      
      // Add the subtitles to the timeline, passing the selected track so subtitles can be placed on track+1
      debug("Calling subtitleManager.addSubtitles with selectedTrack to ensure subtitles appear above video");
      const addedEffects = subtitleManager.addSubtitles(subtitleEntries, use.context.state, selectedTrack);
      debug("Subtitles added to timeline", {
        count: addedEffects.length,
        trackUsed: addedEffects.length > 0 ? addedEffects[0].track : 'none'
      });
      
      if (addedEffects.length > 0) {
        setLastCreatedTrack(addedEffects[0].track); // Store the track number where subtitles were created
      }

      // Update text tracks list
      const tracks = findAllTextTracks();
      setTextTracks(tracks);

      // Final status update
      setProgressStage(0) // Reset
      setStatusMessage(`Success! Added ${subtitleEntries.length} ayahs as subtitles`)
      setProcessingDetails("Process completed successfully")
      debug("Process completed successfully");
    } catch (err: unknown) {
      debug("Error in processing audio", err);
      console.error("Error processing audio:", err)
      setProgressStage(0) // Reset
      if (err instanceof Error) {
        setErrorMessage(`Error: ${err.message}`)
      } else {
        setErrorMessage("Error: Unknown error occurred")
      }
    } finally {
      setIsProcessing(false)
      debug("Processing completed or failed");
    }
  }

  // Get position rect based on selected position
  const getPositionRect = (position: string) => {
    type PositionConfig = {
      x: number;
      y: number; 
      pivotX: number;
      pivotY: number;
    };
    
    const positionConfigs: Record<string, PositionConfig> = {
      "top-left": {
        x: 100,
        y: 100,
        pivotX: 0,
        pivotY: 0
      },
      "top-center": {
        x: 960,
        y: 100,
        pivotX: 0.5, // Center horizontally
        pivotY: 0
      },
      "top-right": {
        x: 1820,
        y: 100,
        pivotX: 1,
        pivotY: 0
      },
      "middle-left": {
        x: 100,
        y: 540,
        pivotX: 0,
        pivotY: 0.5
      },
      "middle-center": {
        x: 960,
        y: 540,
        pivotX: 0.5, // Center horizontally
        pivotY: 0.5
      },
      "middle-right": {
        x: 1820,
        y: 540,
        pivotX: 1,
        pivotY: 0.5
      },
      "bottom-left": {
        x: 100,
        y: 920,
        pivotX: 0,
        pivotY: 1
      },
      "bottom-center": {
        x: 960,
        y: 920,
        pivotX: 0.5, // Center horizontally
        pivotY: 1
      },
      "bottom-right": {
        x: 1820,
        y: 920,
        pivotX: 1,
        pivotY: 1
      }
    };

    const config = positionConfigs[position] || positionConfigs["bottom-center"];

    return {
      position_on_canvas: {
        x: config.x,
        y: config.y,
      },
      pivot: {
        x: config.pivotX,
        y: config.pivotY
      },
      scaleX: 1,
      scaleY: 1,
      width: 1800,
      height: 200,
      rotation: 0,
    };
  }

  // Force a visual refresh of the changes
  const refreshCanvas = () => {
    debug("Forcing canvas refresh to show updates");
    try {
      // Get all current effects visible at the current timecode
      const allEffects = use.context.state.effects;
      const currentTimecode = use.context.state.timecode;
      
      // Update text renderer for text objects on the track
      if (lastCreatedTrack >= 0) {
        const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
        textEffects.forEach(effect => {
          const textObject = use.context.controllers.compositor.managers.textManager.get(effect.id);
          if (textObject && textObject.sprite) {
            debug(`Explicitly updating text sprite for effect ${effect.id}`);
            // First update the sprite style properties
            textObject.sprite.style.fontSize = effect.fontSize;
            textObject.sprite.style.wordWrapWidth = effect.wordWrapWidth;
            
            // Then force the text to re-render with updateText()
            try {
              //@ts-ignore - updateText() exists but might not be in typings
              textObject.sprite.updateText();
              debug(`Successfully called updateText() on text sprite for effect ${effect.id}`);
            } catch (err) {
              debug(`Error calling updateText() on sprite`, err);
            }
          } else {
            debug(`No text object found for effect ${effect.id}`);
          }
        });
      }
      
      // Use the compositor to refresh the canvas with the updated effects
      use.context.controllers.compositor.compose_effects(allEffects, currentTimecode);
      debug("Canvas refresh completed");
    } catch (err) {
      debug("Error refreshing canvas", err);
      console.error("Error refreshing canvas:", err);
    }
  }

  // Update font size for all text effects on a track
  const updateFontSize = (newSize: number) => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      debug("No active track selected for font size update");
      return;
    }

    debug(`Starting font size update to ${newSize} for track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    debug(`Found ${textEffects.length} text effects to update font size`, textEffects);
    
    if (textEffects.length === 0) {
      debug("No text effects found on track, cannot update font size");
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach((effect, index) => {
      debug(`Updating font size for effect ${index + 1}/${textEffects.length}`, {
        id: effect.id,
        oldFontSize: effect.fontSize,
        newFontSize: newSize
      });
      
      try {
        // Use the proper action to update the effect
        use.context.actions.set_font_size(effect, newSize);
        debug(`Font size update action called successfully for effect ${effect.id}`);
        
        // Verify the update succeeded
        const updatedEffect = use.context.state.effects.find(e => e.id === effect.id) as TextEffect;
        debug(`After update: effect font size is now ${updatedEffect.fontSize}`);
      } catch (err) {
        debug(`Error updating font size for effect ${effect.id}`, err);
        console.error(`Error updating font size:`, err);
      }
    });

    debug(`Font size update complete for ${textEffects.length} effects`);
    setStatusMessage(`Updated font size to ${newSize} for ${textEffects.length} subtitles`);
    
    // Force a refresh to show the changes visually
    refreshCanvas();
  }

  // Update text position for all text effects on a track
  const updateTextPosition = (position: string) => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      debug("No active track selected for position update");
      return;
    }

    debug(`Starting position update to ${position} for track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    debug(`Found ${textEffects.length} text effects to update position`, textEffects);
    
    if (textEffects.length === 0) {
      debug("No text effects found on track, cannot update position");
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    const positionRect = getPositionRect(position);
    debug("Created position rect:", positionRect);
    
    textEffects.forEach((effect, index) => {
      debug(`Updating position for effect ${index + 1}/${textEffects.length}`, {
        id: effect.id,
        oldPosition: `x:${effect.rect.position_on_canvas.x}, y:${effect.rect.position_on_canvas.y}`,
        newPosition: `x:${positionRect.position_on_canvas.x}, y:${positionRect.position_on_canvas.y}`
      });
      
      try {
        // Use the proper action to update the effect
        use.context.actions.set_text_rect(effect, positionRect);
        debug(`Position update action called successfully for effect ${effect.id}`);
        
        // Verify the update succeeded
        const updatedEffect = use.context.state.effects.find(e => e.id === effect.id) as TextEffect;
        debug(`After update: effect position is now x:${updatedEffect.rect.position_on_canvas.x}, y:${updatedEffect.rect.position_on_canvas.y}`);
      } catch (err) {
        debug(`Error updating position for effect ${effect.id}`, err);
        console.error(`Error updating position:`, err);
      }
    });

    debug(`Position update complete for ${textEffects.length} effects`);
    setStatusMessage(`Updated position to ${position} for ${textEffects.length} subtitles`);
    
    // Force a refresh to show the changes visually
    refreshCanvas();
  }

  // Update word wrap width for all text effects on a track
  const updateWordWrapWidth = (width: number) => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      debug("No active track selected for wrap width update");
      return;
    }

    debug(`Starting wrap width update to ${width} for track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    debug(`Found ${textEffects.length} text effects to update wrap width`, textEffects);
    
    if (textEffects.length === 0) {
      debug("No text effects found on track, cannot update wrap width");
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach((effect, index) => {
      debug(`Updating wrap width for effect ${index + 1}/${textEffects.length}`, {
        id: effect.id,
        oldWrapWidth: effect.wordWrapWidth,
        newWrapWidth: width
      });
      
      try {
        // Use the proper action to update the effect
        use.context.actions.set_wrap_width(effect, width);
        debug(`Wrap width update action called successfully for effect ${effect.id}`);
        
        // Verify the update succeeded
        const updatedEffect = use.context.state.effects.find(e => e.id === effect.id) as TextEffect;
        debug(`After update: effect wrap width is now ${updatedEffect.wordWrapWidth}`);
      } catch (err) {
        debug(`Error updating wrap width for effect ${effect.id}`, err);
        console.error(`Error updating wrap width:`, err);
      }
    });

    debug(`Wrap width update complete for ${textEffects.length} effects`);
    setStatusMessage(`Updated word wrap width to ${width} for ${textEffects.length} subtitles`);
    
    // Force a refresh to show the changes visually
    refreshCanvas();
  }

  // Update line height for all text effects on a track
  const updateLineHeight = (height: number) => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      return;
    }

    debug(`Updating line height to ${height} for track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    
    if (textEffects.length === 0) {
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach(effect => {
      try {
        use.context.actions.set_line_height(effect, height);
      } catch (err) {
        debug(`Error updating line height for effect ${effect.id}`, err);
      }
    });

    setStatusMessage(`Updated line height to ${height} for ${textEffects.length} subtitles`);
    refreshCanvas();
  }

  // Apply all current settings to existing subtitles
  const applyAllSettings = () => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      debug("No active track selected for applying all settings");
      return;
    }

    debug(`Starting to apply all settings to track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    debug(`Found ${textEffects.length} text effects to update all settings`, textEffects);
    
    if (textEffects.length === 0) {
      debug("No text effects found on track, cannot apply settings");
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    const positionRect = getPositionRect(textPosition);
    debug("Created position rect:", positionRect);
    
    textEffects.forEach((effect, index) => {
      debug(`Applying all settings for effect ${index + 1}/${textEffects.length}`, {
        id: effect.id
      });
      
      try {
        // Apply position settings
        use.context.actions.set_text_rect(effect, positionRect);
        
        // Apply font settings
        use.context.actions.set_font_size(effect, fontSize);
        use.context.actions.set_text_font(effect, fontFamily);
        use.context.actions.set_font_align(effect, textAlign as "center" | "left" | "right" | "justify");
        use.context.actions.set_wrap_width(effect, wordWrapWidth);
        use.context.actions.set_line_height(effect, lineHeight);
        
        // Apply fill settings
        use.context.actions.set_text_fill(effect, textFill, 0);
        
        // Apply stroke settings
        if (strokeEnabled) {
          use.context.actions.set_stroke_color(effect, strokeColor);
          use.context.actions.set_stroke_thickness(effect, strokeThickness);
        } else {
          use.context.actions.set_stroke_thickness(effect, 0);
        }
        
        // Apply shadow settings
        use.context.actions.toggle_drop_shadow(effect, dropShadowEnabled);
        if (dropShadowEnabled) {
          use.context.actions.set_drop_shadow_color(effect, dropShadowColor);
          use.context.actions.set_drop_shadow_distance(effect, dropShadowDistance);
          use.context.actions.set_drop_shadow_blur(effect, dropShadowBlur);
          use.context.actions.set_drop_shadow_alpha(effect, dropShadowAlpha);
        }
        
        debug(`All updates applied successfully for effect ${effect.id}`);
      } catch (err) {
        debug(`Error applying settings for effect ${effect.id}`, err);
        console.error(`Error applying settings:`, err);
      }
    });

    debug(`All settings update complete for ${textEffects.length} effects`);
    setStatusMessage(`Updated all settings for ${textEffects.length} subtitles`);
    
    // Force a refresh to show the changes visually
    refreshCanvas();
  }

  // Apply font settings to all text effects on a track
  const applyFontSettings = () => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      return;
    }

    debug(`Applying font settings to track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    
    if (textEffects.length === 0) {
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach(effect => {
      try {
        use.context.actions.set_font_size(effect, fontSize);
        use.context.actions.set_text_font(effect, fontFamily);
        use.context.actions.set_font_align(effect, textAlign as "center" | "left" | "right" | "justify");
      } catch (err) {
        debug(`Error applying font settings for effect ${effect.id}`, err);
      }
    });

    setStatusMessage(`Updated font settings for ${textEffects.length} subtitles`);
    refreshCanvas();
  }

  // Apply fill settings to all text effects on a track
  const applyFillSettings = () => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      return;
    }

    debug(`Applying fill settings to track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    
    if (textEffects.length === 0) {
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach(effect => {
      try {
        use.context.actions.set_text_fill(effect, textFill, 0);
      } catch (err) {
        debug(`Error applying fill settings for effect ${effect.id}`, err);
      }
    });

    setStatusMessage(`Updated fill color for ${textEffects.length} subtitles`);
    refreshCanvas();
  }

  // Apply stroke settings to all text effects on a track
  const applyStrokeSettings = () => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      return;
    }

    debug(`Applying stroke settings to track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    
    if (textEffects.length === 0) {
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach(effect => {
      try {
        if (strokeEnabled) {
          use.context.actions.set_stroke_color(effect, strokeColor);
          use.context.actions.set_stroke_thickness(effect, strokeThickness);
        } else {
          use.context.actions.set_stroke_thickness(effect, 0);
        }
      } catch (err) {
        debug(`Error applying stroke settings for effect ${effect.id}`, err);
      }
    });

    setStatusMessage(`Updated stroke settings for ${textEffects.length} subtitles`);
    refreshCanvas();
  }

  // Apply drop shadow settings to all text effects on a track
  const applyShadowSettings = () => {
    if (lastCreatedTrack < 0) {
      setErrorMessage("No subtitles have been created yet");
      return;
    }

    debug(`Applying shadow settings to track ${lastCreatedTrack}`);
    const textEffects = findTextEffectsOnTrack(lastCreatedTrack);
    
    if (textEffects.length === 0) {
      setErrorMessage(`No text effects found on track ${lastCreatedTrack}`);
      return;
    }
    
    textEffects.forEach(effect => {
      try {
        use.context.actions.toggle_drop_shadow(effect, dropShadowEnabled);
        if (dropShadowEnabled) {
          use.context.actions.set_drop_shadow_color(effect, dropShadowColor);
          use.context.actions.set_drop_shadow_distance(effect, dropShadowDistance);
          use.context.actions.set_drop_shadow_blur(effect, dropShadowBlur);
          use.context.actions.set_drop_shadow_alpha(effect, dropShadowAlpha);
        }
      } catch (err) {
        debug(`Error applying shadow settings for effect ${effect.id}`, err);
      }
    });

    setStatusMessage(`Updated shadow settings for ${textEffects.length} subtitles`);
    refreshCanvas();
  }

  // Render progress indicator
  const renderProgressIndicator = () => {
    if (!isProcessing || progressStage === 0) return null

    const stages = [
      { label: "Extract", active: progressStage >= 1 },
      { label: "Send", active: progressStage >= 2 },
      { label: "Process", active: progressStage >= 3 },
      { label: "Add", active: progressStage >= 4 }
    ]

    return html`
      <div class="progress-indicator">
        ${stages.map(stage => html`
          <div class="progress-stage ${stage.active ? 'active' : ''}">
            <div class="progress-dot"></div>
            <div class="progress-label">${stage.label}</div>
          </div>
        `)}
      </div>
    `
  }

  return html`
    <div class="quran-subtitles-panel">
      <h2>Quran Subtitles</h2>
      
      <div class="current-selection">
        <h3>Current Selection</h3>
        <p>
          ${selectedEffectId
      ? html`Selected media: ${use.context.state.effects.find(e => e.id === selectedEffectId)?.kind || "None"}`
      : "No media selected. Select a video or audio clip on the timeline."}
        </p>
      </div>
      
      <div class="quran-form-section">
        <h3>Quran Matching Settings</h3>
        <form @submit=${processAudio}>
          <div class="form-group">
            <label for="surah">Surah Number (1-114)*</label>
            <input 
              type="number" 
              id="surah" 
              name="surah" 
              min="1" 
              max="114" 
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="start_ayah">Start Ayah (Optional)</label>
            <input 
              type="number" 
              id="start_ayah" 
              name="start_ayah" 
              min="1" 
            />
          </div>
          
          <div class="form-group">
            <label for="end_ayah">End Ayah (Optional)</label>
            <input 
              type="number" 
              id="end_ayah" 
              name="end_ayah" 
              min="1" 
            />
          </div>
          
          <button 
            type="submit" 
            class="process-button" 
            ?disabled=${isProcessing || !selectedEffectId}
          >
            ${isProcessing ? "Processing..." : "Generate Subtitles"}
          </button>
        </form>
      </div>
      
      <div class="subtitle-settings-section">
        <h3>Text Appearance Settings</h3>
        
        ${textTracks.length > 0 ? html`
          <div class="track-selector">
            <label for="text-track">Select Text Track to Edit</label>
            <div class="track-buttons">
              ${textTracks.map(track => html`
                <button 
                  class="track-button ${lastCreatedTrack === track ? 'active' : ''}" 
                  @click=${() => setActiveTrack(track)}
                >
                  Track ${track}
                </button>
              `)}
            </div>
            <p class="track-help">You can also select a text on the timeline to edit that track</p>
          </div>
        ` : null}
        
        <div class="dropdown-settings">
          <div class="dropdown-group">
            <label for="settings-category">Edit Settings:</label>
            <select id="settings-category" @change=${(e: Event) => setActiveCategory((e.target as HTMLSelectElement).value)}>
              <option value="position">Position & Size</option>
              <option value="font">Font Settings</option>
              <option value="fill">Text Fill & Color</option>
              <option value="stroke">Stroke Settings</option>
              <option value="shadow">Drop Shadow</option>
            </select>
          </div>
          
          ${activeCategory === 'position' ? html`
            <div class="settings-panel position-panel">
              <div class="setting-group">
            <label for="text-position">Text Position</label>
              <select 
                id="text-position" 
                .value=${textPosition} 
                @change=${(e: Event) => setTextPosition((e.target as HTMLSelectElement).value)}
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="middle-left">Middle Left</option>
                <option value="middle-center">Middle Center</option>
                <option value="middle-right">Middle Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
          </div>
          
              <div class="setting-group">
            <label for="wrap-width">Wrap Width</label>
                <div class="range-with-value">
              <input 
                    type="range" 
                id="wrap-width" 
                .value=${wordWrapWidth} 
                @input=${(e: Event) => setWordWrapWidth(parseInt((e.target as HTMLInputElement).value))}
                min="500" 
                max="1900"
                step="100"
              />
                  <span class="range-value">${wordWrapWidth}px</span>
                </div>
              </div>
              
              <div class="setting-group">
                <label for="line-height">Line Height</label>
                <div class="range-with-value">
                  <input 
                    type="range" 
                    id="line-height" 
                    .value=${lineHeight} 
                    @input=${(e: Event) => setLineHeight(parseInt((e.target as HTMLInputElement).value))}
                    min="20" 
                    max="100"
                    step="2"
                  />
                  <span class="range-value">${lineHeight}px</span>
                </div>
              </div>
              
              <button 
                class="apply-button" 
                @click=${() => {
                  updateTextPosition(textPosition);
                  updateWordWrapWidth(wordWrapWidth);
                  updateLineHeight(lineHeight);
                }}
                ?disabled=${lastCreatedTrack < 0}
              >
                Apply Position Settings
              </button>
            </div>
          ` : null}
          
          ${activeCategory === 'font' ? html`
            <div class="settings-panel font-panel">
              <div class="setting-group">
                <label for="font-size">Font Size</label>
                <div class="range-with-value">
                  <input 
                    type="range" 
                    id="font-size" 
                    .value=${fontSize} 
                    @input=${(e: Event) => setFontSize(parseInt((e.target as HTMLInputElement).value))}
                    min="20" 
                    max="120"
                    step="2"
                  />
                  <span class="range-value">${fontSize}px</span>
          </div>
        </div>
              
              <div class="setting-group">
                <label for="font-family">Font Family</label>
                <select 
                  id="font-family" 
                  .value=${fontFamily} 
                  @change=${(e: Event) => setFontFamily((e.target as HTMLSelectElement).value)}
                >
                  <option value="Uthmanic Hafs">Uthmanic Hafs</option>
                  <option value="Indo Pak">Indo Pak</option>
                  <option value="Arial">Arial</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Nippo">Nippo</option>
                </select>
              </div>
              
              <div class="setting-group">
                <label for="text-align">Text Alignment</label>
                <select 
                  id="text-align" 
                  .value=${textAlign} 
                  @change=${(e: Event) => setTextAlign((e.target as HTMLSelectElement).value as "center" | "left" | "right" | "justify")}
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
              
              <button 
                class="apply-button" 
                @click=${applyFontSettings}
                ?disabled=${lastCreatedTrack < 0}
              >
                Apply Font Settings
              </button>
            </div>
          ` : null}
          
          ${activeCategory === 'fill' ? html`
            <div class="settings-panel fill-panel">
              <div class="setting-group">
                <label for="text-fill">Text Color</label>
                <div class="color-picker">
                  <input 
                    type="color" 
                    id="text-fill" 
                    .value=${textFill} 
                    @input=${(e: Event) => setTextFill((e.target as HTMLInputElement).value)}
                  />
                  <span class="color-value">${textFill}</span>
                </div>
              </div>
              
              <button 
                class="apply-button" 
                @click=${applyFillSettings}
                ?disabled=${lastCreatedTrack < 0}
              >
                Apply Fill Settings
              </button>
            </div>
          ` : null}
          
          ${activeCategory === 'stroke' ? html`
            <div class="settings-panel stroke-panel">
              <div class="setting-group">
                <label for="stroke-enabled">Enable Stroke</label>
                <input 
                  type="checkbox" 
                  id="stroke-enabled" 
                  .checked=${strokeEnabled} 
                  @change=${(e: Event) => setStrokeEnabled((e.target as HTMLInputElement).checked)}
                />
              </div>
              
              <div class="setting-group">
                <label for="stroke-color">Stroke Color</label>
                <div class="color-picker">
                  <input 
                    type="color" 
                    id="stroke-color" 
                    .value=${strokeColor} 
                    @input=${(e: Event) => setStrokeColor((e.target as HTMLInputElement).value)}
                    ?disabled=${!strokeEnabled}
                  />
                  <span class="color-value">${strokeColor}</span>
                </div>
              </div>
              
              <div class="setting-group">
                <label for="stroke-thickness">Stroke Thickness</label>
                <div class="range-with-value">
                  <input 
                    type="range" 
                    id="stroke-thickness" 
                    .value=${strokeThickness} 
                    @input=${(e: Event) => setStrokeThickness(parseInt((e.target as HTMLInputElement).value))}
                    min="0" 
                    max="20"
                    step="1"
                    ?disabled=${!strokeEnabled}
                  />
                  <span class="range-value">${strokeThickness}px</span>
                </div>
              </div>
              
              <button 
                class="apply-button" 
                @click=${applyStrokeSettings}
                ?disabled=${lastCreatedTrack < 0}
              >
                Apply Stroke Settings
              </button>
            </div>
          ` : null}
          
          ${activeCategory === 'shadow' ? html`
            <div class="settings-panel shadow-panel">
              <div class="setting-group">
                <label for="shadow-enabled">Enable Drop Shadow</label>
                <input 
                  type="checkbox" 
                  id="shadow-enabled" 
                  .checked=${dropShadowEnabled} 
                  @change=${(e: Event) => setDropShadowEnabled((e.target as HTMLInputElement).checked)}
                />
              </div>
              
              <div class="setting-group">
                <label for="shadow-color">Shadow Color</label>
                <div class="color-picker">
                  <input 
                    type="color" 
                    id="shadow-color" 
                    .value=${dropShadowColor} 
                    @input=${(e: Event) => setDropShadowColor((e.target as HTMLInputElement).value)}
                    ?disabled=${!dropShadowEnabled}
                  />
                  <span class="color-value">${dropShadowColor}</span>
                </div>
              </div>
              
              <div class="setting-group">
                <label for="shadow-distance">Shadow Distance</label>
                <div class="range-with-value">
                  <input 
                    type="range" 
                    id="shadow-distance" 
                    .value=${dropShadowDistance} 
                    @input=${(e: Event) => setDropShadowDistance(parseInt((e.target as HTMLInputElement).value))}
                    min="0" 
                    max="20"
                    step="1"
                    ?disabled=${!dropShadowEnabled}
                  />
                  <span class="range-value">${dropShadowDistance}px</span>
                </div>
              </div>
              
              <div class="setting-group">
                <label for="shadow-blur">Shadow Blur</label>
                <div class="range-with-value">
                  <input 
                    type="range" 
                    id="shadow-blur" 
                    .value=${dropShadowBlur} 
                    @input=${(e: Event) => setDropShadowBlur(parseInt((e.target as HTMLInputElement).value))}
                    min="0" 
                    max="20"
                    step="1"
                    ?disabled=${!dropShadowEnabled}
                  />
                  <span class="range-value">${dropShadowBlur}px</span>
                </div>
              </div>
              
              <div class="setting-group">
                <label for="shadow-alpha">Shadow Opacity</label>
                <div class="range-with-value">
                  <input 
                    type="range" 
                    id="shadow-alpha" 
                    .value=${dropShadowAlpha * 100} 
                    @input=${(e: Event) => setDropShadowAlpha(parseInt((e.target as HTMLInputElement).value) / 100)}
                    min="0" 
                    max="100"
                    step="5"
                    ?disabled=${!dropShadowEnabled}
                  />
                  <span class="range-value">${Math.round(dropShadowAlpha * 100)}%</span>
                </div>
              </div>
              
              <button 
                class="apply-button" 
                @click=${applyShadowSettings}
                ?disabled=${lastCreatedTrack < 0}
              >
                Apply Shadow Settings
              </button>
            </div>
          ` : null}
        
        <button 
          class="apply-all-button" 
          @click=${applyAllSettings}
          ?disabled=${lastCreatedTrack < 0}
        >
          Apply All Settings
        </button>
        </div>
        
        ${lastCreatedTrack >= 0 
          ? html`<p class="track-info">These settings will apply to all subtitles on track ${lastCreatedTrack}</p>`
          : html`<p class="track-info">Generate subtitles first to edit their appearance</p>`
        }
      </div>
      
      ${isProcessing ? renderProgressIndicator() : null}
      
      ${errorMessage ? html`<div class="error-message">${errorMessage}</div>` : ``}
      ${statusMessage ? html`
        <div class="status-message">
          <div class="status-title">${statusMessage}</div>
          ${processingDetails ? html`<div class="status-details">${processingDetails}</div>` : null}
        </div>
      ` : ``}
      
      <div class="instructions">
        <h3>Instructions</h3>
        <ol>
          <li>Select a video or audio clip on the timeline</li>
          <li>Enter the Surah number (required)</li>
          <li>Optionally specify start and end Ayah numbers</li>
          <li>Click "Generate Subtitles" to process</li>
          <li>Use the Text Appearance Settings to modify all subtitles at once</li>
          <li>Click on a text in the timeline or use the track buttons to select which track to edit</li>
        </ol>
        <p class="note">Note: This feature requires an external API running at localhost:5000</p>
      </div>
    </div>
  `
}) 