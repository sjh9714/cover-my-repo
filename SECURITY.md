# Security policy

## Supported versions

Security fixes are released for the latest npm version.

Version 0.1.3 and later resolve agent, Git, Chrome, and opener executables
outside the target repository. Agents return bounded structured output from a
temporary workspace. Generated HTML passes an external-resource allowlist and
a restrictive content security policy before local Chrome renders it.

Users of version 0.1.2 or earlier should upgrade.

## Reporting a vulnerability

Use GitHub private vulnerability reporting from the repository Security tab.
Please include reproduction steps and the affected version. Do not open a
public issue for an unpatched vulnerability.
