# auto_project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings                # ✅ 추가
from django.conf.urls.static import static      # ✅ 추가

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('auto_app.urls')),
]

# ✅ 개발 모드에서 /media/ 정적 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
