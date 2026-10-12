package dev.looprun.api.route;

import dev.looprun.api.geo.LatLng;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class RouteService {

    /** Streets wander, so a routed loop comes out longer than the circle it was drawn from. */
    private static final double INITIAL_SCALE = 0.8;
    private static final double TOLERANCE = 0.04;
    private static final int MAX_SHAPES = 3;
    private static final int MAX_RESIZES = 5;

    private final Router router;

    public RouteService(Router router) {
        this.router = router;
    }

    public RunRoute generate(LatLng start, double targetMeters, long seed) {
        Random random = new Random(seed);
        Router.Path best = null;

        for (int attempt = 0; attempt < MAX_SHAPES; attempt++) {
            Optional<Router.Path> candidate = fit(new LoopShape(random), start, targetMeters);
            if (candidate.isEmpty()) {
                continue;
            }
            if (best == null || error(candidate.get(), targetMeters) < error(best, targetMeters)) {
                best = candidate.get();
            }
            if (error(best, targetMeters) <= TOLERANCE) {
                break;
            }
        }

        if (best == null) {
            throw new NoRouteException();
        }
        List<double[]> coordinates = best.points().stream()
                .map(p -> new double[]{p.lat(), p.lng()})
                .toList();
        return new RunRoute(best.distanceMeters(), seed, coordinates);
    }

    /** Resizes one loop shape until its routed length is close to the target. */
    private Optional<Router.Path> fit(LoopShape shape, LatLng start, double targetMeters) {
        double scale = INITIAL_SCALE;
        Router.Path best = null;

        for (int i = 0; i < MAX_RESIZES; i++) {
            Optional<Router.Path> routed = router.route(shape.waypoints(start, targetMeters * scale));
            if (routed.isEmpty() || routed.get().distanceMeters() <= 0) {
                break;
            }
            Router.Path path = withoutSpurs(routed.get());
            if (best == null || error(path, targetMeters) < error(best, targetMeters)) {
                best = path;
            }
            if (error(path, targetMeters) <= TOLERANCE) {
                break;
            }
            scale *= targetMeters / path.distanceMeters();
        }
        return Optional.ofNullable(best);
    }

    /**
     * Via points often land down a side street, leaving a stub the route runs up and straight
     * back down. Drops those retraced stretches so the loop doesn't double back on itself.
     */
    static Router.Path withoutSpurs(Router.Path path) {
        List<LatLng> kept = new ArrayList<>(path.points().size());
        for (LatLng point : path.points()) {
            int size = kept.size();
            if (size >= 1 && samePlace(kept.get(size - 1), point)) {
                continue;
            }
            if (size >= 2 && samePlace(kept.get(size - 2), point)) {
                kept.remove(size - 1);
                continue;
            }
            kept.add(point);
        }
        if (kept.size() == path.points().size()) {
            return path;
        }
        double length = 0;
        for (int i = 1; i < kept.size(); i++) {
            length += kept.get(i - 1).distanceTo(kept.get(i));
        }
        return new Router.Path(length, kept);
    }

    private static boolean samePlace(LatLng a, LatLng b) {
        return a.distanceTo(b) < 1;
    }

    private static double error(Router.Path path, double targetMeters) {
        return Math.abs(path.distanceMeters() - targetMeters) / targetMeters;
    }
}
