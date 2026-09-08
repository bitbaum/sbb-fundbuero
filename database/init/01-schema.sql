-- SBB Fundbüro Database Schema
-- Optimized for high-scale operations across Swiss public transport

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE item_category AS ENUM (
    'electronics', 'clothing', 'bags', 'documents', 'jewelry',
    'books', 'toys', 'sports_equipment', 'medical', 'other'
);

CREATE TYPE item_status AS ENUM (
    'reported_lost', 'reported_found', 'matched', 'returned', 'disposed'
);

CREATE TYPE transport_type AS ENUM (
    'train', 'bus', 'tram', 'funicular', 'cable_car', 'boat'
);

CREATE TYPE match_status AS ENUM (
    'pending', 'confirmed', 'rejected', 'expired'
);

-- Users table (integrated with SBB mobile app)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sbb_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    preferred_language VARCHAR(2) DEFAULT 'de' CHECK (preferred_language IN ('de', 'fr', 'it', 'en')),
    has_monthly_pass BOOLEAN DEFAULT false,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table (trains, buses, trams, etc.)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(50) NOT NULL, -- e.g., "BN N71", "B704"
    transport_type transport_type NOT NULL,
    capacity INTEGER,
    operator VARCHAR(100) DEFAULT 'SBB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, transport_type)
);

-- Routes table
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_code VARCHAR(50) NOT NULL,
    origin_station VARCHAR(255) NOT NULL,
    destination_station VARCHAR(255) NOT NULL,
    description TEXT, -- e.g., "Zürich, Central → Zürich, Loorenstrasse"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table (connects vehicles and routes with timing)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id),
    route_id UUID REFERENCES routes(id),
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
    trip_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lost items table
CREATE TABLE lost_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) NOT NULL,
    trip_id UUID REFERENCES trips(id),
    category item_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    color VARCHAR(100),
    brand VARCHAR(100),
    size VARCHAR(50),
    distinctive_features TEXT,
    approximate_loss_time TIMESTAMP WITH TIME ZONE,
    loss_location VARCHAR(255), -- seat number, car section, etc.
    contact_info JSONB, -- phone, email preferences
    reward_offered DECIMAL(10, 2) DEFAULT 0,
    status item_status DEFAULT 'reported_lost',
    ai_embedding TEXT, -- for AI matching (JSON serialized vector)
    images TEXT[], -- array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Found items table
CREATE TABLE found_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finder_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    trip_id UUID REFERENCES trips(id),
    category item_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    color VARCHAR(100),
    brand VARCHAR(100),
    size VARCHAR(50),
    distinctive_features TEXT,
    found_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    found_location VARCHAR(255),
    current_location VARCHAR(255) NOT NULL, -- storage facility
    handler_employee_id VARCHAR(100), -- SBB employee ID
    status item_status DEFAULT 'reported_found',
    ai_embedding TEXT, -- for AI matching (JSON serialized vector)
    images TEXT[], -- array of image URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table (AI-powered matching between lost and found items)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_item_id UUID REFERENCES lost_items(id) NOT NULL,
    found_item_id UUID REFERENCES found_items(id) NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    ai_reasoning TEXT,
    status match_status DEFAULT 'pending',
    reviewed_by VARCHAR(100), -- SBB employee ID
    review_notes TEXT,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lost_item_id, found_item_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'item_found', 'match_confirmed', 'pickup_reminder', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- additional context data
    channels TEXT[] DEFAULT '{"push"}', -- email, push, sms
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver notifications table (real-time alerts to vehicle operators)
CREATE TABLE driver_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
    lost_item_id UUID REFERENCES lost_items(id) NOT NULL,
    message TEXT NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(100), -- driver/operator ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log for compliance and tracking
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_lost_items_reporter_id ON lost_items(reporter_id);
CREATE INDEX idx_lost_items_trip_id ON lost_items(trip_id);
CREATE INDEX idx_lost_items_category ON lost_items(category);
CREATE INDEX idx_lost_items_status ON lost_items(status);
CREATE INDEX idx_lost_items_created_at ON lost_items(created_at);
CREATE INDEX idx_lost_items_loss_time ON lost_items(approximate_loss_time);

CREATE INDEX idx_found_items_finder_id ON found_items(finder_id);
CREATE INDEX idx_found_items_vehicle_id ON found_items(vehicle_id);
CREATE INDEX idx_found_items_trip_id ON found_items(trip_id);
CREATE INDEX idx_found_items_category ON found_items(category);
CREATE INDEX idx_found_items_status ON found_items(status);
CREATE INDEX idx_found_items_created_at ON found_items(created_at);
CREATE INDEX idx_found_items_found_time ON found_items(found_time);

CREATE INDEX idx_matches_lost_item_id ON matches(lost_item_id);
CREATE INDEX idx_matches_found_item_id ON matches(found_item_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_confidence_score ON matches(confidence_score DESC);

CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_route_id ON trips(route_id);
CREATE INDEX idx_trips_date ON trips(trip_date);
CREATE INDEX idx_trips_departure_time ON trips(departure_time);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

CREATE INDEX idx_driver_notifications_vehicle_id ON driver_notifications(vehicle_id);
CREATE INDEX idx_driver_notifications_acknowledged_at ON driver_notifications(acknowledged_at);

-- Full-text search indexes
CREATE INDEX idx_lost_items_search ON lost_items USING gin(to_tsvector('german', title || ' ' || description));
CREATE INDEX idx_found_items_search ON found_items USING gin(to_tsvector('german', title || ' ' || description));

-- Trigram indexes for fuzzy matching
CREATE INDEX idx_lost_items_title_trgm ON lost_items USING gin(title gin_trgm_ops);
CREATE INDEX idx_found_items_title_trgm ON found_items USING gin(title gin_trgm_ops);

-- Partial indexes for active items
CREATE INDEX idx_lost_items_active ON lost_items(created_at) WHERE status IN ('reported_lost');
CREATE INDEX idx_found_items_active ON found_items(created_at) WHERE status IN ('reported_found');

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_lost_items_updated_at
    BEFORE UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_found_items_updated_at
    BEFORE UPDATE ON found_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();