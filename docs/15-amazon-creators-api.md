# Amazon Data Access

Prizen supports two owner-selected Amazon data sources. `html` is the default so ordinary
self-hosters are not required to qualify for an affiliate API. `creators` is an optional,
documented API path for eligible Amazon Associates.

## Default bounded HTML mode

Select **Product page HTML** in Marketplace settings (the default). Prizen makes one
ordinary request to the submitted retail product page and reads the title, price,
currency, and availability from the returned HTML. It does not call private delivery endpoints, reuse customer
sessions, solve challenges, rotate identities, or attempt to bypass access controls. A
challenge or `429` response becomes a throttling failure and the tracker backs off.

This mode is unofficial. Amazon can change the markup or block requests at any time, and
installation owners are responsible for determining whether their use complies with the
terms and laws that apply to them. It does not provide verified seller, variant-parent, or
customer-specific delivery context.

## Optional Creators API mode

Select **Amazon Creators API** in Marketplace settings to use Amazon's documented API
instead of retail HTML. There is no automatic fallback between modes.

## Eligibility and owner configuration

The installation owner must enroll in Amazon Associates for each target marketplace,
qualify for Creators API access, create API credentials, and supply a valid partner tag.
Prizen does not broker access and has no hosted marketplace-data service.

Enter the credential ID, credential secret, assigned version, and at least one marketplace
partner tag in Marketplace settings. Prizen encrypts the complete credential bundle with
`SECRET_ENCRYPTION_KEY` before writing it to PostgreSQL. The API never returns credential
values to the browser after saving them; it exposes only whether credentials are configured
and their non-secret version.

Credential versions `3.1`, `3.2`, and `3.3` are supported. The
version selects Amazon's documented regional OAuth token endpoint. Only configure partner
tags for marketplaces the owner is approved to use. Credentials remain in the
owner-controlled database and must never be committed or logged.

## Requested and stored context

For a direct Amazon India or Amazon US URL containing an ASIN, Prizen calls `GetItems` and
requests only the title, parent ASIN, and `OffersV2` availability, featured-offer status,
seller, and price resources. The ASIN identifies the selected variant. Responses are
validated before an observation is accepted:

- the response ASIN must match the requested ASIN;
- title must be present;
- a returned price must be finite and positive with a three-letter currency;
- seller identity is retained only when Amazon supplies an offer;
- unavailable products may legitimately have no price or seller.

Creators API prices and availability use Amazon's marketplace-default delivery context.
They can differ from a specific customer's delivered price or eligibility. Prizen labels
this context explicitly and does not send the locally stored delivery pincode to Amazon.

## Failure and throttling behavior

OAuth access tokens are cached until shortly before expiry. Amazon authentication or
catalog failures are normalized as temporary marketplace failures. HTTP `429` responses
remain throttling failures so the durable tracker queue applies exponential backoff rather
than increasing request pressure. Prizen never falls back to retail-page scraping.

Operators remain responsible for following the current Creators API license, Associates
program policies, display rules, rate limits, and any requirements to refresh or remove
Amazon-supplied data.

Official references:

- [Creators API introduction](https://affiliate-program.amazon.com/creatorsapi/docs/)
- [Using cURL and OAuth](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl)
- [GetItems](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-items)
- [OffersV2](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/resources/offersV2)
