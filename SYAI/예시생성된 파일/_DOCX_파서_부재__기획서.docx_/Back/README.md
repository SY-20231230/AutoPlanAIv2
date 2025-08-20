# Backend API Service

## 🚀 프로젝트 개요

이 프로젝트는 Spring Boot를 기반으로 구축된 백엔드 API 서비스입니다. 데이터베이스와의 효율적인 상호작용을 위해 Flyway를 통한 스키마 버전 관리 및 마이그레이션을 자동화하며, 안정적이고 확장 가능한 RESTful API를 제공합니다.

## 🛠️ 빌드 및 실행 방법

### 필수 요구사항

*   Java 17 이상
*   Maven 3.8 이상
*   대상 데이터베이스 (예: PostgreSQL, MySQL)

### 빌드

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 애플리케이션을 빌드합니다.

```bash
./mvnw clean install
```

### 실행

빌드 후 생성된 JAR 파일을 실행합니다.

```bash
java -jar target/your-project-name-0.0.1-SNAPSHOT.jar
```

또는 Spring Boot Maven 플러그인을 사용하여 직접 실행할 수 있습니다.

```bash
./mvnw spring-boot:run
```

애플리케이션은 기본적으로 `http://localhost:8080`에서 실행됩니다.

## 📚 API 문서

API 문서는 Swagger UI를 통해 제공됩니다. 애플리케이션 실행 후 다음 URL에서 접근할 수 있습니다.

[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

## ✨ 주요 기능

*   **RESTful API 제공**: Spring Boot를 활용한 안정적이고 효율적인 API 엔드포인트 구현.
*   **데이터베이스 스키마 관리**: Flyway를 이용한 데이터베이스 스키마 버전 관리 및 자동 마이그레이션.
*   **다양한 데이터베이스 지원**: JDBC/ODBC를 통한 유연한 데이터베이스 연결 (DBeaver를 통한 개발/관리 용이).
*   **확장 가능한 아키텍처**: Spring Boot의 강력한 기능과 생태계를 활용하여 높은 확장성과 유지보수성 보장.
*   **환경별 설정 관리**: YAML/Properties 파일을 통한 유연한 환경 설정.

## 🔗 관련 도구 및 기술

*   **Spring Boot**: Java 기반의 백엔드 프레임워크.
*   **Flyway**: 데이터베이스 마이그레이션 도구.
*   **DBeaver**: 범용 데이터베이스 클라이언트.
*   **Maven**: 프로젝트 빌드 및 의존성 관리 도구.