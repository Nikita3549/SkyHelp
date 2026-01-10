TRUNCATE airlines RESTART IDENTITY;
COPY airlines FROM '/docker-entrypoint-initdb.d/airlines.csv' WITH (FORMAT csv, HEADER true, NULL '\N');

TRUNCATE airports;

-- 3. Загружаем основной файл (английский)
COPY airports FROM '/docker-entrypoint-initdb.d/airports.csv' WITH (FORMAT csv, HEADER true, NULL '\N');

-- 4. Загружаем русский файл через временную таблицу, чтобы обойти ошибку дубликатов
CREATE TEMP TABLE airports_tmp (LIKE airports INCLUDING ALL);

COPY airports_tmp FROM '/docker-entrypoint-initdb.d/airports-ru.csv' WITH (FORMAT csv, HEADER true, NULL '\N');

-- 5. Вставляем только те строки, которых еще нет.
-- Если (id, name) совпадает — просто пропускаем (DO NOTHING)
INSERT INTO airports
SELECT * FROM airports_tmp
ON CONFLICT (id, name) DO NOTHING;

-- Удаляем временную таблицу за собой
DROP TABLE airports_tmp;
