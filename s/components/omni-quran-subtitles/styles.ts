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
  .instructions {
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
` 