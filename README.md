# Measure Twice — Field Intelligence System

A single-page React application that generates professional construction guides for custom woodworking and outdoor structure projects.

## Features

- **Discovery Survey** — Chat-style questionnaire to capture project name, dimensions (H/W/D), site constraints, and target load
- **Vision Analysis** — Upload an inspiration photo for simulated AI-powered style extraction (material, finish, railing preference)
- **Project Bible Generation** — A complete construction manual including:
  - Shopping list with quantities + 15% overage factor
  - Cost quote table with retailer links (Home Depot, Lowe's)
  - Step-by-step verbatim instructions with Foreman's Safety Warnings
  - Procedural SVG assembly diagrams (Footing, Framing, Decking, Elevation)
  - Pro-Tip boxes highlighting cut angles (e.g., 22.5° for octagons)
  - PDF export ("Download Field Manual")
  - Legal disclaimer for structural engineering compliance

## Tech Stack

- **React** + Vite
- **Tailwind CSS** (Blueprint Aesthetic — navy blue, grid-paper backgrounds, monospace fonts)
- **Lucide React** for iconography
- **jsPDF** + **html2canvas** for PDF export

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Disclaimer

This application generates informational construction guides only. Always consult a licensed structural engineer and obtain required local building permits before construction.
