package com.aiexception.explainer.service.classifier;

import com.aiexception.explainer.domain.AnalysisType;

/**
 * Determines the {@link AnalysisType} of raw input text.
 */
public interface InputClassifier {

    AnalysisType classify(String input);
}
