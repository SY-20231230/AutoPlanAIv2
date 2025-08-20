# admin.py
from django.contrib import admin
from django.utils.html import format_html

from .models import (
    People, Project, RequirementDraft, Requirement, SimilarProject,
    TeamMember, TaskAssignment, ProjectTimeline, OutputDocument,
    GanttChart, GanttTask,
)

# ───────────────────────── Project ─────────────────────────
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("project_id", "title", "user", "created_at")
    list_display_links = ("project_id", "title")
    search_fields = ("project_id", "title", "user__email", "user__username")
    ordering = ("-project_id",)
    list_filter = ("created_at",)


# ─────────────────────── RequirementDraft ───────────────────────
@admin.register(RequirementDraft)
class RequirementDraftAdmin(admin.ModelAdmin):
    list_display = ("draft_id", "project_id_col", "project_title", "creator",
                    "source", "created_at")
    list_display_links = ("draft_id", "project_title")
    search_fields = (
        "RequirementDraft_id", "feature_name",
        "project__project_id", "project__title",
        "project__user__email", "project__user__username",
    )
    list_filter = ("source", "created_at")
    ordering = ("-RequirementDraft_id",)
    list_select_related = ("project", "project__user")

    def draft_id(self, obj):
        return obj.RequirementDraft_id
    draft_id.short_description = "DRAFT ID"

    def project_id_col(self, obj):
        return getattr(obj.project, "project_id", None)
    project_id_col.short_description = "PROJECT ID"

    def project_title(self, obj):
        return getattr(obj.project, "title", "")
    project_title.short_description = "PROJECT"

    def creator(self, obj):
        u = obj.project.user
        return u.username or u.email
    creator.short_description = "CREATED BY"


# ───────────────────────── Requirement ─────────────────────────
@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ("Requirement", "project_id_col", "draft_id_col",
                    "feature_name", "summary")
    list_display_links = ("Requirement", "feature_name")
    search_fields = (
        "Requirement", "feature_name", "summary",
        "project__project_id", "selected_from_draft__RequirementDraft_id",
    )
    list_filter = ("source", "confirmed_by_user", "created_at")
    ordering = ("-Requirement",)
    list_select_related = ("project", "selected_from_draft")

    def project_id_col(self, obj):
        return getattr(obj.project, "project_id", None)
    project_id_col.short_description = "PROJECT ID"

    def draft_id_col(self, obj):
        d = getattr(obj, "selected_from_draft", None)
        return getattr(d, "RequirementDraft_id", None) if d else None
    draft_id_col.short_description = "DRAFT ID"


# ──────────────────────── SimilarProject ────────────────────────
@admin.register(SimilarProject)
class SimilarProjectAdmin(admin.ModelAdmin):
    list_display = ("SimilarProject", "project_id_col", "repo_link", "language",
                    "stars_fmt", "score_bar", "created_at")
    list_display_links = ("SimilarProject", "repo_link")
    search_fields = ("repo_name", "repo_url", "language",
                     "project__title", "project__project_id")
    list_filter = ("language", "project", "created_at")
    # ✅ 최신순(신규 생성된 PK가 위로 오도록)
    ordering = ("-SimilarProject",)
    list_select_related = ("project",)
    list_per_page = 50
    actions = ["dedupe_by_url"]

    def project_id_col(self, obj):
        return getattr(obj.project, "project_id", None)
    project_id_col.short_description = "PROJECT ID"

    def repo_link(self, obj):
        return format_html(
            '<a href="{}" target="_blank" rel="noopener">{}</a>',
            obj.repo_url, obj.repo_name
        )
    repo_link.short_description = "REPOSITORY"

    def stars_fmt(self, obj):
        return f"{int(obj.stars or 0):,}"
    stars_fmt.short_description = "STARS"

    def score_bar(self, obj):
        # 0~5 점수를 퍼센트 바 형태로 표시
        try:
            val = float(obj.similarity_score or 0.0)
        except Exception:
            val = 0.0
        pct = max(0.0, min(100.0, val * 100.0))
        pct_int = int(round(pct))
        return format_html(
            '<div style="width:110px;background:#eee;border-radius:6px;overflow:hidden;display:inline-block;vertical-align:middle;">'
            '<div style="height:10px;width:{}%;background:#3b82f6;"></div>'
            '</div>&nbsp;<span>{}%</span>',
            pct_int, pct_int
        )
    score_bar.short_description = "SIMILARITY (of 5)"

    @admin.action(description="중복 URL 정리(같은 프로젝트의 동일 URL은 최고 점수만 남김)")
    def dedupe_by_url(self, request, queryset):
        seen = {}
        deleted = 0
        for sp in queryset.order_by("-similarity_score", "-stars", "-SimilarProject"):
            key = (sp.project_id, sp.repo_url)
            if key in seen:
                sp.delete()
                deleted += 1
            else:
                seen[key] = True
        self.message_user(request, f"{deleted}개 중복 항목 정리됨.")


# ───────────────────── TeamMember / TaskAssignment (커스텀) ─────────────────────
@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = (
        "tm_id",           # 팀원 PK
        "project_id_col",  # 프로젝트 ID
        "project_title",   # 프로젝트 제목
        "name",
        "role",
        "email",
        "skills_short",
    )
    list_display_links = ("tm_id", "name")
    search_fields = (
        "name", "role", "email", "skills",
        "project__project_id", "project__title",
        "project__user__email", "project__user__username",
    )
    list_filter = ("project",)
    ordering = ("project__project_id", "name")
    list_select_related = ("project",)

    def tm_id(self, obj):
        # PK 필드명이 TeamMember 또는 id 인 케이스 모두 대응
        return getattr(obj, "TeamMember", getattr(obj, "pk", None))
    tm_id.short_description = "TEAM MEMBER ID"

    def project_id_col(self, obj):
        return getattr(obj.project, "project_id", None)
    project_id_col.short_description = "PROJECT ID"

    def project_title(self, obj):
        return getattr(obj.project, "title", "")
    project_title.short_description = "PROJECT"

    def skills_short(self, obj):
        s = (obj.skills or "").strip()
        return (s[:40] + "…") if len(s) > 40 else s
    skills_short.short_description = "SKILLS"


@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "ta_id",           # 배정 PK
        "project_id_col",  # 프로젝트 ID (requirement.project 우선)
        "requirement_name",
        "member_name",
        "auto_assigned",
    )
    list_display_links = ("ta_id", "requirement_name")
    search_fields = (
        "member__name", "member__role", "member__email",
        "requirement__feature_name", "requirement__summary",
        "member__project__project_id", "member__project__title",
    )
    list_filter = ("member__project", "auto_assigned")
    ordering = ("member__project__project_id",)
    list_select_related = ("member", "member__project", "requirement", "requirement__project")

    def ta_id(self, obj):
        return getattr(obj, "TaskAssignment", getattr(obj, "pk", None))
    ta_id.short_description = "ASSIGN ID"

    def project_id_col(self, obj):
        # requirement.project 우선, 없으면 member.project
        p = getattr(obj.requirement, "project", None) or getattr(obj.member, "project", None)
        return getattr(p, "project_id", None)
    project_id_col.short_description = "PROJECT ID"

    def requirement_name(self, obj):
        r = getattr(obj, "requirement", None)
        return getattr(r, "feature_name", str(r))
    requirement_name.short_description = "REQUIREMENT"

    def member_name(self, obj):
        m = getattr(obj, "member", None)
        return getattr(m, "name", str(m))
    member_name.short_description = "ASSIGNED TO"


# ────────────────────── Other simple tables ─────────────────────
admin.site.register(People)
admin.site.register(ProjectTimeline)
admin.site.register(OutputDocument)
admin.site.register(GanttChart)
admin.site.register(GanttTask)
