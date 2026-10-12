package dev.looprun.api.route;

public class RoutingUnavailableException extends RuntimeException {

    public RoutingUnavailableException(Throwable cause) {
        super("The routing service is not responding", cause);
    }
}
