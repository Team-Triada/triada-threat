# TRIADA Threat

A live map of what's going on in cybersecurity right now.

We pull in ransomware leak-site posts, vulnerabilities that are actively being exploited, new critical CVEs, botnet servers, mass scanners and security news, and put it all on one 3D globe with a live feed next to it. It updates every minute, and you don't need an account or any setup to use it.

## What it does

- Shows a 3D globe where countries are shaded by ransomware activity and news coverage. You can replay the last 24 hours of claims and watch them land.
- Keeps one live feed of everything (ransomware claims, exploited vulnerabilities, critical CVEs, botnet servers, scanners, headlines), newest first.
- Lets you search the feed by CVE, gang, victim or country, filter by severity, and click a country to see who's being hit there.
- Gives every item a quick risk score from 0 to 100, with the reasons behind it and what to do next.
- Has a page for each ransomware gang (who they go after, their techniques, tools and exploited CVEs, latest victims), each known exploited CVE, and 176 threat actor groups from MITRE ATT&CK.
- Shows the headline numbers on top: victims in the last 24h, active gangs, newly exploited vulnerabilities, critical CVEs, botnet servers online, scanners today.

Works on desktop and phones.

## Who it's useful for

Anyone who wants a fast read on the threat landscape without opening ten tabs. For example:

- Security analysts, to see which new vulnerabilities are really being exploited and which ones ransomware crews are using.
- IT and security managers, for a quick "what's hitting us this week" overview.
- Consultants and MSPs, to check which sectors and vendors are being targeted.
- Researchers and journalists, to follow a gang or a CVE from the first claim to the latest victim.
- Students, to see how real attacks play out with live data.

## Where the data comes from

[ransomware.live](https://www.ransomware.live), [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), [NVD](https://nvd.nist.gov), [FIRST EPSS](https://www.first.org/epss/), [abuse.ch Feodo Tracker](https://feodotracker.abuse.ch), [SANS ISC DShield](https://isc.sans.edu), [MITRE ATT&CK](https://attack.mitre.org), [IPinfo](https://ipinfo.io), and 11 security news feeds.

A few things worth knowing:

- Ransomware claims are what the gangs post themselves, so they aren't independently confirmed.
- A gang's home country is an assessment from public reporting, not something we measured.
- Dots on the map are placed at country level, not exact locations.
- The risk score is built from CVSS, exploit likelihood, confirmed exploitation and ransomware use. It's a quick guide, not a verdict.

There are no accounts, cookies or trackers, and API keys stay on the server.

## Running it

```bash
npm install
cp .env.example .env   # optional, the API keys unlock a bit more data
npm run dev            # http://localhost:3000
```

It's built with Next.js, React, TypeScript and Tailwind. `npm test` runs the tests.

## Credits

IP geolocation by [IPinfo](https://ipinfo.io), map shapes from [Natural Earth](https://www.naturalearthdata.com), threat actor data from [MITRE ATT&CK](https://attack.mitre.org). If you plan to use this commercially, check each data provider's terms first, especially ransomware.live and NVD.
