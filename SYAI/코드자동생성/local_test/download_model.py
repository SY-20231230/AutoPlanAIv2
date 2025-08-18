from huggingface_hub import snapshot_download

# 저장할 경로
local_dir = r"C:\Users\ysyhs\Desktop\코드자동생성\local_test"

# 허깅페이스 모델 레포 ID
repo_id = "gpt-oss/gpt-oss-20b"

# 다운로드 실행
snapshot_download(
    repo_id=repo_id,
    local_dir=local_dir,
    local_dir_use_symlinks=False,  # 실제 파일로 저장
    ignore_patterns=["*.safetensors.index.json"]  # 필요 없으면 제거
)

print(f"모델 다운로드 완료 → {local_dir}")
