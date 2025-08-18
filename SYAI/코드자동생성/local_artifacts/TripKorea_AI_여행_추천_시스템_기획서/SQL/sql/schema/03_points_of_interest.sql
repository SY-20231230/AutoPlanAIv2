CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE poi_category_enum AS ENUM (
    'TOURIST_SPOT',
    'RESTAURANT',
    'ACCOMMODATION',
    'SHOPPING',
    'ETC'
);

CREATE TABLE points_of_interest (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    category poi_category_enum NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX points_of_interest_location_idx ON points_of_interest USING GIST (location);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_points_of_interest_updated_at
BEFORE UPDATE ON points_of_interest
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();