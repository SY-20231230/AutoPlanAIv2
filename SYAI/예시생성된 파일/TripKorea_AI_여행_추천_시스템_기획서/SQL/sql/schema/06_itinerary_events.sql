CREATE TABLE itinerary_events (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    poi_id BIGINT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    description TEXT NOT NULL,
    estimated_cost DECIMAL(12, 2) DEFAULT 0.00,
    transportation_mode VARCHAR(50),
    day_order INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (poi_id) REFERENCES points_of_interest(id) ON DELETE SET NULL
);