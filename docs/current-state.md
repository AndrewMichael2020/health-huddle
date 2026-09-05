# Current state

The fictional legacy environment uses on-premises SQL Server extracts, scheduled
jobs, nested views, manual transformations, and separately maintained Power BI
logic. Recurring limitations include:

- nested SQL views whose dependencies are difficult to trace;
- manual extraction and transformation steps;
- repeated source logic across products;
- multiple meanings behind similarly named measures;
- limited monitoring and slow root-cause analysis;
- incomplete lineage from source record to report output;
- on-premises processing and scheduling constraints;
- insufficient separation of Development and Production; and
- duplicated data and transformations across analytical products.

## Mapping limitation discovered

The current source maps identify many columns and data types, but some entries
do not yet define record grain, stable keys, timestamp meaning, correction
behaviour, privacy classification, lifecycle treatment or release validation.
A pipeline can copy these fields without being able to prove their meaning.
