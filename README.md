# Project Plan

This repository is a study project for learning MCP through a small deterministic turn-based duel game.

The goal is to understand:

* MCP servers and clients
* stdio communication
* JSON-RPC message flow
* real MCP SDK usage
* fake MCP server/client implementation
* contract testing between both implementations

## Fake MCP Server/Client

The **fake MCP server** is a small hand-written version of an MCP-like server.

It does **not** use the official MCP SDK. It only mimics the minimum protocol pieces needed for this study:

* `initialize`
* `tools/list`
* `tools/call`
* JSON-RPC
* stdio transport

The **fake MCP client** is a small hand-written client that:

* spawns the fake server
* sends JSON-RPC messages to the server's `stdin`
* reads JSON-RPC responses from the server's `stdout`
* matches responses by request ID

The goal is **not** to fully reimplement MCP, but to understand what the real MCP SDK does internally.

## The Game

The project uses a small deterministic turn-based duel engine.

The game includes:

* life points
* stamina
* attack
* defend
* charge super attack
* rest
* turn resolution
* win/loss condition

## Initial Rules

* `attack` takes 1 turn.
* `defend` takes 1 turn.
* `charge_super_attack` takes 2 turns before it hits.
* `rest` takes 2 turns before stamina regenerates.
* The game engine is the source of truth for all state transitions.
