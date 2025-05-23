import { generate_id } from "@benev/slate"
import { TextManager } from "./text-manager.js"
import { State, TextEffect } from "../../../types.js"
import { omnislate } from "../../../context.js"

// Subtitle entry from API or file - needs to be updated whenever text-manager is updated
export interface SubtitleEntry {
    text: string
    startTime: number
    endTime: number
    style?: {
        fontSize?: number
        fontFamily?: string
        fill?: string[]
        stroke?: string
        strokeThickness?: number
        lineHeight?: number
        wordWrapWidth?: number
    }
}

export class SubtitleManager {
    constructor(private textManager: TextManager) { }

    /**
     * Add multiple subtitles to the timeline
     * @param subtitles The subtitle entries to add
     * @param state The current application state
     * @param selectedEffectId Optional ID of the selected video/audio effect to move to a lower priority track
     */
    addSubtitles(subtitles: SubtitleEntry[], state: State, selectedEffectId?: string): TextEffect[] {
        // Find a good track for subtitles
        // IMPORTANT NOTE: Track indices are 0-based, but are rendered in reverse order
        // Track 0 appears at the TOP of the timeline visually
        // Higher track numbers appear LOWER in the visual stack
        // zIndex = tracks.length - track (inverted for visual display)
        
        let subtitleTrack: number;
        
        if (selectedEffectId) {
            // Find the selected effect
            const selectedEffect = state.effects.find(e => e.id === selectedEffectId);
            if (selectedEffect && (selectedEffect.kind === "video" || selectedEffect.kind === "audio")) {
                const originalTrack = selectedEffect.track;
                const newVideoTrack = originalTrack + 1;
                
                console.log(`[SubtitleManager] Moving selected ${selectedEffect.kind} from track ${originalTrack} to track ${newVideoTrack} to make room for subtitles`);
                
                // Ensure we have enough tracks for the video move
                if (newVideoTrack >= state.tracks.length) {
                    console.log(`[SubtitleManager] Adding track for video relocation`);
                    omnislate.context.actions.add_track();
                }
                
                // Move the selected video/audio effect to the new track
                omnislate.context.actions.set_effect_track(selectedEffect, newVideoTrack);
                
                // Place subtitles on the original track (which now has higher rendering priority)
                subtitleTrack = originalTrack;
                console.log(`[SubtitleManager] Placing subtitles on track ${subtitleTrack} (original video track)`);
            } else {
                // Fallback: use default behavior
                const usedTracks = state.effects.map(effect => effect.track);
                subtitleTrack = usedTracks.length > 0 ? Math.max(...usedTracks) + 1 : 0;
                console.log(`[SubtitleManager] Selected effect not found or not video/audio, using highest available track ${subtitleTrack}`);
            }
        } else {
            // Default behavior: use the highest track + 1
            const usedTracks = state.effects.map(effect => effect.track);
            subtitleTrack = usedTracks.length > 0 ? Math.max(...usedTracks) + 1 : 0;
            console.log(`[SubtitleManager] No selected effect provided, using highest available track ${subtitleTrack}`);
        }

        // Ensure we have enough tracks for subtitles
        if (subtitleTrack >= state.tracks.length) {
            console.log(`[SubtitleManager] Need to add tracks for subtitles (current: ${state.tracks.length}, needed: ${subtitleTrack + 1})`);
            for (let i = state.tracks.length; i <= subtitleTrack; i++) {
                omnislate.context.actions.add_track();
            }
            console.log(`[SubtitleManager] After adding tracks: ${state.tracks.length} tracks available`);
        }

        // Verify the track exists in state
        if (subtitleTrack >= state.tracks.length) {
            console.error(`[SubtitleManager] Failed to add enough tracks. Using highest available track ${state.tracks.length - 1}`);
            subtitleTrack = state.tracks.length - 1;
        }

        // Create and add subtitles
        const addedEffects: TextEffect[] = [];

        for (const subtitle of subtitles) {
            const effect = this.createSubtitleEffect(subtitle, subtitleTrack, state);
            this.textManager.add_text_effect(effect);
            addedEffects.push(effect);
        }

        console.log(`[SubtitleManager] Added ${addedEffects.length} subtitles on track ${subtitleTrack}`);
        return addedEffects;
    }

    /**
     * Get the visual position of a track on the timeline
     * @param trackIndex The internal track index
     * @param totalTracks The total number of tracks
     * @returns The visual position (0 is top, higher numbers go down)
     */
    getVisualTrackPosition(trackIndex: number, totalTracks: number): number {
        // In the UI, track 0 is at the top, higher numbers go down
        // But for zIndex/layering, track 0 appears at the bottom of the visual stack
        return totalTracks - 1 - trackIndex;
    }

    // Creates the effects for a subtitle using the text-manager
    // Random defaults for now
    private createSubtitleEffect(subtitle: SubtitleEntry, track: number, state: State): TextEffect {
        const duration = subtitle.endTime - subtitle.startTime

        const effect: TextEffect = {
            id: generate_id(),
            kind: "text",
            start_at_position: subtitle.startTime,
            duration: duration,
            start: subtitle.startTime,
            end: subtitle.endTime,
            track: track,
            text: subtitle.text,

            // Style with defaults
            fontSize: subtitle.style?.fontSize ?? 38,
            fontFamily: subtitle.style?.fontFamily ?? "Arial",
            fontStyle: "normal",
            fontVariant: "normal",
            fontWeight: "normal",
            fill: subtitle.style?.fill ?? ["#FFFFFF"],
            fillGradientStops: [],
            fillGradientType: 0,
            stroke: subtitle.style?.stroke ?? "#000000",
            strokeThickness: subtitle.style?.strokeThickness ?? 2,
            lineJoin: "miter",
            miterLimit: 10,
            textBaseline: "alphabetic",
            letterSpacing: 0,
            dropShadow: true,
            dropShadowColor: "#000000",
            dropShadowAlpha: 1,
            dropShadowAngle: 0.5,
            dropShadowBlur: 0,
            dropShadowDistance: 2,
            breakWords: false,
            wordWrap: true,
            lineHeight: subtitle.style?.lineHeight ?? 0,
            leading: 0,
            wordWrapWidth: subtitle.style?.wordWrapWidth ?? 500,
            whiteSpace: "normal",
            align: "center",

            // Position at bottom center of screen
            rect: {
                position_on_canvas: {
                    x: 960, // Center for 1920 width
                    y: 950, // Near bottom
                },
                pivot: {
                    x: 0,
                    y: 0
                },
                scaleX: 1,
                scaleY: 1,
                width: 100,
                height: 20,
                rotation: 0,
            }
        }

        return effect
    }

    // Simple SRT parser
    parseSRT(srtContent: string): SubtitleEntry[] {
        console.log("Parsing SRT content:", srtContent)
        const lines = srtContent.split('\n')
        const subtitles: SubtitleEntry[] = []
        let i = 0

        while (i < lines.length) {
            // Skip empty lines and index numbers
            while (i < lines.length && lines[i].trim() === '') i++
            if (i >= lines.length) break

            // Skip subtitle number
            i++
            if (i >= lines.length) break

            // Parse timestamp line
            const timeLine = lines[i]
            i++

            const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
            if (!timeMatch) continue

            const startTime =
                (parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])) * 1000 + parseInt(timeMatch[4])
            const endTime =
                (parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7])) * 1000 + parseInt(timeMatch[8])

            // Parse text content
            let textContent = ''
            while (i < lines.length && lines[i].trim() !== '') {
                textContent += (textContent ? '\n' : '') + lines[i]
                i++
            }

            subtitles.push({
                text: textContent,
                startTime,
                endTime
            })
        }

        return subtitles
    }
} 