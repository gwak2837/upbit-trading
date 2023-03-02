SELECT creation_time,
  asset,
  balance,
  price
FROM history
ORDER BY id DESC
LIMIT 13;