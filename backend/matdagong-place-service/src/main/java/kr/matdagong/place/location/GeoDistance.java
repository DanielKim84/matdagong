package kr.matdagong.place.location;

/** 위경도 두 점 사이의 지표면 거리를 하버사인 공식으로 계산합니다. 1km 안팎의 거리에서는 오차가 몇 미터 이내입니다. */
public final class GeoDistance {
    /** WGS84 타원체를 같은 부피의 구로 본 평균 반지름입니다. */
    private static final double EARTH_RADIUS_METERS = 6_371_008.8;

    private GeoDistance() {}

    public static double meters(double fromLatitude, double fromLongitude, double toLatitude, double toLongitude) {
        double latitudeDelta = Math.toRadians(toLatitude - fromLatitude);
        double longitudeDelta = Math.toRadians(toLongitude - fromLongitude);
        double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(Math.toRadians(fromLatitude))
                        * Math.cos(Math.toRadians(toLatitude))
                        * Math.pow(Math.sin(longitudeDelta / 2), 2);
        // 부동소수 오차로 1을 조금 넘으면 asin이 NaN이 되므로 1로 자릅니다.
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
    }
}
