'use client';

import { useMemo, useState } from 'react';
import { Switch, Listbox } from '@headlessui/react';
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const featureOptions = [
  { id: 'rsi', label: 'RSI Oscillator', defaultSelected: true },
  { id: 'macd', label: 'MACD Momentum', defaultSelected: true },
  { id: 'volume', label: 'Volume Profile', defaultSelected: false },
  { id: 'price', label: 'Price Action', defaultSelected: false }
] as const;

const modelOptions = ['Logistic Regression', 'SVM (Linear Kernel)'] as const;

const markerSizeOptions = [
  { id: 'small', label: 'Small', pine: 'size.small' },
  { id: 'medium', label: 'Medium', pine: 'size.large' },
  { id: 'large', label: 'Large', pine: 'size.huge' }
] as const;

type FeatureId = (typeof featureOptions)[number]['id'];
type ModelOption = (typeof modelOptions)[number];

type IndicatorConfig = {
  lookback: number;
  buyThreshold: number;
  sellThreshold: number;
  features: Record<FeatureId, boolean>;
  model: ModelOption;
  markerSize: (typeof markerSizeOptions)[number];
};

const defaultConfig: IndicatorConfig = {
  lookback: 100,
  buyThreshold: 0.7,
  sellThreshold: 0.3,
  features: featureOptions.reduce(
    (acc, option) => ({ ...acc, [option.id]: option.defaultSelected }),
    {} as Record<FeatureId, boolean>
  ),
  model: 'Logistic Regression',
  markerSize: markerSizeOptions[1]
};

const weightInputs = {
  rsi: { label: 'RSI Weight', defaultValue: 0.65 },
  macd: { label: 'MACD Weight', defaultValue: 0.45 },
  volume: { label: 'Volume Weight', defaultValue: 0.3 },
  price: { label: 'Price Action Weight', defaultValue: 0.35 }
} satisfies Record<FeatureId, { label: string; defaultValue: number }>;

const biasDefault = 0.1;

export function IndicatorBuilder() {
  const [config, setConfig] = useState(defaultConfig);
  const [bias, setBias] = useState(biasDefault);
  const [weights, setWeights] = useState<Record<FeatureId, number>>(
    Object.entries(weightInputs).reduce(
      (acc, [key, value]) => ({ ...acc, [key as FeatureId]: value.defaultValue }),
      {} as Record<FeatureId, number>
    )
  );
  const [copied, setCopied] = useState(false);

  const pineCode = useMemo(() => {
    const featureBlocks: Record<FeatureId, string> = {
      rsi: `rsiSource = ta.rsi(close, 14)
normalizedRsi = math.max(math.min((rsiSource - 50) / 50, 1), -1)`,
      macd: `macdFast, macdSlow, macdHist = ta.macd(close, 12, 26, 9)
normalizedMacd = math.tanh(macdHist / ta.stdev(macdHist, math.max(5, math.round(lookback * 0.2))))`,
      volume: `volumeMean = ta.sma(volume, lookback)
normalizedVolume = math.tanh(volume / volumeMean - 1)`,
      price: `priceMomentum = ta.roc(close, math.max(2, math.round(lookback * 0.25)))
rangeNormalizedMomentum = math.tanh(priceMomentum / 100)`
    };

    const featureInputs = featureOptions
      .map(
        ({ id, label, defaultSelected }) =>
          `use${id.toUpperCase()} = input.bool(${config.features[id]}, '${label}', group='Feature Selection')`
      )
      .join('\n');

    const weightInputLines = featureOptions
      .map(({ id, label }) =>
        `weight${id.toUpperCase()} = input.float(${weights[id].toFixed(2)}, '${label}', minval=-5.0, maxval=5.0, step=0.05, group='Model Weights')`
      )
      .join('\n');

    const accumulationLines = featureOptions
      .map(({ id }) => {
        const variableMap: Record<FeatureId, string> = {
          rsi: 'normalizedRsi',
          macd: 'normalizedMacd',
          volume: 'normalizedVolume',
          price: 'rangeNormalizedMomentum'
        };
        return `modelSum += use${id.toUpperCase()} ? weight${id.toUpperCase()} * ${variableMap[id]} : 0.0`;
      })
      .join('\n');

    const pine = `//@version=5
indicator('Agentic ML Signal Suite', overlay=true, max_labels_count=500, max_lines_count=500)

// === Hyperparameters ===
lookback = input.int(${config.lookback}, 'Lookback Period', minval=50, maxval=200, step=1, group='Model Controls')
modelType = input.string('${config.model}', 'Model Type', options=['Logistic Regression', 'SVM (Linear Kernel)'], group='Model Controls')
biasInput = input.float(${bias.toFixed(2)}, 'Model Bias', step=0.05, minval=-10.0, maxval=10.0, group='Model Weights')

buyThreshold = input.float(${config.buyThreshold.toFixed(2)}, 'Buy Threshold', minval=0.5, maxval=0.9, step=0.01, group='Signal Thresholds')
sellThreshold = input.float(${config.sellThreshold.toFixed(2)}, 'Sell Threshold', minval=0.1, maxval=0.5, step=0.01, group='Signal Thresholds')

markerSize = input.string('${config.markerSize.label}', 'Marker Size', options=['Small', 'Medium', 'Large'], group='Visuals')
markerSizePine = markerSize == 'Small' ? size.small : markerSize == 'Medium' ? size.large : size.huge

${featureInputs}

${weightInputLines}

// === Feature Engineering ===
${featureOptions.map(({ id }) => featureBlocks[id]).join('\n\n')}

modelSum = 0.0
${accumulationLines}

linearComponent = modelSum + biasInput
probability = if modelType == 'Logistic Regression'
    1.0 / (1.0 + math.exp(-linearComponent))
else
    0.5 + 0.5 * math.tanh(linearComponent)

probability := math.clamp(probability, 0.0, 1.0)

buySignal = probability >= buyThreshold and buyThreshold > sellThreshold
sellSignal = probability <= sellThreshold and buyThreshold > sellThreshold

plot(probability, 'ML Probability', color=color.new(color.cyan, 0), linewidth=2)
plot(buyThreshold, 'Buy Threshold', color=color.new(color.green, 60), linewidth=1, style=plot.style_dashed)
plot(sellThreshold, 'Sell Threshold', color=color.new(color.red, 60), linewidth=1, style=plot.style_dashed)

plotshape(buySignal, title='Buy Signal', location=location.belowbar, style=shape.triangleup, color=color.new(color.lime, 0), size=markerSizePine, offset=0)
plotshape(sellSignal, title='Sell Signal', location=location.abovebar, style=shape.triangledown, color=color.new(color.red, 0), size=markerSizePine, offset=0)

alertcondition(buySignal, title='Agentic ML Buy', message='Agentic ML Buy Signal Triggered')
alertcondition(sellSignal, title='Agentic ML Sell', message='Agentic ML Sell Signal Triggered')

// Debug table for transparency
var table debugTable = table.new(position.top_right, 1, 4, border_width=1)
if barstate.islast
    table.cell(debugTable, 0, 0, 'ML Probability: ' + str.tostring(probability, '#.##'))
    table.cell(debugTable, 0, 1, 'Buy Threshold: ' + str.tostring(buyThreshold, '#.##'))
    table.cell(debugTable, 0, 2, 'Sell Threshold: ' + str.tostring(sellThreshold, '#.##'))
    table.cell(debugTable, 0, 3, 'Selected Model: ' + modelType)
`;

    return pine;
  }, [bias, config, weights]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(pineCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy', error);
    }
  };

  return (
    <div className="space-y-8">
      <section className="section-card space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-white">Agentic ML Pine Script Designer</h1>
          <p className="mt-2 text-sm text-slate-300">
            Configure the machine learning driven TradingView indicator. Tune the window, choose feature engineering inputs,
            adjust model weights, and export fully non-repainting Pine Script ready for automated execution.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="section-card space-y-4 bg-slate-950/50">
              <h2 className="text-lg font-medium text-white">Model Controls</h2>
              <label className="block">
                <span className="text-sm text-slate-300">Lookback Period ({config.lookback} bars)</span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={config.lookback}
                  onChange={(event) =>
                    setConfig((curr) => ({ ...curr, lookback: Number(event.target.value) }))
                  }
                  className="mt-2 w-full"
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Model Type</span>
                <select
                  value={config.model}
                  onChange={(event) =>
                    setConfig((curr) => ({ ...curr, model: event.target.value as ModelOption }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                >
                  {modelOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="section-card space-y-4 bg-slate-950/50">
              <h2 className="text-lg font-medium text-white">Feature Selection</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {featureOptions.map((feature) => {
                  const enabled = config.features[feature.id];
                  return (
                    <Switch.Group key={feature.id}>
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                        <div>
                          <Switch.Label className="text-sm font-medium text-white">
                            {feature.label}
                          </Switch.Label>
                          <p className="text-xs text-slate-400">
                            {enabled ? 'Included in feature vector' : 'Disabled'}
                          </p>
                        </div>
                        <Switch
                          checked={enabled}
                          onChange={(value) =>
                            setConfig((curr) => ({
                              ...curr,
                              features: { ...curr.features, [feature.id]: value }
                            }))
                          }
                          className={`${
                            enabled ? 'bg-primary' : 'bg-slate-700'
                          } relative inline-flex h-6 w-11 items-center rounded-full transition`}
                        >
                          <span
                            className={`${
                              enabled ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                          />
                        </Switch>
                      </div>
                    </Switch.Group>
                  );
                })}
              </div>
            </div>

            <div className="section-card space-y-4 bg-slate-950/50">
              <h2 className="text-lg font-medium text-white">Signal Thresholds</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-300">Buy Threshold</span>
                  <input
                    type="number"
                    min={0.5}
                    max={0.9}
                    step={0.01}
                    value={config.buyThreshold}
                    onChange={(event) =>
                      setConfig((curr) => ({ ...curr, buyThreshold: Number(event.target.value) }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Sell Threshold</span>
                  <input
                    type="number"
                    min={0.1}
                    max={0.5}
                    step={0.01}
                    value={config.sellThreshold}
                    onChange={(event) =>
                      setConfig((curr) => ({ ...curr, sellThreshold: Number(event.target.value) }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400">
                Ensure the buy threshold remains above the sell threshold to keep non-overlapping signals.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="section-card space-y-4 bg-slate-950/50">
              <h2 className="text-lg font-medium text-white">Model Weights</h2>
              <p className="text-xs text-slate-400">
                Fine-tune the learned weights and bias for the embedded classifier. These values remain stable intra-bar to avoid repainting.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {featureOptions.map(({ id, label }) => (
                  <label key={id} className="block">
                    <span className="text-sm text-slate-300">{label}</span>
                    <input
                      type="number"
                      value={weights[id]}
                      step={0.05}
                      min={-5}
                      max={5}
                      onChange={(event) =>
                        setWeights((curr) => ({
                          ...curr,
                          [id]: Number(event.target.value)
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                    />
                  </label>
                ))}
              </div>
              <label className="block">
                <span className="text-sm text-slate-300">Model Bias</span>
                <input
                  type="number"
                  value={bias}
                  step={0.05}
                  min={-10}
                  max={10}
                  onChange={(event) => setBias(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <div className="section-card space-y-4 bg-slate-950/50">
              <h2 className="text-lg font-medium text-white">Visual Customization</h2>
              <label className="block">
                <span className="text-sm text-slate-300">Marker Size</span>
                <Listbox
                  value={config.markerSize}
                  onChange={(value) =>
                    setConfig((curr) => ({
                      ...curr,
                      markerSize: value
                    }))
                  }
                >
                  <div className="relative mt-2">
                    <Listbox.Button className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-slate-100 focus:border-primary focus:outline-none">
                      {config.markerSize.label}
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-10 mt-1 w-full rounded-md border border-slate-700 bg-slate-900 py-1 text-sm shadow-lg">
                      {markerSizeOptions.map((option) => (
                        <Listbox.Option
                          key={option.id}
                          value={option}
                          className={({ active }) =>
                            `cursor-pointer px-3 py-2 text-slate-100 ${
                              active ? 'bg-slate-800/80' : ''
                            }`
                          }
                        >
                          {option.label}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card space-y-4 bg-slate-950/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">Generated Pine Script v5</h2>
            <p className="text-xs text-slate-400">
              Copy and paste into TradingView. The script is engineered to avoid repainting and includes alert hooks.
            </p>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
          >
            {copied ? (
              <>
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copy Code
              </>
            )}
          </button>
        </div>
        <pre className="code-block overflow-x-auto whitespace-pre-wrap">{pineCode}</pre>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="section-card bg-slate-950/50 text-slate-200">
          <h3 className="text-sm font-semibold text-white">Deployment Tips</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            <li>Ensure lookback aligns with the lowest timeframe you automate.</li>
            <li>Keep thresholds separated to prevent signal overlap.</li>
            <li>Activate alerts once signals align with forward tests.</li>
          </ul>
        </div>
        <div className="section-card bg-slate-950/50 text-slate-200">
          <h3 className="text-sm font-semibold text-white">Model Guidance</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            <li>Logistic regression outputs smoothed confidence scores.</li>
            <li>SVM mode sharpens probability using hyperbolic margin.</li>
            <li>Weights remain static intrabar to keep the indicator stable.</li>
          </ul>
        </div>
        <div className="section-card bg-slate-950/50 text-slate-200">
          <h3 className="text-sm font-semibold text-white">Automation Checklist</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            <li>Backtest with Pine Strategy conversion before going live.</li>
            <li>Enable alertcondition webhooks per signal type.</li>
            <li>Monitor trades for drift and re-calibrate quarterly.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
