package kr.matdagong.place.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import kr.matdagong.common.web.ApiErrors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/** 기록 작성자 프로필을 커뮤니티 서비스에서 가져오는 호출과 오류 변환을 확인합니다. */
class CommunityProfileClientTest {
    private static final String PROFILE_URL = "http://community-service/api/v1/users/me/profile";

    private MockRestServiceServer server;
    private CommunityProfileClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://community-service");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new CommunityProfileClient(builder.build());
    }

    @Test
    void 사용자_토큰으로_본인_프로필의_닉네임을_가져온다() {
        server.expect(requestTo(PROFILE_URL))
                .andExpect(header("Authorization", "Bearer user-token"))
                .andRespond(withSuccess(
                        "{\"nickname\": \"골목맛객\", \"avatarVariant\": 4, \"intro\": \"소개\"}",
                        MediaType.APPLICATION_JSON));

        CommunityProfileClient.AuthorProfile profile = client.findMyProfile("user-token");

        assertThat(profile.nickname()).isEqualTo("골목맛객");
    }

    @Test
    void 프로필이_없으면_409_장애면_503으로_알린다() {
        server.expect(requestTo(PROFILE_URL)).andRespond(withResourceNotFound());
        assertStatus(HttpStatus.CONFLICT, ApiErrors.PROFILE_REQUIRED);

        server.reset();
        server.expect(requestTo(PROFILE_URL)).andRespond(withServerError());
        assertStatus(HttpStatus.SERVICE_UNAVAILABLE, "프로필 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }

    @Test
    void 신고로_가려진_맛객이면_403으로_기록을_막는다() {
        server.expect(requestTo(PROFILE_URL))
                .andRespond(withSuccess(
                        "{\"nickname\": \"골목맛객\", \"avatarVariant\": 4, \"hiddenByReports\": true}",
                        MediaType.APPLICATION_JSON));
        assertStatus(HttpStatus.FORBIDDEN, CommunityProfileClient.HIDDEN_BY_REPORTS);
    }

    private void assertStatus(HttpStatus status, String detail) {
        assertThatThrownBy(() -> client.findMyProfile("user-token"))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(status);
                    assertThat(exception.getReason()).isEqualTo(detail);
                });
    }
}
