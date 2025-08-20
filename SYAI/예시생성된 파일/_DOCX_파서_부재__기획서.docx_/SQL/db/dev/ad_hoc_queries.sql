-- 개발자들이 임시로 사용하거나 테스트 목적으로 작성하는 SQL 쿼리들을 모아둡니다.

-- 1. 특정 테이블의 상위 N개 레코드 조회 (데이터 탐색)
SELECT * FROM users LIMIT 10;

-- 2. 특정 조건에 맞는 데이터 조회 (필터링 테스트)
SELECT product_id, product_name, price FROM products WHERE category = 'Electronics' AND price > 500 ORDER BY price DESC;

-- 3. 새로운 데이터 삽입 (기능 테스트)
INSERT INTO orders (user_id, product_id, quantity, order_date, status) VALUES (101, 205, 1, NOW(), 'pending');

-- 4. 기존 데이터 업데이트 (상태 변경 테스트)
UPDATE tasks SET status = 'completed' WHERE task_id = 789 AND assigned_to = 'developer_A';

-- 5. 특정 조건의 데이터 삭제 (클린업 또는 테스트 데이터 제거)
DELETE FROM logs WHERE log_date < NOW() - INTERVAL '30 days';

-- 6. 집계 함수를 사용한 데이터 요약 (성능 또는 통계 확인)
SELECT COUNT(DISTINCT user_id) AS unique_users_today FROM user_sessions WHERE session_date = CURRENT_DATE;

-- 7. 임시 테이블 생성 및 사용 (복잡한 쿼리 테스트 또는 중간 결과 저장)
CREATE TEMPORARY TABLE IF NOT EXISTS temp_user_summary AS
SELECT user_id, COUNT(order_id) AS total_orders, SUM(total_amount) AS total_spent
FROM orders
GROUP BY user_id
HAVING COUNT(order_id) > 5;

SELECT * FROM temp_user_summary WHERE total_spent > 1000;

-- 8. 임시 테이블 삭제 (테스트 후 정리)
DROP TEMPORARY TABLE IF EXISTS temp_user_summary;

-- 9. 특정 컬럼의 고유 값 확인 (데이터 유효성 검사)
SELECT DISTINCT status FROM payments;

-- 10. 조인을 사용한 데이터 결합 (관계형 데이터 테스트)
SELECT u.username, o.order_id, o.order_date, o.total_amount
FROM users u
JOIN orders o ON u.user_id = o.user_id
WHERE o.order_date >= '2023-01-01' AND o.order_date < '2023-02-01';