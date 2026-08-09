package com.aiexception.explainer.controller;

import com.aiexception.explainer.service.FileExtractionException;
import com.aiexception.explainer.service.GroqApiException;
import com.aiexception.explainer.service.GroqNotConfiguredException;
import com.aiexception.explainer.service.InvalidAiResponseException;
import com.aiexception.explainer.service.InvalidModelException;
import com.aiexception.explainer.service.InvalidProviderException;
import com.aiexception.explainer.service.OllamaUnavailableException;
import com.aiexception.explainer.service.UnsupportedFileTypeException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Translates exceptions into consistent, friendly JSON error responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Invalid request");

        return build(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(OllamaUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleOllamaUnavailable(OllamaUnavailableException ex) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(GroqNotConfiguredException.class)
    public ResponseEntity<Map<String, Object>> handleGroqNotConfigured(GroqNotConfiguredException ex) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(GroqApiException.class)
    public ResponseEntity<Map<String, Object>> handleGroqApi(GroqApiException ex) {
        return build(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }

    @ExceptionHandler(InvalidAiResponseException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidAiResponse(InvalidAiResponseException ex) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    @ExceptionHandler(InvalidProviderException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidProvider(InvalidProviderException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(InvalidModelException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidModel(InvalidModelException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(UnsupportedFileTypeException.class)
    public ResponseEntity<Map<String, Object>> handleUnsupportedFileType(UnsupportedFileTypeException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(FileExtractionException.class)
    public ResponseEntity<Map<String, Object>> handleFileExtraction(FileExtractionException ex) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "The uploaded file exceeds the maximum allowed size (5MB).");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again.");
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
