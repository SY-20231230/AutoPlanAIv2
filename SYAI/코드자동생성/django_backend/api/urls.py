from django.urls import path
from . import views

urlpatterns = [
	path("docs/upload", views.upload_docs, name="upload_docs"),
	path("tools/propose", views.propose_tools, name="propose_tools"),
	path("generate/sql", views.generate_sql, name="generate_sql"),
	path("generate/backend", views.generate_backend, name="generate_backend"),
	path("generate/frontend", views.generate_frontend, name="generate_frontend"),
]









