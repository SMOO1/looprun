package dev.looprun.api.route;

import dev.looprun.api.geo.LatLng;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RouteServiceTest {

    private static final LatLng START = new LatLng(43.4723, -80.5449);

    /** Joins waypoints with straight lines, stretched by a fixed detour factor. */
    private static Router straightLineRouter(double detourFactor) {
        return waypoints -> {
            double length = 0;
            for (int i = 1; i < waypoints.size(); i++) {
                length += waypoints.get(i - 1).distanceTo(waypoints.get(i));
            }
            return Optional.of(new Router.Path(length * detourFactor, waypoints));
        };
    }

    @Test
    void resizesTheLoopUntilItMatchesTheTargetDistance() {
        RouteService service = new RouteService(straightLineRouter(1.6));

        RunRoute route = service.generate(START, 10_000, 7);

        assertThat(route.distanceMeters()).isBetween(9_600.0, 10_400.0);
    }

    @Test
    void loopStartsAndEndsAtTheStartPoint() {
        RouteService service = new RouteService(straightLineRouter(1.3));

        List<double[]> coordinates = service.generate(START, 5_000, 1).coordinates();

        assertThat(coordinates.getFirst()).containsExactly(START.lat(), START.lng());
        assertThat(coordinates.getLast()).containsExactly(START.lat(), START.lng());
    }

    @Test
    void sameSeedGivesTheSameRouteAndDifferentSeedsDiffer() {
        RouteService service = new RouteService(straightLineRouter(1.3));

        RunRoute first = service.generate(START, 5_000, 42);
        RunRoute again = service.generate(START, 5_000, 42);
        RunRoute other = service.generate(START, 5_000, 43);

        assertThat(again.coordinates().get(1)).containsExactly(first.coordinates().get(1));
        assertThat(other.coordinates().get(1)).isNotEqualTo(first.coordinates().get(1));
    }

    @Test
    void failsWhenNothingCanBeRouted() {
        RouteService service = new RouteService(waypoints -> Optional.empty());

        assertThatThrownBy(() -> service.generate(START, 5_000, 1))
                .isInstanceOf(NoRouteException.class);
    }

    @Test
    void dropsStretchesTheRouteRunsUpAndStraightBackDown() {
        LatLng a = START;
        LatLng b = a.destination(90, 200);
        LatLng spurMid = b.destination(0, 100);
        LatLng spurTip = b.destination(0, 180);
        LatLng c = b.destination(90, 200);
        Router.Path path = new Router.Path(760, List.of(a, b, spurMid, spurTip, spurMid, b, c));

        Router.Path trimmed = RouteService.withoutSpurs(path);

        assertThat(trimmed.points()).containsExactly(a, b, c);
        assertThat(trimmed.distanceMeters()).isCloseTo(400, org.assertj.core.data.Offset.offset(1.0));
    }
}
