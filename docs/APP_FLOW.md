# Application workflow

Prototype 0.1 navigation. See [validation results](VALIDATION.md) for executed checks and limitations.

```mermaid
flowchart TD
    A[Open App] --> B{Signed in?}
    B -->|No| C[Sign in or register]
    C --> D{Authentication valid?}
    D -->|No| C
    D -->|Yes| E{Kitchen membership?}
    B -->|Yes| E
    E -->|No| F{Create or join}
    F -->|Create| G[Create kitchen as Owner]
    F -->|Join| H[Enter invitation code]
    H --> I{Code valid?}
    I -->|No| H
    I -->|Yes| J[Preview kitchen and confirm Editor access]
    J --> K[Join as Editor]
    E -->|Yes| L[Kitchen]
    G --> L
    K --> L
    L --> M{Action}
    M -->|Browse| N[Categories or Use first]
    N --> O[Select eligible items across categories]
    O --> P[Match fixed recipes]
    P --> Q{Any matches?}
    Q -->|No| N
    Q -->|Yes| R[Suggestions and missing ingredients]
    R --> S[Recipe details]
    S -->|Update after cooking| T[Shared Add/Edit form]
    M -->|Add or edit| T
    T --> U{Date source}
    U -->|Printed| V[Date and label type]
    U -->|Production and shelf life| W[Calculate and confirm reference date]
    U -->|Unknown| X[No date reminder]
    V --> Y{Valid and saved?}
    W --> Y
    X --> Y
    Y -->|No| T
    Y -->|Yes| L
    T --> Z[Mark used up only if none remains]
    T --> DEL[Confirm single record deletion]
    Z --> L
    DEL --> L
    M -->|Settings| SET[Settings]
    SET --> PREF[Personal preferences and reminders]
    PREF --> SET
    SET --> SHARE{Owner or Editor?}
    SHARE -->|Owner| OWN[Invite or remove Editors]
    OWN --> SET
    SHARE -->|Editor| ED[View members or confirm leaving]
    ED -->|Stay| SET
    ED -->|Leave| F
    SET --> CLEAR[Owner-only confirmed clear of kitchen food records]
    CLEAR --> L
    SET --> OUT[Sign out without deleting food]
    OUT --> C
```

Rules: unknown dates remain visible; past-use-by records cannot be selected for matching; Best before is distinct; selecting/reading recipes never consumes stock; personal settings and selections are not shared; permission checks run on every backend request; failures preserve draft inputs; clear food records never deletes memberships or accounts.
