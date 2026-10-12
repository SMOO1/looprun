package dev.looprun.api.geocode;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dev.looprun.api.route.RoutingUnavailableException;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Place search, proxied to Photon so the browser never talks to third parties directly. */
@RestController
@RequestMapping("/api/geocode")
class GeocodeController {

    private final RestClient client;

    GeocodeController(@Value("${looprun.photon.base-url}") String baseUrl,
                      @Value("${looprun.user-agent}") String userAgent) {
        var requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .build();
    }

    @GetMapping
    List<Place> search(@RequestParam @Size(min = 2, max = 120) String q,
                       @RequestParam(required = false) Double lat,
                       @RequestParam(required = false) Double lng) {
        Response response;
        try {
            response = client.get()
                    .uri(uri -> {
                        uri.path("/api/").queryParam("q", q).queryParam("limit", 5);
                        if (lat != null && lng != null) {
                            // Bias results towards what the map is currently showing.
                            uri.queryParam("lat", lat).queryParam("lon", lng);
                        }
                        return uri.build();
                    })
                    .retrieve()
                    .body(Response.class);
        } catch (RestClientException e) {
            throw new RoutingUnavailableException(e);
        }
        if (response == null || response.features() == null) {
            return List.of();
        }
        return response.features().stream()
                .filter(f -> f.geometry() != null && f.geometry().coordinates().size() >= 2)
                .map(GeocodeController::toPlace)
                .toList();
    }

    private static Place toPlace(Feature feature) {
        Map<String, Object> p = feature.properties() == null ? Map.of() : feature.properties();
        String street = Stream.of(p.get("housenumber"), p.get("street"))
                .filter(Objects::nonNull).map(Object::toString).collect(Collectors.joining(" "));
        String name = Stream.of(p.get("name"), street.isEmpty() ? null : street, p.get("city"), p.get("country"))
                .filter(Objects::nonNull).map(Object::toString).findFirst().orElse("Unnamed place");
        String detail = Stream.of(street.isEmpty() ? null : street, p.get("city"), p.get("state"), p.get("country"))
                .filter(Objects::nonNull).map(Object::toString)
                .filter(part -> !part.equals(name))
                .distinct()
                .collect(Collectors.joining(", "));
        List<Double> c = feature.geometry().coordinates();
        return new Place(name, detail, c.get(1), c.get(0));
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Response(List<Feature> features) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Feature(Map<String, Object> properties, Geometry geometry) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Geometry(List<Double> coordinates) {
    }
}
