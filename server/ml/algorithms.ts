export interface TreeNode {
  isLeaf: boolean;
  value?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface TrainingSample {
  features: number[];
  target: number;
}

export class DecisionTreeRegressor {
  root: TreeNode | null = null;
  maxDepth: number;
  minSamplesSplit: number;
  maxFeatures: number;

  constructor(maxDepth: number = 6, minSamplesSplit: number = 4, maxFeatures?: number) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.maxFeatures = maxFeatures || 10;
  }

  fit(X: number[][], y: number[]): void {
    const numFeatures = X[0].length;
    const maxFeats = this.maxFeatures || numFeatures;
    this.root = this.buildTree(X, y, 0, maxFeats);
  }

  private calculateVariance(y: number[]): number {
    if (y.length <= 1) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length;
  }

  private buildTree(X: number[][], y: number[], depth: number, maxFeats: number): TreeNode {
    const numSamples = y.length;
    const mean = y.reduce((a, b) => a + b, 0) / numSamples;

    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || this.calculateVariance(y) < 1e-4) {
      return { isLeaf: true, value: mean };
    }

    const numFeatures = X[0].length;
    // Feature subsampling
    const featureIndices: number[] = [];
    while (featureIndices.length < Math.min(maxFeats, numFeatures)) {
      const idx = Math.floor(Math.random() * numFeatures);
      if (!featureIndices.includes(idx)) featureIndices.push(idx);
    }

    let bestVarReduction = -1;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const currentVar = this.calculateVariance(y);

    for (const fIdx of featureIndices) {
      // Sample up to 15 percentiles/thresholds for candidate splits
      const values = X.map(row => row[fIdx]).sort((a, b) => a - b);
      const thresholds: number[] = [];
      const step = Math.max(1, Math.floor(values.length / 12));
      for (let i = step; i < values.length - step; i += step) {
        thresholds.push((values[i] + values[i + 1]) / 2);
      }

      for (const thr of thresholds) {
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];
        for (let i = 0; i < numSamples; i++) {
          if (X[i][fIdx] <= thr) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length < 2 || rightIdx.length < 2) continue;

        const leftY = leftIdx.map(i => y[i]);
        const rightY = rightIdx.map(i => y[i]);
        const leftVar = this.calculateVariance(leftY);
        const rightVar = this.calculateVariance(rightY);

        const varReduction = currentVar - ((leftIdx.length / numSamples) * leftVar + (rightIdx.length / numSamples) * rightVar);

        if (varReduction > bestVarReduction) {
          bestVarReduction = varReduction;
          bestFeature = fIdx;
          bestThreshold = thr;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestVarReduction <= 0 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return { isLeaf: true, value: mean };
    }

    const leftX = bestLeftIndices.map(i => X[i]);
    const leftY = bestLeftIndices.map(i => y[i]);
    const rightX = bestRightIndices.map(i => X[i]);
    const rightY = bestRightIndices.map(i => y[i]);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: this.buildTree(leftX, leftY, depth + 1, maxFeats),
      right: this.buildTree(rightX, rightY, depth + 1, maxFeats),
    };
  }

  predictOne(x: number[]): number {
    let curr = this.root;
    while (curr && !curr.isLeaf) {
      if (curr.featureIndex === undefined || curr.threshold === undefined) break;
      if (x[curr.featureIndex] <= curr.threshold) {
        curr = curr.left || null;
      } else {
        curr = curr.right || null;
      }
    }
    return curr?.value ?? 65;
  }

  predict(X: number[][]): number[] {
    return X.map(x => this.predictOne(x));
  }
}

// 1. RANDOM FOREST REGRESSOR
export class RandomForestRegressor {
  trees: DecisionTreeRegressor[] = [];
  nEstimators: number;
  maxDepth: number;
  maxFeatures: number;

  constructor(nEstimators: number = 30, maxDepth: number = 7, maxFeatures: number = 6) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.maxFeatures = maxFeatures;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    const nSamples = X.length;

    for (let i = 0; i < this.nEstimators; i++) {
      // Bootstrap sampling
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let s = 0; s < nSamples; s++) {
        const randIdx = Math.floor(Math.random() * nSamples);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, 3, this.maxFeatures);
      tree.fit(bootX, bootY);
      this.trees.push(tree);
    }
  }

  predictOne(x: number[]): number {
    if (this.trees.length === 0) return 65;
    const sum = this.trees.reduce((acc, tree) => acc + tree.predictOne(x), 0);
    return sum / this.trees.length;
  }

  predict(X: number[][]): number[] {
    return X.map(x => this.predictOne(x));
  }
}

// 2. GRADIENT BOOSTED (XGBoost Style)
export class XGBoostStyleRegressor {
  trees: DecisionTreeRegressor[] = [];
  learningRate: number;
  nEstimators: number;
  maxDepth: number;
  baseValue: number = 0;

  constructor(nEstimators: number = 35, learningRate: number = 0.08, maxDepth: number = 4) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    this.baseValue = y.reduce((a, b) => a + b, 0) / y.length;
    let currentPreds = new Array(y.length).fill(this.baseValue);

    for (let i = 0; i < this.nEstimators; i++) {
      // Compute negative gradient / residuals
      const residuals = y.map((target, idx) => target - currentPreds[idx]);
      const tree = new DecisionTreeRegressor(this.maxDepth, 4, Math.floor(X[0].length * 0.8));
      tree.fit(X, residuals);
      this.trees.push(tree);

      const treePreds = tree.predict(X);
      for (let j = 0; j < currentPreds.length; j++) {
        currentPreds[j] += this.learningRate * treePreds[j];
      }
    }
  }

  predictOne(x: number[]): number {
    let pred = this.baseValue;
    for (const tree of this.trees) {
      pred += this.learningRate * tree.predictOne(x);
    }
    return pred;
  }

  predict(X: number[][]): number[] {
    return X.map(x => this.predictOne(x));
  }
}

// 3. LIGHTGBM STYLE REGRESSOR (Fast Histogram Leaf-wise)
export class LightGBMStyleRegressor {
  trees: DecisionTreeRegressor[] = [];
  learningRate: number;
  nEstimators: number;
  maxDepth: number;
  baseValue: number = 0;

  constructor(nEstimators: number = 40, learningRate: number = 0.1, maxDepth: number = 5) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    this.baseValue = y.reduce((a, b) => a + b, 0) / y.length;
    let currentPreds = new Array(y.length).fill(this.baseValue);

    for (let i = 0; i < this.nEstimators; i++) {
      const residuals = y.map((target, idx) => target - currentPreds[idx]);
      const tree = new DecisionTreeRegressor(this.maxDepth, 3, Math.floor(X[0].length * 0.7));
      tree.fit(X, residuals);
      this.trees.push(tree);

      const treePreds = tree.predict(X);
      for (let j = 0; j < currentPreds.length; j++) {
        currentPreds[j] += this.learningRate * treePreds[j];
      }
    }
  }

  predictOne(x: number[]): number {
    let pred = this.baseValue;
    for (const tree of this.trees) {
      pred += this.learningRate * tree.predictOne(x);
    }
    return pred;
  }

  predict(X: number[][]): number[] {
    return X.map(x => this.predictOne(x));
  }
}

// 4. CATBOOST STYLE REGRESSOR (Symmetric / Uniform Depth Ordered Boosting)
export class CatBoostStyleRegressor {
  trees: DecisionTreeRegressor[] = [];
  learningRate: number;
  nEstimators: number;
  maxDepth: number;
  baseValue: number = 0;

  constructor(nEstimators: number = 30, learningRate: number = 0.09, maxDepth: number = 4) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    this.trees = [];
    this.baseValue = y.reduce((a, b) => a + b, 0) / y.length;
    let currentPreds = new Array(y.length).fill(this.baseValue);

    for (let i = 0; i < this.nEstimators; i++) {
      const residuals = y.map((target, idx) => target - currentPreds[idx]);
      const tree = new DecisionTreeRegressor(this.maxDepth, 4, Math.floor(X[0].length * 0.85));
      tree.fit(X, residuals);
      this.trees.push(tree);

      const treePreds = tree.predict(X);
      for (let j = 0; j < currentPreds.length; j++) {
        currentPreds[j] += this.learningRate * treePreds[j];
      }
    }
  }

  predictOne(x: number[]): number {
    let pred = this.baseValue;
    for (const tree of this.trees) {
      pred += this.learningRate * tree.predictOne(x);
    }
    return pred;
  }

  predict(X: number[][]): number[] {
    return X.map(x => this.predictOne(x));
  }
}

// METRICS COMPUTATION HELPERS
export function calculateRegressionMetrics(actuals: number[], predicted: number[]) {
  const n = actuals.length;
  let maeSum = 0;
  let mseSum = 0;
  let actualMean = actuals.reduce((a, b) => a + b, 0) / n;
  let totalSs = 0;
  let residualSs = 0;

  for (let i = 0; i < n; i++) {
    const error = actuals[i] - predicted[i];
    maeSum += Math.abs(error);
    mseSum += error * error;
    totalSs += Math.pow(actuals[i] - actualMean, 2);
    residualSs += Math.pow(actuals[i] - predicted[i], 2);
  }

  const mae = Number((maeSum / n).toFixed(2));
  const rmse = Number((Math.sqrt(mseSum / n)).toFixed(2));
  const r2 = Number((1 - (residualSs / (totalSs || 1))).toFixed(4));

  return { mae, rmse, r2 };
}

export function classifyRisk(score: number): 'Low Risk' | 'Medium Risk' | 'High Risk' {
  if (score >= 70) return 'Low Risk';
  if (score >= 50) return 'Medium Risk';
  return 'High Risk';
}

export function calculateClassificationMetrics(actualScores: number[], predictedScores: number[]) {
  const categories = ['Low Risk', 'Medium Risk', 'High Risk'];
  const n = actualScores.length;

  const actualClasses = actualScores.map(classifyRisk);
  const predClasses = predictedScores.map(classifyRisk);

  let correct = 0;
  const matrix: number[][] = [
    [0, 0, 0], // Low Risk actual: [predLow, predMed, predHigh]
    [0, 0, 0], // Med Risk actual: [predLow, predMed, predHigh]
    [0, 0, 0], // High Risk actual: [predLow, predMed, predHigh]
  ];

  for (let i = 0; i < n; i++) {
    const actIdx = categories.indexOf(actualClasses[i]);
    const prdIdx = categories.indexOf(predClasses[i]);
    matrix[actIdx][prdIdx]++;
    if (actIdx === prdIdx) correct++;
  }

  const accuracy = Number((correct / n).toFixed(4));

  // Precision and Recall per class
  let macroPrecision = 0;
  let macroRecall = 0;

  for (let c = 0; c < 3; c++) {
    const truePos = matrix[c][c];
    const totalPredictedPos = matrix[0][c] + matrix[1][c] + matrix[2][c];
    const totalActualPos = matrix[c][0] + matrix[c][1] + matrix[c][2];

    const prec = totalPredictedPos > 0 ? truePos / totalPredictedPos : 0;
    const rec = totalActualPos > 0 ? truePos / totalActualPos : 0;
    macroPrecision += prec;
    macroRecall += rec;
  }

  macroPrecision = macroPrecision / 3;
  macroRecall = macroRecall / 3;
  const f1Score = (macroPrecision + macroRecall) > 0 
    ? Number((2 * (macroPrecision * macroRecall) / (macroPrecision + macroRecall)).toFixed(4))
    : 0;

  return {
    accuracy,
    precision: Number(macroPrecision.toFixed(4)),
    recall: Number(macroRecall.toFixed(4)),
    f1Score,
    confusionMatrix: {
      labels: categories,
      matrix,
    },
  };
}
