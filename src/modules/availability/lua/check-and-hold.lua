-- checkAndHold.lua
-- Atomically checks available slots and creates a hold if sufficient capacity exists.
--
-- KEYS[1] = event:{eventId}:slots     (current available slot counter)
-- KEYS[2] = hold:{bookingId}          (per-booking hold marker)
-- ARGV[1] = quantity                  (number of tickets requested)
-- ARGV[2] = holdTtlMs                 (hold TTL in milliseconds)
--
-- Returns: remaining slots after decrement, or -1 if insufficient capacity.

local slots   = tonumber(redis.call('GET', KEYS[1]) or '0')
local qty     = tonumber(ARGV[1])
local ttl_ms  = tonumber(ARGV[2])

if slots < qty then
  return -1
end

redis.call('DECRBY', KEYS[1], qty)
redis.call('SET', KEYS[2], qty, 'PX', ttl_ms)

return slots - qty
