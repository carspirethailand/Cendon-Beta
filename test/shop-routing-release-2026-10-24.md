# Driving proximity preparation

- Production road routing remains OFF by the owner's choice; no additional routing requests are made.
- Shop cards explicitly distinguish straight-line distance from driving distance. No drive time is guessed when a route is unavailable.
- The prepared display supports road distance, approximate driving duration, a detour badge and an ordered list based on the server's driving-time results. The route-origin consent starts unchecked and resets across accounts.
- Browser regression uses synthetic shops and routes: 800 m straight-line / 14 km drive loses to a 3.3 km drive. Missing routes remain unknown. Verified 320, 390 and 1280 px without overflow.
- Existing Studio/account fixtures and both full suites must pass before deployment. Production deployment does not certify real Google routing or live traffic; enabling it requires new cost approval.
