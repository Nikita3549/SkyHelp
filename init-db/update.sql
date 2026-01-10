TRUNCATE airlines RESTART IDENTITY;
COPY airlines FROM '/docker-entrypoint-initdb.d/airlines.csv' WITH (FORMAT csv, HEADER true, NULL '\N');

TRUNCATE airports;

COPY airports FROM '/docker-entrypoint-initdb.d/airports.csv' WITH (FORMAT csv, HEADER true, NULL '\N');

-- CREATE TEMP TABLE airports_tmp (LIKE airports INCLUDING ALL);
--
-- COPY airports_tmp FROM '/docker-entrypoint-initdb.d/airports-ru.csv' WITH (FORMAT csv, HEADER true, NULL '\N');
--
-- INSERT INTO airports
-- SELECT * FROM airports_tmp
-- ON CONFLICT (id, name) DO NOTHING;
--
-- DROP TABLE airports_tmp;
