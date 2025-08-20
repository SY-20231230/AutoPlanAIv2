# auto_app/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    # Auth / User
    SignupView, LoginView, UserInfoView, EmailCheckView, LatestGanttTasksView,
    ChatbotView, IdeaPreviewView, IdeaFileDownloadView,

    # Final Dev Docs
    FinalDevDocGenerateView, FinalDevDocFilesView,

    # Project & Drafts (Gemini 1/2)
    ProjectCreateView, Gemini1GenerateView, Gemini2RefineView,
    RequirementDraftListView, FinalizeRequirementView, ProjectDeleteView,
    ProjectRegisterFromFileView, ProjectG1XlsxDownloadView, ProjectG2XlsxDownloadView,

    # Similar Projects (Gemini 3)
    Gemini3RecommendView, SimilarProjectListView,
    ProjectReportRawView, ProjectReportRawByNameView,

    # Gantt Chart / Outputs
    GanttChartGenerateView, GanttChartDownloadView, GanttChartListView, GanttChartDownloadByNameView,
    OutputDocumentListView,

    # Team Members & Assignment
    TeamMemberCreateView, TeamMemberListView, TeamMemberUpdateView,
    TeamMemberDeleteView, TeamMemberDetailView, AutoAssignTasksView,

    # Overview / Lists / Trees / Details
    SidebarProjectsView, ProjectOverviewView,
    ConfirmedRequirementListView, ConfirmedAndSimilarView,
    SidebarTreeAllView, SidebarTreeProjectView,
    RequirementDraftDetailView, RequirementDetailView,

    # Idea → Plan
    IdeaProcessView, IdeaExportView, IdeaFromConfirmedRequirementsView,

    # 확정본 기반 생성 세트
    ProjectToolsProposeFromConfirmedView,
    ProjectGenerateSQLFromConfirmedView,
    ProjectGenerateBackendFromConfirmedView,
    ProjectGenerateFrontendFromConfirmedView,
)

app_name = "auto_app"

urlpatterns = [
    # ───────────────────────────────
    # Auth & Account
    # ───────────────────────────────
    path("signup/",        SignupView.as_view(),       name="signup"),        # POST: 회원가입
    path("login/",         LoginView.as_view(),        name="login"),         # POST: 로그인
    path("userinfo/",      UserInfoView.as_view(),     name="userinfo"),      # GET: 사용자 정보 조회
    path("check-email/",   EmailCheckView.as_view(),   name="check-email"),   # POST: 이메일 중복 확인
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"), # JWT Refresh
    path("token/verify/",  TokenVerifyView.as_view(),  name="token-verify"),  # JWT Verify

    # ───────────────────────────────
    # Project & Requirements (Gemini 1/2)
    # ───────────────────────────────
    path("project/",                          ProjectCreateView.as_view(),   name="project-create"),     # POST: 프로젝트 생성
    path("project/register-from-file/",       ProjectRegisterFromFileView.as_view(), name="project-register-from-file"), # POST: 기획서 파일로 프로젝트 등록
    path("project/<int:project_id>/drafts/",  RequirementDraftListView.as_view(),    name="draft-list"), # GET: Draft 목록
    path("project/<int:project_id>/generate-gemini1/", Gemini1GenerateView.as_view(), name="gemini1-generate"), # POST: Gemini1 실행
    path("project/<int:project_id>/refine-gemini2/",   Gemini2RefineView.as_view(),   name="gemini2-refine"),   # POST: Gemini2 실행
    path("project/<int:project_id>/finalize/",         FinalizeRequirementView.as_view(), name="requirement-finalize"), # POST: 요구사항 확정
    path("project/<int:project_id>/",                  ProjectDeleteView.as_view(),   name="project-delete"),   # DELETE: 프로젝트 삭제
    path("project/<int:project_id>/download/g1/<str:ts>/", ProjectG1XlsxDownloadView.as_view(), name="g1-download"), # GET: G1 Excel 다운로드
    path("project/<int:project_id>/download/g2/<str:ts>/", ProjectG2XlsxDownloadView.as_view(), name="g2-download"), # GET: G2 Excel 다운로드

    # ───────────────────────────────
    # Similar OSS (Gemini 3)
    # ───────────────────────────────
    path("project/<int:project_id>/similar-projects/",      Gemini3RecommendView.as_view(),  name="gemini3-recommend"),     # POST: 유사 프로젝트 추천
    path("project/<int:project_id>/similar-projects/list/", SimilarProjectListView.as_view(), name="similar-project-list"), # GET: 유사 프로젝트 목록
    path("project/<int:project_id>/reports/latest/raw/",    ProjectReportRawView.as_view(),  name="report-latest-raw"),     # GET: 최신 원시 보고서
    path("project/<int:project_id>/reports/raw/<str:filename>/", ProjectReportRawByNameView.as_view(), name="report-raw-by-name"), # GET: 특정 원시 보고서

    # ───────────────────────────────
    # Gantt / Outputs
    # ───────────────────────────────
    path("project/<int:project_id>/gantt/",         GanttChartGenerateView.as_view(), name="gantt-generate"), # POST: 간트차트 생성
    path("gantt/download/<int:gantt_id>/",          GanttChartDownloadView.as_view(), name="gantt-download"), # GET: 간트차트 파일 다운로드
    path("project/<int:project_id>/gantt/list/",    GanttChartListView.as_view(),     name="gantt-list"),     # GET: 프로젝트별 간트 목록
    path("project/<int:project_id>/outputs/",       OutputDocumentListView.as_view(), name="output-list"),    # GET: 프로젝트 출력물 목록
    path("gantt/file/<path:filename>/",             GanttChartDownloadByNameView.as_view(), name="gantt-download-by-name"), # GET: 파일명으로 간트 다운로드
    path("project/<int:project_id>/gantt/latest/tasks/", LatestGanttTasksView.as_view(), name="gantt-latest-tasks"), # GET: 최신 간트 태스크

    # ───────────────────────────────
    # Team & Auto Assignment
    # ───────────────────────────────
    path("project/<int:project_id>/team-members/",                        TeamMemberListView.as_view(),   name="team-member-list"),   # GET
    path("project/<int:project_id>/team-members/create/",                 TeamMemberCreateView.as_view(), name="team-member-create"), # POST
    path("project/<int:project_id>/team-members/<int:member_id>/",        TeamMemberUpdateView.as_view(), name="team-member-update"), # PUT
    path("project/<int:project_id>/team-members/<int:member_id>/delete/", TeamMemberDeleteView.as_view(), name="team-member-delete"), # DELETE
    path("project/<int:project_id>/team-members/<int:member_id>/detail/", TeamMemberDetailView.as_view(), name="team-member-detail"), # GET
    path("project/<int:project_id>/assign-tasks/",                         AutoAssignTasksView.as_view(), name="auto-assign-tasks"),  # POST

    # ───────────────────────────────
    # Overview / Trees / Details
    # ───────────────────────────────
    path("sidebar/projects/",                      SidebarProjectsView.as_view(),      name="sidebar-projects"),       # GET: 사이드바 프로젝트 목록
    path("project/<int:project_id>/overview/",     ProjectOverviewView.as_view(),      name="project-overview"),       # GET: 프로젝트 개요
    path("project/<int:project_id>/requirements/confirmed/",             ConfirmedRequirementListView.as_view(), name="confirmed-requirements"), # GET
    path("project/<int:project_id>/requirements/confirmed-and-similar/", ConfirmedAndSimilarView.as_view(),      name="confirmed-and-similar"),   # GET
    path("sidebar/tree/",                          SidebarTreeAllView.as_view(),       name="sidebar-tree-all"),       # GET
    path("sidebar/project/<int:project_id>/tree/", SidebarTreeProjectView.as_view(),   name="sidebar-tree-project"),   # GET
    path("project/<int:project_id>/drafts/<int:draft_id>/", RequirementDraftDetailView.as_view(), name="draft-detail"), # GET: Draft 상세
    path("requirements/<int:req_id>/",             RequirementDetailView.as_view(),    name="requirement-detail"),     # GET: Requirement 상세

    # ───────────────────────────────
    # Idea → Plan
    # ───────────────────────────────
    path("idea/preview/",  IdeaPreviewView.as_view(),  name="idea-preview"),  # POST: 아이디어 미리보기 (JSON)
    path("idea/process/",  IdeaProcessView.as_view(),  name="idea-process"),  # POST: 아이디어 정제/확장 
    path("idea/export/",   IdeaExportView.as_view(),   name="idea-export"),   # POST: 아이디어 기획서 파일 생성
    path("idea/download/<str:filename>/", IdeaFileDownloadView.as_view(), name="idea-download"), # GET: 기획서 파일 다운로드
    path("project/<int:project_id>/idea/from-requirements/", IdeaFromConfirmedRequirementsView.as_view(), name="idea-from-reqs"), # POST: 확정된 요구사항 기반 기획서 생성

    # ───────────────────────────────
    # 확정본 기반 생성 세트 (코드/문서)
    # ───────────────────────────────
    path("project/<int:project_id>/tools/propose/",    ProjectToolsProposeFromConfirmedView.as_view(),   name="tools-propose"),   # POST
    path("project/<int:project_id>/generate/sql/",     ProjectGenerateSQLFromConfirmedView.as_view(),    name="gen-sql"),         # POST
    path("project/<int:project_id>/generate/backend/", ProjectGenerateBackendFromConfirmedView.as_view(),name="gen-backend"),     # POST
    path("project/<int:project_id>/generate/frontend/",ProjectGenerateFrontendFromConfirmedView.as_view(),name="gen-frontend"),   # POST

    # ───────────────────────────────
    # R&D Chatbot
    # ───────────────────────────────
    path("chat/", ChatbotView.as_view(), name="chatbot"), # POST: R&D용 챗봇 대화

    # 최종 개발문서 생성/목록
    path(
        "project/<int:project_id>/final-devdoc/generate/",
        FinalDevDocGenerateView.as_view(),
        name="final-devdoc-generate",
    ),
    path(
        "project/<int:project_id>/final-devdoc/files/",
        FinalDevDocFilesView.as_view(),
        name="final-devdoc-files",
    ),
]
