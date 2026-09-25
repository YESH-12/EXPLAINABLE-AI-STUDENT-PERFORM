# Explainable AI-Based Student Performance Prediction System Using Advanced Machine Learning

A complete, production-ready web application designed for academic institutions, faculty advisors, department heads, and students. The platform leverages ensemble machine learning models to forecast final course performance, identify academic risk early, and present transparent feature attributions using **SHAP (Shapley Additive exPlanations)** and **LIME (Local Interpretable Model-agnostic Explanations)** alongside non-punitive, actionable recommendations.

---

## 1. System Architecture

```
                                  +-----------------------------+
                                  |    Client Web Application   |
                                  |  (React 19 + TypeScript +   |
                                  |   Tailwind CSS + Recharts)  |
                                  +--------------+--------------+
                                                 |
                                                 | REST / JSON
                                                 v
                                  +-----------------------------+
                                  |      Express / FastAPI      |
                                  |       Application API       |
                                  |  (Auth, RBAC, Data Access)  |
                                  +--------------+--------------+
                                                 |
                     +---------------------------+---------------------------+
                     |                                                       |
                     v                                                       v
       +----------------------------+                          +----------------------------+
       |   Advanced ML Pipeline     |                          |   Explainable AI Engine    |
       | - Random Forest            |                          | - SHAP Waterfall (Game Th.)|
       | - XGBoost (Gradient Boost) |                          | - LIME Local Surrogate     |
       | - LightGBM & CatBoost      |                          | - Perturbation Sensitivity |
       | - Feature Engineering      |                          | - Recommendation Engine    |
       +----------------------------+                          +----------------------------+
                     |                                                       |
                     +---------------------------+---------------------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |  Database Storage Engine    |
                                  |   PostgreSQL / In-Memory    |
                                  | (Students, Preds, Audits)   |
                                  +-----------------------------+
```

---

## 2. Advanced Machine Learning Pipeline

### 2.1 Evaluated Model Architectures
1. **Random Forest Regressor**: Ensembles randomized decision trees over bootstrap samples to reduce variance.
2. **XGBoost Regressor**: Iteratively fits decision trees to pseudo-residuals using gradient descent in functional space.
3. **LightGBM Regressor**: Leaf-wise tree growth with gradient-based one-side sampling.
4. **CatBoost Regressor**: Symmetric oblivious decision trees reducing target leakage and overfitting.

### 2.2 Feature Engineering Transformations
- **Attendance & Internal Interaction**: $(\text{attendance} \times \text{internal}) / 100$
- **Engagement Index**: $0.4 \times \text{lms} + 0.3 \times \text{activity} + 0.3 \times \text{attendance}$
- **Study Efficiency Score**: $\text{internal} / (\text{study\_hours} \times 2.5)$
- **Submission Pressure Drag**: $(\text{late\_submissions} \times 4.0) + (100 - \text{assignment}) \times 0.2$
- **Academic Consistency Index**: $100 - (\text{std\_dev}(\text{scores}) \times 2.5)$
- **Learning Activity Momentum**: $\text{activity} - \text{previous\_semester\_score}$

### 2.3 Evaluation Metrics
- **Continuous Metrics**: Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Coefficient of Determination ($R^2$).
- **Stratified Risk Classification**: Multi-Class Accuracy, Precision, Recall, and Macro $F_1$-score on:
  - **High Risk**: Projected score $< 50$
  - **Medium Risk**: Projected score $50 - 69.9$
  - **Low Risk**: Projected score $\ge 70$

---

## 3. Explainable AI Implementation

### 3.1 SHAP (Shapley Additive exPlanations)
Implements local feature attribution adhering to the **Efficiency Axiom**:
$$\sum_{i=1}^M \phi_i(x) = f(x) - E[f(X)]$$
Where $E[f(X)]$ represents the cohort baseline expected score ($\approx 68.5$ pts). Every feature $i$ contributes $\phi_i$ points in positive boosts or negative score drags.

### 3.2 LIME (Local Interpretable Model-agnostic Explanations)
Generates an interpretable surrogate model $g \in G$ by perturbing the target academic vector in an $N$-dimensional Gaussian neighborhood:
$$\xi(x) = \arg\min_{g \in G} \mathcal{L}(f, g, \pi_x) + \Omega(g)$$
This produces local linear surrogate slopes revealing sensitivity to margin adjustments.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and uptime |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT bearer token |
| `GET` | `/api/dashboard/summary` | Cohort-wide risk distribution and statistics |
| `GET` | `/api/students` | Filtered, sorted, and paginated student directory |
| `GET` | `/api/students/:id` | Detailed student profile, predictions, and history |
| `POST` | `/api/predict` | Real-time score inference, risk tier, SHAP & LIME |
| `GET` | `/api/models/evaluation` | Cross-algorithm benchmarks and champion selection |
| `POST` | `/api/models/train` | Retrain models on expanded dataset |
| `GET` | `/api/interventions` | Retrieve logged faculty mentoring interventions |
| `POST` | `/api/interventions` | Create new advisory intervention record |
| `POST` | `/api/test-suite/run` | Execute automated test suite |

---

## 5. Security, FERPA & Ethical Guidelines

1. **Human-in-the-Loop Requirement**: Statistical projections and risk badges are strictly advisory estimates. They cannot be used as automated disciplinary measures.
2. **Strict Data Isolation**: Students can access strictly their own academic files. Cross-student queries are blocked by role authorization.
3. **Right to Rectification**: Students can petition faculty mentors for record corrections.
4. **Audit Logging**: Sensitive student file reads and predictions are recorded in immutable audit logs.

---

## 6. Docker & Local Deployment

### Using Docker Compose (Full Stack with PostgreSQL)
```bash
# Clone repository and launch all microservices
docker-compose up --build -d

# Verify services
docker-compose ps
```
- **Frontend Portal**: `http://localhost:5173` (or `http://localhost:3000`)
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

### Running the Node/Express Full-Stack Server
```bash
# Install dependencies
npm install

# Run the dev server with hot reload
npm run dev

# Build and test production bundle
npm run build
npm start
```
