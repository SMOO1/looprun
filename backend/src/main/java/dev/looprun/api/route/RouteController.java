package dev.looprun.api.route;

import dev.looprun.api.geo.LatLng;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/route")
class RouteController {

    private final RouteService routes;

    RouteController(RouteService routes) {
        this.routes = routes;
    }

    @GetMapping
    RunRoute generate(@RequestParam @DecimalMin("-85") @DecimalMax("85") double lat,
                      @RequestParam @DecimalMin("-180") @DecimalMax("180") double lng,
                      @RequestParam @DecimalMin("1") @DecimalMax("50") double km,
                      @RequestParam(required = false) Long seed) {
        long routeSeed = seed != null ? seed : ThreadLocalRandom.current().nextLong(1L << 40);
        return routes.generate(new LatLng(lat, lng), km * 1000, routeSeed);
    }
}
