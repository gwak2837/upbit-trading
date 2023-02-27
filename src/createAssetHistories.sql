/* @name createAssetHistories */
INSERT INTO history (asset, balance, price)
SELECT *
FROM unnest(
    $1::varchar(6) [],
    $2::NUMERIC(1000, 8) [],
    $3::bigint []
  );