package dev.looprun.api.route;

public class NoRouteException extends RuntimeException {

    public NoRouteException() {
        super("No runnable loop found from this starting point");
    }
}
