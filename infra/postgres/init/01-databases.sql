-- 각 서비스는 자기 데이터베이스만 소유해 다른 서비스의 테이블을 직접 조회하지 않습니다.
-- DB 이름은 각 서비스 application.yml의 기본 접속 주소와 같습니다. 이 스크립트는 볼륨을 처음 만들 때만 실행됩니다.
CREATE DATABASE matdagong_community OWNER mdg;
CREATE DATABASE matdagong_places OWNER mdg;
