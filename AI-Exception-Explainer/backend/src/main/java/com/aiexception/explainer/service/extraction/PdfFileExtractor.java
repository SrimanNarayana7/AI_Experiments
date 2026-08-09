package com.aiexception.explainer.service.extraction;

import com.aiexception.explainer.service.FileExtractionException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Extracts text from PDF files using Apache PDFBox.
 */
@Component
public class PdfFileExtractor implements FileContentExtractor {

    @Override
    public String extract(MultipartFile file) {
        try (PDDocument document = PDDocument.load(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            if (text == null || text.isBlank()) {
                throw new FileExtractionException("The PDF contains no extractable text.");
            }
            return text;
        } catch (IOException e) {
            throw new FileExtractionException("Could not extract text from the PDF.", e);
        }
    }
}
