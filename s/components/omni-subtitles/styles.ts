import { css } from "@benev/slate"

export const styles = css`
  :host {
    display: block;
    height: 100%;
    overflow-y: auto;
  }
  
  .subtitles-panel {
    padding: 1rem;
    font-family: 'Nippo-Regular', sans-serif;
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
  
  .import-section, .demo-section {
    background: #252525;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  input[type="file"] {
    display: none;
  }
  
  .file-upload-button, .demo-button {
    display: inline-block;
    background: #3a86ff; // TODO: Use theme colors
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    border: none;
    transition: background-color 0.2s;
    margin-top: 0.5rem;
  }
  
  .file-upload-button:hover, .demo-button:hover {
    background: #2a75e6;
  }
  
  .file-upload-button:active, .demo-button:active {
    background: #1c5dbd;
  }
` 