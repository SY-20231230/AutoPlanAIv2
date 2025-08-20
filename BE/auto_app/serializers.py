from rest_framework import serializers
from .models import (
    People, Project, RequirementDraft, Requirement,
    SimilarProject, TeamMember, TaskAssignment,
    ProjectTimeline, OutputDocument,GanttChart, GanttTask,
)
from django.contrib.auth.hashers import make_password


# 🔹 사용자
# serializers.py
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import People

# 조회용 (userinfo)
class UserSerializer(serializers.ModelSerializer):
    joined = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = People
        fields = ['user_id', 'email', 'username', 'joined']

# 회원가입용 (signup)
class SignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = People
        fields = ['email', 'username', 'password']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)



# 🔹 기획서 (사용자는 request.user로 자동 설정)
class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        extra_kwargs = {
            'user': {'read_only': True}
        }


# 🔹 Gemini 기능 초안
class RequirementDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequirementDraft
        fields = '__all__'


# 🔹 확정된 기능 명세서
class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = '__all__'


# 🔹 유사 오픈소스
class SimilarProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimilarProject
        fields = '__all__'


# 🔹 팀원
class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMember
        fields = '__all__'


# 🔹 업무 분배
class TaskAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = '__all__'


# 🔹 개발 기간
class ProjectTimelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTimeline
        fields = '__all__'


# 🔹 산출물
class OutputDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutputDocument
        fields = '__all__'
        
# 🔹 간트차트 (헤더)
class GanttChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = GanttChart
        fields = '__all__'


# 🔹 간트 작업(행)
class GanttTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = GanttTask
        fields = '__all__'