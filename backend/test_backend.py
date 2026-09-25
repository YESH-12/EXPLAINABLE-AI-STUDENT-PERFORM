import pytest
from fastapi.testclient import TestClient
from .main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_login_flow():
    res = client.post("/api/auth/login", json={
        "email": "student@university.edu",
        "password": "student123"
    })
    assert res.status_code == 200
    assert "token" in res.json()
    assert res.json()["user"]["role"] == "student"

def test_prediction_endpoint():
    payload = {
        "studentId": "TEST-001",
        "studentName": "Integration Test Student",
        "department": "Computer Science",
        "academicYear": 3,
        "semester": 5,
        "attendancePercentage": 82.0,
        "internalMarks": 78.0,
        "assignmentPerformance": 85.0,
        "studyHoursPerWeek": 18.0,
        "previousGpa": 8.1,
        "quizAverage": 76.0,
        "lateSubmissions": 0,
        "learningActivityScore": 80.0,
        "lmsParticipation": 84.0,
        "previousSemesterScore": 79.0
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert 0 <= data["predictedScore"] <= 100
    assert data["riskLevel"] in ["Low Risk", "Medium Risk", "High Risk"]
    assert "explanations" in data
    assert "shapFeatures" in data["explanations"]
