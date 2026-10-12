package dev.looprun.api.route;

import dev.looprun.api.geo.LatLng;

import java.util.List;
import java.util.Optional;

public interface Router {

    /** Walking path through the waypoints in order, or empty if they can't be connected. */
    Optional<Path> route(List<LatLng> waypoints);

    record Path(double distanceMeters, List<LatLng> points) {
    }
}
