package dev.looprun.api.route;

import java.util.List;

/** @param coordinates the loop as [lat, lng] pairs, starting and ending at the start point */
public record RunRoute(double distanceMeters, long seed, List<double[]> coordinates) {
}
