package com.aiexception.explainer.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Enables binding of the custom configuration property classes.
 */
@Configuration
@EnableConfigurationProperties({OllamaProperties.class, GroqProperties.class})
public class PropertiesConfig {
}
