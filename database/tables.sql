CREATE TABLE history (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  creation_time timestamptz DEFAULT CURRENT_TIMESTAMP,
  asset varchar(6) NOT NULL,
  balance NUMERIC(1000, 8) NOT NULL,
  price bigint NOT NULL
);