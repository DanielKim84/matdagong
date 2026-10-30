package kr.matdagong.place.api;

import java.time.OffsetDateTime;

/** 로그인 사용자가 저장한 임시 장소의 검색 결과와 저장 시각입니다. */
public record QuickPlaceDraftView(String providerCode, String providerPlaceId, String placeName, String category, String address,
        double latitude, double longitude, String providerPhone, String providerUrl,
        String roadAddress, String lotAddress, OffsetDateTime savedAt) {}
