CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_date_end_date ON trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_concept ON trips(concept);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_id ON itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_poi_id ON itinerary_items(poi_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_visit_date ON itinerary_items(visit_date);

CREATE INDEX IF NOT EXISTS idx_pois_category ON pois(category);
CREATE INDEX IF NOT EXISTS idx_pois_location ON pois USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_poi_id ON reviews(poi_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_allergies_user_id ON user_allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allergies_allergy_id ON user_allergies(allergy_id);

CREATE INDEX IF NOT EXISTS idx_popup_stores_start_date_end_date ON popup_stores(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_popup_stores_location ON popup_stores USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);