import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Any
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, precision_recall_fscore_support, confusion_matrix

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

try:
    import lightgbm as lgb
    LGB_AVAILABLE = True
except ImportError:
    LGB_AVAILABLE = False

try:
    import catboost as cb
    CAT_AVAILABLE = True
except ImportError:
    CAT_AVAILABLE = False

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

FEATURE_COLUMNS = [
    "attendance_percentage",
    "internal_marks",
    "assignment_performance",
    "study_hours_per_week",
    "previous_gpa",
    "quiz_average",
    "late_submissions",
    "learning_activity_score",
    "lms_participation",
    "previous_semester_score",
    # Engineered features
    "attendance_internal_interaction",
    "engagement_index",
    "study_efficiency_score",
    "submission_pressure_score",
    "academic_consistency_score",
    "learning_activity_trend",
    "normalized_gpa",
    "performance_average"
]

def engineer_features_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    # 1. Interaction
    df["attendance_internal_interaction"] = (df["attendance_percentage"] * df["internal_marks"]) / 100.0
    
    # 2. Engagement index
    df["engagement_index"] = (0.4 * df["lms_participation"]) + (0.3 * df["learning_activity_score"]) + (0.3 * df["attendance_percentage"])
    
    # 3. Study efficiency
    df["study_efficiency_score"] = np.where(df["study_hours_per_week"] > 0, df["internal_marks"] / (df["study_hours_per_week"] * 2.5), 0)
    
    # 4. Submission pressure
    df["submission_pressure_score"] = (df["late_submissions"] * 4.0) + ((100.0 - df["assignment_performance"]) * 0.2)
    
    # 5. Academic consistency
    scores_cols = ["internal_marks", "quiz_average", "assignment_performance", "previous_semester_score"]
    std_vals = df[scores_cols].std(axis=1)
    df["academic_consistency_score"] = np.clip(100.0 - (std_vals * 2.5), 0.0, 100.0)
    
    # 6. Trend
    df["learning_activity_trend"] = df["learning_activity_score"] - df["previous_semester_score"]
    
    # 7. Normalized GPA
    df["normalized_gpa"] = df["previous_gpa"] * 10.0
    
    # 8. Performance average
    df["performance_average"] = df[scores_cols].mean(axis=1)
    
    return df

def classify_risk(score: float) -> str:
    if score >= 70.0:
        return "Low Risk"
    elif score >= 50.0:
        return "Medium Risk"
    else:
        return "High Risk"

def evaluate_models(X_train: pd.DataFrame, X_test: pd.DataFrame, y_train: pd.Series, y_test: pd.Series) -> Dict[str, Any]:
    models = {}
    metrics_list = []

    # 1. Random Forest
    rf = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42)
    rf.fit(X_train, y_train)
    models["Random Forest"] = rf

    # 2. XGBoost
    if XGB_AVAILABLE:
        xgb_reg = xgb.XGBRegressor(n_estimators=50, max_depth=4, learning_rate=0.08, random_state=42)
        xgb_reg.fit(X_train, y_train)
        models["XGBoost"] = xgb_reg

    # 3. LightGBM
    if LGB_AVAILABLE:
        lgb_reg = lgb.LGBMRegressor(n_estimators=50, max_depth=5, learning_rate=0.08, random_state=42, verbose=-1)
        lgb_reg.fit(X_train, y_train)
        models["LightGBM"] = lgb_reg

    # 4. CatBoost
    if CAT_AVAILABLE:
        cat_reg = cb.CatBoostRegressor(iterations=50, depth=4, learning_rate=0.08, random_seed=42, verbose=False)
        cat_reg.fit(X_train, y_train)
        models["CatBoost"] = cat_reg

    best_r2 = -1e9
    best_model_name = "Random Forest"

    for name, model in models.items():
        preds = model.predict(X_test)
        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        r2 = float(r2_score(y_test, preds))

        y_test_risk = [classify_risk(s) for s in y_test]
        preds_risk = [classify_risk(s) for s in preds]

        acc = float(accuracy_score(y_test_risk, preds_risk))
        prec, rec, f1, _ = precision_recall_fscore_support(y_test_risk, preds_risk, average="macro", zero_division=0)

        metrics_list.append({
            "modelName": f"{name} Regressor",
            "algorithm": name,
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
            "accuracy": round(acc, 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1Score": round(float(f1), 4),
        })

        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name

    # Mark best model
    for m in metrics_list:
        m["isBestModel"] = (m["algorithm"] == best_model_name)

    # Save artifacts
    best_model = models[best_model_name]
    with open(os.path.join(ARTIFACTS_DIR, "best_model.pkl"), "wb") as f:
        pickle.dump(best_model, f)

    return {
        "bestModelName": best_model_name,
        "metrics": metrics_list,
        "models": models,
    }
