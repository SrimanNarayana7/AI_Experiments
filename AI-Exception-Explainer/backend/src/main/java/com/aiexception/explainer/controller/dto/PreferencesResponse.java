package com.aiexception.explainer.controller.dto;

/**
 * Safe provider/configuration status. Never contains secrets.
 */
public record PreferencesResponse(
        String provider,
        boolean configured,
        String model
) {
}
