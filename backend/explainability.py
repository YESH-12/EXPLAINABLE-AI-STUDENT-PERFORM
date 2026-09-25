import numpy as np
import pandas as pd
from typing import Dict, Any, List

class PythonExplainabilityEngine:
    def __init__(self, model: Any, background_df: pd.DataFrame):
        self.model = model
        self.background_df = background_df
        self.feature_names = list(background_df.columns)
        self.base_value = float(np.mean(model.predict(background_df.iloc[:50])))
        self.feature_stds = background_df.std().to_dict()
        self.feature_means = background_df.mean().to_dict()

    def explain_shap(self, row_series: pd.Series) -> Dict[str, Any]:
        """Calculates SHAP values using TreeExplainer or sampling with fallback."""
        try:
            import shap
            explainer = shap.TreeExplainer(self.model, data=self.background_df.iloc[:30])
            shap_values = explainer.shap_values(row_series.to_frame().T)
            vals = shap_values[0] if isinstance(shap_values, list) else shap_values[0]
            base_val = float(explainer.expected_value if hasattr(explainer, 'expected_value') else self.base_value)
        except Exception as e:
            # Deterministic perturbation fallback
            return self.explain_perturbation_fallback(row_series, method="SHAP")

        features = []
        for i, col in enumerate(self.feature_names):
            imp = float(vals[i])
            val = float(row_series[col])
            direction = "Positive" if imp > 0.2 else ("Negative" if imp < -0.2 else "Neutral")
            features.append({
                "featureName": col,
                "displayName": col.replace("_", " ").title(),
                "inputValue": round(val, 2),
                "impactValue": round(imp, 2),
                "direction": direction,
                "explanationMethod": "SHAP",
                "humanDescription": f"{col.replace('_', ' ').title()} ({round(val, 1)}) contributed {round(imp, 2)} points to the prediction via SHAP."
            })

        features.sort(key=lambda x: abs(x["impactValue"]), reverse=True)
        return {"baseValue": round(base_val, 2), "features": features}

    def explain_lime(self, row_series: pd.Series) -> Dict[str, Any]:
        """Calculates LIME local explanations with local linear regression."""
        try:
            from lime.lime_tabular import LimeTabularExplainer
            explainer = LimeTabularExplainer(
                training_data=self.background_df.values,
                feature_names=self.feature_names,
                mode="regression",
                verbose=False
            )
            exp = explainer.explain_instance(row_series.values, self.model.predict, num_features=10)
            lime_map = dict(exp.as_list())
            features = []
            for col in self.feature_names:
                # Match lime feature rule string
                matched_val = 0.0
                for rule, weight in lime_map.items():
                    if col in rule:
                        matched_val = float(weight)
                        break
                val = float(row_series[col])
                direction = "Positive" if matched_val > 0.2 else ("Negative" if matched_val < -0.2 else "Neutral")
                features.append({
                    "featureName": col,
                    "displayName": col.replace("_", " ").title(),
                    "inputValue": round(val, 2),
                    "impactValue": round(matched_val, 2),
                    "direction": direction,
                    "explanationMethod": "LIME",
                    "humanDescription": f"LIME local surrogate attributed {round(matched_val, 2)} points to {col.replace('_', ' ').title()}."
                })
            features.sort(key=lambda x: abs(x["impactValue"]), reverse=True)
            return {"intercept": round(self.base_value, 2), "features": features}
        except Exception:
            return self.explain_perturbation_fallback(row_series, method="LIME")

    def explain_perturbation_fallback(self, row_series: pd.Series, method: str = "PerturbationFallback") -> Dict[str, Any]:
        """Deterministic numerical sensitivity gradient."""
        base_pred = float(self.model.predict(row_series.to_frame().T)[0])
        features = []
        for col in self.feature_names:
            val = float(row_series[col])
            std = self.feature_stds.get(col, 5.0) or 5.0
            delta = std * 0.15

            up = row_series.copy()
            up[col] = val + delta
            up_pred = float(self.model.predict(up.to_frame().T)[0])

            down = row_series.copy()
            down[col] = val - delta
            down_pred = float(self.model.predict(down.to_frame().T)[0])

            grad = (up_pred - down_pred) / (2 * delta)
            offset = val - self.feature_means.get(col, val)
            impact = round(float(grad * offset), 2)
            direction = "Positive" if impact > 0.2 else ("Negative" if impact < -0.2 else "Neutral")

            features.append({
                "featureName": col,
                "displayName": col.replace("_", " ").title(),
                "inputValue": round(val, 2),
                "impactValue": impact,
                "direction": direction,
                "explanationMethod": method,
                "humanDescription": f"Sensitivity analysis indicated {col.replace('_', ' ').title()} influenced prediction by {impact} points."
            })

        features.sort(key=lambda x: abs(x["impactValue"]), reverse=True)
        return {"baseValue": round(self.base_value, 2), "intercept": round(self.base_value, 2), "features": features}
