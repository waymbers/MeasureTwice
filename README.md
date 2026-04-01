# Measure Twice

AI-powered construction field manual generator for custom woodworking and outdoor build projects.

## Overview

Measure Twice guides you through a linear, discovery-driven workflow to produce a professional-grade **Project Bible** — a complete construction manual tailored to your exact dimensions, materials, and site constraints.

## Features

### Discovery Questionnaire
A chat-style interface that collects:
- Project name
- Core dimensions (Height × Width × Depth)
- Environmental constraints (slope, trees, corners, etc.)
- Target load (occupants, hot tubs, furniture)
- Preferred material (pressure-treated pine, cedar, composite, etc.)

### Vision Analysis
Upload a reference photo to extract style preferences and set a scale reference measurement.

### Project Bible (Generated Output)
- **Shopping List** — dynamically calculated quantities with 15% overage factor
- **Cost Quote** — itemized Lumber, Hardware, and Specialty costs with live retailer links (Home Depot, Lowe's, Amazon)
- **Verbatim Build Instructions** — 24 street-smart construction steps across 4 phases
- **Foreman's Warnings** — high-visibility safety callouts every ~3rd step
- **Pro Tip Boxes** — cut angle reference chart (22.5° for octagons, etc.)
- **SVG Diagrams** — procedural assembly diagrams for Yoke, Framing, Decking, and Finishing
- **Final Inspection Sign-Off Checklist**
- **Legal Disclaimer** regarding structural engineering and building codes
- **PDF Export** — download the full Field Manual via `jsPDF` + `html2canvas`

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool |
| Tailwind CSS | 3 | Styling |
| lucide-react | latest | Icons |
| jsPDF | 4.2.1 | PDF generation |
| html2canvas | 1.4.x | Page capture for PDF |

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Build for Production

```bash
npm run build
npm run preview
```

## Legal

This application generates informational planning documents only. All structural designs must be reviewed by a licensed structural engineer and comply with local building codes. Obtain all required building permits before construction.
