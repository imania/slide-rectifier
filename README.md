# Slide Rectifier

A local browser tool for selecting a presentation slide in a screenshot with four corner points and rectifying it into a rectangular PNG.

## Run

```powershell
cd C:\Users\202100398-NB\OneDrive\Documents\Sandbox\slide-rectifier
python -m http.server 5173
```

Open `http://localhost:5173` in a browser.

## Features

- Open an image file
- Paste an image from the clipboard
- Capture the screen from the browser
- Select four corners by dragging points
- Auto-detect a likely slide area with a lightweight brightness-based heuristic
- Choose auto, 16:9, 4:3, or custom output size
- Save the perspective-corrected PNG
