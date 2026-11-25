-- V1에 적용한 프로필 테이블 이름을 서비스의 역할이 분명한 이름으로 정리합니다.
ALTER TABLE taster_profiles RENAME TO user_profiles;

-- 테이블 이름과 제약 조건 이름도 함께 맞춰 DB 도구에서 알아보기 쉽게 합니다.
ALTER TABLE user_profiles
    RENAME CONSTRAINT uk_taster_profiles_nickname TO uk_user_profiles_nickname;
ALTER TABLE user_profiles
    RENAME CONSTRAINT ck_taster_profiles_visibility TO ck_user_profiles_visibility;

COMMENT ON TABLE user_profiles IS '맛다공에서 사용하는 공통 계정별 프로필.';
