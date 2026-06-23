# Slide Rectifier

로컬 브라우저에서 캡처 이미지의 발표 슬라이드 영역을 네 꼭짓점으로 지정하고 직사각형 PNG로 변환하는 도구입니다.

## 실행

```powershell
cd C:\Users\202100398-NB\OneDrive\Documents\Sandbox\slide-rectifier
python -m http.server 5173
```

브라우저에서 `http://localhost:5173`을 엽니다.

## 기능

- 이미지 파일 열기
- 클립보드 이미지 붙여넣기
- 브라우저 화면 캡처
- 네 꼭짓점 드래그 선택
- 자동, 16:9, 4:3, 직접 입력 출력 크기
- 원근 보정 PNG 저장
