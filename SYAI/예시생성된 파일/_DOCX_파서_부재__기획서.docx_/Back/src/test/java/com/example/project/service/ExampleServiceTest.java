package com.example.project.service;

import com.example.project.domain.Example;
import com.example.project.repository.ExampleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExampleServiceTest {

    @Mock
    private ExampleRepository exampleRepository;

    @InjectMocks
    private ExampleService exampleService;

    private Example example;

    @BeforeEach
    void setUp() {
        example = new Example(1L, "Test Name");
    }

    @Test
    @DisplayName("ID로 데이터를 성공적으로 조회한다")
    void testGetData_success() {
        when(exampleRepository.findById(1L)).thenReturn(Optional.of(example));

        Optional<Example> foundExample = exampleService.getData(1L);

        assertTrue(foundExample.isPresent());
        assertEquals(example.getId(), foundExample.get().getId());
        assertEquals(example.getName(), foundExample.get().getName());
        verify(exampleRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("존재하지 않는 ID로 조회 시 빈 Optional을 반환한다")
    void testGetData_notFound() {
        when(exampleRepository.findById(2L)).thenReturn(Optional.empty());

        Optional<Example> foundExample = exampleService.getData(2L);

        assertFalse(foundExample.isPresent());
        verify(exampleRepository, times(1)).findById(2L);
    }

    @Test
    @DisplayName("새로운 데이터를 성공적으로 생성한다")
    void testCreateExample_success() {
        Example newExample = new Example(null, "New Example");
        Example savedExample = new Example(2L, "New Example");
        when(exampleRepository.save(any(Example.class))).thenReturn(savedExample);

        Example result = exampleService.createExample(newExample);

        assertNotNull(result);
        assertEquals(savedExample.getId(), result.getId());
        assertEquals(savedExample.getName(), result.getName());
        verify(exampleRepository, times(1)).save(newExample);
    }
}