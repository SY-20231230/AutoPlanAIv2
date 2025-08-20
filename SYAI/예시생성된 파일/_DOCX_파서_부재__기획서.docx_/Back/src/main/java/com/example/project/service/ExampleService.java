package com.example.project.service;

import com.example.project.model.Example;
import com.example.project.repository.ExampleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ExampleService {

    private final ExampleRepository exampleRepository;

    public ExampleService(ExampleRepository exampleRepository) {
        this.exampleRepository = exampleRepository;
    }

    public List<Example> getAllExamples() {
        return exampleRepository.findAll();
    }

    public Optional<Example> getExampleById(Long id) {
        return exampleRepository.findById(id);
    }

    public Example createExample(Example example) {
        // Business logic can be added here, e.g., validation, data processing
        return exampleRepository.save(example);
    }

    public Example updateExample(Long id, Example updatedExample) {
        return exampleRepository.findById(id)
                .map(existingExample -> {
                    // Update fields of existingExample with data from updatedExample
                    existingExample.setName(updatedExample.getName()); // Assuming 'name' field exists
                    existingExample.setDescription(updatedExample.getDescription()); // Assuming 'description' field exists
                    return exampleRepository.save(existingExample);
                })
                .orElseThrow(() -> new RuntimeException("Example not found with id " + id)); // Replace with a custom exception
    }

    public void deleteExample(Long id) {
        exampleRepository.deleteById(id);
    }
}