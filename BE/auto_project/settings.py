from pathlib import Path
import os
import mimetypes                # ✅ 추가: xlsx MIME 보정용
from datetime import timedelta  # ✅ 유지
from dotenv import load_dotenv

# 🔹 .env 로드
load_dotenv()

# 🔹 기본 경로
BASE_DIR = Path(__file__).resolve().parent.parent

# 🔹 보안 설정
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'unsafe-secret-key')
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

# 🔹 앱 등록
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 서드파티
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',

    # 로컬 앱
    'auto_app',
]

# 🔹 미들웨어
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS 먼저 위치해야 함
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 🔹 URL 및 WSGI 설정
ROOT_URLCONF = 'auto_project.urls'
WSGI_APPLICATION = 'auto_project.wsgi.application'

# 🔹 템플릿
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# 🔹 데이터베이스 설정 (MySQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'autodb',
        'USER': 'manager',
        'PASSWORD': '1234',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}

# 🔹 사용자 모델 설정
AUTH_USER_MODEL = 'auto_app.People'

# 🔹 패스워드 정책
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# 🔹 언어 및 시간 설정
LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# 🔹 정적/미디어 파일
STATIC_URL = '/static/'
# STATIC_ROOT = BASE_DIR / 'staticfiles'   # (배포 시 선택)

# ✅ 추가: 미디어 경로/URL (G1/G2 파일 저장 경로)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ✅ 추가: xlsx MIME 보정 (로컬/윈도우 등 환경에서 필요할 수 있음)
mimetypes.add_type(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsx', True
)

# 🔹 기본 자동 필드
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 🔹 CORS 허용
CORS_ALLOW_ALL_ORIGINS = True
# ✅ 추가: 파일 다운로드 시 파일명 헤더 노출(프론트 fetch에서 읽기 위함)
CORS_EXPOSE_HEADERS = ['Content-Disposition','Content-Disposition', 'Content-Type']
SECURE_CONTENT_TYPE_NOSNIFF = True    

# 🔹 REST Framework 설정 (JWT 포함)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# 🔹 Gemini API 키 환경변수
GEMINI_API_KEY_1 = os.getenv('GEMINI_API_KEY_1')
GEMINI_API_KEY_2 = os.getenv('GEMINI_API_KEY_2')
GEMINI_API_KEY_3 = os.getenv('GEMINI_API_KEY_3')

# 🔹 Simple JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),  # ✅ ACCESS 토큰 30분
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "USER_ID_FIELD": "user_id",
    "USER_ID_CLAIM": "user_id",
}
