# Flipkart marketplace adapter

Prizen supports Flipkart India as its second marketplace through bounded product-page HTML
retrieval by default, with Flipkart's official Affiliate Product API available as an optional mode.
HTML mode makes one ordinary request to the public product URL and reads only page metadata; it
does not use private endpoints, impersonate a browser, or evade challenges.

Flipkart's published program terms prohibit automated page scraping and recommend its Affiliate
API instead. Public accessibility does not override those terms. Installation owners who enable
HTML mode are responsible for deciding whether their use is permitted; API mode is the compliant
choice for eligible Affiliate Program members.

## Selection criteria

The adapter was selected because it:

- provides canonical Flipkart product IDs, prices, stock state, and product URLs;
- uses HTTPS directly from the self-hosted Prizen installation;
- keeps owner-managed Affiliate ID and API token credentials optional;
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
- HTML mode stops on challenge pages instead of attempting circumvention.
- HTTP 429 is isolated as marketplace throttling so the existing tracker backoff can retry later.
  Authentication, upstream, network, malformed response, and identity mismatch failures are
  reported without exposing credentials.

## Configuration

HTML mode is selected by default and requires no credentials. To use the official integration,
create or use a Flipkart Affiliate account and obtain the Affiliate ID and API token documented by
Flipkart. In Prizen, open **Settings → Marketplaces → Flipkart product data**, select **Flipkart
Affiliate API**, and save both values.

Official references:

- <https://affiliate.flipkart.com/api-docs/af_overview.html>
- <https://affiliate.flipkart.com/api-docs/af_prod_ref.html>
- <https://affiliate.flipkart.com/api-docs/af_faq.html>
- <https://affiliate.flipkart.com/api-docs/af_tou.html>
