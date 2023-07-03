SELECT creation_time,
  asset,
  balance,
  price
FROM history
WHERE creation_time > $1
LIMIT 12;