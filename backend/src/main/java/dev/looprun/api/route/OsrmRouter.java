package dev.looprun.api.route;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dev.looprun.api.geo.LatLng;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
class OsrmRouter implements Router {

    private final RestClient client;
    private final String baseUrl;

    OsrmRouter(@Value("${looprun.osrm.base-url}") String baseUrl,
               @Value("${looprun.user-agent}") String userAgent) {
        var requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        // The public OSRM server answers "deflate" with a raw stream the JDK can't inflate.
        requestFactory.enableCompression(false);
        this.baseUrl = baseUrl;
        this.client = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .build();
    }

    @Override
    public Optional<Path> route(List<LatLng> waypoints) {
        String coordinates = waypoints.stream()
                .map(p -> String.format(Locale.ROOT, "%.6f,%.6f", p.lng(), p.lat()))
                .collect(Collectors.joining(";"));
        // continue_straight=false lets the route turn around at a via point instead of
        // detouring around the block to keep its heading.
        URI uri = URI.create(baseUrl + "/route/v1/foot/" + coordinates
                + "?overview=full&geometries=geojson&continue_straight=false");

        Response response;
        try {
            response = client.get().uri(uri).retrieve().body(Response.class);
        } catch (HttpClientErrorException.BadRequest e) {
            // OSRM answers 400 with NoRoute / NoSegment when the points can't be joined.
            return Optional.empty();
        } catch (RestClientException e) {
            throw new RoutingUnavailableException(e);
        }

        if (response == null || response.routes() == null || response.routes().isEmpty()) {
            return Optional.empty();
        }
        Route route = response.routes().getFirst();
        List<LatLng> points = route.geometry().coordinates().stream()
                .map(c -> new LatLng(c.get(1), c.get(0)))
                .toList();
        return Optional.of(new Path(route.distance(), points));
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Response(List<Route> routes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Route(double distance, Geometry geometry) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Geometry(List<List<Double>> coordinates) {
    }
}
