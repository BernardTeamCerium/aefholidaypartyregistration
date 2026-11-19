# AEF Holiday Party Registration

Registration page for the Allied Elite Financial '80s Preppy Holiday Party. Attendees register themselves and, optionally, one guest. Branding and event details match the sponsorship site at https://www.alliedeliteevents.com/.

## Files
- `index.html`: the page and the registration form
- `config.js`: event details (date, venue, contact email, RSVP deadline). Edit this file, not the HTML.
- `styles.css`: the shared stylesheet from the sponsorship site
- `register.css`: styles for the registration form
- `script.js`: fills in details, guest toggle, validation, submission, countdown and the "Add to Calendar" (.ics) download
- `assets/`: AEF logos

## Deploying (Netlify)
This is a static site with no build step. Deploy the repo root to Netlify with **Form detection** turned on (Site configuration → Forms). Registrations then show up under Forms → `holiday-party-registration`. Turn on Netlify form notifications to email each registration to the events team, or export them to CSV for the headcount.

If a submission fails (for example, form detection is off), the page offers to send the registration by email to `contactEmail` instead, so no registration is lost.

## Before launch
- Set `rsvpDeadline` (and optionally `registrationClosesISO`) in `config.js`.
- Confirm `contactEmail` in `config.js`.
