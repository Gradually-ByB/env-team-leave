# 환경팀 휴무관리 웹앱 PRD (Product Requirements Document)

Version: 1.0 Database: NeonDB (PostgreSQL Serverless) Scope: Full
Implementation (1\~4 단계 전체 포함)

------------------------------------------------------------------------

# 1. 프로젝트 개요

## 1.1 목적

환경팀 팀원들의 휴무를 모바일 중심 UX로 관리하고, 관리자는 PC 환경에서
대형 달력을 통해 전체 휴무 현황을 관리할 수 있는 웹앱 구축.

## 1.2 핵심 목표

-   모바일 친화적 UI
-   관리자 7:3 대시보드 레이아웃
-   NeonDB 기반 안정적 데이터 관리
-   JWT 인증 기반 보안 설계

------------------------------------------------------------------------

# 2. 시스템 아키텍처

Frontend: - React (Vite) 또는 Next.js

Backend: - Node.js + Express

Database: - NeonDB (PostgreSQL)

구조:

React/Next ↓ Express API ↓ NeonDB

------------------------------------------------------------------------

# 3. 데이터베이스 설계 (NeonDB)

## 3.1 users 테이블

CREATE TABLE users ( id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL,
role VARCHAR(20) NOT NULL DEFAULT 'member', password_hash TEXT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

role: - admin - member

## 3.2 leaves 테이블

CREATE TABLE leaves ( id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES
users(id) ON DELETE CASCADE, leave_type VARCHAR(20) NOT NULL,
leave_subtype VARCHAR(20), start_date DATE NOT NULL, end_date DATE NOT
NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

------------------------------------------------------------------------

# 4. 인증 설계

## 4.1 로그인 흐름

1.  이름 선택
2.  비밀번호 입력
3.  bcrypt 비교
4.  JWT 발급

JWT 만료: 4시간

------------------------------------------------------------------------

# 5. 관리자 기능

## 5.1 대시보드

레이아웃 비율: 7:3 (달력:오른쪽 카드)

Grid CSS: grid-template-columns: 7fr 3fr;

## 5.2 기능

-   월간 달력 표시
-   날짜별 휴무자 이름 표시
-   오른쪽 카드에 날짜별 휴무 요약
-   월 필터 기능

------------------------------------------------------------------------

# 6. 팀원 기능 (모바일 중심)

## 6.1 UI 구성

1.  월간 달력
2.  휴무 종류 선택
    -   연차(종일/기간)
    -   오전 반차
    -   오후 반차
    -   대체휴무
3.  휴무 등록 버튼
4.  나의 휴무 일정 카드
5.  ±7일 팀원 휴무 카드

## 6.2 휴무 등록 API

POST /api/leaves

Body: { leave_type, leave_subtype, start_date, end_date }

------------------------------------------------------------------------

# 7. API 설계

POST /api/auth/login POST /api/leaves GET /api/leaves?month=YYYY-MM GET
/api/leaves/my GET /api/leaves/week

------------------------------------------------------------------------

# 8. 보안 설계

-   bcrypt 암호화
-   JWT 인증
-   role 기반 접근 제어
-   NeonDB SSL 연결

------------------------------------------------------------------------

# 9. 프로젝트 구현 단계

## 1단계

NeonDB 연결 및 SQL 마이그레이션 구성

## 2단계

Express 서버 구축 - 인증 API - 휴무 CRUD API

## 3단계

React/Next 프론트엔드 구축 - 로그인 화면 - 관리자 대시보드 - 팀원 모바일
화면

## 4단계

배포 - Frontend: Vercel - Backend: Render - NeonDB Production Branch
생성

------------------------------------------------------------------------

# 10. 향후 확장

-   연차 잔여 자동 계산
-   휴무 중복 경고
-   승인 워크플로우
-   알림 시스템
-   개발/운영 DB 브랜치 분리

------------------------------------------------------------------------

End of Document
