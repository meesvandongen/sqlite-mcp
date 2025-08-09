# SQLite MCP Server

A Model Context Protocol (MCP) server that provides tools and resources for interacting with SQLite databases. This server allows AI assistants to execute SQL queries and manage database schemas efficiently.

## Features

### Tools

- **get_schema**: Get complete schema information for all database tables
- **read_query**: Execute SELECT queries to read data from the database
- **write_query**: Execute INSERT, UPDATE, or DELETE queries to modify data
- **create_table**: Create new tables in the database
- **list_tables**: Show all existing tables
- **describe_table**: Show the schema for a specific table

All tools require a database path to be explicitly provided. This ensures:

- Support for multiple databases
- No configuration for each project.

## Installation

### VS Code

```json
{
  "servers": {
    "@mvd/sqlite-mcp": {
      "command": "bunx", // or "npx" if you prefer
      "args": ["@mvd/sqlite-mcp"]
    }
  }
}
```
