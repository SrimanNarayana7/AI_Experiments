package com.aiexception.explainer.controller;

import com.aiexception.explainer.config.GroqProperties;
import com.aiexception.explainer.controller.dto.AnalyzeRequest;
import com.aiexception.explainer.controller.dto.AnalyzeResponse;
import com.aiexception.explainer.controller.dto.CompareRequest;
import com.aiexception.explainer.controller.dto.CompareResponse;
import com.aiexception.explainer.controller.dto.ModelAnalysisResultDto;
import com.aiexception.explainer.controller.dto.ModelListResponse;
import com.aiexception.explainer.controller.dto.PreferencesResponse;
import com.aiexception.explainer.domain.Analysis;
import com.aiexception.explainer.domain.LlmProvider;
import com.aiexception.explainer.service.AnalysisService;
import com.aiexception.explainer.service.ModelAnalysisResult;
import com.aiexception.explainer.service.extraction.FileExtractionService;
import com.aiexception.explainer.service.llm.LlmClient;
import com.aiexception.explainer.service.llm.LlmClientRegistry;
import com.aiexception.explainer.service.llm.ModelDiscovery;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * REST endpoints for analysis, model discovery and preferences.
 */
@RestController
@RequestMapping("/api")
public class AnalysisController {

    private final AnalysisService analysisService;
    private final LlmClientRegistry llmClientRegistry;
    private final FileExtractionService fileExtractionService;
    private final GroqProperties groqProperties;

    public AnalysisController(AnalysisService analysisService,
                              LlmClientRegistry llmClientRegistry,
                              FileExtractionService fileExtractionService,
                              GroqProperties groqProperties) {
        this.analysisService = analysisService;
        this.llmClientRegistry = llmClientRegistry;
        this.fileExtractionService = fileExtractionService;
        this.groqProperties = groqProperties;
    }

    /**
     * Analyzes pasted text, auto-detecting the input type.
     */
    @PostMapping("/analyze")
    public Mono<ResponseEntity<AnalyzeResponse>> analyze(@Valid @RequestBody AnalyzeRequest request) {
        LlmProvider provider = llmClientRegistry.resolve(request.provider());
        return analysisService.analyze(request.exception(), provider, request.model())
                .map(this::toResponse)
                .map(ResponseEntity::ok);
    }

    /**
     * Analyzes an uploaded file's extracted text through the same pipeline.
     */
    @PostMapping(value = "/analyze/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<AnalyzeResponse>> analyzeFile(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "provider", required = false) String providerName,
            @RequestParam(value = "model", required = false) String model) {
        String text = fileExtractionService.extract(file);
        LlmProvider provider = llmClientRegistry.resolve(providerName);
        return analysisService.analyze(text, provider, model)
                .map(this::toResponse)
                .map(ResponseEntity::ok);
    }

    /**
     * Compares analysis across multiple models of the active provider.
     */
    @PostMapping("/analyze/compare")
    public Mono<ResponseEntity<CompareResponse>> compare(@Valid @RequestBody CompareRequest request) {
        LlmProvider provider = llmClientRegistry.resolve(null); // active/default provider
        return analysisService.compare(request.exception(), provider, request.models())
                .map(results -> new CompareResponse(results.stream()
                        .map(this::toResultDto)
                        .toList()))
                .map(ResponseEntity::ok);
    }

    /**
     * Discovers models actually available for the given provider.
     */
    @GetMapping("/models")
    public Mono<ResponseEntity<ModelListResponse>> models(
            @RequestParam(value = "provider", defaultValue = "OLLAMA") String providerName) {
        LlmProvider provider = llmClientRegistry.resolve(providerName);
        LlmClient client = llmClientRegistry.forProvider(provider);
        return client.listModels()
                .map(this::toModelListResponse)
                .map(ResponseEntity::ok);
    }

    /**
     * Safe provider configuration status. Never returns secrets.
     */
    @GetMapping("/preferences")
    public ResponseEntity<PreferencesResponse> preferences() {
        LlmClient groqClient = llmClientRegistry.forProvider(LlmProvider.GROQ);
        boolean configured = groqClient.isConfigured();
        String model = configured && groqProperties.model() != null ? groqProperties.model() : null;
        return ResponseEntity.ok(new PreferencesResponse("GROQ", configured, model));
    }

    /**
     * Health check used by the frontend to detect backend availability.
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(new HealthResponse("UP"));
    }

    private AnalyzeResponse toResponse(Analysis analysis) {
        return new AnalyzeResponse(
                analysis.exceptionType(),
                analysis.rootCause(),
                analysis.technicalExplanation(),
                analysis.fix(),
                analysis.bestPractices() == null ? List.of() : analysis.bestPractices(),
                analysis.preventionTips() == null ? List.of() : analysis.preventionTips(),
                analysis.confidence().name(),
                analysis.analysisType(),
                analysis.sections() == null ? List.of() : analysis.sections()
        );
    }

    private ModelAnalysisResultDto toResultDto(ModelAnalysisResult result) {
        return new ModelAnalysisResultDto(
                result.provider(),
                result.model(),
                result.analysis(),
                result.error()
        );
    }

    private ModelListResponse toModelListResponse(ModelDiscovery discovery) {
        List<ModelListResponse.ModelEntry> entries = discovery.models() == null
                ? List.of()
                : discovery.models().stream()
                        .map(ModelListResponse.ModelEntry::new)
                        .toList();
        return new ModelListResponse(
                discovery.provider().name(),
                entries,
                discovery.available(),
                discovery.message()
        );
    }

    public record HealthResponse(String status) {
    }
}
