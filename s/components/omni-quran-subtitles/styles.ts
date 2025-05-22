import { css } from "@benev/slate"

export const styles = css`
  :host {
    display: block;
    height: 100%;
    overflow-y: auto;
  }
  
  .quran-subtitles-panel {
    padding: 1rem;
    font-family: 'Nippo-Regular', sans-serif;
    color: #fff;
  }
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #fff;
  }
  
  h3 {
    font-size: 1.2rem;
    margin: 0.5rem 0;
    color: #ccc;
  }
  
  .current-selection,
  .quran-form-section,
  .instructions,
  .subtitle-settings-section {
    background: #252525;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  
  input[type="number"] {
    width: 100%;
    padding: 0.5rem;
    border-radius: 4px;
    background: #333;
    border: 1px solid #444;
    color: white;
    font-size: 0.9rem;
  }
  
  select {
    width: 100%;
    padding: 0.5rem;
    border-radius: 4px;
    background: #333;
    border: 1px solid #444;
    color: white;
    font-size: 0.9rem;
  }
  
  .process-button {
    display: block;
    background: #3a86ff;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    border: none;
    transition: background-color 0.2s;
    margin-top: 1rem;
    width: 100%;
  }
  
  .process-button:hover {
    background: #2a75e6;
  }
  
  .process-button:active {
    background: #1c5dbd;
  }
  
  .process-button:disabled {
    background: #555;
    cursor: not-allowed;
  }
  
  .error-message {
    background: rgba(255, 0, 0, 0.2);
    color: #ff7777;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border-left: 3px solid #ff4444;
  }
  
  .status-message {
    background: rgba(0, 128, 0, 0.2);
    color: #77ff77;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    border-left: 3px solid #44ff44;
  }
  
  .status-title {
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  
  .status-details {
    font-size: 0.9rem;
    opacity: 0.9;
  }
  
  /* Progress indicator styles */
  .progress-indicator {
    display: flex;
    justify-content: space-between;
    margin: 1rem 0;
    position: relative;
    padding: 0 1rem;
  }
  
  .progress-indicator::before {
    content: '';
    position: absolute;
    top: 9px;
    left: 25px;
    right: 25px;
    height: 2px;
    background: #444;
    z-index: 1;
  }
  
  .progress-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 2;
    flex: 1;
  }
  
  .progress-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #333;
    border: 2px solid #555;
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
  }
  
  .progress-stage.active .progress-dot {
    background: #3a86ff;
    border-color: #2a75e6;
    box-shadow: 0 0 10px rgba(58, 134, 255, 0.5);
  }
  
  .progress-label {
    font-size: 0.8rem;
    color: #999;
    transition: color 0.3s ease;
  }
  
  .progress-stage.active .progress-label {
    color: #fff;
    font-weight: bold;
  }
  
  ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
  
  .note {
    font-size: 0.8rem;
    font-style: italic;
    color: #999;
    margin-top: 1rem;
  }
  
  /* Text Appearance Settings styles */
  .subtitle-settings-section {
    background: #252525;
  }
  
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  @media (min-width: 768px) {
    .settings-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  /* Dropdown settings styles */
  .dropdown-settings {
    background: #1e1e1e;
    border-radius: 6px;
    padding: 1rem;
    margin-top: 1rem;
  }
  
  .dropdown-group {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .dropdown-group label {
    flex: 0 0 auto;
    margin-bottom: 0;
    font-weight: bold;
  }
  
  .dropdown-group select {
    flex: 1;
  }
  
  .settings-panel {
    background: #2a2a2a;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .setting-group {
    margin-bottom: 1rem;
  }
  
  .range-with-value {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .range-with-value input[type="range"] {
    flex: 1;
    -webkit-appearance: none;
    height: 6px;
    background: #444;
    border-radius: 3px;
  }
  
  .range-with-value input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3a86ff;
    cursor: pointer;
  }
  
  .range-value {
    flex: 0 0 60px;
    text-align: right;
    font-size: 0.9rem;
    color: #ccc;
  }
  
  .color-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .color-picker input[type="color"] {
    -webkit-appearance: none;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
  }
  
  .color-picker input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  
  .color-picker input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }
  
  .color-value {
    font-family: monospace;
    font-size: 0.9rem;
    color: #ccc;
  }
  
  .apply-button {
    display: block;
    width: 100%;
    background: #555;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    border: none;
    transition: background-color 0.2s;
  }
  
  .apply-button:hover {
    background: #666;
  }
  
  .apply-button:active {
    background: #777;
  }
  
  .apply-button:disabled {
    background: #444;
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .input-with-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .input-with-buttons input,
  .input-with-buttons select {
    flex: 1;
  }
  
  .small-button {
    background: #555;
    color: white;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    border: none;
    transition: background-color 0.2s;
  }
  
  .small-button:hover {
    background: #666;
  }
  
  .small-button:active {
    background: #777;
  }
  
  .small-button:disabled {
    background: #444;
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .apply-all-button {
    display: block;
    width: 100%;
    background: #3a86ff;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    border: none;
    transition: background-color 0.2s;
    margin-top: 1.5rem;
  }
  
  .apply-all-button:hover {
    background: #2a75e6;
  }
  
  .apply-all-button:active {
    background: #1c5dbd;
  }
  
  .apply-all-button:disabled {
    background: #555;
    cursor: not-allowed;
  }
  
  .track-info {
    font-size: 0.85rem;
    color: #aaa;
    margin-top: 0.75rem;
    text-align: center;
    font-style: italic;
  }

  /* Track selector styles */
  .track-selector {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #333;
  }

  .track-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0 0.75rem;
  }

  .track-button {
    background: #333;
    color: white;
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    border: 1px solid #444;
    transition: all 0.2s;
  }

  .track-button:hover {
    background: #444;
    border-color: #555;
  }

  .track-button.active {
    background: #3a86ff;
    border-color: #2a75e6;
    font-weight: bold;
  }

  .track-help {
    font-size: 0.8rem;
    color: #888;
    margin: 0.25rem 0 0;
    font-style: italic;
  }
` 