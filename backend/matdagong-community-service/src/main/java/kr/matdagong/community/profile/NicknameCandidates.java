package kr.matdagong.community.profile;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/** 프로필을 처음 만들 때 로그인 계정 이름에서 자동으로 정하는 닉네임 후보입니다. 앞 후보가 겹치면 다음 후보를 씁니다. */
final class NicknameCandidates {
    /** user_profiles.nickname 칼럼 길이입니다. */
    private static final int MAX_STORED_NICKNAME_LENGTH = 30;
    /** 닉네임이 겹칠 때 붙이는 접미사(계정 ID 앞자리·무작위 16진수) 글자 수입니다. */
    private static final int SUFFIX_LENGTH = 6;
    /** 요청한 닉네임이 공백뿐일 때 쓰는 기본 닉네임입니다. */
    private static final String DEFAULT_NICKNAME = "맛객";

    private NicknameCandidates() {}

    /**
     * 요청한 이름, 계정 ID 앞자리를 붙인 이름, 그마저 겹칠 때(앞자리가 같은 다른 계정이나 그 이름을 직접 고른 사람) 쓸
     * 무작위 접미사 이름 순서입니다.
     */
    static List<String> of(UUID accountId, String requestedNickname) {
        String base = requestedNickname.isBlank() ? DEFAULT_NICKNAME : requestedNickname;
        int randomSuffix = ThreadLocalRandom.current().nextInt(1 << (4 * SUFFIX_LENGTH));
        return List.of(
                withSuffix(base, ""),
                withSuffix(base, "-" + accountId.toString().substring(0, SUFFIX_LENGTH)),
                withSuffix(base, "-" + String.format("%0" + SUFFIX_LENGTH + "x", randomSuffix)));
    }

    private static String withSuffix(String base, String suffix) {
        int prefixLength = MAX_STORED_NICKNAME_LENGTH - suffix.length();
        return base.substring(0, Math.min(base.length(), prefixLength)) + suffix;
    }
}
