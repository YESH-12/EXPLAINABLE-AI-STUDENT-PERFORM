import random
import pandas as pd
import numpy as np

DEPARTMENTS = [
    "Computer Science",
    "Data Science",
    "Information Technology",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Business Analytics"
]

FIRST_NAMES = ["Alex", "Maya", "Jordan", "Priya", "Liam", "Sofia", "Ethan", "Aria", "Noah", "Zoe", "Lucas", "Chloe", "Marcus", "Elena"]
LAST_NAMES = ["Rivera", "Patel", "Chen", "Sharma", "Johnson", "Gupta", "Kim", "Mendoza", "Taylor", "Wong", "Singh", "Al-Mansoor"]

def generate_synthetic_dataset(num_samples: int = 500, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    np.random.seed(seed)

    records = []
    for i in range(1, num_samples + 1):
        dept = random.choice(DEPARTMENTS)
        year = random.randint(1, 4)
        sem = ((year - 1) * 2) + random.randint(1, 2)
        f_name = random.choice(FIRST_NAMES)
        l_name = random.choice(LAST_NAMES)
        student_id = f"STU-{dept[:2].upper()}-{2024 - year}-{i:04d}"
        email = f"{f_name.lower()}.{l_name.lower()}{i}@university.edu"

        # Latent performance archetype
        rand_val = random.random()
        if rand_val < 0.22:
            base_score = random.uniform(40, 58) # High risk cluster
        elif rand_val < 0.70:
            base_score = random.uniform(60, 80) # Medium/normal cluster
        else:
            base_score = random.uniform(80, 96) # High achiever cluster

        attendance = np.clip(base_score + np.random.normal(0, 7), 35, 99)
        internal = np.clip(base_score + np.random.normal(0, 8), 25, 98)
        assignment = np.clip(base_score + np.random.normal(0, 6), 30, 99)
        study_hours = np.clip((base_score / 3.2) + np.random.normal(0, 3), 4, 45)
        gpa = np.clip((base_score / 10.2) + np.random.normal(0, 0.4), 4.0, 9.9)
        quiz = np.clip(base_score + np.random.normal(0, 7), 30, 98)
        late_subs = random.randint(1, 6) if base_score < 55 else (1 if random.random() < 0.25 else 0)
        learning_act = np.clip(base_score + np.random.normal(0, 6), 30, 99)
        lms = np.clip(attendance + np.random.normal(0, 7), 25, 99)
        prev_sem = np.clip((gpa * 10) + np.random.normal(0, 4), 30, 98)

        # Target calculation
        target = (
            0.26 * internal +
            0.22 * prev_sem +
            0.18 * attendance +
            0.14 * assignment +
            0.10 * quiz +
            0.06 * lms +
            0.04 * (study_hours * 2.2) -
            1.5 * late_subs +
            np.random.normal(0, 2)
        )
        final_score = np.clip(target, 25.0, 99.0)

        records.append({
            "student_id": student_id,
            "student_name": f"{f_name} {l_name}",
            "email": email,
            "department": dept,
            "academic_year": year,
            "semester": sem,
            "attendance_percentage": round(attendance, 1),
            "internal_marks": round(internal, 1),
            "assignment_performance": round(assignment, 1),
            "study_hours_per_week": round(study_hours, 1),
            "previous_gpa": round(gpa, 2),
            "quiz_average": round(quiz, 1),
            "late_submissions": int(late_subs),
            "learning_activity_score": round(learning_act, 1),
            "lms_participation": round(lms, 1),
            "previous_semester_score": round(prev_sem, 1),
            "final_score": round(final_score, 1),
        })

    return pd.DataFrame(records)

if __name__ == "__main__":
    df = generate_synthetic_dataset()
    df.to_csv("synthetic_student_data.csv", index=False)
    print(f"Generated {len(df)} synthetic student records.")
