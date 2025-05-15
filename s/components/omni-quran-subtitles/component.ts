import { html } from "@benev/slate"

import { styles } from "./styles.js"
import { shadow_component } from "../../context/context.js"
import { FFmpegHelper } from "../../context/controllers/video-export/helpers/FFmpegHelper/helper.js"
import { fetchFile } from "@ffmpeg/util/dist/esm/index.js"
import { AnyEffect, VideoEffect, AudioEffect } from "../../context/types.js"

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

  // Listen for selected effect changes
  use.effect(function () {
    const selectedEffect = use.context.state.selected_effect
    if (selectedEffect && (selectedEffect.kind === "video" || selectedEffect.kind === "audio")) {
      setSelectedEffectId(selectedEffect.id)
      debug("Selected effect changed", {
        id: selectedEffect.id,
        type: selectedEffect.kind
      });
    }

    return () => {
      // Cleanup if needed
    }
  }, [use.context.state.selected_effect])

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
            fontSize: 42,
            fontFamily: "Uthmanic Hafs",
            fill: ["#FFFFFF"],
            stroke: "#000000",
            strokeThickness: 3,
          },
          // Position at bottom center
          align: "center",
          wordWrap: true,
          wordWrapWidth: 1700,
          lineHeight: 60,
          // Canvas positioning
          rect: {
            position_on_canvas: {
              x: 960, // Center for 1920 width
              y: 920, // Near bottom for 1080 height
            },
            pivot: {
              x: 0.5, // Center horizontally
              y: 0
            },
            scaleX: 1,
            scaleY: 1,
            width: 1800,
            height: 200,
            rotation: 0,
          }
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
        </ol>
        <p class="note">Note: This feature requires an external API running at localhost:5000</p>
      </div>
    </div>
  `
}) 