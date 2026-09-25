import os
import json
from sklearn.model_selection import train_test_split
from seed_data import generate_synthetic_dataset
from ml_pipeline import engineer_features_df, evaluate_models, FEATURE_COLUMNS, ARTIFACTS_DIR

def train_and_persist():
    print("=" * 60)
    print("🎓 Training Advanced Machine Learning Pipeline...")
    print("=" * 60)

    # 1. Generate / Load dataset
    df = generate_synthetic_dataset(num_samples=550, seed=42)
    print(f"Loaded synthetic dataset: {len(df)} student records.")

    # 2. Engineer Features
    df_engineered = engineer_features_df(df)
    
    # 3. Train/Test Split (80/20)
    X = df_engineered[FEATURE_COLUMNS]
    y = df_engineered["final_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Train split: {len(X_train)} samples, Test split: {len(X_test)} samples.")

    # 4. Train & Evaluate Models (Random Forest, XGBoost, LightGBM, CatBoost)
    eval_results = evaluate_models(X_train, X_test, y_train, y_test)
    
    print("\n📊 Model Comparison Results:")
    print(f"{'Model':<30} | {'MAE':<6} | {'RMSE':<6} | {'R2':<6} | {'Accuracy':<8} | {'F1':<6}")
    print("-" * 75)
    for m in eval_results["metrics"]:
        print(f"{m['modelName']:<30} | {m['mae']:<6} | {m['rmse']:<6} | {m['r2']:<6} | {m['accuracy']:<8} | {m['f1Score']:<6}")

    print(f"\n🏆 Best Selected Model: {eval_results['bestModelName']}")

    # Save evaluation report metadata
    report = {
        "modelVersion": "v2.4.0-prod",
        "bestModelName": eval_results["bestModelName"],
        "datasetSize": len(df),
        "trainSize": len(X_train),
        "testSize": len(X_test),
        "metrics": eval_results["metrics"],
        "features": FEATURE_COLUMNS,
    }
    with open(os.path.join(ARTIFACTS_DIR, "evaluation_report.json"), "w") as f:
        json.dump(report, f, indent=2)

    print("✅ Model artifacts and evaluation report successfully persisted.")

if __name__ == "__main__":
    train_and_persist()
