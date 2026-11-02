package kr.matdagong.common.http;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** 다른 서비스·외부 API를 부르는 RestClient를 같은 방식(연결·응답 대기 시간 제한)으로 만듭니다. */
public final class RestClients {
    private RestClients() {}

    /** 상대 서버가 응답하지 않아도 요청 스레드가 오래 묶이지 않도록 두 시간 제한을 모두 둡니다. */
    public static RestClient create(String baseUrl, Duration connectTimeout, Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }
}
