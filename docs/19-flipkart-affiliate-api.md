# Flipkart marketplace adapter

Prizen supports Flipkart India as its second marketplace through Flipkart's official Affiliate
Product API. It deliberately does not scrape Flipkart product pages: Flipkart's published program
terms prohibit automated page scraping, while its Affiliate API is the documented product-data
channel.

## Selection criteria

The adapter was selected because it:

- provides canonical Flipkart product IDs, prices, stock state, and product URLs;
- uses HTTPS directly from the self-hosted Prizen installation;
- requires owner-managed Affiliate ID and API token credentials;
- has a documented limit of 20 Affiliate API calls per second per affiliate; and
- adds no proxy, hosted intermediary, marketplace session, cookie, or payment credential.

Installation owners remain responsible for Affiliate Program eligibility and compliance with the
current Flipkart API and Affiliate Program terms. Prizen stores the credential bundle encrypted in
the local database and sends it only to `affiliate-api.flipkart.net`.

## Supported behavior

- Accepted links use HTTPS on `flipkart.com` or `www.flipkart.com` and contain a valid `pid` query
  parameter.
- The API's `productId` is the canonical identity. Tracking and affiliate query parameters are
  removed from the stored URL, leaving only `pid`.
- Flipkart India prices must use INR. A different or malformed currency is rejected instead of
  being converted or silently accepted.
- Only `product_tracking` is advertised. Cart handoff and assisted checkout are not supported.
- HTTP 429 is isolated as marketplace throttling so the existing tracker backoff can retry later.
  Authentication, upstream, network, malformed response, and identity mismatch failures are
  reported without exposing credentials.

## Configuration

Create or use a Flipkart Affiliate account and obtain the Affiliate ID and API token documented by
Flipkart. In Prizen, open **Settings → Marketplaces → Flipkart product data** and save both values.
Tracked Flipkart links are then resolved through the official Product ID lookup endpoint.

Official references:

- <https://affiliate.flipkart.com/api-docs/af_overview.html>
- <https://affiliate.flipkart.com/api-docs/af_prod_ref.html>
- <https://affiliate.flipkart.com/api-docs/af_faq.html>
- <https://affiliate.flipkart.com/api-docs/af_tou.html>
