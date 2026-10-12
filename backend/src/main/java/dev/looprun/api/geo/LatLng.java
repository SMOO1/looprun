package dev.looprun.api.geo;

public record LatLng(double lat, double lng) {

    private static final double EARTH_RADIUS_M = 6_371_008.8;

    /** Point reached by travelling {@code meters} from here along an initial {@code bearingDeg}. */
    public LatLng destination(double bearingDeg, double meters) {
        double angular = meters / EARTH_RADIUS_M;
        double bearing = Math.toRadians(bearingDeg);
        double lat1 = Math.toRadians(lat);
        double lng1 = Math.toRadians(lng);

        double lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular)
                + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
        double lng2 = lng1 + Math.atan2(
                Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
                Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));

        return new LatLng(Math.toDegrees(lat2), normalizeLng(Math.toDegrees(lng2)));
    }

    public double distanceTo(LatLng other) {
        double dLat = Math.toRadians(other.lat - lat);
        double dLng = Math.toRadians(other.lng - lng);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(other.lat))
                * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
    }

    private static double normalizeLng(double lng) {
        return ((lng + 540) % 360) - 180;
    }
}
