# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Version 1.x speaks SendKuy API v1.

## [1.0.0] - 2026-10-29

### Added

- 17 tools over SendKuy API v1: send a message or a batch of up to 500, read and cancel messages, send and check OTP codes, check WhatsApp numbers, find contacts, list templates and groups, start, monitor, pause, resume and cancel campaigns, read the account and its credits, and read webhook deliveries.
- Tools follow the scopes of the API key: a key with read scopes only never lists a tool that sends.
- `dedupe_key` on the tools that send, so an agent that retries a step does not send twice.
- Starts without `SENDKUY_API_KEY` and lists every tool, answering each call with an error until a key is set.
- An MCPB bundle for one-click install in Claude Desktop.
