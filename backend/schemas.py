from typing import List, Optional, Any
from pydantic import BaseModel, Field, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "student"
    department: Optional[str] = None
    studentId: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class StudentInput(BaseModel):
    studentId: str = "MANUAL-001"
    studentName: str = "Sample Student"
    department: str = "Computer Science"
    academicYear: int = Field(2, ge=1, le=4)
    semester: int = Field(3, ge=1, le=8)
    attendancePercentage: float = Field(..., ge=0, le=100)
    internalMarks: float = Field(..., ge=0, le=100)
    assignmentPerformance: float = Field(..., ge=0, le=100)
    studyHoursPerWeek: float = Field(..., ge=0, le=60)
    previousGpa: float = Field(..., ge=0, le=10)
    quizAverage: float = Field(..., ge=0, le=100)
    lateSubmissions: int = Field(0, ge=0)
    learningActivityScore: float = Field(..., ge=0, le=100)
    lmsParticipation: float = Field(..., ge=0, le=100)
    previousSemesterScore: float = Field(..., ge=0, le=100)

class ExplanationFeatureSchema(BaseModel):
    featureName: str
    displayName: str
    inputValue: Any
    impactValue: float
    direction: str
    explanationMethod: str
    humanDescription: str

class RecommendationSchema(BaseModel):
    id: str
    studentId: str
    recommendationArea: str
    actionText: str
    priority: str
    reason: str
    completed: bool = False

class PredictionResponse(BaseModel):
    id: str
    studentId: str
    studentName: str
    predictedScore: float
    riskLevel: str
    riskProbability: float
    selectedModelName: str
    modelVersion: str
    featuresUsed: dict
    engineeredFeatures: dict
    explanations: dict
    recommendations: List[RecommendationSchema]
    predictionTimestamp: str

class InterventionCreate(BaseModel):
    studentId: str
    studentName: str
    department: str
    facultyName: str
    interventionType: str
    notes: str
    status: str = "Pending"
