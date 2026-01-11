CREATE TABLE IF NOT EXISTS airports (
    id INTEGER,
    name TEXT,
    city TEXT,
    country TEXT,
    iata_code TEXT,
    icao_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude INTEGER,
    timezone_offset TEXT,
    dst TEXT,
    tz TEXT,
    type TEXT,
    source TEXT,
    language TEXT,
    PRIMARY KEY (id, name)
);

TRUNCATE airports;

COPY airports FROM '/docker-entrypoint-initdb.d/airports.csv'
WITH (FORMAT csv, HEADER true, NULL '\N');

CREATE TEMP TABLE airports_ru_tmp (LIKE airports INCLUDING ALL);

COPY airports_ru_tmp FROM '/docker-entrypoint-initdb.d/airports-ru.csv'
WITH (FORMAT csv, HEADER true, NULL '\N');

INSERT INTO airports
SELECT * FROM airports_ru_tmp
ON CONFLICT (id, name) DO NOTHING;

DROP TABLE airports_ru_tmp;

CREATE TABLE airlines (
    id SERIAL PRIMARY KEY,
    name TEXT,
    alias TEXT,
    iata_code TEXT,
    icao_code TEXT,
    callsign TEXT,
    country TEXT,
    active BOOLEAN
);

COPY airlines
FROM '/docker-entrypoint-initdb.d/airlines.csv'
WITH (
    FORMAT csv,
    HEADER true,
    NULL '\N'
);
