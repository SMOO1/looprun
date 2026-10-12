package dev.looprun.api.route;

import dev.looprun.api.geo.LatLng;

import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;

/**
 * A rough loop through the start point: a circle heading off in a random direction, with
 * its via points nudged off the perfect circle so two runs from the same spot differ.
 *
 * The shape is fixed once created; only its size changes between routing attempts, which
 * lets the caller scale it until the routed distance matches the target.
 */
final class LoopShape {

    private static final int VIA_POINTS = 3;
    private static final double RADIUS_JITTER = 0.2;
    private static final double ANGLE_JITTER_DEG = 12;

    private final double headingDeg;
    private final int direction;
    private final double[] radiusFactors = new double[VIA_POINTS];
    private final double[] angleOffsetsDeg = new double[VIA_POINTS];

    LoopShape(RandomGenerator random) {
        this.headingDeg = random.nextDouble(360);
        this.direction = random.nextBoolean() ? 1 : -1;
        for (int i = 0; i < VIA_POINTS; i++) {
            radiusFactors[i] = 1 + random.nextDouble(-RADIUS_JITTER, RADIUS_JITTER);
            angleOffsetsDeg[i] = random.nextDouble(-ANGLE_JITTER_DEG, ANGLE_JITTER_DEG);
        }
    }

    /** Start, via points, and start again, for a loop of roughly the given circumference. */
    List<LatLng> waypoints(LatLng start, double circumferenceMeters) {
        double radius = circumferenceMeters / (2 * Math.PI);
        LatLng centre = start.destination(headingDeg, radius);
        double bearingToStart = headingDeg + 180;
        double step = 360.0 / (VIA_POINTS + 1);

        List<LatLng> points = new ArrayList<>(VIA_POINTS + 2);
        points.add(start);
        for (int i = 0; i < VIA_POINTS; i++) {
            double bearing = bearingToStart + direction * (step * (i + 1) + angleOffsetsDeg[i]);
            points.add(centre.destination(bearing, radius * radiusFactors[i]));
        }
        points.add(start);
        return points;
    }
}
