-- releaseHold.lua
-- Atomically releases a booking hold: restores slots and removes the hold key.
--
-- KEYS[1] = event:{eventId}:slots     (current available slot counter)
-- KEYS[2] = hold:{bookingId}          (per-booking hold marker)
-- ARGV[1] = quantity                  (number of tickets to release)
--
-- Returns: 1 on success, 0 if hold key did not exist (idempotent).

local qty = tonumber(ARGV[1])

redis.call('INCRBY', KEYS[1], qty)
local deleted = redis.call('DEL', KEYS[2])

return deleted
