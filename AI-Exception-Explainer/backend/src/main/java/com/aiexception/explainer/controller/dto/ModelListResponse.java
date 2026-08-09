package com.aiexception.explainer.controller.dto;

import java.util.List;

/**
 * Safe model-discovery response. Never contains secrets.
 */
public record ModelListResponse(
        String provider,
        List<ModelEntry> models,
        boolean available,
        String message
) {
    public record ModelEntry(String name) {
    }
}
