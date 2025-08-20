package com.example.project.repository;

import com.example.project.entity.ExampleEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ExampleRepositoryTest {

    @Autowired
    private ExampleRepository exampleRepository;

    @Autowired
    private TestEntityManager entityManager;

    private ExampleEntity testEntity;

    @BeforeEach
    void setUp() {
        entityManager.clear();
        testEntity = new ExampleEntity("Test Name");
        entityManager.persistAndFlush(testEntity);
    }

    @Test
    @DisplayName("새로운 엔티티를 저장하고 조회한다")
    void testSaveAndFindById() {
        ExampleEntity newEntity = new ExampleEntity("New Test Entity");

        ExampleEntity savedEntity = exampleRepository.save(newEntity);

        assertThat(savedEntity).isNotNull();
        assertThat(savedEntity.getId()).isNotNull();
        assertThat(savedEntity.getName()).isEqualTo("New Test Entity");

        Optional<ExampleEntity> foundEntity = exampleRepository.findById(savedEntity.getId());
        assertThat(foundEntity).isPresent();
        assertThat(foundEntity.get().getName()).isEqualTo("New Test Entity");
    }

    @Test
    @DisplayName("모든 엔티티를 조회한다")
    void testFindAll() {
        ExampleEntity anotherEntity = new ExampleEntity("Another Entity");
        entityManager.persistAndFlush(anotherEntity);

        List<ExampleEntity> entities = exampleRepository.findAll();

        assertThat(entities).isNotEmpty();
        assertThat(entities.size()).isEqualTo(2);
        assertThat(entities).extracting(ExampleEntity::getName)
                .containsExactlyInAnyOrder("Test Name", "Another Entity");
    }

    @Test
    @DisplayName("엔티티를 업데이트한다")
    void testUpdateEntity() {
        Long entityId = testEntity.getId();
        String updatedName = "Updated Test Name";

        Optional<ExampleEntity> foundEntity = exampleRepository.findById(entityId);
        assertThat(foundEntity).isPresent();

        ExampleEntity entityToUpdate = foundEntity.get();
        entityToUpdate.setName(updatedName);
        ExampleEntity updatedEntity = exampleRepository.save(entityToUpdate);

        assertThat(updatedEntity.getName()).isEqualTo(updatedName);
        Optional<ExampleEntity> reFoundEntity = exampleRepository.findById(entityId);
        assertThat(reFoundEntity).isPresent();
        assertThat(reFoundEntity.get().getName()).isEqualTo(updatedName);
    }

    @Test
    @DisplayName("엔티티를 삭제한다")
    void testDeleteEntity() {
        Long entityId = testEntity.getId();

        exampleRepository.deleteById(entityId);
        entityManager.flush();

        Optional<ExampleEntity> foundEntity = exampleRepository.findById(entityId);
        assertThat(foundEntity).isNotPresent();
    }

    @Test
    @DisplayName("존재하지 않는 엔티티 조회 시 Optional.empty()를 반환한다")
    void testFindByIdNotFound() {
        Optional<ExampleEntity> foundEntity = exampleRepository.findById(999L);

        assertThat(foundEntity).isNotPresent();
    }
}