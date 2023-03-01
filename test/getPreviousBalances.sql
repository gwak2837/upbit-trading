SELECT creation_time,
  asset,
  balance,
  price
FROM history
WHERE creation_time = $1
  OR creation_time = $2;