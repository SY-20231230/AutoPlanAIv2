CREATE OR REPLACE VIEW v_user_details AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    up.first_name,
    up.last_name,
    up.date_of_birth,
    up.address
FROM
    users u
LEFT JOIN
    user_profiles up ON u.id = up.user_id;

CREATE OR REPLACE FUNCTION fn_get_user_full_name(p_user_id INT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_full_name TEXT;
BEGIN
    SELECT
        COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')
    INTO
        v_full_name
    FROM
        users u
    LEFT JOIN
        user_profiles up ON u.id = up.user_id
    WHERE
        u.id = p_user_id;

    RETURN TRIM(v_full_name);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_create_user(
    p_username VARCHAR,
    p_email VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_date_of_birth DATE,
    p_address VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INT;
BEGIN
    INSERT INTO users (username, email)
    VALUES (p_username, p_email)
    RETURNING id INTO v_user_id;

    INSERT INTO user_profiles (user_id, first_name, last_name, date_of_birth, address)
    VALUES (v_user_id, p_first_name, p_last_name, p_date_of_birth, p_address);
END;
$$;