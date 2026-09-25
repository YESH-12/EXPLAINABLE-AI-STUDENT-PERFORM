from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student") # student, faculty, admin
    department = Column(String, nullable=True)
    student_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, index=True, nullable=False)
    academic_year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    
    # Feature Inputs
    attendance_percentage = Column(Float, nullable=False)
    internal_marks = Column(Float, nullable=False)
    assignment_performance = Column(Float, nullable=False)
    study_hours_per_week = Column(Float, nullable=False)
    previous_gpa = Column(Float, nullable=False)
    quiz_average = Column(Float, nullable=False)
    late_submissions = Column(Integer, default=0)
    learning_activity_score = Column(Float, nullable=False)
    lms_participation = Column(Float, nullable=False)
    previous_semester_score = Column(Float, nullable=False)
    final_score = Column(Float, nullable=True)
    
    current_risk_level = Column(String, default="Medium Risk")
    latest_predicted_score = Column(Float, nullable=True)
    latest_prediction_date = Column(DateTime, nullable=True)
    mentor_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    predictions = relationship("Prediction", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="student", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    predicted_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    risk_probability = Column(Float, nullable=False)
    selected_model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # JSON or serialized explanations
    shap_base_value = Column(Float, nullable=True)
    explanations_json = Column(Text, nullable=True)
    recommendations_json = Column(Text, nullable=True)

    student = relationship("Student", back_populates="predictions")

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    student_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    faculty_id = Column(String, nullable=False)
    faculty_name = Column(String, nullable=False)
    intervention_type = Column(String, nullable=False)
    notes = Column(Text, nullable=False)
    status = Column(String, default="Pending") # Pending, In Progress, Resolved, Follow-up Needed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="interventions")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)
