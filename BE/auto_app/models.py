from django.db import models
from django.contrib.auth.models import AbstractUser

# 사용자 모델을 People로 변경
class People(AbstractUser):
    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # 필수 필드

    @property
    def id(self):  # ✅ JWT 내부용 id alias
        return self.user_id

    def __str__(self):
        return f"{self.username} ({self.email})"

    class Meta:
        db_table = "people"



# 기획서(프로젝트)
class Project(models.Model):
    project_id = models.AutoField(primary_key=True)  # ✅ 추가
    user = models.ForeignKey(People, on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# 기능 초안 (Gemini 1/2)
class RequirementDraft(models.Model):
    RequirementDraft_id = models.AutoField(primary_key=True)
    
    SOURCE_CHOICES = [
        ('gemini_1', 'Gemini 1 (GAN)'),
        ('gemini_2', 'Gemini 2 (A2A)'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    
    content = models.TextField(blank=True, null=True)  # Gemini가 생성한 전체 내용 저장
    generated_by = models.CharField(max_length=20, blank=True, null=True)

    feature_name = models.CharField(max_length=100)
    summary = models.TextField()
    score_by_model = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def id(self):
        return self.RequirementDraft_id

    def __str__(self):
        name = self.feature_name or "기능명 없음"
        src = self.source or "출처 없음"
        return f"[{src}] {name}"




# 확정된 기능 명세서
class Requirement(models.Model):
    Requirement = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    feature_name = models.CharField(max_length=255)
    summary = models.TextField()
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=20, blank=True, null=True)
    score_by_model = models.FloatField(blank=True, null=True)
    selected_from_draft = models.ForeignKey(RequirementDraft, on_delete=models.SET_NULL, null=True, blank=True)
    confirmed_by_user = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.feature_name


# 유사 오픈소스 (참고용)
class SimilarProject(models.Model):
    SimilarProject = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    repo_name = models.CharField(max_length=100)
    repo_url = models.URLField()
    language = models.CharField(max_length=50)
    stars = models.IntegerField()
    similarity_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.repo_name


# 팀원
class TeamMember(models.Model):
    TeamMember = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    role = models.CharField(max_length=50)
    skills = models.TextField()
    email = models.EmailField()

    def __str__(self):
        return f"{self.name} ({self.role})"


# 업무 분담
class TaskAssignment(models.Model):
    TaskAssignment = models.AutoField(primary_key=True)
    requirement = models.ForeignKey(Requirement, on_delete=models.CASCADE)
    member = models.ForeignKey(TeamMember, on_delete=models.CASCADE)
    auto_assigned = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.requirement.feature_name} → {self.member.name}"


# 개발 기간
class ProjectTimeline(models.Model):
    ProjectTimeline = models.AutoField(primary_key=True)
    project = models.OneToOneField(Project, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Timeline for {self.project.title}"


# 결과물 문서 (PDF 등)
class OutputDocument(models.Model):
    OutputDocument = models.AutoField(primary_key=True)
    DOC_TYPE_CHOICES = [
        ('기능명세서', '기능명세서'),
        ('업무분단표', '업무분단표'),
        ('로드맥', '로드맥'),
        ('간트차트', '간트차트'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    file_path = models.CharField(max_length=255)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.doc_type} - {self.project.title}"

# models.py (하단에 추가)

class GanttChart(models.Model):
    GanttChart = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="gantt_charts")

    # 메타
    start_date = models.DateField()                 # 간트 시작 기준일
    total_weeks = models.PositiveIntegerField()     # 전체 주차 수
    parts = models.JSONField(default=list)          # ["백엔드","프론트엔드", ...]  ※ MySQL JSON 지원 필요
    generated_by = models.CharField(max_length=20, default="gemini_3")
    source_text = models.TextField(blank=True, null=True)  # LLM 원문 보관(선택)
    version = models.PositiveIntegerField(default=1)        # 버전관리(버튼 눌러 새로 생성 시 +1)
    file_path = models.CharField(max_length=255, blank=True, null=True)  # 생성된 .xlsx 상대경로
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gantt v{self.version} - {self.project.title}"


class GanttTask(models.Model):
    GanttTask = models.AutoField(primary_key=True)
    gantt_chart = models.ForeignKey(GanttChart, on_delete=models.CASCADE, related_name="tasks")

    # Requirement 연결은 선택(없어도 작업 가능)
    requirement = models.ForeignKey(Requirement, on_delete=models.SET_NULL, null=True, blank=True)

    part = models.CharField(max_length=50)                    # "백엔드" 등
    feature_name = models.CharField(max_length=255)           # 작업명
    start_week = models.PositiveIntegerField(default=1)       # 시작 주차(1부터)
    duration_weeks = models.PositiveIntegerField(default=1)   # 기간(주 단위)

    # 필요 시 날짜로도 저장(선택)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    order = models.PositiveIntegerField(default=0)            # 같은 파트 내 정렬
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["part", "order", "GanttTask"]

    def __str__(self):
        return f"[{self.part}] {self.feature_name}"
