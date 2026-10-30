package kr.matdagong.community.profile;

/** 태그 사전은 세부 그룹(tag_group)만 저장하므로, API의 MENU/VISIT 상위 분류는 여기서 계산합니다. */
final class TasteTagGroups {
    private TasteTagGroups() {}

    static String categoryFor(String tagGroup) {
        return "VISIT".equals(tagGroup) ? "VISIT" : "MENU";
    }
}
