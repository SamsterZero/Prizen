# Security Policy

## Supported versions

Prizen is under active development. Security fixes are provided for the latest released version only. Until the first tagged release, only the current `main` branch is supported.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/SamsterZero/Prizen/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Include:

- A description of the vulnerability and its impact
- The affected version or commit
- Reproduction steps or a minimal proof of concept
- Any suggested mitigation
- Whether you believe active exploitation is occurring

Never include real marketplace credentials, cookies, addresses, payment information, webhook URLs, bot tokens, encryption keys, or unrelated personal data.

## Response targets

- Initial acknowledgement: within 7 days
- Triage and severity assessment: within 14 days
- Status updates: at least every 14 days while remediation is active

Fix timing depends on severity and complexity. The maintainer will coordinate disclosure and credit with the reporter. Please allow up to 90 days before public disclosure unless a shorter timeline is mutually agreed or active exploitation requires faster action.

## Scope

Reports about authentication, authorization, secret encryption, tracker trust boundaries, marketplace/session isolation, purchase-intent validation, dependency vulnerabilities, and container escape or exposure are welcome.

Marketplace pricing errors, ordinary scraping failures, and availability inaccuracies without a security impact belong in the public bug tracker.
