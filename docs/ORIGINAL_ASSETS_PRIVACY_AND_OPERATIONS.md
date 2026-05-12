# TransitAlert internal release note

TransitAlert must remain an independent project with its own original artwork, product identity, and interface language.

## Original assets only

- Use original app marks, original fleet icons, and original UI artwork only.
- Do not import, trace, or closely imitate operator-branded icons, proprietary onboard graphics, or third-party product marks.
- When replacing visual assets, prefer simple custom vector art that is clearly distinct from official operator software.

## Privacy and account security

- Passwords must never be stored or logged in plain text.
- Sessions must stay signed, HTTP-only, and protected from unnecessary client exposure.
- API responses must only return sanitized account data.
- Logs should help debugging without exposing personal data, passwords, session tokens, or secrets.
- Authentication and registration flows should keep validation and rate limiting in place to reduce abuse.

## API and secret handling

- API keys, database URLs, tokens, and admin secrets must stay server-side only.
- Frontend code must never contain live secrets or direct calls that expose restricted credentials.
- Failures should return generic safe messages instead of raw backend traces, provider responses, or secret-bearing URLs.

## Responsible transport-data handling

- Treat live fleet and operational data as sensitive enough to require restraint in presentation.
- Keep enthusiast features useful without exposing hidden endpoints, restricted feeds, or internal-only details.
- Avoid framing operational data as official operator output, and keep independent-project disclaimers visible.

## Release alignment

As of version 0.88, releases should explicitly preserve:

- original branding separation
- secure account handling
- protected API usage
- responsible operational-data presentation
