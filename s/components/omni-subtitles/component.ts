import {html} from "@benev/slate"

import {styles} from "./styles.js"
import {shadow_component} from "../../context/context.js"
import {StateHandler} from "../../views/state-handler/view.js"

export const OmniSubtitles = shadow_component(use => {
  use.styles(styles)
  use.watch(() => use.context.state)
  
  const subtitleManager = use.context.controllers.compositor.managers.subtitleManager
  
  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return
    
    const file = input.files[0]
    
    try {
      if (file.name.endsWith('.srt')) {
        const text = await file.text()
        const subtitles = subtitleManager.parseSRT(text)
        subtitleManager.addSubtitles(subtitles, use.context.state)
      } 
    } catch (err) {
      console.error("Error importing subtitles:", err)
    }
  }
  
  return html`
    <div class="subtitles-panel">
      <h2>Subtitles</h2>
      
      <div class="import-section">
        <h3>Import Subtitles</h3>
        <input 
          type="file" 
          accept=".srt" 
          @change=${handleFileUpload}
          id="subtitle-file"
        />
        <label for="subtitle-file" class="file-upload-button">
          Choose SRT File
        </label>
      </div>
      
      <div class="demo-section">
        <h3>Demo Subtitles</h3>
        <button class="demo-button" @click=${() => {
          const demoSubtitles = [
            { text: "This is a demo subtitle", startTime: 1000, endTime: 4000 },
            { text: "Multiple lines can be displayed\nwith proper formatting", startTime: 4500, endTime: 7500 },
            { text: "Subtitles can be styled and positioned", startTime: 8000, endTime: 12000 }
          ]
          
          subtitleManager.addSubtitles(demoSubtitles, use.context.state)
        }}>
          Add Demo Subtitles
        </button>
      </div>
    </div>
  `
}) 