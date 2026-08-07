CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE drizzle.__drizzle_migrations (
	id serial PRIMARY KEY,
	hash text NOT NULL,
	created_at bigint
);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES
	('a311318e0d977eb438a326aabb19b30d88b35c3a66c1612403cdfb23062ffd12', 1785989246526),
	('1187b79ec21f07e9b7728d5084c2d8c0a302313aaae71bd81fc85339d22b6be8', 1785989373463),
	('9dc280f4d2c82b50873ebbf22208467850191a82fbd08f41819fe15c312f0a96', 1786011849493);
