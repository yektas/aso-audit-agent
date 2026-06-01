# Public Listing Page Evidence Complements Apple Lookup

Apple lookup remains the first source for identifying an App Listing because it is cheap, structured, and sufficient for Listing Confirmation. After Listing Confirmation, the audit workflow may collect Listing Page Evidence from the canonical public App Store URL to reduce blind spots in the ASO Audit.

Listing Page Evidence is optional and structured. A crawl failure, missing crawl configuration, blocked page, or poor extraction lowers audit confidence and is recorded as an evidence note, but it does not prevent an ASO Audit when lookup metadata and Listing Confirmation are available. Raw crawl text may be retained as supporting trace data, but the audit model should primarily receive typed extracted fields.

The first Listing Page Evidence scope is limited to the main public App Store product page. It may extract public fields such as subtitle, visible promotional text, app preview video signals, in-app event signals, media counts, and page text signals. It must not be described as access to App Store Connect-only data. Keyword field values, custom product page variants, private promotional metadata, and developer response coverage remain unavailable unless the user supplies them or a later decision expands the evidence collection scope.

Developer response crawling is intentionally excluded from the first crawl scope because it requires separate review-surface crawling, has higher cost and fragility, and overlaps with the existing recent review sample only partially.
