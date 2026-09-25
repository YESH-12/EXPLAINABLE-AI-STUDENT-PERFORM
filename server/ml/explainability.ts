import { ExplanationFeature, PredictionExplanation } from '../../src/types/index';
import { FEATURE_DISPLAY_NAMES, NUMERIC_FEATURE_KEYS } from './features';

export interface Predictor {
  predictOne(features: number[]): number;
}

export class ExplainableAIEngine {
  private predictor: Predictor;
  private backgroundData: number[][];
  private featureMeans: number[];
  private featureStdDevs: number[];
  public baseValue: number = 68.5;

  constructor(predictor: Predictor, backgroundData: number[][]) {
    this.predictor = predictor;
    this.backgroundData = backgroundData;

    // Calculate feature statistics from background data
    const numFeatures = backgroundData[0]?.length || NUMERIC_FEATURE_KEYS.length;
    this.featureMeans = new Array(numFeatures).fill(0);
    this.featureStdDevs = new Array(numFeatures).fill(1);

    if (backgroundData.length > 0) {
      for (let f = 0; f < numFeatures; f++) {
        const col = backgroundData.map(r => r[f]);
        const mean = col.reduce((a, b) => a + b, 0) / col.length;
        this.featureMeans[f] = mean;
        const variance = col.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / col.length;
        this.featureStdDevs[f] = Math.sqrt(variance) || 1;
      }

      // Compute base expected value E[f(x)]
      const bgPreds = backgroundData.slice(0, 50).map(x => predictor.predictOne(x));
      this.baseValue = Number((bgPreds.reduce((a, b) => a + b, 0) / bgPreds.length).toFixed(2));
    }
  }

  // 1. SHAP EXPLANATION (Shapley Value Estimation)
  explainSHAP(instance: number[]): { baseValue: number; features: ExplanationFeature[] } {
    try {
      const pred = this.predictor.predictOne(instance);
      const totalDiff = pred - this.baseValue;
      const numFeatures = instance.length;
      const rawShapValues = new Array(numFeatures).fill(0);

      // Marginal contribution sampling over background references
      const sampleRefs = this.backgroundData.slice(0, 20);
      const numPermutations = 8;

      for (let p = 0; p < numPermutations; p++) {
        // Random permutation of features
        const order = Array.from({ length: numFeatures }, (_, i) => i).sort(() => Math.random() - 0.5);

        for (const ref of sampleRefs) {
          let currentInstance = [...ref];
          let currentScore = this.predictor.predictOne(currentInstance);

          for (const fIdx of order) {
            currentInstance[fIdx] = instance[fIdx];
            const newScore = this.predictor.predictOne(currentInstance);
            const marginalContrib = newScore - currentScore;
            rawShapValues[fIdx] += marginalContrib;
            currentScore = newScore;
          }
        }
      }

      // Average out
      const totalPasses = numPermutations * sampleRefs.length;
      for (let i = 0; i < numFeatures; i++) {
        rawShapValues[i] = rawShapValues[i] / totalPasses;
      }

      // Enforce Efficiency Axiom: sum(phi_i) == pred - baseValue
      const rawSum = rawShapValues.reduce((a, b) => a + b, 0);
      const scalingFactor = Math.abs(rawSum) > 1e-4 ? totalDiff / rawSum : 1;
      const calibratedShap = rawShapValues.map(v => v * scalingFactor);

      const features: ExplanationFeature[] = calibratedShap.map((val, idx) => {
        const key = NUMERIC_FEATURE_KEYS[idx] || `feature_${idx}`;
        const displayName = FEATURE_DISPLAY_NAMES[key] || key;
        const inputVal = instance[idx];
        const roundedImpact = Number(val.toFixed(2));
        const direction: 'Positive' | 'Negative' | 'Neutral' = 
          roundedImpact > 0.3 ? 'Positive' : roundedImpact < -0.3 ? 'Negative' : 'Neutral';

        return {
          featureName: key,
          displayName,
          inputValue: Number(inputVal.toFixed(1)),
          impactValue: roundedImpact,
          direction,
          explanationMethod: 'SHAP',
          humanDescription: this.generateHumanDescription(displayName, inputVal, roundedImpact, 'SHAP'),
        };
      });

      // Sort by absolute impact descending
      features.sort((a, b) => Math.abs(b.impactValue) - Math.abs(a.impactValue));

      return {
        baseValue: this.baseValue,
        features,
      };
    } catch (err) {
      console.warn('SHAP computation encountered error, falling back to deterministic perturbation:', err);
      return this.explainDeterministicPerturbation(instance, 'SHAP');
    }
  }

  // 2. LIME EXPLANATION (Local Interpretable Model-Agnostic Explanations)
  explainLIME(instance: number[]): { intercept: number; features: ExplanationFeature[] } {
    try {
      const pred = this.predictor.predictOne(instance);
      const numFeatures = instance.length;
      const numSamples = 70;

      const perturbedSamples: number[][] = [];
      const weights: number[] = [];
      const targetPreds: number[] = [];

      for (let s = 0; s < numSamples; s++) {
        const perturbed = instance.map((val, idx) => {
          const noise = (Math.random() - 0.5) * 2 * this.featureStdDevs[idx] * 0.3;
          return val + noise;
        });

        // Compute Euclidean distance in standardized space
        let distSq = 0;
        for (let i = 0; i < numFeatures; i++) {
          const z = (perturbed[i] - instance[i]) / (this.featureStdDevs[i] || 1);
          distSq += z * z;
        }

        // Exponential smoothing kernel weight
        const kernelWidth = Math.sqrt(numFeatures) * 0.75;
        const weight = Math.exp(-distSq / (2 * kernelWidth * kernelWidth));

        perturbedSamples.push(perturbed);
        weights.push(weight);
        targetPreds.push(this.predictor.predictOne(perturbed));
      }

      // Fit local Ridge Linear Regression: y ~ beta_0 + sum(beta_i * (z_i - x_i))
      const limeImpacts: number[] = new Array(numFeatures).fill(0);
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      for (let f = 0; f < numFeatures; f++) {
        let cov = 0;
        let varX = 0;
        const meanX = instance[f];
        const meanY = pred;

        for (let s = 0; s < numSamples; s++) {
          const diffX = perturbedSamples[s][f] - meanX;
          const diffY = targetPreds[s] - meanY;
          cov += weights[s] * diffX * diffY;
          varX += weights[s] * diffX * diffX;
        }

        const slope = varX > 1e-6 ? (cov / (varX + 0.05)) : 0;
        // Local effect of instance relative to population mean
        const instanceOffset = instance[f] - this.featureMeans[f];
        limeImpacts[f] = slope * instanceOffset * 0.5;
      }

      const features: ExplanationFeature[] = limeImpacts.map((val, idx) => {
        const key = NUMERIC_FEATURE_KEYS[idx] || `feature_${idx}`;
        const displayName = FEATURE_DISPLAY_NAMES[key] || key;
        const inputVal = instance[idx];
        const roundedImpact = Number(val.toFixed(2));
        const direction: 'Positive' | 'Negative' | 'Neutral' = 
          roundedImpact > 0.3 ? 'Positive' : roundedImpact < -0.3 ? 'Negative' : 'Neutral';

        return {
          featureName: key,
          displayName,
          inputValue: Number(inputVal.toFixed(1)),
          impactValue: roundedImpact,
          direction,
          explanationMethod: 'LIME',
          humanDescription: this.generateHumanDescription(displayName, inputVal, roundedImpact, 'LIME'),
        };
      });

      features.sort((a, b) => Math.abs(b.impactValue) - Math.abs(a.impactValue));

      return {
        intercept: Number(pred.toFixed(2)),
        features,
      };
    } catch (err) {
      console.warn('LIME computation encountered error, falling back to deterministic perturbation:', err);
      const fallback = this.explainDeterministicPerturbation(instance, 'LIME');
      return {
        intercept: fallback.baseValue,
        features: fallback.features,
      };
    }
  }

  // 3. DETERMINISTIC FEATURE-PERTURBATION FALLBACK
  explainDeterministicPerturbation(instance: number[], method: 'SHAP' | 'LIME' | 'PerturbationFallback' = 'PerturbationFallback'): { baseValue: number; features: ExplanationFeature[] } {
    const basePred = this.predictor.predictOne(instance);
    const numFeatures = instance.length;
    const features: ExplanationFeature[] = [];

    for (let f = 0; f < numFeatures; f++) {
      const origVal = instance[f];
      const delta = (this.featureStdDevs[f] || 5) * 0.2;

      const upInstance = [...instance];
      upInstance[f] = origVal + delta;
      const upPred = this.predictor.predictOne(upInstance);

      const downInstance = [...instance];
      downInstance[f] = origVal - delta;
      const downPred = this.predictor.predictOne(downInstance);

      // Local derivative / numerical gradient
      const gradient = (upPred - downPred) / (2 * delta);
      const impact = Number((gradient * (origVal - this.featureMeans[f])).toFixed(2));

      const key = NUMERIC_FEATURE_KEYS[f] || `feature_${f}`;
      const displayName = FEATURE_DISPLAY_NAMES[key] || key;
      const direction: 'Positive' | 'Negative' | 'Neutral' = 
        impact > 0.3 ? 'Positive' : impact < -0.3 ? 'Negative' : 'Neutral';

      features.push({
        featureName: key,
        displayName,
        inputValue: Number(origVal.toFixed(1)),
        impactValue: impact,
        direction,
        explanationMethod: 'PerturbationFallback',
        humanDescription: this.generateHumanDescription(displayName, origVal, impact, 'PerturbationFallback'),
      });
    }

    features.sort((a, b) => Math.abs(b.impactValue) - Math.abs(a.impactValue));

    return {
      baseValue: this.baseValue,
      features,
    };
  }

  // Full unified explanation payload
  explainAll(instance: number[]): PredictionExplanation {
    const shap = this.explainSHAP(instance);
    const lime = this.explainLIME(instance);

    return {
      shapBaseValue: shap.baseValue,
      shapFeatures: shap.features,
      limeIntercept: lime.intercept,
      limeFeatures: lime.features,
      methodUsed: 'Ensemble',
      disclaimer: 'Notice: Model explanations demonstrate local statistical influence and feature attribution; they indicate correlation within the trained model and do not constitute guaranteed causal determination. Faculty and mentors must apply holistic academic judgment.',
    };
  }

  private generateHumanDescription(feature: string, val: number, impact: number, method: string): string {
    const absImpact = Math.abs(impact).toFixed(1);
    const signWord = impact > 0 ? 'increased' : 'reduced';
    const statusWord = impact > 0 ? 'strong performance in' : 'lower than recommended';

    if (feature.includes('Attendance')) {
      return impact > 0
        ? `Consistently high attendance (${val}%) positively boosted the predicted outcome by +${absImpact} points.`
        : `Attendance rate of ${val}% is below optimal thresholds, detracting approximately -${absImpact} points from the final score.`;
    }
    if (feature.includes('Internal')) {
      return impact > 0
        ? `Solid internal exam performance (${val} marks) raised the projected score by +${absImpact} points.`
        : `Internal assessment marks (${val}/100) indicate conceptual gaps, pulling the projection down by -${absImpact} points.`;
    }
    if (feature.includes('Assignment')) {
      return impact > 0
        ? `Timely, high-grade assignments (${val}/100) added +${absImpact} points of positive contribution.`
        : `Assignment performance (${val}/100) indicates missed milestones, reducing projected score by -${absImpact} points.`;
    }
    if (feature.includes('Study Hours')) {
      return impact > 0
        ? `Dedicated weekly study routine of ${val} hours contributed +${absImpact} points toward academic readiness.`
        : `Current study commitment of ${val} hours/week is below the suggested target, lowering prediction by -${absImpact} points.`;
    }
    if (feature.includes('Late')) {
      return impact < 0
        ? `Having ${val} late submission(s) accumulated submission pressure, lowering score by -${absImpact} points.`
        : `Zero or minimal late submissions preserved full assignment credit.`;
    }
    if (feature.includes('Engagement') || feature.includes('LMS')) {
      return impact > 0
        ? `Active digital participation (${val}/100) contributed +${absImpact} points of favorable engagement.`
        : `Infrequent learning platform activity (${val}/100) detracted -${absImpact} points.`;
    }

    return `${feature} (${val}) ${signWord} the predicted performance by ${impact > 0 ? '+' : '-'}${absImpact} points based on ${method} feature attribution.`;
  }
}
