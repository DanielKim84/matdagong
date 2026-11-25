"""프로젝트의 화면 설계 자료와 현재 브랜드 자산을 전달용 ZIP으로 묶습니다."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUTPUT = HERE / "matdagong-uiux-handoff.zip"
PREFIX = Path("matdagong-uiux-handoff")


def package():
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED) as archive:
        for directory, destination in [
            (HERE, PREFIX),
            (ROOT / "frontend/public/assets/brand", PREFIX / "brand"),
        ]:
            for source in sorted(directory.rglob("*")):
                if not source.is_file():
                    continue
                if source.suffix in {".zip", ".pyc"} or "__pycache__" in source.parts:
                    continue
                archive.write(source, (destination / source.relative_to(directory)).as_posix())
    with ZipFile(OUTPUT) as archive:
        damaged = archive.testzip()
        if damaged:
            raise RuntimeError(f"압축 검증 실패: {damaged}")
        print(f"전달본 저장 완료: {OUTPUT} ({len(archive.namelist())}개 파일)")


if __name__ == "__main__":
    package()
