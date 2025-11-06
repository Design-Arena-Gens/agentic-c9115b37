# Agentic ML Pine Script Designer

Generate a production-ready, non-repainting Pine Script v5 indicator that fuses machine-learning style signal scoring with TradingView-native plotting and alerts. The UI lets you configure the lookback window, enable/disable feature extractors, tweak model weights, adjust decision thresholds, and control the visual hierarchy of the resulting signal.

## 🚀 Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) (ships with Node.js)

### Setup & Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to interact with the builder.

### Production Build

```bash
npm run build
npm start
```

## 🧠 Key Features

- Interactive controls for lookback period, probability thresholds, marker size, and ML model type (Logistic Regression vs. SVM-style margin scoring)
- Multi-select feature toggles: RSI, MACD, volume normalization, and price-action momentum
- Editable weight and bias inputs with live Pine Script regeneration
- Copy-to-clipboard export plus a canonical script stored at `public/pine/agentic-ml-indicator.pine`
- Pine Script ensures stable, non-repainting behaviour and wires up alertcondition hooks for automation

## 🗂️ Project Structure

```
app/                # Next.js app directory
components/         # Client-side React UI modules
public/pine/        # Pine Script blueprint for direct import
tailwind.config.ts  # Tailwind CSS configuration
```

## 📄 Pine Script Overview

- Uses deterministic feature engineering with current-bar data only (no lookahead)
- Aggregates features through configurable linear weights + bias
- Offers two classifier styles: logistic sigmoid probability and tanh-based SVM margin scoring
- Enforces separated buy/sell thresholds to keep signals non-overlapping
- Renders green buy and red sell markers, with dynamic sizing and dashed threshold overlays
- Adds transparent diagnostics via `table` and TradingView alerts for webhook integration

## 📦 Scripts

- `npm run dev` – start the local development server
- `npm run build` – compile an optimized production build
- `npm run start` – launch the production server
- `npm run lint` – run Next.js/ESLint checks

## 📬 Deployment

The project is optimized for Vercel. Run `npm run build` locally, then deploy via `vercel deploy --prod` with the provided project name and token.

---

Crafted for algorithmic traders who need deterministic, alert-ready signals derived from configurable machine learning heuristics.
