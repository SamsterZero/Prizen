# Business Logic

## Product intake

1. Validate the submitted URL against a registered marketplace adapter.
2. Fetch canonical metadata through that adapter.
3. Upsert the product by `(marketplace_id, external_id)`.
4. Persist the first price observation and schedule the next scan.

An unsupported, malformed, or private URL is rejected. The client never supplies trusted product metadata or prices.

## Price scan

For each active product, the tracker claims one durable `scan_jobs` row, fetches a normalized result, then writes one `price_history` observation and updates `latest_prices` in the same transaction. Completed jobs are scheduled for the selected polling interval. Failed jobs retain their error and retry with bounded exponential backoff; jobs left running by a restart are reclaimed after five minutes. It never overwrites the last known price when a product is unavailable.

## Event rules

| Event                 | Condition                                                   |
| --------------------- | ----------------------------------------------------------- |
| `PriceUpdated`        | Current normalized price differs from previous known price  |
| `PriceDropped`        | Current price is lower than the previous known price        |
| `LowestPriceDetected` | Current price is strictly lower than the historical low     |
| `ProductUnavailable`  | Adapter reports out of stock after a prior available result |
| `TargetPriceReached`  | Price crosses from above to at or below the product target  |

The first successful observation establishes a baseline and does not generate an alert. A record-low alert is created only when a later observation is strictly below every prior observation; equal prices and price rebounds never alert. A target alert fires once on a downward crossing; it can fire again only after the price rises above the target and later crosses it again.

## Notification delivery

The dashboard accepts and verifies user-provided Discord webhook URLs or Telegram bot-token/chat-ID pairs. Notification jobs are deduplicated by channel and price-history observation. Provider failures are persisted and retried with bounded exponential backoff; a failed provider never blocks price persistence or other channels. Destinations are never written to application logs.

## Money and currencies

Prices retain the marketplace currency. Cross-currency comparisons are unavailable until an exchange-rate policy is implemented; target prices must match the product currency. Discounts are calculated only when a valid list price is supplied and greater than zero.

## Self-hosted ownership

Prizen is a single-user, self-hosted deployment. The local container stack and PostgreSQL volume are the ownership boundary; no application account or central database is required.
