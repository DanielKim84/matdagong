package kr.matdagong.place.api;

/** 장소를 빠른 기록에 담기 전에 기존 맛집 기록과 겹치는지 알려줍니다. */
public record QuickPlaceDuplicateView(boolean alreadyRegistered, boolean alreadySaved, String placeName) {}
